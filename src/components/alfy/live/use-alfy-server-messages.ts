'use client';

/**
 * Messages d'un salon de serveur, en temps réel, mappés en types alfy.
 * Porté depuis atelier/chat/ServerChat.tsx.
 *
 * Primitive partagée : ce hook alimente le chat texte **et** les 11 types
 * de salons spéciaux (forum, sondage, galerie…), qui ne diffèrent que par
 * l'interprétation du contenu des messages.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { toAlfyMessage, unwrap } from '@/components/alfy/live/map';
import type { AlfyMessage } from '@/components/alfy/mock/types';

export interface AlfyServerMessages {
  messages: AlfyMessage[];
  /** Messages bruts — nécessaires aux vues spéciales qui parsent leur payload. */
  raw: Record<string, unknown>[];
  isLoading: boolean;
  typingNames: string[];
  send: (content: string, opts?: { replyToId?: string; attachments?: string[] }) => void;
  edit: (messageId: string, content: string) => void;
  remove: (messageId: string) => void;
  toggleReaction: (messageId: string, emoji: string) => void;
  notifyTyping: () => void;
}

export function useAlfyServerMessages(
  serverId: string | null,
  channelId: string | null,
): AlfyServerMessages {
  const { user } = useAuth();
  const meId = user?.id ?? '';
  const [raw, setRaw] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [typing, setTyping] = useState<Record<string, string>>({});

  const idOf = (m: Record<string, unknown>) => m.id as string;

  /* Historique + abonnement au salon */
  useEffect(() => {
    if (!serverId || !channelId) {
      setRaw([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    socketService.requestMessageHistory(serverId, channelId, { limit: 50 }, (res: unknown) => {
      const d = res as { messages?: unknown[] } | unknown[];
      const list = (Array.isArray(d) ? d : (d?.messages ?? [])) as Record<string, unknown>[];
      setRaw(list);
      setLoading(false);
    });
    socketService.joinChannel(channelId);
    return () => socketService.leaveChannel(channelId);
  }, [serverId, channelId]);

  /* Temps réel */
  useEffect(() => {
    if (!serverId || !channelId) return;

    const sameChannel = (m: Record<string, unknown>) =>
      (m.channelId ?? m.channel_id) === channelId;

    const onNew = (data: unknown) => {
      const m = unwrap(data);
      if (!sameChannel(m)) return;
      setRaw((prev) => (prev.some((x) => idOf(x) === idOf(m)) ? prev : [...prev, m]));
    };
    const onEdited = (data: unknown) => {
      const m = unwrap(data);
      setRaw((prev) => prev.map((x) => (idOf(x) === idOf(m) ? { ...x, ...m } : x)));
    };
    const onDeleted = (data: unknown) => {
      const d = unwrap(data);
      const id = (d.messageId ?? d.id) as string | undefined;
      if (id) setRaw((prev) => prev.filter((x) => idOf(x) !== id));
    };
    const onReaction = (data: unknown) => {
      const d = unwrap(data);
      const id = (d.messageId ?? d.id) as string | undefined;
      if (!id) return;
      // La passerelle renvoie l'état complet des réactions du message.
      setRaw((prev) =>
        prev.map((x) => (idOf(x) === id ? { ...x, reactions: d.reactions ?? x.reactions } : x)),
      );
    };
    const onTypingStart = (data: unknown) => {
      const d = unwrap(data);
      const id = (d.userId ?? d.id) as string | undefined;
      if (!id || id === meId) return;
      const name = (d.displayName ?? d.username ?? 'Quelqu’un') as string;
      setTyping((t) => ({ ...t, [id]: name }));
    };
    const onTypingStop = (data: unknown) => {
      const d = unwrap(data);
      const id = (d.userId ?? d.id) as string | undefined;
      if (!id) return;
      setTyping((t) => {
        const next = { ...t };
        delete next[id];
        return next;
      });
    };

    socketService.on('SERVER_MESSAGE_NEW', onNew);
    socketService.on('SERVER_MESSAGE_EDITED', onEdited);
    socketService.on('SERVER_MESSAGE_DELETED', onDeleted);
    socketService.on('SERVER_REACTION_ADD', onReaction);
    socketService.on('SERVER_REACTION_REMOVE', onReaction);
    socketService.on('SERVER_TYPING_START', onTypingStart);
    socketService.on('SERVER_TYPING_STOP', onTypingStop);
    return () => {
      socketService.off('SERVER_MESSAGE_NEW', onNew);
      socketService.off('SERVER_MESSAGE_EDITED', onEdited);
      socketService.off('SERVER_MESSAGE_DELETED', onDeleted);
      socketService.off('SERVER_REACTION_ADD', onReaction);
      socketService.off('SERVER_REACTION_REMOVE', onReaction);
      socketService.off('SERVER_TYPING_START', onTypingStart);
      socketService.off('SERVER_TYPING_STOP', onTypingStop);
    };
  }, [serverId, channelId, meId]);

  const messages = useMemo(
    () =>
      raw
        .map((m) => toAlfyMessage(m, meId, channelId ?? ''))
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
    [raw, meId, channelId],
  );

  const send = useCallback(
    (content: string, opts?: { replyToId?: string; attachments?: string[] }) => {
      if (!serverId || !channelId || !content.trim()) return;
      socketService.sendServerMessage({
        serverId,
        channelId,
        content,
        replyToId: opts?.replyToId,
        attachments: opts?.attachments,
      });
    },
    [serverId, channelId],
  );

  const edit = useCallback(
    (messageId: string, content: string) => {
      if (serverId && channelId) socketService.editServerMessage(serverId, messageId, content, channelId);
    },
    [serverId, channelId],
  );

  const remove = useCallback(
    (messageId: string) => {
      if (serverId && channelId) socketService.deleteServerMessage(serverId, messageId, channelId);
    },
    [serverId, channelId],
  );

  const toggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!serverId || !channelId) return;
      const target = messages.find((m) => m.id === messageId);
      const hasReacted = target?.reactions.some((r) => r.emoji === emoji && r.me) ?? false;
      socketService.toggleServerReaction(serverId, channelId, messageId, emoji, hasReacted);
    },
    [serverId, channelId, messages],
  );

  const notifyTyping = useCallback(() => {
    if (serverId && channelId) socketService.startServerTyping(serverId, channelId);
  }, [serverId, channelId]);

  return {
    messages,
    raw,
    isLoading,
    typingNames: Object.values(typing),
    send,
    edit,
    remove,
    toggleReaction,
    notifyTyping,
  };
}
