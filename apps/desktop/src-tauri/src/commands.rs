use std::sync::Arc;

use tauri::State;

use crate::bridge::BridgeState;
use crate::engine::Manager;
use crate::error::AppResult;
use crate::models::{AddDownloadRequest, BridgeInfo, Download, Settings};

const SETTINGS_DEFAULT_DIR: &str = "default_dir";
const SETTINGS_MAX_ACTIVE: &str = "max_active";
const DEFAULT_MAX_ACTIVE: u32 = 3;

#[tauri::command]
pub fn add_download(
    state: State<'_, Arc<Manager>>,
    req: AddDownloadRequest,
) -> AppResult<Download> {
    state.inner().clone().add_download(&req)
}

#[tauri::command]
pub fn list_downloads(state: State<'_, Arc<Manager>>) -> AppResult<Vec<Download>> {
    state.db().list_downloads()
}

#[tauri::command]
pub async fn pause_download(state: State<'_, Arc<Manager>>, id: String) -> AppResult<()> {
    let mgr = state.inner().clone();
    mgr.pause(&id).await
}

#[tauri::command]
pub async fn resume_download(state: State<'_, Arc<Manager>>, id: String) -> AppResult<()> {
    let mgr = state.inner().clone();
    mgr.resume(&id).await
}

#[tauri::command]
pub async fn remove_download(state: State<'_, Arc<Manager>>, id: String) -> AppResult<()> {
    let mgr = state.inner().clone();
    mgr.remove(&id).await
}

#[tauri::command]
pub fn reorder_downloads(
    state: State<'_, Arc<Manager>>,
    ids: Vec<String>,
) -> AppResult<Vec<Download>> {
    let mgr = state.inner();
    for (index, id) in ids.iter().enumerate() {
        mgr.db().set_queue_order(id, index as i64)?;
    }
    mgr.db().list_downloads()
}

#[tauri::command]
pub fn get_settings(state: State<'_, Arc<Manager>>) -> AppResult<Settings> {
    let mgr = state.inner();

    let default_dir = mgr
        .db()
        .get_setting(SETTINGS_DEFAULT_DIR)?
        .unwrap_or_else(|| mgr.default_dir().to_string_lossy().into_owned());

    let max_active = mgr
        .db()
        .get_setting(SETTINGS_MAX_ACTIVE)?
        .and_then(|value| value.parse().ok())
        .unwrap_or(DEFAULT_MAX_ACTIVE);

    Ok(Settings {
        default_dir,
        max_active,
    })
}

#[tauri::command]
pub fn set_settings(state: State<'_, Arc<Manager>>, settings: Settings) -> AppResult<Settings> {
    let mgr = state.inner().clone();
    mgr.db()
        .set_setting(SETTINGS_DEFAULT_DIR, &settings.default_dir)?;
    mgr.db()
        .set_setting(SETTINGS_MAX_ACTIVE, &settings.max_active.to_string())?;
    mgr.set_max_active(settings.max_active);
    Ok(settings)
}

fn read_bridge_info(bridge: &BridgeState) -> BridgeInfo {
    let port = *bridge.port.lock().unwrap();
    BridgeInfo {
        running: port.is_some(),
        port: port.unwrap_or(0),
    }
}

#[tauri::command]
pub fn get_bridge_info(bridge: State<'_, BridgeState>) -> AppResult<BridgeInfo> {
    Ok(read_bridge_info(bridge.inner()))
}
