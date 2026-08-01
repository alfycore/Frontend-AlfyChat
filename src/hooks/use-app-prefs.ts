'use client';

/**
 * Préférences applicatives — thème, messages, boîte de discussion, recherche
 * et accessibilité.
 *
 * Même mécanique que `use-layout-prefs` : un store module partagé, persisté en
 * localStorage, synchronisé avec la base (colonne `app_prefs`) et diffusé aux
 * autres appareils via l'événement WS `PREFERENCES_UPDATE`.
 *
 * Les préférences visuelles sont projetées sur <html> (attributs `data-*` et
 * variables CSS) : globals.css fait le reste, sans re-render de l'app.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';

/** Profondeur du thème sombre — se compose avec la palette de couleur. */
export type ThemePreset = 'light' | 'dark' | 'deep' | 'oled' | 'system';
/** Quand dévoiler le contenu masqué par `||spoiler||`. */
export type SpoilerMode = 'always' | 'moderated' | 'click';
/** Thème appliqué en entrant sur un serveur. */
export type ServerThemeMode = 'server' | 'user';
/** Densité des messages (Discord : Confortable / Compact). */
export type MessageDisplay = 'cozy' | 'compact';
/** Portée par défaut de la recherche dans les messages privés. */
export type DmSearchScope = 'selected' | 'all';

export type AppPrefs = {
  /* ── Thème ─────────────────────────────────────────────────────────── */
  themePreset: ThemePreset;
  syncThemeAcrossDevices: boolean;
  applyThemeToProfiles: boolean;
  serverThemeMode: ServerThemeMode;
  appIcon: string;

  /* ── Messages ──────────────────────────────────────────────────────── */
  showLinkedMedia: boolean;
  showUploadedMedia: boolean;
  showEmbeds: boolean;
  showReactions: boolean;
  spoilerMode: SpoilerMode;
  threadsSplitView: boolean;
  showAvatars: boolean;

  /* ── Boîte de discussion ───────────────────────────────────────────── */
  previewSyntax: boolean;
  emoticonToEmoji: boolean;
  stickerSuggestions: boolean;
  commandSuggestions: boolean;
  showSendButton: boolean;

  /* ── Recherche ─────────────────────────────────────────────────────── */
  dmSearchScope: DmSearchScope;

  /* ── Accessibilité ─────────────────────────────────────────────────── */
  messageDisplay: MessageDisplay;
  saturation: number; // 0–100 (100 = couleurs d'origine)
  highContrast: boolean;
  reducedMotion: boolean;
  fontScale: number; // 85–130 (%)
};

const STORAGE_KEY = 'alfychat_app_prefs';

export const DEFAULT_APP_PREFS: AppPrefs = {
  themePreset: 'dark',
  syncThemeAcrossDevices: true,
  applyThemeToProfiles: false,
  serverThemeMode: 'server',
  appIcon: 'default',

  showLinkedMedia: true,
  showUploadedMedia: true,
  showEmbeds: true,
  showReactions: true,
  spoilerMode: 'click',
  threadsSplitView: true,
  showAvatars: true,

  previewSyntax: true,
  emoticonToEmoji: true,
  stickerSuggestions: true,
  commandSuggestions: true,
  showSendButton: false,

  dmSearchScope: 'selected',

  messageDisplay: 'cozy',
  saturation: 100,
  highContrast: false,
  reducedMotion: false,
  fontScale: 100,
};

/* ══════════════════════════════════════════════════════════════════════
 * Icônes de l'application — générées en SVG (aucun asset binaire à gérer,
 * utilisable à la fois dans la grille des réglages et comme favicon).
 * ══════════════════════════════════════════════════════════════════════ */

export interface AppIconMeta {
  id: string;
  nom: string;
  from: string;
  to: string;
  /** Couleur du glyphe. */
  glyph: string;
  /** Bordure interne — donne le côté « édition limitée ». */
  ring?: string;
}

export const APP_ICONS: AppIconMeta[] = [
  { id: 'default', nom: 'Alfy', from: '#7c5cff', to: '#4f2fd6', glyph: '#ffffff' },
  { id: 'nocturne', nom: 'Nocturne', from: '#101014', to: '#000000', glyph: '#a78bfa', ring: '#a78bfa' },
  { id: 'ivoire', nom: 'Ivoire', from: '#f7f5ef', to: '#ddd8c8', glyph: '#2a2620' },
  { id: 'ardoise', nom: 'Ardoise', from: '#4b5563', to: '#1f2937', glyph: '#e5e7eb' },
  { id: 'menthe', nom: 'Menthe', from: '#34d399', to: '#0f766e', glyph: '#04201a' },
  { id: 'braise', nom: 'Braise', from: '#fb923c', to: '#c2410c', glyph: '#2b1102' },
  { id: 'corail', nom: 'Corail', from: '#fb7185', to: '#be123c', glyph: '#ffffff' },
  { id: 'abysse', nom: 'Abysse', from: '#38bdf8', to: '#1d4ed8', glyph: '#04182f' },
  { id: 'or', nom: 'Or', from: '#fde68a', to: '#b45309', glyph: '#2b1a02', ring: '#fde68a' },
  { id: 'neon', nom: 'Néon', from: '#f0abfc', to: '#22d3ee', glyph: '#10061a', ring: '#f0abfc' },
  { id: 'terminal', nom: 'Terminal', from: '#0b0f0b', to: '#04180a', glyph: '#4ade80', ring: '#4ade80' },
  { id: 'vapeur', nom: 'Vapeur', from: '#c084fc', to: '#f472b6', glyph: '#1b0730' },
];

/** SVG de l'icône, encodé en data-URI (grille des réglages + favicon). */
export function appIconDataUri(id: string): string {
  const icon = APP_ICONS.find((i) => i.id === id) ?? APP_ICONS[0];
  const ring = icon.ring
    ? `<rect x="7" y="7" width="114" height="114" rx="30" fill="none" stroke="${icon.ring}" stroke-opacity=".55" stroke-width="3"/>`
    : '';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${icon.from}"/><stop offset="1" stop-color="${icon.to}"/>` +
    `</linearGradient></defs>` +
    `<rect width="128" height="128" rx="34" fill="url(#g)"/>` +
    ring +
    `<path d="M64 30 90 96H77.5L64 60 50.5 96H38Z" fill="${icon.glyph}"/>` +
    `<rect x="50" y="76" width="28" height="10" rx="5" fill="${icon.glyph}" fill-opacity=".85"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/* ══════════════════════════════════════════════════════════════════════
 * Projection sur le DOM
 * ══════════════════════════════════════════════════════════════════════ */

function applyToDom(prefs: AppPrefs): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  /* Profondeur du fond — se compose avec data-palette (couleur). */
  if (prefs.themePreset === 'deep' || prefs.themePreset === 'oled') {
    root.setAttribute('data-depth', prefs.themePreset);
  } else {
    root.removeAttribute('data-depth');
  }

  /* Accessibilité */
  root.style.setProperty('--a11y-saturation', String(prefs.saturation / 100));
  // Le filtre CSS n'est armé qu'en cas d'écart réel (voir globals.css).
  if (prefs.saturation === 100) root.removeAttribute('data-saturation');
  else root.setAttribute('data-saturation', 'on');
  root.style.setProperty('--font-scale', String(prefs.fontScale / 100));
  if (prefs.highContrast) root.setAttribute('data-contrast', 'high');
  else root.removeAttribute('data-contrast');
  if (prefs.reducedMotion) root.setAttribute('data-motion', 'reduced');
  else root.removeAttribute('data-motion');

  /* Densité des messages */
  root.setAttribute('data-msg-display', prefs.messageDisplay);

  /* Icône de l'application → favicon */
  applyFavicon(prefs.appIcon);
}

function applyFavicon(iconId: string): void {
  if (typeof document === 'undefined') return;
  const href = appIconDataUri(iconId);
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-app-icon]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.setAttribute('data-app-icon', '');
    document.head.appendChild(link);
  }
  link.href = href;
}

/* ══════════════════════════════════════════════════════════════════════
 * Store partagé
 * ══════════════════════════════════════════════════════════════════════ */

let _prefs: AppPrefs = DEFAULT_APP_PREFS;
const _listeners = new Set<() => void>();
const _dbSaveListeners = new Set<(prefs: AppPrefs) => void>();
let _loaded = false;

function loadFromStorage(): AppPrefs {
  if (typeof window === 'undefined') return DEFAULT_APP_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_APP_PREFS, ...(JSON.parse(raw) as Partial<AppPrefs>) };
  } catch {}
  return DEFAULT_APP_PREFS;
}

function notify(): void {
  applyToDom(_prefs);
  _listeners.forEach((fn) => fn());
}

/** Lecture hors composant (helpers non-React). */
export function getAppPrefs(): AppPrefs {
  return _prefs;
}

export function useAppPrefs() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!_loaded) {
      _prefs = loadFromStorage();
      _loaded = true;
    }
    applyToDom(_prefs);

    const handler = () => forceUpdate((n) => n + 1);
    _listeners.add(handler);
    handler(); // aligne le premier rendu client sur le localStorage
    return () => {
      _listeners.delete(handler);
    };
  }, []);

  const updatePrefs = useCallback((updates: Partial<AppPrefs>) => {
    _prefs = { ..._prefs, ...updates };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_prefs));
    } catch {}
    notify();
    _dbSaveListeners.forEach((fn) => fn(_prefs));
  }, []);

  const resetPrefs = useCallback(() => {
    _prefs = { ...DEFAULT_APP_PREFS };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_prefs));
    } catch {}
    notify();
    _dbSaveListeners.forEach((fn) => fn(_prefs));
  }, []);

  /* Synchronisation entre onglets du même navigateur. */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        _prefs = { ...DEFAULT_APP_PREFS, ...(JSON.parse(e.newValue) as Partial<AppPrefs>) };
        notify();
      } catch {}
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { prefs: _prefs, updatePrefs, resetPrefs };
}

/* ══════════════════════════════════════════════════════════════════════
 * Synchronisation base + multi-appareils — à monter une seule fois
 * ══════════════════════════════════════════════════════════════════════ */

/** Sous-ensemble « thème » : seul concerné par `syncThemeAcrossDevices`. */
const THEME_KEYS: (keyof AppPrefs)[] = [
  'themePreset',
  'applyThemeToProfiles',
  'serverThemeMode',
  'appIcon',
];

export function useAppPrefsSync() {
  const { user, isAuthenticated } = useAuth();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  /* Chargement depuis la base à la connexion — la base gagne sur le local. */
  useEffect(() => {
    if (!isAuthenticated || !user?.id || initialized.current) return;
    initialized.current = true;

    api
      .getPreferences(user.id)
      .then((result: unknown) => {
        const remote = (result as { data?: { appPrefs?: Partial<AppPrefs> } })?.data?.appPrefs;
        if (!remote) return;
        _prefs = { ...DEFAULT_APP_PREFS, ..._prefs, ...remote };
        _loaded = true;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(_prefs));
        } catch {}
        notify();
      })
      .catch(() => {
        /* hors ligne : on reste sur le localStorage */
      });
  }, [isAuthenticated, user?.id]);

  /* Sauvegarde différée + diffusion aux autres appareils. */
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const save = (prefs: AppPrefs) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        api.updatePreferences(user.id, { appPrefs: prefs }).catch(() => {});
        // Les réglages de thème ne quittent l'appareil que si l'utilisateur
        // a laissé la synchronisation active.
        const payload = prefs.syncThemeAcrossDevices
          ? prefs
          : (Object.fromEntries(
              Object.entries(prefs).filter(([k]) => !THEME_KEYS.includes(k as keyof AppPrefs)),
            ) as Partial<AppPrefs>);
        socketService.emit('PREFERENCES_UPDATE', { type: 'appPrefs', appPrefs: payload });
      }, 800);
    };

    const onRemote = (data: unknown) => {
      const d = data as { type?: string; appPrefs?: Partial<AppPrefs> };
      if (d?.type !== 'appPrefs' || !d.appPrefs) return;
      const incoming = { ...d.appPrefs };
      if (!_prefs.syncThemeAcrossDevices) {
        for (const k of THEME_KEYS) delete incoming[k];
      }
      _prefs = { ...DEFAULT_APP_PREFS, ..._prefs, ...incoming };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(_prefs));
      } catch {}
      notify();
    };

    socketService.on('PREFERENCES_UPDATE', onRemote);
    _dbSaveListeners.add(save);
    return () => {
      socketService.off('PREFERENCES_UPDATE', onRemote);
      _dbSaveListeners.delete(save);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [isAuthenticated, user?.id]);
}
