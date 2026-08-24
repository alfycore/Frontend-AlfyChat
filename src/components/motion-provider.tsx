'use client';

/**
 * Périmètre reduced-motion pour framer-motion.
 *
 * Une media query CSS ne touche pas une animation pilotée en JS : sans ce
 * provider, la pastille du rail serveur, la barre de salon actif et le pop
 * des réactions continuaient de tourner à plein alors que l'utilisateur
 * avait demandé moins d'animations.
 *
 *   'always' → le réglage in-app (Réglages ▸ Accessibilité) est actif
 *   'user'   → on suit `prefers-reduced-motion` du système
 *
 * Le pendant CSS vit dans globals.css : les jetons --dur-* / --motion-iter
 * sont neutralisés par la media query ET par [data-motion="reduced"].
 */

import { MotionConfig } from 'motion/react';

import { useAppPrefs } from '@/hooks/use-app-prefs';

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const { prefs } = useAppPrefs();

  return (
    <MotionConfig reducedMotion={prefs.reducedMotion ? 'always' : 'user'}>
      {children}
    </MotionConfig>
  );
}
