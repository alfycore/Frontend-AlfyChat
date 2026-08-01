'use client';

/**
 * Container : conversation privée (DM), branchée sur le vrai hook
 * `useMessages` — qui porte déjà le déchiffrement Signal (flag `e2ee`).
 * Remplace atelier/chat/DmChat.tsx.
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

export function AlfyDmChat({ recipientId }: { recipientId: string }) {
  const { user } = useAuth();
  const { isMobile, openSidebar } = useMobileNav();
  const [recipient, setRecipient] = useState<AlfyUser | null>(null);

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
  } = useMessages(undefined, recipientId);

  /* Profil du destinataire (nom, avatar, présence) */
  useEffect(() => {
    let cancelled = false;
    api
      .getUser(recipientId)
      .then((res) => {
        const data = ((res as { data?: unknown })?.data ?? res) as Record<string, unknown>;
        if (!cancelled && data) setRecipient(toAlfyUser(data, recipientId));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [recipientId]);

  const meId = user?.id ?? '';

  const resolver = useMemo(() => {
    const table = new Map<string, AlfyUser>();
    if (recipient) table.set(recipient.id, recipient);
    if (user?.id) table.set(user.id, toAlfyUser(user as unknown as Record<string, unknown>, user.id));
    return makeResolver(table);
  }, [recipient, user]);

  const messages = useMemo(
    () =>
      (rawMessages as unknown as Record<string, unknown>[])
        .map((m) => toAlfyMessage(m, meId, recipientId))
        .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
    [rawMessages, meId, recipientId],
  );

  const channel: AlfyChannel = {
    id: recipientId,
    serverId: '',
    name: recipient?.displayName ?? 'Conversation',
    type: 'text',
    topic: recipient ? `Conversation privée avec @${recipient.username}` : undefined,
    categoryId: null,
    unreadCount: 0,
    mentionCount: 0,
  };

  const toggleReaction = (messageId: string, emoji: string) => {
    const target = messages.find((m) => m.id === messageId);
    const mine = target?.reactions.some((r) => r.emoji === emoji && r.me);
    if (mine) removeReaction(messageId, emoji);
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
