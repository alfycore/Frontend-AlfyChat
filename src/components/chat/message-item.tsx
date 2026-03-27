'use client';

import { memo, type Dispatch, type SetStateAction } from 'react';
import {
  ReplyIcon, CopyIcon, PinIcon, Trash2Icon, PencilIcon, SmileIcon, MoreHorizontalIcon, ClockIcon,
} from '@/components/icons';
import {
  Avatar, Button, Dropdown, InputGroup, Tooltip,
} from '@heroui/react';
import { MarkdownRenderer } from '@/components/chat/markdown-renderer';
import { EmojiPicker } from '@/components/chat/emoji-picker';
import { UserProfilePopover } from '@/components/chat/user-profile-popover';
import { Twemoji } from '@/lib/twemoji';
import { resolveMediaUrl } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Reaction = { emoji: string; userIds: string[]; count: number };
export type MessageSender = { id: string; username: string; displayName?: string; avatarUrl?: string; isBot?: boolean; isVerifiedBot?: boolean };
export type MessageData = {
  id: string;
  content: string;
  authorId: string;
  channelId?: string;
  conversationId?: string;
  recipientId?: string;
  replyToId?: string;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  reactions: Reaction[];
  sender?: MessageSender;
  isSystem?: boolean;
  ephemeral?: boolean;
  pending?: boolean;
};

export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (date >= startOfToday) {
    return time;
  }
  if (date >= startOfYesterday) {
    return `hier à ${time}`;
  }
  if (date >= oneWeekAgo) {
    const diffDays = Math.floor((startOfToday.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
    return `il y a ${diffDays} jours à ${time}`;
  }
  const dateStr = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${dateStr} à ${time}`;
};

// ── Props ─────────────────────────────────────────────────────────────────────

export interface MessageItemProps {
  message: MessageData;
  currentUser: MessageSender | null;
  recipientName?: string;
  isEditing: boolean;
  editInput: string;
  replyMessage: MessageData | null;
  onSetEditInput: Dispatch<SetStateAction<string>>;
  onReply: (id: string, content: string, authorName: string) => void;
  onCopy: (content: string) => void;
  onReaction: (id: string, emoji: string) => void;
  onRemoveReaction: (id: string, emoji: string) => void;
  onStartEdit: (id: string, content: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
}

// ── MessageItem ───────────────────────────────────────────────────────────────

export const MessageItem = memo(function MessageItem({
  message,
  currentUser,
  recipientName,
  isEditing,
  editInput,
  replyMessage,
  onSetEditInput,
  onReply,
  onCopy,
  onReaction,
  onRemoveReaction,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: MessageItemProps) {
  const isMe = !!currentUser && message.authorId === currentUser.id;
  const displayName = isMe
    ? currentUser!.displayName || currentUser!.username
    : message.sender?.displayName || message.sender?.username || recipientName || 'Utilisateur';
  const initial = displayName?.[0]?.toUpperCase() || 'U';

  // ── Message système ──
  if (message.isSystem) {
    return (
      <div className="flex items-center justify-center gap-3 px-4 py-3">
        <div className="h-px flex-1 bg-[var(--border)]/20" />
        <div className="flex items-center gap-2 rounded-full bg-[var(--surface-secondary)]/30 px-4 py-1.5 backdrop-blur-sm">
          <p className="text-[11px] italic text-[var(--muted)]/70">
            <MarkdownRenderer content={message.content} />
          </p>
          <span className="text-[10px] tabular-nums text-[var(--muted)]/40">{formatTime(message.createdAt)}</span>
        </div>
        <div className="h-px flex-1 bg-[var(--border)]/20" />
      </div>
    );
  }

  return (
    <div className={`group relative flex items-start gap-3 rounded-xl px-3 py-2 transition-colors duration-150 hover:bg-[var(--surface-secondary)]/25 md:gap-3.5 md:px-4 md:py-2.5`}>
      {/* Action toolbar — floats top-right on hover */}
      <div className="absolute -top-3 right-2 z-10 flex items-center gap-0.5 rounded-lg border border-[var(--border)]/50 bg-[var(--surface)]/95 px-0.5 py-0.5 opacity-0 shadow-lg shadow-black/5 backdrop-blur-xl transition-all duration-150 group-hover:opacity-100">
        <Tooltip delay={0}>
            <Button
              isIconOnly
              size="sm"
              variant="tertiary"
              className="size-7 rounded-md text-[var(--muted)] hover:text-[var(--foreground)]"
              onPress={() => onReply(message.id, message.content, displayName || 'Utilisateur')}
            >
              <ReplyIcon size={15} />
            </Button>
            <Tooltip.Content>Répondre</Tooltip.Content>
        </Tooltip>

        <EmojiPicker onSelect={(emoji) => onReaction(message.id, emoji)}>
          <Button isIconOnly size="sm" variant="tertiary" className="size-7 rounded-md text-[var(--muted)] hover:text-[var(--foreground)]">
            <SmileIcon size={15} />
          </Button>
        </EmojiPicker>

        <Dropdown>
          <Dropdown.Trigger>
            <div
              role="button"
              tabIndex={0}
              aria-label="Plus d'options"
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--surface-secondary)]/60 hover:text-[var(--foreground)]"
            >
              <MoreHorizontalIcon size={15} />
            </div>
          </Dropdown.Trigger>
          <Dropdown.Popover className="min-w-44">
            <Dropdown.Menu
              onAction={(key) => {
                switch (key) {
                  case 'reply': onReply(message.id, message.content, displayName || 'Utilisateur'); break;
                  case 'copy': onCopy(message.content); break;
                  case 'edit': onStartEdit(message.id, message.content); break;
                  case 'delete': onDelete(message.id); break;
                }
              }}
            >
              <Dropdown.Item id="reply" textValue="Répondre">
                <ReplyIcon size={15} />
                <span>Répondre</span>
              </Dropdown.Item>
              <Dropdown.Item id="copy" textValue="Copier le texte">
                <CopyIcon size={15} />
                <span>Copier le texte</span>
              </Dropdown.Item>
              <Dropdown.Item id="pin" textValue="Épingler">
                <PinIcon size={15} />
                <span>Épingler</span>
              </Dropdown.Item>
              {isMe && (
                <Dropdown.Item id="edit" textValue="Modifier">
                  <PencilIcon size={15} />
                  <span>Modifier</span>
                </Dropdown.Item>
              )}
              {isMe && (
                <Dropdown.Item id="delete" textValue="Supprimer" variant="danger">
                  <Trash2Icon size={15} />
                  <span>Supprimer</span>
                </Dropdown.Item>
              )}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>

      {/* Avatar */}
      <UserProfilePopover userId={message.authorId}>
        <button className="mt-0.5 shrink-0">
          <Avatar className="size-9 cursor-pointer shadow-sm transition-transform duration-150 hover:scale-105 md:size-10">
            <Avatar.Image
              src={resolveMediaUrl(isMe ? currentUser?.avatarUrl : message.sender?.avatarUrl)}
              alt={displayName}
            />
            <Avatar.Fallback className={isMe ? 'bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold' : 'bg-emerald-600 text-white font-semibold'}>
              {initial}
            </Avatar.Fallback>
          </Avatar>
        </button>
      </UserProfilePopover>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Reply reference */}
        {replyMessage && (() => {
          const repliedName =
            replyMessage.authorId === currentUser?.id
              ? currentUser?.displayName || currentUser?.username
              : replyMessage.sender?.displayName || replyMessage.sender?.username || recipientName || 'Utilisateur';
          return (
            <div className="mb-1 flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
              <div className="h-3 w-0.5 rounded-full bg-[var(--accent)]/40" />
              <ReplyIcon size={11} className="shrink-0 rotate-180 text-[var(--accent)]/50" />
              <span className="font-medium text-[var(--foreground)]/60">{repliedName}</span>
              <span className="max-w-60 truncate text-[var(--muted)]/60">{replyMessage.content}</span>
            </div>
          );
        })()}

        {/* Author + timestamp */}
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[var(--foreground)] md:text-sm">{displayName}</span>
          {message.sender?.isBot && (
            <span className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-bold uppercase leading-none ${
              message.sender.isVerifiedBot
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                : 'bg-[var(--muted)]/15 text-[var(--muted)] border border-[var(--muted)]/30'
            }`}>
              {message.sender.isVerifiedBot && (
                <svg className="size-2" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0l2.5 3.5L14.5 2l-1.5 4L16 8l-3.5 2.5L14.5 14l-4-1.5L8 16l-2.5-3.5L1.5 14l1.5-4L0 8l3.5-2.5L1.5 2l4 1.5L8 0z"/>
                </svg>
              )}
              BOT
            </span>
          )}
          <span className="text-[10px] tabular-nums text-[var(--muted)]/50 md:text-[11px]">
            {formatTime(message.createdAt)}
          </span>
          {message.pending && (
            <ClockIcon size={11} className="text-[var(--muted)]/30" />
          )}
          {!!message.isEdited && (
            <span className="text-[10px] text-[var(--muted)]/40">(modifié)</span>
          )}
        </div>

        {/* Message body */}
        {isEditing ? (
          <div className="mt-1.5 space-y-1">
            <InputGroup className="rounded-lg border-[var(--accent)]/30 bg-[var(--background)]/80 shadow-sm shadow-[var(--accent)]/5 backdrop-blur-sm">
              <InputGroup.Input
                value={editInput}
                onChange={(e) => onSetEditInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSaveEdit(message.id);
                  }
                  if (e.key === 'Escape') onCancelEdit();
                }}
                aria-label="Modifier le message"
                autoFocus
              />
            </InputGroup>
            <p className="text-[10px] text-[var(--muted)]/50">
              Entrée pour sauvegarder · Échap pour annuler
            </p>
          </div>
        ) : (
          <div className="mt-0.5 text-[13px] leading-relaxed text-[var(--foreground)]/85 md:text-sm">
            <MarkdownRenderer content={message.content} />
          </div>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.reactions.map((reaction, i) => {
              const hasReacted = !!currentUser && reaction.userIds?.includes(currentUser.id);
              return (
                <button
                  key={i}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all duration-150 ${
                    hasReacted
                      ? 'border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'border-[var(--border)]/30 bg-[var(--surface-secondary)]/15 hover:border-[var(--border)]/50 hover:bg-[var(--surface-secondary)]/30'
                  }`}
                  onClick={() =>
                    hasReacted
                      ? onRemoveReaction(message.id, reaction.emoji)
                      : onReaction(message.id, reaction.emoji)
                  }
                >
                  <span><Twemoji emoji={reaction.emoji} size={14} /></span>
                  {reaction.count > 0 && <span className="text-[11px] tabular-nums">{reaction.count}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
