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
    /// Languages with uploaded subtitles; filled in by `parse_metadata`.
    #[serde(default)]
    pub subtitle_langs: Vec<String>,
    /// Languages with automatic captions that are worth offering; see `auto_caption_langs`.
    #[serde(default)]
    pub auto_caption_langs: Vec<String>,
}

pub fn parse_metadata(json: &str) -> Result<Metadata, String> {
    let err = |e: serde_json::Error| format!("invalid yt-dlp metadata: {e}");
    let raw: serde_json::Value = serde_json::from_str(json).map_err(err)?;
    let mut meta: Metadata = serde_json::from_value(raw.clone()).map_err(err)?;
    let langs = |key: &str| -> Vec<String> {
        let mut v: Vec<String> = raw[key]
            .as_object()
            .map(|m| m.keys().cloned().collect())
            .unwrap_or_default();
        v.sort();
        v
    };
    meta.subtitle_langs = langs("subtitles")
        .into_iter()
        // "live_chat" is the stream's chat replay, not subtitles.
        .filter(|l| l != "live_chat")
        .collect();
    meta.auto_caption_langs = auto_caption_langs(&langs("automatic_captions"));
    Ok(meta)
}

/// YouTube offers auto-translation into ~150 languages. Only the spoken language
/// (`xx-orig`, or English when that is all there is) is a real transcript worth listing.
fn auto_caption_langs(all: &[String]) -> Vec<String> {
    let orig: Vec<String> = all.iter().filter(|l| l.ends_with("-orig")).cloned().collect();
    if !orig.is_empty() {
        orig
    } else if all.iter().any(|l| l == "en") {
        vec!["en".into()]
    } else {
        Vec::new()
    }
}

#[derive(Debug, Serialize, PartialEq)]
pub struct PlaylistEntry {
    pub id: String,
    pub title: String,
    pub url: String,
    pub duration: Option<f64>,
    pub thumbnail: Option<String>,
}

#[derive(Debug, Serialize, PartialEq)]
pub struct Playlist {
    pub title: String,
    pub uploader: Option<String>,
    pub entries: Vec<PlaylistEntry>,
}

/// Most videos listed from one playlist or channel; keeps the list responsive.
const PLAYLIST_LIMIT: &str = "500";

/// Parses `yt-dlp --flat-playlist --dump-single-json` output.
pub fn parse_playlist(json: &str) -> Result<Playlist, String> {
    let v: serde_json::Value =
        serde_json::from_str(json).map_err(|e| format!("invalid yt-dlp playlist: {e}"))?;
    let entries = v["entries"].as_array().ok_or("this link is not a playlist")?;
    let text = |e: &serde_json::Value, key: &str| e[key].as_str().map(str::to_owned);

    let entries = entries
        .iter()
        .filter_map(|e| {
            let id = text(e, "id")?;
            let title = text(e, "title").unwrap_or_else(|| "Untitled".into());
            // Unavailable videos are listed as placeholders and cannot be downloaded.
            if title.starts_with("[Private") || title.starts_with("[Deleted") {
                return None;
            }
            let url = text(e, "url")
                .filter(|u| u.starts_with("http"))
                .unwrap_or_else(|| format!("https://www.youtube.com/watch?v={id}"));
            let thumbnail = text(e, "thumbnail").or_else(|| {
                e["thumbnails"]
                    .as_array()?
                    .last()?
                    .get("url")?
                    .as_str()
                    .map(str::to_owned)
            });
            Some(PlaylistEntry {
                id,
                title,
                url,
                duration: e["duration"].as_f64(),
                thumbnail,
            })
        })
        .collect();

    Ok(Playlist {
        title: text(&v, "title").unwrap_or_else(|| "Playlist".into()),
        uploader: text(&v, "uploader").or_else(|| text(&v, "channel")),
        entries,
    })
}

/// A bare channel link lists its tabs rather than videos, so point it at the Videos tab.
fn playlist_url(url: &str) -> String {
    let base = url.split(['?', '#']).next().unwrap_or(url).trim_end_matches('/');
    let Some(path) = base
        .split_once("youtube.com/")
        .map(|(_, p)| p.split('/').collect::<Vec<_>>())
    else {
        return url.to_owned();
    };
    let is_channel = match path.as_slice() {
        [handle] => handle.starts_with('@'),
        ["channel" | "c" | "user", _] => true,
        _ => false,
    };
    if is_channel {
        format!("{base}/videos")
    } else {
        url.to_owned()
    }
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

/// The bundled Deno, which Tauri copies next to the app executable. YouTube hides its
/// stream URLs behind a script challenge that yt-dlp can only solve with a JS runtime.
fn deno_path() -> Option<PathBuf> {
    let name = if cfg!(windows) { "deno.exe" } else { "deno" };
    let p = std::env::current_exe().ok()?.parent()?.join(name);
    p.exists().then_some(p)
}

/// Prefers the updated copy over the bundled sidecar when one exists.
pub fn command(app: &AppHandle) -> Result<Command, String> {
    let managed = managed_path(app)?;
    let cmd = if managed.exists() {
        app.shell().command(managed)
    } else {
        app.shell().sidecar("yt-dlp").map_err(|e| e.to_string())?
    };
    Ok(match deno_path() {
        Some(deno) => cmd.args(["--js-runtimes", &format!("deno:{}", deno.display())]),
        None => cmd,
    })
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

/// Lists the videos in a playlist or channel without fetching each one's formats.
#[tauri::command]
pub async fn fetch_playlist(app: AppHandle, url: String) -> Result<Playlist, String> {
    let url = playlist_url(&url);
    let json = run(
        &app,
        &[
            "--flat-playlist",
            "--dump-single-json",
            "--no-warnings",
            "--playlist-end",
            PLAYLIST_LIMIT,
            "--",
            &url,
        ],
    )
    .await?;
    parse_playlist(&json)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_playlist_and_skips_unavailable_videos() {
        let json = r#"{"title":"Mix","uploader":"Me","entries":[
            {"id":"a","title":"One","url":"https://www.youtube.com/watch?v=a","duration":60,
             "thumbnails":[{"url":"small"},{"url":"big"}]},
            {"id":"b","title":"[Private video]"},
            {"id":"c","title":"Three","url":"c"}]}"#;
        let p = parse_playlist(json).unwrap();
        assert_eq!(p.title, "Mix");
        assert_eq!(p.entries.len(), 2);
        assert_eq!(p.entries[0].thumbnail.as_deref(), Some("big"));
        assert_eq!(p.entries[0].duration, Some(60.0));
        // A non-URL value falls back to the canonical watch link.
        assert_eq!(p.entries[1].url, "https://www.youtube.com/watch?v=c");
    }

    #[test]
    fn single_video_is_not_a_playlist() {
        assert!(parse_playlist(r#"{"id":"x","title":"T"}"#).is_err());
    }

    #[test]
    fn channel_links_point_at_the_videos_tab() {
        assert_eq!(
            playlist_url("https://www.youtube.com/@katevazo/"),
            "https://www.youtube.com/@katevazo/videos"
        );
        assert_eq!(
            playlist_url("https://youtube.com/channel/UC123?si=x"),
            "https://youtube.com/channel/UC123/videos"
        );
        let playlist = "https://www.youtube.com/playlist?list=PL1";
        assert_eq!(playlist_url(playlist), playlist);
        let tab = "https://www.youtube.com/@katevazo/shorts";
        assert_eq!(playlist_url(tab), tab);
    }

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
    fn lists_subtitle_languages() {
        let json = r#"{"id":"a","title":"T","subtitles":{"fr":[],"en":[],"live_chat":[]},
            "automatic_captions":{"en":[],"de":[],"de-orig":[]}}"#;
        let m = parse_metadata(json).unwrap();
        assert_eq!(m.subtitle_langs, ["en", "fr"]);
        assert_eq!(m.auto_caption_langs, ["de-orig"]);
    }

    #[test]
    fn rejects_garbage() {
        assert!(parse_metadata("not json").is_err());
    }
}
