use crate::models::FileMeta;
use anyhow::Result;
use rusqlite::{params, Connection, OptionalExtension};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new() -> Result<Self> {
        let db_path = Self::db_file_path();

        // Ensure directory exists
        if let Some(parent) = db_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let conn = Connection::open(db_path)?;

        // --- FIX STARTS HERE ---
        // We use execute_batch because 'PRAGMA journal_mode' returns a row ("wal"),
        // which causes normal 'execute()' to panic with "Execute returned results".
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;",
        )?;
        // --- FIX ENDS HERE ---

        let db = Self {
            conn: Mutex::new(conn),
        };
        db.init_schema()?;
        Ok(db)
    }

    fn db_file_path() -> PathBuf {
        dirs::data_dir()
            .unwrap_or_else(|| std::env::current_dir().unwrap())
            .join("local-gallery")
            .join("library.db")
    }

    fn init_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "CREATE TABLE IF NOT EXISTS files (
                id TEXT PRIMARY KEY,
                path TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                size INTEGER NOT NULL,
                modified TEXT NOT NULL,
                file_type TEXT,
                thumbnail_path TEXT,
                folder_path TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_folder_path ON files(folder_path)",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS folder_snapshots (
                path TEXT PRIMARY KEY,
                file_count INTEGER NOT NULL,
                agg_mtime INTEGER NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS kv_store (
                key TEXT PRIMARY KEY,
                value TEXT
            )",
            [],
        )?;

        // New tables for Albums
        conn.execute(
            "CREATE TABLE IF NOT EXISTS albums (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                cover_image_id TEXT
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS album_files (
                album_id TEXT NOT NULL,
                file_id TEXT NOT NULL,
                PRIMARY KEY (album_id, file_id),
                FOREIGN KEY(album_id) REFERENCES albums(id) ON DELETE CASCADE,
                FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
            )",
            [],
        )?;

        Ok(())
    }

    // --- File Operations ---

    pub fn add_file(&self, file: &FileMeta, folder_path: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO files (id, path, name, size, modified, file_type, thumbnail_path, folder_path)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(path) DO UPDATE SET
                size=excluded.size,
                modified=excluded.modified,
                thumbnail_path=excluded.thumbnail_path,
                folder_path=excluded.folder_path",
            params![
                file.id,
                file.path,
                file.name,
                file.size,
                file.modified,
                file.file_type,
                file.thumbnail_path,
                folder_path
            ],
        )?;
        Ok(())
    }

    pub fn get_file(&self, id: &str) -> Result<Option<FileMeta>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, path, name, size, modified, file_type, thumbnail_path FROM files WHERE id = ?1")?;

        let file = stmt
            .query_row(params![id], |row| {
                Ok(FileMeta {
                    id: row.get(0)?,
                    path: row.get(1)?,
                    name: row.get(2)?,
                    size: row.get(3)?,
                    modified: row.get(4)?,
                    file_type: row.get(5)?,
                    thumbnail_path: row.get(6)?,
                    ..Default::default()
                })
            })
            .optional()?;

        Ok(file)
    }

    pub fn get_files(&self, offset: usize, limit: usize) -> Result<Vec<FileMeta>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, path, name, size, modified, file_type, thumbnail_path
             FROM files
             ORDER BY modified DESC
             LIMIT ?1 OFFSET ?2",
        )?;

        let rows = stmt.query_map(params![limit, offset], |row| {
            Ok(FileMeta {
                id: row.get(0)?,
                path: row.get(1)?,
                name: row.get(2)?,
                size: row.get(3)?,
                modified: row.get(4)?,
                file_type: row.get(5)?,
                thumbnail_path: row.get(6)?,
                ..Default::default()
            })
        })?;

        let mut files = Vec::new();
        for file in rows {
            files.push(file?);
        }
        Ok(files)
    }

    pub fn get_files_for_folder(
        &self,
        folder_path: &str,
        offset: usize,
        limit: usize,
    ) -> Result<Vec<FileMeta>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, path, name, size, modified, file_type, thumbnail_path
             FROM files
             WHERE folder_path = ?1
             ORDER BY modified DESC
             LIMIT ?2 OFFSET ?3",
        )?;

        let rows = stmt.query_map(params![folder_path, limit, offset], |row| {
            Ok(FileMeta {
                id: row.get(0)?,
                path: row.get(1)?,
                name: row.get(2)?,
                size: row.get(3)?,
                modified: row.get(4)?,
                file_type: row.get(5)?,
                thumbnail_path: row.get(6)?,
                ..Default::default()
            })
        })?;

        let mut files = Vec::new();
        for file in rows {
            files.push(file?);
        }
        Ok(files)
    }

    pub fn remove_file(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM files WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn remove_file_by_path(&self, path: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM files WHERE path = ?1", params![path])?;
        Ok(())
    }

    pub fn get_all_file_paths_in_folder(&self, folder_path: &str) -> Result<Vec<(String, String)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, path FROM files WHERE folder_path = ?1")?;
        let rows = stmt.query_map(params![folder_path], |row| Ok((row.get(0)?, row.get(1)?)))?;

        let mut results = Vec::new();
        for r in rows {
            results.push(r?);
        }
        Ok(results)
    }

    // --- Folder/Snapshot Operations ---

    pub fn get_snapshot(&self, folder_path: &str) -> Result<Option<(usize, i64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt =
            conn.prepare("SELECT file_count, agg_mtime FROM folder_snapshots WHERE path = ?1")?;
        stmt.query_row(params![folder_path], |row| Ok((row.get(0)?, row.get(1)?)))
            .optional()
            .map_err(Into::into)
    }

    pub fn save_snapshot(&self, folder_path: &str, count: usize, agg_mtime: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO folder_snapshots (path, file_count, agg_mtime) VALUES (?1, ?2, ?3)
             ON CONFLICT(path) DO UPDATE SET file_count=excluded.file_count, agg_mtime=excluded.agg_mtime",
            params![folder_path, count, agg_mtime]
        )?;
        Ok(())
    }

    pub fn clear_folder(&self, folder_path: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM files WHERE folder_path = ?1",
            params![folder_path],
        )?;
        conn.execute(
            "DELETE FROM folder_snapshots WHERE path = ?1",
            params![folder_path],
        )?;
        Ok(())
    }

    pub fn get_indexed_folders(&self) -> Result<Vec<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT DISTINCT folder_path FROM files")?;
        let rows = stmt.query_map([], |row| row.get(0))?;
        let mut folders = Vec::new();
        for r in rows {
            folders.push(r?);
        }
        Ok(folders)
    }

    // --- KV Store (Settings) ---

    pub fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT value FROM kv_store WHERE key = ?1")?;
        stmt.query_row(params![key], |row| row.get(0))
            .optional()
            .map_err(Into::into)
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO kv_store (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn clear_library(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM files", [])?;
        conn.execute("DELETE FROM albums", [])?;
        conn.execute("DELETE FROM album_files", [])?;
        conn.execute("DELETE FROM folder_snapshots", [])?;
        conn.execute("DELETE FROM kv_store", [])?;
        Ok(())
    }
}
