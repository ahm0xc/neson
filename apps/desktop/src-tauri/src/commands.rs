use std::path::PathBuf;
use std::sync::Arc;

use tauri::State;
use uuid::Uuid;

use crate::engine::{self, Manager};
use crate::error::{AppError, AppResult};
use crate::models::{AddDownloadRequest, Download, DownloadStatus, Settings};

const SETTINGS_DEFAULT_DIR: &str = "default_dir";
const SETTINGS_MAX_ACTIVE: &str = "max_active";
const DEFAULT_MAX_ACTIVE: u32 = 3;

#[tauri::command]
pub fn add_download(
    state: State<'_, Arc<Manager>>,
    req: AddDownloadRequest,
) -> AppResult<Download> {
    let mgr = state.inner().clone();

    let url = req.url.trim().to_string();
    if url.is_empty() {
        return Err(AppError::Message("a URL is required".into()));
    }
    reqwest::Url::parse(&url).map_err(|err| AppError::Url(err.to_string()))?;

    let dir = req
        .dir
        .map(|d| d.trim().to_string())
        .filter(|d| !d.is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| mgr.default_dir().to_path_buf());
    std::fs::create_dir_all(&dir)?;

    let requested = req
        .filename
        .map(|f| engine::sanitize_filename(f.trim()))
        .filter(|f| !f.is_empty())
        .unwrap_or_else(|| engine::filename_from_url(&url));
    let filename = engine::unique_filename_blocking(&dir, &requested);

    let download = Download {
        id: Uuid::new_v4().to_string(),
        url,
        filename,
        dir: dir.to_string_lossy().into_owned(),
        status: DownloadStatus::Queued,
        total_bytes: None,
        downloaded_bytes: 0,
        added_at: chrono::Utc::now().to_rfc3339(),
        completed_at: None,
        error: None,
    };

    mgr.db().insert_download(&download)?;
    engine::emit_changed(mgr.app(), Some(download.clone()));

    let mgr2 = mgr.clone();
    let id = download.id.clone();
    tauri::async_runtime::spawn(async move { engine::start(mgr2, id).await });

    Ok(download)
}

#[tauri::command]
pub fn list_downloads(state: State<'_, Arc<Manager>>) -> AppResult<Vec<Download>> {
    state.db().list_downloads()
}

#[tauri::command]
pub fn pause_download(state: State<'_, Arc<Manager>>, id: String) -> AppResult<()> {
    let mgr = state.inner();
    mgr.cancel(&id);
    mgr.db().set_status(&id, DownloadStatus::Paused, None)?;
    engine::emit_changed(mgr.app(), mgr.db().get_download(&id)?);
    Ok(())
}

#[tauri::command]
pub fn resume_download(state: State<'_, Arc<Manager>>, id: String) -> AppResult<()> {
    let mgr = state.inner().clone();
    if mgr.db().get_download(&id)?.is_none() {
        return Err(AppError::Message("download not found".into()));
    }

    let mgr2 = mgr.clone();
    tauri::async_runtime::spawn(async move { engine::start(mgr2, id).await });
    Ok(())
}

#[tauri::command]
pub fn remove_download(state: State<'_, Arc<Manager>>, id: String) -> AppResult<()> {
    let mgr = state.inner();
    mgr.cancel(&id);

    if let Some(download) = mgr.db().get_download(&id)? {
        let final_path = PathBuf::from(&download.dir).join(&download.filename);
        let _ = std::fs::remove_file(engine::part_path_for(&final_path));
    }

    mgr.db().delete_download(&id)?;
    Ok(())
}

#[tauri::command]
pub fn get_settings(state: State<'_, Arc<Manager>>) -> AppResult<Settings> {
    let mgr = state.inner();
    let db = mgr.db();

    let default_dir = db
        .get_setting(SETTINGS_DEFAULT_DIR)?
        .unwrap_or_else(|| mgr.default_dir().to_string_lossy().into_owned());

    let max_active = db
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
    let mgr = state.inner();
    mgr.db()
        .set_setting(SETTINGS_DEFAULT_DIR, &settings.default_dir)?;
    mgr.db()
        .set_setting(SETTINGS_MAX_ACTIVE, &settings.max_active.to_string())?;
    Ok(settings)
}
