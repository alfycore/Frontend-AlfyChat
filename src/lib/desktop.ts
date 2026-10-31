/**
 * desktop.ts
 * Pont vers l'enveloppe Electron (`desktop/preload.js`).
 *
 * La fenêtre desktop charge le site directement, sans barre système : le
 * bandeau est `AppTitleBar`, les boutons de fenêtre sont ceux de l'OS posés
 * par-dessus. `DesktopIntegration` (layout racine) synchronise leurs couleurs
 * avec le thème et rend la fenêtre déplaçable sur les pages sans bandeau.
 *
 * Dans un navigateur, `window.electronAPI` n'existe pas : `desktopBridge()`
 * renvoie `null`.
 *
 * Le site est servi à distance : une version récente du frontend peut tourner
 * dans une enveloppe plus ancienne. Les méthodes ajoutées après coup sont donc
 * optionnelles, et s'appellent avec `?.`.
 */

export interface DesktopNotification {
  title: string;
  body?: string;
  /** Pas de son système : le frontend joue déjà le sien. */
  silent?: boolean;
  /** Reste affichée jusqu'à une action (mentions). */
  urgent?: boolean;
}

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
  /** Notification native : un clic ramène la fenêtre au premier plan. */
  showNotification: (opts: DesktopNotification) => Promise<unknown>;
  /** Pastille de non-lus : nombre (macOS / Linux), point rouge (Windows). */
  setBadge: (count: number) => Promise<void>;
  /** Fait clignoter la barre des tâches si la fenêtre n'a pas le focus. */
  flash: () => Promise<void>;
  /** Fond et symboles des boutons de fenêtre natifs, en `#rrggbb`. */
  setTitleBarColors?: (colors: { color: string; symbolColor: string }) => Promise<void>;

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
