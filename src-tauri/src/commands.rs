use crate::database::Database;
use crate::indexer::{process_file, scan_directory, scan_directory_shallow};
use crate::models::*;
use crate::thumbnail::{generate_thumbnail, remove_all_thumbnails, remove_thumbnails_for_paths};
use notify::{Event, EventKind, RecursiveMode, Watcher};
use once_cell::sync::Lazy;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

// --- Global Watcher Storage ---
// This keeps the file watchers alive in memory
static WATCHERS: Lazy<Mutex<HashMap<String, notify::RecommendedWatcher>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

static DB: Lazy<Mutex<Database>> = Lazy::new(|| match Database::new() {
    Ok(db) => Mutex::new(db),
    Err(e) => {
        eprintln!("CRITICAL: Failed to open database: {}", e);
        panic!("Database initialization failed");
    }
});

fn with_db<F, R>(f: F) -> Result<R, String>
where
    F: FnOnce(&Database) -> anyhow::Result<R>,
{
    let db_guard = DB.lock().map_err(|e| e.to_string())?;
    f(&db_guard).map_err(|e| e.to_string())
}

pub fn initialize_persistent_db() {}

fn normalize_path(p: &str) -> String {
    let canon = std::fs::canonicalize(p)
        .ok()
        .and_then(|pb| pb.to_str().map(|s| s.to_string()))
        .unwrap_or_else(|| p.to_string());
    if cfg!(windows) {
        canon.to_lowercase()
    } else {
        canon
    }
}

#[tauri::command]
pub async fn get_settings() -> Result<AppSettings, String> {
    Ok(AppSettings::default())
}

#[tauri::command]
pub async fn update_settings(settings: AppSettings) -> Result<(), String> {
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

    with_db(|db| {
        db.clear_folder(&norm_root)?;
        Ok(())
    })?;

    let files = scan_directory(path, false)
        .await
        .map_err(|e| e.to_string())?;

    let mut indexed_count = 0;
    for mut file in files {
        if file.thumbnail_path.is_none() {
            if let Ok(thumb) = generate_thumbnail(&file.path, 300).await {
                file.thumbnail_path = Some(thumb);
            }
        }
        let file_clone = file.clone();
        let root_clone = norm_root.clone();
        with_db(move |db| {
            db.add_file(&file_clone, &root_clone)?;
            Ok(())
        })?;
        indexed_count += 1;
    }

    with_db(|db| {
        db.set_setting("last_selected_folder", &norm_root)?;
        Ok(())
    })?;

    Ok(IndexResult {
        total_files: indexed_count,
        indexed_files: indexed_count,
        skipped_files: 0,
        errors: vec![],
    })
}

#[tauri::command]
pub async fn get_files(
    folder_path: Option<String>,
    offset: usize,
    limit: usize,
) -> Result<Vec<FileMeta>, String> {
    with_db(|db| match folder_path {
        Some(folder) => db.get_files_for_folder(&folder, offset, limit),
        None => db.get_files(offset, limit),
    })
}

#[tauri::command]
pub async fn is_folder_indexed(folder_path: String) -> Result<bool, String> {
    with_db(|db| {
        let folders = db.get_indexed_folders()?;
        Ok(folders.contains(&folder_path))
    })
}

#[tauri::command]
pub async fn get_indexed_folders() -> Result<Vec<String>, String> {
    with_db(|db| db.get_indexed_folders())
}

#[derive(Serialize, Deserialize, Clone)]
pub struct LibraryState {
    pub last_selected_folder: Option<String>,
    pub indexed_folders: Vec<String>,
}

#[tauri::command]
pub async fn get_library_state() -> Result<LibraryState, String> {
    with_db(|db| {
        let last = db.get_setting("last_selected_folder")?;
        let folders = db.get_indexed_folders()?;
        Ok(LibraryState {
            last_selected_folder: last,
            indexed_folders: folders,
        })
    })
}

#[tauri::command]
pub async fn update_last_selected_folder(folder: Option<String>) -> Result<(), String> {
    with_db(|db| {
        if let Some(f) = folder {
            db.set_setting("last_selected_folder", &f)?;
        }
        Ok(())
    })
}

#[tauri::command]
pub async fn index_folder_streaming(
    app_handle: AppHandle,
    root: String,
    _recursive: bool,
) -> Result<IndexResult, String> {
    let norm_root = normalize_path(&root);
    let path = Path::new(&norm_root);
    if !path.exists() {
        return Err("Directory does not exist".to_string());
    }

    app_handle.emit("indexing-started", &norm_root).ok();
    app_handle
        .emit("indexing-progress", "Checking folder snapshot...")
        .ok();

    let current_snapshot = crate::indexer::compute_folder_snapshot(path)
        .await
        .map_err(|e| e.to_string())?;
    let last_snapshot = with_db(|db| db.get_snapshot(&norm_root))?;

    if let Some((last_count, last_mtime)) = last_snapshot {
        if last_count == current_snapshot.file_count && last_mtime == current_snapshot.agg_mtime {
            app_handle.emit("indexing-completed", &norm_root).ok();
            return Ok(IndexResult {
                total_files: current_snapshot.file_count,
                indexed_files: 0,
                skipped_files: 0,
                errors: vec![],
            });
        }
    }

    app_handle
        .emit("indexing-progress", "Scanning for image files...")
        .ok();
    let shallow = scan_directory_shallow(path, false)
        .await
        .map_err(|e| e.to_string())?;

    use std::collections::HashMap;
    let norm_lc = |s: &str| s.to_lowercase();

    // CHANGED: Value type is now (String, i64, i64) to match ShallowMeta
    let mut shallow_map: HashMap<String, (String, i64, i64)> = HashMap::new();
    for s in &shallow {
        shallow_map.insert(norm_lc(&s.path), (s.name.clone(), s.size, s.modified_sec));
    }

    let existing_files = with_db(|db| db.get_all_file_paths_in_folder(&norm_root))?;

    let mut deleted_count = 0;
    let mut to_delete_ids = Vec::new();
    let mut to_delete_paths: Vec<String> = Vec::new();

    for (id, p) in existing_files {
        let p_norm = norm_lc(&p);
        if !shallow_map.contains_key(&p_norm) {
            to_delete_ids.push(id);
            to_delete_paths.push(p);
        }
    }

    if !to_delete_ids.is_empty() {
        with_db(|db| {
            for id in &to_delete_ids {
                db.remove_file(id)?;
            }
            Ok(())
        })?;
        remove_thumbnails_for_paths(&to_delete_paths, 300);
        deleted_count = to_delete_ids.len();
    }

    let mut upserted = 0;
    let mut processed = 0;
    let mut batch: Vec<FileMeta> = Vec::new();

    for s in shallow.iter() {
        processed += 1;
        if let Some(mut fm) = process_file(Path::new(&s.path))
            .await
            .map_err(|e| e.to_string())?
        {
            if fm.thumbnail_path.is_none() {
                if let Ok(thumb) = generate_thumbnail(&fm.path, 300).await {
                    fm.thumbnail_path = Some(thumb);
                }
            }
            let fm_clone = fm.clone();
            let root_clone = norm_root.clone();
            with_db(move |db| {
                db.add_file(&fm_clone, &root_clone)?;
                Ok(())
            })?;

            upserted += 1;
            batch.push(fm);
            if batch.len() >= 10 {
                app_handle.emit("files-indexed-batch", &batch).ok();
                batch.clear();
            }
        }
        if processed % 50 == 0 {
            app_handle
                .emit(
                    "indexing-progress",
                    format!("Checked {} files...", processed),
                )
                .ok();
        }
    }
    if !batch.is_empty() {
        app_handle.emit("files-indexed-batch", &batch).ok();
    }

    with_db(|db| {
        db.set_setting("last_selected_folder", &norm_root)?;
        db.save_snapshot(
            &norm_root,
            current_snapshot.file_count,
            current_snapshot.agg_mtime,
        )?;
        Ok(())
    })?;

    app_handle.emit("indexing-completed", &norm_root).ok();

    Ok(IndexResult {
        total_files: shallow.len(),
        indexed_files: upserted,
        skipped_files: deleted_count,
        errors: vec![],
    })
}

#[tauri::command]
pub async fn get_thumbnail(file_id: String, size: u32) -> Result<String, String> {
    let file_opt = with_db(|db| db.get_file(&file_id))?;
    if let Some(file) = file_opt {
        generate_thumbnail(&file.path, size)
            .await
            .map_err(|e| e.to_string())
    } else {
        Err("File not found".to_string())
    }
}

// Stubs for other commands
#[tauri::command]
pub async fn create_album(_name: String, _description: Option<String>) -> Result<Album, String> {
    Err("Not implemented".into())
}
#[tauri::command]
pub async fn add_to_album(_album_id: String, _file_ids: Vec<String>) -> Result<(), String> {
    Ok(())
}
#[tauri::command]
pub async fn edit_image(_file_id: String, _op: String) -> Result<(), String> {
    Ok(())
}
#[tauri::command]
pub async fn export_metadata(_file_ids: Vec<String>) -> Result<String, String> {
    Ok("".into())
}
#[tauri::command]
pub async fn open_in_explorer(_path: String) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub async fn watch_folder(app_handle: AppHandle, folder_path: String) -> Result<(), String> {
    let norm_path = normalize_path(&folder_path);

    // 1. Check if we are already watching this folder
    let mut watchers = WATCHERS.lock().map_err(|e| e.to_string())?;
    if watchers.contains_key(&norm_path) {
        return Ok(());
    }

    println!("Starting filesystem watcher for: {}", norm_path);
    let app_handle_clone = app_handle.clone();
    let path_clone = norm_path.clone();

    // 2. Create the Watcher
    let mut watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
        match res {
            Ok(event) => {
                if event.kind.is_access() {
                    return;
                }

                for path_buf in event.paths {
                    let path_str = path_buf.to_string_lossy().to_string();
                    let ext = path_buf
                        .extension()
                        .and_then(|e| e.to_str())
                        .unwrap_or("")
                        .to_lowercase();

                    if !["jpg", "jpeg", "png", "gif", "webp"].contains(&ext.as_str()) {
                        continue;
                    }

                    match event.kind {
                        EventKind::Create(_) | EventKind::Modify(_) => {
                            let p = path_buf.clone();
                            let root = path_clone.clone();
                            let app = app_handle_clone.clone();

                            std::thread::spawn(move || {
                                // --- FIX IS HERE ---
                                // .unwrap_or(None) converts the Result<Option<FileMeta>> into just Option<FileMeta>
                                // So we pattern match on "Some(mut fm)" directly.
                                if let Some(mut fm) =
                                    tauri::async_runtime::block_on(process_file(&p)).unwrap_or(None)
                                {
                                    if let Ok(thumb) = tauri::async_runtime::block_on(
                                        generate_thumbnail(&fm.path, 300),
                                    ) {
                                        fm.thumbnail_path = Some(thumb);
                                    }

                                    if let Ok(db) = DB.lock() {
                                        let _ = db.add_file(&fm, &root);
                                    }

                                    let _ = app.emit("library-updated", ());
                                }
                            });
                        }
                        EventKind::Remove(_) => {
                            let p_str = path_str.clone();
                            let app = app_handle_clone.clone();

                            std::thread::spawn(move || {
                                if let Ok(db) = DB.lock() {
                                    let _ = db.remove_file_by_path(&p_str);
                                }
                                let _ = app.emit("library-updated", ());
                            });
                        }
                        _ => {}
                    }
                }
            }
            Err(e) => eprintln!("Watch error: {:?}", e),
        }
    })
    .map_err(|e| e.to_string())?;

    watcher
        .watch(Path::new(&norm_path), RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    watchers.insert(norm_path, watcher);

    Ok(())
}
// Sidecar commands
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SidecarData {
    pub caption: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[tauri::command]
pub async fn get_sidecar_caption(image_path: String) -> Result<Option<String>, String> {
    let p = Path::new(&image_path);
    let parent = match p.parent() {
        Some(d) => d,
        None => return Ok(None),
    };
    let stem_os = match p.file_stem() {
        Some(s) => s,
        None => return Ok(None),
    };
    let stem = stem_os.to_string_lossy();

    // Look for .txt, .caption.txt, or .md
    let candidates = [
        format!("{}.txt", stem),
        format!("{}.caption.txt", stem),
        format!("{}.md", stem),
    ];

    for name in &candidates {
        let candidate = parent.join(name);
        if candidate.is_file() {
            match fs::read_to_string(&candidate) {
                Ok(text) => return Ok(Some(text)),
                Err(_) => continue,
            }
        }
    }
    Ok(None)
}

#[tauri::command]
pub async fn get_sidecar_json(image_path: String) -> Result<Option<serde_json::Value>, String> {
    let p = Path::new(&image_path);
    let parent = match p.parent() {
        Some(d) => d,
        None => return Ok(None),
    };
    let stem_os = match p.file_stem() {
        Some(s) => s,
        None => return Ok(None),
    };
    let stem = stem_os.to_string_lossy();

    let json_file = format!("{}.json", stem);
    let candidate = parent.join(&json_file);

    if candidate.is_file() {
        match fs::read_to_string(&candidate) {
            Ok(content) => match serde_json::from_str(&content) {
                Ok(json) => return Ok(Some(json)),
                Err(e) => return Err(format!("JSON Parse Error: {}", e)),
            },
            Err(_) => return Ok(None),
        }
    }
    Ok(None)
}

#[tauri::command]
pub async fn get_sidecar_data(image_path: String) -> Result<SidecarData, String> {
    // We can reuse the logic above or combine it for efficiency
    let p = Path::new(&image_path);
    let parent = match p.parent() {
        Some(d) => d,
        None => {
            return Ok(SidecarData {
                caption: None,
                metadata: None,
            })
        }
    };
    let stem_os = match p.file_stem() {
        Some(s) => s,
        None => {
            return Ok(SidecarData {
                caption: None,
                metadata: None,
            })
        }
    };
    let stem = stem_os.to_string_lossy();

    // 1. Get Caption
    let mut caption = None;
    let caption_candidates = [
        format!("{}.txt", stem),
        format!("{}.caption.txt", stem),
        format!("{}.md", stem),
    ];

    for name in &caption_candidates {
        let candidate = parent.join(name);
        if candidate.is_file() {
            if let Ok(text) = fs::read_to_string(&candidate) {
                caption = Some(text);
                break;
            }
        }
    }

    // 2. Get Metadata (JSON)
    let mut metadata = None;
    let json_file = format!("{}.json", stem);
    let json_candidate = parent.join(&json_file);

    if json_candidate.is_file() {
        if let Ok(content) = fs::read_to_string(&json_candidate) {
            metadata = serde_json::from_str(&content).ok();
        }
    }

    Ok(SidecarData { caption, metadata })
}
#[derive(Deserialize)]
pub struct SearchQuery {
    pub query: Option<String>,
}

#[tauri::command]
pub async fn search_files(query: SearchQuery) -> Result<Vec<FileMeta>, String> {
    let q = query.query.unwrap_or_default();
    if q.is_empty() {
        return Ok(vec![]);
    }

    with_db(|db| {
        let conn = db.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, path, name, size, modified, file_type, thumbnail_path FROM files WHERE name LIKE ?1 OR path LIKE ?1 LIMIT 100")
            .map_err(|e| anyhow::anyhow!(e))?;

        let wildcard = format!("%{}%", q);
        let rows = stmt
            .query_map(params![wildcard], |row| {
                Ok(FileMeta {
                    id: row.get(0)?,
                    path: row.get(1)?,
                    name: row.get(2)?,
                    size: row.get(3)?,
                    modified: row.get(4)?,
                    file_type: row.get(5)?,
                    thumbnail_path: row.get(6)?,
                    ..Default::default() // <--- ADDED THIS
                })
            })
            .map_err(|e| anyhow::anyhow!(e))?;

        let mut results = Vec::new();
        for r in rows {
            results.push(r.unwrap());
        }
        Ok(results)
    })
}

#[tauri::command]
pub async fn reset_library() -> Result<(), String> {
    with_db(|db| db.clear_library())?;
    remove_all_thumbnails();
    Ok(())
}

#[tauri::command]
pub async fn reset_folder(folder_path: String) -> Result<(), String> {
    let norm = normalize_path(&folder_path);
    let paths: Vec<String> = with_db(|db| {
        let files = db.get_all_file_paths_in_folder(&norm)?;
        Ok(files.into_iter().map(|(_, p)| p).collect())
    })?;

    with_db(|db| db.clear_folder(&norm))?;
    remove_thumbnails_for_paths(&paths, 300);
    Ok(())
}
