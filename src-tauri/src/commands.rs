use crate::models::*;
use crate::indexer::scan_directory;
use crate::thumbnail::generate_thumbnail;
use std::path::Path;
use std::sync::Mutex;
use std::collections::HashMap;
use once_cell::sync::Lazy;

// Simple in-memory database
struct SimpleDB {
    files: HashMap<String, FileMeta>,
    albums: HashMap<String, Album>,
}

impl SimpleDB {
    fn new() -> Self {
        Self {
            files: HashMap::new(),
            albums: HashMap::new(),
        }
    }

    fn add_file(&mut self, file: FileMeta) {
        self.files.insert(file.id.clone(), file);
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
}

static DB: Lazy<Mutex<SimpleDB>> = Lazy::new(|| {
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
    let files = scan_directory(path, recursive)
        .await
        .map_err(|e| e.to_string())?;

    println!("Scanned {} files", files.len());

    // Store files in database
    let mut db = DB.lock().map_err(|e| e.to_string())?;
    let mut indexed_count = 0;
    
    for file in &files {
        println!("Adding file to DB: {}", file.name);
        db.add_file(file.clone());
        indexed_count += 1;
    }

    println!("Indexed {} files, total in DB: {}", indexed_count, db.files.len());

    Ok(IndexResult {
        total_files: files.len(),
        indexed_files: indexed_count,
        skipped_files: 0,
        errors: vec![],
    })
}

#[tauri::command]
pub async fn get_files(offset: usize, limit: usize) -> Result<Vec<FileMeta>, String> {
    let db = DB.lock().map_err(|e| e.to_string())?;
    let files = db.get_files(offset, limit);
    println!("get_files called: offset={}, limit={}, found {} files", offset, limit, files.len());
    println!("Total files in DB: {}", db.files.len());
    Ok(files)
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
