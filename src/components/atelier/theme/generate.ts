/**
 * Atelier ThemeKit — génération d'un thème complet à partir de deux couleurs.
 *
 * Port de `scripts/gen-palettes.py` : même échelle de luminosité par couche
 * d'interface, même chroma « neutre » modulée, mêmes seuils de contraste
 * WCAG. Seules changent la teinte des fonds et l'accent, choisis par
 * l'utilisateur ; l'accent est déplacé en luminosité jusqu'à être lisible
 * (texte posé dessus ≥ 4.5:1, accent sur le fil ≥ 3:1).
 */

import { hexToOklch, type CustomVars, type ThemeMode } from './custom';

/** [luminosité %, chroma, teinte] */
type Lch = [number, number, number];

export interface ThemeSeed {
  /** Couleur qui teinte les fonds (seule sa teinte et sa saturation comptent). */
  base: string;
  /** Couleur d'accent (boutons, liens, sélection). */
  accent: string;
  /** Intensité de la teinte des fonds, 0 (gris neutre) à 100 (très coloré). */
  tint: number;
}

export const DEFAULT_SEED: ThemeSeed = { base: '#7c5cff', accent: '#7c5cff', tint: 45 };

/* ── Couleur : oklch → sRGB linéaire → luminance relative ───────────────── */

function toLinearRgb([L, C, h]: Lch): [number, number, number] {
  const l0 = L / 100;
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (l0 + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (l0 - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (l0 - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return [
    clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

function luminance(c: Lch): number {
  const [r, g, b] = toLinearRgb(c);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(c1: Lch, c2: Lch): number {
  const a = luminance(c1);
  const b = luminance(c2);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const fmt = ([L, C, h]: Lch) => `oklch(${L.toFixed(2)}% ${C.toFixed(4)} ${Math.round(h * 10) / 10})`;

/** `oklch(0.62 0.2 290)` ou `oklch(62% …)` → triplet ; null si illisible. */
export function parseOklch(value: string): Lch | null {
  const m = value.match(/oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/i);
  if (!m) return null;
  const L = parseFloat(m[1]) * (m[2] === '%' ? 1 : 100);
  return [L, parseFloat(m[3]), parseFloat(m[4])];
}

const fromHex = (hex: string): Lch => parseOklch(hexToOklch(hex)) ?? [60, 0.2, 290];

/* ── Échelles par couche (identiques au générateur Python) ──────────────── */

const DARK: Record<string, [number, number]> = {
  '--background': [13.5, 1.0],
  '--field-background': [16.0, 1.0],
  '--surface': [19.5, 1.0],
  '--overlay': [21.5, 1.05],
  '--surface-secondary': [23.0, 1.05],
  '--surface-tertiary': [26.0, 1.1],
  '--default': [28.0, 1.1],
  '--separator': [25.5, 1.0],
  '--border': [31.5, 1.15],
  '--segment': [35.0, 1.1],
  '--scrollbar': [44.0, 0.9],
  '--muted': [71.5, 0.7],
  '--field-placeholder': [64.0, 0.7],
  '--foreground': [96.5, 0.35],
  '--field-foreground': [96.5, 0.35],
  '--surface-foreground': [96.5, 0.35],
  '--overlay-foreground': [96.5, 0.35],
  '--segment-foreground': [96.5, 0.35],
  '--default-foreground': [96.5, 0.35],
  '--surface-secondary-foreground': [96.5, 0.35],
  '--surface-tertiary-foreground': [96.5, 0.35],
};

const LIGHT: Record<string, [number, number]> = {
  '--background': [94.8, 1.0],
  '--field-background': [100.0, 0.3],
  '--surface': [99.5, 0.45],
  '--overlay': [100.0, 0.3],
  '--surface-secondary': [96.8, 0.85],
  '--surface-tertiary': [94.6, 1.0],
  '--default': [93.4, 1.0],
  '--separator': [91.2, 1.0],
  '--border': [87.4, 1.2],
  '--segment': [100.0, 0.3],
  '--scrollbar': [81.0, 1.0],
  '--muted': [49.0, 1.4],
  '--field-placeholder': [56.0, 1.2],
  '--foreground': [20.5, 1.1],
  '--field-foreground': [20.5, 1.1],
  '--surface-foreground': [20.5, 1.1],
  '--overlay-foreground': [20.5, 1.1],
  '--segment-foreground': [20.5, 1.1],
  '--default-foreground': [20.5, 1.1],
  '--surface-secondary-foreground': [20.5, 1.1],
  '--surface-tertiary-foreground': [20.5, 1.1],
};

/** Chroma neutre maximale (intensité 100) : au-delà, le texte secondaire perd en lisibilité. */
const MAX_NEUTRAL_C = { dark: 0.045, light: 0.03 };

const SEMANTIC: Record<ThemeMode, CustomVars> = {
  light: {
    '--success': 'oklch(57.00% 0.1550 150)', '--success-foreground': 'oklch(99.40% 0 0)',
    '--warning': 'oklch(72.00% 0.1600 68)', '--warning-foreground': 'oklch(20.00% 0.0400 68)',
    '--danger': 'oklch(55.50% 0.2150 26)', '--danger-foreground': 'oklch(99.40% 0 0)',
  },
  dark: {
    '--success': 'oklch(72.00% 0.1700 152)', '--success-foreground': 'oklch(18.00% 0.0400 152)',
    '--warning': 'oklch(81.00% 0.1500 78)', '--warning-foreground': 'oklch(19.00% 0.0400 78)',
    '--danger': 'oklch(64.00% 0.2050 25)', '--danger-foreground': 'oklch(99.40% 0 0)',
  },
};

const WHITE: Lch = [99.4, 0, 0];
const INK: Lch = [17, 0, 0];

/** Texte sur l'accent : blanc ou encre, le plus contrasté. */
function accentForeground(acc: Lch): Lch {
  return contrast(acc, WHITE) >= contrast(acc, INK) ? WHITE : [INK[0], Math.min(acc[1] * 0.25, 0.04), acc[2]];
}

/**
 * Rend l'accent lisible : on garde teinte et chroma, et on déplace la
 * luminosité par petits pas (vers le haut en sombre, vers le bas en clair,
 * puis dans l'autre sens) jusqu'à satisfaire les deux contrastes.
 */
function fitAccent(acc: Lch, surface: Lch, mode: ThemeMode): Lch {
  const ok = (c: Lch) => contrast(c, accentForeground(c)) >= 4.5 && contrast(c, surface) >= 3;
  if (ok(acc)) return acc;
  const dirs = mode === 'dark' ? [1, -1] : [-1, 1];
  for (const dir of dirs) {
    for (let step = 1; step <= 60; step++) {
      const L = acc[0] + dir * step;
      if (L < 5 || L > 97) break;
      const c: Lch = [L, acc[1], acc[2]];
      if (ok(c)) return c;
    }
  }
  return mode === 'dark' ? [62, acc[1], acc[2]] : [52, acc[1], acc[2]];
}

/** Palette complète d'un mode à partir d'une graine. */
export function generateMode(seed: ThemeSeed, mode: ThemeMode): CustomVars {
  const base = fromHex(seed.base);
  const hue = base[2];
  // Une couleur de base grise donne des fonds gris, quelle que soit l'intensité.
  const greyness = Math.min(1, base[1] / 0.08);
  const neutralC = MAX_NEUTRAL_C[mode] * (Math.max(0, Math.min(100, seed.tint)) / 100) * greyness;
  const ladder = mode === 'dark' ? DARK : LIGHT;

  const vars: CustomVars = {};
  const lch: Record<string, Lch> = {};
  for (const [name, [L, f]] of Object.entries(ladder)) {
    lch[name] = [L, Math.round(neutralC * f * 10000) / 10000, hue];
    vars[name] = fmt(lch[name]);
  }

  const accent = fitAccent(fromHex(seed.accent), lch['--surface'], mode);
  vars['--accent'] = fmt(accent);
  vars['--accent-foreground'] = fmt(accentForeground(accent));
  vars['--focus'] = fmt(accent);
  return { ...vars, ...SEMANTIC[mode] };
}

export function generateTheme(seed: ThemeSeed): { light: CustomVars; dark: CustomVars } {
  return { light: generateMode(seed, 'light'), dark: generateMode(seed, 'dark') };
}

/* ── Vérification des contrastes (thème généré OU retouché à la main) ───── */

export interface ContrastCheck {
  id: 'text' | 'secondary' | 'accent' | 'input';
  ratio: number;
  min: number;
  ok: boolean;
}

export function checkContrast(vars: CustomVars): ContrastCheck[] {
  const get = (k: string): Lch => parseOklch(vars[k] ?? '') ?? [50, 0, 0];
  const row = (id: ContrastCheck['id'], a: string, b: string, min: number): ContrastCheck => {
    const ratio = contrast(get(a), get(b));
    return { id, ratio, min, ok: ratio >= min };
  };
  return [
    row('text', '--foreground', '--surface', 7),
    row('secondary', '--muted', '--surface', 4.5),
    row('accent', '--accent-foreground', '--accent', 4.5),
    row('input', '--field-foreground', '--field-background', 7),
  ];
}
