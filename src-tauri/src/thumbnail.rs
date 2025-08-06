use anyhow::Result;
use std::path::Path;
use image::ImageFormat;

pub async fn generate_thumbnail(file_path: &str, size: u32) -> Result<String> {
    let source = Path::new(file_path);

    // Create thumbnails directory if it doesn't exist
    let thumbnails_dir = get_thumbnails_dir()?;
    std::fs::create_dir_all(&thumbnails_dir)?;

    // Generate thumbnail filename based on original file hash/path
    let file_stem = source.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown");
    let thumbnail_filename = format!("{}_{}.jpg", file_stem, size);
    let thumbnail_path = thumbnails_dir.join(thumbnail_filename);

    // Check if thumbnail already exists
    if thumbnail_path.exists() {
        return Ok(thumbnail_path.to_string_lossy().to_string());
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
