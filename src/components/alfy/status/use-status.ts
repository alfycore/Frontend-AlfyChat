'use client';

/**
 * Gestes de statut (choisir un statut, pour une durée ; définir / effacer le
 * statut personnalisé) et veille des échéances.
 */

import { useCallback, useEffect } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { socketService } from '@/lib/socket';
import { clearAt, durationMs, expiriesOf, useStatusStore, type ChosenStatus, type ClearAfter, type StatusDuration } from '@/components/alfy/status/status-store';

interface PresenceUser {
  id: string;
  status?: string | null;
  customStatus?: string | null;
  emoji?: string | null;
}

export function useStatusActions() {
  const { user, updateUser } = useAuth();
  const me = user as PresenceUser | null;

  /** Statut choisi, éventuellement pour une durée (puis retour à « En ligne »). */
  const setStatus = useCallback(
    (next: ChosenStatus, duration: StatusDuration = 'forever') => {
      if (!me) return;
      const ms = next === 'online' ? null : durationMs(duration);
      useStatusStore.getState().setStatusUntil(me.id, ms ? Date.now() + ms : null);
      // Le serveur ne renvoie pas l'écho de son propre changement : écriture locale.
      updateUser({ status: next });
      socketService.updatePresence(next, me.customStatus ?? null, me.emoji ?? null);
    },
    [me, updateUser],
  );

  const setCustom = useCallback(
    (text: string, emoji: string | null, clearAfter: ClearAfter) => {
      if (!me) return;
      const clean = text.trim().slice(0, 100);
      useStatusStore.getState().setCustomUntil(me.id, clean || emoji ? clearAt(clearAfter, Date.now()) : null);
      updateUser({ customStatus: clean || null, emoji: emoji || null } as never);
      socketService.updatePresence(((me.status as ChosenStatus) ?? 'online') as ChosenStatus, clean || null, emoji || null);
    },
    [me, updateUser],
  );

  const clearCustom = useCallback(() => setCustom('', null, 'never'), [setCustom]);

  return { setStatus, setCustom, clearCustom };
}

/** Monté une fois : applique les échéances (au chargement puis toutes les 20 s). */
export function useStatusExpiry() {
  const { user } = useAuth();
  const { setStatus, clearCustom } = useStatusActions();
  const me = user as PresenceUser | null;
  const userId = me?.id;

  useEffect(() => {
    if (!userId) return;
    const tick = () => {
      const { statusUntil, customUntil } = expiriesOf(userId);
      const now = Date.now();
      if (statusUntil && now >= statusUntil) {
        useStatusStore.getState().setStatusUntil(userId, null);
        setStatus('online');
      }
      if (customUntil && now >= customUntil) {
        useStatusStore.getState().setCustomUntil(userId, null);
        clearCustom();
      }
    };
    tick();
    const timer = window.setInterval(tick, 20_000);
    return () => window.clearInterval(timer);
  }, [userId, setStatus, clearCustom]);
}
