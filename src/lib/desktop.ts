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
  /** `process.platform` du processus principal ('win32', 'darwin', 'linux'). */
  platform: string;
  /**
   * L'OS dessine lui-même les boutons de fenêtre par-dessus le bandeau
   * (overlay Windows/Linux, feux tricolores macOS) : inutile de les refaire.
   */
  nativeControls?: boolean;

  /** { FRONTEND_URL, APP_VERSION, IS_DEV, SOURCE, PARTITION } */
  getConfig: () => Promise<Record<string, unknown>>;
  openExternal: (url: string) => Promise<unknown>;
  showNotification: (opts: unknown) => Promise<unknown>;
  /** Pastille de non-lus (macOS / Linux). */
  setBadge: (count: number) => Promise<void>;
  /** Fait clignoter la barre des tâches si la fenêtre n'a pas le focus. */
  flash: () => Promise<void>;

  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  /** Maximisation/restauration poussée par le processus principal. Renvoie la désinscription. */
  onWinState: (callback: (state: { maximized: boolean }) => void) => () => void;

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
