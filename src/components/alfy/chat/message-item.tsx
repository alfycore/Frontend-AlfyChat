'use client';

import { Button, TextArea, Tooltip } from '@heroui/react';
import { MessageSquareText, Pin } from 'lucide-react';
import { memo, useState } from 'react';

import type { AlfyMessage, AlfyRole } from '@/components/alfy/mock/types';
import { useUserById } from '@/components/alfy/user-directory';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { Attachment } from '@/components/alfy/chat/attachment';
import { InviteEmbed } from '@/components/alfy/chat/invite-embed';
import { LinkPreview } from '@/components/alfy/chat/link-preview';
import { AlfyMarkdown } from '@/components/alfy/chat/markdown';
import { MessageActions } from '@/components/alfy/chat/message-actions';
import { MessageReactions } from '@/components/alfy/chat/message-reactions';
import { ReplyPreview } from '@/components/alfy/chat/reply-preview';
import { UserPopover } from '@/components/alfy/members/user-popover';
import { useAppPrefs } from '@/hooks/use-app-prefs';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/components/locale-provider';

const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const fullFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' });

interface MessageItemProps {
  message: AlfyMessage;
  /** false = message groupé sous le même auteur (pas d'en-tête ni d'avatar). */
  showHeader: boolean;
  authorColor?: string;
  authorRoles?: AlfyRole[];
  allServerRoles?: AlfyRole[];
  /** Bitmask cumulé des rôles de l'utilisateur courant sur ce serveur (absent en DM). */
  moderatorPermissions?: number;
  replyTo?: AlfyMessage;
  currentUserId: string;
  onOpenThread?: (threadId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  /** Persistance réelle — sans elles, l'état reste local (mock). */
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
}

export const MessageItem = memo(function MessageItem({
  message,
  showHeader,
  authorColor,
  authorRoles,
  allServerRoles,
  moderatorPermissions,
  replyTo,
  currentUserId,
  onOpenThread,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
}: MessageItemProps) {
  const { t, tx } = useTranslation();
  const userById = useUserById();
  const { prefs } = useAppPrefs();
  const author = userById(message.authorId);
  const date = new Date(message.createdAt);
  const isOwn = message.authorId === currentUserId;

  // Densité et avatars : « Compact » (Accessibilité) autorise le masquage des
  // avatars, verrouillés en mode confortable.
  const compact = prefs.messageDisplay === 'compact';
  const withAvatar = !compact || prefs.showAvatars;
  const isModerator = (moderatorPermissions ?? 0) !== 0;

  // États locaux (mock, sans remonter au store) : édition, épingle, suppression.
  const [content, setContent] = useState(message.content);
  const [edited, setEdited] = useState(Boolean(message.editedAt));
  const [pinned, setPinned] = useState(Boolean(message.pinned));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [deleted, setDeleted] = useState(false);

  if (deleted) {
    return (
      <div className="px-4 py-1 pl-15 text-xs text-muted italic">{t.messageItem.deletedPlaceholder}</div>
    );
  }

  const saveEdit = () => {
    const next = draft.trim();
    if (next && next !== content) {
      setContent(next); // optimiste
      setEdited(true);
      onEditMessage?.(message.id, next);
    }
    setEditing(false);
  };

  return (
    <div
      className={cn(
        'alfy-msg-row alfy-enter group/msg relative px-4',
        compact ? 'py-0' : 'py-0.5',
        showHeader && (compact ? 'mt-1' : 'mt-3'),
        pinned && 'bg-warning/[0.04]',
      )}
      style={{ contentVisibility: 'auto' } as React.CSSProperties}
    >
      {pinned && (
        <p className="flex items-center gap-1 pl-11 text-[10px] font-medium text-warning">
          <Pin className="size-2.5" aria-hidden /> {t.messageItem.pinnedBadge}
        </p>
      )}
      {replyTo && <ReplyPreview original={replyTo} />}
      <div className={cn('flex', compact ? 'gap-2' : 'gap-3')}>
        {showHeader && withAvatar ? (
          <UserPopover
            user={author}
            roles={authorRoles}
            allServerRoles={allServerRoles}
            isSelf={isOwn}
            moderatorPermissions={moderatorPermissions}
            triggerClassName="mt-0.5 shrink-0 cursor-pointer rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-focus"
          >
            <AlfyAvatar name={author.displayName} avatarUrl={author.avatarUrl} size="sm" />
          </UserPopover>
        ) : (
          <span
            className={cn(
              'w-10 shrink-0 pt-1 text-right text-[10px] leading-5 text-muted tabular-nums select-none',
              // En compact l'heure reste visible : c'est le seul repère de ligne.
              compact && !withAvatar ? 'opacity-100' : 'opacity-0 group-hover/msg:opacity-100',
            )}
          >
            {timeFmt.format(date)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          {showHeader && withAvatar && (
            <div className="flex items-baseline gap-2">
              <UserPopover
                user={author}
                roles={authorRoles}
                allServerRoles={allServerRoles}
                isSelf={isOwn}
                moderatorPermissions={moderatorPermissions}
                triggerClassName="cursor-pointer rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
              >
                <span className="text-sm font-semibold" style={authorColor ? { color: authorColor } : undefined}>
                  {author.displayName}
                </span>
              </UserPopover>
              <Tooltip delay={400}>
                <time
                  dateTime={message.createdAt}
                  tabIndex={0}
                  className="cursor-default text-[11px] text-muted outline-none"
                >
                  {timeFmt.format(date)}
                </time>
                <Tooltip.Content>
                  <p>{fullFmt.format(date)}</p>
                </Tooltip.Content>
              </Tooltip>
            </div>
          )}
          {editing ? (
            <div className="mt-0.5">
              <TextArea
                aria-label={t.messageItem.editAriaLabel}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    saveEdit();
                  } else if (e.key === 'Escape') {
                    setDraft(content);
                    setEditing(false);
                  }
                }}
              />
              <p className="mt-1 flex items-center gap-2 text-[10px] text-muted">
                <button type="button" className="cursor-pointer hover:text-foreground" onClick={() => { setDraft(content); setEditing(false); }}>
                  {t.messageItem.escToCancelBtn}
                </button>
                ·
                <button type="button" className="cursor-pointer text-accent hover:underline" onClick={saveEdit}>
                  {t.messageItem.enterToSaveBtn}
                </button>
              </p>
            </div>
          ) : (
            <div
              className={cn(
                'text-sm leading-relaxed text-foreground/90',
                (!showHeader || !withAvatar) && 'flex flex-wrap items-start gap-x-1.5',
              )}
            >
              {showHeader && !withAvatar && (
                <UserPopover
                  user={author}
                  roles={authorRoles}
                  allServerRoles={allServerRoles}
                  isSelf={isOwn}
                  moderatorPermissions={moderatorPermissions}
                  triggerClassName="cursor-pointer rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <span className="font-semibold" style={authorColor ? { color: authorColor } : undefined}>
                    {author.displayName}
                  </span>
                </UserPopover>
              )}
              <AlfyMarkdown content={content} mentions={message.mentions} isModerator={isModerator} />
              {edited && <span className="ml-1 text-[10px] text-muted">{t.messageItem.edited}</span>}
            </div>
          )}
          {message.attachments.map((a) => (
            <Attachment key={a.id} attachment={a} />
          ))}
          {prefs.showEmbeds && message.linkPreview && <LinkPreview preview={message.linkPreview} />}
          {prefs.showEmbeds && message.invite && <InviteEmbed invite={message.invite} />}
          {prefs.showReactions && (
            <MessageReactions
              reactions={message.reactions}
              onToggle={(emoji) => onToggleReaction?.(message.id, emoji)}
            />
          )}
          {message.threadId && message.threadCount && (
            <button
              type="button"
              onClick={() => onOpenThread?.(message.threadId!)}
              className="mt-1 flex cursor-pointer items-center gap-1.5 rounded-sm px-1.5 py-1 text-xs font-medium text-[color:var(--accent)] outline-none transition-colors hover:bg-[color:var(--accent)]/10 focus-visible:ring-2 focus-visible:ring-[color:var(--focus)]"
            >
              <MessageSquareText className="size-3.5" aria-hidden />
              {tx(t.messageItem.threadRepliesCount, { n: message.threadCount })}
              <span className="text-muted">{t.messageItem.viewThread}</span>
            </button>
          )}
        </div>
      </div>
      {!editing && (
        <MessageActions
          messageId={message.id}
          content={content}
          isOwn={isOwn}
          canManage={isModerator}
          pinned={pinned}
          onReact={() => onToggleReaction?.(message.id, '👍')}
          onThread={() => message.threadId && onOpenThread?.(message.threadId)}
          onEdit={() => { setDraft(content); setEditing(true); }}
          onDelete={() => {
            setDeleted(true); // optimiste
            onDeleteMessage?.(message.id);
          }}
          onPinToggle={() => setPinned((p) => !p)}
        />
      )}
    </div>
  );
});
