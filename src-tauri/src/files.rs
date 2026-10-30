//! Opening finished downloads in the default app or the file manager.
use std::path::Path;

use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

use crate::history;

/// Only files Katevazo itself downloaded may be opened, so the front end cannot be
/// used to launch arbitrary paths.
fn checked(app: &AppHandle, path: &str) -> Result<(), String> {
    if !history::has_file(app, path) {
        return Err("That file is not in your download history.".into());
    }
    if !Path::new(path).exists() {
        return Err("The file has been moved or deleted.".into());
    }
    Ok(())
}

#[tauri::command]
pub fn open_file(app: AppHandle, path: String) -> Result<(), String> {
    checked(&app, &path)?;
    app.opener()
        .open_path(&path, None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reveal_file(app: AppHandle, path: String) -> Result<(), String> {
    checked(&app, &path)?;
    app.opener().reveal_item_in_dir(&path).map_err(|e| e.to_string())
}
