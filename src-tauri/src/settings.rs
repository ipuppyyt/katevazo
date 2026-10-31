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
    /// How many times a download is retried on its own after a network problem.
    pub max_retries: u32,
    /// Proxy for all traffic, e.g. `socks5://127.0.0.1:1080`; empty means none.
    pub proxy: String,
    /// Browser whose cookies sign yt-dlp in (see `COOKIE_BROWSERS`); empty means none.
    pub cookies_from_browser: String,
}

pub const MAX_CONCURRENT: u32 = 8;
pub const MAX_RETRIES: u32 = 10;

/// Browsers yt-dlp can read cookies from.
pub const COOKIE_BROWSERS: &[&str] =
    &["brave", "chrome", "chromium", "edge", "firefox", "opera", "safari", "vivaldi"];

const PROXY_SCHEMES: &[&str] = &["http://", "https://", "socks4://", "socks4a://", "socks5://", "socks5h://"];

/// A proxy address must name its protocol, so it can never be read as a command-line flag.
fn check_proxy(proxy: &str) -> Result<(), String> {
    let p = proxy.trim();
    if p.is_empty() {
        return Ok(());
    }
    if p.contains(char::is_whitespace) || !PROXY_SCHEMES.iter().any(|s| p.starts_with(s)) {
        return Err("a proxy looks like http://host:port or socks5://host:port".into());
    }
    Ok(())
}

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
            max_retries: 3,
            proxy: String::new(),
            cookies_from_browser: String::new(),
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
    check_proxy(&settings.proxy)?;
    if !settings.cookies_from_browser.is_empty()
        && !COOKIE_BROWSERS.contains(&settings.cookies_from_browser.as_str())
    {
        return Err(format!("unknown browser: {}", settings.cookies_from_browser));
    }
    if settings.max_retries > MAX_RETRIES {
        return Err(format!("retries must be at most {MAX_RETRIES}"));
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
        assert_eq!((s.max_concurrent, s.speed_limit_kbps, s.max_retries), (3, None, 3));
        assert!(s.proxy.is_empty() && s.cookies_from_browser.is_empty());
    }

    #[test]
    fn proxies_need_a_protocol() {
        for ok in ["", "http://127.0.0.1:8080", "socks5://user:pw@host:1080", " socks5h://h:1 "] {
            assert!(check_proxy(ok).is_ok(), "{ok:?} should be accepted");
        }
        for bad in ["127.0.0.1:8080", "--exec calc", "ftp://h", "http://a b"] {
            assert!(check_proxy(bad).is_err(), "{bad:?} should be rejected");
        }
    }
}
