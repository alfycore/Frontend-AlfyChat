/**
 * desktop.ts
 * Pont vers l'enveloppe Electron (`desktop/preload.js`).
 *
 * La fenêtre desktop est créée avec `titleBarStyle: 'hidden'` : elle n'a donc
 * ni barre de titre ni boutons système. Le préchargement expose pourtant déjà
 * `minimize` / `maximize` / `close` / `isMaximized` et pousse un événement
 * `win-state` — mais rien côté interface ne s'en servait, si bien que la
 * fenêtre n'était tout simplement pas pilotable. `AppTitleBar` s'y branche.
 *
 * Dans un navigateur, `window.electronAPI` n'existe pas : `desktopBridge()`
 * renvoie `null` et l'appelant masque les contrôles de fenêtre.
 */

export interface DesktopBridge {
  /** { FRONTEND_URL, APP_VERSION, IS_DEV, SOURCE, PARTITION } */
  getConfig: () => Promise<Record<string, unknown>>;
  openExternal: (url: string) => Promise<unknown>;
  showNotification: (opts: unknown) => Promise<unknown>;

  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  /** Maximisation/restauration poussée par le processus principal. */
  onWinState: (callback: (state: { maximized: boolean }) => void) => void;

  installUpdate: () => Promise<unknown>;
}

declare global {
  interface Window {
    electronAPI?: DesktopBridge;
  }
}

/** Le pont Electron, ou `null` hors application desktop (navigateur, SSR). */
export function desktopBridge(): DesktopBridge | null {
  if (typeof window === 'undefined') return null;
  return window.electronAPI ?? null;
}
