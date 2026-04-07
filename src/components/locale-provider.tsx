'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  type Locale,
  type Translations,
  translations,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
} from '@/i18n';

// ─── Context ──────────────────────────────────────────────────
interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (stored && stored in translations) {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(LOCALE_STORAGE_KEY, l);

    // Update <html lang> attribute
    document.documentElement.lang = l;
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translations[locale] as Translations }}>
      {children}
    </LocaleContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────
export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>');
  return ctx;
}

/** Returns the translation object `t` and a helper `tx` for interpolation. */
export function useTranslation() {
  const { t, locale, setLocale } = useLocale();

  /**
   * Interpolates `{variable}` placeholders in a string.
   * Example: tx('Hello {name}!', { name: 'Alice' }) → 'Hello Alice!'
   */
  const tx = (str: string, vars?: Record<string, string | number>): string => {
    if (!vars) return str;
    return Object.entries(vars).reduce<string>(
      (acc, [key, val]) => acc.replaceAll(`{${key}}`, String(val)),
      str,
    );
  };

  return { t, tx, locale, setLocale };
}
