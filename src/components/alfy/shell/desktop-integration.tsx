'use client';

/**
 * Intégration de l'enveloppe desktop, montée une fois en tête du layout racine.
 *
 *  - `data-desktop` sur <html> : active les règles de `desktop.css`.
 *  - Boutons de fenêtre natifs : l'OS les peint dans la couleur que lui donne
 *    le processus principal. Sans synchronisation, ils restaient sombres sur
 *    le thème clair, et décalés sur les autres palettes ou en OLED.
 *  - Bande de déplacement pour les pages sans `AppTitleBar`. Rendue en
 *    premier dans le document, pour que le `no-drag` des éléments
 *    interactifs, qui la suivent, l'emporte.
 */

import { useEffect, useSyncExternalStore } from 'react';

import { desktopBridge } from '@/lib/desktop';
import './desktop.css';

/** Attributs de <html> qui changent le thème (next-themes, ThemeKit, réglages d'apparence). */
const THEME_ATTRIBUTES = ['class', 'style', 'data-theme', 'data-palette', 'data-depth', 'data-contrast'];

const noSubscribe = () => () => {};

/** N'importe quelle couleur CSS (oklch…) en `#rrggbb`, seul format qu'accepte l'overlay natif. */
function toHex(ctx: CanvasRenderingContext2D, color: string): string {
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#000';
  ctx.fillStyle = color; // ignoré si invalide
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function DesktopIntegration() {
  const isDesktop = useSyncExternalStore(noSubscribe, () => desktopBridge() !== null, () => false);

  useEffect(() => {
    const bridge = desktopBridge();
    if (!bridge) return;
    const root = document.documentElement;
    root.dataset.desktop = bridge.platform;

    const setColors = bridge.setTitleBarColors;
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    // Enveloppe antérieure à la synchronisation : elle garde ses couleurs fixes.
    if (!setColors || !ctx) return;

    let last = '';
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      // Une image plus tard : les variables du nouveau thème sont appliquées.
      frame = requestAnimationFrame(() => {
        const style = getComputedStyle(root);
        const color = toHex(ctx, style.getPropertyValue('--background').trim());
        const symbolColor = toHex(ctx, style.getPropertyValue('--muted').trim());
        if (color + symbolColor === last) return;
        last = color + symbolColor;
        setColors({ color, symbolColor }).catch(() => {});
      });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: THEME_ATTRIBUTES });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return isDesktop ? <div aria-hidden className="alfy-desktop-drag" /> : null;
}
