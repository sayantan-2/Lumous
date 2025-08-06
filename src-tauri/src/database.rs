use crate::models::*;
use anyhow::Result;
use std::collections::HashMap;

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

    pub fn add_file(&self, file: FileMeta) -> Result<String> {
        // In a real implementation, this would be handled by proper mutex/locks
        // For now, we'll use a static database in the commands module
        println!("Adding file to database: {}", file.name);
        Ok(file.id.clone())
    }

    pub fn get_files(&self, offset: usize, limit: usize) -> Result<Vec<FileMeta>> {
        let mut all_files: Vec<FileMeta> = self.files.values().cloned().collect();
        all_files.sort_by(|a, b| b.modified.cmp(&a.modified)); // Sort by modification time, newest first

        let end = std::cmp::min(offset + limit, all_files.len());
        Ok(all_files[offset..end].to_vec())
    }

    pub fn get_file(&self, id: &str) -> Result<FileMeta> {
        self.files.get(id).cloned()
            .ok_or_else(|| anyhow::anyhow!("File not found"))
    }

    pub fn add_album(&self, album: Album) -> Result<()> {
        println!("Adding album to database: {}", album.name);
        Ok(())
    }

    pub fn get_albums(&self) -> Result<Vec<Album>> {
        Ok(self.albums.values().cloned().collect())
    }

    pub fn add_file_to_album(&self, _album_id: &str, _file_id: &str) -> Result<()> {
        // TODO: Implement album-file relationships
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
}
