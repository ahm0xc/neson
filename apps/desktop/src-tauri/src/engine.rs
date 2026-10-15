use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use futures_util::StreamExt;
use tauri::{AppHandle, Emitter};
use tokio::fs::OpenOptions;
use tokio::io::AsyncWriteExt;
use tokio::sync::{Mutex as AsyncMutex, watch};

use uuid::Uuid;

use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::models::{AddDownloadRequest, Download, DownloadProgress, DownloadStatus};

pub const EVENT_PROGRESS: &str = "download://progress";
pub const EVENT_CHANGED: &str = "download://changed";

const EMIT_INTERVAL: Duration = Duration::from_millis(250);
const PERSIST_INTERVAL: Duration = Duration::from_secs(2);
const PART_PREFIX: &str = ".";

struct Running {
    cancel: watch::Sender<bool>,
    gate: Arc<AsyncMutex<()>>,
}

pub struct Manager {
    app: AppHandle,
    db: Db,
    client: reqwest::Client,
    default_dir: PathBuf,
    max_active: Mutex<u32>,
    running: Mutex<HashMap<String, Running>>,
}

impl Manager {
    pub fn new(app: AppHandle, db: Db, default_dir: PathBuf, max_active: u32) -> AppResult<Self> {
        let client = reqwest::Client::builder()
            .cookie_provider(Arc::new(reqwest::cookie::Jar::default()))
            .redirect(reqwest::redirect::Policy::limited(10))
            .user_agent(concat!("Neson/", env!("CARGO_PKG_VERSION")))
            .connect_timeout(Duration::from_secs(15))
            .read_timeout(Duration::from_secs(30))
            .build()?;

        Ok(Self {
            app,
            db,
            client,
            default_dir,
            max_active: Mutex::new(max_active.max(1)),
            running: Mutex::new(HashMap::new()),
        })
    }

    #[allow(dead_code)]
    pub fn app(&self) -> &AppHandle {
        &self.app
    }

    pub fn db(&self) -> &Db {
        &self.db
    }

    pub fn default_dir(&self) -> &Path {
        &self.default_dir
    }

    pub fn client(&self) -> &reqwest::Client {
        &self.client
    }

    pub fn max_active(&self) -> u32 {
        *self.max_active.lock().unwrap()
    }

    pub fn set_max_active(self: &Arc<Self>, value: u32) {
        *self.max_active.lock().unwrap() = value.max(1);
        self.pump();
    }

    pub fn enqueue(self: &Arc<Self>, download: &Download) -> AppResult<()> {
        self.db.insert_download(download)?;
        emit_changed(&self.app, Some(download.clone()));
        self.pump();
        Ok(())
    }

    /// Validate a request and queue a new download. Shared by the UI command
    /// and the local browser bridge so both paths behave identically.
    pub fn add_download(self: &Arc<Self>, req: &AddDownloadRequest) -> AppResult<Download> {
        let url = req.url.trim().to_string();
        if url.is_empty() {
            return Err(AppError::Message("a URL is required".into()));
        }
        reqwest::Url::parse(&url).map_err(|err| AppError::Url(err.to_string()))?;

        let dir = req
            .dir
            .clone()
            .map(|d| d.trim().to_string())
            .filter(|d| !d.is_empty())
            .map(PathBuf::from)
            .unwrap_or_else(|| self.default_dir().to_path_buf());
        std::fs::create_dir_all(&dir)?;

        let requested = req
            .filename
            .clone()
            .map(|f| sanitize_filename(f.trim()))
            .filter(|f| !f.is_empty())
            .unwrap_or_else(|| filename_from_url(&url));
        let filename = unique_filename_blocking(&dir, &requested);

        let download = Download {
            id: Uuid::new_v4().to_string(),
            url,
            filename,
            dir: dir.to_string_lossy().into_owned(),
            status: DownloadStatus::Queued,
            total_bytes: None,
            downloaded_bytes: 0,
            queue_order: self.db().next_queue_order()?,
            added_at: chrono::Utc::now().to_rfc3339(),
            completed_at: None,
            error: None,
        };

        self.enqueue(&download)?;

        Ok(self.db.get_download(&download.id)?.unwrap_or(download))
    }

    /// Requeue anything that was mid-flight before the app restarted, then start
    /// as many as the concurrency limit allows.
    pub fn restore(self: &Arc<Self>) -> AppResult<()> {
        for download in self.db.list_downloads()? {
            if download.status == DownloadStatus::Downloading {
                self.db
                    .set_status(&download.id, DownloadStatus::Queued, None)?;
                emit_changed(&self.app, self.db.get_download(&download.id)?);
            }
        }
        self.pump();
        Ok(())
    }

    /// Start queued downloads until the active limit is reached.
    pub fn pump(self: &Arc<Self>) {
        let limit = self.max_active() as usize;
        let mut running = self.running.lock().unwrap();

        while running.len() < limit {
            let next = match self.db.next_queued() {
                Ok(Some(download)) => download,
                _ => break,
            };

            let (cancel_tx, cancel_rx) = watch::channel(false);
            let gate = Arc::new(AsyncMutex::new(()));
            running.insert(
                next.id.clone(),
                Running {
                    cancel: cancel_tx,
                    gate: gate.clone(),
                },
            );

            if let Err(err) = self
                .db
                .set_status(&next.id, DownloadStatus::Downloading, None)
            {
                eprintln!("[neson] failed to mark {} downloading: {err}", next.id);
            }
            emit_changed(&self.app, self.db.get_download(&next.id).ok().flatten());

            let manager = Arc::clone(self);
            let id = next.id.clone();
            tauri::async_runtime::spawn(async move {
                run_task(manager, id, cancel_rx, gate).await;
            });
        }
    }

    /// Signal the running task (if any) to stop and hand back its gate so the
    /// caller can wait for it to fully exit before touching shared state.
    fn take_cancel(&self, id: &str) -> Option<Arc<AsyncMutex<()>>> {
        let running = self.running.lock().unwrap();
        running.get(id).map(|entry| {
            let _ = entry.cancel.send(true);
            entry.gate.clone()
        })
    }

    pub async fn pause(self: &Arc<Self>, id: &str) -> AppResult<()> {
        let Some(download) = self.db.get_download(id)? else {
            return Ok(());
        };
        if download.status == DownloadStatus::Completed {
            return Ok(());
        }

        if let Some(gate) = self.take_cancel(id) {
            let _guard = gate.lock().await;
        }

        self.db.set_status(id, DownloadStatus::Paused, None)?;
        emit_changed(&self.app, self.db.get_download(id)?);
        self.pump();
        Ok(())
    }

    pub async fn resume(self: &Arc<Self>, id: &str) -> AppResult<()> {
        let Some(download) = self.db.get_download(id)? else {
            return Ok(());
        };
        if download.status == DownloadStatus::Completed {
            return Ok(());
        }

        if let Some(gate) = self.take_cancel(id) {
            let _guard = gate.lock().await;
        }

        self.db.set_status(id, DownloadStatus::Queued, None)?;
        emit_changed(&self.app, self.db.get_download(id)?);
        self.pump();
        Ok(())
    }

    pub async fn remove(self: &Arc<Self>, id: &str) -> AppResult<()> {
        if let Some(gate) = self.take_cancel(id) {
            let _guard = gate.lock().await;
        }

        if let Some(download) = self.db.get_download(id)? {
            let final_path = PathBuf::from(&download.dir).join(&download.filename);
            let _ = std::fs::remove_file(part_path_for(&final_path));
        }

        self.db.delete_download(id)?;
        self.pump();
        Ok(())
    }
}

enum DlError {
    Cancelled,
    App(AppError),
}

impl From<AppError> for DlError {
    fn from(value: AppError) -> Self {
        Self::App(value)
    }
}

impl From<std::io::Error> for DlError {
    fn from(value: std::io::Error) -> Self {
        Self::App(value.into())
    }
}

impl From<reqwest::Error> for DlError {
    fn from(value: reqwest::Error) -> Self {
        Self::App(value.into())
    }
}

async fn run_task(
    manager: Arc<Manager>,
    id: String,
    cancel: watch::Receiver<bool>,
    gate: Arc<AsyncMutex<()>>,
) {
    let guard = gate.lock().await;
    let outcome = download_task(&manager, &id, cancel).await;

    if let Err(DlError::App(err)) = outcome {
        eprintln!("[neson] download {id} failed: {err}");
        let _ = manager
            .db
            .set_status(&id, DownloadStatus::Error, Some(&err.to_string()));
        emit_changed(&manager.app, manager.db.get_download(&id).ok().flatten());
    }

    drop(guard);
    manager.running.lock().unwrap().remove(&id);
    manager.pump();
}

async fn download_task(
    manager: &Manager,
    id: &str,
    mut cancel: watch::Receiver<bool>,
) -> Result<(), DlError> {
    let Some(download) = manager.db.get_download(id)? else {
        return Ok(());
    };

    let dir = PathBuf::from(&download.dir);
    tokio::fs::create_dir_all(&dir).await?;
    let final_path = dir.join(&download.filename);
    let part_path = part_path_for(&final_path);

    let existing = tokio::fs::metadata(&part_path)
        .await
        .map(|meta| meta.len() as i64)
        .unwrap_or(0);

    let mut request = manager.client().get(&download.url);
    if existing > 0 {
        request = request.header(reqwest::header::RANGE, format!("bytes={existing}-"));
    }
    let response = request.send().await?;

    let status = response.status();
    if !status.is_success() {
        return Err(DlError::App(AppError::Message(format!(
            "server responded with {}",
            status.as_u16()
        ))));
    }

    let content_len = response.content_length();
    let resumed = existing > 0 && status == reqwest::StatusCode::PARTIAL_CONTENT;
    let start = if resumed { existing } else { 0 };
    let total = content_len.map(|len| start + len as i64);

    let mut file = if resumed {
        OpenOptions::new().append(true).open(&part_path).await?
    } else {
        OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(&part_path)
            .await?
    };

    manager.db.set_progress(id, start, total)?;
    emit_changed(&manager.app, manager.db.get_download(id).ok().flatten());

    let mut downloaded = start;
    let mut stream = response.bytes_stream();

    let mut last_emit = Instant::now();
    let mut last_persist = Instant::now();
    let mut last_bytes = start;
    let mut speed = 0.0_f64;

    emit_progress(
        &manager.app,
        DownloadProgress {
            id: id.to_string(),
            status: DownloadStatus::Downloading,
            downloaded_bytes: downloaded,
            total_bytes: total,
            speed_bps: 0.0,
            eta_secs: None,
        },
    );

    loop {
        tokio::select! {
            changed = cancel.changed() => {
                if changed.is_ok() && *cancel.borrow() {
                    file.flush().await?;
                    manager.db.set_progress(id, downloaded, total)?;
                    return Err(DlError::Cancelled);
                }
            }
            chunk = stream.next() => {
                match chunk {
                    None => break,
                    Some(Ok(bytes)) => {
                        file.write_all(&bytes).await?;
                        downloaded += bytes.len() as i64;

                        let now = Instant::now();
                        if now.duration_since(last_emit) >= EMIT_INTERVAL {
                            let elapsed = now.duration_since(last_emit).as_secs_f64().max(0.001);
                            let instant = (downloaded - last_bytes) as f64 / elapsed;
                            speed = if speed == 0.0 {
                                instant
                            } else {
                                speed * 0.6 + instant * 0.4
                            };
                            let eta = total.and_then(|t| {
                                (speed > 0.0).then(|| ((t - downloaded).max(0) as f64) / speed)
                            });
                            emit_progress(
                                &manager.app,
                                DownloadProgress {
                                    id: id.to_string(),
                                    status: DownloadStatus::Downloading,
                                    downloaded_bytes: downloaded,
                                    total_bytes: total,
                                    speed_bps: speed,
                                    eta_secs: eta,
                                },
                            );
                            last_emit = now;
                            last_bytes = downloaded;
                        }

                        if now.duration_since(last_persist) >= PERSIST_INTERVAL {
                            manager.db.set_progress(id, downloaded, total)?;
                            last_persist = now;
                        }
                    }
                    Some(Err(err)) => return Err(err.into()),
                }
            }
        }
    }

    file.flush().await?;
    drop(file);

    if let Some(total) = total
        && downloaded < total
    {
        return Err(DlError::App(AppError::Message(format!(
            "connection closed early ({downloaded}/{total} bytes)"
        ))));
    }

    let destination = unique_path_async(&final_path).await;
    tokio::fs::rename(&part_path, &destination).await?;

    manager
        .db
        .set_completed(id, downloaded, &chrono::Utc::now().to_rfc3339())?;
    emit_progress(
        &manager.app,
        DownloadProgress {
            id: id.to_string(),
            status: DownloadStatus::Completed,
            downloaded_bytes: downloaded,
            total_bytes: total,
            speed_bps: 0.0,
            eta_secs: Some(0.0),
        },
    );
    emit_changed(&manager.app, manager.db.get_download(id).ok().flatten());

    Ok(())
}

pub fn emit_changed(app: &AppHandle, download: Option<Download>) {
    if let Some(download) = download {
        let _ = app.emit(EVENT_CHANGED, download);
    }
}

fn emit_progress(app: &AppHandle, progress: DownloadProgress) {
    let _ = app.emit(EVENT_PROGRESS, progress);
}

pub fn part_path_for(final_path: &Path) -> PathBuf {
    let dir = final_path.parent().unwrap_or_else(|| Path::new("."));
    let name = final_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("download");
    dir.join(format!("{PART_PREFIX}{name}.part"))
}

pub fn filename_from_url(url: &str) -> String {
    let path = reqwest::Url::parse(url)
        .ok()
        .map(|u| u.path().to_string())
        .unwrap_or_default();
    let last = path
        .rsplit('/')
        .find(|segment| !segment.is_empty())
        .unwrap_or("");
    let decoded = percent_decode(last);
    let clean = sanitize_filename(&decoded);
    if clean.is_empty() {
        "download".to_string()
    } else {
        clean
    }
}

pub fn sanitize_filename(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|c| {
            if matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|') || c.is_control() {
                '_'
            } else {
                c
            }
        })
        .collect();
    let trimmed = cleaned.trim().trim_matches('.').trim();
    let trimmed = if trimmed.len() > 200 {
        &trimmed[..200]
    } else {
        trimmed
    };
    trimmed.to_string()
}

pub fn unique_filename_blocking(dir: &Path, filename: &str) -> String {
    if !dir.join(filename).exists() {
        return filename.to_string();
    }
    let (stem, ext) = split_name(filename);
    for index in 1..10_000 {
        let candidate = format!("{stem} ({index}){ext}");
        if !dir.join(&candidate).exists() {
            return candidate;
        }
    }
    filename.to_string()
}

async fn unique_path_async(path: &Path) -> PathBuf {
    if !tokio::fs::try_exists(path).await.unwrap_or(false) {
        return path.to_path_buf();
    }
    let dir = path.parent().unwrap_or_else(|| Path::new("."));
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("download");
    let (stem, ext) = split_name(name);
    for index in 1..10_000 {
        let candidate = dir.join(format!("{stem} ({index}){ext}"));
        if !tokio::fs::try_exists(&candidate).await.unwrap_or(false) {
            return candidate;
        }
    }
    path.to_path_buf()
}

fn split_name(filename: &str) -> (String, String) {
    match filename.rsplit_once('.') {
        Some((stem, ext)) if !stem.is_empty() => (stem.to_string(), format!(".{ext}")),
        _ => (filename.to_string(), String::new()),
    }
}

fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            let hex = std::str::from_utf8(&bytes[i + 1..i + 3]).ok();
            if let Some(value) = hex.and_then(|h| u8::from_str_radix(h, 16).ok()) {
                out.push(value);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn derives_filename_from_url() {
        assert_eq!(
            filename_from_url("https://example.com/files/ubuntu.iso"),
            "ubuntu.iso"
        );
        assert_eq!(
            filename_from_url("https://example.com/a/b/file.zip?token=1"),
            "file.zip"
        );
        assert_eq!(filename_from_url("https://example.com/"), "download");
        assert_eq!(filename_from_url("not a url"), "download");
    }

    #[test]
    fn decodes_percent_encoding() {
        assert_eq!(
            filename_from_url("https://example.com/My%20File%2Bname.bin"),
            "My File+name.bin"
        );
    }

    #[test]
    fn sanitizes_reserved_characters() {
        assert_eq!(sanitize_filename("a/b:c*?.txt"), "a_b_c__.txt");
        assert_eq!(sanitize_filename(".hidden"), "hidden");
        assert_eq!(sanitize_filename("   "), "");
    }

    #[test]
    fn splits_name_with_extension() {
        assert_eq!(
            split_name("archive.tar.gz"),
            ("archive.tar".to_string(), ".gz".to_string())
        );
        assert_eq!(split_name("README"), ("README".to_string(), String::new()));
    }

    #[test]
    fn part_path_is_hidden_sibling() {
        let path = Path::new("/tmp/downloads/file.zip");
        assert_eq!(
            part_path_for(path),
            PathBuf::from("/tmp/downloads/.file.zip.part")
        );
    }
}
