//! Desktop notifications for finished and failed downloads.
use tauri::{AppHandle, Manager};
use tauri_plugin_notification::{NotificationExt, PermissionState};

use crate::settings;

/// Tells the user how a download ended, unless they are already looking at the app.
pub fn download_ended(app: &AppHandle, title: &str, error: Option<&str>) {
    if !settings::load(app).notifications {
        return;
    }
    let focused = app
        .get_webview_window("main")
        .is_some_and(|w| w.is_focused().unwrap_or(false) && !w.is_minimized().unwrap_or(false));
    if focused {
        return;
    }

    let notifications = app.notification();
    if !matches!(notifications.permission_state(), Ok(PermissionState::Granted))
        && !matches!(notifications.request_permission(), Ok(PermissionState::Granted))
    {
        return;
    }

    let (heading, body) = match error {
        None => ("Download complete", title.to_string()),
        Some(e) => ("Download failed", format!("{title}\n{}", first_line(e))),
    };
    if let Err(e) = notifications.builder().title(heading).body(body).show() {
        eprintln!("could not show notification: {e}");
    }
}

/// Errors can run to many lines of yt-dlp output; a notification only fits the gist.
fn first_line(message: &str) -> String {
    let line = message.lines().find(|l| !l.trim().is_empty()).unwrap_or(message).trim();
    match line.char_indices().nth(120) {
        Some((i, _)) => format!("{}…", &line[..i]),
        None => line.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_summary_is_one_short_line() {
        assert_eq!(first_line("\n  ERROR: nope\nmore"), "ERROR: nope");
        let long = "x".repeat(300);
        assert_eq!(first_line(&long).chars().count(), 121);
    }
}
