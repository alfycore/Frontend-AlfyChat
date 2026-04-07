'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { Toast } from '@heroui/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

/* ════════════════════════════════════════════════════════════════════════════
 *  Accent colour system
 * ══════════════════════════════════════════════════════════════════════════ */

export type AccentColor = 'violet' | 'blue' | 'green' | 'red' | 'orange' | 'rose';

const ACCENT_KEY = 'alfychat_accent';
const DEFAULT_ACCENT: AccentColor = 'violet';
const ACCENT_CLASSES: AccentColor[] = ['violet', 'blue', 'green', 'red', 'orange', 'rose'];

interface AccentContextType {
  accent: AccentColor;
  setAccent: (color: AccentColor) => void;
}

const AccentContext = createContext<AccentContextType>({
  accent: DEFAULT_ACCENT,
  setAccent: () => {},
});

function AccentProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<AccentColor>(DEFAULT_ACCENT);

  useEffect(() => {
    const saved = (typeof window !== 'undefined' &&
      localStorage.getItem(ACCENT_KEY)) as AccentColor | null;
    if (saved && ACCENT_CLASSES.includes(saved)) {
      applyAccent(saved);
      setAccentState(saved);
    } else {
      applyAccent(DEFAULT_ACCENT);
    }
  }, []);

  const setAccent = useCallback((color: AccentColor) => {
    localStorage.setItem(ACCENT_KEY, color);
    applyAccent(color);
    setAccentState(color);
  }, []);

  return (
    <AccentContext.Provider value={{ accent, setAccent }}>
      {children}
    </AccentContext.Provider>
  );
}

function applyAccent(color: AccentColor) {
  const html = document.documentElement;
  ACCENT_CLASSES.forEach((c) => html.classList.remove(`accent-${c}`));
  html.classList.add(`accent-${color}`);
}

export function useAccent() {
  return useContext(AccentContext);
}

/* ════════════════════════════════════════════════════════════════════════════
 *  Custom theme system — full HeroUI v3 variable coverage
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * Every colour slot that maps 1-to-1 onto a HeroUI CSS custom property.
 * The keys are intentionally camelCase for JS; `applyCustomTheme` maps
 * them to the correct `--kebab-case` variables.
 */
export interface CustomThemeColors {
  /* Page */
  background: string;
  foreground: string;
  /* Surface (cards, accordions) */
  surface: string;
  surfaceForeground: string;
  surfaceSecondary: string;
  surfaceSecondaryForeground: string;
  surfaceTertiary: string;
  surfaceTertiaryForeground: string;
  /* Overlay (modals, popovers, tooltips) */
  overlay: string;
  overlayForeground: string;
  /* Brand / accent */
  accent: string;
  accentForeground: string;
  /* Default neutral (chips, tags) */
  default: string;
  defaultForeground: string;
  /* Muted text colour */
  muted: string;
  /* Status */
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  danger: string;
  dangerForeground: string;
  /* Segment (e.g. segmented controls) */
  segment: string;
  segmentForeground: string;
  /* Form fields */
  fieldBackground: string;
  fieldForeground: string;
  fieldPlaceholder: string;
  fieldBorder: string;
  /* Borders & dividers */
  border: string;
  separator: string;
  /* Focus ring */
  focus: string;
  /* Scrollbar */
  scrollbar: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  emoji: string;
  colors: CustomThemeColors;
}

/* ── Helper: build a complete dark palette from a handful of key colours ── */

function buildDarkPalette(p: {
  bg: string;
  fg: string;
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  accent: string;
  accentFg: string;
  muted: string;
  border: string;
  success?: string;
  warning?: string;
  danger?: string;
}): CustomThemeColors {
  return {
    background: p.bg,
    foreground: p.fg,
    surface: p.surface,
    surfaceForeground: p.fg,
    surfaceSecondary: p.surfaceSecondary,
    surfaceSecondaryForeground: p.fg,
    surfaceTertiary: p.surfaceTertiary,
    surfaceTertiaryForeground: p.fg,
    overlay: p.surface,
    overlayForeground: p.fg,
    accent: p.accent,
    accentForeground: p.accentFg,
    default: p.surfaceSecondary,
    defaultForeground: p.fg,
    muted: p.muted,
    success: p.success ?? '#34d399',
    successForeground: '#0c0c0c',
    warning: p.warning ?? '#fbbf24',
    warningForeground: '#0c0c0c',
    danger: p.danger ?? '#f43f5e',
    dangerForeground: '#ffffff',
    segment: p.surfaceTertiary,
    segmentForeground: p.fg,
    fieldBackground: p.surface,
    fieldForeground: p.fg,
    fieldPlaceholder: p.muted,
    fieldBorder: 'transparent',
    border: p.border,
    separator: p.border,
    focus: p.accent,
    scrollbar: p.muted,
  };
}

/* ── Presets ─────────────────────────────────────────────────────────────── */

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default',
    name: 'Par défaut',
    emoji: '🖤',
    colors: buildDarkPalette({
      bg: '#09090b',
      fg: '#fafafa',
      surface: '#18181b',
      surfaceSecondary: '#1e1e22',
      surfaceTertiary: '#27272a',
      accent: '#7c3aed',
      accentFg: '#ffffff',
      muted: '#71717a',
      border: '#27272a',
    }),
  },
  {
    id: 'amoled',
    name: 'AMOLED',
    emoji: '⬛',
    colors: buildDarkPalette({
      bg: '#000000',
      fg: '#f4f4f5',
      surface: '#0a0a0a',
      surfaceSecondary: '#111111',
      surfaceTertiary: '#1a1a1a',
      accent: '#8b5cf6',
      accentFg: '#ffffff',
      muted: '#5a5a66',
      border: '#1a1a1a',
    }),
  },
  {
    id: 'midnight',
    name: 'Minuit',
    emoji: '🌌',
    colors: buildDarkPalette({
      bg: '#0b1120',
      fg: '#e2e8f0',
      surface: '#131c30',
      surfaceSecondary: '#1a2540',
      surfaceTertiary: '#223050',
      accent: '#6391f5',
      accentFg: '#ffffff',
      muted: '#64748b',
      border: '#1e2d4a',
      success: '#22d3ee',
      warning: '#f59e0b',
      danger: '#ef4444',
    }),
  },
  {
    id: 'ocean',
    name: 'Océan',
    emoji: '🌊',
    colors: buildDarkPalette({
      bg: '#061820',
      fg: '#e0f2fe',
      surface: '#0c2430',
      surfaceSecondary: '#123040',
      surfaceTertiary: '#1a3c50',
      accent: '#06b6d4',
      accentFg: '#ffffff',
      muted: '#5e99b0',
      border: '#164050',
      success: '#2dd4bf',
      warning: '#fbbf24',
      danger: '#f87171',
    }),
  },
  {
    id: 'forest',
    name: 'Forêt',
    emoji: '🌲',
    colors: buildDarkPalette({
      bg: '#071208',
      fg: '#dcfce7',
      surface: '#0e1c10',
      surfaceSecondary: '#15281a',
      surfaceTertiary: '#1e3624',
      accent: '#22c55e',
      accentFg: '#ffffff',
      muted: '#5fa878',
      border: '#1e3624',
      success: '#4ade80',
      warning: '#facc15',
      danger: '#fb7185',
    }),
  },
  {
    id: 'sunset',
    name: 'Crépuscule',
    emoji: '🌅',
    colors: buildDarkPalette({
      bg: '#140a0e',
      fg: '#fde8ef',
      surface: '#1e1018',
      surfaceSecondary: '#2a1822',
      surfaceTertiary: '#36202e',
      accent: '#f97316',
      accentFg: '#ffffff',
      muted: '#a87088',
      border: '#36202e',
      success: '#34d399',
      warning: '#fcd34d',
      danger: '#f43f5e',
    }),
  },
  {
    id: 'cherry',
    name: 'Cerise',
    emoji: '🍒',
    colors: buildDarkPalette({
      bg: '#120610',
      fg: '#fce7f3',
      surface: '#1c0c1a',
      surfaceSecondary: '#261424',
      surfaceTertiary: '#321c30',
      accent: '#ec4899',
      accentFg: '#ffffff',
      muted: '#a05580',
      border: '#321c30',
      success: '#34d399',
      warning: '#fbbf24',
      danger: '#ef4444',
    }),
  },
  {
    id: 'coffee',
    name: 'Café',
    emoji: '☕',
    colors: buildDarkPalette({
      bg: '#110e08',
      fg: '#fef3c7',
      surface: '#1c1610',
      surfaceSecondary: '#282018',
      surfaceTertiary: '#342a20',
      accent: '#d97706',
      accentFg: '#ffffff',
      muted: '#92805e',
      border: '#342a20',
      success: '#34d399',
      warning: '#fbbf24',
      danger: '#f87171',
    }),
  },
  {
    id: 'dracula',
    name: 'Dracula',
    emoji: '🧛',
    colors: buildDarkPalette({
      bg: '#282a36',
      fg: '#f8f8f2',
      surface: '#2e303e',
      surfaceSecondary: '#343646',
      surfaceTertiary: '#3c3f52',
      accent: '#bd93f9',
      accentFg: '#282a36',
      muted: '#6272a4',
      border: '#44475a',
      success: '#50fa7b',
      warning: '#f1fa8c',
      danger: '#ff5555',
    }),
  },
  {
    id: 'nord',
    name: 'Nord',
    emoji: '❄️',
    colors: buildDarkPalette({
      bg: '#2e3440',
      fg: '#eceff4',
      surface: '#353b49',
      surfaceSecondary: '#3b4252',
      surfaceTertiary: '#434c5e',
      accent: '#88c0d0',
      accentFg: '#2e3440',
      muted: '#7b88a1',
      border: '#4c566a',
      success: '#a3be8c',
      warning: '#ebcb8b',
      danger: '#bf616a',
    }),
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin',
    emoji: '🐱',
    colors: buildDarkPalette({
      bg: '#1e1e2e',
      fg: '#cdd6f4',
      surface: '#24243a',
      surfaceSecondary: '#2a2a44',
      surfaceTertiary: '#313244',
      accent: '#cba6f7',
      accentFg: '#1e1e2e',
      muted: '#6c7086',
      border: '#313244',
      success: '#a6e3a1',
      warning: '#f9e2af',
      danger: '#f38ba8',
    }),
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox',
    emoji: '🟤',
    colors: buildDarkPalette({
      bg: '#1d2021',
      fg: '#ebdbb2',
      surface: '#262626',
      surfaceSecondary: '#2e2e2e',
      surfaceTertiary: '#3c3836',
      accent: '#fe8019',
      accentFg: '#1d2021',
      muted: '#928374',
      border: '#3c3836',
      success: '#b8bb26',
      warning: '#fabd2f',
      danger: '#fb4934',
    }),
  },
];

const CUSTOM_THEME_KEY = 'alfychat_custom_theme';

/* ── Hex → oklch string converter ───────────────────────────────────────── */

function hexToOklch(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const lin = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const rl = lin(r),
    gl = lin(g),
    bl = lin(b);

  const l_ = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const m_ = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const s_ = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;

  const l1 = Math.cbrt(l_),
    m1 = Math.cbrt(m_),
    s1 = Math.cbrt(s_);

  const L = 0.2104542553 * l1 + 0.7936177850 * m1 - 0.0040720468 * s1;
  const a = 1.9779984951 * l1 - 2.4285922050 * m1 + 0.4505937099 * s1;
  const bOk = 0.0259040371 * l1 + 0.7827717662 * m1 - 0.8086757660 * s1;

  const C = Math.sqrt(a * a + bOk * bOk);
  let h = Math.atan2(bOk, a) * (180 / Math.PI);
  if (h < 0) h += 360;

  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${h.toFixed(1)})`;
}

/* Safe converter – passes through literal values like 'transparent' */
function toOklch(v: string): string {
  if (v.startsWith('#') && (v.length === 7 || v.length === 9)) {
    return hexToOklch(v.slice(0, 7));
  }
  return v;
}

/* ── Apply / remove all CSS custom-properties ───────────────────────────── */

const ALL_CSS_VARS = [
  '--background',
  '--foreground',
  '--surface',
  '--surface-foreground',
  '--surface-secondary',
  '--surface-secondary-foreground',
  '--surface-tertiary',
  '--surface-tertiary-foreground',
  '--overlay',
  '--overlay-foreground',
  '--accent',
  '--accent-foreground',
  '--focus',
  '--default',
  '--default-foreground',
  '--muted',
  '--success',
  '--success-foreground',
  '--warning',
  '--warning-foreground',
  '--danger',
  '--danger-foreground',
  '--segment',
  '--segment-foreground',
  '--field-background',
  '--field-foreground',
  '--field-placeholder',
  '--field-border',
  '--border',
  '--separator',
  '--scrollbar',
  '--surface-shadow',
  '--overlay-shadow',
  '--field-shadow',
] as const;

function applyCustomTheme(colors: CustomThemeColors | null): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!colors) {
    ALL_CSS_VARS.forEach((p) => root.style.removeProperty(p));
    return;
  }

  const set = (prop: string, val: string) =>
    root.style.setProperty(prop, toOklch(val));

  /* Page */
  set('--background', colors.background);
  set('--foreground', colors.foreground);

  /* Surfaces */
  set('--surface', colors.surface);
  set('--surface-foreground', colors.surfaceForeground);
  set('--surface-secondary', colors.surfaceSecondary);
  set('--surface-secondary-foreground', colors.surfaceSecondaryForeground);
  set('--surface-tertiary', colors.surfaceTertiary);
  set('--surface-tertiary-foreground', colors.surfaceTertiaryForeground);

  /* Overlay */
  set('--overlay', colors.overlay);
  set('--overlay-foreground', colors.overlayForeground);

  /* Brand */
  set('--accent', colors.accent);
  set('--accent-foreground', colors.accentForeground);
  set('--focus', colors.focus);

  /* Default neutral */
  set('--default', colors.default);
  set('--default-foreground', colors.defaultForeground);

  /* Muted */
  set('--muted', colors.muted);

  /* Status */
  set('--success', colors.success);
  set('--success-foreground', colors.successForeground);
  set('--warning', colors.warning);
  set('--warning-foreground', colors.warningForeground);
  set('--danger', colors.danger);
  set('--danger-foreground', colors.dangerForeground);

  /* Segment */
  set('--segment', colors.segment);
  set('--segment-foreground', colors.segmentForeground);

  /* Fields */
  set('--field-background', colors.fieldBackground);
  set('--field-foreground', colors.fieldForeground);
  set('--field-placeholder', colors.fieldPlaceholder);
  set('--field-border', colors.fieldBorder);

  /* Borders & separators */
  set('--border', colors.border);
  set('--separator', colors.separator);

  /* Scrollbar */
  set('--scrollbar', colors.scrollbar);

  /* Shadows — dark themes have minimal shadows */
  root.style.setProperty('--surface-shadow', '0 0 0 0 transparent inset');
  root.style.setProperty(
    '--overlay-shadow',
    '0 0 1px 0 rgba(255,255,255,0.3) inset',
  );
  root.style.setProperty('--field-shadow', '0 0 0 0 transparent inset');
}

/* ── Context ────────────────────────────────────────────────────────────── */

interface CustomThemeContextType {
  activePreset: string;
  customColors: CustomThemeColors;
  setPreset: (presetId: string) => void;
  setCustomColor: (key: keyof CustomThemeColors, value: string) => void;
  setCustomColors: (colors: CustomThemeColors) => void;
  resetTheme: () => void;
}

const CustomThemeContext = createContext<CustomThemeContextType>({
  activePreset: 'default',
  customColors: THEME_PRESETS[0].colors,
  setPreset: () => {},
  setCustomColor: () => {},
  setCustomColors: () => {},
  resetTheme: () => {},
});

function CustomThemeProvider({ children }: { children: ReactNode }) {
  const [activePreset, setActivePresetState] = useState('default');
  const [customColors, setCustomColorsState] = useState<CustomThemeColors>(
    THEME_PRESETS[0].colors,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(CUSTOM_THEME_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.presetId && parsed.colors) {
          setActivePresetState(parsed.presetId);
          setCustomColorsState(parsed.colors);
          if (parsed.presetId !== 'default') {
            applyCustomTheme(parsed.colors);
          }
        }
      }
    } catch {
      /* ignore corrupt data */
    }
  }, []);

  const persist = useCallback(
    (presetId: string, colors: CustomThemeColors) => {
      localStorage.setItem(
        CUSTOM_THEME_KEY,
        JSON.stringify({ presetId, colors }),
      );
    },
    [],
  );

  const setPreset = useCallback(
    (presetId: string) => {
      const preset = THEME_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        setActivePresetState(presetId);
        setCustomColorsState(preset.colors);
        if (presetId === 'default') {
          applyCustomTheme(null);
        } else {
          applyCustomTheme(preset.colors);
        }
        persist(presetId, preset.colors);
      }
    },
    [persist],
  );

  const setCustomColor = useCallback(
    (key: keyof CustomThemeColors, value: string) => {
      setCustomColorsState((prev) => {
        const next = { ...prev, [key]: value };
        setActivePresetState('custom');
        applyCustomTheme(next);
        persist('custom', next);
        return next;
      });
    },
    [persist],
  );

  const setAllCustomColors = useCallback(
    (colors: CustomThemeColors) => {
      setActivePresetState('custom');
      setCustomColorsState(colors);
      applyCustomTheme(colors);
      persist('custom', colors);
    },
    [persist],
  );

  const resetTheme = useCallback(() => {
    setActivePresetState('default');
    setCustomColorsState(THEME_PRESETS[0].colors);
    applyCustomTheme(null);
    localStorage.removeItem(CUSTOM_THEME_KEY);
  }, []);

  return (
    <CustomThemeContext.Provider
      value={{
        activePreset,
        customColors,
        setPreset,
        setCustomColor,
        setCustomColors: setAllCustomColors,
        resetTheme,
      }}
    >
      {children}
    </CustomThemeContext.Provider>
  );
}

export function useCustomTheme() {
  return useContext(CustomThemeContext);
}

/* ── Root provider ──────────────────────────────────────────────────────── */

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute={['class', 'data-theme']}
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange={false}
    >
      <AccentProvider>
        <CustomThemeProvider>
         
          {children}
        </CustomThemeProvider>
      </AccentProvider>
    </NextThemesProvider>
  );
}

