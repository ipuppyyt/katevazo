//! Thin wrapper around the bundled yt-dlp sidecar.
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::{ShellExt, process::Command};

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub struct Format {
    pub format_id: String,
    pub ext: String,
    pub height: Option<u32>,
    pub vcodec: Option<String>,
    pub acodec: Option<String>,
    pub filesize: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub struct Metadata {
    pub id: String,
    pub title: String,
    pub thumbnail: Option<String>,
    pub duration: Option<f64>,
    pub uploader: Option<String>,
    #[serde(default)]
    pub formats: Vec<Format>,
    /// Number of entries when the URL is a playlist.
    #[serde(default)]
    pub playlist_count: Option<u32>,
}

pub fn parse_metadata(json: &str) -> Result<Metadata, String> {
    serde_json::from_str(json).map_err(|e| format!("invalid yt-dlp metadata: {e}"))
}

const EXE: &str = if cfg!(windows) {
    "yt-dlp.exe"
} else {
    "yt-dlp"
};

/// Updatable copy in the app data dir. The bundled sidecar sits in the install
/// directory, which is often read-only, so updates are applied to this copy instead.
fn managed_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("bin").join(EXE))
}

/// Prefers the updated copy over the bundled sidecar when one exists.
pub fn command(app: &AppHandle) -> Result<Command, String> {
    let managed = managed_path(app)?;
    if managed.exists() {
        Ok(app.shell().command(managed))
    } else {
        app.shell().sidecar("yt-dlp").map_err(|e| e.to_string())
    }
}

async fn run(app: &AppHandle, args: &[&str]) -> Result<String, String> {
    let out = command(app)?
        .args(args)
        .output()
        .await
        .map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

#[tauri::command]
pub async fn ytdlp_version(app: AppHandle) -> Result<String, String> {
    run(&app, &["--version"]).await
}

/// Updates yt-dlp to the latest release and returns the new version.
#[tauri::command]
pub async fn update_ytdlp(app: AppHandle) -> Result<String, String> {
    let managed = managed_path(&app)?;
    if !managed.exists() {
        let bundled = std::env::current_exe()
            .map_err(|e| e.to_string())?
            .parent()
            .ok_or("no executable directory")?
            .join(EXE);
        std::fs::create_dir_all(managed.parent().unwrap()).map_err(|e| e.to_string())?;
        std::fs::copy(&bundled, &managed)
            .map_err(|e| format!("could not copy {}: {e}", bundled.display()))?;
    }
    let out = app
        .shell()
        .command(&managed)
        .args(["-U"])
        .output()
        .await
        .map_err(|e| e.to_string())?;
    if !out.status.success() {
        return Err(String::from_utf8_lossy(&out.stderr).trim().to_string());
    }
    run(&app, &["--version"]).await
}

#[tauri::command]
pub async fn fetch_metadata(app: AppHandle, url: String) -> Result<Metadata, String> {
    // `--` stops option parsing so a hostile "URL" cannot inject yt-dlp flags.
    let json = run(
        &app,
        &[
            "--dump-single-json",
            "--no-warnings",
            "--no-playlist",
            "--",
            &url,
        ],
    )
    .await?;
    parse_metadata(&json)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_minimal_metadata() {
        let json = r#"{"id":"abc","title":"Hi","duration":12.5,
            "formats":[{"format_id":"18","ext":"mp4","height":360,"vcodec":"avc1","acodec":"mp4a"}]}"#;
        let m = parse_metadata(json).unwrap();
        assert_eq!(m.title, "Hi");
        assert_eq!(m.formats[0].height, Some(360));
        assert!(m.thumbnail.is_none());
    }

    #[test]
    fn rejects_garbage() {
        assert!(parse_metadata("not json").is_err());
    }
}
