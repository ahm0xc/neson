use std::path::Path;
use std::sync::Mutex;

use rusqlite::{Connection, OptionalExtension, params};

use crate::error::AppResult;
use crate::models::{Download, DownloadStatus};

const MIGRATIONS: &str = r#"
CREATE TABLE IF NOT EXISTS downloads (
    id               TEXT PRIMARY KEY,
    url              TEXT NOT NULL,
    filename         TEXT NOT NULL,
    dir              TEXT NOT NULL,
    status           TEXT NOT NULL,
    total_bytes      INTEGER,
    downloaded_bytes INTEGER NOT NULL DEFAULT 0,
    added_at         TEXT NOT NULL,
    completed_at     TEXT,
    error            TEXT
);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"#;

pub struct Db {
    conn: Mutex<Connection>,
}

impl Db {
    pub fn open(path: &Path) -> AppResult<Self> {
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "synchronous", "NORMAL")?;
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.migrate()?;
        Ok(db)
    }

    fn migrate(&self) -> AppResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(MIGRATIONS)?;
        Ok(())
    }

    pub fn insert_download(&self, d: &Download) -> AppResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO downloads
                (id, url, filename, dir, status, total_bytes, downloaded_bytes, added_at, completed_at, error)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                d.id,
                d.url,
                d.filename,
                d.dir,
                d.status.as_str(),
                d.total_bytes,
                d.downloaded_bytes,
                d.added_at,
                d.completed_at,
                d.error,
            ],
        )?;
        Ok(())
    }

    pub fn get_download(&self, id: &str) -> AppResult<Option<Download>> {
        let conn = self.conn.lock().unwrap();
        let dl = conn
            .query_row(
                "SELECT id, url, filename, dir, status, total_bytes, downloaded_bytes,
                        added_at, completed_at, error
                 FROM downloads WHERE id = ?1",
                params![id],
                row_to_download,
            )
            .optional()?;
        Ok(dl)
    }

    pub fn list_downloads(&self) -> AppResult<Vec<Download>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, url, filename, dir, status, total_bytes, downloaded_bytes,
                    added_at, completed_at, error
             FROM downloads ORDER BY added_at DESC, rowid DESC",
        )?;
        let rows = stmt.query_map([], row_to_download)?;
        let mut out = Vec::new();
        for row in rows {
            out.push(row?);
        }
        Ok(out)
    }

    pub fn set_status(
        &self,
        id: &str,
        status: DownloadStatus,
        error: Option<&str>,
    ) -> AppResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE downloads SET status = ?2, error = ?3 WHERE id = ?1",
            params![id, status.as_str(), error],
        )?;
        Ok(())
    }

    pub fn set_progress(&self, id: &str, downloaded: i64, total: Option<i64>) -> AppResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE downloads
             SET downloaded_bytes = ?2, total_bytes = COALESCE(?3, total_bytes)
             WHERE id = ?1",
            params![id, downloaded, total],
        )?;
        Ok(())
    }

    pub fn set_completed(&self, id: &str, downloaded: i64, completed_at: &str) -> AppResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE downloads
             SET status = ?2, downloaded_bytes = ?3, total_bytes = COALESCE(total_bytes, ?3),
                 completed_at = ?4, error = NULL
             WHERE id = ?1",
            params![id, DownloadStatus::Completed.as_str(), downloaded, completed_at],
        )?;
        Ok(())
    }

    pub fn delete_download(&self, id: &str) -> AppResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM downloads WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> AppResult<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let value = conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                params![key],
                |row| row.get::<_, String>(0),
            )
            .optional()?;
        Ok(value)
    }

    pub fn set_setting(&self, key: &str, value: &str) -> AppResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }
}

fn row_to_download(row: &rusqlite::Row<'_>) -> rusqlite::Result<Download> {
    let status: String = row.get("status")?;
    Ok(Download {
        id: row.get("id")?,
        url: row.get("url")?,
        filename: row.get("filename")?,
        dir: row.get("dir")?,
        status: DownloadStatus::from_db(&status),
        total_bytes: row.get("total_bytes")?,
        downloaded_bytes: row.get("downloaded_bytes")?,
        added_at: row.get("added_at")?,
        completed_at: row.get("completed_at")?,
        error: row.get("error")?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_db() -> (Db, std::path::PathBuf) {
        let dir = std::env::temp_dir().join(format!("neson-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let db = Db::open(&dir.join("neson.db")).unwrap();
        (db, dir)
    }

    fn sample(id: &str) -> Download {
        Download {
            id: id.to_string(),
            url: "https://example.com/file.bin".to_string(),
            filename: "file.bin".to_string(),
            dir: "/tmp".to_string(),
            status: DownloadStatus::Queued,
            total_bytes: None,
            downloaded_bytes: 0,
            added_at: "2026-10-14T00:00:00Z".to_string(),
            completed_at: None,
            error: None,
        }
    }

    #[test]
    fn insert_update_and_list_roundtrip() {
        let (db, dir) = temp_db();

        db.insert_download(&sample("a")).unwrap();
        db.insert_download(&sample("b")).unwrap();

        assert_eq!(db.list_downloads().unwrap().len(), 2);

        db.set_progress("a", 512, Some(1024)).unwrap();
        let stored = db.get_download("a").unwrap().unwrap();
        assert_eq!(stored.downloaded_bytes, 512);
        assert_eq!(stored.total_bytes, Some(1024));

        db.set_status("a", DownloadStatus::Paused, None).unwrap();
        assert_eq!(
            db.get_download("a").unwrap().unwrap().status,
            DownloadStatus::Paused
        );

        db.set_completed("a", 1024, "2026-10-14T01:00:00Z").unwrap();
        let done = db.get_download("a").unwrap().unwrap();
        assert_eq!(done.status, DownloadStatus::Completed);
        assert_eq!(done.completed_at.as_deref(), Some("2026-10-14T01:00:00Z"));

        db.delete_download("b").unwrap();
        assert_eq!(db.list_downloads().unwrap().len(), 1);

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn settings_persist_and_upsert() {
        let (db, dir) = temp_db();

        assert_eq!(db.get_setting("max_active").unwrap(), None);
        db.set_setting("max_active", "3").unwrap();
        assert_eq!(db.get_setting("max_active").unwrap(), Some("3".to_string()));
        db.set_setting("max_active", "5").unwrap();
        assert_eq!(db.get_setting("max_active").unwrap(), Some("5".to_string()));

        std::fs::remove_dir_all(&dir).ok();
    }
}
