use anyhow::{Result, anyhow};
use std::path::Path;
use sha2::{Digest, Sha256};
use image::codecs::jpeg::JpegEncoder;

pub async fn generate_thumbnail(file_path: &str, size: u32) -> Result<String> {
    let file_path = file_path.to_string();
    let res = tokio::task::spawn_blocking(move || {
        let source = Path::new(&file_path);

        // Create thumbnails directory if it doesn't exist
        let thumbnails_dir = get_thumbnails_dir()?;
        std::fs::create_dir_all(&thumbnails_dir)?;

        // Generate thumbnail filename based on full path hash + size to avoid collisions
        let mut hasher = Sha256::new();
        hasher.update(file_path.as_bytes());
        let hash = hasher.finalize();
        let short = &hex::encode(hash)[..16];
        let thumbnail_filename = format!("{}_{}.jpg", short, size);
        let thumbnail_path = thumbnails_dir.join(thumbnail_filename);

        // Check if thumbnail already exists
        if thumbnail_path.exists() {
            return Ok(thumbnail_path.to_string_lossy().to_string());
        }

        // Load and resize image
        let img = image::open(source)?;
        let thumbnail = img.thumbnail(size, size);

        // Save thumbnail as JPEG with tuned quality for speed/size tradeoff
        let mut out = std::fs::File::create(&thumbnail_path)?;
        let mut encoder = JpegEncoder::new_with_quality(&mut out, 70);
        encoder.encode_image(&thumbnail)?;

        Ok::<String, anyhow::Error>(thumbnail_path.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| anyhow!("Join error generating thumbnail: {}", e))??;

    Ok(res)
}

pub fn get_thumbnails_dir() -> Result<std::path::PathBuf> {
    // Get app data directory
    let app_data = dirs::cache_dir()
        .or_else(|| dirs::home_dir().map(|p| p.join(".cache")))
        .ok_or_else(|| anyhow::anyhow!("Cannot determine cache directory"))?;

    Ok(app_data.join("local-gallery").join("thumbnails"))
}

/// Best-effort removal of all thumbnails for a given set of files and size.
pub fn remove_thumbnails_for_paths(paths: &[String], size: u32) {
    if let Ok(dir) = get_thumbnails_dir() {
        for p in paths {
            let mut hasher = Sha256::new();
            hasher.update(p.as_bytes());
            let hash = hasher.finalize();
            let short = &hex::encode(hash)[..16];
            let fname = format!("{}_{}.jpg", short, size);
            let target = dir.join(fname);
            let _ = std::fs::remove_file(target);
        }
    }
}

/// Remove entire thumbnails cache folder.
pub fn remove_all_thumbnails() {
    if let Ok(dir) = get_thumbnails_dir() {
        let _ = std::fs::remove_dir_all(dir);
    }
}
