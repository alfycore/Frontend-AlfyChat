'use client';

/**
 * Une ligne du fil MP / groupe, au gabarit Discord.
 *
 * L'état de chiffrement et d'envoi est porté par le message, jamais deviné
 * depuis le texte : verrouillé (cadenas + raison + action), non chiffré
 * (ancien message de groupe), en cours d'envoi (atténué), en échec (raison
 * lisible + réessayer / supprimer).
 */

import { Avatar, Button, Dropdown, TextArea, Tooltip, toast } from '@heroui/react';
import { AlertCircle, Copy, CornerUpLeft, Lock, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { memo, useState } from 'react';

import { Attachment } from '@/components/alfy/chat/attachment';
import { EmojiPicker } from '@/components/alfy/chat/emoji-picker';
import { ImageLightbox } from '@/components/alfy/chat/image-lightbox';
import { AlfyMarkdown } from '@/components/alfy/chat/markdown';
import { MessageReactions } from '@/components/alfy/chat/message-reactions';
import { UserPopover } from '@/components/alfy/members/user-popover';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { fullStamp, messageStamp, shortTime } from '@/components/alfy/guild/chat/time';
import type { AlfyMessage, AlfyUser } from '@/components/alfy/mock/types';
import type { ChatMessage } from '@/components/alfy/conversation/types';
import { useAppPrefs } from '@/hooks/use-app-prefs';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';

const QUICK = ['👍', '❤️', '😂'];

export interface MessageRowProps {
  message: ChatMessage;
  view: AlfyMessage;
  author: AlfyUser;
  replyTo?: { view: AlfyMessage; author: AlfyUser } | null;
  showHeader: boolean;
  isOwn: boolean;
  isFresh: boolean;
  /** Groupe : les anciens messages en clair sont signalés. */
  isGroup: boolean;
  /** Nom du contact (MP) — « demander à X de le renvoyer ». */
  peerName?: string;
  onReply: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string, skipConfirm: boolean) => void;
  onToggleReaction: (id: string, emoji: string) => void;
  onRetry: (id: string) => void;
  onDiscard: (id: string) => void;
  onAskResend?: () => void;
  onJumpTo: (id: string) => void;
}

function sendError(t: ReturnType<typeof useTranslation>['t'], code: string | undefined, peerName?: string): string {
  const errors = t.conv.send.errors as Record<string, string>;
  return (errors[code ?? ''] ?? errors.default).replace('{name}', peerName ?? '');
}

function Row(props: MessageRowProps) {
  const { message, view, author, replyTo, showHeader, isOwn, isFresh, peerName } = props;
  const { t, tx, intlLocale } = useTranslation();
  const { prefs } = useAppPrefs();
  const compact = prefs.messageDisplay === 'compact';
  const [draft, setDraft] = useState<string | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const [asked, setAsked] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);

  const locked = message.crypto === 'locked';
  const sending = message.status === 'sending';
  const failed = message.status === 'failed';
  const editing = draft !== null;
  const header = showHeader || Boolean(replyTo);
  const images = view.attachments.filter((a) => a.mimeType.startsWith('image/') && a.url);
  const labels = { today: t.guild.chat.today, yesterday: t.guild.chat.yesterday };

  const save = () => {
    const next = (draft ?? '').trim();
    if (next && next !== message.content) props.onEdit(message.id, next);
    else if (!next) props.onDelete(message.id, false);
    setDraft(null);
  };

  const lockText =
    message.lockReason === 'not-member' ? t.conv.locked.notMember : message.lockReason === 'no-key' ? t.conv.locked.noKey : t.conv.locked.unreadable;

  return (
    <article
      data-message-id={message.id}
      className={cn(
        'group/msg relative pr-12 pl-18 transition-colors duration-(--dur-1)',
        header ? (compact ? 'mt-1' : 'mt-4') : '',
        compact ? 'py-px' : 'py-0.5',
        failed ? 'bg-danger/6' : 'hover:bg-foreground/[0.035]',
        (editing || toolbarOpen) && !failed && 'bg-foreground/[0.035]',
        isFresh && 'alfy-enter',
      )}
    >
      {replyTo && (
        <div className="relative mb-1 flex min-w-0 items-center gap-1 text-[13px] text-muted">
          <span aria-hidden className="absolute top-1/2 -left-9 h-2.5 w-8 rounded-tl-md border-t-2 border-l-2 border-foreground/20" />
          {/* Avatar HeroUI direct : `AlfyAvatar` applique `className` à son conteneur, l'avatar restait en 32 px. */}
          <Avatar className="size-4 shrink-0 text-[8px]">
            {replyTo.author.avatarUrl && <Avatar.Image src={replyTo.author.avatarUrl} alt="" />}
            <Avatar.Fallback>{replyTo.author.displayName.slice(0, 1).toUpperCase()}</Avatar.Fallback>
          </Avatar>
          <span className="shrink-0 font-medium">@{replyTo.author.displayName}</span>
          <button
            type="button"
            onClick={() => props.onJumpTo(replyTo.view.id)}
            className="min-w-0 cursor-pointer truncate text-left outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
          >
            {replyTo.view.content.replace(/[*_`~|>]/g, '') || t.guild.chat.attachmentOnly}
          </button>
        </div>
      )}

      {header ? (
        <>
          <span className="absolute top-0.5 left-4">
            <UserPopover
              user={author}
              isSelf={isOwn}
              placement="right"
              triggerClassName={cn('cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-focus', replyTo && 'mt-5.5')}
            >
              <AlfyAvatar name={author.displayName} avatarUrl={author.avatarUrl} size="md" className="transition-[filter] duration-(--dur-1) hover:brightness-110" />
            </UserPopover>
          </span>
          <h3 className="flex min-w-0 items-baseline gap-2">
            <UserPopover
              user={author}
              isSelf={isOwn}
              placement="right"
              triggerClassName="min-w-0 cursor-pointer truncate rounded-sm text-[15px] leading-5.5 font-medium text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
            >
              <span>{author.displayName}</span>
            </UserPopover>
            <Tooltip delay={500} closeDelay={0}>
              <time dateTime={message.createdAt} tabIndex={0} className="shrink-0 cursor-default text-xs text-muted outline-none">
                {messageStamp(message.createdAt, intlLocale, labels)}
              </time>
              <Tooltip.Content>
                <p className="capitalize">{fullStamp(message.createdAt, intlLocale)}</p>
              </Tooltip.Content>
            </Tooltip>
          </h3>
        </>
      ) : (
        <time
          dateTime={message.createdAt}
          className="absolute top-1 left-0 w-16 pr-1 text-right text-[11px] leading-5.5 text-muted opacity-0 tabular-nums select-none group-hover/msg:opacity-100"
        >
          {shortTime(message.createdAt, intlLocale)}
        </time>
      )}

      <div className={cn(sending && 'opacity-55 transition-opacity duration-(--dur-2)')}>
        {locked ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-0.5">
            <p className="flex items-center gap-1.5 text-sm text-muted italic">
              <Lock className="size-3.5 shrink-0" aria-hidden />
              {lockText}
            </p>
            {message.lockReason === 'unreadable' && props.onAskResend && peerName && (
              <Button
                size="sm"
                variant="ghost"
                isDisabled={asked}
                onPress={() => {
                  setAsked(true);
                  props.onAskResend?.();
                }}
              >
                {asked ? tx(t.conv.locked.askSent, { name: peerName }) : tx(t.conv.locked.askResend, { name: peerName })}
              </Button>
            )}
          </div>
        ) : editing ? (
          <div className="py-1">
            <TextArea
              aria-label={t.conv.menu.edit}
              value={draft ?? ''}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              className="w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  save();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setDraft(null);
                }
              }}
            />
            <p className="mt-1 text-xs text-muted">{t.friends.dm.editHint}</p>
          </div>
        ) : (
          view.content && (
            <div className="text-[15px] leading-5.5 wrap-break-word text-foreground/90">
              <AlfyMarkdown content={view.content} mentions={view.mentions} />
              {message.editedAt && <span className="ml-1 text-[11px] text-muted select-none">{t.conv.thread.edited}</span>}
            </div>
          )
        )}

        {!locked &&
          view.attachments.map((a) => {
            const rank = images.indexOf(a);
            return (
              <Attachment key={a.id} attachment={a} onPreview={rank >= 0 && prefs.showUploadedMedia ? () => setPreview(rank) : undefined} />
            );
          })}
        <ImageLightbox images={images} index={preview} onIndexChange={setPreview} onClose={() => setPreview(null)} />

        {prefs.showReactions && view.reactions.length > 0 && (
          <MessageReactions reactions={view.reactions} onToggle={(emoji) => props.onToggleReaction(message.id, emoji)} />
        )}

        {failed && (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-danger" role="alert">
            <AlertCircle className="size-3.5 shrink-0" aria-hidden />
            <span>
              {t.conv.send.failed} — {sendError(t, message.error, peerName)}
            </span>
            <button type="button" className="cursor-pointer font-medium underline underline-offset-2" onClick={() => props.onRetry(message.id)}>
              {t.conv.send.retry}
            </button>
            <button type="button" className="cursor-pointer font-medium underline underline-offset-2" onClick={() => props.onDiscard(message.id)}>
              {t.conv.send.discard}
            </button>
          </p>
        )}
      </div>

      {/* Barre d'actions au survol (masquée pendant l'envoi / l'édition). */}
      {!editing && message.status === 'sent' && (
        <div
          className={cn(
            'absolute -top-4 right-4 z-10 flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5 shadow-md',
            'opacity-0 transition-opacity duration-(--dur-1) group-focus-within/msg:opacity-100 group-hover/msg:opacity-100',
            toolbarOpen && 'opacity-100',
          )}
          role="toolbar"
          aria-label={t.conv.menu.aria}
        >
          {!locked &&
            QUICK.map((e) => (
              <Button key={e} isIconOnly size="sm" variant="ghost" aria-label={`${t.conv.menu.react} ${e}`} onPress={() => props.onToggleReaction(message.id, e)}>
                <span className="text-base leading-none">{e}</span>
              </Button>
            ))}
          {!locked && <EmojiPicker onPick={(e) => props.onToggleReaction(message.id, e)} showStickers={false} />}
          <Tooltip delay={300} closeDelay={0}>
            <Button isIconOnly size="sm" variant="ghost" aria-label={t.conv.menu.reply} onPress={() => props.onReply(message.id)}>
              <CornerUpLeft className="size-4" />
            </Button>
            <Tooltip.Content>
              <p>{t.conv.menu.reply}</p>
            </Tooltip.Content>
          </Tooltip>
          {isOwn && !locked && (
            <Tooltip delay={300} closeDelay={0}>
              <Button isIconOnly size="sm" variant="ghost" aria-label={t.conv.menu.edit} onPress={() => setDraft(message.content)}>
                <Pencil className="size-4" />
              </Button>
              <Tooltip.Content>
                <p>{t.conv.menu.edit}</p>
              </Tooltip.Content>
            </Tooltip>
          )}
          <Dropdown onOpenChange={setToolbarOpen}>
            <Dropdown.Trigger
              aria-label={t.conv.menu.aria}
              className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted outline-none transition-colors duration-(--dur-1) hover:bg-foreground/6 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
            >
              <MoreHorizontal className="size-4" />
            </Dropdown.Trigger>
            <Dropdown.Popover placement="bottom end">
              <Dropdown.Menu
                aria-label={t.conv.menu.aria}
                onAction={(key) => {
                  if (key === 'reply') props.onReply(message.id);
                  else if (key === 'edit') setDraft(message.content);
                  else if (key === 'copy') {
                    void navigator.clipboard.writeText(view.content);
                    toast(t.conv.menu.copied);
                  } else if (key === 'delete') props.onDelete(message.id, false);
                }}
              >
                <Dropdown.Item id="reply" textValue={t.conv.menu.reply}>
                  <CornerUpLeft className="size-4" />
                  {t.conv.menu.reply}
                </Dropdown.Item>
                {isOwn && !locked ? (
                  <Dropdown.Item id="edit" textValue={t.conv.menu.edit}>
                    <Pencil className="size-4" />
                    {t.conv.menu.edit}
                  </Dropdown.Item>
                ) : null}
                {!locked && view.content ? (
                  <Dropdown.Item id="copy" textValue={t.conv.menu.copy}>
                    <Copy className="size-4" />
                    {t.conv.menu.copy}
                  </Dropdown.Item>
                ) : null}
                {isOwn ? (
                  <Dropdown.Item id="delete" textValue={t.conv.menu.delete} variant="danger">
                    <Trash2 className="size-4" />
                    {t.conv.menu.delete}
                  </Dropdown.Item>
                ) : null}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
          {isOwn && (
            <Tooltip delay={300} closeDelay={0}>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                className="text-danger"
                aria-label={t.conv.menu.delete}
                onPress={(e) => props.onDelete(message.id, e.shiftKey)}
              >
                <Trash2 className="size-4" />
              </Button>
              <Tooltip.Content>
                <p>{t.conv.menu.delete}</p>
              </Tooltip.Content>
            </Tooltip>
          )}
        </div>
      )}
    </article>
  );
}

/* Le fil se re-rend à chaque frappe dans la saisie : seule la ligne qui change bouge. */
export const MessageRow = memo(Row, (a, b) =>
  a.message === b.message &&
  a.view === b.view &&
  a.author === b.author &&
  a.replyTo?.view === b.replyTo?.view &&
  a.replyTo?.author === b.replyTo?.author &&
  a.showHeader === b.showHeader &&
  a.isFresh === b.isFresh &&
  a.isOwn === b.isOwn &&
  a.peerName === b.peerName &&
  a.onAskResend === b.onAskResend,
);
