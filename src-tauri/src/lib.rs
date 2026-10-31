use tauri_plugin_deep_link::DeepLinkExt;

mod archive;
mod convert;
mod download;
mod files;
mod history;
mod link;
mod notify;
mod settings;
mod subscriptions;
mod template;
mod ytdlp;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must come first: a second launch hands its arguments (such as a katevazo:// link)
        // to the running app and exits.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| link::show_main(app)))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .manage(download::DownloadState::default())
        .manage(link::Pending::default())
        .setup(|app| {
            download::set_concurrency(app.handle(), settings::load(app.handle()).max_concurrent as usize);
            subscriptions::start_checking(app.handle().clone());

            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                link::deliver_urls(&handle, event.urls().iter().map(|u| u.as_str()));
            });
            // The address that launched the app, which on Windows and Linux is not sent as an event.
            if let Ok(Some(urls)) = app.deep_link().get_current() {
                link::deliver_urls(app.handle(), urls.iter().map(|u| u.as_str()));
            }
            // Installed builds register the scheme; during development it has to be done at run time.
            #[cfg(any(windows, target_os = "linux"))]
            if cfg!(debug_assertions) {
                let _ = app.deep_link().register_all();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ytdlp::ytdlp_version,
            ytdlp::fetch_metadata,
            ytdlp::fetch_playlist,
            link::take_pending_links,
            files::open_file,
            files::reveal_file,
            ytdlp::update_ytdlp,
            archive::archive_size,
            archive::clear_archive,
            subscriptions::list_subscriptions,
            subscriptions::add_subscription,
            subscriptions::remove_subscription,
            subscriptions::check_subscriptions,
            download::start_download,
            download::pause_download,
            download::resume_download,
            download::stop_recording,
            download::cancel_download,
            convert::convert_file,
            convert::cancel_convert,
            settings::get_settings,
            settings::set_settings,
            history::list_history,
            history::clear_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
