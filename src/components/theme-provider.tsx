'use client';

/**
 * Provider racine des thèmes.
 *
 *  - next-themes : mode clair/sombre/auto (class + data-theme sur <html>)
 *  - ThemeKit (Atelier) : palette + accent + thème custom, pilotés par
 *    les variables CSS de globals.css. Voir src/components/atelier/theme/.
 */

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

import { ThemeKit } from '@/components/atelier/theme/ThemeKit';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute={['class', 'data-theme']}
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange={false}
    >
      <ThemeKit>{children}</ThemeKit>
    </NextThemesProvider>
  );
}
