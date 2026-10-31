//! System tray icon: lets downloads carry on after the window is closed, and offers a
//! quick way to add the link on the clipboard.
use tauri::{
    AppHandle,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use url::Url;

use crate::{link, settings};


/// Every http(s) link in `text`.
fn links_in(text: &str) -> Vec<String> {
    let mut found: Vec<String> = Vec::new();
    for word in text.split_whitespace() {
        let word = word.trim_matches(|c: char| matches!(c, '<' | '>' | '"' | '\'' | '(' | ')' | ',' | ';'));
        if let Ok(u) = Url::parse(word)
            && matches!(u.scheme(), "http" | "https")
            && !found.contains(&u.to_string())
        {
            found.push(u.to_string());
        }
    }
    found
}

/// Opens the window with whatever links are on the clipboard.
fn add_from_clipboard(app: &AppHandle) {
    let text = app.clipboard().read_text().unwrap_or_default();
    link::show_main(app);
    link::deliver(app, links_in(&text));
}

/// Whether closing the window should hide it instead of quitting.
pub fn keeps_running(app: &AppHandle) -> bool {
    settings::load(app).close_to_tray
}

pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open Katevazo", true, None::<&str>)?;
    let paste = MenuItem::with_id(app, "paste", "Add Link from Clipboard", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Katevazo", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &paste, &PredefinedMenuItem::separator(app)?, &quit])?;

    let mut tray = TrayIconBuilder::new()
        .tooltip("Katevazo")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => link::show_main(app),
            "paste" => add_from_clipboard(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                link::show_main(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;

    // Another program may already own the shortcut; the tray menu still works then.
    let modifier = if cfg!(target_os = "macos") { Modifiers::SUPER } else { Modifiers::CONTROL };
    let shortcut = Shortcut::new(Some(modifier | Modifiers::SHIFT), Code::KeyD);
    let _ = app.global_shortcut().on_shortcut(shortcut, |app, _, event| {
        if event.state == ShortcutState::Pressed {
            add_from_clipboard(app);
        }
    });
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_links_in_clipboard_text() {
        assert_eq!(
            links_in("watch <https://youtu.be/abc>, then https://vimeo.com/1 and https://youtu.be/abc"),
            ["https://youtu.be/abc", "https://vimeo.com/1"]
        );
        assert!(links_in("nothing here ftp://x file:///etc/passwd").is_empty());
    }
}
