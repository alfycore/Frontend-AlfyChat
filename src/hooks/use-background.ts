'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'alfychat_wallpaper';
const BLUR_KEY = 'alfychat_wallpaper_blur';
const OPACITY_KEY = 'alfychat_wallpaper_opacity';

export interface BackgroundState {
  wallpaper: string | null;
  blur: number;
  opacity: number;
  setWallpaper: (url: string | null) => void;
  setBlur: (blur: number) => void;
  setOpacity: (opacity: number) => void;
}

// Simple cross-instance event bus
let _listeners: Array<() => void> = [];

function notifyAll() {
  _listeners.forEach((fn) => fn());
}

export function useBackground(): BackgroundState {
  const [wallpaper, setWallpaperState] = useState<string | null>(null);
  const [blur, setBlurState] = useState(20);
  const [opacity, setOpacityState] = useState(70);

  // Hydrate from localStorage once mounted
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const storedBlur = localStorage.getItem(BLUR_KEY);
    const storedOpacity = localStorage.getItem(OPACITY_KEY);
    if (stored) setWallpaperState(stored);
    if (storedBlur) setBlurState(parseInt(storedBlur, 10));
    if (storedOpacity) setOpacityState(parseInt(storedOpacity, 10));

    // Subscribe to changes from other instances
    const listener = () => {
      const s = localStorage.getItem(STORAGE_KEY);
      setWallpaperState(s || null);
    };
    _listeners.push(listener);
    return () => {
      _listeners = _listeners.filter((l) => l !== listener);
    };
  }, []);

  // Apply to body
  useEffect(() => {
    const root = document.documentElement;
    if (wallpaper) {
      document.body.style.backgroundImage = `url(${wallpaper})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundRepeat = 'no-repeat';
      document.body.style.backgroundAttachment = 'fixed';
      document.body.setAttribute('data-wallpaper', 'true');
      root.style.setProperty('--glass-blur', `${blur}px`);
      root.style.setProperty('--glass-opacity', String(opacity / 100));
    } else {
      document.body.style.backgroundImage = '';
      document.body.removeAttribute('data-wallpaper');
      root.style.removeProperty('--glass-blur');
      root.style.removeProperty('--glass-opacity');
    }
  }, [wallpaper, blur, opacity]);

  const setWallpaper = useCallback((url: string | null) => {
    if (url) {
      localStorage.setItem(STORAGE_KEY, url);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setWallpaperState(url);
    notifyAll();
  }, []);

  const setBlur = useCallback((value: number) => {
    localStorage.setItem(BLUR_KEY, String(value));
    setBlurState(value);
  }, []);

  const setOpacity = useCallback((value: number) => {
    localStorage.setItem(OPACITY_KEY, String(value));
    setOpacityState(value);
  }, []);

  return { wallpaper, blur, opacity, setWallpaper, setBlur, setOpacity };
}
