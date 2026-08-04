'use client';

/**
 * Container : conversation privée (DM).
 *
 * Ne fait que brancher `useMessages` (qui porte le déchiffrement Signal) sur
 * la vue `DmChat`. Toute la logique d'affichage, de défilement et de saisie
 * vit dans `components/alfy/dm/`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useCallContext } from '@/hooks/use-call-context';
import { useMessages } from '@/hooks/use-messages';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { api } from '@/lib/api';
import { DmChat } from '@/components/alfy/dm/dm-chat';
import { UserDirectoryProvider, makeResolver } from '@/components/alfy/user-directory';
import { toAlfyMessage, toAlfyUser } from '@/components/alfy/live/map';
import type { AlfyUser } from '@/components/alfy/mock/types';

export function AlfyDmChat({ recipientId }: { recipientId: string }) {
  const { user } = useAuth();
  const { isMobile, openSidebar } = useMobileNav();
  const { initiateCall } = useCallContext();
  /* La fiche est mémorisée avec l'id auquel elle correspond : on évite ainsi de
     la remettre à null dans l'effet (rendu en cascade) tout en garantissant
     qu'on n'affiche jamais le profil du contact précédent. */
  const [ficheChargee, setFicheChargee] = useState<{ id: string; user: AlfyUser } | null>(null);
  const recipient = ficheChargee?.id === recipientId ? ficheChargee.user : null;

  /* Statut de blocage : dans un sens comme dans l'autre, la saisie doit être
     coupée — pas seulement l'envoi côté serveur, sinon on laisse croire que
     le message est parti. */
  const [blockStatus, setBlockStatus] = useState<{ id: string; iBlockedThem: boolean; theyBlockedMe: boolean } | null>(null);
  useEffect(() => {
    let annule = false;
    api
      .getBlockStatus(recipientId)
      .then((res) => {
        if (annule || !res.success || !res.data) return;
        setBlockStatus({ id: recipientId, ...res.data });
      })
      .catch(() => {});
    return () => {
      annule = true;
    };
  }, [recipientId]);
  const { iBlockedThem, theyBlockedMe } =
    blockStatus?.id === recipientId ? blockStatus : { iBlockedThem: false, theyBlockedMe: false };

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
  } = useMessages(undefined, recipientId);

  /* Profil du destinataire (nom, avatar, présence) */
  useEffect(() => {
    let annule = false;
    api
      .getUser(recipientId)
      .then((res) => {
        const data = ((res as { data?: unknown })?.data ?? res) as Record<string, unknown>;
        if (!annule && data) setFicheChargee({ id: recipientId, user: toAlfyUser(data, recipientId) });
      })
      .catch(() => {
        /* le fil reste utilisable sans la fiche profil */
      });
    return () => {
      annule = true;
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

  return (
    <UserDirectoryProvider value={resolver}>
      {/* `key` : changer de contact remonte la vue, ce qui remet à zéro
          défilement, brouillon de réponse et compteurs sans logique dédiée. */}
      <DmChat
        key={recipientId}
        conversationId={recipientId}
        title={recipient?.displayName ?? 'Conversation'}
        subtitle={recipient?.username ? `Conversation privée avec @${recipient.username}` : undefined}
        avatarUrl={recipient?.avatarUrl}
        introText={
          recipient?.username ? (
            <>
              Ceci est le début de votre conversation privée avec{' '}
              <span className="font-medium text-foreground">@{recipient.username}</span>.
            </>
          ) : (
            'Ceci est le début de votre conversation privée.'
          )
        }
        messages={messages}
        currentUserId={meId}
        typingNames={(typingUsers ?? []).map(
          (t: { id: string; username?: string }) =>
            resolver(t.id)?.displayName || t.username || 'Quelqu’un',
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
        onStartVoiceCall={
          iBlockedThem || theyBlockedMe
            ? undefined
            : () => initiateCall(recipientId, 'voice', undefined, recipient?.displayName)
        }
        onStartVideoCall={
          iBlockedThem || theyBlockedMe
            ? undefined
            : () => initiateCall(recipientId, 'video', undefined, recipient?.displayName)
        }
        isComposerDisabled={iBlockedThem || theyBlockedMe}
        composerDisabledMessage={
          iBlockedThem
            ? 'Vous avez bloqué cette personne'
            : theyBlockedMe
              ? 'Vous ne pouvez pas écrire à cette personne'
              : undefined
        }
      />
    </UserDirectoryProvider>
  );
}
