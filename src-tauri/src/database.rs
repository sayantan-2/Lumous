use crate::models::*;
use anyhow::Result;
use std::collections::HashMap;
use std::sync::Mutex;
use once_cell::sync::Lazy;

// Global database instance
pub static DB: Lazy<Mutex<Database>> = Lazy::new(|| {
    Mutex::new(Database::new())
});

// For now, we'll use in-memory storage. In a real implementation, this would use SQLite.
pub struct Database {
    files: HashMap<String, FileMeta>,
    albums: HashMap<String, Album>,
    tags: HashMap<String, Tag>,
}

impl Database {
    pub fn new() -> Self {
        Self {
            files: HashMap::new(),
            albums: HashMap::new(),
            tags: HashMap::new(),
        }
    }

    pub fn add_file(&mut self, file: FileMeta) -> Result<String> {
        let id = file.id.clone();
        self.files.insert(id.clone(), file);
        println!("Added file to database with ID: {}", id);
        Ok(id)
    }

    pub fn get_files(&self, offset: usize, limit: usize) -> Result<Vec<FileMeta>> {
        let mut all_files: Vec<FileMeta> = self.files.values().cloned().collect();
        all_files.sort_by(|a, b| b.modified.cmp(&a.modified)); // Sort by modification time, newest first
        
        let end = std::cmp::min(offset + limit, all_files.len());
        if offset >= all_files.len() {
            Ok(vec![])
        } else {
            Ok(all_files[offset..end].to_vec())
        }
    }

    pub fn get_file(&self, id: &str) -> Result<FileMeta> {
        self.files.get(id).cloned()
            .ok_or_else(|| anyhow::anyhow!("File not found"))
    }

    pub fn add_album(&mut self, album: Album) -> Result<String> {
        let id = album.id.clone();
        self.albums.insert(id.clone(), album);
        println!("Added album to database with ID: {}", id);
        Ok(id)
    }

    pub fn get_albums(&self) -> Result<Vec<Album>> {
        Ok(self.albums.values().cloned().collect())
    }

    pub fn add_file_to_album(&mut self, album_id: &str, file_id: &str) -> Result<()> {
        // Update the file to include the album
        if let Some(file) = self.files.get_mut(file_id) {
            if !file.albums.contains(&album_id.to_string()) {
                file.albums.push(album_id.to_string());
            }
        }
        
        // Update album file count
        if let Some(album) = self.albums.get_mut(album_id) {
            album.file_count += 1;
            album.modified = chrono::Utc::now().to_rfc3339();
        }
        
        Ok(())
    }

    pub fn search_files(&self, query: &str) -> Result<Vec<FileMeta>> {
        let query_lower = query.to_lowercase();
        
        let results: Vec<FileMeta> = self.files
            .values()
            .filter(|file| {
                file.path.to_lowercase().contains(&query_lower) ||
                file.name.to_lowercase().contains(&query_lower) ||
                file.file_type.to_lowercase().contains(&query_lower)
            })
            .cloned()
            .collect();
            
        Ok(results)
    }

    pub fn get_file_count(&self) -> usize {
        self.files.len()
    }

    pub fn clear(&mut self) {
        self.files.clear();
        self.albums.clear();
        self.tags.clear();
    }
}
