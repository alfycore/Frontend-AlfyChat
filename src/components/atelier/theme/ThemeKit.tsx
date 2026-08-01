'use client';

/**
 * Atelier ThemeKit — provider du système de thème 3 axes.
 *
 *   Mode    (clair/sombre/auto) → next-themes, inchangé
 *   Palette (data-palette)      → blocs CSS de globals.css
 *   Accent  (data-accent)       → blocs CSS, ou inline si custom
 *
 * Le premier paint est géré par <ThemeScript /> (inséré dans <head>) ;
 * ce provider synchronise ensuite l'état React et applique les
 * changements demandés par l'UI des réglages.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTheme } from 'next-themes';

import {
  ACCENT_IDS,
  PALETTE_IDS,
  type AccentId,
  type PaletteId,
} from './palettes';
import {
  ACCENT_VARS,
  DEFAULT_CUSTOM,
  applyCustomVars,
  clearCustomVars,
  hexToOklch,
  readableForeground,
  type CustomVars,
  type ThemeMode,
} from './custom';

export const THEMEKIT_STORAGE_KEY = 'alfychat.themekit.v1';
const LEGACY_KEYS = ['alfychat_custom_theme', 'alfychat_accent'];

export interface AccentCustom {
  hex: string;
  oklch: string;
  fg: string;
}

export interface ThemeKitState {
  palette: PaletteId;
  accent: AccentId;
  accentCustom: AccentCustom | null;
  custom: { light: CustomVars; dark: CustomVars } | null;
}

const DEFAULT_STATE: ThemeKitState = {
  palette: 'alfy',
  accent: 'auto',
  accentCustom: null,
  custom: null,
};

interface ThemeKitContextType {
  state: ThemeKitState;
  /** Mode résolu (auto → light/dark réel). */
  resolvedMode: ThemeMode;
  setPalette: (palette: PaletteId) => void;
  setAccent: (accent: Exclude<AccentId, 'custom'>) => void;
  setAccentCustomHex: (hex: string) => void;
  setCustomVar: (mode: ThemeMode, cssVar: string, oklchValue: string) => void;
  importCustom: (custom: { light: CustomVars; dark: CustomVars }) => void;
  resetCustom: () => void;
  resetAll: () => void;
}

const ThemeKitContext = createContext<ThemeKitContextType | null>(null);

function loadState(): ThemeKitState {
  try {
    const raw = localStorage.getItem(THEMEKIT_STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<ThemeKitState>;
    const palette =
      parsed.palette === 'custom' ||
      (PALETTE_IDS as string[]).includes(parsed.palette ?? '')
        ? (parsed.palette as PaletteId)
        : 'alfy';
    const accent =
      parsed.accent === 'auto' ||
      parsed.accent === 'custom' ||
      (ACCENT_IDS as string[]).includes(parsed.accent ?? '')
        ? (parsed.accent as AccentId)
        : 'auto';
    return {
      palette,
      accent,
      accentCustom: parsed.accentCustom ?? null,
      custom: parsed.custom ?? null,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function persistState(state: ThemeKitState): void {
  try {
    localStorage.setItem(THEMEKIT_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function applyState(state: ThemeKitState, mode: ThemeMode): void {
  const root = document.documentElement;

  if (state.palette === 'alfy') root.removeAttribute('data-palette');
  else root.setAttribute('data-palette', state.palette);

  // 'custom' pose quand même l'attribut : aucun bloc CSS ne lui correspond
  // (la couleur vient du style inline), mais il sert de garde pour que les
  // thèmes scopés — [data-ui="alfy"] — cessent d'écraser l'accent.
  if (state.accent === 'auto') {
    root.removeAttribute('data-accent');
  } else {
    root.setAttribute('data-accent', state.accent);
  }

  clearCustomVars(root);

  if (state.palette === 'custom' && state.custom) {
    applyCustomVars(root, state.custom[mode] ?? {});
  }

  if (state.accent === 'custom' && state.accentCustom) {
    root.style.setProperty('--accent', state.accentCustom.oklch);
    root.style.setProperty('--accent-foreground', state.accentCustom.fg);
    root.style.setProperty('--focus', state.accentCustom.oklch);
  } else if (state.palette !== 'custom') {
    // clearCustomVars a retiré un éventuel accent inline résiduel — rien à faire.
    for (const v of ACCENT_VARS) root.style.removeProperty(v);
  }
}

export function ThemeKit({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThemeKitState>(DEFAULT_STATE);
  const hydrated = useRef(false);
  const { resolvedTheme } = useTheme();
  const resolvedMode: ThemeMode = resolvedTheme === 'light' ? 'light' : 'dark';

  /* Hydratation : reprend l'état posé par ThemeScript + purge héritage. */
  useEffect(() => {
    setState(loadState());
    for (const key of LEGACY_KEYS) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
    hydrated.current = true;
  }, []);

  /* Applique + persiste à chaque changement (idempotent après ThemeScript). */
  useEffect(() => {
    if (!hydrated.current) return;
    applyState(state, resolvedMode);
    persistState(state);
  }, [state, resolvedMode]);

  const setPalette = useCallback((palette: PaletteId) => {
    setState((s) => ({
      ...s,
      palette,
      custom:
        palette === 'custom' && !s.custom
          ? { light: { ...DEFAULT_CUSTOM.light }, dark: { ...DEFAULT_CUSTOM.dark } }
          : s.custom,
    }));
  }, []);

  const setAccent = useCallback((accent: Exclude<AccentId, 'custom'>) => {
    setState((s) => ({ ...s, accent }));
  }, []);

  const setAccentCustomHex = useCallback((hex: string) => {
    const oklch = hexToOklch(hex);
    setState((s) => ({
      ...s,
      accent: 'custom',
      accentCustom: { hex, oklch, fg: readableForeground(oklch) },
    }));
  }, []);

  const setCustomVar = useCallback(
    (mode: ThemeMode, cssVar: string, oklchValue: string) => {
      setState((s) => {
        const base = s.custom ?? {
          light: { ...DEFAULT_CUSTOM.light },
          dark: { ...DEFAULT_CUSTOM.dark },
        };
        return {
          ...s,
          palette: 'custom',
          custom: {
            ...base,
            [mode]: { ...base[mode], [cssVar]: oklchValue },
          },
        };
      });
    },
    [],
  );

  const importCustom = useCallback(
    (custom: { light: CustomVars; dark: CustomVars }) => {
      setState((s) => ({ ...s, palette: 'custom', custom }));
    },
    [],
  );

  const resetCustom = useCallback(() => {
    setState((s) => ({
      ...s,
      custom: { light: { ...DEFAULT_CUSTOM.light }, dark: { ...DEFAULT_CUSTOM.dark } },
    }));
  }, []);

  const resetAll = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  return (
    <ThemeKitContext.Provider
      value={{
        state,
        resolvedMode,
        setPalette,
        setAccent,
        setAccentCustomHex,
        setCustomVar,
        importCustom,
        resetCustom,
        resetAll,
      }}
    >
      {children}
    </ThemeKitContext.Provider>
  );
}

export function useThemeKit(): ThemeKitContextType {
  const ctx = useContext(ThemeKitContext);
  if (!ctx) throw new Error('useThemeKit doit être utilisé sous <ThemeKit>');
  return ctx;
}
