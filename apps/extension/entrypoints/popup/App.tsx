import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, normalizeEndpoint } from '@/utils/settings';
import './App.css';

type Status = 'checking' | 'connected' | 'disconnected';

export default function App() {
  const [status, setStatus] = useState<Status>('checking');
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    const endpoint = normalizeEndpoint(DEFAULT_SETTINGS.endpoint);
    let cancelled = false;

    const check = async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      try {
        const response = await fetch(`${endpoint}/health`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const health = await response.json();
        if (cancelled) return;
        setStatus('connected');
        setVersion(health.version ?? null);
      } catch {
        if (cancelled) return;
        setStatus('disconnected');
        setVersion(null);
      } finally {
        clearTimeout(timer);
      }
    };

    void check();
    const id = setInterval(() => void check(), 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="popup">
      <h1>Neson Bridge</h1>

      <div className={`status ${status}`}>
        <span className="dot" />
        <div className="message">
          {status === 'checking' && <p className="title">Connecting…</p>}

          {status === 'connected' && (
            <>
              <p className="title">Connected to Neson</p>
              <p className="hint">
                Browser downloads are handed to the app.
                {version ? ` (v${version})` : ''}
              </p>
            </>
          )}

          {status === 'disconnected' && (
            <>
              <p className="title">Can’t reach Neson</p>
              <p className="hint">
                Download the app, or restart it — the connection is broken.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
