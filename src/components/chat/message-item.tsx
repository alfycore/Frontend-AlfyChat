'use client';

import { memo, type Dispatch, type SetStateAction } from 'react';
import {
  ReplyIcon, CopyIcon, PinIcon, Trash2Icon, PencilIcon, SmileIcon, MoreHorizontalIcon, ClockIcon,
} from '@/components/icons';
import {
  Avatar, Button, Chip, Dropdown, InputGroup, Tooltip,
} from '@heroui/react';
import { MarkdownRenderer } from '@/components/chat/markdown-renderer';
import { EmojiPicker } from '@/components/chat/emoji-picker';
import { UserProfilePopover } from '@/components/chat/user-profile-popover';
import { Twemoji } from '@/lib/twemoji';
import { resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

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
  if (date >= startOfToday) return time;
  if (date >= startOfYesterday) return `hier à ${time}`;
  if (date >= oneWeekAgo) {
    const diffDays = Math.floor((startOfToday.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
    return `il y a ${diffDays} jours à ${time}`;
  }
  return `${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} à ${time}`;
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
  message, currentUser, recipientName, isEditing, editInput, replyMessage,
  onSetEditInput, onReply, onCopy, onReaction, onRemoveReaction,
  onStartEdit, onSaveEdit, onCancelEdit, onDelete,
}: MessageItemProps) {
  const isMe = !!currentUser && message.authorId === currentUser.id;
  const displayName = isMe
    ? currentUser!.displayName || currentUser!.username
    : message.sender?.displayName || message.sender?.username || recipientName || 'Utilisateur';
  const initial = displayName?.[0]?.toUpperCase() || 'U';

  // ── Message système ──
  if (message.isSystem) {
    return (
      <div className="flex items-center justify-center gap-3 px-4 py-2">
        <div className="h-px flex-1 bg-[var(--border)]/15" />
        <span className="flex items-center gap-1.5 rounded-full border border-[var(--border)]/20 bg-[var(--surface-secondary)]/30 px-3 py-1 text-[10px] italic text-[var(--muted)]/60 backdrop-blur-sm">
          <MarkdownRenderer content={message.content} />
          <span className="text-[9px] tabular-nums text-[var(--muted)]/40">{formatTime(message.createdAt)}</span>
        </span>
        <div className="h-px flex-1 bg-[var(--border)]/15" />
      </div>
    );
  }

  return (
    <div className={cn(
      'group relative px-2 py-1 md:px-3',
      message.pending && 'opacity-60',
    )}>
      {/* ── Toolbar flottant ── */}
      <div className="absolute -top-4 right-4 z-20 flex items-center gap-0.5 rounded-xl border border-[var(--border)]/30 bg-[var(--surface)]/80 px-1 py-0.5 opacity-0 shadow-lg shadow-black/10 backdrop-blur-xl transition-all duration-150 group-hover:opacity-100">
        <Tooltip delay={0}>
          <Button
            isIconOnly size="sm" variant="ghost"
            className="size-7 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)]"
            onPress={() => onReply(message.id, message.content, displayName || 'Utilisateur')}
          >
            <ReplyIcon size={14} />
          </Button>
          <Tooltip.Content>Répondre</Tooltip.Content>
        </Tooltip>

        <EmojiPicker onSelect={(emoji) => onReaction(message.id, emoji)}>
          <Button isIconOnly size="sm" variant="ghost" className="size-7 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)]">
            <SmileIcon size={14} />
          </Button>
        </EmojiPicker>

        <Dropdown>
          <Dropdown.Trigger>
            <Button isIconOnly size="sm" variant="ghost" className="size-7 rounded-xl text-[var(--muted)] hover:text-[var(--foreground)]">
              <MoreHorizontalIcon size={14} />
            </Button>
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
              <Dropdown.Item id="reply" textValue="Répondre"><ReplyIcon size={14} /><span>Répondre</span></Dropdown.Item>
              <Dropdown.Item id="copy" textValue="Copier"><CopyIcon size={14} /><span>Copier le texte</span></Dropdown.Item>
              <Dropdown.Item id="pin" textValue="Épingler"><PinIcon size={14} /><span>Épingler</span></Dropdown.Item>
              {isMe && <Dropdown.Item id="edit" textValue="Modifier"><PencilIcon size={14} /><span>Modifier</span></Dropdown.Item>}
              {isMe && <Dropdown.Item id="delete" textValue="Supprimer" variant="danger"><Trash2Icon size={14} /><span>Supprimer</span></Dropdown.Item>}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>

      {/* ── Contenu ── */}
      <div className="rounded-xl px-3 py-1.5 transition-colors duration-100 hover:bg-[var(--surface-secondary)]/20">
        <div className="flex items-start gap-2.5 md:gap-3">

          {/* ── Avatar ── */}
          <UserProfilePopover userId={message.authorId}>
            <button type="button" className="mt-0.5 shrink-0">
              <Avatar className="size-8 cursor-pointer ring-2 ring-[var(--border)]/20 shadow-sm transition-all duration-150 hover:scale-105 hover:ring-[var(--accent)]/30 md:size-9">
                <Avatar.Image src={resolveMediaUrl(isMe ? currentUser?.avatarUrl : message.sender?.avatarUrl)} alt={displayName} />
                <Avatar.Fallback className={cn(
                  'font-bold text-sm',
                  isMe
                    ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
                )}>
                  {initial}
                </Avatar.Fallback>
              </Avatar>
            </button>
          </UserProfilePopover>

          {/* ── Contenu ── */}
          <div className="min-w-0 flex-1">

            {/* Réponse citée */}
            {replyMessage && (() => {
              const repliedName = replyMessage.authorId === currentUser?.id
                ? currentUser?.displayName || currentUser?.username
                : replyMessage.sender?.displayName || replyMessage.sender?.username || recipientName || 'Utilisateur';
              return (
                <div className="mb-1.5 flex items-center gap-1.5 rounded-xl border-l-2 border-[var(--accent)]/40 bg-[var(--surface-secondary)]/30 px-2.5 py-1 text-[11px]">
                  <ReplyIcon size={11} className="shrink-0 text-[var(--accent)]/60" />
                  <span className="font-semibold text-[var(--accent)]/80">{repliedName}</span>
                  <span className="max-w-64 truncate text-[var(--muted)]/60">{replyMessage.content}</span>
                </div>
              );
            })()}

            {/* Auteur + horodatage */}
            <div className="mb-0.5 flex items-center gap-2">
              <span className="text-[13px] font-semibold text-[var(--foreground)]">{displayName}</span>

              {message.sender?.isBot && (
                <Chip
                  size="sm"
                  variant={message.sender.isVerifiedBot ? 'soft' : 'secondary'}
                  color={message.sender.isVerifiedBot ? 'accent' : 'default'}
                  className="h-4 px-1.5 text-[8px] font-bold uppercase"
                >
                  {message.sender.isVerifiedBot && (
                    <svg className="mr-0.5 size-2" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 0l2.5 3.5L14.5 2l-1.5 4L16 8l-3.5 2.5L14.5 14l-4-1.5L8 16l-2.5-3.5L1.5 14l1.5-4L0 8l3.5-2.5L1.5 2l4 1.5L8 0z"/>
                    </svg>
                  )}
                  BOT
                </Chip>
              )}

              <span className="text-[10px] tabular-nums text-[var(--muted)]/45 md:text-[11px]">
                {formatTime(message.createdAt)}
              </span>
              {message.pending && <ClockIcon size={11} className="text-[var(--muted)]/30" />}
              {!!message.isEdited && <span className="text-[10px] italic text-[var(--muted)]/40">(modifié)</span>}
            </div>

            {/* Corps du message */}
            {isEditing ? (
              <div className="mt-1.5 space-y-1.5">
                <InputGroup className="rounded-xl border-[var(--accent)]/30 bg-[var(--surface-secondary)]/50 shadow-sm backdrop-blur-sm">
                  <InputGroup.Input
                    value={editInput}
                    onChange={(e) => onSetEditInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSaveEdit(message.id); }
                      if (e.key === 'Escape') onCancelEdit();
                    }}
                    aria-label="Modifier le message"
                    autoFocus
                  />
                </InputGroup>
                <p className="text-[10px] text-[var(--muted)]/40">Entrée pour sauvegarder · Échap pour annuler</p>
              </div>
            ) : (
              <div className="mt-0.5 text-[13px] leading-relaxed text-[var(--foreground)]/90 md:text-sm">
                <MarkdownRenderer content={message.content} />
              </div>
            )}

            {/* Réactions */}
            {message.reactions && message.reactions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {message.reactions.map((reaction, i) => {
                  const hasReacted = !!currentUser && reaction.userIds?.includes(currentUser.id);
                  return (
                    <Button
                      key={i}
                      size="sm"
                      variant="ghost"
                      onPress={() => hasReacted ? onRemoveReaction(message.id, reaction.emoji) : onReaction(message.id, reaction.emoji)}
                      className={cn(
                        'inline-flex h-auto items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-all duration-150',
                        hasReacted
                          ? 'border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)] shadow-sm shadow-[var(--accent)]/10'
                          : 'border-[var(--border)]/30 bg-[var(--surface-secondary)]/20 hover:border-[var(--accent)]/30 hover:bg-[var(--surface-secondary)]/40',
                      )}
                    >
                      <Twemoji emoji={reaction.emoji} size={14} />
                      {reaction.count > 0 && <span className="tabular-nums">{reaction.count}</span>}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
