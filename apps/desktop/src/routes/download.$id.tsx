import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { join } from "@tauri-apps/api/path";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { StripedProgress } from "@/components/striped-progress";
import { useDownloads } from "@/lib/downloads-store";
import {
  formatBytes,
  formatEta,
  formatPercent,
  formatSpeed,
} from "@/lib/format";
import { statusLabels, statusStyles } from "@/lib/status";
import { cn } from "cn";

export const Route = createFileRoute("/download/$id")({
  component: DownloadWindow,
});

const chartConfig = {
  speed: { label: "Speed", color: "var(--neson-speed)" },
} satisfies ChartConfig;

const isMac = navigator.userAgent.includes("Mac");

const chartColors: Record<string, string> = {
  downloading: "#0ea5e9",
  completed: "#10b981",
  paused: "#f59e0b",
  error: "var(--destructive)",
  queued: "var(--muted-foreground)",
};

type Sample = { t: number; speed: number };

function DownloadWindow() {
  const { id } = Route.useParams();
  const { downloads, progress, pauseDownload, resumeDownload, removeDownload } =
    useDownloads();
  const download = downloads.find((item) => item.id === id);
  const live = progress[id];

  const [samples, setSamples] = useState<Sample[]>([]);
  const tick = useRef(0);

  useEffect(() => {
    if (!live || live.status !== "downloading") return;
    tick.current += 1;
    setSamples((prev) =>
      [...prev, { t: tick.current, speed: live.speed_bps }].slice(-80),
    );
  }, [live]);

  const close = () => {
    if ("__TAURI_INTERNALS__" in window) {
      void getCurrentWebviewWindow().close();
    } else {
      window.close();
    }
  };

  const revealInFolder = async () => {
    if (!download) return;
    try {
      const path = await join(download.dir, download.filename);
      await revealItemInDir(path);
    } catch (error) {
      console.error("failed to reveal file", error);
    }
  };

  if (!download) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const downloaded = live?.downloaded_bytes ?? download.downloaded_bytes;
  const total = live?.total_bytes ?? download.total_bytes;
  const percent = formatPercent(downloaded, total);
  const running = download.status === "downloading";
  const speed = running ? formatSpeed(live?.speed_bps) : "—";
  const eta = running ? formatEta(live?.eta_secs) : null;

  return (
    <div
      className="flex h-screen flex-col gap-3 overflow-hidden bg-background p-4 text-foreground"
      style={
        { "--neson-speed": chartColors[download.status] } as CSSProperties
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {download.filename}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {download.error ?? download.url}
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
            statusStyles[download.status],
          )}
        >
          {statusLabels[download.status]}
        </span>
      </div>

      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-20 w-full"
      >
        <AreaChart
          data={samples}
          margin={{ top: 6, right: 2, bottom: 0, left: 2 }}
        >
          <defs>
            <linearGradient id="neson-speed" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-speed)"
                stopOpacity={0.45}
              />
              <stop
                offset="100%"
                stopColor="var(--color-speed)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" hide />
          <YAxis hide domain={[0, "dataMax + 1"]} />
          <Area
            type="monotone"
            dataKey="speed"
            stroke="var(--color-speed)"
            strokeWidth={2}
            fill="url(#neson-speed)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>

      <div className="flex flex-col gap-1.5">
        <StripedProgress value={percent} status={download.status} />
        <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
          <span>
            {formatBytes(downloaded)} / {formatBytes(total)}
          </span>
          <span>{percent}%</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
        <span>{speed}</span>
        <span>{eta ? `ETA ${eta}` : statusLabels[download.status]}</span>
      </div>

      <div className="mt-auto flex shrink-0 justify-end gap-2">
        {download.status === "completed" ? (
          <>
            <Button size="sm" variant="outline" onClick={close}>
              Close
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void revealInFolder()}
            >
              {isMac ? "Open in Finder" : "Open Folder"}
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void removeDownload(download.id);
                close();
              }}
            >
              Cancel
            </Button>
            {(download.status === "downloading" ||
              download.status === "queued") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void pauseDownload(download.id)}
              >
                Pause
              </Button>
            )}
            {(download.status === "paused" || download.status === "error") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void resumeDownload(download.id)}
              >
                Resume
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
