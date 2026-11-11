//! Keeps yt-dlp up to date without the user doing anything. The check runs once at every
//! launch. Anything that needs yt-dlp (looking up a link, starting a download) waits for it
//! through [`ready`], so a link sent from the browser extension is only opened once the
//! newest engine is in place. The window follows along through the `engine://status` event.
use std::sync::Mutex;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::watch;

/// How long the check may take before the app carries on with the version it has.
const UPDATE_TIMEOUT: Duration = Duration::from_secs(90);

/// Waiting callers give up a little later, so a stuck update can never freeze the app.
const WAIT_LIMIT: Duration = Duration::from_secs(100);

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(tag = "state", rename_all = "lowercase")]
pub enum Status {
    /// Checking for a newer yt-dlp, and installing it if there is one.
    Updating,
    /// yt-dlp is current. `updated` is true when this launch installed a newer version.
    Ready { version: String, updated: bool },
    /// The check did not work (usually no internet); the version already installed is used.
    Failed {
        version: Option<String>,
        message: String,
    },
}

pub struct Engine {
    status: Mutex<Status>,
    busy: watch::Sender<bool>,
}

impl Default for Engine {
    fn default() -> Self {
        Self {
            status: Mutex::new(Status::Updating),
            busy: watch::channel(true).0,
        }
    }
}

fn publish(app: &AppHandle, status: Status) {
    let engine = app.state::<Engine>();
    let busy = status == Status::Updating;
    *engine.status.lock().unwrap() = status.clone();
    engine.busy.send_replace(busy);
    let _ = app.emit("engine://status", status);
}

/// Decides what a finished update means for the user.
fn outcome(before: Option<String>, result: Result<String, String>) -> Status {
    match result {
        Ok(version) => Status::Ready {
            updated: before.as_deref().is_some_and(|b| b != version),
            version,
        },
        Err(message) => Status::Failed {
            version: before,
            message,
        },
    }
}

/// Starts the launch-time update in the background.
pub fn start(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        publish(&app, Status::Updating);
        let before = crate::ytdlp::version(&app).await.ok();
        let result = match tokio::time::timeout(UPDATE_TIMEOUT, crate::ytdlp::update(&app)).await {
            Ok(result) => result,
            Err(_) => Err("the update took too long".to_string()),
        };
        publish(&app, outcome(before, result));
    });
}

/// Resolves once the launch-time update has finished (or failed, or run out of time).
pub async fn ready(app: &AppHandle) {
    let mut busy = app.state::<Engine>().busy.subscribe();
    let _ = tokio::time::timeout(WAIT_LIMIT, busy.wait_for(|b| !*b)).await;
}

/// The window asks for the current state when it opens, since the event may have come first.
#[tauri::command]
pub fn engine_status(engine: State<'_, Engine>) -> Status {
    engine.status.lock().unwrap().clone()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn an_unchanged_version_is_not_an_update() {
        assert_eq!(
            outcome(Some("2026.01.01".into()), Ok("2026.01.01".into())),
            Status::Ready {
                version: "2026.01.01".into(),
                updated: false
            }
        );
    }

    #[test]
    fn a_new_version_is_reported_as_updated() {
        assert_eq!(
            outcome(Some("2026.01.01".into()), Ok("2026.02.01".into())),
            Status::Ready {
                version: "2026.02.01".into(),
                updated: true
            }
        );
    }

    #[test]
    fn a_failed_check_keeps_the_installed_version() {
        assert_eq!(
            outcome(Some("2026.01.01".into()), Err("offline".into())),
            Status::Failed {
                version: Some("2026.01.01".into()),
                message: "offline".into()
            }
        );
    }
}
