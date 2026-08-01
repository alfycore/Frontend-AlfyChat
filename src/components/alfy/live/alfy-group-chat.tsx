'use client';

/**
 * Container : conversation de groupe, branchée sur `useMessages(groupId)`
 * (même primitive que les DM, E2EE incluse).
 * Remplace atelier/chat/GroupChat.tsx.
 */

import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useMessages } from '@/hooks/use-messages';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { api } from '@/lib/api';
import { ChatView } from '@/components/alfy/chat/chat-view';
import { UserDirectoryProvider, makeResolver } from '@/components/alfy/user-directory';
import { toAlfyMessage, toAlfyUser } from '@/components/alfy/live/map';
import type { AlfyChannel, AlfyUser } from '@/components/alfy/mock/types';

export function AlfyGroupChat({ groupId }: { groupId: string }) {
  const { user } = useAuth();
  const { isMobile, openSidebar } = useMobileNav();
  const [name, setName] = useState('Groupe');
  const [participants, setParticipants] = useState<AlfyUser[]>([]);

  const {
    messages: rawMessages,
    typingUsers,
    isLoading,
    hasMoreMessages,
    isLoadingMoreMessages,
    loadMoreMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
  } = useMessages(groupId);

  /* Métadonnées du groupe (nom + participants) */
  useEffect(() => {
    let cancelled = false;
    api
      .getConversation(groupId)
      .then(async (res) => {
        const data = ((res as { data?: unknown })?.data ?? res) as Record<string, unknown>;
        if (cancelled || !data) return;
        setName((data.name as string) || 'Groupe');

        // `participants` contient déjà les profils complets (userId, username,
        // displayName, avatarUrl…) — pas besoin de re-fetch chaque utilisateur.
        const rawParticipants = (data.participants as Record<string, unknown>[]) ?? [];
        const users = rawParticipants.map((p) => toAlfyUser(p, (p.userId ?? p.id) as string));
        if (!cancelled) setParticipants(users);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const meId = user?.id ?? '';

  const resolver = useMemo(() => {
    const table = new Map<string, AlfyUser>();
    participants.forEach((u) => table.set(u.id, u));
    if (user?.id) table.set(user.id, toAlfyUser(user as unknown as Record<string, unknown>, user.id));
    return makeResolver(table);
  }, [participants, user]);

  const messages = useMemo(
    () =>
      (rawMessages as unknown as Record<string, unknown>[])
        .map((m) => toAlfyMessage(m, meId, groupId))
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
    [rawMessages, meId, groupId],
  );

  const channel: AlfyChannel = {
    id: groupId,
    serverId: '',
    name,
    type: 'text',
    topic: `${participants.length || ''} membres`.trim() || undefined,
    categoryId: null,
    unreadCount: 0,
    mentionCount: 0,
  };

  const toggleReaction = (messageId: string, emoji: string) => {
    const target = messages.find((m) => m.id === messageId);
    if (target?.reactions.some((r) => r.emoji === emoji && r.me)) removeReaction(messageId, emoji);
    else addReaction(messageId, emoji);
  };

  return (
    <UserDirectoryProvider value={resolver}>
      <ChatView
        channel={channel}
        messages={messages}
        currentUserId={meId}
        typingNames={(typingUsers ?? []).map(
          (t: { displayName?: string; username?: string }) => t.displayName ?? t.username ?? 'Quelqu’un',
        )}
        isLoading={isLoading}
        hasMoreMessages={hasMoreMessages}
        isLoadingMoreMessages={isLoadingMoreMessages}
        onLoadMore={loadMoreMessages}
        onSend={(content) => sendMessage(content)}
        onToggleReaction={toggleReaction}
        onEditMessage={editMessage}
        onDeleteMessage={deleteMessage}
        onOpenNav={isMobile ? openSidebar : undefined}
      />
    </UserDirectoryProvider>
  );
}
