'use client';

/**
 * Container : chat d'un salon de serveur, branché sur les vraies données.
 *
 * Réutilise `DmChat` — le même moteur de fil que les MP/groupes (défilement,
 * regroupement, saisie, épingles/recherche) — plutôt que l'ancien `ChatView`
 * dédié aux serveurs, pour que les trois contextes se comportent et se
 * ressemblent de façon identique. Les différences réelles (pas de
 * chiffrement, identité par salon plutôt que par contact, modération par
 * rôle) sont réduites aux quelques props que `DmChat` expose pour ça.
 */

import { useCallback, useMemo } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { DmChat } from '@/components/alfy/dm/dm-chat';
import { CHANNEL_TYPE_ICONS } from '@/components/alfy/servers/channel-item';
import { UserDirectoryProvider, makeResolver } from '@/components/alfy/user-directory';
import { useAlfyChannels } from '@/components/alfy/live/use-alfy-channels';
import { useAlfyMembers } from '@/components/alfy/live/use-alfy-members';
import { useAlfyServerMessages } from '@/components/alfy/live/use-alfy-server-messages';
import { toAlfyUser } from '@/components/alfy/live/map';
import { PERMISSIONS } from '@/components/alfy/mock/types';
import type { AlfyChannel } from '@/components/alfy/mock/types';
import { useTranslation } from '@/components/locale-provider';

interface AlfyServerChatProps {
  serverId: string;
  channelId: string;
  /** Nom/type connus par la route ; sinon dérivés de la liste des salons. */
  channelName?: string;
  channelType?: string;
}

export function AlfyServerChat({ serverId, channelId, channelName, channelType }: AlfyServerChatProps) {
  const { t, tx } = useTranslation();
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
    notifyTyping,
  } = useAlfyServerMessages(serverId, channelId);

  const meId = user?.id ?? '';

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
        name: channelName ?? t.chat.channelFallbackName,
        type: (channelType as AlfyChannel['type']) ?? 'text',
        categoryId: null,
        unreadCount: 0,
        mentionCount: 0,
      }
    );
  }, [base, channelId, serverId, channelName, channelType]);

  /* Modération : propriétaire ou rôle avec MANAGE_MESSAGES/ADMIN — permet de
     supprimer les messages des autres, pas de les modifier (jamais permis,
     y compris sur Discord). */
  const canManageMessages = useMemo(() => {
    if (!base || !meId) return false;
    if (base.ownerId === meId) return true;
    const moi = members.find((m) => m.userId === meId);
    if (!moi) return false;
    const rolePerms = moi.roleIds
      .map((id) => roles.find((r) => r.id === id)?.permissions ?? 0)
      .reduce((acc, p) => acc | p, 0);
    return (rolePerms & (PERMISSIONS.MANAGE_MESSAGES | PERMISSIONS.ADMIN)) !== 0;
  }, [base, members, roles, meId]);

  const envoyer = useCallback(
    (content: string, replyToId?: string) => send(content, replyToId ? { replyToId } : undefined),
    [send],
  );

  return (
    <UserDirectoryProvider value={resolver}>
      {/* `key` : changer de salon remonte la vue (défilement, brouillon de
          réponse, compteurs) sans logique de remise à zéro dédiée. */}
      <DmChat
        key={channelId}
        conversationId={channelId}
        title={channel.name}
        subtitle={channel.topic}
        headerIcon={CHANNEL_TYPE_ICONS[channel.type]}
        notifTargetType="channel"
        encrypted={false}
        introText={
          channel.type === 'announcement'
            ? <>{t.chat.announcementIntroPrefix}<span className="font-medium text-foreground">#{channel.name}</span>{t.chat.announcementIntroSuffix}</>
            : <>{t.chat.channelIntroPrefix}<span className="font-medium text-foreground">#{channel.name}</span>{t.chat.channelIntroSuffix}</>
        }
        composerPlaceholder={tx(t.chat.composerPlaceholderChannel, { name: channel.name })}
        messages={messages}
        currentUserId={meId}
        typingNames={typingNames}
        isLoading={isLoading}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
        onSend={envoyer}
        onTyping={notifyTyping}
        onToggleReaction={toggleReaction}
        onEditMessage={edit}
        onDeleteMessage={remove}
        canManageMessages={canManageMessages}
        onOpenNav={isMobile ? openSidebar : undefined}
        onToggleMembers={isMobile ? toggleMemberList : toggleMemberListDesktop}
        membersOpen={memberListDesktopVisible}
      />
    </UserDirectoryProvider>
  );
}
