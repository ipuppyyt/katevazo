//! Converts files already on disk with the bundled ffmpeg.
//!
//! Progress goes to the UI as `convert://progress` events, read from ffmpeg's
//! `-progress` output against the duration it prints when it opens the file.
use std::{
    collections::{HashMap, HashSet},
    path::{Path, PathBuf},
    sync::{LazyLock, Mutex},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::{
    ShellExt,
    process::{CommandChild, CommandEvent},
};

use crate::history;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Target {
    Mp4,
    Mkv,
    Webm,
    Mp3,
    M4a,
    Opus,
    Flac,
    Wav,
}

impl Target {
    fn ext(self) -> &'static str {
        match self {
            Self::Mp4 => "mp4",
            Self::Mkv => "mkv",
            Self::Webm => "webm",
            Self::Mp3 => "mp3",
            Self::M4a => "m4a",
            Self::Opus => "opus",
            Self::Flac => "flac",
            Self::Wav => "wav",
        }
    }

    fn is_audio(self) -> bool {
        matches!(self, Self::Mp3 | Self::M4a | Self::Opus | Self::Flac | Self::Wav)
    }

    /// Codec options for this format. MKV keeps the streams as they are, so it is quick
    /// and loses nothing; the others re-encode to something every player understands.
    fn codec_args(self) -> &'static [&'static str] {
        match self {
            Self::Mp4 => &[
                "-map", "0:v:0", "-map", "0:a:0?", "-sn", "-c:v", "libx264", "-preset", "medium", "-crf",
                "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
            ],
            Self::Mkv => &["-map", "0", "-c", "copy"],
            Self::Webm => &[
                "-map", "0:v:0", "-map", "0:a:0?", "-sn", "-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0",
                "-row-mt", "1", "-c:a", "libopus", "-b:a", "128k",
            ],
            Self::Mp3 => &["-vn", "-map", "0:a:0", "-c:a", "libmp3lame", "-q:a", "2"],
            Self::M4a => &["-vn", "-map", "0:a:0", "-c:a", "aac", "-b:a", "192k"],
            Self::Opus => &["-vn", "-map", "0:a:0", "-c:a", "libopus", "-b:a", "128k"],
            Self::Flac => &["-vn", "-map", "0:a:0", "-c:a", "flac"],
            Self::Wav => &["-vn", "-map", "0:a:0", "-c:a", "pcm_s16le"],
        }
    }
}

fn build_args(input: &str, output: &str, target: Target) -> Vec<String> {
    let mut a: Vec<String> = ["-hide_banner", "-nostdin", "-n", "-progress", "pipe:1", "-nostats", "-i"]
        .map(String::from)
        .to_vec();
    a.push(input.into());
    a.extend(target.codec_args().iter().map(|s| s.to_string()));
    a.push(output.into());
    a
}

/// `name.ext` beside the source, or `name (converted).ext` when that would overwrite something.
fn output_path(input: &Path, ext: &str, taken: impl Fn(&Path) -> bool) -> PathBuf {
    let dir = input.parent().unwrap_or(Path::new(""));
    let stem = input.file_stem().map_or_else(|| "converted".into(), |s| s.to_string_lossy().into_owned());
    let plain = dir.join(format!("{stem}.{ext}"));
    if plain != input && !taken(&plain) {
        return plain;
    }
    (1u32..)
        .map(|n| {
            let tag = if n == 1 { "converted".to_string() } else { format!("converted {n}") };
            dir.join(format!("{stem} ({tag}).{ext}"))
        })
        .find(|p| p != input && !taken(p))
        .expect("an unused name exists")
}

/// "  Duration: 00:01:23.45, start: ..." as seconds.
fn parse_duration(line: &str) -> Option<f64> {
    let rest = line.trim().strip_prefix("Duration:")?.trim();
    let clock = rest.split(',').next()?.trim();
    let mut total = 0.0;
    for part in clock.split(':') {
        total = total * 60.0 + part.parse::<f64>().ok()?;
    }
    Some(total)
}

/// `out_time_us=1234567` as seconds.
fn parse_out_time(line: &str) -> Option<f64> {
    let micros: f64 = line.trim().strip_prefix("out_time_us=")?.parse().ok()?;
    (micros >= 0.0).then_some(micros / 1_000_000.0)
}

static RUNNING: LazyLock<Mutex<HashMap<String, CommandChild>>> = LazyLock::new(Mutex::default);
static CANCELLED: LazyLock<Mutex<HashSet<String>>> = LazyLock::new(Mutex::default);

#[derive(Clone, Serialize)]
struct Progress {
    id: String,
    percent: f64,
}

/// Converts `input` and returns the new file's path.
#[tauri::command]
pub async fn convert_file(app: AppHandle, id: String, input: String, target: Target) -> Result<String, String> {
    let source = PathBuf::from(&input);
    if !source.is_absolute() || !source.is_file() {
        return Err("That file could not be found.".into());
    }
    let output = output_path(&source, target.ext(), |p| p.exists());
    let output_str = output.to_string_lossy().into_owned();

    let (mut rx, child) = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| e.to_string())?
        .args(build_args(&input, &output_str, target))
        .spawn()
        .map_err(|e| e.to_string())?;
    RUNNING.lock().unwrap().insert(id.clone(), child);

    let mut duration: Option<f64> = None;
    let mut last_err = String::new();
    let mut code = None;
    let mut last_percent = -1.0;
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(bytes) => {
                for line in String::from_utf8_lossy(&bytes).lines() {
                    let (Some(total), Some(done)) = (duration.filter(|d| *d > 0.0), parse_out_time(line)) else {
                        continue;
                    };
                    let percent = (done / total * 100.0).clamp(0.0, 99.0).floor();
                    if percent > last_percent {
                        last_percent = percent;
                        let _ = app.emit("convert://progress", Progress { id: id.clone(), percent });
                    }
                }
            }
            CommandEvent::Stderr(bytes) => {
                for line in String::from_utf8_lossy(&bytes).lines().filter(|l| !l.trim().is_empty()) {
                    if duration.is_none() {
                        duration = parse_duration(line);
                    }
                    last_err = line.trim().to_string();
                }
            }
            CommandEvent::Terminated(p) => {
                code = p.code;
                break;
            }
            _ => {}
        }
    }
    RUNNING.lock().unwrap().remove(&id);

    if CANCELLED.lock().unwrap().remove(&id) {
        let _ = std::fs::remove_file(&output);
        return Err("Cancelled".into());
    }
    if code != Some(0) {
        let _ = std::fs::remove_file(&output);
        return Err(if last_err.is_empty() { format!("ffmpeg exited with code {code:?}") } else { last_err });
    }

    let title = source.file_stem().map_or_else(String::new, |s| s.to_string_lossy().into_owned());
    history::record(&app, &title, &input, Some(&output_str), if target.is_audio() { "audio" } else { "video" });
    Ok(output_str)
}

#[tauri::command]
pub fn cancel_convert(id: String) {
    if let Some(child) = RUNNING.lock().unwrap().remove(&id) {
        CANCELLED.lock().unwrap().insert(id);
        let _ = child.kill();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn output_sits_beside_the_source() {
        let p = output_path(Path::new("/v/clip.mkv"), "mp4", |_| false);
        assert_eq!(p, Path::new("/v/clip.mp4"));
    }

    #[test]
    fn existing_files_are_never_overwritten() {
        let taken = |p: &Path| p == Path::new("/v/clip.mp4") || p == Path::new("/v/clip (converted).mp4");
        assert_eq!(output_path(Path::new("/v/clip.mkv"), "mp4", taken), Path::new("/v/clip (converted 2).mp4"));
        // Converting a file to its own format must not target the source.
        assert_eq!(output_path(Path::new("/v/clip.mp4"), "mp4", |_| false), Path::new("/v/clip (converted).mp4"));
    }

    #[test]
    fn reads_duration_and_progress() {
        assert_eq!(parse_duration("  Duration: 00:01:23.50, start: 0.0, bitrate: 1 kb/s"), Some(83.5));
        assert_eq!(parse_duration("Duration: N/A, start: 0"), None);
        assert_eq!(parse_out_time("out_time_us=2500000"), Some(2.5));
        assert_eq!(parse_out_time("out_time_us=N/A"), None);
    }

    #[test]
    fn audio_targets_drop_the_picture() {
        let args = build_args("/in.mp4", "/out.mp3", Target::Mp3);
        assert!(args.contains(&"-vn".to_string()));
        assert_eq!(args[args.iter().position(|a| a == "-i").unwrap() + 1], "/in.mp4");
        assert_eq!(args.last().unwrap(), "/out.mp3");
        assert!(Target::Flac.is_audio() && !Target::Webm.is_audio());
    }
}
