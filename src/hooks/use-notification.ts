'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { socketService } from '@/lib/socket';
import {
  isDMActive,
  isGroupActive,
  incrementUnread,
} from '@/lib/notification-store';

/**
 * Hook global de notifications.
 *
 * Règles :
 * - Son + toast uniquement si l'utilisateur N'EST PAS dans la conversation concernée.
 * - Incrémente le compteur non-lu dans le notification-store (lu par channel-list).
 * - Utilise usePathname() (Next.js) pour le chemin réel — fiable même avec App Router.
 * - Déduplique les événements via un Set d'IDs de messages traités (évite double-trigger
 *   quand le message arrive à la fois via la room conversation et la room user:${id}).
 */
export function useNotification() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  // Garder la ref synchronisée avec le pathname Next.js (toujours à jour)
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Contexte audio partagé — un seul par session
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Set pour dédupliquer les messages (même id reçu 2x à cause des 2 rooms)
  const seenIdsRef = useRef<Set<string>>(new Set());

  const playNotificationSound = useCallback(() => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;

      // Son de notification : deux bips courts
      const playBeep = (startTime: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
        osc.start(startTime);
        osc.stop(startTime + 0.18);
      };

      const now = ctx.currentTime;
      playBeep(now, 880);
      playBeep(now + 0.22, 1100);
    } catch {
      // AudioContext non disponible (SSR, autoplay bloqué, etc.)
    }
  }, []);

  useEffect(() => {
    // ── Nouveau message (DM ou groupe) ───────────────────────────────────────
    const handleNewMessage = (data: any) => {
      const payload = data?.payload || data;
      if (!payload) return;

      // Déduplication par ID de message
      const msgId = payload.id || payload.messageId;
      if (msgId) {
        if (seenIdsRef.current.has(msgId)) return;
        seenIdsRef.current.add(msgId);
        // Nettoyer après 10 s pour éviter la fuite mémoire
        setTimeout(() => seenIdsRef.current.delete(msgId), 10_000);
      }

      const senderId = payload.senderId || payload.authorId;
      const myId = (window as any).__alfychat_user_id;

      // Ne pas notifier pour ses propres messages
      if (myId && senderId === myId) return;

      // Déterminer de quelle conversation vient ce message
      const recipientId: string | undefined = payload.recipientId;
      const groupId: string | undefined = payload.groupId || payload.channelId;
      const currentPath = pathnameRef.current;

      // Vérifier si l'utilisateur est actuellement dans cette conversation
      // Critère 1 : notification-store (source de vérité)
      // Critère 2 : fallback URL (si le store n'a pas encore été alimenté)
      let isViewing = false;

      if (recipientId) {
        isViewing =
          isDMActive(recipientId) ||
          currentPath.includes(`/channels/me/${recipientId}`);
      } else if (groupId) {
        isViewing =
          isGroupActive(groupId) ||
          currentPath.includes(groupId);
      }

      if (isViewing) return;

      // ── Incrémenter le badge non-lu ──────────────────────────────────────
      if (recipientId) {
        incrementUnread(recipientId);
      } else if (groupId) {
        incrementUnread(`group:${groupId}`);
      }

      // ── Toast + son ──────────────────────────────────────────────────────
      const senderName =
        payload.authorName || payload.senderName || 'Nouveau message';
      const content = payload.content || '';
      const truncated =
        content.length > 80 ? content.substring(0, 80) + '…' : content;

      toast.message(senderName, {
        description: truncated || undefined,
        duration: 4000,
      });

      playNotificationSound();
    };

    // ── Demande d'ami ────────────────────────────────────────────────────────
    const handleFriendRequest = (data: any) => {
      const payload = data?.payload || data;
      const name =
        payload?.fromUsername || payload?.username || 'Quelqu\'un';
      toast.info('Demande d\'ami', {
        description: `${name} vous a envoyé une demande d'ami`,
        duration: 5000,
      });
      playNotificationSound();
    };

    // ── Ami accepté ──────────────────────────────────────────────────────────
    const handleFriendAccepted = (data: any) => {
      const payload = data?.payload || data;
      const name =
        payload?.username || payload?.displayName || 'Un utilisateur';
      toast.success('Ami ajouté !', {
        description: `${name} a accepté votre demande d'ami`,
        duration: 4000,
      });
    };

    // ── Connexion / déconnexion ──────────────────────────────────────────────
    const handleDisconnect = () => {
      toast.error('Déconnecté', {
        description: 'Connexion au serveur perdue. Reconnexion en cours…',
        duration: 5000,
      });
    };

    const handleReconnect = () => {
      toast.success('Reconnecté', {
        description: 'Connexion rétablie',
        duration: 3000,
      });
    };

    socketService.on('message:new', handleNewMessage);
    socketService.on('FRIEND_REQUEST', handleFriendRequest);
    socketService.on('FRIEND_ACCEPT', handleFriendAccepted);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('connect', handleReconnect);

    return () => {
      socketService.off('message:new', handleNewMessage);
      socketService.off('FRIEND_REQUEST', handleFriendRequest);
      socketService.off('FRIEND_ACCEPT', handleFriendAccepted);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('connect', handleReconnect);
    };
  }, [playNotificationSound]);

  // Nettoyer l'AudioContext à la destruction du composant
  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);
}

/** Fonctions utilitaires pour déclencher des toasts manuellement */
export const notify = {
  success: (title: string, description?: string) =>
    toast.success(title, { description, duration: 3000 }),
  error: (title: string, description?: string) =>
    toast.error(title, { description, duration: 5000 }),
  info: (title: string, description?: string) =>
    toast.info(title, { description, duration: 4000 }),
  warning: (title: string, description?: string) =>
    toast.warning(title, { description, duration: 4000 }),
  message: (title: string, description?: string) =>
    toast.message(title, { description, duration: 4000 }),
};
