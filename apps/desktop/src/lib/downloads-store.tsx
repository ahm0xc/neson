import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { Download, DownloadProgress } from "./bindings";
import { api, onDownloadChanged, onDownloadProgress } from "./api";
import { isTauri, openDownloadWindow } from "./windows";

function currentWindowIsMain(): boolean {
  if (!isTauri()) return false;
  try {
    return getCurrentWebviewWindow().label === "main";
  } catch {
    return false;
  }
}

interface DownloadsContextValue {
  downloads: Download[];
  progress: Record<string, DownloadProgress>;
  addDownload: (url: string, filename?: string) => Promise<Download>;
  pauseDownload: (id: string) => Promise<void>;
  resumeDownload: (id: string) => Promise<void>;
  removeDownload: (id: string) => Promise<void>;
  reorderDownloads: (ids: string[]) => Promise<void>;
}

const DownloadsContext = createContext<DownloadsContextValue | null>(null);

function upsert(list: Download[], item: Download): Download[] {
  const index = list.findIndex((download) => download.id === item.id);
  if (index === -1) return [item, ...list];
  const next = list.slice();
  next[index] = item;
  return next;
}

export function DownloadsProvider({ children }: { children: ReactNode }) {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [progress, setProgress] = useState<Record<string, DownloadProgress>>({});
  const knownIds = useRef<Set<string>>(new Set());
  const isMainWindow = useRef(currentWindowIsMain());

  useEffect(() => {
    let disposed = false;
    const unlisteners: Array<() => void> = [];

    void (async () => {
      try {
        const initial = await api.listDownloads();
        if (!disposed) {
          knownIds.current = new Set(initial.map((download) => download.id));
          setDownloads(initial);
        }
      } catch (error) {
        console.error("failed to load downloads", error);
      }

      unlisteners.push(
        await onDownloadChanged((download) => {
          const isNew = !knownIds.current.has(download.id);
          knownIds.current.add(download.id);
          setDownloads((prev) => upsert(prev, download));
          // A download added elsewhere (e.g. the browser bridge) should pop
          // its own window. Only the main window opens windows; other windows
          // would otherwise open duplicates of each other.
          if (isNew && isMainWindow.current) void openDownloadWindow(download.id);
        }),
      );
      unlisteners.push(
        await onDownloadProgress((item) =>
          setProgress((prev) => ({ ...prev, [item.id]: item })),
        ),
      );
    })();

    return () => {
      disposed = true;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, []);

  const addDownload = useCallback(async (url: string, filename?: string) => {
    const download = await api.addDownload({
      url,
      filename: filename ?? null,
      dir: null,
    });
    knownIds.current.add(download.id);
    setDownloads((prev) => upsert(prev, download));
    void openDownloadWindow(download.id);
    return download;
  }, []);

  const pauseDownload = useCallback(async (id: string) => {
    await api.pauseDownload(id);
  }, []);

  const resumeDownload = useCallback(async (id: string) => {
    await api.resumeDownload(id);
  }, []);

  const removeDownload = useCallback(async (id: string) => {
    await api.removeDownload(id);
    setDownloads((prev) => prev.filter((download) => download.id !== id));
    setProgress((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const reorderDownloads = useCallback(async (ids: string[]) => {
    const next = await api.reorderDownloads(ids);
    setDownloads(next);
  }, []);

  const value = useMemo<DownloadsContextValue>(
    () => ({
      downloads,
      progress,
      addDownload,
      pauseDownload,
      resumeDownload,
      removeDownload,
      reorderDownloads,
    }),
    [
      downloads,
      progress,
      addDownload,
      pauseDownload,
      resumeDownload,
      removeDownload,
      reorderDownloads,
    ],
  );

  return (
    <DownloadsContext.Provider value={value}>
      {children}
    </DownloadsContext.Provider>
  );
}

export function useDownloads(): DownloadsContextValue {
  const context = useContext(DownloadsContext);
  if (!context) {
    throw new Error("useDownloads must be used within a DownloadsProvider");
  }
  return context;
}
