//! The download archive: yt-dlp records every video it finishes in a text file, and skips
//! any it finds there next time, so the same video is not downloaded twice.
use std::{fs, path::PathBuf};

use tauri::{AppHandle, Manager};

pub fn path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("archive.txt"))
}

fn count_lines(text: &str) -> usize {
    text.lines().filter(|l| !l.trim().is_empty()).count()
}

/// How many videos the archive remembers.
#[tauri::command]
pub fn archive_size(app: AppHandle) -> usize {
    path(&app)
        .ok()
        .and_then(|p| fs::read_to_string(p).ok())
        .map_or(0, |t| count_lines(&t))
}

/// Forgets every recorded video, so they can be downloaded again.
#[tauri::command]
pub fn clear_archive(app: AppHandle) -> Result<(), String> {
    match fs::remove_file(path(&app)?) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_recorded_videos() {
        assert_eq!(count_lines(""), 0);
        assert_eq!(count_lines("youtube abc\nyoutube def\n\n"), 2);
    }
}
