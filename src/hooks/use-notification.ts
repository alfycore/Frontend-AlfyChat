'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { socketService } from '@/lib/socket';
import { signalService } from '@/lib/signal-service';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import {
  isDMActive,
  isGroupActive,
  isChannelActive,
  incrementUnread,
  clearUnread,
  subscribe as subscribeNotifications,
  getSnapshot,
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
  const { user } = useAuth();
  const userIdRef = useRef<string | null>(user?.id ?? null);

  // Garder les refs synchronisées
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  // Contexte audio partagé — un seul par session
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Set pour dédupliquer les messages (même id reçu 2x à cause des 2 rooms)
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Demander la permission OS au montage (ne bloque pas l'UX, juste demande)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const showOSNotification = useCallback((title: string, body?: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      const n = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'alfychat-msg',
      } as NotificationOptions);
      setTimeout(() => n.close(), 6000);
    } catch { /* navigateur sans support ou permission révoquée */ }
  }, []);

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
    const handleNewMessage = async (data: any) => {
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
      const myId = userIdRef.current;

      // Ne pas notifier pour ses propres messages
      if (myId && senderId === myId) return;

      // Déterminer de quelle conversation vient ce message
      // Pour les DM : la clé du badge = senderId (l'ami qui écrit), pas recipientId (soi-même)
      const dmSenderId: string | undefined = senderId ?? undefined;
      const groupId: string | undefined = payload.groupId || payload.channelId;
      const currentPath = pathnameRef.current;

      // Vérifier si l'utilisateur est actuellement dans cette conversation
      // Critère 1 : notification-store (source de vérité)
      // Critère 2 : fallback URL (si le store n'a pas encore été alimenté)
      let isViewing = false;

      if (!groupId && dmSenderId) {
        // DM : la conversation est identifiée par l'ID de l'expéditeur
        isViewing =
          isDMActive(dmSenderId) ||
          currentPath.includes(`/channels/me/${dmSenderId}`);
      } else if (groupId) {
        isViewing =
          isGroupActive(groupId) ||
          currentPath.includes(groupId);
      }

      if (isViewing) return;

      // ── Incrémenter le badge non-lu ──────────────────────────────────────
      if (!groupId && dmSenderId) {
        incrementUnread(dmSenderId);
      } else if (groupId) {
        incrementUnread(`group:${groupId}`);
      }

      // ── Déchiffrer si nécessaire ─────────────────────────────────────────
      const senderName =
        payload.authorName || payload.senderName || 'Nouveau message';
      let rawContent: string = payload.content || '';

      if (payload.e2eeType && senderId && myId && rawContent.startsWith('ecdh:')) {
        try {
          rawContent = await signalService.decrypt(
            senderId,
            myId,
            rawContent,
            payload.senderContent,
            payload.e2eeType as 1 | 3,
          );
        } catch {
          // Déchiffrement impossible depuis le hook (session pas encore prête)
          rawContent = '🔒 Nouveau message chiffré';
        }
      }

      const truncated =
        rawContent.length > 80 ? rawContent.substring(0, 80) + '…' : rawContent;

      // ── Toast + son ──────────────────────────────────────────────────────
      toast.message(senderName, {
        description: truncated || undefined,
        duration: 4000,
      });

      // Notification système OS (si l'onglet n'est pas actif ou que le document est masqué)
      showOSNotification(senderName, truncated || undefined);

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
      showOSNotification('Demande d\'ami', `${name} vous a envoyé une demande d'ami`);
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

    // ── Pings en attente au retour en ligne ─────────────────────────────────
    const handlePendingPings = (data: any) => {
      const payload = data?.payload || data;
      if (!payload || typeof payload !== 'object') return;
      const entries = Object.entries(payload) as [string, { count: number; senderName: string }][];
      if (entries.length === 0) return;

      // Incrémenter les badges non-lus et afficher un toast groupé
      let totalCount = 0;
      const senders = new Set<string>();
      for (const [convId, { count, senderName }] of entries) {
        // convId est "dm_{id1}_{id2}" — extraire le recipientId
        const parts = convId.split('_');
        const myId = userIdRef.current;
        const recipientId = parts.find((p) => p !== 'dm' && p !== myId);
        if (recipientId) incrementUnread(recipientId);
        totalCount += count;
        if (senderName) senders.add(senderName);
      }

      const sendersText = Array.from(senders).slice(0, 3).join(', ');
      toast.info(`${totalCount} message${totalCount > 1 ? 's' : ''} manqué${totalCount > 1 ? 's' : ''}`, {
        description: sendersText ? `De : ${sendersText}` : undefined,
        duration: 6000,
      });
      playNotificationSound();
    };

    // ── Nouveau message serveur (salon) ──────────────────────────────────────
    const handleServerMessageNew = (data: any) => {
      const payload = data?.payload || data;
      if (!payload) return;

      const senderId = payload.senderId || payload.authorId;
      const myId = userIdRef.current;

      // Ne pas notifier pour ses propres messages
      if (myId && senderId === myId) return;

      const channelId: string | undefined = payload.channelId || payload.channel_id;
      const serverId: string | undefined = payload.serverId || payload.server_id;
      if (!channelId) return;

      const currentPath = pathnameRef.current;

      // Vérifier si l'utilisateur est dans ce salon
      const isViewing =
        isChannelActive(channelId) ||
        currentPath.includes(channelId);

      if (isViewing) return;

      // Incrémenter le badge non-lu pour le salon et pour le serveur
      incrementUnread(`channel:${channelId}`);
      if (serverId) {
        incrementUnread(`server:${serverId}`);
      }

      const senderName =
        payload.authorName || payload.senderName || payload.sender?.displayName || payload.sender?.username || 'Nouveau message';
      const rawContent: string = payload.content || '';
      const truncated =
        rawContent.length > 80 ? rawContent.substring(0, 80) + '…' : rawContent;

      toast.message(senderName, {
        description: truncated || undefined,
        duration: 4000,
      });

      showOSNotification(senderName, truncated || undefined);
      playNotificationSound();
    };

    // ── Sync multi-appareils : un autre appareil a lu une conversation ────────
    const handleNotificationSync = (data: any) => {
      const payload = data?.payload || data;
      const key: string | undefined = payload?.key;
      if (!key) return;
      clearUnread(key);
    };

    socketService.on('message:new', handleNewMessage);
    socketService.on('SERVER_MESSAGE_NEW', handleServerMessageNew);
    socketService.on('FRIEND_REQUEST', handleFriendRequest);
    socketService.on('FRIEND_ACCEPT', handleFriendAccepted);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('connect', handleReconnect);
    socketService.on('PENDING_PINGS', handlePendingPings);
    socketService.on('NOTIFICATION_SYNC', handleNotificationSync);

    return () => {
      socketService.off('message:new', handleNewMessage);
      socketService.off('SERVER_MESSAGE_NEW', handleServerMessageNew);
      socketService.off('FRIEND_REQUEST', handleFriendRequest);
      socketService.off('FRIEND_ACCEPT', handleFriendAccepted);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('connect', handleReconnect);
      socketService.off('PENDING_PINGS', handlePendingPings);
      socketService.off('NOTIFICATION_SYNC', handleNotificationSync);
    };
  }, [playNotificationSound, showOSNotification]);

  // Nettoyer l'AudioContext à la destruction du composant
  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  // ── Onglet navigateur : afficher le total de messages non-lus ─────────────
  useEffect(() => {
    const BASE_TITLE = 'AlfyChat';
    const originalTitle = document.title || BASE_TITLE;

    const updateTitle = () => {
      const snap = getSnapshot();
      let total = 0;
      snap.unread.forEach((v) => { total += v; });
      document.title = total > 0 ? `(${total > 99 ? '99+' : total}) ${BASE_TITLE}` : BASE_TITLE;
    };

    // Synchroniser le titre quand les badges changent
    const unsub = subscribeNotifications(updateTitle);

    // Remettre le titre de base quand l'onglet reprend le focus
    const handleFocus = () => {
      // Seulement remettre à jour (les badges peuvent encore exister)
      updateTitle();
    };
    window.addEventListener('focus', handleFocus);

    updateTitle();

    return () => {
      unsub();
      window.removeEventListener('focus', handleFocus);
      document.title = originalTitle;
    };
  }, []);

  // ── E2EE History Recovery : répondeur global (actif même si la conv n'est pas ouverte) ──
  useEffect(() => {
    const handleE2EEHistoryRequest = async (data: { requesterId: string; conversationId: string }) => {
      const currentUserId = userIdRef.current;
      if (!currentUserId || !data.conversationId?.startsWith('dm_')) return;
      // Vérifier que cette conversation concerne bien l'utilisateur courant
      if (!data.conversationId.includes(currentUserId)) return;

      console.log('[E2EE Recovery] Demande globale reçue de', data.requesterId, 'pour', data.conversationId);

      try {
        // 1. Récupérer la clé ECDH publique du demandeur
        const bundleRes = await api.getSignalKeyBundle(data.requesterId) as any;
        if (!bundleRes?.success || !bundleRes?.data?.ecdhKey) {
          console.error('[E2EE Recovery] Impossible de récupérer la clé ECDH du demandeur');
          return;
        }
        const requesterECDHKey: string = bundleRes.data.ecdhKey;

        // 2. Extraire l'id de l'autre participant depuis le conversationId (dm_A_B)
        const parts = data.conversationId.replace('dm_', '').split('_');
        const otherUserId = parts.find((p) => p !== currentUserId);
        if (!otherUserId) return;

        // 3. Charger TOUS les messages via API (pagination par 100)
        const rawMessages: any[] = [];
        let before: string | undefined;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const response = await api.getMessages(undefined, otherUserId, 100, before) as any;
          if (!response?.success || !response?.data) break;
          const batch = response.data as any[];
          if (batch.length === 0) break;
          rawMessages.push(...batch);
          if (batch.length < 100) break;
          before = batch[batch.length - 1]?.createdAt;
        }
        if (rawMessages.length === 0) return;

        // 4. Déchiffrer puis rechiffrer avec la clé du demandeur
        const reEncrypted: Array<{ id: string; content: string; senderId: string; createdAt: string }> = [];
        for (const m of rawMessages) {
          if (!m.e2eeType) continue;
          try {
            const senderId = m.senderId || m.authorId;
            const isSender = senderId === currentUserId;
            let plaintext: string | null = null;
            if (isSender && m.senderContent) {
              try { plaintext = await signalService.decryptECDH(m.senderContent.startsWith('ecdh:') ? m.senderContent : `ecdh:${m.senderContent}`); } catch {}
              if (!plaintext) {
                try { plaintext = await (signalService as any).decryptForSelf?.(m.senderContent); } catch {}
              }
            } else {
              try { plaintext = await signalService.decryptECDH(m.content); } catch {}
            }
            if (!plaintext ||
              plaintext.startsWith('[Message non disponible') ||
              plaintext === '[Message chiffré — relecture non disponible]' ||
              plaintext === '🔒 Message chiffré (session non établie)'
            ) continue;
            const encrypted = await signalService.encryptECDH(plaintext, requesterECDHKey);
            reEncrypted.push({ id: m.id, content: encrypted, senderId, createdAt: m.createdAt });
          } catch { /* ignorer */ }
        }

        console.log('[E2EE Recovery] Envoi de', reEncrypted.length, 'messages rechiffrés');
        socketService.sendE2EEHistoryResponse(data.requesterId, data.conversationId, reEncrypted);
      } catch (err) {
        console.error('[E2EE Recovery] Erreur traitement demande globale:', err);
      }
    };

    socketService.on('e2ee:history-request', handleE2EEHistoryRequest);
    return () => socketService.off('e2ee:history-request', handleE2EEHistoryRequest);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
