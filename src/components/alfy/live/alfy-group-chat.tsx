'use client';

/**
 * Container : conversation de groupe.
 *
 * Branche `useMessages(groupId)` (même primitive que les MP, E2EE incluse)
 * sur `DmChat` — le même moteur de fil sert les deux, un groupe n'étant qu'une
 * conversation dont l'identité est un nom + plusieurs membres plutôt qu'un
 * contact unique.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/use-auth';
import { useCallContext } from '@/hooks/use-call-context';
import { useMessages } from '@/hooks/use-messages';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { DmChat } from '@/components/alfy/dm/dm-chat';
import { GroupSettingsModal, type GroupMember, type GroupRole } from '@/components/alfy/dm/group-settings-modal';
import { ConversationCallStage } from '@/components/alfy/calls/call-stage';
import { UserDirectoryProvider, makeResolver } from '@/components/alfy/user-directory';
import { toAlfyMessage, toAlfyUser } from '@/components/alfy/live/map';
import type { AlfyUser } from '@/components/alfy/mock/types';
import { useTranslation } from '@/components/locale-provider';

interface GroupInfo {
  name: string;
  avatarUrl?: string;
  /** Faux = seul le propriétaire peut ajouter des membres. */
  isOpen: boolean;
  participants: AlfyUser[];
  members: GroupMember[];
}

export function AlfyGroupChat({ groupId }: { groupId: string }) {
  const { t, tx } = useTranslation();
  const GROUP_VIDE: GroupInfo = { name: t.chat.groupFallbackName, isOpen: true, participants: [], members: [] };
  const { user } = useAuth();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const { isMobile, openSidebar } = useMobileNav();
  const { initiateGroupCall } = useCallContext();

  /* Mémorisé avec l'id auquel il correspond : jamais d'affichage du groupe
     précédent pendant que le nouveau charge. */
  const [chargee, setChargee] = useState<{ id: string; info: GroupInfo } | null>(null);
  const { name, avatarUrl, isOpen, participants, members } = chargee?.id === groupId ? chargee.info : GROUP_VIDE;
  /* Incrémenté à chaque écho de GROUP_UPDATE / ajout / retrait : relance la lecture. */
  const [version, setVersion] = useState(0);

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
    startTyping,
  } = useMessages(groupId);

  /* Métadonnées du groupe (nom, avatar, participants) */
  useEffect(() => {
    let annule = false;
    api
      .getConversation(groupId)
      .then((res) => {
        const data = ((res as { data?: unknown })?.data ?? res) as Record<string, unknown>;
        if (annule || !data) return;

        const rawParticipants = (data.participants as Record<string, unknown>[]) ?? [];
        const users = rawParticipants.map((p) => toAlfyUser(p, (p.userId ?? p.id) as string));
        const ownerId = (data.ownerId ?? data.owner_id) as string | undefined;
        const membres: GroupMember[] = rawParticipants.map((p, i) => {
          const role = p.role as GroupRole | undefined;
          return {
            user: users[i],
            role: role ?? (users[i].id === ownerId ? 'owner' : 'member'),
          };
        });
        setChargee({
          id: groupId,
          info: {
            name: (data.name as string) || t.chat.groupFallbackName,
            avatarUrl: (data.avatarUrl ?? data.avatar_url) as string | undefined,
            isOpen: data.isOpen !== false && data.is_open !== false,
            participants: users,
            members: membres,
          },
        });
      })
      .catch(() => {
        /* le fil reste utilisable sans les métadonnées */
      });
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, version]);

  /* Modifs du groupe (nom, icône, membres) faites ici ou ailleurs. */
  useEffect(() => {
    const concerne = (data: unknown) => {
      const p = ((data as { payload?: unknown })?.payload ?? data) as { groupId?: string; id?: string } | undefined;
      return p?.groupId === groupId || p?.id === groupId;
    };
    const rafraichir = (data: unknown) => {
      if (concerne(data)) setVersion((v) => v + 1);
    };
    const supprime = (data: unknown) => {
      if (concerne(data)) router.push('/channels/me');
    };
    socketService.on('GROUP_UPDATE', rafraichir);
    socketService.on('GROUP_MEMBER_ADD', rafraichir);
    socketService.on('GROUP_MEMBER_REMOVE', rafraichir);
    socketService.on('GROUP_DELETE', supprime);
    return () => {
      socketService.off('GROUP_UPDATE', rafraichir);
      socketService.off('GROUP_MEMBER_ADD', rafraichir);
      socketService.off('GROUP_MEMBER_REMOVE', rafraichir);
      socketService.off('GROUP_DELETE', supprime);
    };
  }, [groupId, router]);

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

  /* Les messages optimistes portent un id `pending_…` jusqu'à l'accusé serveur. */
  const pendingIds = useMemo(
    () => new Set(messages.filter((m) => m.id.startsWith('pending_')).map((m) => m.id)),
    [messages],
  );

  const toggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      const cible = messages.find((m) => m.id === messageId);
      const mien = cible?.reactions.some((r) => r.emoji === emoji && r.me);
      if (mien) removeReaction(messageId, emoji);
      else addReaction(messageId, emoji);
    },
    [messages, addReaction, removeReaction],
  );

  const envoyer = useCallback(
    (contenu: string, replyToId?: string) => {
      sendMessage(contenu, replyToId);
    },
    [sendMessage],
  );

  const nbMembres = participants.length;

  return (
    <UserDirectoryProvider value={resolver}>
      {/* `key` : changer de groupe remonte la vue, ce qui remet à zéro
          défilement, brouillon de réponse et compteurs sans logique dédiée. */}
      <DmChat
        key={groupId}
        conversationId={groupId}
        title={name}
        subtitle={nbMembres > 0 ? tx(t.chat.groupMembersCount, { n: nbMembres, plural: nbMembres > 1 ? 's' : '' }) : undefined}
        avatarUrl={avatarUrl}
        notifTargetType="group"
        introText={
          <>
            {t.chat.groupIntroBase}
            {nbMembres > 0 && (
              <>
                {t.chat.groupIntroWith}
                <span className="font-medium text-foreground">
                  {tx(t.chat.groupMembersCount, { n: nbMembres, plural: nbMembres > 1 ? 's' : '' })}
                </span>
              </>
            )}
            .
          </>
        }
        messages={messages}
        currentUserId={meId}
        typingNames={(typingUsers ?? []).map(
          (tu: { id: string; username?: string }) =>
            resolver(tu.id)?.displayName || tu.username || t.chat.someoneFallback,
        )}
        isLoading={isLoading}
        hasMore={hasMoreMessages}
        isLoadingMore={isLoadingMoreMessages}
        onLoadMore={loadMoreMessages}
        onSend={envoyer}
        onTyping={startTyping}
        onToggleReaction={toggleReaction}
        onEditMessage={editMessage}
        onDeleteMessage={deleteMessage}
        pendingIds={pendingIds}
        onOpenNav={isMobile ? openSidebar : undefined}
        onStartVoiceCall={() => initiateGroupCall(groupId, 'voice', name)}
        onStartVideoCall={() => initiateGroupCall(groupId, 'video', name)}
        onEditGroup={() => setEditOpen(true)}
        callStage={<ConversationCallStage target={{ kind: 'group', groupId }} />}
      />
      <GroupSettingsModal
        isOpen={editOpen}
        onOpenChange={setEditOpen}
        groupId={groupId}
        name={name}
        avatarUrl={avatarUrl}
        isOpenGroup={isOpen}
        members={members}
        currentUserId={meId}
        onGone={() => router.push('/channels/me')}
      />
    </UserDirectoryProvider>
  );
}
