//! Finding the browsers installed on this computer and opening the Katevazo extension's
//! store page in one of them.
//!
//! The store addresses are fixed here and are keyed by the extension's store ID, so they keep
//! pointing at the same listing when a new version is published. The front end only ever
//! passes a browser's id, never an address.
use std::path::PathBuf;

use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

/// The extension's listing on the Chrome Web Store, which Chromium-based browsers can use.
const CHROME_STORE: &str = "https://chromewebstore.google.com/detail/piaiamccaeniknpfiomledfkmldmdpkh";
/// The extension's listing on Microsoft Edge Add-ons.
const EDGE_STORE: &str =
    "https://microsoftedge.microsoft.com/addons/detail/send-to-katevazo/gdccmcbmdllamcdodbllkkgfheehgijc";

#[derive(Clone, Copy)]
enum Store {
    Chrome,
    Edge,
    /// No listing for this browser yet.
    None,
}

impl Store {
    fn url(self) -> Option<&'static str> {
        match self {
            Store::Chrome => Some(CHROME_STORE),
            Store::Edge => Some(EDGE_STORE),
            Store::None => None,
        }
    }
}

struct Known {
    id: &'static str,
    name: &'static str,
    store: Store,
    /// Where it lives on Windows, relative to Program Files or the local app data folder.
    windows: &'static [&'static str],
    /// The app's name in /Applications on macOS (unused on other systems).
    #[allow(dead_code)]
    mac: &'static str,
    /// Command names on Linux (unused on other systems).
    #[allow(dead_code)]
    linux: &'static [&'static str],
}

const KNOWN: &[Known] = &[
    Known {
        id: "chrome",
        name: "Google Chrome",
        store: Store::Chrome,
        windows: &["Google\\Chrome\\Application\\chrome.exe"],
        mac: "Google Chrome",
        linux: &["google-chrome", "google-chrome-stable"],
    },
    Known {
        id: "edge",
        name: "Microsoft Edge",
        store: Store::Edge,
        windows: &["Microsoft\\Edge\\Application\\msedge.exe"],
        mac: "Microsoft Edge",
        linux: &["microsoft-edge", "microsoft-edge-stable"],
    },
    Known {
        id: "brave",
        name: "Brave",
        store: Store::Chrome,
        windows: &["BraveSoftware\\Brave-Browser\\Application\\brave.exe"],
        mac: "Brave Browser",
        linux: &["brave-browser", "brave"],
    },
    Known {
        id: "vivaldi",
        name: "Vivaldi",
        store: Store::Chrome,
        windows: &["Vivaldi\\Application\\vivaldi.exe"],
        mac: "Vivaldi",
        linux: &["vivaldi", "vivaldi-stable"],
    },
    Known {
        id: "arc",
        name: "Arc",
        store: Store::Chrome,
        windows: &[],
        mac: "Arc",
        linux: &[],
    },
    Known {
        id: "chromium",
        name: "Chromium",
        store: Store::Chrome,
        windows: &["Chromium\\Application\\chrome.exe"],
        mac: "Chromium",
        linux: &["chromium", "chromium-browser"],
    },
    Known {
        id: "opera",
        name: "Opera",
        store: Store::None,
        windows: &["Programs\\Opera\\opera.exe", "Opera\\opera.exe"],
        mac: "Opera",
        linux: &["opera"],
    },
    Known {
        id: "firefox",
        name: "Firefox",
        store: Store::None,
        windows: &["Mozilla Firefox\\firefox.exe"],
        mac: "Firefox",
        linux: &["firefox"],
    },
];

/// What the front end shows for a browser that was found.
#[derive(Serialize)]
pub struct Browser {
    id: &'static str,
    name: &'static str,
    /// Whether the extension can be installed in it today.
    available: bool,
}

/// How to start a found browser: a full path on Windows, an app name on macOS, a command on Linux.
fn find(known: &Known) -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let roots: Vec<PathBuf> = ["ProgramFiles", "ProgramFiles(x86)", "LocalAppData"]
            .iter()
            .filter_map(|v| std::env::var_os(v).map(PathBuf::from))
            .collect();
        for root in &roots {
            for rel in known.windows {
                let path = root.join(rel);
                if path.is_file() {
                    return Some(path.to_string_lossy().into_owned());
                }
            }
        }
        None
    }
    #[cfg(target_os = "macos")]
    {
        let mut dirs = vec![PathBuf::from("/Applications")];
        if let Some(home) = std::env::var_os("HOME") {
            dirs.push(PathBuf::from(&home).join("Applications"));
        }
        let bundle = format!("{}.app", known.mac);
        dirs.iter()
            .any(|d| d.join(&bundle).is_dir())
            .then(|| known.mac.to_string())
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let dirs: Vec<PathBuf> = std::env::var_os("PATH")
            .map(|p| std::env::split_paths(&p).collect())
            .unwrap_or_default();
        known.linux.iter().find_map(|cmd| {
            dirs.iter()
                .any(|d| d.join(cmd).is_file())
                .then(|| cmd.to_string())
        })
    }
}

#[tauri::command]
pub fn list_browsers() -> Vec<Browser> {
    KNOWN
        .iter()
        .filter(|k| find(k).is_some())
        .map(|k| Browser {
            id: k.id,
            name: k.name,
            available: k.store.url().is_some(),
        })
        .collect()
}

/// Opens the extension's store page in the chosen browser.
#[tauri::command]
pub fn install_extension(app: AppHandle, id: String) -> Result<(), String> {
    let known = KNOWN
        .iter()
        .find(|k| k.id == id)
        .ok_or("That browser is not supported.")?;
    let url = known
        .store
        .url()
        .ok_or_else(|| format!("The extension is not available for {} yet.", known.name))?;
    let launch = find(known).ok_or_else(|| format!("{} was not found on this computer.", known.name))?;
    app.opener()
        .open_url(url, Some(launch))
        .map_err(|e| format!("Could not open {}: {e}", known.name))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_browser_has_a_unique_id() {
        let mut ids: Vec<_> = KNOWN.iter().map(|k| k.id).collect();
        ids.sort_unstable();
        ids.dedup();
        assert_eq!(ids.len(), KNOWN.len());
    }

    #[test]
    fn store_links_are_https_listings() {
        for url in [CHROME_STORE, EDGE_STORE] {
            assert!(url::Url::parse(url).unwrap().scheme() == "https");
        }
        assert!(Store::None.url().is_none());
    }
}
