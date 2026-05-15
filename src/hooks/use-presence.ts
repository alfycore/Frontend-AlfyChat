'use client';

import { useEffect, useRef } from 'react';
import { socketService } from '@/lib/socket';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const HEARTBEAT_INTERVAL_MS = 30_000;   // 30 secondes
const ACTIVITY_THROTTLE_MS = 30_000;    // throttle des events activité

type SelectableStatus = 'online' | 'idle' | 'dnd' | 'invisible';

interface UsePresenceOptions {
  chosenStatus: SelectableStatus;
  customStatus?: string | null;
  emoji?: string | null;
}

/**
 * Gère l'auto-idle, le heartbeat et la coordination multi-onglets.
 * À appeler une seule fois dans le layout authentifié racine.
 */
export function usePresence({ chosenStatus, customStatus, emoji }: UsePresenceOptions): void {
  const lastActivityRef = useRef<number>(Date.now());
  const isAutoIdleRef = useRef<boolean>(false);
  const chosenStatusRef = useRef<SelectableStatus>(chosenStatus);
  const customStatusRef = useRef<string | null | undefined>(customStatus);
  const emojiRef = useRef<string | null | undefined>(emoji);
  const lastActivityEmitRef = useRef<number>(0);

  // Synchroniser les refs avec les props
  useEffect(() => { chosenStatusRef.current = chosenStatus; }, [chosenStatus]);
  useEffect(() => { customStatusRef.current = customStatus; }, [customStatus]);
  useEffect(() => { emojiRef.current = emoji; }, [emoji]);

  // Si le chosenStatus change manuellement (hors auto-idle), sortir de l'état auto-idle
  useEffect(() => {
    if (isAutoIdleRef.current && chosenStatus !== 'idle') {
      isAutoIdleRef.current = false;
    }
  }, [chosenStatus]);

  useEffect(() => {
    // BroadcastChannel pour coordination multi-onglets (fallback silencieux si non supporté)
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('alfychat_presence');
    } catch { /* ignore — BroadcastChannel non supporté */ }

    const handleActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;

      // Throttle : ne pas émettre trop souvent
      if (now - lastActivityEmitRef.current < ACTIVITY_THROTTLE_MS) return;
      lastActivityEmitRef.current = now;

      // Informer les autres onglets qu'on est actif
      try { bc?.postMessage({ type: 'ACTIVITY', ts: now }); } catch { /* ignore */ }

      // Si on était en auto-idle → restaurer le statut choisi
      if (isAutoIdleRef.current) {
        const cs = chosenStatusRef.current;
        // Uniquement si le statut choisi était 'online'
        if (cs === 'online') {
          isAutoIdleRef.current = false;
          socketService.updatePresence('online', customStatusRef.current ?? null, emojiRef.current ?? null);
          socketService.sendHeartbeat(true);
        }
      }
    };

    // Listener des events d'activité
    const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'touchstart', 'wheel'] as const;
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, handleActivity, { passive: true });
    }

    // Écouter les messages des autres onglets
    const handleBCMessage = (ev: MessageEvent) => {
      if (ev.data?.type === 'ACTIVITY') {
        lastActivityRef.current = Math.max(lastActivityRef.current, ev.data.ts ?? Date.now());
      }
    };
    bc?.addEventListener('message', handleBCMessage);

    // Heartbeat toutes les 30 secondes
    const heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityRef.current;
      const isActive = timeSinceActivity < ACTIVITY_THROTTLE_MS * 2;

      socketService.sendHeartbeat(isActive);

      // Vérifier auto-idle (fallback si gateway ne l'a pas encore détecté)
      const cs = chosenStatusRef.current;
      if (!isAutoIdleRef.current && cs === 'online' && timeSinceActivity >= IDLE_TIMEOUT_MS) {
        isAutoIdleRef.current = true;
        socketService.updatePresence('idle', customStatusRef.current ?? null, emojiRef.current ?? null);
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, handleActivity);
      }
      bc?.removeEventListener('message', handleBCMessage);
      try { bc?.close(); } catch { /* ignore */ }
      clearInterval(heartbeatInterval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — refs are used intentionally
}
