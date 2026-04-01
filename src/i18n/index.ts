import { en } from './en';
import { fr } from './fr';
import { de } from './de';
import { es } from './es';
import { it } from './it';
import { pt } from './pt';
import { nl } from './nl';
import { pl } from './pl';
import { sv } from './sv';
import { da } from './da';
import { no } from './no';
import { ja } from './ja';
export type { Locale } from './types';
export { LOCALES, DEFAULT_LOCALE, LOCALE_STORAGE_KEY, resolveSystemLocale } from './types';

export const translations = { en, fr, de, es, it, pt, nl, pl, sv, da, no, ja } as const;
export type Translations = typeof en;
