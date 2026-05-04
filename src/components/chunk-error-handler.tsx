'use client';

import { useEffect } from 'react';

// After a new deployment, old chunk references in the browser cache 404.
// We reload once to pick up the fresh HTML + chunks. sessionStorage prevents
// infinite reload loops if the chunk is genuinely broken.
export function ChunkErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.name !== 'ChunkLoadError') return;
      const key = 'chunk_reload_at';
      const last = Number(sessionStorage.getItem(key) ?? 0);
      if (Date.now() - last < 10_000) return; // already reloaded in last 10s
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  return null;
}
