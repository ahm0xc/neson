import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  GearSixIcon,
  GlobeIcon,
  HandHeartIcon,
  PlayIcon,
  PlusIcon,
  PowerIcon,
  StopIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type { Icon, IconWeight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { DownloadsTable } from "@/components/downloads-table";
import { NewUrlDialog } from "@/components/new-url-dialog";
import { useDownloads } from "@/lib/downloads-store";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { downloads, progress, pauseDownload, resumeDownload, removeDownload } =
    useDownloads();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectedDownloads = useMemo(
    () => downloads.filter((download) => selected.has(download.id)),
    [downloads, selected],
  );

  const canResume = selectedDownloads.some(
    (download) => download.status === "paused" || download.status === "error",
  );
  const canStop = selectedDownloads.some(
    (download) =>
      download.status === "downloading" || download.status === "queued",
  );
  const hasSelection = selected.size > 0;

  const handleResume = () => {
    for (const download of selectedDownloads) {
      if (download.status === "paused" || download.status === "error") {
        void resumeDownload(download.id);
      }
    }
    setSelected(new Set());
  };

  const handleStop = () => {
    for (const download of selectedDownloads) {
      if (
        download.status === "downloading" ||
        download.status === "queued"
      ) {
        void pauseDownload(download.id);
      }
    }
    setSelected(new Set());
  };

  const handleDelete = () => {
    for (const download of selectedDownloads) {
      void removeDownload(download.id);
    }
    setSelected(new Set());
  };

  return (
    <div className="flex h-full flex-col">
      <ActionBar
        hasSelection={hasSelection}
        canResume={canResume}
        canStop={canStop}
        onNewUrl={() => setDialogOpen(true)}
        onResume={handleResume}
        onStop={handleStop}
        onDelete={handleDelete}
      />
      <DownloadsTable
        downloads={downloads}
        progress={progress}
        selected={selected}
        onSelectedChange={setSelected}
      />
      <NewUrlDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function ActionBar({
  hasSelection,
  canResume,
  canStop,
  onNewUrl,
  onResume,
  onStop,
  onDelete,
}: {
  hasSelection: boolean;
  canResume: boolean;
  canStop: boolean;
  onNewUrl: () => void;
  onResume: () => void;
  onStop: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b px-2 py-1">
      <div className="flex items-center gap-1">
        <ActionButton
          icon={PlusIcon}
          label="New URL"
          weight="bold"
          onClick={onNewUrl}
        />
        <ActionButton
          icon={PlayIcon}
          label="Resume"
          disabled={!canResume}
          onClick={onResume}
        />
        <ActionButton
          icon={StopIcon}
          label="Stop"
          disabled={!canStop}
          onClick={onStop}
        />
        <ActionButton
          icon={TrashIcon}
          label="Delete"
          disabled={!hasSelection}
          onClick={onDelete}
        />
      </div>

      <div className="flex items-center gap-1">
        <ActionButton icon={GearSixIcon} label="Settings" />
        <ActionButton icon={GlobeIcon} label="Browser" />
        <ActionButton icon={HandHeartIcon} label="Donate" />
        <ActionButton icon={PowerIcon} label="Quit" />
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  weight = "duotone",
  disabled = false,
  onClick,
}: {
  icon: Icon;
  label: string;
  weight?: IconWeight;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      variant="ghost"
      disabled={disabled}
      onClick={onClick}
      className="h-auto flex-col gap-0.5 rounded-lg px-2.5 py-1.5 opacity-80 hover:opacity-100"
    >
      <Icon className="size-7" weight={weight} />
      <span className="text-[10px] leading-none text-muted-foreground">
        {label}
      </span>
    </Button>
  );
}
