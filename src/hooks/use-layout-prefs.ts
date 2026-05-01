'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

export type ServerListPosition = 'left' | 'right' | 'top' | 'bottom';

export type UIStyle = 'glass' | 'flat';

export type UIDensity = 'comfortable' | 'default' | 'compact';

export type LayoutPrefs = {
  serverListPosition: ServerListPosition;
  memberListSide: 'left' | 'right';
  compactServerList: boolean;
  uiStyle: UIStyle;
  density: UIDensity;
  msgStyle: 'bubble' | 'discord';
};

const STORAGE_KEY = 'alfychat_layout_prefs';

const DEFAULT_PREFS: LayoutPrefs = {
  serverListPosition: 'top',
  memberListSide: 'right',
  compactServerList: false,
  uiStyle: 'flat',
  density: 'default',
  msgStyle: 'discord',
};

/**
 * Density-aware size tokens.
 * Use `densityCls(prefs.density)` to get consistent spacing across the UI.
 */
export function densityCls(d: UIDensity) {
  if (d === 'compact') return {
    // server list
    serverBtn: 'size-9', serverIcon: 16,
    // channel list
    channelPx: 'px-1.5', channelPy: 'py-1', channelGap: 'gap-1.5', channelText: 'text-xs', channelIcon: 12,
    // friend / member row
    rowPx: 'px-1.5', rowPy: 'py-1', rowGap: 'gap-2', rowAvatar: 'size-7', rowName: 'text-xs', rowSub: 'text-[9px]', rowBtn: 'size-6',
    // messages
    msgPx: 'px-2', msgPy: 'py-0.5', msgPt: 'pt-0.5', msgGap: 'gap-2', msgAvatar: 'size-7', msgName: 'text-xs', msgTime: 'text-[9px]',
    // user panel
    panelH: 'h-10', panelAvatar: 'size-6', panelName: 'text-[11px]', panelSub: 'text-[9px]',
    // header
    headerH: 'h-10',
  };
  if (d === 'comfortable') return {
    serverBtn: 'size-14', serverIcon: 24,
    channelPx: 'px-3', channelPy: 'py-2.5', channelGap: 'gap-3', channelText: 'text-sm', channelIcon: 16,
    rowPx: 'px-3', rowPy: 'py-2.5', rowGap: 'gap-3', rowAvatar: 'size-10', rowName: 'text-sm', rowSub: 'text-[11px]', rowBtn: 'size-8',
    msgPx: 'px-4', msgPy: 'py-2.5', msgPt: 'pt-2.5', msgGap: 'gap-3.5', msgAvatar: 'size-10', msgName: 'text-sm', msgTime: 'text-[12px]',
    panelH: 'h-14', panelAvatar: 'size-9', panelName: 'text-[13px]', panelSub: 'text-[11px]',
    headerH: 'h-14',
  };
  // default
  return {
    serverBtn: 'size-12', serverIcon: 22,
    channelPx: 'px-2', channelPy: 'py-1.5', channelGap: 'gap-2', channelText: 'text-[13px]', channelIcon: 14,
    rowPx: 'px-2', rowPy: 'py-1.5', rowGap: 'gap-2.5', rowAvatar: 'size-9', rowName: 'text-[13px]', rowSub: 'text-[10px]', rowBtn: 'size-7',
    msgPx: 'px-3', msgPy: 'py-1.5', msgPt: 'pt-1.5', msgGap: 'gap-2.5', msgAvatar: 'size-8', msgName: 'text-[13px]', msgTime: 'text-[10px]',
    panelH: 'h-[52px]', panelAvatar: 'size-8', panelName: 'text-[12px]', panelSub: 'text-[10px]',
    headerH: 'h-12',
  };
}

function loadFromStorage(): LayoutPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate old sidebarSide → serverListPosition
      if (parsed.sidebarSide && !parsed.serverListPosition) {
        parsed.serverListPosition = parsed.sidebarSide;
        delete parsed.sidebarSide;
      }
      return { ...DEFAULT_PREFS, ...parsed };
    }
  } catch {}
  return DEFAULT_PREFS;
}

// ── Module-level shared store ──────────────────────────────────────────────
// All hook instances share the same state. Updating via one instance
// immediately re-renders all others — no page reload needed.

let _prefs: LayoutPrefs = DEFAULT_PREFS;
const _listeners = new Set<() => void>();

function _notify() {
  _listeners.forEach(fn => fn());
}

// ── DB save listeners (called by useLayoutPrefsSync) ──────────────────────
const _dbSaveListeners = new Set<(prefs: LayoutPrefs) => void>();

// ── Hook ──────────────────────────────────────────────────────────────────

export function useLayoutPrefs() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    // Load from localStorage on first client render
    const loaded = loadFromStorage();
    _prefs = loaded;
    _notify();

    // Subscribe so this component re-renders whenever any instance updates
    const handler = () => forceUpdate(n => n + 1);
    _listeners.add(handler);
    return () => { _listeners.delete(handler); };
  }, []);

  const updatePrefs = useCallback((updates: Partial<LayoutPrefs>) => {
    _prefs = { ..._prefs, ...updates };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_prefs)); } catch {}
    _notify();
    // notify DB save listeners
    _dbSaveListeners.forEach(fn => fn(_prefs));
  }, []);

  return { prefs: _prefs, updatePrefs };
}

// ── DB sync hook — mount once in the root layout ───────────────────────────
// Loads layout_prefs from the DB on login, saves back (debounced) on change.

export function useLayoutPrefsSync() {
  const { user, isAuthenticated } = useAuth();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  // Load from DB once the user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?.id || initializedRef.current) return;
    initializedRef.current = true;

    api.getPreferences(user.id).then((result: any) => {
      if (result?.data?.layoutPrefs) {
        const dbPrefs: Partial<LayoutPrefs> = result.data.layoutPrefs;
        // DB wins over localStorage — merge and persist locally
        _prefs = { ...DEFAULT_PREFS, ...dbPrefs };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_prefs)); } catch {}
        _notify();
      }
      // Also restore wallpaper if one is stored
      if (result?.data?.wallpaper) {
        _notifyWallpaper(result.data.wallpaper);
      }
    }).catch(() => { /* ignore — fall back to localStorage */ });
  }, [isAuthenticated, user?.id]);

  // Subscribe to prefs changes and debounce-save to DB
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const saveToDb = (prefs: LayoutPrefs) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        api.updatePreferences(user.id, { layoutPrefs: prefs }).catch(() => {});
      }, 800);
    };

    _dbSaveListeners.add(saveToDb);
    return () => {
      _dbSaveListeners.delete(saveToDb);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [isAuthenticated, user?.id]);
}

// ── Wallpaper DB sync helpers ─────────────────────────────────────────────
// Used by use-background.ts to persist wallpaper to DB.

const _wallpaperListeners = new Set<(url: string | null) => void>();

export function _notifyWallpaper(url: string | null) {
  _wallpaperListeners.forEach(fn => fn(url));
}

export function _subscribeWallpaper(fn: (url: string | null) => void) {
  _wallpaperListeners.add(fn);
  return () => _wallpaperListeners.delete(fn);
}
