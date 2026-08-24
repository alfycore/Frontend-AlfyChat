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
import { loadDmBootstrap } from '@/lib/dm-bootstrap';
import { DmChat } from '@/components/alfy/dm/dm-chat';
import { UserDirectoryProvider, makeResolver } from '@/components/alfy/user-directory';
import { toAlfyMessage, toAlfyUser } from '@/components/alfy/live/map';
import type { AlfyUser } from '@/components/alfy/mock/types';
import { useTranslation } from '@/components/locale-provider';

export function AlfyDmChat({ recipientId }: { recipientId: string }) {
  const { t, tx } = useTranslation();
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
    // `loadDmBootstrap` mutualise la requête déjà lancée par la page : ce
    // second appel ne produit aucun trafic réseau supplémentaire.
    loadDmBootstrap(recipientId)
      .then((boot) => {
        if (annule || !boot) return;
        setBlockStatus({ id: recipientId, ...boot.blockStatus });
        if (boot.recipient) {
          setFicheChargee({ id: recipientId, user: toAlfyUser(boot.recipient, recipientId) });
        }
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
        title={recipient?.displayName ?? t.chat.dmFallbackTitle}
        subtitle={recipient?.username ? tx(t.chat.dmSubtitle, { username: recipient.username }) : undefined}
        avatarUrl={recipient?.avatarUrl}
        introText={
          recipient?.username ? (
            <>
              {t.chat.dmIntroPrefix}
              <span className="font-medium text-foreground">@{recipient.username}</span>.
            </>
          ) : (
            t.chat.dmIntroNoUser
          )
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
            ? t.chat.blockedByMeComposer
            : theyBlockedMe
              ? t.chat.blockedByThemComposer
              : undefined
        }
      />
    </UserDirectoryProvider>
  );
}
