'use client';

/**
 * Message d'un salon de serveur, au gabarit Discord :
 *  - en-tête (avatar 40 px, nom à la couleur du rôle, badge APP, horodatage
 *    « Aujourd'hui à … ») seulement en début de groupe ; ensuite l'heure
 *    n'apparaît qu'au survol, dans la gouttière ;
 *  - référence de réponse reliée par une « épine » à l'avatar ;
 *  - message qui me mentionne surligné (fond + liseré) ;
 *  - barre d'actions flottante au survol : réactions rapides, réagir,
 *    répondre, modifier, plus ;
 *  - édition en place (Entrée enregistre, Échap annule).
 */

import { Avatar, Button, Dropdown, Label, TextArea, Tooltip } from '@heroui/react';
import { CornerUpLeft, Copy, Ellipsis, Link2, Pencil, Reply, Trash2 } from 'lucide-react';
import { memo, useEffect, useState, type ComponentProps, type HTMLAttributes } from 'react';

import { useTranslation } from '@/components/locale-provider';
import { useAppPrefs } from '@/hooks/use-app-prefs';
import { cn } from '@/lib/utils';
import { AlfyMarkdown } from '@/components/alfy/chat/markdown';
import { Attachment } from '@/components/alfy/chat/attachment';
import { LinkPreview } from '@/components/alfy/chat/link-preview';
import { ImageLightbox } from '@/components/alfy/chat/image-lightbox';
import { EmojiPicker } from '@/components/alfy/chat/emoji-picker';
import { UserPopover } from '@/components/alfy/members/user-popover';
import type { AlfyMessage, AlfyRole, AlfyUser } from '@/components/alfy/mock/types';
import { fullStamp, messageStamp, shortTime } from '@/components/alfy/guild/chat/time';

export interface AuthorView {
  id: string;
  name: string;
  color?: string;
  avatarUrl?: string;
  isBot?: boolean;
  /** Webhook : pas un membre — ni fiche de profil, ni menu de modération. */
  isWebhook?: boolean;
  user: AlfyUser;
  roles: AlfyRole[];
}

type PopoverExtras = Pick<
  ComponentProps<typeof UserPopover>,
  'allServerRoles' | 'moderatorPermissions' | 'onKick' | 'onBan' | 'onToggleRole'
>;

export interface GuildMessageProps {
  message: AlfyMessage;
  author: AuthorView;
  replyTo?: { message: AlfyMessage; author: AuthorView } | null;
  showHeader: boolean;
  mentionsMe: boolean;
  isOwn: boolean;
  canManage: boolean;
  canReact: boolean;
  isFresh: boolean;
  serverId: string;
  channelId: string;
  popoverExtras: PopoverExtras;
  authorMenu: HTMLAttributes<HTMLElement>;
  messageMenu: HTMLAttributes<HTMLElement>;
  quickReactions: string[];
  onReply: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onDelete: (message: AlfyMessage, skipConfirm: boolean) => void;
  onToggleReaction: (id: string, emoji: string) => void;
  onJumpTo: (id: string) => void;
  onCopyLink: (id: string) => void;
  /** Demande d'édition venue de la saisie (↑ dans une zone vide). */
  editRequested?: boolean;
  onEditHandled?: () => void;
}

function AuthorName({ author, popoverExtras, menu, isSelf }: { author: AuthorView; popoverExtras: PopoverExtras; menu: HTMLAttributes<HTMLElement>; isSelf: boolean }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex min-w-0 items-center gap-1" {...menu}>
      {author.isWebhook ? (
        <span className="min-w-0 truncate text-[15px] leading-5.5 font-medium">{author.name}</span>
      ) : (
        <UserPopover
          user={{ ...author.user, displayName: author.name }}
          roles={author.roles}
          isSelf={isSelf}
          placement="right"
          {...popoverExtras}
          moderatorPermissions={isSelf ? 0 : popoverExtras.moderatorPermissions}
          triggerClassName="min-w-0 cursor-pointer truncate rounded-sm text-[15px] leading-5.5 font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
        >
          <span style={author.color ? { color: author.color } : undefined}>{author.name}</span>
        </UserPopover>
      )}
      {author.isBot && (
        <span className="shrink-0 rounded-sm bg-accent px-1 text-[10px] leading-4 font-semibold text-accent-foreground">{t.guild.members.app}</span>
      )}
    </span>
  );
}

function Row(props: GuildMessageProps) {
  const {
    message,
    author,
    replyTo,
    showHeader,
    mentionsMe,
    isOwn,
    canManage,
    canReact,
    isFresh,
    serverId,
    popoverExtras,
    authorMenu,
    messageMenu,
    quickReactions,
    onReply,
    onEdit,
    onDelete,
    onToggleReaction,
    onJumpTo,
    onCopyLink,
    editRequested,
    onEditHandled,
  } = props;
  const { t, intlLocale } = useTranslation();
  const { prefs } = useAppPrefs();
  const compact = prefs.messageDisplay === 'compact';
  const [draft, setDraft] = useState<string | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const images = message.attachments.filter((a) => a.mimeType.startsWith('image/') && a.url);
  const editing = draft !== null;
  const header = showHeader || !!replyTo;
  const labels = { today: t.guild.chat.today, yesterday: t.guild.chat.yesterday };

  /* ↑ dans la saisie : ouvrir l'édition (en phase de rendu), puis prévenir le parent. */
  const [editTaken, setEditTaken] = useState(false);
  if (editRequested && !editTaken) {
    setEditTaken(true);
    setDraft(message.content);
  } else if (!editRequested && editTaken) {
    setEditTaken(false);
  }
  useEffect(() => {
    if (editRequested) onEditHandled?.();
  }, [editRequested, onEditHandled]);

  const save = () => {
    const next = (draft ?? '').trim();
    if (next && next !== message.content) onEdit(message.id, next);
    else if (!next) onDelete(message, false);
    setDraft(null);
  };

  return (
    <article
      data-message-id={message.id}
      {...messageMenu}
      className={cn(
        'group/msg relative pr-12 pl-18 transition-colors duration-(--dur-1)',
        header ? (compact ? 'mt-1' : 'mt-4.25') : '',
        compact ? 'py-px' : 'py-0.5',
        mentionsMe
          ? 'bg-warning/8 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-warning hover:bg-warning/12'
          : 'hover:bg-foreground/[0.035]',
        (editing || toolbarOpen) && !mentionsMe && 'bg-foreground/[0.035]',
        isFresh && 'alfy-enter',
      )}
    >
      {/* Référence de réponse, reliée par l'épine. */}
      {replyTo && (
        <div className="relative mb-1 flex min-w-0 items-center gap-1 text-[13px] text-muted">
          <span aria-hidden className="absolute top-1/2 -left-9 h-2.5 w-8 rounded-tl-md border-t-2 border-l-2 border-foreground/20" />
          <Avatar className="size-4 shrink-0 text-[8px]">
            {replyTo.author.avatarUrl && <Avatar.Image src={replyTo.author.avatarUrl} alt="" />}
            <Avatar.Fallback>{replyTo.author.name.slice(0, 1)}</Avatar.Fallback>
          </Avatar>
          <span className="shrink-0 font-medium" style={replyTo.author.color ? { color: replyTo.author.color } : undefined}>
            @{replyTo.author.name}
          </span>
          <button
            type="button"
            onClick={() => onJumpTo(replyTo.message.id)}
            className="min-w-0 cursor-pointer truncate text-left outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
          >
            {replyTo.message.content.replace(/[*_`~|>]/g, '') || t.guild.chat.attachmentOnly}
          </button>
        </div>
      )}

      {header ? (
        <>
          <span className="absolute top-0.5 left-4" {...authorMenu}>
            {author.isWebhook ? (
              <Avatar className={cn('size-10', replyTo && 'mt-[22px]')}>
                {author.avatarUrl && <Avatar.Image src={author.avatarUrl} alt="" />}
                <Avatar.Fallback>{author.name.slice(0, 1).toUpperCase()}</Avatar.Fallback>
              </Avatar>
            ) : (
              <UserPopover
                user={{ ...author.user, displayName: author.name }}
                roles={author.roles}
                isSelf={isOwn}
                placement="right"
                {...popoverExtras}
                moderatorPermissions={isOwn ? 0 : popoverExtras.moderatorPermissions}
                triggerClassName={cn('cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-focus', replyTo && 'mt-[22px]')}
              >
                <Avatar className="size-10 transition-[filter] duration-(--dur-1) hover:brightness-110">
                  {author.avatarUrl && <Avatar.Image src={author.avatarUrl} alt="" />}
                  <Avatar.Fallback>{author.name.slice(0, 1).toUpperCase()}</Avatar.Fallback>
                </Avatar>
              </UserPopover>
            )}
          </span>
          <h3 className="flex min-w-0 items-baseline gap-2">
            <AuthorName author={author} popoverExtras={popoverExtras} menu={authorMenu} isSelf={isOwn} />
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

      {editing ? (
        <div className="py-1">
          <TextArea
            aria-label={t.guild.chat.editAria}
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                save();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setDraft(null);
              }
            }}
            className="w-full"
          />
          <p className="mt-1 text-xs text-muted">
            {t.guild.chat.editHintEscape}{' '}
            <button type="button" className="cursor-pointer text-accent hover:underline" onClick={() => setDraft(null)}>
              {t.common.cancel}
            </button>{' '}
            • {t.guild.chat.editHintEnter}{' '}
            <button type="button" className="cursor-pointer text-accent hover:underline" onClick={save}>
              {t.guild.common.save}
            </button>
          </p>
        </div>
      ) : (
        message.content && (
          <div className="text-[15px] leading-5.5 wrap-break-word text-foreground/90">
            <AlfyMarkdown content={message.content} mentions={message.mentions} isModerator={canManage} />
            {message.editedAt && (
              <Tooltip delay={400} closeDelay={0}>
                <span className="ml-1 cursor-default text-[10px] text-muted">{t.guild.chat.edited}</span>
                <Tooltip.Content>
                  <p className="capitalize">{fullStamp(message.editedAt, intlLocale)}</p>
                </Tooltip.Content>
              </Tooltip>
            )}
          </div>
        )
      )}

      {message.attachments.length > 0 && (
        <div className="flex flex-col gap-1 py-0.5">
          {message.attachments.map((piece) => {
            const rank = images.indexOf(piece);
            return (
              <Attachment
                key={piece.id}
                attachment={piece}
                onPreview={rank >= 0 && prefs.showUploadedMedia ? () => setPreview(rank) : undefined}
              />
            );
          })}
          <ImageLightbox images={images} index={preview} onIndexChange={setPreview} onClose={() => setPreview(null)} />
        </div>
      )}
      {prefs.showEmbeds && message.linkPreview && <LinkPreview preview={message.linkPreview} />}

      {prefs.showReactions && message.reactions.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {message.reactions.map((r) => (
            <button
              key={r.emoji}
              type="button"
              disabled={!canReact}
              aria-pressed={r.me}
              onClick={() => onToggleReaction(message.id, r.emoji)}
              className={cn(
                'alfy-badge-pop flex h-6 cursor-pointer items-center gap-1.5 rounded-md border px-1.5 text-sm outline-none transition-colors duration-(--dur-1) focus-visible:ring-2 focus-visible:ring-focus',
                r.me ? 'border-accent/60 bg-accent/15 text-foreground' : 'border-transparent bg-foreground/6 text-muted hover:border-foreground/15',
              )}
            >
              <span className="leading-none">{r.emoji}</span>
              <span className="text-xs font-semibold tabular-nums">{r.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Barre d'actions flottante. */}
      {!editing && (
        <div
          className={cn(
            'absolute -top-4 right-4 z-10 flex items-center rounded-md border border-border bg-overlay p-0.5 shadow-md',
            'opacity-0 transition-opacity duration-(--dur-1) group-hover/msg:opacity-100 focus-within:opacity-100',
            toolbarOpen && 'opacity-100',
          )}
        >
          {canReact &&
            quickReactions.slice(0, 3).map((emoji) => (
              <Tooltip key={emoji} delay={300} closeDelay={0}>
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  aria-label={emoji}
                  className="size-8 min-w-8 text-base"
                  onPress={() => onToggleReaction(message.id, emoji)}
                >
                  {emoji}
                </Button>
                <Tooltip.Content>
                  <p>{t.guild.chat.reactWith}</p>
                </Tooltip.Content>
              </Tooltip>
            ))}
          {canReact && <EmojiPicker onPick={(emoji) => onToggleReaction(message.id, emoji)} serverId={serverId} />}
          <Tooltip delay={300} closeDelay={0}>
            <Button isIconOnly size="sm" variant="ghost" aria-label={t.guild.chat.reply} className="size-8 min-w-8 text-muted" onPress={() => onReply(message.id)}>
              <Reply className="size-4.5" aria-hidden />
            </Button>
            <Tooltip.Content>
              <p>{t.guild.chat.reply}</p>
            </Tooltip.Content>
          </Tooltip>
          {isOwn && (
            <Tooltip delay={300} closeDelay={0}>
              <Button isIconOnly size="sm" variant="ghost" aria-label={t.guild.chat.edit} className="size-8 min-w-8 text-muted" onPress={() => setDraft(message.content)}>
                <Pencil className="size-4" aria-hidden />
              </Button>
              <Tooltip.Content>
                <p>{t.guild.chat.edit}</p>
              </Tooltip.Content>
            </Tooltip>
          )}
          <Dropdown isOpen={toolbarOpen} onOpenChange={setToolbarOpen}>
            <Button isIconOnly size="sm" variant="ghost" aria-label={t.guild.chat.more} className="size-8 min-w-8 text-muted">
              <Ellipsis className="size-4.5" aria-hidden />
            </Button>
            <Dropdown.Popover placement="left top" className="min-w-52">
              <Dropdown.Menu aria-label={t.guild.chat.more}>
                {isOwn ? (
                  <Dropdown.Item id="edit" textValue={t.guild.chat.edit} onAction={() => setDraft(message.content)}>
                    <Pencil className="size-4" aria-hidden />
                    <Label>{t.guild.chat.edit}</Label>
                  </Dropdown.Item>
                ) : null}
                <Dropdown.Item id="reply" textValue={t.guild.chat.reply} onAction={() => onReply(message.id)}>
                  <CornerUpLeft className="size-4" aria-hidden />
                  <Label>{t.guild.chat.reply}</Label>
                </Dropdown.Item>
                <Dropdown.Item id="copy" textValue={t.guild.chat.copyText} onAction={() => void navigator.clipboard.writeText(message.content).catch(() => {})}>
                  <Copy className="size-4" aria-hidden />
                  <Label>{t.guild.chat.copyText}</Label>
                </Dropdown.Item>
                <Dropdown.Item id="link" textValue={t.guild.chat.copyLink} onAction={() => onCopyLink(message.id)}>
                  <Link2 className="size-4" aria-hidden />
                  <Label>{t.guild.chat.copyLink}</Label>
                </Dropdown.Item>
                {isOwn || canManage ? (
                  <Dropdown.Item id="delete" textValue={t.guild.chat.delete} variant="danger" onAction={() => onDelete(message, false)}>
                    <Trash2 className="size-4" aria-hidden />
                    <Label>{t.guild.chat.delete}</Label>
                  </Dropdown.Item>
                ) : null}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      )}
    </article>
  );
}

/* Le fil se re-rend à chaque frappe : sans cette comparaison, chaque
   caractère re-rendrait toutes les lignes montées. */
export const GuildMessage = memo(Row, (a, b) => {
  const m = a.message;
  const n = b.message;
  const sameMessage =
    m === n ||
    (m.id === n.id && m.content === n.content && m.editedAt === n.editedAt && m.reactions === n.reactions && m.attachments === n.attachments);
  return (
    sameMessage &&
    a.showHeader === b.showHeader &&
    a.replyTo?.message === b.replyTo?.message &&
    a.replyTo?.author === b.replyTo?.author &&
    a.author === b.author &&
    a.mentionsMe === b.mentionsMe &&
    a.isFresh === b.isFresh &&
    a.isOwn === b.isOwn &&
    a.canManage === b.canManage &&
    a.canReact === b.canReact &&
    a.quickReactions === b.quickReactions &&
    a.popoverExtras === b.popoverExtras &&
    a.editRequested === b.editRequested
  );
});
