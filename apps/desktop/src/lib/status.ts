import type { DownloadStatus } from "./bindings/DownloadStatus";

export const statusStyles: Record<DownloadStatus, string> = {
  downloading:
    "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  completed:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  paused: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  queued: "border-border bg-muted text-muted-foreground",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
};

export const statusLabels: Record<DownloadStatus, string> = {
  downloading: "Downloading",
  completed: "Completed",
  paused: "Paused",
  queued: "Queued",
  error: "Error",
};

export const progressStyles: Record<DownloadStatus, string> = {
  downloading: "bg-sky-500",
  completed: "bg-emerald-500",
  paused: "bg-amber-500",
  queued: "bg-muted-foreground/40",
  error: "bg-destructive",
};
