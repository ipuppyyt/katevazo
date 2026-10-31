mod archive;
mod download;
mod files;
mod history;
mod notify;
mod settings;
mod template;
mod ytdlp;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .manage(download::DownloadState::default())
        .setup(|app| {
            download::set_concurrency(app.handle(), settings::load(app.handle()).max_concurrent as usize);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ytdlp::ytdlp_version,
            ytdlp::fetch_metadata,
            ytdlp::fetch_playlist,
            files::open_file,
            files::reveal_file,
            ytdlp::update_ytdlp,
            archive::archive_size,
            archive::clear_archive,
            download::start_download,
            download::pause_download,
            download::resume_download,
            download::cancel_download,
            settings::get_settings,
            settings::set_settings,
            history::list_history,
            history::clear_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
