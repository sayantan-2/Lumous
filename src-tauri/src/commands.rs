use crate::models::*;
use crate::indexer::scan_directory;
use crate::thumbnail::generate_thumbnail;
use std::path::Path;
use std::sync::Mutex;
use std::collections::HashMap;
use once_cell::sync::Lazy;
use tauri::{Emitter, AppHandle};

// Simple in-memory database with folder support
struct SimpleDB {
    files: HashMap<String, FileMeta>, // key: file_id, value: file
    folders: HashMap<String, Vec<String>>, // key: folder_path, value: file_ids
    albums: HashMap<String, Album>,
}

impl SimpleDB {
    fn new() -> Self {
        Self {
            files: HashMap::new(),
            folders: HashMap::new(),
            albums: HashMap::new(),
        }
    }

    fn add_file(&mut self, file: FileMeta, folder_path: &str) {
        let file_id = file.id.clone();
        self.files.insert(file_id.clone(), file);
        
        // Add to folder index
        self.folders.entry(folder_path.to_string())
            .or_insert_with(Vec::new)
            .push(file_id);
    }

    fn get_files_for_folder(&self, folder_path: &str, offset: usize, limit: usize) -> Vec<FileMeta> {
        let file_ids = match self.folders.get(folder_path) {
            Some(ids) => ids,
            None => return vec![],
        };

        let mut folder_files: Vec<FileMeta> = file_ids
            .iter()
            .filter_map(|id| self.files.get(id))
            .cloned()
            .collect();
            
        folder_files.sort_by(|a, b| b.modified.cmp(&a.modified));
        
        let end = std::cmp::min(offset + limit, folder_files.len());
        if offset < folder_files.len() {
            folder_files[offset..end].to_vec()
        } else {
            vec![]
        }
    }

    fn get_files(&self, offset: usize, limit: usize) -> Vec<FileMeta> {
        let mut all_files: Vec<FileMeta> = self.files.values().cloned().collect();
        all_files.sort_by(|a, b| b.modified.cmp(&a.modified));
        
        let end = std::cmp::min(offset + limit, all_files.len());
        if offset < all_files.len() {
            all_files[offset..end].to_vec()
        } else {
            vec![]
        }
    }

    fn get_file(&self, id: &str) -> Option<FileMeta> {
        self.files.get(id).cloned()
    }

    fn add_album(&mut self, album: Album) {
        self.albums.insert(album.id.clone(), album);
    }

    fn is_folder_indexed(&self, folder_path: &str) -> bool {
        self.folders.contains_key(folder_path)
    }

    fn get_folder_file_count(&self, folder_path: &str) -> usize {
        self.folders.get(folder_path).map(|ids| ids.len()).unwrap_or(0)
    }

    fn clear_folder(&mut self, folder_path: &str) {
        if let Some(file_ids) = self.folders.remove(folder_path) {
            for file_id in file_ids {
                self.files.remove(&file_id);
            }
        }
    }

    fn clear(&mut self) {
        self.files.clear();
        self.folders.clear();
        self.albums.clear();
    }

    fn get_indexed_folders(&self) -> Vec<String> {
        self.folders.keys().cloned().collect()
    }
}static DB: Lazy<Mutex<SimpleDB>> = Lazy::new(|| {
    Mutex::new(SimpleDB::new())
});

#[tauri::command]
pub async fn get_settings() -> Result<AppSettings, String> {
    Ok(AppSettings::default())
}

#[tauri::command]
pub async fn update_settings(settings: AppSettings) -> Result<(), String> {
    // TODO: Persist settings to file or registry
    println!("Updating settings: {:?}", settings);
    Ok(())
}

#[tauri::command]
pub async fn index_folder(root: String, recursive: bool) -> Result<IndexResult, String> {
    let path = Path::new(&root);
    if !path.exists() {
        return Err("Folder does not exist".to_string());
    }

    println!("Starting to scan directory: {}", root);
    
    // Check if folder is already indexed
    {
        let db = DB.lock().map_err(|e| e.to_string())?;
        if db.is_folder_indexed(&root) {
            let file_count = db.get_folder_file_count(&root);
            println!("Folder already indexed with {} files", file_count);
            return Ok(IndexResult {
                total_files: file_count,
                indexed_files: 0,
                skipped_files: file_count,
                errors: vec!["Folder already indexed".to_string()],
            });
        }
    }

    let files = scan_directory(path, recursive)
        .await
        .map_err(|e| e.to_string())?;

    println!("Scanned {} files", files.len());

    // Store files in database
    let mut db = DB.lock().map_err(|e| e.to_string())?;
    let mut indexed_count = 0;

    for file in &files {
        println!("Adding file to DB: {}", file.name);
        db.add_file(file.clone(), &root);
        indexed_count += 1;
    }

    println!("Indexed {} files for folder: {}", indexed_count, root);

    Ok(IndexResult {
        total_files: files.len(),
        indexed_files: indexed_count,
        skipped_files: 0,
        errors: vec![],
    })
}

#[tauri::command]
pub async fn get_files(folder_path: Option<String>, offset: usize, limit: usize) -> Result<Vec<FileMeta>, String> {
    let db = DB.lock().map_err(|e| e.to_string())?;
    
    let files = match folder_path {
        Some(folder) => {
            println!("get_files called for folder: {}, offset={}, limit={}", folder, offset, limit);
            db.get_files_for_folder(&folder, offset, limit)
        }
        None => {
            println!("get_files called for all files: offset={}, limit={}", offset, limit);
            db.get_files(offset, limit)
        }
    };
    
    println!("Returning {} files", files.len());
    Ok(files)
}

#[tauri::command]
pub async fn is_folder_indexed(folder_path: String) -> Result<bool, String> {
    let db = DB.lock().map_err(|e| e.to_string())?;
    Ok(db.is_folder_indexed(&folder_path))
}

#[tauri::command]
pub async fn get_indexed_folders() -> Result<Vec<String>, String> {
    let db = DB.lock().map_err(|e| e.to_string())?;
    Ok(db.get_indexed_folders())
}

#[tauri::command]
pub async fn index_folder_streaming(
    app_handle: AppHandle,
    root: String,
    recursive: bool,
) -> Result<IndexResult, String> {
    let path = Path::new(&root);
    if !path.exists() {
        return Err("Directory does not exist".to_string());
    }

    println!("Starting streaming indexing of directory: {}", root);
    
    // Emit indexing started event
    app_handle.emit("indexing-started", &root).ok();
    
    // Check if folder is already indexed
    {
        let db = DB.lock().map_err(|e| e.to_string())?;
        if db.is_folder_indexed(&root) {
            let file_count = db.get_folder_file_count(&root);
            println!("Folder already indexed with {} files", file_count);
            app_handle.emit("indexing-completed", &root).ok();
            return Ok(IndexResult {
                total_files: file_count,
                indexed_files: 0,
                skipped_files: file_count,
                errors: vec!["Folder already indexed".to_string()],
            });
        }
    }

    // Emit scanning started
    app_handle.emit("indexing-progress", "Scanning for image files...").ok();

    let files = scan_directory(path, recursive)
        .await
        .map_err(|e| e.to_string())?;

    println!("Scanned {} files, starting to index...", files.len());
    app_handle.emit("indexing-progress", format!("Found {} images, processing...", files.len())).ok();

    // Store files in database and emit each file as it's added
    let mut db = DB.lock().map_err(|e| e.to_string())?;
    let mut indexed_count = 0;

    for (i, file) in files.iter().enumerate() {
        println!("Adding file to DB: {}", file.name);
        db.add_file(file.clone(), &root);
        indexed_count += 1;
        
        // Emit progress every 10 files or on last file
        if i % 10 == 0 || i == files.len() - 1 {
            let progress_msg = format!("Indexed {} of {} images", i + 1, files.len());
            app_handle.emit("indexing-progress", &progress_msg).ok();
            
            // Emit file added event so UI can update incrementally
            app_handle.emit("file-indexed", file).ok();
        }
    }
    
    app_handle.emit("indexing-completed", &root).ok();

    Ok(IndexResult {
        total_files: files.len(),
        indexed_files: indexed_count,
        skipped_files: 0,
        errors: vec![],
    })
}

#[tauri::command]
pub async fn get_thumbnail(file_id: String, size: u32) -> Result<String, String> {
    // Extract file path without holding the lock across await
    let file_path = {
        let db = DB.lock().map_err(|e| e.to_string())?;
        if let Some(file) = db.get_file(&file_id) {
            file.path.clone()
        } else {
            return Err("File not found".to_string());
        }
    };
    
    // Now generate thumbnail without holding the lock
    match generate_thumbnail(&file_path, size).await {
        Ok(thumbnail_path) => Ok(thumbnail_path),
        Err(e) => Err(format!("Failed to generate thumbnail: {}", e)),
    }
}

#[tauri::command]
pub async fn create_album(name: String, description: Option<String>) -> Result<Album, String> {
    let mut db = DB.lock().map_err(|e| e.to_string())?;

    let album = Album::new(name, description);
    db.add_album(album.clone());

    Ok(album)
}

#[tauri::command]
pub async fn add_to_album(_album_id: String, _file_ids: Vec<String>) -> Result<(), String> {
    // TODO: Implement album-file relationships
    Ok(())
}

#[tauri::command]
pub async fn search_files(query: SearchQuery) -> Result<Vec<FileMeta>, String> {
    let db = DB.lock().map_err(|e| e.to_string())?;

    let all_files = db.get_files(0, 10000);

    let filtered = all_files.into_iter()
        .filter(|file| {
            if let Some(ref search_query) = query.query {
                if !search_query.is_empty() {
                    return file.name.to_lowercase().contains(&search_query.to_lowercase()) ||
                           file.path.to_lowercase().contains(&search_query.to_lowercase());
                }
            }
            true
        })
        .collect();

    Ok(filtered)
}

#[tauri::command]
pub async fn edit_image(file_id: String, _operation: String) -> Result<(), String> {
    // TODO: Implement image editing operations
    println!("Edit image operation for file: {}", file_id);
    Ok(())
}

#[tauri::command]
pub async fn export_metadata(file_ids: Vec<String>) -> Result<String, String> {
    // TODO: Export metadata to JSON/CSV
    println!("Export metadata for {} files", file_ids.len());
    Ok("metadata.json".to_string())
}

#[tauri::command]
pub async fn open_in_explorer(file_path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(&file_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&file_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(std::path::Path::new(&file_path).parent().unwrap_or(std::path::Path::new("/")))
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn watch_folder(folder_path: String) -> Result<(), String> {
    // TODO: Implement folder watching with notify crate
    println!("Starting to watch folder: {}", folder_path);
    Ok(())
}
