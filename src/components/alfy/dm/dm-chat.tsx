'use client';

/**
 * Fil de discussion privé — vue complète.
 *
 * Réécrit pour corriger ce qui rendait l'ancienne version instable :
 *
 *  - plus d'animation de disposition (`layout`) sur chaque message : elle
 *    entrait en conflit avec les écritures de `scrollTop` et faisait « sauter »
 *    le fil à chaque nouveau message ;
 *  - l'ancrage du défilement est centralisé dans `useDmScroll`, en
 *    `useLayoutEffect`, donc invisible à l'œil ;
 *  - seuls les messages arrivés pendant la session s'animent, au lieu des
 *    cinquante lignes de l'historique au chargement ;
 *  - les états vide, en cours de chargement et en erreur existent vraiment,
 *    au lieu d'un fil vide indiscernable d'une conversation sans message.
 */

import { Alert, Button, ScrollShadow, Spinner } from '@heroui/react';
import { ArrowDown, Lock, type LucideIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { DmComposer } from '@/components/alfy/dm/dm-composer';
import { DmHeader } from '@/components/alfy/dm/dm-header';
import { DmMessageRow } from '@/components/alfy/dm/dm-message-row';
import { useDmScroll } from '@/components/alfy/dm/use-dm-scroll';
import { TypingIndicator } from '@/components/alfy/chat/typing-indicator';
import type { AlfyMessage } from '@/components/alfy/mock/types';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';

const jourFmt = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Regroupement sous un même auteur en deçà de cet écart. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

/**
 * `DmChat` sert aussi bien les MP que les groupes — les deux partagent le même
 * moteur de fil (défilement, groupage, saisie). Ce qui les distingue (un
 * contact contre plusieurs membres) est réduit à une identité générique :
 * titre, sous-titre, avatar.
 */
export interface DmChatProps {
  conversationId: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  /** Nom utilisé pour les initiales de repli de l'avatar — égal à `title` si omis. */
  avatarName?: string;
  /** Remplace l'avatar par une icône (salon de serveur : # au lieu d'un visage). */
  headerIcon?: LucideIcon;
  /** 'group'/'channel' pilotent le libellé des réglages de notification. */
  notifTargetType?: 'dm' | 'group' | 'channel';
  /** Paragraphe d'intro affiché avant le premier message. */
  introText?: React.ReactNode;
  messages: AlfyMessage[];
  currentUserId: string;
  typingNames?: string[];
  isLoading?: boolean;
  error?: string | null;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => Promise<unknown> | void;
  onSend: (content: string, replyToId?: string) => void;
  onTyping?: () => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
  /** Identifiants en attente d'accusé serveur. */
  pendingIds?: ReadonlySet<string>;
  /** Identifiants dont l'envoi a échoué. */
  failedIds?: ReadonlySet<string>;
  onOpenNav?: () => void;
  onStartVoiceCall?: () => void;
  onStartVideoCall?: () => void;
  onOpenProfile?: () => void;
  onToggleMembers?: () => void;
  membersOpen?: boolean;
  /** Relation de blocage active (l'un ou l'autre) — désactive la saisie. */
  isComposerDisabled?: boolean;
  composerDisabledMessage?: string;
  /** Remplace « Écrire à {title} » — ex. « Écrire dans #général ». */
  composerPlaceholder?: string;
  /** false pour les salons de serveur — pas de chiffrement de bout en bout. */
  encrypted?: boolean;
  /** Modérateur du salon — peut gérer les messages des autres membres. */
  canManageMessages?: boolean;
}

export function DmChat({
  conversationId,
  title,
  subtitle,
  avatarUrl,
  avatarName,
  headerIcon,
  notifTargetType,
  introText,
  messages,
  currentUserId,
  typingNames = [],
  isLoading = false,
  error = null,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onSend,
  onTyping,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
  onRetry,
  pendingIds,
  failedIds,
  onOpenNav,
  onToggleMembers,
  membersOpen,
  composerPlaceholder,
  encrypted = true,
  canManageMessages = false,
  onStartVoiceCall,
  onStartVideoCall,
  onOpenProfile,
  isComposerDisabled = false,
  composerDisabledMessage,
}: DmChatProps) {
  const { t, tx } = useTranslation();

  /* Seul l'id est gardé en état : si le message visé disparaît (suppression
     distante), la référence retombe naturellement au rendu suivant — sans
     effet dédié pour la « lâcher ». */
  const [replyToId, setReplyToId] = useState<string | undefined>();

  const itemIds = useMemo(() => messages.map((m) => m.id), [messages]);

  const { viewportRef, pinned, unread, scrollToBottom, scrollToMessage } = useDmScroll({
    itemIds,
    hasMore,
    isLoadingMore,
    onLoadMore,
  });

  /* Seuls les messages postés après l'ouverture s'animent : sinon toute la
     conversation clignote au chargement. Comparer à l'instant de montage évite
     de tenir un registre des identifiants déjà vus. */
  const [ouvertA] = useState(() => Date.now());

  const parId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const replyTo = replyToId ? parId.get(replyToId) : undefined;

  /* En-têtes et séparateurs de jour pré-calculés en une passe. */
  const lignes = useMemo(() => {
    const out: {
      message: AlfyMessage;
      showHeader: boolean;
      daySeparator?: string;
    }[] = [];
    let precedent: AlfyMessage | undefined;
    for (const m of messages) {
      const jourPrec = precedent && new Date(precedent.createdAt).toDateString();
      const jour = new Date(m.createdAt).toDateString();
      const daySeparator = jour !== jourPrec ? jourFmt.format(new Date(m.createdAt)) : undefined;
      const groupe =
        !daySeparator &&
        precedent !== undefined &&
        precedent.authorId === m.authorId &&
        !m.replyToId &&
        new Date(m.createdAt).getTime() - new Date(precedent.createdAt).getTime() < GROUP_WINDOW_MS;
      out.push({ message: m, showHeader: !groupe, daySeparator });
      precedent = m;
    }
    return out;
  }, [messages]);

  /* Références stables : sans elles, `memo` sur les lignes ne sert à rien. */
  const repondre = useCallback((id: string) => setReplyToId(id), []);
  const envoyer = useCallback(
    (contenu: string, replyToId?: string) => {
      onSend(contenu, replyToId);
      scrollToBottom();
    },
    [onSend, scrollToBottom],
  );

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-surface">
      <DmHeader
        conversationId={conversationId}
        title={title}
        subtitle={subtitle}
        avatarUrl={avatarUrl}
        avatarName={avatarName ?? title}
        icon={headerIcon}
        notifTargetType={notifTargetType}
        encrypted={encrypted}
        messages={messages}
        onJumpToMessage={scrollToMessage}
        onOpenNav={onOpenNav}
        onOpenProfile={onOpenProfile}
        onToggleMembers={onToggleMembers}
        membersOpen={membersOpen}
        onStartVoiceCall={onStartVoiceCall}
        onStartVideoCall={onStartVideoCall}
      />

      {/* ── Fil ─────────────────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1">
        <ScrollShadow ref={viewportRef} className="h-full overflow-y-auto overscroll-contain">
          <div className="flex min-h-full flex-col justify-end">
            {/* Chargement de l'historique plus ancien */}
            {isLoadingMore && (
              <div className="flex justify-center py-3" role="status" aria-label={t.chat.loadingOlder}>
                <Spinner size="sm" />
              </div>
            )}

            {/* Début de conversation — seulement quand il n'y a plus rien derrière */}
            {!hasMore && !isLoading && (
              <div className="px-4 pt-8 pb-4">
                {headerIcon ? (
                  <span className="flex size-16 items-center justify-center rounded-full bg-surface-secondary text-muted">
                    {(() => {
                      const Icon = headerIcon;
                      return <Icon className="size-7" aria-hidden />;
                    })()}
                  </span>
                ) : (
                  <AlfyAvatar name={avatarName ?? title} avatarUrl={avatarUrl} size="lg" />
                )}
                <h2 className="mt-3 text-xl font-bold">{title}</h2>
                <p className="mt-1 max-w-prose text-sm text-muted">{introText}</p>
                {encrypted && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-(--alfy-e2e)">
                    <Lock className="size-3" aria-hidden />
                    {t.friends.dm.encryptedIntro}
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="px-4 py-3">
                <Alert status="danger">
                  <Alert.Content>
                    <Alert.Title>{t.friends.dm.historyUnavailableTitle}</Alert.Title>
                    <Alert.Description>
                      {t.friends.dm.historyUnavailableDesc}
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              </div>
            )}

            {isLoading && messages.length === 0 && (
              <div className="flex flex-1 items-center justify-center py-12" role="status">
                <Spinner size="lg" />
              </div>
            )}

            {lignes.map(({ message, showHeader, daySeparator }) => (
              <div key={message.id}>
                {daySeparator && (
                  <div className="my-4 flex items-center gap-3 px-4" role="separator" aria-label={daySeparator}>
                    <span className="h-px flex-1 bg-separator" />
                    <span className="rounded-full border border-separator bg-surface-secondary px-3 py-0.5 text-[11px] font-medium text-muted capitalize select-none">
                      {daySeparator}
                    </span>
                    <span className="h-px flex-1 bg-separator" />
                  </div>
                )}
                <DmMessageRow
                  message={message}
                  showHeader={showHeader}
                  replyTo={message.replyToId ? parId.get(message.replyToId) : undefined}
                  currentUserId={currentUserId}
                  isFresh={new Date(message.createdAt).getTime() > ouvertA}
                  isPending={pendingIds?.has(message.id)}
                  failed={failedIds?.has(message.id)}
                  canManage={canManageMessages}
                  onRetry={onRetry}
                  onToggleReaction={onToggleReaction}
                  onEditMessage={onEditMessage}
                  onDeleteMessage={onDeleteMessage}
                  onReply={repondre}
                />
              </div>
            ))}

            <div className="h-4" />
          </div>
        </ScrollShadow>

        {/* Retour en bas — n'apparaît que si on a réellement décroché */}
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-3 flex justify-center transition-all duration-200',
            pinned ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100',
          )}
        >
          <Button
            size="sm"
            variant="secondary"
            className={cn('at-elev-2', pinned ? 'pointer-events-none' : 'pointer-events-auto')}
            onPress={() => scrollToBottom('smooth')}
          >
            <ArrowDown className="size-3.5" aria-hidden />
            {unread > 0
              ? tx(unread > 1 ? t.friends.dm.newMessages : t.friends.dm.newMessage, { n: String(unread) })
              : t.friends.dm.backToBottom}
          </Button>
        </div>
      </div>

      <TypingIndicator names={typingNames} />

      <DmComposer
        conversationId={conversationId}
        recipientName={title}
        placeholder={composerPlaceholder}
        replyTo={replyTo}
        onCancelReply={() => setReplyToId(undefined)}
        onSend={envoyer}
        onTyping={onTyping}
        encrypted={encrypted}
        isDisabled={isComposerDisabled}
        disabledMessage={composerDisabledMessage}
      />
    </div>
  );
}
