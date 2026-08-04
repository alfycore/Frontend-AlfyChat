'use client';

/**
 * Container : chat d'un salon de serveur, branché sur les vraies données.
 * Remplace atelier/chat/ServerChat.tsx.
 */

import { useMemo } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { ChatView } from '@/components/alfy/chat/chat-view';
import { UserDirectoryProvider, makeResolver } from '@/components/alfy/user-directory';
import { useAlfyChannels } from '@/components/alfy/live/use-alfy-channels';
import { useAlfyMembers } from '@/components/alfy/live/use-alfy-members';
import { useAlfyServerMessages } from '@/components/alfy/live/use-alfy-server-messages';
import { toAlfyUser } from '@/components/alfy/live/map';
import type { AlfyChannel, AlfyServer } from '@/components/alfy/mock/types';

interface AlfyServerChatProps {
  serverId: string;
  channelId: string;
  /** Nom/type connus par la route ; sinon dérivés de la liste des salons. */
  channelName?: string;
  channelType?: string;
}

export function AlfyServerChat({ serverId, channelId, channelName, channelType }: AlfyServerChatProps) {
  const { user } = useAuth();
  const { isMobile, openSidebar, toggleMemberList, toggleMemberListDesktop, memberListDesktopVisible } =
    useMobileNav();
  const base = useAlfyChannels(serverId);
  const { members, roles, users } = useAlfyMembers(serverId);
  const {
    messages,
    isLoading,
    hasMore,
    isLoadingMore,
    loadMore,
    typingNames,
    send,
    edit,
    remove,
    toggleReaction,
  } = useAlfyServerMessages(serverId, channelId);

  const resolver = useMemo(() => {
    const table = new Map(users);
    if (user?.id) table.set(user.id, toAlfyUser(user as unknown as Record<string, unknown>, user.id));
    return makeResolver(table);
  }, [users, user]);

  const channel: AlfyChannel = useMemo(() => {
    const found = base?.channels.find((c) => c.id === channelId);
    return (
      found ?? {
        id: channelId,
        serverId,
        name: channelName ?? 'salon',
        type: (channelType as AlfyChannel['type']) ?? 'text',
        categoryId: null,
        unreadCount: 0,
        mentionCount: 0,
      }
    );
  }, [base, channelId, serverId, channelName, channelType]);

  // Le serveur transmis au chat porte membres + rôles (mentions, couleurs).
  const server: AlfyServer | undefined = useMemo(
    () => (base ? { ...base, members, roles } : undefined),
    [base, members, roles],
  );

  return (
    <UserDirectoryProvider value={resolver}>
      <ChatView
        channel={channel}
        messages={messages}
        server={server}
        currentUserId={user?.id ?? ''}
        typingNames={typingNames}
        isLoading={isLoading}
        hasMoreMessages={hasMore}
        isLoadingMoreMessages={isLoadingMore}
        onLoadMore={loadMore}
        onSend={(content) => send(content)}
        onToggleReaction={toggleReaction}
        onEditMessage={edit}
        onDeleteMessage={remove}
        onToggleMembers={isMobile ? toggleMemberList : toggleMemberListDesktop}
        membersOpen={memberListDesktopVisible}
        onOpenNav={openSidebar}
      />
    </UserDirectoryProvider>
  );
}
