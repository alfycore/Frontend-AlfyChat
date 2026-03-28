'use client';

import { useState, useEffect, useCallback } from 'react';

export type LayoutPrefs = {
  sidebarSide: 'left' | 'right';
  memberListSide: 'left' | 'right';
  compactServerList: boolean;
};

const STORAGE_KEY = 'alfychat_layout_prefs';

const DEFAULT_PREFS: LayoutPrefs = {
  sidebarSide: 'left',
  memberListSide: 'right',
  compactServerList: false,
};

export function useLayoutPrefs() {
  const [prefs, setPrefs] = useState<LayoutPrefs>(DEFAULT_PREFS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const updatePrefs = useCallback((updates: Partial<LayoutPrefs>) => {
    setPrefs(prev => {
      const next = { ...prev, ...updates };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return { prefs, updatePrefs, mounted };
}

export function getLayoutPrefs(): LayoutPrefs {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_PREFS;
}
