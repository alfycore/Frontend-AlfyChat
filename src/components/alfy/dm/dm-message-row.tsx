'use client';

/**
 * Une ligne du fil privé.
 *
 * Deux partis pris par rapport à l'ancienne version :
 *
 *  1. **Aucun état local dérivé des props.** Le contenu, le drapeau « modifié »
 *     et l'épingle viennent du message. L'ancienne version les copiait dans un
 *     `useState`, si bien qu'une modification faite depuis un autre appareil
 *     n'apparaissait jamais. Seule l'édition en cours est locale : elle est
 *     transitoire par nature.
 *  2. **Coût de rendu contenu.** `content-visibility` laisse le navigateur
 *     sauter la mise en page des lignes hors écran, et `memo` évite de
 *     re-rendre tout le fil à chaque frappe dans la zone de saisie.
 */

import { Button, TextArea, Tooltip } from '@heroui/react';
import { Check, Pin, X } from 'lucide-react';
import { memo, useState } from 'react';

import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { Attachment } from '@/components/alfy/chat/attachment';
import { LinkPreview } from '@/components/alfy/chat/link-preview';
import { AlfyMarkdown } from '@/components/alfy/chat/markdown';
import { MessageActions } from '@/components/alfy/chat/message-actions';
import { MessageReactions } from '@/components/alfy/chat/message-reactions';
import { ReplyPreview } from '@/components/alfy/chat/reply-preview';
import { UserPopover } from '@/components/alfy/members/user-popover';
import { useUserById } from '@/components/alfy/user-directory';
import type { AlfyMessage } from '@/components/alfy/mock/types';
import { useAppPrefs } from '@/hooks/use-app-prefs';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';

const heureFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const completFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' });

export interface DmMessageRowProps {
  message: AlfyMessage;
  /** false = suite du même auteur : ni avatar ni en-tête. */
  showHeader: boolean;
  replyTo?: AlfyMessage;
  currentUserId: string;
  /** Message arrivé pendant la session : joue l'animation d'entrée. */
  isFresh?: boolean;
  /** En attente d'accusé du serveur — rendu en retrait. */
  isPending?: boolean;
  /** L'envoi a échoué : propose de réessayer. */
  failed?: boolean;
  /** Modérateur du salon — peut gérer (supprimer/épingler) les messages des autres. */
  canManage?: boolean;
  onRetry?: (messageId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
}

function Row({
  message,
  showHeader,
  replyTo,
  currentUserId,
  isFresh = false,
  isPending = false,
  failed = false,
  canManage = false,
  onRetry,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
  onReply,
}: DmMessageRowProps) {
  const { t } = useTranslation();
  const userById = useUserById();
  const { prefs } = useAppPrefs();
  const auteur = userById(message.authorId);
  const date = new Date(message.createdAt);
  const estMoi = message.authorId === currentUserId;

  const compact = prefs.messageDisplay === 'compact';
  const avecAvatar = !compact || prefs.showAvatars;

  /* Le brouillon porte l'état d'édition : `null` = pas en cours d'édition.
     Le texte est copié à l'ouverture, donc rien à resynchroniser ensuite. */
  const [draft, setDraft] = useState<string | null>(null);
  const editing = draft !== null;

  const enregistrer = () => {
    const suivant = (draft ?? '').trim();
    if (suivant && suivant !== message.content) onEditMessage?.(message.id, suivant);
    setDraft(null);
  };

  const annuler = () => setDraft(null);

  return (
    <article
      data-message-id={message.id}
      className={cn(
        'group/msg relative px-4 transition-colors',
        compact ? 'py-0' : 'py-0.5',
        showHeader && (compact ? 'mt-1' : 'mt-3'),
        message.pinned && 'bg-warning/4',
        failed && 'bg-danger/6',
        isFresh && 'at-fade-up',
      )}
    >
      {message.pinned && (
        <p className="flex items-center gap-1 pl-11 text-[10px] font-medium text-warning">
          <Pin className="size-2.5" aria-hidden /> {t.friends.dm.pinnedBadge}
        </p>
      )}
      {replyTo && <ReplyPreview original={replyTo} />}

      <div className={cn('flex', compact ? 'gap-2' : 'gap-3', isPending && 'opacity-55')}>
        {showHeader && avecAvatar ? (
          <UserPopover
            user={auteur}
            isSelf={estMoi}
            triggerClassName="mt-0.5 shrink-0 cursor-pointer rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-focus"
          >
            <AlfyAvatar name={auteur.displayName} avatarUrl={auteur.avatarUrl} size="sm" />
          </UserPopover>
        ) : (
          <span
            className={cn(
              // Largeur calée sur l'avatar (`avatar--sm` = size-8) : sans ça, les
              // messages groupés étaient décalés de 8 px sous leur en-tête.
              'w-8 shrink-0 pt-1 text-right text-[10px] leading-5 text-muted tabular-nums select-none',
              compact && !avecAvatar ? 'opacity-100' : 'opacity-0 group-hover/msg:opacity-100',
            )}
          >
            {heureFmt.format(date)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          {showHeader && avecAvatar && (
            <div className="flex items-baseline gap-2">
              <UserPopover
                user={auteur}
                isSelf={estMoi}
                triggerClassName="cursor-pointer rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
              >
                <span className="text-sm font-semibold">{auteur.displayName}</span>
              </UserPopover>
              <Tooltip delay={400}>
                <time
                  dateTime={message.createdAt}
                  tabIndex={0}
                  className="cursor-default text-[11px] text-muted outline-none"
                >
                  {heureFmt.format(date)}
                </time>
                <Tooltip.Content>
                  <p>{completFmt.format(date)}</p>
                </Tooltip.Content>
              </Tooltip>
            </div>
          )}

          {editing ? (
            <div className="mt-0.5">
              <TextArea
                aria-label={t.friends.dm.editMessageAriaLabel}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    enregistrer();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    annuler();
                  }
                }}
              />
              <div className="mt-1.5 flex items-center gap-2">
                <Button size="sm" variant="primary" onPress={enregistrer}>
                  <Check className="size-3.5" aria-hidden />
                  {t.friends.dm.saveEdit}
                </Button>
                <Button size="sm" variant="ghost" onPress={annuler}>
                  <X className="size-3.5" aria-hidden />
                  {t.common.cancel}
                </Button>
                <span className="text-[10px] text-muted">{t.friends.dm.editHint}</span>
              </div>
            </div>
          ) : (
            <div className="text-sm leading-relaxed text-foreground/90">
              <AlfyMarkdown content={message.content} mentions={message.mentions} />
              {message.editedAt && <span className="ml-1 text-[10px] text-muted">{t.messageItem.edited}</span>}
            </div>
          )}

          {message.attachments.map((piece) => (
            <Attachment key={piece.id} attachment={piece} />
          ))}
          {prefs.showEmbeds && message.linkPreview && <LinkPreview preview={message.linkPreview} />}
          {prefs.showReactions && (
            <MessageReactions
              reactions={message.reactions}
              onToggle={(emoji) => onToggleReaction?.(message.id, emoji)}
            />
          )}

          {failed && (
            <p className="mt-1 flex items-center gap-2 text-[11px] text-danger">
              {t.friends.dm.messageNotSent}
              <button
                type="button"
                className="cursor-pointer font-medium underline underline-offset-2"
                onClick={() => onRetry?.(message.id)}
              >
                {t.friends.dm.retry}
              </button>
            </p>
          )}
        </div>
      </div>

      {!editing && !isPending && (
        <MessageActions
          messageId={message.id}
          content={message.content}
          isOwn={estMoi}
          canManage={canManage}
          pinned={Boolean(message.pinned)}
          onReact={() => onToggleReaction?.(message.id, '👍')}
          onEdit={() => setDraft(message.content)}
          onDelete={() => onDeleteMessage?.(message.id)}
          onReply={() => onReply?.(message.id)}
        />
      )}
    </article>
  );
}

/* Le fil se re-rend à chaque frappe dans la zone de saisie : sans cette
   comparaison, chaque caractère re-rendrait les centaines de lignes montées. */
export const DmMessageRow = memo(Row, (a, b) => {
  const m = a.message;
  const n = b.message;
  return (
    m.id === n.id &&
    m.content === n.content &&
    m.editedAt === n.editedAt &&
    m.pinned === n.pinned &&
    m.reactions === n.reactions &&
    m.attachments === n.attachments &&
    a.showHeader === b.showHeader &&
    a.replyTo === b.replyTo &&
    a.isFresh === b.isFresh &&
    a.isPending === b.isPending &&
    a.failed === b.failed &&
    a.currentUserId === b.currentUserId
  );
});
