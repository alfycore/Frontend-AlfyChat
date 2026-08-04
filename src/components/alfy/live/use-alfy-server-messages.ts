'use client';

/**
 * Messages d'un salon de serveur, en temps réel, mappés en types alfy.
 * Porté depuis atelier/chat/ServerChat.tsx.
 *
 * Primitive partagée : ce hook alimente le chat texte **et** les 11 types
 * de salons spéciaux (forum, sondage, galerie…), qui ne diffèrent que par
 * l'interprétation du contenu des messages.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { toAlfyMessage, unwrap } from '@/components/alfy/live/map';
import type { AlfyMessage } from '@/components/alfy/mock/types';

/** Taille d'un lot d'historique — vaut aussi comme seuil « il en reste ». */
const PAGE_SIZE = 50;
/** Au-delà, on considère que le STOP de frappe s'est perdu. */
const TYPING_TTL_MS = 8000;

export interface AlfyServerMessages {
  messages: AlfyMessage[];
  /** Messages bruts — nécessaires aux vues spéciales qui parsent leur payload. */
  raw: Record<string, unknown>[];
  isLoading: boolean;
  /** Échec du chargement de l'historique (node injoignable, permission…). */
  error: string | null;
  /** D'autres messages plus anciens restent à charger. */
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: () => Promise<void>;
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
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const [typing, setTyping] = useState<Record<string, string>>({});

  const idOf = (m: Record<string, unknown>) => m.id as string;
  const typingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  /* Historique + abonnement au salon */
  useEffect(() => {
    if (!serverId || !channelId) {
      setRaw([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setHasMore(false);
    socketService.requestMessageHistory(serverId, channelId, { limit: PAGE_SIZE }, (res: unknown) => {
      const d = res as { messages?: unknown[]; error?: string } | unknown[];
      const echec = !Array.isArray(d) ? d?.error : undefined;
      const list = (Array.isArray(d) ? d : (d?.messages ?? [])) as Record<string, unknown>[];
      setRaw(list);
      setError(echec ?? null);
      // Un lot plein laisse supposer qu'il reste de l'historique derrière.
      setHasMore(list.length >= PAGE_SIZE);
      setLoading(false);
    });
    socketService.joinChannel(channelId);
    return () => socketService.leaveChannel(channelId);
  }, [serverId, channelId]);

  /** Charge le lot suivant, plus ancien que le message le plus ancien connu. */
  const loadMore = useCallback(async () => {
    if (!serverId || !channelId || !hasMore || loadingMoreRef.current) return;
    const plusAncien = raw[0];
    if (!plusAncien) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    await new Promise<void>((resolve) => {
      socketService.requestMessageHistory(
        serverId,
        channelId,
        { limit: PAGE_SIZE, before: idOf(plusAncien) },
        (res: unknown) => {
          const d = res as { messages?: unknown[]; error?: string } | unknown[];
          const list = (Array.isArray(d) ? d : (d?.messages ?? [])) as Record<string, unknown>[];
          if (list.length > 0) {
            setRaw((prev) => {
              const connus = new Set(prev.map(idOf));
              return [...list.filter((m) => !connus.has(idOf(m))), ...prev];
            });
          }
          setHasMore(list.length >= PAGE_SIZE);
          setLoadingMore(false);
          loadingMoreRef.current = false;
          resolve();
        },
      );
    });
  }, [serverId, channelId, hasMore, raw]);

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
    // La passerelle diffuse un *delta* ({messageId, userId, emoji, action}), pas
    // l'état complet : on recompose la liste `userIds` du message concerné.
    const onReaction = (data: unknown) => {
      const d = unwrap(data);
      const id = (d.messageId ?? d.id) as string | undefined;
      const emoji = d.emoji as string | undefined;
      const auteur = d.userId as string | undefined;
      if (!id || !emoji || !auteur) return;
      const ajout = d.action !== 'remove';

      setRaw((prev) =>
        prev.map((x) => {
          if (idOf(x) !== id) return x;
          const actuelles = Array.isArray(x.reactions)
            ? (x.reactions as Record<string, unknown>[])
            : [];
          let trouvee = false;
          const suivantes = actuelles.flatMap((r) => {
            if (r.emoji !== emoji) return [r];
            trouvee = true;
            const ids = new Set(((r.userIds ?? r.user_ids) as string[] | undefined) ?? []);
            if (ajout) ids.add(auteur);
            else ids.delete(auteur);
            // Plus personne sur cet emoji → la réaction disparaît.
            if (ids.size === 0) return [];
            return [{ ...r, userIds: [...ids], count: ids.size }];
          });
          if (!trouvee && ajout) suivantes.push({ emoji, userIds: [auteur], count: 1 });
          return { ...x, reactions: suivantes };
        }),
      );
    };
    const onTypingStart = (data: unknown) => {
      const d = unwrap(data);
      const id = (d.userId ?? d.id) as string | undefined;
      if (!id || id === meId) return;
      const name = (d.displayName ?? d.username ?? 'Quelqu’un') as string;
      setTyping((t) => ({ ...t, [id]: name }));
      // Filet de sécurité : si le STOP se perd (onglet fermé, paquet manqué),
      // l'indicateur resterait affiché indéfiniment.
      const ancien = typingTimers.current.get(id);
      if (ancien) clearTimeout(ancien);
      typingTimers.current.set(
        id,
        setTimeout(() => {
          typingTimers.current.delete(id);
          setTyping((t) => {
            const next = { ...t };
            delete next[id];
            return next;
          });
        }, TYPING_TTL_MS),
      );
    };
    const onTypingStop = (data: unknown) => {
      const d = unwrap(data);
      const id = (d.userId ?? d.id) as string | undefined;
      if (!id) return;
      const timer = typingTimers.current.get(id);
      if (timer) {
        clearTimeout(timer);
        typingTimers.current.delete(id);
      }
      setTyping((t) => {
        const next = { ...t };
        delete next[id];
        return next;
      });
    };

    socketService.on('SERVER_MESSAGE_NEW', onNew);
    socketService.on('SERVER_MESSAGE_EDITED', onEdited);
    socketService.on('SERVER_MESSAGE_DELETED', onDeleted);
    socketService.on('SERVER_REACTION_UPDATE', onReaction);
    socketService.on('SERVER_TYPING_START', onTypingStart);
    socketService.on('SERVER_TYPING_STOP', onTypingStop);
    const timers = typingTimers.current;
    return () => {
      socketService.off('SERVER_MESSAGE_NEW', onNew);
      socketService.off('SERVER_MESSAGE_EDITED', onEdited);
      socketService.off('SERVER_MESSAGE_DELETED', onDeleted);
      socketService.off('SERVER_REACTION_UPDATE', onReaction);
      socketService.off('SERVER_TYPING_START', onTypingStart);
      socketService.off('SERVER_TYPING_STOP', onTypingStop);
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
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
    error,
    hasMore,
    isLoadingMore,
    loadMore,
    typingNames: Object.values(typing),
    send,
    edit,
    remove,
    toggleReaction,
    notifyTyping,
  };
}
