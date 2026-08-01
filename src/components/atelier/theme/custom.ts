/**
 * Atelier ThemeKit — thème custom : conversions de couleurs et
 * application des variables inline sur <html>.
 *
 * Les valeurs sont stockées en oklch (le format natif du thème HeroUI) ;
 * l'éditeur convertit vers/depuis l'hex pour les <input type="color">.
 */

export type ThemeMode = 'light' | 'dark';

/** var CSS → valeur oklch. */
export type CustomVars = Record<string, string>;

export interface CustomVarDef {
  /** Nom de la variable CSS, ex. `--background`. */
  cssVar: string;
  /** Libellé français affiché dans le ThemeStudio. */
  label: string;
  /** Groupe d'affichage dans l'éditeur. */
  groupe: 'Page' | 'Surfaces' | 'Accent' | 'Champs' | 'Statuts' | 'Divers';
}

/** Toutes les variables éditables dans le ThemeStudio. */
export const CUSTOM_VARS: CustomVarDef[] = [
  { cssVar: '--background', label: 'Fond de page', groupe: 'Page' },
  { cssVar: '--foreground', label: 'Texte', groupe: 'Page' },
  { cssVar: '--muted', label: 'Texte secondaire', groupe: 'Page' },

  { cssVar: '--surface', label: 'Surface', groupe: 'Surfaces' },
  { cssVar: '--surface-foreground', label: 'Texte sur surface', groupe: 'Surfaces' },
  { cssVar: '--surface-secondary', label: 'Surface secondaire', groupe: 'Surfaces' },
  { cssVar: '--surface-secondary-foreground', label: 'Texte surface secondaire', groupe: 'Surfaces' },
  { cssVar: '--surface-tertiary', label: 'Surface tertiaire', groupe: 'Surfaces' },
  { cssVar: '--surface-tertiary-foreground', label: 'Texte surface tertiaire', groupe: 'Surfaces' },
  { cssVar: '--overlay', label: 'Fenêtres flottantes', groupe: 'Surfaces' },
  { cssVar: '--overlay-foreground', label: 'Texte fenêtres', groupe: 'Surfaces' },

  { cssVar: '--accent', label: 'Accent', groupe: 'Accent' },
  { cssVar: '--accent-foreground', label: 'Texte sur accent', groupe: 'Accent' },
  { cssVar: '--focus', label: 'Anneau de focus', groupe: 'Accent' },

  { cssVar: '--field-background', label: 'Fond des champs', groupe: 'Champs' },
  { cssVar: '--field-foreground', label: 'Texte des champs', groupe: 'Champs' },
  { cssVar: '--field-placeholder', label: 'Placeholder', groupe: 'Champs' },

  { cssVar: '--success', label: 'Succès', groupe: 'Statuts' },
  { cssVar: '--success-foreground', label: 'Texte succès', groupe: 'Statuts' },
  { cssVar: '--warning', label: 'Avertissement', groupe: 'Statuts' },
  { cssVar: '--warning-foreground', label: 'Texte avertissement', groupe: 'Statuts' },
  { cssVar: '--danger', label: 'Danger', groupe: 'Statuts' },
  { cssVar: '--danger-foreground', label: 'Texte danger', groupe: 'Statuts' },

  { cssVar: '--default', label: 'Neutre (chips, tags)', groupe: 'Divers' },
  { cssVar: '--default-foreground', label: 'Texte neutre', groupe: 'Divers' },
  { cssVar: '--border', label: 'Bordures internes', groupe: 'Divers' },
  { cssVar: '--separator', label: 'Séparateurs internes', groupe: 'Divers' },
  { cssVar: '--segment', label: 'Contrôles segmentés', groupe: 'Divers' },
  { cssVar: '--segment-foreground', label: 'Texte segments', groupe: 'Divers' },
  { cssVar: '--scrollbar', label: 'Barre de défilement', groupe: 'Divers' },
];

const CUSTOM_VAR_NAMES = CUSTOM_VARS.map((v) => v.cssVar);

/** Variables posées par l'accent custom (hors mode palette custom). */
export const ACCENT_VARS = ['--accent', '--accent-foreground', '--focus'] as const;

/* ── Conversions hex ↔ oklch ─────────────────────────────────────────────── */

export function hexToOklch(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const lin = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const rl = lin(r);
  const gl = lin(g);
  const bl = lin(b);

  const l_ = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const m_ = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const s_ = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;

  const l1 = Math.cbrt(l_);
  const m1 = Math.cbrt(m_);
  const s1 = Math.cbrt(s_);

  const L = 0.2104542553 * l1 + 0.7936177850 * m1 - 0.0040720468 * s1;
  const a = 1.9779984951 * l1 - 2.4285922050 * m1 + 0.4505937099 * s1;
  const bOk = 0.0259040371 * l1 + 0.7827717662 * m1 - 0.8086757660 * s1;

  const C = Math.sqrt(a * a + bOk * bOk);
  let h = Math.atan2(bOk, a) * (180 / Math.PI);
  if (h < 0) h += 360;

  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${h.toFixed(1)})`;
}

/**
 * oklch → hex sRGB (avec clamp de gamut). Accepte `oklch(L C H)` où L peut
 * être `0.62` ou `62%`. Retourne '#000000' si la chaîne est illisible.
 */
export function oklchToHex(value: string): string {
  const m = value.match(
    /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/i,
  );
  if (!m) return '#000000';
  let L = parseFloat(m[1]);
  if (m[2] === '%') L /= 100;
  const C = parseFloat(m[3]);
  const H = (parseFloat(m[4]) * Math.PI) / 180;

  const a = C * Math.cos(H);
  const bOk = C * Math.sin(H);

  const l1 = L + 0.3963377774 * a + 0.2158037573 * bOk;
  const m1 = L - 0.1055613458 * a - 0.0638541728 * bOk;
  const s1 = L - 0.0894841775 * a - 1.2914855480 * bOk;

  const l3 = l1 ** 3;
  const m3 = m1 ** 3;
  const s3 = s1 ** 3;

  let rl = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let gl = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const gamma = (c: number) => {
    const v = Math.min(1, Math.max(0, c));
    return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  };
  const to255 = (c: number) =>
    Math.round(gamma(c) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${to255(rl)}${to255(gl)}${to255(bl)}`;
}

/** Passe-plat sûr : convertit l'hex, laisse `transparent`/oklch tels quels. */
export function toOklch(v: string): string {
  if (v.startsWith('#') && (v.length === 7 || v.length === 9)) {
    return hexToOklch(v.slice(0, 7));
  }
  return v;
}

/**
 * Texte lisible sur une couleur donnée : blanc si la couleur est sombre,
 * quasi-noir sinon (seuil sur la luminosité oklch).
 */
export function readableForeground(oklchValue: string): string {
  const m = oklchValue.match(/oklch\(\s*([\d.]+)(%?)/i);
  if (!m) return 'oklch(99.11% 0 0)';
  let L = parseFloat(m[1]);
  if (m[2] === '%') L /= 100;
  return L > 0.65 ? 'oklch(18% 0 0)' : 'oklch(99.11% 0 0)';
}

/* ── Application inline sur <html> ───────────────────────────────────────── */

export function applyCustomVars(root: HTMLElement, vars: CustomVars): void {
  for (const [prop, val] of Object.entries(vars)) {
    if (CUSTOM_VAR_NAMES.includes(prop)) root.style.setProperty(prop, val);
  }
}

export function clearCustomVars(root: HTMLElement): void {
  for (const prop of CUSTOM_VAR_NAMES) root.style.removeProperty(prop);
}

/* ── Valeurs de départ de l'éditeur (palette `alfy`) ─────────────────────── */

export const DEFAULT_CUSTOM: { light: CustomVars; dark: CustomVars } = {
  light: {
    '--background': 'oklch(97.3% 0.008 289)',
    '--foreground': 'oklch(20% 0.014 289)',
    '--muted': 'oklch(50% 0.024 289)',
    '--surface': 'oklch(99.3% 0.004 289)',
    '--surface-foreground': 'oklch(20% 0.014 289)',
    '--surface-secondary': 'oklch(95.6% 0.008 289)',
    '--surface-secondary-foreground': 'oklch(20% 0.014 289)',
    '--surface-tertiary': 'oklch(92.8% 0.01 289)',
    '--surface-tertiary-foreground': 'oklch(20% 0.014 289)',
    '--overlay': 'oklch(100% 0.002 289)',
    '--overlay-foreground': 'oklch(20% 0.014 289)',
    '--accent': 'oklch(51% 0.27 292)',
    '--accent-foreground': 'oklch(99.2% 0 0)',
    '--focus': 'oklch(51% 0.27 292)',
    '--field-background': 'oklch(100% 0.003 289)',
    '--field-foreground': 'oklch(20% 0.014 289)',
    '--field-placeholder': 'oklch(55% 0.022 289)',
    '--success': 'oklch(64% 0.175 152)',
    '--success-foreground': 'oklch(99.2% 0 0)',
    '--warning': 'oklch(76% 0.165 72)',
    '--warning-foreground': 'oklch(24% 0.05 72)',
    '--danger': 'oklch(60% 0.23 27)',
    '--danger-foreground': 'oklch(99.2% 0 0)',
    '--default': 'oklch(93.5% 0.009 289)',
    '--default-foreground': 'oklch(20% 0.014 289)',
    '--border': 'oklch(87.5% 0.012 289)',
    '--separator': 'oklch(91% 0.01 289)',
    '--segment': 'oklch(100% 0.003 289)',
    '--segment-foreground': 'oklch(20% 0.014 289)',
    '--scrollbar': 'oklch(84% 0.011 289)',
  },
  dark: {
    '--background': 'oklch(14% 0.014 289)',
    '--foreground': 'oklch(96% 0.007 289)',
    '--muted': 'oklch(67% 0.022 289)',
    '--surface': 'oklch(17.5% 0.014 289)',
    '--surface-foreground': 'oklch(96% 0.007 289)',
    '--surface-secondary': 'oklch(20% 0.014 289)',
    '--surface-secondary-foreground': 'oklch(96% 0.007 289)',
    '--surface-tertiary': 'oklch(24% 0.016 289)',
    '--surface-tertiary-foreground': 'oklch(96% 0.007 289)',
    '--overlay': 'oklch(19% 0.015 289)',
    '--overlay-foreground': 'oklch(96% 0.007 289)',
    '--accent': 'oklch(58% 0.25 292)',
    '--accent-foreground': 'oklch(99.2% 0 0)',
    '--focus': 'oklch(58% 0.25 292)',
    '--field-background': 'oklch(12.5% 0.013 289)',
    '--field-foreground': 'oklch(96% 0.007 289)',
    '--field-placeholder': 'oklch(56% 0.02 289)',
    '--success': 'oklch(70% 0.18 155)',
    '--success-foreground': 'oklch(16% 0.04 155)',
    '--warning': 'oklch(80% 0.15 78)',
    '--warning-foreground': 'oklch(20% 0.05 78)',
    '--danger': 'oklch(62% 0.21 26)',
    '--danger-foreground': 'oklch(99.2% 0 0)',
    '--default': 'oklch(26.5% 0.016 289)',
    '--default-foreground': 'oklch(96% 0.007 289)',
    '--border': 'oklch(30% 0.018 289)',
    '--separator': 'oklch(24.5% 0.015 289)',
    '--segment': 'oklch(30% 0.017 289)',
    '--segment-foreground': 'oklch(96% 0.007 289)',
    '--scrollbar': 'oklch(38% 0.018 289)',
  },
};
