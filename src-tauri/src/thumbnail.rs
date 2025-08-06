use std::path::Path;
use image::ImageFormat;
use anyhow::Result;

pub async fn generate_thumbnail(file_path: &str, size: u32) -> Result<String> {
    let source = Path::new(file_path);
    
    // Create thumbnails directory if it doesn't exist
    let thumbnails_dir = get_thumbnails_dir()?;
    std::fs::create_dir_all(&thumbnails_dir)?;

    // Generate thumbnail filename based on source file path and size
    let file_stem = source.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("thumbnail");
    let thumbnail_filename = format!("{}_{}.jpg", file_stem, size);
    let thumbnail_path = thumbnails_dir.join(thumbnail_filename);

    // Check if thumbnail already exists and is newer than source
    if thumbnail_path.exists() {
        if let (Ok(thumb_meta), Ok(source_meta)) = (
            std::fs::metadata(&thumbnail_path),
            std::fs::metadata(source)
        ) {
            if let (Ok(thumb_time), Ok(source_time)) = (
                thumb_meta.modified(),
                source_meta.modified()
            ) {
                if thumb_time >= source_time {
                    return Ok(thumbnail_path.to_string_lossy().to_string());
                }
            }
        }
    }

    // Load and resize image
    let img = image::open(source)?;
    let thumbnail = img.thumbnail(size, size);
    
    // Save thumbnail as JPEG
    thumbnail.save_with_format(&thumbnail_path, ImageFormat::Jpeg)?;

    Ok(thumbnail_path.to_string_lossy().to_string())
}

fn get_thumbnails_dir() -> Result<std::path::PathBuf> {
    // Get app data directory
    let app_data = dirs::cache_dir()
        .or_else(|| dirs::home_dir().map(|p| p.join(".cache")))
        .ok_or_else(|| anyhow::anyhow!("Cannot determine cache directory"))?;

    Ok(app_data.join("local-gallery").join("thumbnails"))
}
