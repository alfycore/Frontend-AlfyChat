'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useBackground } from '@/hooks/use-background';
import { useLayoutPrefs } from '@/hooks/use-layout-prefs';

/**
 * Applies wallpaper side-effects to <body> and auto-switches the color
 * scheme (light/dark) based on wallpaper brightness when in glass mode.
 */
export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const { brightness } = useBackground();
  const { prefs } = useLayoutPrefs();
  const { setTheme } = useTheme();

  // Auto-switch theme to match wallpaper brightness in glass mode
  useEffect(() => {
    if (prefs.uiStyle !== 'glass' || brightness === null) return;
    setTheme(brightness === 'light' ? 'light' : 'dark');
  }, [brightness, prefs.uiStyle, setTheme]);

  return <>{children}</>;
}
