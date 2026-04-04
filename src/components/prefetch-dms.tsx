'use client';

import { usePrefetchDMs } from '@/hooks/use-prefetch-dms';

/**
 * Composant invisible : déclenche le pré-chargement des DM au montage.
 * Doit être rendu à l'intérieur de <AuthProvider>.
 */
export function PrefetchDMs() {
  usePrefetchDMs();
  return null;
}
