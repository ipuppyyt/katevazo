//! Subscriptions: playlists and channels whose new uploads are downloaded automatically.
//!
//! A subscription remembers which videos it has already seen. Subscribing marks everything
//! currently listed as seen, so only videos uploaded afterwards are downloaded.
use std::{
    fs,
    path::PathBuf,
    sync::Mutex,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::{
    download::{self, Options},
    ytdlp::{self, Playlist},
};

/// How often every subscription is checked while the app is open.
const CHECK_EVERY: Duration = Duration::from_secs(30 * 60);
/// Wait this long after start-up before the first check, so it does not compete with launch.
const FIRST_CHECK_AFTER: Duration = Duration::from_secs(30);
/// Most videos queued by one check of one subscription; the rest wait for the next check.
const MAX_PER_CHECK: usize = 25;
/// How many video ids a subscription remembers.
const MAX_SEEN: usize = 2000;

/// Serialises reads and writes of the subscriptions file.
static FILE_LOCK: Mutex<()> = Mutex::new(());

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Stored {
    id: String,
    url: String,
    title: String,
    options: Options,
    /// Ids of videos already downloaded or skipped, oldest first.
    seen: Vec<String>,
    last_checked: Option<i64>,
    last_error: Option<String>,
}

/// What the UI needs to show a subscription.
#[derive(Debug, Serialize)]
pub struct Subscription {
    id: String,
    url: String,
    title: String,
    options: Options,
    /// Milliseconds since the Unix epoch.
    last_checked: Option<i64>,
    last_error: Option<String>,
}

impl From<&Stored> for Subscription {
    fn from(s: &Stored) -> Self {
        Self {
            id: s.id.clone(),
            url: s.url.clone(),
            title: s.title.clone(),
            options: s.options.clone(),
            last_checked: s.last_checked,
            last_error: s.last_error.clone(),
        }
    }
}

fn path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("subscriptions.json"))
}

fn load(app: &AppHandle) -> Vec<Stored> {
    path(app)
        .ok()
        .and_then(|p| fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save(app: &AppHandle, subs: &[Stored]) -> Result<(), String> {
    let json = serde_json::to_string_pretty(subs).map_err(|e| e.to_string())?;
    fs::write(path(app)?, json).map_err(|e| e.to_string())
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_millis() as i64)
}

/// Videos in `playlist` that are not in `seen`, oldest first, at most `MAX_PER_CHECK`.
/// Playlists and channels list the newest video first.
fn new_entries<'a>(
    playlist: &'a Playlist,
    seen: &[String],
) -> Vec<&'a ytdlp::PlaylistEntry> {
    let mut fresh: Vec<_> = playlist
        .entries
        .iter()
        .filter(|e| !seen.contains(&e.id))
        .collect();
    fresh.reverse();
    fresh.truncate(MAX_PER_CHECK);
    fresh
}

fn remember(seen: &mut Vec<String>, ids: impl IntoIterator<Item = String>) {
    seen.extend(ids);
    if seen.len() > MAX_SEEN {
        seen.drain(..seen.len() - MAX_SEEN);
    }
}

#[tauri::command]
pub fn list_subscriptions(app: AppHandle) -> Vec<Subscription> {
    let _guard = FILE_LOCK.lock().unwrap();
    load(&app).iter().map(Subscription::from).collect()
}

/// Subscribes to a playlist or channel, using `options` for every video it downloads later.
#[tauri::command]
pub async fn add_subscription(
    app: AppHandle,
    url: String,
    mut options: Options,
) -> Result<Subscription, String> {
    let playlist = ytdlp::list_playlist(&app, &url).await?;
    // A subscription downloads whole videos at once; one-off settings do not carry over.
    options.section = None;
    options.start_at = None;
    options.title = None;

    let _guard = FILE_LOCK.lock().unwrap();
    let mut subs = load(&app);
    let canonical = ytdlp::playlist_url(&url);
    if subs.iter().any(|s| ytdlp::playlist_url(&s.url) == canonical) {
        return Err("You are already subscribed to this.".into());
    }
    let stored = Stored {
        id: format!("{:x}", now_ms()),
        url,
        title: playlist.title.clone(),
        options,
        seen: playlist.entries.iter().rev().map(|e| e.id.clone()).collect(),
        last_checked: Some(now_ms()),
        last_error: None,
    };
    let info = Subscription::from(&stored);
    subs.push(stored);
    save(&app, &subs)?;
    Ok(info)
}

#[tauri::command]
pub fn remove_subscription(app: AppHandle, id: String) -> Result<(), String> {
    let _guard = FILE_LOCK.lock().unwrap();
    let mut subs = load(&app);
    subs.retain(|s| s.id != id);
    save(&app, &subs)
}

/// Checks every subscription now and returns how many videos were queued.
#[tauri::command]
pub async fn check_subscriptions(app: AppHandle) -> usize {
    check_all(&app).await
}

async fn check_all(app: &AppHandle) -> usize {
    let subs = {
        let _guard = FILE_LOCK.lock().unwrap();
        load(app)
    };
    let mut queued = 0;
    for sub in subs {
        let result = check_one(app, &sub).await;
        let _guard = FILE_LOCK.lock().unwrap();
        let mut current = load(app);
        // It may have been removed while its playlist was being fetched.
        let Some(stored) = current.iter_mut().find(|s| s.id == sub.id) else {
            continue;
        };
        stored.last_checked = Some(now_ms());
        match result {
            Ok(ids) => {
                queued += ids.len();
                stored.last_error = None;
                remember(&mut stored.seen, ids);
            }
            Err(e) => stored.last_error = Some(e),
        }
        let _ = save(app, &current);
    }
    queued
}

/// Queues the subscription's new videos and returns their ids.
async fn check_one(app: &AppHandle, sub: &Stored) -> Result<Vec<String>, String> {
    let playlist = ytdlp::list_playlist(app, &sub.url).await?;
    let mut queued = Vec::new();
    for entry in new_entries(&playlist, &sub.seen) {
        let mut options = sub.options.clone();
        options.title = Some(entry.title.clone());
        download::enqueue(app, entry.url.clone(), options)?;
        queued.push(entry.id.clone());
    }
    Ok(queued)
}

/// Starts the background loop that looks for new uploads while the app is open.
pub fn start_checking(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(FIRST_CHECK_AFTER).await;
        loop {
            check_all(&app).await;
            tokio::time::sleep(CHECK_EVERY).await;
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ytdlp::PlaylistEntry;

    fn playlist(ids: &[&str]) -> Playlist {
        Playlist {
            title: "T".into(),
            uploader: None,
            entries: ids
                .iter()
                .map(|id| PlaylistEntry {
                    id: id.to_string(),
                    title: id.to_string(),
                    url: format!("https://youtu.be/{id}"),
                    duration: None,
                    thumbnail: None,
                })
                .collect(),
        }
    }

    #[test]
    fn only_unseen_videos_are_new_and_oldest_comes_first() {
        let p = playlist(&["d", "c", "b", "a"]);
        let seen = vec!["a".to_string(), "b".to_string()];
        let ids: Vec<_> = new_entries(&p, &seen).iter().map(|e| e.id.as_str()).collect();
        assert_eq!(ids, ["c", "d"]);
    }

    #[test]
    fn a_check_queues_a_limited_batch() {
        let ids: Vec<String> = (0..60).map(|i| format!("v{i}")).collect();
        let p = playlist(&ids.iter().map(String::as_str).collect::<Vec<_>>());
        assert_eq!(new_entries(&p, &[]).len(), MAX_PER_CHECK);
    }

    #[test]
    fn memory_is_bounded() {
        let mut seen: Vec<String> = (0..MAX_SEEN).map(|i| i.to_string()).collect();
        remember(&mut seen, ["new".to_string()]);
        assert_eq!(seen.len(), MAX_SEEN);
        assert_eq!(seen.last().map(String::as_str), Some("new"));
        assert_eq!(seen[0], "1");
    }
}
