// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // A browser starts the app this way to ask the extension's question; no window is opened.
    if katevazo_lib::native_host::is_host_launch(std::env::args()) {
        return katevazo_lib::native_host::run_host();
    }
    katevazo_lib::run()
}
