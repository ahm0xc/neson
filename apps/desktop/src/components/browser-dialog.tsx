import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  CheckIcon,
  CopyIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { BridgeInfo } from "@/lib/bindings";

export function BrowserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [info, setInfo] = useState<BridgeInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setInfo(await api.getBridgeInfo());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const endpoint = info ? `http://127.0.0.1:${info.port}` : "—";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[520px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-popover p-5 text-popover-foreground shadow-2xl outline-none">
          <Dialog.Title className="text-sm font-semibold">
            Browser integration
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-muted-foreground">
            Connect the Neson Chrome extension so downloads in your browser are
            handed to this app.
          </Dialog.Description>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span
                className={
                  info?.running
                    ? "size-2 rounded-full bg-emerald-500"
                    : "size-2 rounded-full bg-destructive"
                }
              />
              <span className="text-muted-foreground">
                {info?.running
                  ? "Bridge is running"
                  : "Bridge is not running"}
              </span>
            </div>

            <Field label="Endpoint">
              <CopyRow value={endpoint} />
            </Field>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="rounded-xl border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground">Setup</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-4">
                <li>
                  Open <code>chrome://extensions</code> and enable Developer
                  mode.
                </li>
                <li>
                  Choose <strong>Load unpacked</strong> and select the{" "}
                  <code>apps/extension</code> folder.
                </li>
                <li>
                  Click the Neson Bridge toolbar icon and paste the endpoint
                  above.
                </li>
              </ol>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <Dialog.Close className="inline-flex h-8 items-center justify-center rounded-4xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              Close
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function CopyRow({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="flex flex-1 items-center gap-2">
      <Input readOnly value={value} className="font-mono text-xs" />
      <Button
        size="icon-sm"
        variant="outline"
        disabled={!value}
        title="Copy"
        onClick={() => void copy()}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
    </div>
  );
}
