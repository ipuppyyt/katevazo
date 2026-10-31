//! Links sent to the app from outside, such as `katevazo://download?url=...` from the
//! browser extension. They are only ever loaded into the fetch box: nothing is
//! downloaded until the user presses Download.
use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager, State};
use url::Url;

#[derive(Default)]
pub struct Pending(Mutex<Vec<String>>);

/// The video link inside a `katevazo://download?url=<link>` address.
pub fn parse(raw: &str) -> Option<String> {
    let outer = Url::parse(raw).ok()?;
    if outer.scheme() != "katevazo" || outer.host_str() != Some("download") {
        return None;
    }
    let (_, value) = outer.query_pairs().find(|(k, _)| k == "url")?;
    let inner = Url::parse(&value).ok()?;
    matches!(inner.scheme(), "http" | "https").then(|| inner.to_string())
}

/// Brings the main window to the front, whether it was hidden, minimised or behind others.
pub fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

/// Queues links for the window to pick up and lets it know.
pub fn deliver(app: &AppHandle, links: Vec<String>) {
    if links.is_empty() {
        return;
    }
    app.state::<Pending>().0.lock().unwrap().extend(links);
    show_main(app);
    let _ = app.emit("app://links", ());
}

/// For addresses the OS handed us (`katevazo://...`); anything else is dropped.
pub fn deliver_urls<S: AsRef<str>>(app: &AppHandle, urls: impl IntoIterator<Item = S>) {
    deliver(app, urls.into_iter().filter_map(|u| parse(u.as_ref())).collect());
}

/// The window asks for links that arrived before it was listening, or while it was busy.
#[tauri::command]
pub fn take_pending_links(state: State<'_, Pending>) -> Vec<String> {
    std::mem::take(&mut *state.0.lock().unwrap())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_the_encoded_video_link() {
        assert_eq!(
            parse("katevazo://download?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dabc%26t%3D5").as_deref(),
            Some("https://www.youtube.com/watch?v=abc&t=5")
        );
    }

    #[test]
    fn ignores_anything_else() {
        assert_eq!(parse("https://example.com"), None);
        assert_eq!(parse("katevazo://settings?url=https%3A%2F%2Fa.com"), None);
        assert_eq!(parse("katevazo://download"), None);
        // A video link must be web, so a file or script address cannot be smuggled in.
        assert_eq!(parse("katevazo://download?url=file%3A%2F%2F%2Fetc%2Fpasswd"), None);
        assert_eq!(parse("katevazo://download?url=javascript%3Aalert(1)"), None);
    }
}
