/**
 * Atelier ThemeKit — métadonnées des palettes et accents.
 *
 * Les couleurs réelles vivent dans globals.css (blocs [data-palette] /
 * [data-accent]) ; ici on ne garde que les identifiants, libellés et
 * petites valeurs de prévisualisation pour les swatchs des réglages.
 * (Palette v2 — refaite de zéro : échelle détaillée, bordures visibles.)
 */

export type PaletteId =
  | 'alfy'
  | 'encre'
  | 'sable'
  | 'abysse'
  | 'menthe'
  | 'braise'
  | 'orchidee'
  | 'nocturne'
  | 'custom';

export type AccentId =
  | 'auto'
  | 'alfy'
  | 'bleu'
  | 'menthe'
  | 'ambre'
  | 'corail'
  | 'rose'
  | 'custom';

export interface PaletteSwatch {
  background: string;
  surface: string;
  accent: string;
}

export interface PaletteMeta {
  id: Exclude<PaletteId, 'custom'>;
  nom: string;
  description: string;
  swatch: { light: PaletteSwatch; dark: PaletteSwatch };
}

export const PALETTES: PaletteMeta[] = [
  {
    id: 'alfy',
    nom: 'Alfy',
    description: 'L’identité d’origine, violet électrique',
    swatch: {
      light: {
        background: 'oklch(94.8% 0.0075 282)',
        surface: 'oklch(99.5% 0.0034 282)',
        accent: 'oklch(53% 0.245 285)',
      },
      dark: {
        background: 'oklch(13.5% 0.016 282)',
        surface: 'oklch(19.5% 0.016 282)',
        accent: 'oklch(62% 0.215 284)',
      },
    },
  },
  {
    id: 'encre',
    nom: 'Encre',
    description: 'Graphite pur, contraste maximal',
    swatch: {
      light: {
        background: 'oklch(94.8% 0 0)',
        surface: 'oklch(99.5% 0 0)',
        accent: 'oklch(22% 0 0)',
      },
      dark: {
        background: 'oklch(13.5% 0 0)',
        surface: 'oklch(19.5% 0 0)',
        accent: 'oklch(95% 0 0)',
      },
    },
  },
  {
    id: 'sable',
    nom: 'Sable',
    description: 'Papier chaud, cognac',
    swatch: {
      light: {
        background: 'oklch(94.8% 0.02 72)',
        surface: 'oklch(99.5% 0.009 72)',
        accent: 'oklch(49% 0.12 52)',
      },
      dark: {
        background: 'oklch(13.5% 0.017 72)',
        surface: 'oklch(19.5% 0.017 72)',
        accent: 'oklch(76% 0.135 68)',
      },
    },
  },
  {
    id: 'abysse',
    nom: 'Abysse',
    description: 'Bleu océan profond',
    swatch: {
      light: {
        background: 'oklch(94.8% 0.013 245)',
        surface: 'oklch(99.5% 0.0059 245)',
        accent: 'oklch(50% 0.18 248)',
      },
      dark: {
        background: 'oklch(13.5% 0.032 245)',
        surface: 'oklch(19.5% 0.032 245)',
        accent: 'oklch(70% 0.15 236)',
      },
    },
  },
  {
    id: 'menthe',
    nom: 'Menthe',
    description: 'Vert frais',
    swatch: {
      light: {
        background: 'oklch(94.8% 0.012 170)',
        surface: 'oklch(99.5% 0.0054 170)',
        accent: 'oklch(47% 0.125 166)',
      },
      dark: {
        background: 'oklch(13.5% 0.022 170)',
        surface: 'oklch(19.5% 0.022 170)',
        accent: 'oklch(77% 0.155 162)',
      },
    },
  },
  {
    id: 'braise',
    nom: 'Braise',
    description: 'Orange brûlé',
    swatch: {
      light: {
        background: 'oklch(94.8% 0.014 44)',
        surface: 'oklch(99.5% 0.0063 44)',
        accent: 'oklch(54% 0.19 38)',
      },
      dark: {
        background: 'oklch(13.5% 0.02 44)',
        surface: 'oklch(19.5% 0.02 44)',
        accent: 'oklch(71% 0.18 44)',
      },
    },
  },
  {
    id: 'orchidee',
    nom: 'Orchidée',
    description: 'Magenta feutré',
    swatch: {
      light: {
        background: 'oklch(94.8% 0.013 338)',
        surface: 'oklch(99.5% 0.0059 338)',
        accent: 'oklch(52% 0.225 346)',
      },
      dark: {
        background: 'oklch(13.5% 0.026 338)',
        surface: 'oklch(19.5% 0.026 338)',
        accent: 'oklch(70% 0.195 346)',
      },
    },
  },
  {
    id: 'nocturne',
    nom: 'Nocturne',
    description: 'Noir absolu, pensé pour l’OLED',
    swatch: {
      light: {
        background: 'oklch(94.8% 0.003 290)',
        surface: 'oklch(99.5% 0.0014 290)',
        accent: 'oklch(51% 0.265 292)',
      },
      dark: {
        background: 'oklch(0% 0.01 290)',
        surface: 'oklch(9.5% 0.01 290)',
        accent: 'oklch(62% 0.24 292)',
      },
    },
  },
];

export interface AccentMeta {
  id: Exclude<AccentId, 'auto' | 'custom'>;
  nom: string;
  /** Valeur de prévisualisation — identique au bloc [data-accent] CSS. */
  valeur: string;
}

export const ACCENTS: AccentMeta[] = [
  { id: 'alfy', nom: 'Alfy', valeur: 'oklch(58% 0.25 292)' },
  { id: 'bleu', nom: 'Bleu', valeur: 'oklch(56% 0.2 252)' },
  { id: 'menthe', nom: 'Menthe', valeur: 'oklch(62% 0.15 165)' },
  { id: 'ambre', nom: 'Ambre', valeur: 'oklch(76% 0.155 80)' },
  { id: 'corail', nom: 'Corail', valeur: 'oklch(63% 0.195 30)' },
  { id: 'rose', nom: 'Rose', valeur: 'oklch(63% 0.215 352)' },
];

export const PALETTE_IDS = PALETTES.map((p) => p.id);
export const ACCENT_IDS = ACCENTS.map((a) => a.id);
