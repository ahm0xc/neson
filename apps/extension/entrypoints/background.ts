import { browser } from 'wxt/browser';
import {
  basename,
  filenameFromUrl,
  getSettings,
  hostOf,
  normalizeEndpoint,
  type Settings,
} from '@/utils/settings';

// Neson Download Bridge — background service worker.
//
// Every download Chrome starts is evaluated here. When the bridge is enabled
// the download is handed to the Neson desktop app over its loopback HTTP
// bridge and then cancelled in Chrome. If Neson is unreachable the download is
// left to Chrome, so a download is never lost.

function shouldIntercept(url: string, settings: Settings): boolean {
  if (!settings.enabled) return false;
  if (!/^https?:/i.test(url)) return false;
  const host = hostOf(url);
  return !settings.skipHosts.some(
    (skip) => skip && host && host.endsWith(skip.toLowerCase()),
  );
}

async function forward(
  url: string,
  filename: string | null,
  settings: Settings,
): Promise<{ filename?: string }> {
  const response = await fetch(
    `${normalizeEndpoint(settings.endpoint)}/downloads`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, filename, dir: null }),
    },
  );

  if (!response.ok) {
    let detail = '';
    try {
      detail = (await response.json())?.error ?? '';
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(detail || `Neson responded with ${response.status}`);
  }

  return response.json();
}

export default defineBackground(() => {
  browser.downloads.onDeterminingFilename.addListener((item, suggest) => {
    // Chrome requires `suggest` to be called exactly once. Guard it so a
    // failure after the hand-off cannot trigger a second, invalid call.
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      suggest();
    };

    void (async () => {
      const settings = await getSettings();
      const url = item.finalUrl || item.url;

      if (!shouldIntercept(url, settings)) {
        release();
        return;
      }

      // Hand the download to Neson first; only cancel Chrome once accepted.
      // A forward failure leaves the download entirely to Chrome.
      try {
        await forward(
          url,
          basename(item.filename) ?? filenameFromUrl(url),
          settings,
        );
      } catch {
        release();
        return;
      }

      release();
      try {
        await browser.downloads.cancel(item.id);
        await browser.downloads.erase({ id: item.id });
      } catch {
        // Neson already owns the download; a cancel hiccup is not fatal.
      }
    })();

    // `suggest` is called asynchronously above, so keep the event pending.
    return true;
  });
});
