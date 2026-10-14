import { useState } from "react";
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

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const hasSelection = selected.size > 0;

  return (
    <div className="flex h-full flex-col">
      <ActionBar hasSelection={hasSelection} />
      <DownloadsTable selected={selected} onSelectedChange={setSelected} />
    </div>
  );
}

function ActionBar({ hasSelection }: { hasSelection: boolean }) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b px-2 py-1">
      <div className="flex items-center gap-1">
        <ActionButton icon={PlusIcon} label="New URL" weight="bold" />
        <ActionButton icon={PlayIcon} label="Resume" disabled={!hasSelection} />
        <ActionButton icon={StopIcon} label="Stop" disabled={!hasSelection} />
        <ActionButton
          icon={TrashIcon}
          label="Delete"
          disabled={!hasSelection}
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
}: {
  icon: Icon;
  label: string;
  weight?: IconWeight;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      disabled={disabled}
      className="h-auto flex-col gap-0.5 rounded-lg px-2.5 py-1.5 opacity-80 hover:opacity-100"
    >
      <Icon className="size-7" weight={weight} />
      <span className="text-[10px] leading-none text-muted-foreground">
        {label}
      </span>
    </Button>
  );
}
