'use client';

import { useState, useEffect, useCallback } from 'react';

export type ServerListPosition = 'left' | 'right' | 'top' | 'bottom';

export type LayoutPrefs = {
  serverListPosition: ServerListPosition;
  memberListSide: 'left' | 'right';
  compactServerList: boolean;
};

const STORAGE_KEY = 'alfychat_layout_prefs';

const DEFAULT_PREFS: LayoutPrefs = {
  serverListPosition: 'left',
  memberListSide: 'right',
  compactServerList: false,
};

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
    _notify(); // instantly re-renders every component using this hook
  }, []);

  return { prefs: _prefs, updatePrefs };
}
