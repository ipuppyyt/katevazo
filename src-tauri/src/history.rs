//! Completed-download history, stored in SQLite in the app data directory.
use rusqlite::{Connection, params};
use serde::Serialize;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, PartialEq)]
pub struct Entry {
    pub id: i64,
    pub title: String,
    pub url: String,
    pub file: Option<String>,
    pub kind: String,
    pub finished_at: i64,
}

fn open(app: &AppHandle) -> Result<Connection, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let conn = Connection::open(dir.join("history.db")).map_err(|e| e.to_string())?;
    init(&conn)?;
    Ok(conn)
}

fn init(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            file TEXT,
            kind TEXT NOT NULL,
            finished_at INTEGER NOT NULL DEFAULT (unixepoch())
        );",
    )
    .map_err(|e| e.to_string())
}

fn insert(
    conn: &Connection,
    title: &str,
    url: &str,
    file: Option<&str>,
    kind: &str,
) -> Result<(), String> {
    conn.execute(
        "INSERT INTO history (title, url, file, kind) VALUES (?1, ?2, ?3, ?4)",
        params![title, url, file, kind],
    )
    .map(|_| ())
    .map_err(|e| e.to_string())
}

fn list_all(conn: &Connection) -> Result<Vec<Entry>, String> {
    let mut stmt = conn
        .prepare("SELECT id, title, url, file, kind, finished_at FROM history ORDER BY id DESC LIMIT 500")
        .map_err(|e| e.to_string())?;
    stmt.query_map([], |r| {
        Ok(Entry {
            id: r.get(0)?,
            title: r.get(1)?,
            url: r.get(2)?,
            file: r.get(3)?,
            kind: r.get(4)?,
            finished_at: r.get(5)?,
        })
    })
    .and_then(|rows| rows.collect())
    .map_err(|e| e.to_string())
}

pub fn record(app: &AppHandle, title: &str, url: &str, file: Option<&str>, kind: &str) {
    if let Err(e) = open(app).and_then(|c| insert(&c, title, url, file, kind)) {
        eprintln!("could not record history: {e}");
    }
}

#[tauri::command]
pub fn list_history(app: AppHandle) -> Result<Vec<Entry>, String> {
    list_all(&open(&app)?)
}

#[tauri::command]
pub fn clear_history(app: AppHandle) -> Result<(), String> {
    open(&app)?
        .execute("DELETE FROM history", [])
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn insert_then_list_newest_first() {
        let conn = Connection::open_in_memory().unwrap();
        init(&conn).unwrap();
        insert(&conn, "A", "u1", Some("/a.mp4"), "video").unwrap();
        insert(&conn, "B", "u2", None, "audio").unwrap();
        let all = list_all(&conn).unwrap();
        assert_eq!(all.len(), 2);
        assert_eq!(all[0].title, "B");
        assert_eq!(all[1].file.as_deref(), Some("/a.mp4"));
    }
}
