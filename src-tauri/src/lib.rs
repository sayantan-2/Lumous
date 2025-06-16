use std::path::Path;
use serde::{Deserialize, Serialize};
use walkdir::WalkDir;
use chrono::{DateTime, Utc};
use std::fs;
use base64::{Engine as _, engine::general_purpose};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageMetadata {
    pub id: String,
    pub path: String,
    pub name: String,
    pub size: u64,
    pub width: u32,
    pub height: u32,
    pub created: Option<DateTime<Utc>>,
    pub modified: Option<DateTime<Utc>>,
    pub camera_make: Option<String>,
    pub camera_model: Option<String>,
    pub iso: Option<u32>,
    pub aperture: Option<f64>,
    pub shutter_speed: Option<String>,
    pub focal_length: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GalleryFolder {
    pub path: String,
    pub name: String,
    pub image_count: usize,
    pub last_modified: Option<DateTime<Utc>>,
}

// Custom command to read file as base64
#[tauri::command]
async fn read_image_as_base64(file_path: String) -> Result<String, String> {
    match fs::read(&file_path) {
        Ok(bytes) => {
            let base64_string = general_purpose::STANDARD.encode(&bytes);
            // Determine MIME type based on extension
            let extension = Path::new(&file_path)
                .extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("")
                .to_lowercase();
            
            let mime_type = match extension.as_str() {
                "jpg" | "jpeg" => "image/jpeg",
                "png" => "image/png",
                "gif" => "image/gif",
                "webp" => "image/webp",
                "bmp" => "image/bmp",
                "tiff" | "tif" => "image/tiff",
                _ => "image/jpeg", // Default
            };
            
            Ok(format!("data:{};base64,{}", mime_type, base64_string))
        }
        Err(e) => Err(format!("Failed to read file: {}", e))
    }
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
async fn scan_folder(folder_path: String) -> Result<Vec<ImageMetadata>, String> {
    let path = Path::new(&folder_path);
    
    if !path.exists() || !path.is_dir() {
        return Err("Invalid folder path".to_string());
    }

    let mut images = Vec::new();
    let supported_extensions = ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp", "heic", "raw", "cr2", "nef", "arw"];

    for entry in WalkDir::new(path)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            if let Some(extension) = entry.path().extension() {
                if let Some(ext_str) = extension.to_str() {
                    if supported_extensions.contains(&ext_str.to_lowercase().as_str()) {
                        if let Ok(metadata) = extract_image_metadata(entry.path()).await {
                            images.push(metadata);
                        }
                    }
                }
            }
        }
    }

    Ok(images)
}

#[tauri::command]
async fn get_recent_folders() -> Result<Vec<GalleryFolder>, String> {
    // This would typically read from a database or config file
    // For now, return some common directories
    let mut folders = Vec::new();
      // Try to get Pictures directory using dirs crate
    if let Some(user_dirs) = dirs::picture_dir() {
        if let Ok(metadata) = tokio::fs::metadata(&user_dirs).await {
            folders.push(GalleryFolder {
                path: user_dirs.to_string_lossy().to_string(),
                name: "Pictures".to_string(),
                image_count: 0, // Would be calculated
                last_modified: metadata.modified().ok().map(|t| DateTime::from(t)),
            });
        }
    }

    Ok(folders)
}

#[tauri::command]
async fn get_image_info(image_path: String) -> Result<ImageMetadata, String> {
    extract_image_metadata(Path::new(&image_path)).await
}

async fn extract_image_metadata(path: &Path) -> Result<ImageMetadata, String> {
    let file_name = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();

    let metadata = tokio::fs::metadata(path).await
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;

    let size = metadata.len();
    let modified = metadata.modified().ok().map(|t| DateTime::from(t));

    // Try to get image dimensions
    let (width, height) = match image::image_dimensions(path) {
        Ok((w, h)) => (w, h),
        Err(_) => (0, 0),
    };

    // Try to extract EXIF data
    let (camera_make, camera_model, iso, aperture, shutter_speed, focal_length, created) = 
        extract_exif_data(path);

    Ok(ImageMetadata {
        id: uuid::Uuid::new_v4().to_string(),
        path: path.to_string_lossy().to_string(),
        name: file_name,
        size,
        width,
        height,
        created,
        modified,
        camera_make,
        camera_model,
        iso,
        aperture,
        shutter_speed,
        focal_length,
    })
}

fn extract_exif_data(_path: &Path) -> (Option<String>, Option<String>, Option<u32>, Option<f64>, Option<String>, Option<f64>, Option<DateTime<Utc>>) {
    // EXIF extraction disabled for now - can be added later
    (None, None, None, None, None, None, None)
}

#[tauri::command]
async fn create_thumbnail(image_path: String, size: u32) -> Result<String, String> {
    let input_path = Path::new(&image_path);
    let img = image::open(input_path)
        .map_err(|e| format!("Failed to open image: {}", e))?;
    
    let thumbnail = img.thumbnail(size, size);
    
    // Create a temporary file for the thumbnail
    let temp_dir = std::env::temp_dir();
    let thumbnail_path = temp_dir.join(format!("thumb_{}_{}.jpg", 
        uuid::Uuid::new_v4().to_string(), size));
    
    thumbnail.save(&thumbnail_path)
        .map_err(|e| format!("Failed to save thumbnail: {}", e))?;
    
    Ok(thumbnail_path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_notification::init())        .invoke_handler(tauri::generate_handler![
            scan_folder,
            get_recent_folders,
            get_image_info,
            create_thumbnail,
            read_image_as_base64
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
