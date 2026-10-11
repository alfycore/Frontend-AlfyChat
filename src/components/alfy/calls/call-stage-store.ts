/**
 * Présence de la scène d'appel à l'écran.
 *
 * Quand la conversation de l'appel en cours est ouverte, sa scène porte déjà
 * les contrôles : le bandeau global (`CallBar`) ferait doublon. La scène se
 * déclare ici à son montage, le bandeau s'efface tant qu'elle est là.
 */

import { useEffect, useSyncExternalStore } from 'react';

let mounted = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** À appeler par la scène tant qu'elle est affichée. */
export function useRegisterCallStage(active: boolean) {
  useEffect(() => {
    if (!active) return;
    mounted += 1;
    emit();
    return () => {
      mounted -= 1;
      emit();
    };
  }, [active]);
}

/** Vrai si une scène d'appel est visible quelque part. */
export function useCallStageVisible(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => mounted > 0,
    () => false,
  );
}
