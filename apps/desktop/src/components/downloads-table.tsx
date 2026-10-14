import {
  FileAudioIcon,
  FileIcon,
  FileImageIcon,
  FilePdfIcon,
  FileTextIcon,
  FileVideoIcon,
  FileZipIcon,
} from "@phosphor-icons/react"
import type { Icon } from "@phosphor-icons/react"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "cn"

const archiveExtensions = ["zip", "tar", "gz", "zst", "rar", "7z", "xz", "bz2"]
const imageExtensions = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "tiff"]
const videoExtensions = ["mp4", "mkv", "mov", "avi", "webm", "flv", "wmv"]
const audioExtensions = ["mp3", "wav", "flac", "m4a", "aac", "ogg"]
const textExtensions = ["txt", "md", "rtf"]

function fileIconFor(name: string): Icon {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  if (archiveExtensions.includes(ext)) return FileZipIcon
  if (imageExtensions.includes(ext)) return FileImageIcon
  if (videoExtensions.includes(ext)) return FileVideoIcon
  if (audioExtensions.includes(ext)) return FileAudioIcon
  if (textExtensions.includes(ext)) return FileTextIcon
  if (ext === "pdf") return FilePdfIcon
  return FileIcon
}

export type DownloadStatus =
  | "downloading"
  | "completed"
  | "paused"
  | "queued"
  | "error"

export interface Download {
  id: string
  name: string
  url: string
  status: DownloadStatus
  progress: number
  downloaded: string
  size: string
  speed: string
  addedAt: string
}

export const downloads: Download[] = [
  {
    id: "1",
    name: "ubuntu-24.04-desktop-amd64.iso",
    url: "https://releases.ubuntu.com/24.04/ubuntu-24.04-desktop-amd64.iso",
    status: "downloading",
    progress: 62,
    downloaded: "3.1 GB",
    size: "5.0 GB",
    speed: "12.4 MB/s",
    addedAt: "14 Oct 2026",
  },
  {
    id: "2",
    name: "blender-4.2.0-macos-arm64.dmg",
    url: "https://download.blender.org/release/Blender4.2/blender-4.2.0-macos-arm64.dmg",
    status: "completed",
    progress: 100,
    downloaded: "312 MB",
    size: "312 MB",
    speed: "—",
    addedAt: "14 Oct 2026",
  },
  {
    id: "3",
    name: "sintel-4k.mkv",
    url: "https://download.blender.org/demo/movies/sintel-4k.mkv",
    status: "paused",
    progress: 27,
    downloaded: "1.9 GB",
    size: "6.9 GB",
    speed: "—",
    addedAt: "14 Oct 2026",
  },
  {
    id: "4",
    name: "node-v22.11.0-darwin-arm64.tar.gz",
    url: "https://nodejs.org/dist/v22.11.0/node-v22.11.0-darwin-arm64.tar.gz",
    status: "queued",
    progress: 0,
    downloaded: "0 B",
    size: "38 MB",
    speed: "—",
    addedAt: "14 Oct 2026",
  },
  {
    id: "5",
    name: "debian-12.7.0-amd64-netinst.iso",
    url: "https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/debian-12.7.0-amd64-netinst.iso",
    status: "downloading",
    progress: 88,
    downloaded: "560 MB",
    size: "635 MB",
    speed: "8.1 MB/s",
    addedAt: "14 Oct 2026",
  },
  {
    id: "6",
    name: "dataset-imagenet-subset.zip",
    url: "https://example.com/datasets/imagenet-subset.zip",
    status: "error",
    progress: 41,
    downloaded: "2.4 GB",
    size: "5.9 GB",
    speed: "—",
    addedAt: "14 Oct 2026",
  },
  {
    id: "7",
    name: "firefox-131.0.en-US.mac.dmg",
    url: "https://download.mozilla.org/?product=firefox-latest",
    status: "completed",
    progress: 100,
    downloaded: "134 MB",
    size: "134 MB",
    speed: "—",
    addedAt: "13 Oct 2026",
  },
  {
    id: "8",
    name: "docker-4.34.3.dmg",
    url: "https://desktop.docker.com/mac/main/arm64/Docker.dmg",
    status: "completed",
    progress: 100,
    downloaded: "528 MB",
    size: "528 MB",
    speed: "—",
    addedAt: "13 Oct 2026",
  },
  {
    id: "9",
    name: "llama-3.1-8b-instruct.gguf",
    url: "https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct/resolve/main/model.gguf",
    status: "downloading",
    progress: 14,
    downloaded: "680 MB",
    size: "4.9 GB",
    speed: "22.7 MB/s",
    addedAt: "13 Oct 2026",
  },
  {
    id: "10",
    name: "gimp-2.10.38.dmg",
    url: "https://download.gimp.org/mirror/pub/gimp/v2.10/gimp-2.10.38.dmg",
    status: "queued",
    progress: 0,
    downloaded: "0 B",
    size: "248 MB",
    speed: "—",
    addedAt: "12 Oct 2026",
  },
  {
    id: "11",
    name: "steam.dmg",
    url: "https://cdn.cloudflare.steamstatic.com/client/installer/steam.dmg",
    status: "completed",
    progress: 100,
    downloaded: "4.2 MB",
    size: "4.2 MB",
    speed: "—",
    addedAt: "11 Oct 2026",
  },
  {
    id: "12",
    name: "kali-linux-2024.3-installer-amd64.iso",
    url: "https://cdimage.kali.org/kali-2024.3/kali-linux-2024.3-installer-amd64.iso",
    status: "paused",
    progress: 73,
    downloaded: "2.9 GB",
    size: "4.0 GB",
    speed: "—",
    addedAt: "10 Oct 2026",
  },
  {
    id: "13",
    name: "archive-old-backup.tar.zst",
    url: "https://backups.example.com/archive-old-backup.tar.zst",
    status: "error",
    progress: 0,
    downloaded: "0 B",
    size: "12.4 GB",
    speed: "—",
    addedAt: "09 Oct 2026",
  },
  {
    id: "14",
    name: "vscode-darwin-arm64.zip",
    url: "https://update.code.visualstudio.com/latest/darwin-arm64/stable",
    status: "completed",
    progress: 100,
    downloaded: "96 MB",
    size: "96 MB",
    speed: "—",
    addedAt: "07 Oct 2026",
  },
]

const statusStyles: Record<DownloadStatus, string> = {
  downloading:
    "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  completed:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  paused: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  queued: "border-border bg-muted text-muted-foreground",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
}

const statusLabels: Record<DownloadStatus, string> = {
  downloading: "Downloading",
  completed: "Completed",
  paused: "Paused",
  queued: "Queued",
  error: "Error",
}

const progressStyles: Record<DownloadStatus, string> = {
  downloading: "bg-sky-500",
  completed: "bg-emerald-500",
  paused: "bg-amber-500",
  queued: "bg-muted-foreground/40",
  error: "bg-destructive",
}

export function DownloadsTable({
  selected,
  onSelectedChange,
}: {
  selected: Set<string>
  onSelectedChange: (ids: Set<string>) => void
}) {
  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectedChange(next)
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      <table className="w-full table-fixed caption-bottom text-xs">
        <colgroup>
          <col className="w-9" />
          <col />
          <col className="w-24" />
          <col className="w-28" />
          <col className="w-20" />
          <col className="w-20" />
          <col className="w-24" />
        </colgroup>
        <tbody>
          {downloads.map((download) => {
            const isSelected = selected.has(download.id)
            const ItemIcon = fileIconFor(download.name)
            return (
              <tr
                key={download.id}
                data-selected={isSelected}
                onClick={() => toggle(download.id)}
                className={cn(
                  "cursor-default border-b transition-colors last:border-b-0 hover:bg-muted/50 data-[selected=true]:bg-muted/60"
                )}
              >
                <td
                  className="py-2 pl-3 pr-1"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Checkbox
                    aria-label={`Select ${download.name}`}
                    checked={isSelected}
                    onCheckedChange={() => toggle(download.id)}
                  />
                </td>
                <td className="py-2 pl-2 pr-3 text-left">
                  <div className="flex w-full items-center justify-start gap-2">
                    <ItemIcon
                      className="size-4 shrink-0 text-muted-foreground"
                      weight="duotone"
                    />
                    <div className="min-w-0 flex-1 text-left">
                      <div className="truncate font-medium">
                        {download.name}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                      statusStyles[download.status]
                    )}
                  >
                    {statusLabels[download.status]}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {download.status === "downloading" ||
                  download.status === "error" ? (
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-14 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-[width]",
                            progressStyles[download.status]
                          )}
                          style={{ width: `${download.progress}%` }}
                        />
                      </div>
                      <span className="w-7 text-right text-[10px] tabular-nums text-muted-foreground">
                        {download.progress}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  <div className="truncate tabular-nums">{download.size}</div>
                  {download.status !== "completed" && (
                    <div className="truncate text-[10px] tabular-nums text-muted-foreground/70">
                      {download.downloaded}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  <div className="truncate">{download.speed}</div>
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  <div className="truncate">{download.addedAt}</div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
