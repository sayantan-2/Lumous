use crate::models::*;
use crate::indexer::scan_directory;
use crate::thumbnail::generate_thumbnail;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::collections::HashMap;
use once_cell::sync::Lazy;
use tauri::{Emitter, AppHandle};
use serde::{Serialize, Deserialize};
use std::fs;

// ------------------------------
// Persistence helpers
// ------------------------------
fn db_file_path() -> PathBuf {
    // Use OS data dir, fall back to current dir
    let base = dirs::data_dir().unwrap_or_else(|| std::env::current_dir().unwrap());
    base.join("local-gallery").join("db.json")
}

fn load_persisted_db() -> Option<SimpleDB> {
    let path = db_file_path();
    if !path.exists() { return None; }
    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).ok(),
        Err(_) => None,
    }
}

fn save_persisted_db(db: &SimpleDB) {
    let path = db_file_path();
    if let Some(parent) = path.parent() { let _ = fs::create_dir_all(parent); }
    if let Ok(json) = serde_json::to_string_pretty(db) {
        let _ = fs::write(path, json);
    }
}

// Simple database with folder support (now persisted as JSON)
#[derive(Serialize, Deserialize, Default)]
struct SimpleDB {
    files: HashMap<String, FileMeta>, // key: file_id, value: file
    folders: HashMap<String, Vec<String>>, // key: folder_path, value: file_ids
    albums: HashMap<String, Album>,
    // Library metadata
    last_selected_folder: Option<String>,
    #[serde(default)]
    path_index: HashMap<String, String>, // normalized path -> file_id
}

impl SimpleDB {
    fn new() -> Self {
        Self {
            files: HashMap::new(),
            folders: HashMap::new(),
            albums: HashMap::new(),
            last_selected_folder: None,
            path_index: HashMap::new(),
        }
    }

    fn add_file(&mut self, file: FileMeta, folder_path: &str) {
        let norm = normalize_path(&file.path);
        if let Some(existing) = self.path_index.get(&norm) {
            // Replace existing metadata (e.g., updated thumbnail)
            self.files.insert(existing.clone(), file);
            return;
        }
        let file_id = file.id.clone();
        self.files.insert(file_id.clone(), file);
        self.folders.entry(folder_path.to_string())
            .or_insert_with(Vec::new)
            .push(file_id.clone());
        self.path_index.insert(norm, file_id);
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
        let mut v: Vec<String> = self.folders.keys().cloned().collect();
        // Natural-ish sort: split digits and alpha segments
        v.sort_by(|a,b| natural_like(a, b));
        v
    }
}

// Simple natural compare (avoid extra dependency): compares runs of digits numerically
fn natural_like(a: &str, b: &str) -> std::cmp::Ordering {
    use std::cmp::Ordering;
    static RE: once_cell::sync::Lazy<regex::Regex> = once_cell::sync::Lazy::new(|| regex::Regex::new(r"(\\d+)|(\\D+)").unwrap());
    let ca: Vec<&str> = RE.find_iter(a).map(|m| m.as_str()).collect();
    let cb: Vec<&str> = RE.find_iter(b).map(|m| m.as_str()).collect();
    for i in 0..ca.len().max(cb.len()) {
        let sa = ca.get(i);
        let sb = cb.get(i);
        match (sa, sb) {
            (Some(&ra), Some(&rb)) => {
                let da = ra.chars().all(|c| c.is_ascii_digit());
                let db = rb.chars().all(|c| c.is_ascii_digit());
                if da && db {
                    let ia: i64 = ra.parse().unwrap_or(0);
                    let ib: i64 = rb.parse().unwrap_or(0);
                    if ia != ib { return ia.cmp(&ib); }
                } else if da != db { // digits come before letters
                    return if da { Ordering::Less } else { Ordering::Greater };
                } else if ra != rb { return ra.cmp(&rb); }
            }
            (None, Some(_)) => return Ordering::Less,
            (Some(_), None) => return Ordering::Greater,
            (None, None) => break,
        }
    }
    std::cmp::Ordering::Equal
}

fn normalize_path(p: &str) -> String {
    let canon = std::fs::canonicalize(p).ok()
        .and_then(|pb| pb.to_str().map(|s| s.to_string()))
        .unwrap_or_else(|| p.to_string());
    if cfg!(windows) { canon.to_lowercase() } else { canon }
}

static DB: Lazy<Mutex<SimpleDB>> = Lazy::new(|| {
    // Attempt to load persisted DB at static init (best-effort).
    let db = load_persisted_db().unwrap_or_else(SimpleDB::new);
    Mutex::new(db)
});

/// Called from setup if we want to force a re-load (e.g. future migrations)
pub fn initialize_persistent_db() {
    if let Some(persisted) = load_persisted_db() {
        if let Ok(mut guard) = DB.lock() {
            *guard = persisted;
        }
    }
}

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
pub async fn index_folder(root: String, _recursive: bool) -> Result<IndexResult, String> {
    let norm_root = normalize_path(&root);
    let path = Path::new(&norm_root);
    if !path.exists() {
        return Err("Folder does not exist".to_string());
    }

    println!("Starting to scan directory: {}", norm_root);
    
    // Check if folder is already indexed
    {
        let db = DB.lock().map_err(|e| e.to_string())?;
        if db.is_folder_indexed(&norm_root) {
            println!("Reindex requested; clearing existing folder: {}", norm_root);
            drop(db);
            let mut db2 = DB.lock().map_err(|e| e.to_string())?;
            db2.clear_folder(&norm_root);
        }
    }

    let files = scan_directory(path, false)
        .await
        .map_err(|e| e.to_string())?;

    println!("Scanned {} files", files.len());

    // Store files in database without holding lock across await
    let mut indexed_count = 0;
    for mut file in files.clone() {
        if file.thumbnail_path.is_none() {
            if let Ok(thumb) = generate_thumbnail(&file.path, 300).await {
                file.thumbnail_path = Some(thumb);
            }
        }
        println!("Adding file to DB: {}", file.name);
        {
            let mut db = DB.lock().map_err(|e| e.to_string())?;
            db.add_file(file.clone(), &norm_root);
        }
        indexed_count += 1;
    }
    {
        let mut db = DB.lock().map_err(|e| e.to_string())?;
    db.last_selected_folder = Some(norm_root.clone());
        save_persisted_db(&db);
    }

    println!("Indexed {} files for folder: {}", indexed_count, norm_root);

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

// ------------------------------
// Library state / metadata
// ------------------------------
#[derive(Serialize, Deserialize, Clone)]
pub struct LibraryState {
    pub last_selected_folder: Option<String>,
    pub indexed_folders: Vec<String>,
}

#[tauri::command]
pub async fn get_library_state() -> Result<LibraryState, String> {
    let db = DB.lock().map_err(|e| e.to_string())?;
    Ok(LibraryState {
        last_selected_folder: db.last_selected_folder.clone(),
        indexed_folders: db.get_indexed_folders(),
    })
}

#[tauri::command]
pub async fn update_last_selected_folder(folder: Option<String>) -> Result<(), String> {
    let mut db = DB.lock().map_err(|e| e.to_string())?;
    db.last_selected_folder = folder;
    save_persisted_db(&db);
    Ok(())
}


#[tauri::command]
pub async fn index_folder_streaming(
    app_handle: AppHandle,
    root: String,
    _recursive: bool,
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

    let files = scan_directory(path, false)
        .await
        .map_err(|e| e.to_string())?;

    println!("Scanned {} files, starting to index...", files.len());
    app_handle.emit("indexing-progress", format!("Found {} images, processing...", files.len())).ok();

    // Store files in database and emit each file as it's added (no long-held lock)
    let mut indexed_count = 0;
    for (i, mut file) in files.iter().cloned().enumerate() {
        if file.thumbnail_path.is_none() {
            if let Ok(thumb) = generate_thumbnail(&file.path, 300).await {
                file.thumbnail_path = Some(thumb);
            }
        }
        println!("Adding file to DB: {}", file.name);
        {
            let mut db = DB.lock().map_err(|e| e.to_string())?;
            db.add_file(file.clone(), &root);
        }
        indexed_count += 1;
        if i % 10 == 0 || i == files.len() - 1 {
            let progress_msg = format!("Indexed {} of {} images", i + 1, files.len());
            app_handle.emit("indexing-progress", &progress_msg).ok();
            app_handle.emit("file-indexed", &file).ok();
        }
    }
    {
        let mut db = DB.lock().map_err(|e| e.to_string())?;
        db.last_selected_folder = Some(root.clone());
        save_persisted_db(&db);
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

    save_persisted_db(&db);

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

#[tauri::command]
pub async fn reset_library() -> Result<(), String> {
    {
        let mut db = DB.lock().map_err(|e| e.to_string())?;
        db.files.clear();
        db.folders.clear();
        db.albums.clear();
        db.last_selected_folder = None;
        db.path_index.clear();
        save_persisted_db(&db);
    }
    println!("Library reset: all indexed data cleared");
    Ok(())
}
