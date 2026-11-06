//! Lets the browser extension ask whether Katevazo is installed.
//!
//! A web extension cannot see which programs a computer has, so it asks through the browser's
//! "native messaging": the browser starts the program named in a small manifest file, sends it
//! a message and reads the answer. Katevazo registers that manifest with each browser every
//! time it starts, and the app itself answers when the browser launches it this way.
//! The answer carries nothing but the app's version, and the app exits straight afterwards.
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};

use serde_json::json;

/// The name the extension uses to reach this host.
const HOST_NAME: &str = "app.katevazo.host";

/// The extension's ID on each store, which the browser checks before it lets the extension
/// talk to the app. More IDs, such as a copy loaded unpacked while developing, can be added
/// through the `KATEVAZO_EXTENSION_IDS` environment variable, separated by commas.
const CHROMIUM_IDS: [&str; 2] = ["piaiamccaeniknpfiomledfkmldmdpkh", "gdccmcbmdllamcdodbllkkgfheehgijc"];
/// Firefox identifies an extension by the ID in its manifest instead.
const FIREFOX_ID: &str = "send-to-katevazo@katevazo.app";

/// Whether the browser started this process to talk to the extension rather than to open
/// the app. Chromium browsers pass the extension's origin; Firefox passes the manifest's
/// path and the extension's ID.
pub fn is_host_launch(args: impl IntoIterator<Item = String>) -> bool {
    args.into_iter().skip(1).any(|a| {
        a.starts_with("chrome-extension://")
            || a == FIREFOX_ID
            || Path::new(&a).file_name().is_some_and(|n| n == format!("{HOST_NAME}.json").as_str())
    })
}

/// One message in, one answer out, until the browser closes the pipe.
pub fn run_host() {
    let mut input = io::stdin().lock();
    let mut output = io::stdout().lock();
    while let Some(message) = read_message(&mut input) {
        let reply = match message.get("type").and_then(|t| t.as_str()) {
            Some("ping") => json!({ "installed": true, "version": env!("CARGO_PKG_VERSION") }),
            _ => json!({ "error": "unknown request" }),
        };
        if write_message(&mut output, &reply).is_err() {
            break;
        }
    }
}

/// A message is a 32-bit length in the machine's byte order, then that many bytes of JSON.
fn read_message(input: &mut impl Read) -> Option<serde_json::Value> {
    let mut len = [0u8; 4];
    input.read_exact(&mut len).ok()?;
    let len = u32::from_ne_bytes(len) as usize;
    // Requests are tiny; refuse anything large rather than allocating for it.
    if len > 64 * 1024 {
        return None;
    }
    let mut body = vec![0u8; len];
    input.read_exact(&mut body).ok()?;
    serde_json::from_slice(&body).ok()
}

fn write_message(output: &mut impl Write, value: &serde_json::Value) -> io::Result<()> {
    let body = serde_json::to_vec(value)?;
    output.write_all(&(body.len() as u32).to_ne_bytes())?;
    output.write_all(&body)?;
    output.flush()
}

/// The program the browser should start: the installed app itself.
fn host_program() -> Option<PathBuf> {
    // An AppImage unpacks to a temporary folder that changes on every run.
    std::env::var_os("APPIMAGE")
        .map(PathBuf::from)
        .or_else(|| std::env::current_exe().ok())
}

fn manifest(program: &Path, firefox: bool) -> serde_json::Value {
    let mut value = json!({
        "name": HOST_NAME,
        "description": "Lets the Send to Katevazo extension check that Katevazo is installed.",
        "path": program,
        "type": "stdio",
    });
    if firefox {
        value["allowed_extensions"] = json!([FIREFOX_ID]);
    } else {
        let mut ids: Vec<String> = CHROMIUM_IDS.iter().map(|s| s.to_string()).collect();
        if let Ok(extra) = std::env::var("KATEVAZO_EXTENSION_IDS") {
            ids.extend(extra.split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()));
        }
        value["allowed_origins"] = json!(ids.iter().map(|id| format!("chrome-extension://{id}/")).collect::<Vec<_>>());
    }
    value
}

/// Tells each browser about the host. Failures are ignored: the extension then simply
/// reports that the app was not found.
pub fn register(data_dir: &Path) {
    let Some(program) = host_program() else { return };
    let _ = std::fs::create_dir_all(data_dir);
    let chromium = data_dir.join(format!("{HOST_NAME}.json"));
    let firefox = data_dir.join(format!("{HOST_NAME}.firefox.json"));
    let write = |path: &Path, firefox: bool| {
        std::fs::write(path, serde_json::to_vec_pretty(&manifest(&program, firefox)).unwrap_or_default())
    };
    if write(&chromium, false).is_err() || write(&firefox, true).is_err() {
        return;
    }
    register_with_browsers(&chromium, &firefox);
}

#[cfg(windows)]
fn register_with_browsers(chromium: &Path, firefox: &Path) {
    use std::os::windows::process::CommandExt;
    const NO_WINDOW: u32 = 0x0800_0000;
    let keys = [
        (r"Software\Google\Chrome", chromium),
        (r"Software\Microsoft\Edge", chromium),
        (r"Software\BraveSoftware\Brave-Browser", chromium),
        (r"Software\Chromium", chromium),
        (r"Software\Mozilla", firefox),
    ];
    for (base, manifest) in keys {
        let key = format!(r"HKCU\{base}\NativeMessagingHosts\{HOST_NAME}");
        let _ = std::process::Command::new("reg")
            .args(["add", &key, "/ve", "/t", "REG_SZ", "/d"])
            .arg(manifest)
            .arg("/f")
            .creation_flags(NO_WINDOW)
            .output();
    }
}

#[cfg(not(windows))]
fn register_with_browsers(chromium: &Path, firefox: &Path) {
    let Some(home) = std::env::var_os("HOME").map(PathBuf::from) else { return };
    #[cfg(target_os = "macos")]
    let (support, chrome_dirs, firefox_dir): (PathBuf, &[&str], &str) = (
        home.join("Library/Application Support"),
        &["Google/Chrome", "Microsoft Edge", "BraveSoftware/Brave-Browser", "Chromium", "Vivaldi", "Arc/User Data"],
        "Mozilla",
    );
    #[cfg(not(target_os = "macos"))]
    let (support, chrome_dirs, firefox_dir): (PathBuf, &[&str], &str) = (
        home.join(".config"),
        &["google-chrome", "microsoft-edge", "BraveSoftware/Brave-Browser", "chromium", "vivaldi"],
        "",
    );
    let copy = |dir: PathBuf, from: &Path| {
        if std::fs::create_dir_all(&dir).is_ok() {
            let _ = std::fs::copy(from, dir.join(format!("{HOST_NAME}.json")));
        }
    };
    for browser in chrome_dirs {
        // Only for browsers that are actually used, so no stray folders are created.
        if support.join(browser).is_dir() {
            copy(support.join(browser).join("NativeMessagingHosts"), chromium);
        }
    }
    #[cfg(target_os = "macos")]
    if support.join(firefox_dir).is_dir() {
        copy(support.join(firefox_dir).join("NativeMessagingHosts"), firefox);
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = firefox_dir;
        if home.join(".mozilla").is_dir() {
            copy(home.join(".mozilla/native-messaging-hosts"), firefox);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(list: &[&str]) -> Vec<String> {
        list.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn recognises_a_browser_launch() {
        assert!(is_host_launch(args(&["katevazo", "chrome-extension://abc/"])));
        assert!(is_host_launch(args(&["katevazo", "C:\\x\\app.katevazo.host.json", FIREFOX_ID])));
        assert!(!is_host_launch(args(&["katevazo"])));
        assert!(!is_host_launch(args(&["katevazo", "katevazo://download?url=x"])));
    }

    #[test]
    fn answers_a_ping_in_the_native_messaging_format() {
        let body = br#"{"type":"ping"}"#;
        let mut input = (body.len() as u32).to_ne_bytes().to_vec();
        input.extend_from_slice(body);
        let message = read_message(&mut input.as_slice()).unwrap();
        assert_eq!(message["type"], "ping");

        let mut out = Vec::new();
        write_message(&mut out, &json!({ "installed": true })).unwrap();
        let len = u32::from_ne_bytes(out[..4].try_into().unwrap()) as usize;
        assert_eq!(len, out.len() - 4);
    }

    #[test]
    fn refuses_a_huge_message() {
        let input = (10_000_000u32).to_ne_bytes();
        assert!(read_message(&mut input.as_slice()).is_none());
    }

    #[test]
    fn manifests_name_the_right_extensions() {
        let chromium = manifest(Path::new("/app"), false);
        assert!(chromium["allowed_origins"][0].as_str().unwrap().starts_with("chrome-extension://"));
        assert_eq!(manifest(Path::new("/app"), true)["allowed_extensions"][0], FIREFOX_ID);
    }
}
