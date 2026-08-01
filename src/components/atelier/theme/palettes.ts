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
        background: 'oklch(97.3% 0.008 289)',
        surface: 'oklch(99.3% 0.004 289)',
        accent: 'oklch(51% 0.27 292)',
      },
      dark: {
        background: 'oklch(14% 0.014 289)',
        surface: 'oklch(17.5% 0.014 289)',
        accent: 'oklch(58% 0.25 292)',
      },
    },
  },
  {
    id: 'encre',
    nom: 'Encre',
    description: 'Graphite pur, contraste maximal',
    swatch: {
      light: {
        background: 'oklch(97.8% 0 0)',
        surface: 'oklch(99.6% 0 0)',
        accent: 'oklch(20% 0 0)',
      },
      dark: {
        background: 'oklch(12% 0 0)',
        surface: 'oklch(16% 0 0)',
        accent: 'oklch(94% 0 0)',
      },
    },
  },
  {
    id: 'sable',
    nom: 'Sable',
    description: 'Papier chaud, cognac, éditorial',
    swatch: {
      light: {
        background: 'oklch(96.5% 0.021 85)',
        surface: 'oklch(98.9% 0.012 85)',
        accent: 'oklch(48% 0.12 55)',
      },
      dark: {
        background: 'oklch(14.5% 0.014 62)',
        surface: 'oklch(18% 0.017 66)',
        accent: 'oklch(72% 0.14 72)',
      },
    },
  },
  {
    id: 'abysse',
    nom: 'Abysse',
    description: 'Bleu océan profond, sérieux',
    swatch: {
      light: {
        background: 'oklch(97% 0.013 235)',
        surface: 'oklch(99.2% 0.006 235)',
        accent: 'oklch(50% 0.19 245)',
      },
      dark: {
        background: 'oklch(13.5% 0.03 242)',
        surface: 'oklch(17% 0.034 242)',
        accent: 'oklch(68% 0.15 230)',
      },
    },
  },
  {
    id: 'menthe',
    nom: 'Menthe',
    description: 'Vert frais, apaisant',
    swatch: {
      light: {
        background: 'oklch(97.1% 0.012 166)',
        surface: 'oklch(99.3% 0.005 166)',
        accent: 'oklch(48% 0.13 168)',
      },
      dark: {
        background: 'oklch(13.8% 0.018 172)',
        surface: 'oklch(17.2% 0.021 172)',
        accent: 'oklch(75% 0.16 160)',
      },
    },
  },
  {
    id: 'braise',
    nom: 'Braise',
    description: 'Orange brûlé, énergique',
    swatch: {
      light: {
        background: 'oklch(96.9% 0.015 48)',
        surface: 'oklch(99.1% 0.007 48)',
        accent: 'oklch(55% 0.19 40)',
      },
      dark: {
        background: 'oklch(14.2% 0.016 42)',
        surface: 'oklch(17.6% 0.019 44)',
        accent: 'oklch(70% 0.185 45)',
      },
    },
  },
  {
    id: 'orchidee',
    nom: 'Orchidée',
    description: 'Magenta feutré, élégant',
    swatch: {
      light: {
        background: 'oklch(97.1% 0.013 335)',
        surface: 'oklch(99.3% 0.006 335)',
        accent: 'oklch(53% 0.23 345)',
      },
      dark: {
        background: 'oklch(13.9% 0.022 337)',
        surface: 'oklch(17.3% 0.026 337)',
        accent: 'oklch(68% 0.2 345)',
      },
    },
  },
  {
    id: 'nocturne',
    nom: 'Nocturne',
    description: 'Noir absolu, pensé pour l’OLED',
    swatch: {
      light: {
        background: 'oklch(98% 0.0025 289)',
        surface: 'oklch(100% 0.0015 289)',
        accent: 'oklch(51% 0.27 292)',
      },
      dark: {
        background: 'oklch(0% 0 0)',
        surface: 'oklch(10% 0.008 289)',
        accent: 'oklch(58% 0.25 292)',
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
