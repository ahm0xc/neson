mod bridge;
mod commands;
mod db;
mod engine;
mod error;
mod models;

use std::sync::Arc;

use tauri::Manager as _;

use crate::bridge::{BridgeState, DEFAULT_BRIDGE_PORT, SETTINGS_BRIDGE_PORT};
use crate::db::Db;
use crate::engine::Manager;

const SETTINGS_MAX_ACTIVE: &str = "max_active";
const DEFAULT_MAX_ACTIVE: u32 = 3;

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
            let max_active = db
                .get_setting(SETTINGS_MAX_ACTIVE)?
                .and_then(|value| value.parse().ok())
                .unwrap_or(DEFAULT_MAX_ACTIVE);

            let requested_port = db
                .get_setting(SETTINGS_BRIDGE_PORT)?
                .and_then(|value| value.parse().ok())
                .unwrap_or(DEFAULT_BRIDGE_PORT);

            let manager = Arc::new(Manager::new(handle, db, default_dir, max_active)?);
            app.manage(Arc::clone(&manager));
            app.manage(BridgeState::default());

            match bridge::start(Arc::clone(&manager), requested_port) {
                Ok(port) => {
                    if port != requested_port {
                        let _ = manager
                            .db()
                            .set_setting(SETTINGS_BRIDGE_PORT, &port.to_string());
                    }
                    *app.state::<BridgeState>().port.lock().unwrap() = Some(port);
                    println!("[neson] browser bridge listening on http://127.0.0.1:{port}");
                }
                Err(err) => eprintln!("[neson] failed to start browser bridge: {err}"),
            }

            manager.restore()?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::add_download,
            commands::list_downloads,
            commands::pause_download,
            commands::resume_download,
            commands::remove_download,
            commands::reorder_downloads,
            commands::get_settings,
            commands::set_settings,
            commands::get_bridge_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
