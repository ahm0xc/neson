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

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div>
      <ActionBar />
    </div>
  );
}

function ActionBar() {
  return (
    <div className="flex items-center justify-between border-b px-2 py-1">
      <div className="flex items-center gap-1">
        <ActionButton icon={PlusIcon} label="New URL" weight="bold" />
        <ActionButton icon={PlayIcon} label="Resume" disabled />
        <ActionButton icon={StopIcon} label="Stop" disabled />
        <ActionButton icon={TrashIcon} label="Delete" disabled />
      </div>

      <div className="flex items-center gap-1">
        <ActionButton icon={GearSixIcon} label="Settings" />
        <ActionButton icon={GlobeIcon} label="Extension" />
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
      className="h-auto flex-col gap-1 rounded-lg px-2.5 py-1.5"
      disabled={disabled}
    >
      <Icon className="size-7" weight={weight} />
      <span className="text-[10px] leading-none text-muted-foreground">
        {label}
      </span>
    </Button>
  );
}
