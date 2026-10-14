mod commands;
mod db;
mod engine;
mod error;
mod models;

use std::sync::Arc;

use tauri::Manager as _;

use crate::db::Db;
use crate::engine::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();

            let data_dir = handle.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;

            let db = Db::open(&data_dir.join("neson.db"))?;
            let default_dir = handle
                .path()
                .download_dir()
                .unwrap_or_else(|_| data_dir.clone());

            let manager = Manager::new(handle, db, default_dir)?;
            app.manage(Arc::new(manager));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::add_download,
            commands::list_downloads,
            commands::pause_download,
            commands::resume_download,
            commands::remove_download,
            commands::get_settings,
            commands::set_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
