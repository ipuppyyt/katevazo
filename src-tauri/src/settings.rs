//! User settings, persisted as JSON in the app config directory.
use std::{fs, path::PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct Settings {
    /// Where downloads are saved; `None` means the system Downloads folder.
    pub download_dir: Option<String>,
    /// "system", "light" or "dark".
    pub theme: String,
    /// Write title, uploader and chapters into the downloaded file.
    pub embed_metadata: bool,
    /// Use the video's thumbnail as cover art where the format supports it.
    pub embed_thumbnail: bool,
    /// How downloaded files are named, e.g. `{title} [{id}]`; see `template`.
    pub filename_template: String,
    /// Offer to download a video link when one is copied.
    pub watch_clipboard: bool,
    /// Show a desktop notification when a download finishes or fails in the background.
    pub notifications: bool,
    /// How many downloads run at once; the rest wait in the queue.
    pub max_concurrent: u32,
    /// Cap on each download's speed in KiB/s; `None` means unlimited.
    pub speed_limit_kbps: Option<u32>,
}

pub const MAX_CONCURRENT: u32 = 8;

impl Default for Settings {
    fn default() -> Self {
        Self {
            download_dir: None,
            theme: "system".into(),
            embed_metadata: true,
            embed_thumbnail: true,
            filename_template: crate::template::DEFAULT.into(),
            watch_clipboard: true,
            notifications: true,
            max_concurrent: 3,
            speed_limit_kbps: None,
        }
    }
}

fn path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("settings.json"))
}

/// A missing or corrupt file falls back to defaults rather than blocking the app.
pub fn load(app: &AppHandle) -> Settings {
    path(app)
        .ok()
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Settings {
    load(&app)
}

#[tauri::command]
pub fn set_settings(app: AppHandle, settings: Settings) -> Result<(), String> {
    if !matches!(settings.theme.as_str(), "system" | "light" | "dark") {
        return Err(format!("unknown theme: {}", settings.theme));
    }
    crate::template::render(&settings.filename_template)?;
    if !(1..=MAX_CONCURRENT).contains(&settings.max_concurrent) {
        return Err(format!("simultaneous downloads must be 1 to {MAX_CONCURRENT}"));
    }
    if settings.speed_limit_kbps == Some(0) {
        return Err("the speed limit must be above zero; turn it off instead".into());
    }
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(path(&app)?, json).map_err(|e| e.to_string())?;
    crate::download::set_concurrency(&app, settings.max_concurrent as usize);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_fields_use_defaults() {
        let s: Settings = serde_json::from_str(r#"{"theme":"dark"}"#).unwrap();
        assert_eq!(s.theme, "dark");
        assert!(s.download_dir.is_none());
        assert!(s.embed_metadata && s.embed_thumbnail);
        assert_eq!(s.filename_template, "{title} [{id}]");
        assert!(s.watch_clipboard);
        assert_eq!((s.max_concurrent, s.speed_limit_kbps), (3, None));
    }
}
