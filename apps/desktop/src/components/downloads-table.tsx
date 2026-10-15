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
import type { Download } from "@/lib/bindings/Download"
import type { DownloadProgress } from "@/lib/bindings/DownloadProgress"
import {
  formatBytes,
  formatDate,
  formatEta,
  formatPercent,
  formatSpeed,
} from "@/lib/format"
import { progressStyles, statusLabels, statusStyles } from "@/lib/status"

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

export function DownloadsTable({
  downloads,
  progress,
  selected,
  onSelectedChange,
}: {
  downloads: Download[]
  progress: Record<string, DownloadProgress>
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
          {downloads.length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="px-3 py-16 text-center text-muted-foreground"
              >
                No downloads yet. Click “New URL” to add one.
              </td>
            </tr>
          )}
          {downloads.map((download) => {
            const isSelected = selected.has(download.id)
            const ItemIcon = fileIconFor(download.filename)
            const live = progress[download.id]
            const downloadedBytes =
              live?.downloaded_bytes ?? download.downloaded_bytes
            const totalBytes = live?.total_bytes ?? download.total_bytes
            const percent = formatPercent(downloadedBytes, totalBytes)
            const hasTotal = totalBytes != null && totalBytes > 0
            const isStreaming = download.status === "downloading"
            const speed = isStreaming ? formatSpeed(live?.speed_bps) : "—"
            const eta = isStreaming ? formatEta(live?.eta_secs) : null

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
                    aria-label={`Select ${download.filename}`}
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
                        {download.filename}
                      </div>
                      <div className="truncate text-[10px] text-muted-foreground/70">
                        {download.error ?? download.url}
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
                  {hasTotal ? (
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-14 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-[width]",
                            progressStyles[download.status]
                          )}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-7 text-right text-[10px] tabular-nums text-muted-foreground">
                        {percent}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  <div className="truncate tabular-nums">
                    {formatBytes(totalBytes)}
                  </div>
                  {download.status !== "completed" && (
                    <div className="truncate text-[10px] tabular-nums text-muted-foreground/70">
                      {formatBytes(downloadedBytes)}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  <div className="truncate">{speed}</div>
                  {eta && (
                    <div className="truncate text-[10px] text-muted-foreground/70">
                      {eta}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  <div className="truncate">{formatDate(download.added_at)}</div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
