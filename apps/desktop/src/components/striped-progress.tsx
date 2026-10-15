import { cn } from "cn";
import type { DownloadStatus } from "@/lib/bindings/DownloadStatus";

const fillColors: Record<DownloadStatus, string> = {
  downloading: "bg-sky-500",
  completed: "bg-emerald-500",
  paused: "bg-amber-500",
  queued: "bg-muted-foreground/40",
  error: "bg-destructive",
};

export function StripedProgress({
  value,
  status,
  className,
}: {
  value: number;
  status: DownloadStatus;
  className?: string;
}) {
  const active = status === "downloading";

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      className={cn(
        "h-2.5 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className={cn(
          "h-full overflow-hidden rounded-full transition-[width] duration-300 ease-out",
          fillColors[status],
        )}
        style={{ width: `${Math.min(100, Math.max(value, value > 0 ? 3 : 0))}%` }}
      >
        <div
          className={cn(
            "h-full w-full",
            active ? "neson-candy" : "neson-candy-paused",
          )}
        />
      </div>
    </div>
  );
}
