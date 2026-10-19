'use client';

/**
 * Vue d'un salon textuel / d'annonces de serveur.
 *
 * Fil : regroupement par auteur (5 min), séparateurs de jour, barre rouge
 * « NOUVEAU » au premier message non lu, messages qui me mentionnent
 * surlignés, retour au présent quand on a remonté l'historique, indicateur de
 * frappe sous la saisie. Le défilement (ancrage en bas, chargement de
 * l'historique sans saut) réutilise le moteur `useDmScroll`.
 */

import { Button, Spinner, toast } from '@heroui/react';
import { ArrowDown, Copy, CornerUpLeft, Link2, Pencil, SmilePlus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import * as notif from '@/lib/notification-store';
import { useDmScroll } from '@/components/alfy/dm/use-dm-scroll';
import { useAlfyServerMessages } from '@/components/alfy/live/use-alfy-server-messages';
import { toAlfyUser } from '@/components/alfy/live/map';
import { socketService } from '@/lib/socket';
import { messageLink } from '@/lib/domains';
import type { AlfyMessage } from '@/components/alfy/mock/types';
import { useBindContextMenu, type MenuSection } from '@/components/alfy/guild/context-menu';
import { CHANNEL_ICONS } from '@/components/alfy/guild/channel-icons';
import {
  memberColor,
  memberName,
  memberRoles,
  useGuildChannel,
  useGuildChannels,
  useGuildMembers,
  useGuildRoles,
  useMyPerms,
} from '@/components/alfy/guild/hooks';
import { useMemberMenu } from '@/components/alfy/guild/members/member-menu';
import { toAlfyRole } from '@/components/alfy/guild/members/member-list';
import { banMember, copyText, kickMember, toggleMemberRole } from '@/components/alfy/guild/actions';
import { guildUi } from '@/components/alfy/guild/ui';
import { ChannelHeader } from '@/components/alfy/guild/chat/channel-header';
import { GuildComposer } from '@/components/alfy/guild/chat/guild-composer';
import { GuildMessage, type AuthorView, type GuildMessageProps } from '@/components/alfy/guild/chat/guild-message';
import { dayDivider, sameDay, shortTime } from '@/components/alfy/guild/chat/time';

const GROUP_WINDOW_MS = 7 * 60 * 1000;

type ComponentPropsExtras = GuildMessageProps['popoverExtras'];

/** Instant d'ouverture du salon : seuls les messages postérieurs s'animent. */
const openedNow = () => Date.now();
const QUICK_REACTIONS = ['👍', '❤️', '😂'];

interface TextChannelViewProps {
  serverId: string;
  channelId: string;
  /** Rendu dans un panneau (chat d'un salon vocal) : sans en-tête. */
  embedded?: boolean;
}

export function TextChannelView({ serverId, channelId, embedded = false }: TextChannelViewProps) {
  const { t, tx, intlLocale } = useTranslation();
  const { user } = useAuth();
  const me = user?.id ?? '';
  const { isMobile, openSidebar, toggleMemberList, toggleMemberListDesktop, memberListDesktopVisible } = useMobileNav();
  const channel = useGuildChannel(serverId, channelId);
  const channels = useGuildChannels(serverId);
  const members = useGuildMembers(serverId);
  const roles = useGuildRoles(serverId);
  const perms = useMyPerms(serverId, channelId);
  const serverPerms = useMyPerms(serverId);
  const bind = useBindContextMenu();
  const memberMenu = useMemberMenu(serverId);

  const { messages, isLoading, error, hasMore, isLoadingMore, loadMore, typingNames, send, edit, remove, toggleReaction, notifyTyping } =
    useAlfyServerMessages(serverId, channelId);

  const itemIds = useMemo(() => messages.map((m) => m.id), [messages]);
  const { viewportRef, pinned, unread, scrollToBottom, scrollToMessage } = useDmScroll({ itemIds, hasMore, isLoadingMore, onLoadMore: loadMore });

  /* Premier message non lu à l'ouverture (barre rouge « NOUVEAU »). */
  const [lastSeen] = useState(() => notif.getLastSeen(`channel:${channelId}`));
  const [openedAt] = useState(openedNow);
  const [replyToId, setReplyToId] = useState<string | null>(null);

  /* Lien de message (`…#msg-<id>`) : on y saute dès qu'il est chargé, une fois. */
  const [anchor, setAnchor] = useState<string | null>(() =>
    typeof window !== 'undefined' && window.location.hash.startsWith('#msg-') ? decodeURIComponent(window.location.hash.slice(5)) : null,
  );
  useEffect(() => {
    if (!anchor || !itemIds.includes(anchor)) return;
    const frame = requestAnimationFrame(() => {
      if (!scrollToMessage(anchor)) return;
      setAnchor(null);
      history.replaceState(null, '', window.location.pathname + window.location.search);
    });
    return () => cancelAnimationFrame(frame);
  }, [anchor, itemIds, scrollToMessage]);
  const [editRequest, setEditRequest] = useState<string | null>(null);

  /* ── Auteurs : une vue stable par membre (indispensable au memo des lignes). ── */
  const authors = useMemo(() => {
    const map = new Map<string, AuthorView>();
    for (const m of Object.values(members)) {
      map.set(m.userId, {
        id: m.userId,
        name: memberName(m),
        color: memberColor(m, roles),
        avatarUrl: m.user.avatarUrl,
        isBot: m.user.isBot,
        user: m.user,
        roles: memberRoles(m, roles).map(toAlfyRole),
      });
    }
    return map;
  }, [members, roles]);

  const authorOf = useCallback(
    (id: string): AuthorView => {
      const known = authors.get(id);
      if (known) return known;
      const u = id === me && user ? toAlfyUser(user as unknown as Record<string, unknown>, id) : toAlfyUser({ id, username: t.guild.chat.unknownUser }, id);
      return { id, name: u.displayName, avatarUrl: u.avatarUrl, user: u, roles: [] };
    },
    [authors, me, user, t],
  );

  /* Fiche (rôles, modération) : un objet stable par auteur, pour le memo des lignes. */
  const extrasByAuthor = useMemo(() => {
    const base = { allServerRoles: roles.filter((r) => !r.isDefault).map(toAlfyRole), moderatorPermissions: serverPerms.bits };
    const make = (authorId: string): ComponentPropsExtras => ({
      ...base,
      onKick: () => kickMember(serverId, authorId),
      onBan: (reason: string) => banMember(serverId, authorId, reason),
      onToggleRole: (roleId: string, next: boolean) => void toggleMemberRole(serverId, authorId, roleId, next),
    });
    const map = new Map<string, ComponentPropsExtras>();
    for (const id of Object.keys(members)) map.set(id, make(id));
    return { map, make };
  }, [roles, serverPerms.bits, serverId, members]);
  const extrasFor = (authorId: string) => extrasByAuthor.map.get(authorId) ?? extrasByAuthor.make(authorId);

  /* ── Mentions me concernant ──────────────────────────────────────────── */
  const myHandle = user?.username?.toLowerCase();
  const myRoleNames = useMemo(() => {
    const mine = members[me];
    return memberRoles(mine, roles).map((r) => r.name.toLowerCase().replace(/\s+/g, '_'));
  }, [members, me, roles]);
  const mentionsMe = useCallback(
    (m: AlfyMessage, replied?: AlfyMessage) => {
      if (m.authorId === me) return false;
      if (replied?.authorId === me) return true;
      const text = m.content.toLowerCase();
      if (/(^|\s)@(everyone|here)\b/.test(text)) return true;
      if (myHandle && new RegExp(`(^|\\s)@${myHandle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text)) return true;
      return myRoleNames.some((r) => text.includes(`@${r}`));
    },
    [me, myHandle, myRoleNames],
  );

  /* ── Lignes pré-calculées ────────────────────────────────────────────── */
  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const lines = useMemo(() => {
    const out: { message: AlfyMessage; day: boolean; showHeader: boolean; isNew: boolean }[] = [];
    let newMarked = false;
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const prev = i > 0 ? messages[i - 1] : undefined;
      const day = !prev || !sameDay(prev.createdAt, m.createdAt);
      const grouped =
        !day && !!prev && prev.authorId === m.authorId && !m.replyToId && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS;
      const isNew = !newMarked && !!lastSeen && m.authorId !== me && m.createdAt > lastSeen;
      if (isNew) newMarked = true;
      out.push({ message: m, day, showHeader: !grouped || isNew, isNew });
    }
    return out;
  }, [messages, lastSeen, me]);

  /* ── Actions ─────────────────────────────────────────────────────────── */
  const onReply = useCallback((id: string) => setReplyToId(id), []);
  const onEdit = useCallback((id: string, content: string) => edit(id, content), [edit]);
  const onToggleReaction = useCallback((id: string, emoji: string) => toggleReaction(id, emoji), [toggleReaction]);
  const onJumpTo = useCallback((id: string) => void scrollToMessage(id), [scrollToMessage]);
  const onCopyLink = useCallback(
    (id: string) => void copyText(messageLink(serverId, channelId, id), t.guild.menu.linkCopied),
    [serverId, channelId, t],
  );
  const onDelete = useCallback(
    async (m: AlfyMessage, skipConfirm: boolean) => {
      if (!skipConfirm) {
        const ok = await guildUi.confirm({
          title: t.guild.chat.deleteTitle,
          body: m.content.slice(0, 280) || t.guild.chat.attachmentOnly,
          confirmLabel: t.guild.chat.delete,
          danger: true,
        });
        if (!ok) return;
      }
      remove(m.id);
    },
    [remove, t],
  );
  const onEditHandled = useCallback(() => setEditRequest(null), []);

  const messageMenu = useCallback(
    (m: AlfyMessage): MenuSection[] => {
      const own = m.authorId === me;
      return [
        {
          id: 'react',
          items: [
            perms.can('REACT') && {
              kind: 'submenu',
              id: 'react',
              label: t.guild.chat.addReaction,
              icon: SmilePlus,
              sections: [
                {
                  id: 'quick',
                  items: ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👀'].map((e) => ({ id: `r-${e}`, label: e, onAction: () => toggleReaction(m.id, e) })),
                },
              ],
            },
            own && { id: 'edit', label: t.guild.chat.edit, icon: Pencil, onAction: () => setEditRequest(m.id) },
            perms.can('SEND') && { id: 'reply', label: t.guild.chat.reply, icon: CornerUpLeft, onAction: () => setReplyToId(m.id) },
          ],
        },
        {
          id: 'copy',
          items: [
            { id: 'copy-text', label: t.guild.chat.copyText, icon: Copy, onAction: () => void copyText(m.content, t.guild.menu.copied) },
            { id: 'copy-link', label: t.guild.chat.copyLink, icon: Link2, onAction: () => onCopyLink(m.id) },
          ],
        },
        (own || perms.can('MANAGE_MESSAGES')) && {
          id: 'danger',
          items: [{ id: 'delete', label: t.guild.chat.delete, icon: Trash2, danger: true, onAction: () => void onDelete(m, false) }],
        },
        { id: 'id', items: [{ id: 'copy-id', label: t.guild.chat.copyMessageId, icon: Copy, onAction: () => void copyText(m.id, t.guild.menu.copied) }] },
      ].filter(Boolean) as MenuSection[];
    },
    [me, perms, t, toggleReaction, onCopyLink, onDelete],
  );

  const replyTo = replyToId ? byId.get(replyToId) : undefined;
  const editLast = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].authorId === me) {
        setEditRequest(messages[i].id);
        scrollToMessage(messages[i].id);
        return;
      }
    }
  };

  if (!channel) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-surface">
        <Spinner size="sm" />
      </div>
    );
  }

  const Icon = CHANNEL_ICONS[channel.type] ?? CHANNEL_ICONS.text;
  const canSend = perms.can('READ') && perms.can('SEND');

  return (
    <section aria-label={channel.name} className="flex h-full min-w-0 flex-1 flex-col bg-surface">
      {!embedded && (
        <ChannelHeader
          channel={channel}
          messages={messages}
          onJump={scrollToMessage}
          membersOpen={memberListDesktopVisible}
          onToggleMembers={isMobile ? toggleMemberList : toggleMemberListDesktop}
          onOpenNav={isMobile ? openSidebar : undefined}
        />
      )}

      <div className="relative min-h-0 flex-1">
        <div ref={viewportRef} className="alfy-thin-scroll h-full overflow-y-auto overscroll-contain">
          <div className="flex min-h-full flex-col justify-end pb-6">
            {isLoadingMore && (
              <div className="flex justify-center py-3" role="status" aria-label={t.guild.chat.loadingOlder}>
                <Spinner size="sm" />
              </div>
            )}

            {!hasMore && !isLoading && (
              <div className="alfy-enter px-4 pt-10 pb-4">
                <span className="flex size-17 items-center justify-center rounded-full bg-surface-tertiary text-foreground">
                  <Icon className="size-10" strokeWidth={1.75} aria-hidden />
                </span>
                <h2 className={cn('mt-3 leading-tight font-bold tracking-tight', embedded ? 'text-xl' : 'text-[28px]')}>
                  {tx(t.guild.chat.welcomeTitle, { name: channel.name })}
                </h2>
                <p className="mt-1 max-w-prose text-[15px] text-muted">
                  {channel.type === 'announcement' ? tx(t.guild.chat.welcomeAnnouncement, { name: channel.name }) : tx(t.guild.chat.welcomeBody, { name: channel.name })}
                </p>
                {perms.can('MANAGE_CHANNELS') && (
                  <Button size="sm" variant="ghost" className="mt-2 -ml-2 text-accent" onPress={() => guildUi.channelSettings(serverId, channel.id)}>
                    <Pencil className="size-3.5" aria-hidden />
                    {t.guild.chat.editChannel}
                  </Button>
                )}
              </div>
            )}

            {error && <p className="mx-4 my-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{t.guild.chat.historyError}</p>}

            {isLoading && messages.length === 0 && (
              <div className="flex flex-1 items-center justify-center py-12" role="status">
                <Spinner />
              </div>
            )}

            {lines.map(({ message, day, showHeader, isNew }) => {
              const replied = message.replyToId ? byId.get(message.replyToId) : undefined;
              return (
                <div key={message.id}>
                  {day && !isNew && (
                    <div className="relative mx-4 mt-6 mb-2 flex items-center" role="separator" aria-label={dayDivider(message.createdAt, intlLocale)}>
                      <span className="h-px flex-1 bg-separator" />
                      <span className="px-2 text-xs font-semibold text-muted">{dayDivider(message.createdAt, intlLocale)}</span>
                      <span className="h-px flex-1 bg-separator" />
                    </div>
                  )}
                  {isNew && (
                    <div className="relative mx-4 mt-4 mb-1 flex items-center" role="separator" aria-label={t.guild.chat.newMessages}>
                      <span className="h-px flex-1 bg-danger" />
                      {day && <span className="px-2 text-xs font-semibold text-danger">{dayDivider(message.createdAt, intlLocale)}</span>}
                      <span className="rounded-sm bg-danger px-1 text-[10px] leading-4 font-bold text-(--danger-foreground) uppercase">{t.guild.chat.newBadge}</span>
                    </div>
                  )}
                  <GuildMessage
                    message={message}
                    author={authorOf(message.authorId)}
                    replyTo={replied ? { message: replied, author: authorOf(replied.authorId) } : null}
                    showHeader={showHeader}
                    mentionsMe={mentionsMe(message, replied)}
                    isOwn={message.authorId === me}
                    canManage={perms.can('MANAGE_MESSAGES')}
                    canReact={perms.can('REACT')}
                    isFresh={new Date(message.createdAt).getTime() > openedAt}
                    serverId={serverId}
                    channelId={channelId}
                    popoverExtras={extrasFor(message.authorId)}
                    authorMenu={bind(() => memberMenu(message.authorId))}
                    messageMenu={bind(() => messageMenu(message))}
                    quickReactions={QUICK_REACTIONS}
                    onReply={onReply}
                    onEdit={onEdit}
                    onDelete={(m, skip) => void onDelete(m, skip)}
                    onToggleReaction={onToggleReaction}
                    onJumpTo={onJumpTo}
                    onCopyLink={onCopyLink}
                    editRequested={editRequest === message.id}
                    onEditHandled={onEditHandled}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Retour au présent */}
        <div
          className={cn(
            'pointer-events-none absolute inset-x-4 bottom-2 flex justify-center transition-[opacity,transform] duration-(--dur-2) ease-out-quart',
            pinned ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100',
          )}
        >
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            className={cn(
              'flex h-8 w-full max-w-xl cursor-pointer items-center justify-between gap-2 rounded-t-lg bg-accent px-4 text-sm font-medium text-accent-foreground shadow-md outline-none focus-visible:ring-2 focus-visible:ring-focus',
              pinned ? 'pointer-events-none' : 'pointer-events-auto',
            )}
          >
            <span className="truncate">
              {unread > 0
                ? tx(unread > 1 ? t.guild.chat.newSince : t.guild.chat.newSinceOne, { n: unread, time: shortTime(new Date().toISOString(), intlLocale) })
                : t.guild.chat.viewingOlder}
            </span>
            <span className="flex shrink-0 items-center gap-1 font-semibold">
              {t.guild.chat.jumpToPresent}
              <ArrowDown className="size-4" aria-hidden />
            </span>
          </button>
        </div>
      </div>

      <GuildComposer
        serverId={serverId}
        channel={channel}
        members={members}
        roles={roles}
        channels={channels}
        canSend={!perms.exact || canSend}
        canAttach={perms.can('ATTACH_FILES')}
        canMentionEveryone={perms.can('MENTION_EVERYONE')}
        slowExempt={perms.can('MANAGE_MESSAGES') || perms.can('MANAGE_CHANNELS')}
        replyTo={replyTo ? { message: replyTo, authorName: authorOf(replyTo.authorId).name } : null}
        onCancelReply={() => setReplyToId(null)}
        onSend={({ content, attachments, mentionedUserIds, replyToId: rid }) => {
          send(content, { replyToId: rid, attachments: attachments.length ? attachments : undefined, mentionedUserIds, channelName: channel.name });
          scrollToBottom();
        }}
        onTyping={notifyTyping}
        onEditLast={editLast}
        compact={embedded}
      />
      <TypingLine names={typingNames} />
    </section>
  );
}

/** Indicateur de frappe, sous la saisie (comme Discord). */
function TypingLine({ names }: { names: string[] }) {
  const { t, tx } = useTranslation();
  const label =
    names.length === 0
      ? ''
      : names.length === 1
        ? tx(t.guild.chat.typingOne, { name: names[0] })
        : names.length === 2
          ? tx(t.guild.chat.typingTwo, { a: names[0], b: names[1] })
          : names.length === 3
            ? tx(t.guild.chat.typingThree, { a: names[0], b: names[1], c: names[2] })
            : t.guild.chat.typingMany;
  return (
    <div className="-mt-5 flex h-5 shrink-0 items-center gap-1.5 px-4 pb-1 text-xs text-muted" aria-live="polite">
      {label && (
        <>
          <span className="flex items-center gap-0.5" aria-hidden>
            <span className="alfy-typing-dot size-1.5 rounded-full bg-foreground/70" />
            <span className="alfy-typing-dot size-1.5 rounded-full bg-foreground/70 [animation-delay:150ms]" />
            <span className="alfy-typing-dot size-1.5 rounded-full bg-foreground/70 [animation-delay:300ms]" />
          </span>
          <span className="truncate">{label}</span>
        </>
      )}
    </div>
  );
}

/** Erreurs d'envoi renvoyées par la passerelle → messages lisibles. */
export function useMessageErrorToasts() {
  const { t, tx } = useTranslation();
  useEffect(() => {
    // Deux formes coexistent : `SERVER_MESSAGE_ERROR` direct, et `ERROR` typé.
    const onDirect = (data: unknown) => {
      const d = ((data as { payload?: unknown })?.payload ?? data) as { error?: string; retryAfter?: number; message?: string };
      if (d?.error === 'SLOWMODE') toast.warning(tx(t.guild.chat.slowmodeError, { s: d.retryAfter ?? 1 }));
      else if (d?.error === 'MUTED') toast.danger(d.message || t.guild.chat.mutedError);
      else if (d?.error === 'connection_failed') toast.danger(t.guild.chat.sendFailed);
    };
    const onError = (data: unknown) => {
      const d = data as { type?: string; payload?: { message?: string } };
      if (d?.type !== 'SERVER_MESSAGE_ERROR' && d?.type !== 'REACTION_ERROR') return;
      const code = d.payload?.message ?? '';
      if (code === 'PERMISSION_DENIED' || code === 'NOT_A_CHANNEL_MEMBER') toast.danger(t.guild.chat.noSendPermission);
      else if (code === 'ATTACH_DENIED') toast.danger(t.guild.composer.noAttach);
      else if (code) toast.danger(t.guild.chat.sendFailed, { description: code });
    };
    socketService.on('SERVER_MESSAGE_ERROR', onDirect);
    socketService.on('ERROR', onError);
    return () => {
      socketService.off('SERVER_MESSAGE_ERROR', onDirect);
      socketService.off('ERROR', onError);
    };
  }, [t, tx]);
}
