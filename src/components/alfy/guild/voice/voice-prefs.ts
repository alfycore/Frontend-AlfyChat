'use client';

/**
 * Réglages vocaux locaux, comme le menu d'un participant sur Discord :
 * casque coupé (« deafen »), volume par utilisateur, sourdine locale d'un
 * utilisateur. Appliqués par `GlobalCallAudio` à la lecture des flux distants.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface VoicePrefsState {
  /** Casque coupé : plus aucun son entrant, micro coupé aussi. */
  deafened: boolean;
  /** Micro coupé AVANT de se casque-couper — restauré à la réactivation. */
  mutedBeforeDeafen: boolean;
  /** Micro coupé hors appel : appliqué dès la connexion au vocal suivant. */
  idleMuted: boolean;
  /** userId → volume 0–200 (%). */
  volumes: Record<string, number>;
  /** userId → rendu muet pour soi seulement. */
  localMutes: Record<string, true>;
  /** Incrémenté quand la sortie audio change : les lecteurs réappliquent leur sortie. */
  outputVersion: number;
  bumpOutput: () => void;
  setDeafened: (deafened: boolean, mutedBefore?: boolean) => void;
  setIdleMuted: (muted: boolean) => void;
  setVolume: (userId: string, volume: number) => void;
  toggleLocalMute: (userId: string) => void;
}

export const useVoicePrefs = create<VoicePrefsState>()(
  persist(
    (set) => ({
      deafened: false,
      mutedBeforeDeafen: false,
      idleMuted: false,
      outputVersion: 0,
      bumpOutput: () => set((s) => ({ outputVersion: s.outputVersion + 1 })),
      volumes: {},
      localMutes: {},
      setDeafened: (deafened, mutedBefore) =>
        set((s) => ({ deafened, mutedBeforeDeafen: mutedBefore ?? s.mutedBeforeDeafen })),
      setIdleMuted: (idleMuted) => set({ idleMuted }),
      setVolume: (userId, volume) =>
        set((s) => ({ volumes: { ...s.volumes, [userId]: Math.max(0, Math.min(200, Math.round(volume))) } })),
      toggleLocalMute: (userId) =>
        set((s) => {
          const next = { ...s.localMutes };
          if (next[userId]) delete next[userId];
          else next[userId] = true;
          return { localMutes: next };
        }),
    }),
    {
      name: 'alfy-voice-prefs-v1',
      storage: createJSONStorage(() => localStorage),
      // Le casque coupé ne survit pas à un rechargement (Discord non plus).
      partialize: (s) => ({ volumes: s.volumes, localMutes: s.localMutes, idleMuted: s.idleMuted }),
    },
  ),
);

/** Clé de flux distant → utilisateur (les partages d'écran finissent par `_screen`). */
export const streamOwner = (key: string) => (key.endsWith('_screen') ? key.slice(0, -'_screen'.length) : key);
