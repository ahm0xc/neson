import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Download, DownloadProgress } from "./bindings";
import { api, onDownloadChanged, onDownloadProgress } from "./api";

interface DownloadsContextValue {
  downloads: Download[];
  progress: Record<string, DownloadProgress>;
  addDownload: (url: string, filename?: string) => Promise<Download>;
  pauseDownload: (id: string) => Promise<void>;
  resumeDownload: (id: string) => Promise<void>;
  removeDownload: (id: string) => Promise<void>;
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

  useEffect(() => {
    let disposed = false;
    const unlisteners: Array<() => void> = [];

    void (async () => {
      try {
        const initial = await api.listDownloads();
        if (!disposed) setDownloads(initial);
      } catch (error) {
        console.error("failed to load downloads", error);
      }

      unlisteners.push(
        await onDownloadChanged((download) =>
          setDownloads((prev) => upsert(prev, download)),
        ),
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
    setDownloads((prev) => upsert(prev, download));
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

  const value = useMemo<DownloadsContextValue>(
    () => ({
      downloads,
      progress,
      addDownload,
      pauseDownload,
      resumeDownload,
      removeDownload,
    }),
    [downloads, progress, addDownload, pauseDownload, resumeDownload, removeDownload],
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
