'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { _subscribeWallpaper } from '@/hooks/use-layout-prefs';

const STORAGE_KEY = 'alfychat_wallpaper';
const BLUR_KEY = 'alfychat_wallpaper_blur';
const OPACITY_KEY = 'alfychat_wallpaper_opacity';

export interface BackgroundState {
  wallpaper: string | null;
  blur: number;
  opacity: number;
  brightness: 'light' | 'dark' | null;
  setWallpaper: (url: string | null) => void;
  setBlur: (blur: number) => void;
  setOpacity: (opacity: number) => void;
}

// ── Module-level shared state ──────────────────────────────────────────────
let _wallpaperState: string | null = null;
let _brightnessState: 'light' | 'dark' | null = null;
let _listeners: Array<() => void> = [];

function notifyAll() {
  _listeners.forEach((fn) => fn());
}

// ── Brightness detection ───────────────────────────────────────────────────
// Samples the average luminance of the wallpaper.
// For CSS gradients we skip detection (they vary too much).

function detectBrightness(wallpaper: string): Promise<'light' | 'dark'> {
  return new Promise((resolve) => {
    // CSS gradient — too complex to sample reliably, default to dark
    if (wallpaper.startsWith('linear-gradient') || wallpaper.startsWith('radial-gradient')) {
      resolve('dark');
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        // Sample a 50×50 canvas for speed
        const SIZE = 50;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
        let luminanceSum = 0;
        const pixels = SIZE * SIZE;
        for (let i = 0; i < data.length; i += 4) {
          // Perceived luminance (ITU-R BT.709)
          luminanceSum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        }
        resolve(luminanceSum / pixels > 128 ? 'light' : 'dark');
      } catch {
        resolve('dark');
      }
    };
    img.onerror = () => resolve('dark');
    img.src = wallpaper;
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useBackground(): BackgroundState {
  const { user, isAuthenticated } = useAuth();
  const [wallpaper, setWallpaperState] = useState<string | null>(null);
  const [brightness, setBrightnessState] = useState<'light' | 'dark' | null>(null);
  const [blur, setBlurState] = useState(20);
  const [opacity, setOpacityState] = useState(70);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from localStorage once mounted
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const storedBlur = localStorage.getItem(BLUR_KEY);
    const storedOpacity = localStorage.getItem(OPACITY_KEY);
    if (stored) {
      _wallpaperState = stored;
      setWallpaperState(stored);
    }
    if (storedBlur) setBlurState(parseInt(storedBlur, 10));
    if (storedOpacity) setOpacityState(parseInt(storedOpacity, 10));

    const listener = () => {
      setWallpaperState(_wallpaperState);
      setBrightnessState(_brightnessState);
    };
    _listeners.push(listener);
    return () => {
      _listeners = _listeners.filter((l) => l !== listener);
    };
  }, []);

  // Subscribe to wallpaper pushed from DB (via use-layout-prefs sync)
  useEffect(() => {
    const unsub = _subscribeWallpaper((url) => {
      _wallpaperState = url;
      setWallpaperState(url);
      if (url) {
        try { localStorage.setItem(STORAGE_KEY, url); } catch {}
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      notifyAll();
    });
    return () => { unsub(); };
  }, []);

  // Detect brightness whenever wallpaper changes
  useEffect(() => {
    if (!wallpaper) {
      _brightnessState = null;
      setBrightnessState(null);
      notifyAll();
      return;
    }
    detectBrightness(wallpaper).then((b) => {
      _brightnessState = b;
      setBrightnessState(b);
      notifyAll();
    });
  }, [wallpaper]);

  // Apply brightness as data-attribute on <html> so CSS can adapt
  useEffect(() => {
    const html = document.documentElement;
    if (brightness) {
      html.setAttribute('data-wallpaper-brightness', brightness);
    } else {
      html.removeAttribute('data-wallpaper-brightness');
    }
  }, [brightness]);

  const saveToDb = useCallback((url: string | null) => {
    if (!isAuthenticated || !user?.id) return;
    // Save CSS gradients and media URLs to DB. Skip raw data-URLs (base64) — too large.
    if (url && !url.startsWith('linear-gradient') && !url.startsWith('radial-gradient') && !url.startsWith('/api/media/') && !url.startsWith('http')) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      api.updatePreferences(user.id, { wallpaper: url }).catch(() => {});
    }, 800);
  }, [isAuthenticated, user?.id]);

  const setWallpaper = useCallback((url: string | null) => {
    _wallpaperState = url;
    if (url) {
      try { localStorage.setItem(STORAGE_KEY, url); } catch {}
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setWallpaperState(url);
    notifyAll();
    saveToDb(url);
  }, [saveToDb]);

  const setBlur = useCallback((value: number) => {
    localStorage.setItem(BLUR_KEY, String(value));
    setBlurState(value);
  }, []);

  const setOpacity = useCallback((value: number) => {
    localStorage.setItem(OPACITY_KEY, String(value));
    setOpacityState(value);
  }, []);

  return { wallpaper, blur, opacity, brightness, setWallpaper, setBlur, setOpacity };
}
