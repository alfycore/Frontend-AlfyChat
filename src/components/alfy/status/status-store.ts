'use client';

/**
 * Statut de présence choisi + statut personnalisé, avec leurs échéances.
 *
 * Le serveur garde le statut et le texte (PRESENCE_UPDATE → base) ; les
 * ÉCHÉANCES (« Ne pas déranger pendant 1 h », « effacer après 4 h ») sont
 * tenues ici, par compte, et survivent au rechargement. `useStatusExpiry`
 * applique le retour à « En ligne » / l'effacement à l'heure dite.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ChosenStatus = 'online' | 'idle' | 'dnd' | 'invisible';

export const STATUS_DURATIONS = ['15m', '1h', '8h', '24h', '3d', 'forever'] as const;
export type StatusDuration = (typeof STATUS_DURATIONS)[number];

export const CLEAR_AFTER = ['today', '4h', '1h', '30m', 'never'] as const;
export type ClearAfter = (typeof CLEAR_AFTER)[number];

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export function durationMs(d: StatusDuration): number | null {
  switch (d) {
    case '15m':
      return 15 * MINUTE;
    case '1h':
      return HOUR;
    case '8h':
      return 8 * HOUR;
    case '24h':
      return 24 * HOUR;
    case '3d':
      return 72 * HOUR;
    default:
      return null;
  }
}

/** Instant d'effacement d'un statut personnalisé (null = jamais). */
export function clearAt(c: ClearAfter, now: number): number | null {
  switch (c) {
    case 'today': {
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return end.getTime();
    }
    case '4h':
      return now + 4 * HOUR;
    case '1h':
      return now + HOUR;
    case '30m':
      return now + 30 * MINUTE;
    default:
      return null;
  }
}

interface Expiries {
  /** Retour à « En ligne » à cet instant (statut choisi pour une durée). */
  statusUntil: number | null;
  /** Effacement du statut personnalisé à cet instant. */
  customUntil: number | null;
}

const NONE: Expiries = { statusUntil: null, customUntil: null };

interface StatusStore {
  byUser: Record<string, Expiries>;
  /** Éditeur de statut personnalisé ouvert. */
  editorOpen: boolean;
  setStatusUntil: (userId: string, until: number | null) => void;
  setCustomUntil: (userId: string, until: number | null) => void;
  openEditor: () => void;
  closeEditor: () => void;
}

export const useStatusStore = create<StatusStore>()(
  persist(
    (set) => ({
      byUser: {},
      editorOpen: false,
      setStatusUntil: (userId, until) =>
        set((s) => ({ byUser: { ...s.byUser, [userId]: { ...(s.byUser[userId] ?? NONE), statusUntil: until } } })),
      setCustomUntil: (userId, until) =>
        set((s) => ({ byUser: { ...s.byUser, [userId]: { ...(s.byUser[userId] ?? NONE), customUntil: until } } })),
      openEditor: () => set({ editorOpen: true }),
      closeEditor: () => set({ editorOpen: false }),
    }),
    {
      name: 'alfy-status-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ byUser: s.byUser }),
    },
  ),
);

export const expiriesOf = (userId: string | undefined): Expiries =>
  (userId && useStatusStore.getState().byUser[userId]) || NONE;
