import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Square, X } from "@phosphor-icons/react";

const isMac = navigator.userAgent.includes("Mac");
const appWindow = "__TAURI_INTERNALS__" in window ? getCurrentWindow() : null;

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!appWindow) return;

    let unlisten: (() => void) | undefined;
    const sync = () => appWindow.isMaximized().then(setMaximized);

    sync();
    appWindow.onResized(sync).then((fn) => {
      unlisten = fn;
    });

    return () => unlisten?.();
  }, []);

  const showControls = appWindow !== null && !isMac;

  return (
    <header
      data-tauri-drag-region
      className="relative flex h-9 shrink-0 items-center justify-center bg-background select-none"
    >
      <span
        data-tauri-drag-region
        className="font-heading text-xs font-medium tracking-tight text-muted-foreground"
      >
        Neson
      </span>

      {showControls && (
        <div className="absolute right-0 flex h-full items-stretch">
          <button
            type="button"
            aria-label="Minimize"
            onClick={() => appWindow?.minimize()}
            className="flex w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Minus className="size-3.5" weight="bold" />
          </button>
          <button
            type="button"
            aria-label={maximized ? "Restore" : "Maximize"}
            onClick={() => appWindow?.toggleMaximize()}
            className="flex w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {maximized ? (
              <Copy className="size-3.5" weight="bold" />
            ) : (
              <Square className="size-3.5" weight="bold" />
            )}
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={() => appWindow?.close()}
            className="flex w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-destructive hover:text-white"
          >
            <X className="size-3.5" weight="bold" />
          </button>
        </div>
      )}
    </header>
  );
}
