import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

export function downloadWindowLabel(id: string): string {
  return `download-${id}`;
}

export function isTauri(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

export async function openDownloadWindow(id: string): Promise<void> {
  if (!isTauri()) return;

  const label = downloadWindowLabel(id);
  const existing = await WebviewWindow.getByLabel(label);
  if (existing) {
    await existing.setFocus();
    return;
  }

  const window = new WebviewWindow(label, {
    url: `index.html#/download/${id}`,
    title: "Download",
    width: 460,
    height: 320,
    resizable: false,
    closable: false,
    maximizable: false,
    fullscreen: false,
    center: true,
  });

  window.once("tauri://error", (event) => {
    console.error("failed to open download window", event);
  });
}
