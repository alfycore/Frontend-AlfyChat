'use client';

/**
 * Point de montage unique des synchronisations de préférences.
 *
 * Monté une seule fois dans le layout racine : charge les préférences depuis
 * la base à la connexion, les renvoie (débouncé) à chaque changement et
 * applique le mode clair/sombre déduit du thème choisi.
 */

import { useTheme } from 'next-themes';
import { useEffect, useRef } from 'react';

import { useAppPrefs, useAppPrefsSync, type ThemePreset } from '@/hooks/use-app-prefs';
import { useLayoutPrefsSync } from '@/hooks/use-layout-prefs';

/** Mode next-themes correspondant à un preset de thème. */
function modeOf(preset: ThemePreset): 'light' | 'dark' | 'system' {
  if (preset === 'light') return 'light';
  if (preset === 'system') return 'system';
  return 'dark'; // dark, deep, oled
}

export function PrefsSync() {
  useLayoutPrefsSync();
  useAppPrefsSync();

  const { prefs, updatePrefs } = useAppPrefs();
  const { theme, setTheme } = useTheme();
  const lastPreset = useRef<ThemePreset | null>(null);

  useEffect(() => {
    if (!theme) return; // next-themes pas encore hydraté

    /* Premier passage : on ne force rien. Si un autre sélecteur de thème a
     * laissé l'app dans un mode différent, c'est le preset qui s'y aligne. */
    if (lastPreset.current === null) {
      lastPreset.current = prefs.themePreset;
      const current: 'light' | 'dark' | 'system' =
        theme === 'light' ? 'light' : theme === 'system' ? 'system' : 'dark';
      if (current !== modeOf(prefs.themePreset)) {
        updatePrefs({ themePreset: current });
        lastPreset.current = current;
      }
      return;
    }

    /* Ensuite, un changement de preset (réglages, base, autre appareil)
     * pilote le mode. */
    if (lastPreset.current !== prefs.themePreset) {
      lastPreset.current = prefs.themePreset;
      const wanted = modeOf(prefs.themePreset);
      if (theme !== wanted) setTheme(wanted);
    }
  }, [theme, prefs.themePreset, setTheme, updatePrefs]);

  return null;
}
