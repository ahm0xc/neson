import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { AddDownloadRequest, Download, DownloadProgress, Settings } from "./bindings";

export const DOWNLOAD_EVENTS = {
  progress: "download://progress",
  changed: "download://changed",
} as const;

export const api = {
  listDownloads: () => invoke<Download[]>("list_downloads"),
  addDownload: (req: AddDownloadRequest) =>
    invoke<Download>("add_download", { req }),
  pauseDownload: (id: string) => invoke<void>("pause_download", { id }),
  resumeDownload: (id: string) => invoke<void>("resume_download", { id }),
  removeDownload: (id: string) => invoke<void>("remove_download", { id }),
  getSettings: () => invoke<Settings>("get_settings"),
  setSettings: (settings: Settings) =>
    invoke<Settings>("set_settings", { settings }),
};

export function onDownloadProgress(
  handler: (progress: DownloadProgress) => void,
): Promise<UnlistenFn> {
  return listen<DownloadProgress>(DOWNLOAD_EVENTS.progress, (event) =>
    handler(event.payload),
  );
}

export function onDownloadChanged(
  handler: (download: Download) => void,
): Promise<UnlistenFn> {
  return listen<Download>(DOWNLOAD_EVENTS.changed, (event) =>
    handler(event.payload),
  );
}
