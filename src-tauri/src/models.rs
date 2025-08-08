use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileMeta {
    pub id: String,
    pub path: String,
    pub name: String,
    pub size: i64,
    pub modified: String, // ISO timestamp
    pub created: String,  // ISO timestamp
    pub file_type: String,
    pub dimensions: Option<Dimensions>,
    pub thumbnail_path: Option<String>,
    pub tags: Vec<String>,
    pub albums: Vec<String>,
    pub rating: Option<i32>,
    pub metadata: Option<ImageMetadata>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Dimensions {
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImageMetadata {
    pub camera_make: Option<String>,
    pub camera_model: Option<String>,
    pub lens_model: Option<String>,
    pub focal_length: Option<f32>,
    pub aperture: Option<f32>,
    pub shutter_speed: Option<String>,
    pub iso: Option<u32>,
    pub date_taken: Option<String>,
    pub gps_coordinates: Option<GpsCoordinates>,
    pub color_space: Option<String>,
    pub resolution: Option<Resolution>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GpsCoordinates {
    pub latitude: f64,
    pub longitude: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Resolution {
    pub x: u32,
    pub y: u32,
    pub unit: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Album {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub cover_image: Option<String>,
    pub created: String,
    pub modified: String,
    pub file_count: usize,
}

impl Album {
    pub fn new(name: String, description: Option<String>) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            description,
            cover_image: None,
            created: now.clone(),
            modified: now,
            file_count: 0,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub created: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub theme: String,
    pub thumbnail_size: i32,
    pub default_folder: Option<String>,
    pub cache_location: Option<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            thumbnail_size: 200,
            default_folder: None,
            cache_location: None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchQuery {
    pub query: Option<String>,
    pub file_types: Option<Vec<String>>,
    pub date_range: Option<DateRange>,
    pub size_range: Option<SizeRange>,
    pub tags: Option<Vec<String>>,
    pub albums: Option<Vec<String>>,
    pub rating: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DateRange {
    pub start: String,
    pub end: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SizeRange {
    pub min: i64,
    pub max: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IndexResult {
    pub total_files: usize,
    pub indexed_files: usize,
    pub skipped_files: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProgressUpdate {
    pub current: usize,
    pub total: usize,
    pub message: String,
}

// Legacy compatibility - keeping some old structures for now
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ThumbnailInfo {
    pub id: i64,
    pub file_id: i64,
    pub size: i32,
    pub path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EditOperation {
    pub rotate: Option<i32>,
    pub flip_horizontal: Option<bool>,
    pub flip_vertical: Option<bool>,
    pub crop: Option<CropOperation>,
    pub exposure: Option<f32>,
    pub contrast: Option<f32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CropOperation {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}
