import { browser } from 'wxt/browser';

export interface Settings {
  enabled: boolean;
  endpoint: string;
  skipHosts: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  endpoint: 'http://127.0.0.1:47821',
  skipHosts: [],
};

export async function getSettings(): Promise<Settings> {
  const stored = await browser.storage.sync.get();
  return {
    enabled:
      stored.enabled === undefined ? DEFAULT_SETTINGS.enabled : Boolean(stored.enabled),
    endpoint: String(stored.endpoint || DEFAULT_SETTINGS.endpoint),
    skipHosts: Array.isArray(stored.skipHosts) ? (stored.skipHosts as string[]) : [],
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.sync.set({ ...settings });
}

export function normalizeEndpoint(endpoint: string): string {
  return String(endpoint || DEFAULT_SETTINGS.endpoint)
    .trim()
    .replace(/\/+$/, '');
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function filenameFromUrl(url: string): string | null {
  try {
    const segment = new URL(url).pathname.split('/').filter(Boolean).pop() ?? '';
    return decodeURIComponent(segment) || null;
  } catch {
    return null;
  }
}

export function basename(path: string | undefined): string | null {
  if (!path) return null;
  const parts = String(path).split(/[\\/]/);
  return parts[parts.length - 1] || null;
}
