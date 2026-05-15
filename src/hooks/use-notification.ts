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
  incrementMention,
  setUnreadCount,
  setMentionCount,
  clearAll,
  subscribe as subscribeNotifications,
  getSnapshot,
  setStorageNamespace,
  getLevel,
  pushHistory,
  loadChannelSettings,
  type NotifLevel,
  type NotificationEntry,
} from '@/lib/notification-store';
import { v4 as uuidv4 } from 'uuid';
import { subscribePush } from '@/lib/push-service';

// ── Helpers utilitaires ───────────────────────────────────────────────────────

interface UserPrefs {
  notificationsSound?: boolean;
  notificationsDesktop?: boolean;
  notificationsDm?: boolean;
  notificationsMentions?: boolean;
  dndEnabled?: boolean;
  notifKeywords?: string[];
  quietStart?: string;
  quietEnd?: string;
}

/**
 * Retourne true si le mode DND est actif (toggle ou plage horaire).
 */
export function isDNDActive(prefs: UserPrefs): boolean {
  if (prefs.dndEnabled) return true;
  if (prefs.quietStart && prefs.quietEnd) {
    const now = new Date();
    const hhmm = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = prefs.quietStart.split(':').map(Number);
    const [eh, em] = prefs.quietEnd.split(':').map(Number);
    const start = sh * 60 + sm;
    const end   = eh * 60 + em;
    if (start <= end) return hhmm >= start && hhmm < end;
    // Plage qui franchit minuit (ex : 22:00 → 08:00)
    return hhmm >= start || hhmm < end;
  }
  return false;
}

/**
 * Retourne true si le contenu correspond à un mot-clé surveillé.
 */
function matchesKeyword(content: string, keywords: string[]): boolean {
  if (!keywords.length || !content) return false;
  const lower = content.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

// ── Hook principal ────────────────────────────────────────────────────────────

export function useNotification() {
  const pathname    = usePathname();
  const pathnameRef = useRef(pathname);
  const { user }    = useAuth();
  const userIdRef   = useRef<string | null>(user?.id ?? null);
  const prefsRef    = useRef<UserPrefs>({});

  const audioCtxRef = useRef<AudioContext | null>(null);
  const seenIdsRef  = useRef<Set<string>>(new Set());

  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);
  useEffect(() => { userIdRef.current = user?.id ?? null; }, [user?.id]);

  // Namespace localStorage + chargement des préférences et paramètres de canal
  useEffect(() => {
    if (!user?.id) return;
    setStorageNamespace(user.id);

    // Charger les préférences utilisateur
    api.getPreferences(user.id).then((res: any) => {
      if (res?.success && res?.data) {
        const p = res.data as any;
        prefsRef.current = {
          notificationsSound:   p.notifications_sound   ?? p.notificationsSound   ?? true,
          notificationsDesktop: p.notifications_desktop ?? p.notificationsDesktop ?? true,
          notificationsDm:      p.notifications_dm      ?? p.notificationsDm      ?? true,
          notificationsMentions:p.notifications_mentions?? p.notificationsMentions?? true,
          dndEnabled:           p.dnd_enabled           ?? p.dndEnabled           ?? false,
          notifKeywords:        Array.isArray(p.notif_keywords)  ? p.notif_keywords  :
                                Array.isArray(p.notifKeywords)   ? p.notifKeywords   : [],
          quietStart:           p.quiet_start ?? p.quietStart ?? undefined,
          quietEnd:             p.quiet_end   ?? p.quietEnd   ?? undefined,
        };
      }
    }).catch(() => {});

    // Charger les paramètres de notification par canal
    api.get('/api/messages/notifications/settings').then((res: any) => {
      if (res?.success && res?.data && typeof res.data === 'object') {
        const settings: Record<string, NotifLevel> = {};
        for (const [targetId, val] of Object.entries(res.data as Record<string, any>)) {
          if (val?.level) settings[targetId] = val.level as NotifLevel;
        }
        loadChannelSettings(settings);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Demander la permission OS + activer Web Push au montage (seulement si prefs.notificationsDesktop)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    // Tenter la souscription Web Push (silencieuse si déjà souscrit ou refusé)
    subscribePush().catch(() => {});
  }, []);

  // ── Sons ───────────────────────────────────────────────────────────────────

  const playMessageSound = useCallback(() => {
    if (!prefsRef.current.notificationsSound) return;
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const playBeep = (t: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.start(t); osc.stop(t + 0.18);
      };
      const now = ctx.currentTime;
      playBeep(now, 880);
      playBeep(now + 0.22, 1100);
    } catch { /* AudioContext non dispo */ }
  }, []);

  const playMentionSound = useCallback(() => {
    if (!prefsRef.current.notificationsSound) return;
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const playNote = (t: number, freq: number, dur: number, vol = 0.18) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.start(t); osc.stop(t + dur);
      };
      // Accord aigu à 3 notes — plus reconnaissable que le son message
      const now = ctx.currentTime;
      playNote(now,        1320, 0.12);
      playNote(now + 0.14, 1760, 0.12);
      playNote(now + 0.28, 2093, 0.20);
    } catch { /* AudioContext non dispo */ }
  }, []);

  // ── OS Notification ────────────────────────────────────────────────────────

  const showOSNotification = useCallback((title: string, body?: string, isMention = false) => {
    if (!prefsRef.current.notificationsDesktop) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      const n = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: isMention ? 'alfychat-mention' : 'alfychat-msg',
        requireInteraction: isMention,
      } as NotificationOptions);
      if (!isMention) setTimeout(() => n.close(), 6000);
    } catch { /* ignore */ }
  }, []);

  // ── Déduplication ─────────────────────────────────────────────────────────

  function dedup(msgId: string | undefined): boolean {
    if (!msgId) return false;
    if (seenIdsRef.current.has(msgId)) return true;
    seenIdsRef.current.add(msgId);
    setTimeout(() => seenIdsRef.current.delete(msgId), 10_000);
    return false;
  }

  // ── Pipeline de notification ──────────────────────────────────────────────

  /**
   * Traite un message entrant et décide quoi faire selon :
   * - Si l'utilisateur voit la conversation → rien
   * - Paramètre du canal (all / mentions / nothing)
   * - DND + quiet hours
   * - Type (mention vs message)
   * - Mots-clés déclencheurs
   */
  function processMessage(opts: {
    conversationKey: string;
    senderId?: string;
    senderName: string;
    senderAvatar?: string;
    preview: string;
    channelName?: string;
    serverName?: string;
    type: 'message' | 'mention';
    isViewing: boolean;
  }) {
    const {
      conversationKey, senderId, senderName, senderAvatar,
      preview, channelName, serverName, type, isViewing,
    } = opts;

    if (isViewing) return;

    // Paramètre du canal
    const targetId = conversationKey.startsWith('channel:')
      ? conversationKey.replace('channel:', '')
      : conversationKey.startsWith('group:')
      ? conversationKey.replace('group:', '')
      : senderId ?? '';
    const level = getLevel(targetId) as NotifLevel;
    if (level === 'nothing') return;

    const prefs = prefsRef.current;
    const isMention = type === 'mention';
    const keywordMatch = matchesKeyword(preview, prefs.notifKeywords ?? []);
    const effectiveMention = isMention || keywordMatch;

    if (level === 'mentions' && !effectiveMention) return;

    const dnd = isDNDActive(prefs);
    if (dnd && !effectiveMention) return;

    // Incrémenter le bon compteur
    if (effectiveMention) {
      incrementMention(conversationKey);
      // Incrémenter aussi le serveur parent pour les channels
      if (conversationKey.startsWith('channel:')) {
        const channelId = conversationKey.replace('channel:', '');
        // Chercher le serverId dans le path ou on l'ajoute dans une prochaine passe
        // Pour l'instant le server badge unread est géré via handleServerMessageNew
      }
    } else {
      incrementUnread(conversationKey);
    }

    // Historique
    const entry: NotificationEntry = {
      id: uuidv4(),
      type: effectiveMention ? 'mention' : 'message',
      conversationKey,
      senderId,
      senderName,
      senderAvatar,
      preview,
      channelName,
      serverName,
      timestamp: new Date().toISOString(),
      read: false,
    };
    pushHistory(entry);

    // Son
    if (effectiveMention) playMentionSound();
    else playMessageSound();

    // Toast
    const toastTitle = effectiveMention
      ? `@Mention — ${senderName}`
      : senderName;
    const toastDesc = channelName ? `#${channelName}  ${preview}` : preview || undefined;

    if (effectiveMention) {
      toast(toastTitle, {
        description: toastDesc,
        duration: 6000,
        style: { borderLeft: '3px solid #7c3aed' },
      });
    } else {
      toast.message(toastTitle, { description: toastDesc, duration: 4000 });
    }

    // OS notification
    showOSNotification(toastTitle, toastDesc, effectiveMention);
  }

  // ── Handlers Socket.IO ────────────────────────────────────────────────────

  useEffect(() => {

    // ── DM / groupe : message:new ──────────────────────────────────────────
    const handleNewMessage = async (data: any) => {
      const payload = data?.payload || data;
      if (!payload) return;
      if (dedup(payload.id || payload.messageId)) return;

      const senderId = payload.senderId || payload.authorId;
      const myId = userIdRef.current;
      if (myId && senderId === myId) return;

      const convId: string | undefined = payload.conversationId;
      const groupId: string | undefined =
        payload.groupId ||
        payload.channelId ||
        (!payload.recipientId && convId && !convId.startsWith('dm_') ? convId : undefined);
      const currentPath = pathnameRef.current;
      let conversationKey: string;
      let isViewing: boolean;

      if (!groupId && senderId) {
        conversationKey = senderId;
        isViewing = isDMActive(senderId) || currentPath.includes(`/channels/me/${senderId}`);
        if (!prefsRef.current.notificationsDm) return;
      } else if (groupId) {
        conversationKey = `group:${groupId}`;
        isViewing = isGroupActive(groupId) || currentPath.includes(groupId);
      } else return;

      // Déchiffrement optionnel pour le preview
      let content: string = payload.content || '';
      if (payload.e2eeType && senderId && myId && content.startsWith('ecdh:')) {
        try {
          content = await signalService.decrypt(senderId, myId, content, payload.senderContent, payload.e2eeType as 1 | 3);
        } catch { content = '🔒 Nouveau message chiffré'; }
      }
      const preview = content.length > 80 ? content.substring(0, 80) + '…' : content;
      const senderName = payload.authorName || payload.senderName || 'Nouveau message';

      processMessage({
        conversationKey,
        senderId,
        senderName,
        preview,
        type: 'message',
        isViewing,
      });
    };

    // ── Message serveur : SERVER_MESSAGE_NEW ──────────────────────────────
    const handleServerMessageNew = (data: any) => {
      const payload = data?.payload || data;
      if (!payload) return;
      if (dedup(payload.id || payload.messageId)) return;

      const senderId = payload.senderId || payload.authorId;
      const myId = userIdRef.current;
      if (myId && senderId === myId) return;

      const channelId: string | undefined = payload.channelId || payload.channel_id;
      const serverId:  string | undefined = payload.serverId  || payload.server_id;
      if (!channelId) return;

      const currentPath = pathnameRef.current;
      const isViewing = isChannelActive(channelId) || currentPath.includes(channelId);

      const conversationKey = `channel:${channelId}`;
      const senderName = payload.authorName || payload.senderName || payload.sender?.displayName || 'Nouveau message';
      const rawContent: string = payload.content || '';
      const preview = rawContent.length > 80 ? rawContent.substring(0, 80) + '…' : rawContent;

      // Badge serveur — incrémenter unread (les mentions sont gérées séparément via MENTION_NOTIFY)
      if (!isViewing) {
        if (serverId) incrementUnread(`server:${serverId}`);
      }

      processMessage({
        conversationKey,
        senderId,
        senderName,
        preview,
        channelName: payload.channelName,
        type: 'message',
        isViewing,
      });
    };

    // ── Mention temps réel : MENTION_NOTIFY ───────────────────────────────
    const handleMentionNotify = (data: any) => {
      const payload = data?.payload || data;
      if (!payload) return;

      const conversationKey: string = payload.conversationKey || (payload.channelId ? `channel:${payload.channelId}` : '');
      if (!conversationKey) return;

      const currentPath = pathnameRef.current;
      let isViewing = false;
      if (conversationKey.startsWith('channel:')) {
        const chId = conversationKey.replace('channel:', '');
        isViewing = isChannelActive(chId) || currentPath.includes(chId);
      } else if (conversationKey.startsWith('group:')) {
        const grId = conversationKey.replace('group:', '');
        isViewing = isGroupActive(grId) || currentPath.includes(grId);
      }

      processMessage({
        conversationKey,
        senderId:    payload.senderId,
        senderName:  payload.senderName || 'Mention',
        senderAvatar: payload.senderAvatar,
        preview:     payload.preview || '',
        channelName: payload.channelName,
        type: 'mention',
        isViewing,
      });

      // Badge serveur pour les mentions
      if (payload.serverId && !isViewing) {
        incrementMention(`server:${payload.serverId}`);
      }
    };

    // ── Demande d'ami ─────────────────────────────────────────────────────
    const handleFriendRequest = (data: any) => {
      const payload = data?.payload || data;
      const name = payload?.fromUsername || payload?.username || 'Quelqu\'un';
      toast.info('Demande d\'ami', {
        description: `${name} vous a envoyé une demande d'ami`,
        duration: 5000,
      });
      showOSNotification('Demande d\'ami', `${name} vous a envoyé une demande d'ami`);
      playMessageSound();
      pushHistory({
        id: uuidv4(), type: 'friend_request', conversationKey: `dm:${payload?.fromId ?? ''}`,
        senderName: name, preview: "Demande d'ami", timestamp: new Date().toISOString(), read: false,
      });
    };

    // ── Ami accepté ───────────────────────────────────────────────────────
    const handleFriendAccepted = (data: any) => {
      const payload = data?.payload || data;
      const name = payload?.username || payload?.displayName || 'Un utilisateur';
      toast.success('Ami ajouté !', { description: `${name} a accepté votre demande d'ami`, duration: 4000 });
      pushHistory({
        id: uuidv4(), type: 'friend_accept', conversationKey: `dm:${payload?.id ?? ''}`,
        senderName: name, preview: "A accepté votre demande", timestamp: new Date().toISOString(), read: false,
      });
    };

    // ── Connexion / déconnexion ──────────────────────────────────────────
    const handleDisconnect = () => {
      toast.error('Déconnecté', { description: 'Connexion perdue. Reconnexion…', duration: 5000 });
    };
    const handleReconnect = () => {
      toast.success('Reconnecté', { description: 'Connexion rétablie', duration: 3000 });
    };

    // ── Pings en attente (retour en ligne) ────────────────────────────────
    const handlePendingPings = (data: any) => {
      const payload = data?.payload || data;
      if (!payload || typeof payload !== 'object') return;
      const entries = Object.entries(payload) as [string, { count: number; senderName: string; type?: string }][];
      const myId = userIdRef.current;

      // Construire un Set des clés normalisées présentes dans PENDING_PINGS
      // afin de remettre à zéro les clés non-serveur absentes (données stale localStorage)
      const pingSeen = new Set<string>();

      let totalCount = 0;
      const senders = new Set<string>();

      for (const [convId, { count, senderName, type }] of entries) {
        if (!convId) continue;
        let key: string | null = null;

        if (convId.startsWith('group:') || convId.startsWith('channel:')) {
          key = convId;
        } else if (convId.startsWith('dm_')) {
          const parts = convId.split('_');
          const rid = parts.find((p) => p !== 'dm' && p !== myId);
          if (rid) key = rid;
        } else {
          key = convId;
        }

        if (!key) continue;
        pingSeen.add(key);

        const isActive =
          (key.startsWith('group:')   && isGroupActive(key.replace('group:', '')))   ||
          (key.startsWith('channel:') && isChannelActive(key.replace('channel:', ''))) ||
          (!key.startsWith('group:') && !key.startsWith('channel:') && isDMActive(key));

        if (!isActive) {
          // SET (pas increment) — PENDING_PINGS est la source de vérité du backend.
          // Additionner sur le localStorage déjà chargé causerait du double-comptage.
          if (type === 'mention') {
            setMentionCount(key, count);
          } else {
            setUnreadCount(key, count);
          }
          // Ne comptabiliser que les convs non-actives pour le toast
          totalCount += count;
          if (senderName) senders.add(senderName);
        }
      }

      // Remettre à zéro les clés DM/group absentes du payload (le backend dit 0 pour elles)
      const snap = getSnapshot();
      snap.unread.forEach((_, key) => {
        if (key.startsWith('server:') || key.startsWith('channel:')) return;
        if (!pingSeen.has(key)) setUnreadCount(key, 0);
      });
      snap.mentions.forEach((_, key) => {
        if (key.startsWith('server:') || key.startsWith('channel:')) return;
        if (!pingSeen.has(key)) setMentionCount(key, 0);
      });

      if (totalCount > 0) {
        const sendersText = Array.from(senders).slice(0, 3).join(', ');
        toast.info(`${totalCount} message${totalCount > 1 ? 's' : ''} manqué${totalCount > 1 ? 's' : ''}`, {
          description: sendersText ? `De : ${sendersText}` : undefined,
          duration: 6000,
        });
        playMessageSound();
      }
    };

    // ── Sync multi-appareils ──────────────────────────────────────────────
    const handleNotificationSync = (data: any) => {
      const key: string | undefined = (data?.payload || data)?.key;
      if (key) clearAll(key);
    };

    socketService.on('message:new',          handleNewMessage);
    socketService.on('SERVER_MESSAGE_NEW',   handleServerMessageNew);
    socketService.on('MENTION_NOTIFY',       handleMentionNotify);
    socketService.on('FRIEND_REQUEST',       handleFriendRequest);
    socketService.on('FRIEND_ACCEPT',        handleFriendAccepted);
    socketService.on('disconnect',           handleDisconnect);
    socketService.on('connect',              handleReconnect);
    socketService.on('PENDING_PINGS',        handlePendingPings);
    socketService.on('NOTIFICATION_SYNC',    handleNotificationSync);

    return () => {
      socketService.off('message:new',         handleNewMessage);
      socketService.off('SERVER_MESSAGE_NEW',  handleServerMessageNew);
      socketService.off('MENTION_NOTIFY',      handleMentionNotify);
      socketService.off('FRIEND_REQUEST',      handleFriendRequest);
      socketService.off('FRIEND_ACCEPT',       handleFriendAccepted);
      socketService.off('disconnect',          handleDisconnect);
      socketService.off('connect',             handleReconnect);
      socketService.off('PENDING_PINGS',       handlePendingPings);
      socketService.off('NOTIFICATION_SYNC',   handleNotificationSync);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playMessageSound, playMentionSound, showOSNotification]);

  // Fermer l'AudioContext à la destruction
  useEffect(() => {
    return () => { audioCtxRef.current?.close().catch(() => {}); };
  }, []);

  // ── Titre de l'onglet (total unread + mentions) ───────────────────────────
  useEffect(() => {
    const BASE_TITLE = 'AlfyChat';
    const updateTitle = () => {
      const snap = getSnapshot();
      let total = 0;
      snap.unread.forEach((v) => { total += v; });
      snap.mentions.forEach((v) => { total += v; });
      document.title = total > 0 ? `(${total > 99 ? '99+' : total}) ${BASE_TITLE}` : BASE_TITLE;
    };
    const unsub = subscribeNotifications(updateTitle);
    window.addEventListener('focus', updateTitle);
    updateTitle();
    return () => {
      unsub();
      window.removeEventListener('focus', updateTitle);
    };
  }, []);

  // ── E2EE History Recovery (conservé tel quel) ─────────────────────────────
  useEffect(() => {
    const handleE2EEHistoryRequest = async (data: { requesterId: string; conversationId: string }) => {
      const currentUserId = userIdRef.current;
      if (!currentUserId || !data.conversationId?.startsWith('dm_')) return;
      if (!data.conversationId.includes(currentUserId)) return;

      try {
        const bundleRes = await api.getSignalKeyBundle(data.requesterId) as any;
        if (!bundleRes?.success || !bundleRes?.data?.ecdhKey) return;
        const requesterECDHKey: string = bundleRes.data.ecdhKey;

        const parts = data.conversationId.replace('dm_', '').split('_');
        const otherUserId = parts.find((p) => p !== currentUserId);
        if (!otherUserId) return;

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

        const reEncrypted: Array<{ id: string; content: string; senderId: string; createdAt: string }> = [];
        for (const m of rawMessages) {
          if (!m.e2eeType) continue;
          try {
            const senderId = m.senderId || m.authorId;
            const isSender = senderId === currentUserId;
            let plaintext: string | null = null;
            if (isSender && m.senderContent) {
              try { plaintext = await signalService.decryptECDH(m.senderContent.startsWith('ecdh:') ? m.senderContent : `ecdh:${m.senderContent}`); } catch {}
              if (!plaintext) { try { plaintext = await (signalService as any).decryptForSelf?.(m.senderContent); } catch {} }
            } else {
              try { plaintext = await signalService.decryptECDH(m.content); } catch {}
            }
            if (!plaintext || plaintext.startsWith('[Message non disponible') ||
              plaintext === '[Message chiffré — relecture non disponible]' ||
              plaintext === '🔒 Message chiffré (session non établie)') continue;
            const encrypted = await signalService.encryptECDH(plaintext, requesterECDHKey);
            reEncrypted.push({ id: m.id, content: encrypted, senderId, createdAt: m.createdAt });
          } catch { /* ignorer */ }
        }

        socketService.sendE2EEHistoryResponse(data.requesterId, data.conversationId, reEncrypted);
      } catch { /* non bloquant */ }
    };

    socketService.on('e2ee:history-request', handleE2EEHistoryRequest);
    return () => socketService.off('e2ee:history-request', handleE2EEHistoryRequest);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Fonctions utilitaires pour déclencher des toasts manuellement */
export const notify = {
  success: (title: string, description?: string) => toast.success(title, { description, duration: 3000 }),
  error:   (title: string, description?: string) => toast.error(title,   { description, duration: 5000 }),
  info:    (title: string, description?: string) => toast.info(title,    { description, duration: 4000 }),
  warning: (title: string, description?: string) => toast.warning(title, { description, duration: 4000 }),
  message: (title: string, description?: string) => toast.message(title, { description, duration: 4000 }),
};
