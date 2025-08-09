use crate::models::{FileMeta, Dimensions};
use std::path::Path;
use std::fs;
use walkdir::WalkDir;
use uuid::Uuid;

const SUPPORTED_EXTENSIONS: &[&str] = &[
    "jpg", "jpeg", "png", "gif", "bmp", "webp", "tiff", "tif", "ico"
];

pub async fn scan_directory(root: &Path, _recursive: bool) -> Result<Vec<FileMeta>, Box<dyn std::error::Error + Send + Sync>> {
    let mut files = Vec::new();
    
    // Force non-recursive (max_depth = 1)
    let walker = WalkDir::new(root).max_depth(1).into_iter();

    for entry in walker.filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            if let Some(file_meta) = process_file(entry.path()).await? {
                files.push(file_meta);
            }
        }
    }

    Ok(files)
}

/// Shallow file info used for incremental comparisons without decoding images.
#[derive(Clone, Debug)]
pub struct ShallowMeta {
    pub path: String,
    pub name: String,
    pub size: i64,
    pub modified_sec: i64,
    pub created_sec: i64,
    pub ext: String,
}

/// Scan directory without decoding images; returns basic metadata for quick diffing.
pub async fn scan_directory_shallow(root: &Path, _recursive: bool) -> Result<Vec<ShallowMeta>, Box<dyn std::error::Error + Send + Sync>> {
    let mut files = Vec::new();

    let walker = WalkDir::new(root).max_depth(1).into_iter();

    for entry in walker.filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let path = entry.path();
            let extension = path
                .extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("")
                .to_lowercase();

            if !SUPPORTED_EXTENSIONS.contains(&extension.as_str()) {
                continue;
            }

            let metadata = fs::metadata(path)?;
            let file_name = path
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("unknown")
                .to_string();

            use std::time::{SystemTime, UNIX_EPOCH};
            let modified_sec: i64 = metadata
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);

            let created_sec: i64 = metadata
                .created()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);

            files.push(ShallowMeta {
                path: path.to_string_lossy().to_string(),
                name: file_name,
                size: metadata.len() as i64,
                modified_sec,
                created_sec,
                ext: extension,
            });
        }
    }

    Ok(files)
}

pub async fn process_file(path: &Path) -> Result<Option<FileMeta>, Box<dyn std::error::Error + Send + Sync>> {
    // Check if it's an image file
    let extension = path.extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();

    if !SUPPORTED_EXTENSIONS.contains(&extension.as_str()) {
        return Ok(None);
    }

    let metadata = fs::metadata(path)?;
    let file_name = path.file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("unknown")
        .to_string();

    // Try to get image dimensions cheaply via header when possible
    let dimensions = match image::image_dimensions(path) {
        Ok((w, h)) => Some(Dimensions { width: w as u32, height: h as u32 }),
        Err(_) => None,
    };

    // Convert system time to ISO string
    let modified = metadata.modified()
        .map(|time| {
            let datetime: chrono::DateTime<chrono::Utc> = time.into();
            datetime.to_rfc3339()
        })
        .unwrap_or_else(|_| chrono::Utc::now().to_rfc3339());

    let created = metadata.created()
        .map(|time| {
            let datetime: chrono::DateTime<chrono::Utc> = time.into();
            datetime.to_rfc3339()
        })
        .unwrap_or_else(|_| chrono::Utc::now().to_rfc3339());

    Ok(Some(FileMeta {
        id: Uuid::new_v4().to_string(),
        path: path.to_string_lossy().to_string(),
        name: file_name,
        size: metadata.len() as i64,
        modified,
        created,
        file_type: extension,
        dimensions,
        thumbnail_path: None,
        tags: vec![],
        albums: vec![],
        rating: None,
        metadata: None, // TODO: Extract EXIF data
    }))
}

/// Compute a quick snapshot for a folder: total eligible files and aggregated mtime.
pub async fn compute_folder_snapshot(root: &Path) -> Result<crate::commands::FolderSnapshot, Box<dyn std::error::Error + Send + Sync>> {
    let shallow = scan_directory_shallow(root, false).await?;
    // Aggregate mtime as a simple sum of UNIX seconds to detect changes across the set
    let mut agg: i64 = 0;
    for s in &shallow { agg = agg.wrapping_add(s.modified_sec); }
    Ok(crate::commands::FolderSnapshot { file_count: shallow.len(), agg_mtime: agg })
}
