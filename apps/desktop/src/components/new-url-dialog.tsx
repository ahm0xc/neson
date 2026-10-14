import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDownloads } from "@/lib/downloads-store";

export function NewUrlDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addDownload } = useDownloads();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setUrl("");
    setError(null);
    setBusy(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Paste a URL to download.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await addDownload(trimmed);
      handleOpenChange(false);
    } catch (err) {
      setError(
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : "Could not start the download.",
      );
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[440px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-popover p-5 text-popover-foreground shadow-2xl outline-none">
          <Dialog.Title className="text-sm font-semibold">
            New download
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-muted-foreground">
            Paste a link to start downloading.
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-3">
            <Input
              autoFocus
              placeholder="https://example.com/file.zip"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submit();
              }}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close className="inline-flex h-8 items-center justify-center rounded-4xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              Cancel
            </Dialog.Close>
            <Button size="sm" disabled={busy} onClick={() => void submit()}>
              {busy ? "Starting…" : "Download"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
