'use client';

import { memo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  ReplyIcon, CopyIcon, PinIcon, Trash2Icon, PencilIcon, SmileIcon, MoreHorizontalIcon, ClockIcon, AlertCircleIcon,
} from '@/components/icons';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from '@/components/ui/tooltip';
import { MarkdownRenderer } from '@/components/chat/markdown-renderer';
import { EmojiPicker } from '@/components/chat/emoji-picker';
import { UserProfilePopover } from '@/components/chat/user-profile-popover';
import { InviteEmbed, extractInviteCodes } from '@/components/chat/invite-embed';
import { Twemoji } from '@/lib/twemoji';
import { resolveMediaUrl } from '@/lib/api';
import { useLayoutPrefs, densityCls } from '@/hooks/use-layout-prefs';
import { cn } from '@/lib/utils';

// ── Attachment parser ────────────────────────────────────────────────────────

function parseAttachments(content: string): {
  textContent: string;
  images: string[];
  files: { name: string; url: string }[];
} {
  const lines = content.split('\n');
  const textLines: string[] = [];
  const images: string[] = [];
  const files: { name: string; url: string }[] = [];
  for (const line of lines) {
    if (line.startsWith('[attach:img]:')) {
      images.push(line.slice('[attach:img]:'.length).trim());
    } else if (line.startsWith('[attach:file]:')) {
      const rest = line.slice('[attach:file]:'.length);
      const pipeIdx = rest.indexOf('|');
      if (pipeIdx >= 0) files.push({ name: rest.slice(0, pipeIdx), url: rest.slice(pipeIdx + 1) });
      else files.push({ name: rest, url: rest });
    } else {
      textLines.push(line);
    }
  }
  return { textContent: textLines.join('\n').trim(), images, files };
}

// ── Attachment embed ─────────────────────────────────────────────────────────

const FILE_ICONS: Record<string, string> = {
  pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
  ppt: '📊', pptx: '📊', txt: '📃', csv: '📃',
};

function fileExt(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function isPreviewable(name: string) {
  return ['pdf', 'txt', 'csv'].includes(fileExt(name));
}

function AttachmentsEmbed({ images, files }: { images: string[]; files: { name: string; url: string }[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<{ name: string; src: string } | null>(null);
  if (!images.length && !files.length) return null;
  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      {images.map((url, i) => {
        const src = resolveMediaUrl(url) ?? url;
        return (
          <div key={i} className="inline-block">
            <img
              src={src}
              alt=""
              className="max-h-72 max-w-xs cursor-zoom-in rounded-xl object-cover shadow-md ring-1 ring-[var(--border)]/20 transition-opacity hover:opacity-95"
              loading="lazy"
              onClick={() => setLightbox(src)}
            />
          </div>
        );
      })}
      {files.map((f, i) => {
        const src = resolveMediaUrl(f.url) ?? f.url;
        const ext = fileExt(f.name);
        const icon = FILE_ICONS[ext] ?? '📎';
        const canPreview = isPreviewable(f.name);
        return (
          <div key={i} className="inline-flex max-w-sm items-center gap-0 overflow-hidden rounded-xl border border-[var(--border)]/30 bg-[var(--surface-secondary)]/40">
            {/* Preview / download button */}
            <button
              type="button"
              className="flex flex-1 items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-secondary)]/70"
              onClick={() => canPreview ? setFilePreview({ name: f.name, src }) : window.open(src, '_blank')}
            >
              <span className="text-xl leading-none">{icon}</span>
              <div className="min-w-0">
                <p className="max-w-[180px] truncate text-[12px] font-medium text-foreground/90">{f.name}</p>
                <p className="text-[10px] uppercase text-muted-foreground">{ext || 'fichier'}{canPreview ? ' · Aperçu disponible' : ''}</p>
              </div>
            </button>
            {/* Download button */}
            <a
              href={src}
              download={f.name}
              className="flex shrink-0 items-center border-l border-[var(--border)]/20 px-2.5 py-2.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface-secondary)]/70 hover:text-[var(--foreground)]"
              title="Télécharger"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
              </svg>
            </a>
          </div>
        );
      })}

      {/* Image lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[9999] flex cursor-zoom-out items-center justify-center bg-black/80"
          onClick={() => setLightbox(null)}
          onKeyDown={(e) => e.key === 'Escape' && setLightbox(null)}
          role="dialog"
          aria-modal
        >
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* File preview modal */}
      {filePreview && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80"
          onClick={() => setFilePreview(null)}
          onKeyDown={(e) => e.key === 'Escape' && setFilePreview(null)}
          role="dialog"
          aria-modal
        >
          <div
            className="flex h-[90vh] w-[90vw] max-w-4xl flex-col overflow-hidden rounded-2xl bg-[var(--surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)]/20 px-4 py-3">
              <span className="max-w-[300px] truncate text-[13px] font-medium text-[var(--foreground)]">{filePreview.name}</span>
              <div className="flex items-center gap-2">
                <a href={filePreview.src} download={filePreview.name} className="rounded-lg border border-[var(--border)]/30 px-3 py-1.5 text-[11px] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
                  Télécharger
                </a>
                <button type="button" className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]" onClick={() => setFilePreview(null)}>
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            {/* Iframe preview */}
            <iframe
              src={filePreview.src}
              title={filePreview.name}
              className="min-h-0 flex-1 w-full border-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}

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
  failed?: boolean;
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

/**
 * Retourne true si le message `curr` doit être groupé avec `prev`
 * (même auteur, même conversation, moins de 3 minutes d'écart).
 */
export function shouldGroup(prev: MessageData, curr: MessageData): boolean {
  if (prev.authorId !== curr.authorId) return false;
  if (curr.isSystem || prev.isSystem) return false;
  if (curr.replyToId) return false; // une réponse affiche toujours le header
  const diff = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return diff < 3 * 60 * 1000;
}

export interface MessageItemProps {
  message: MessageData;
  currentUser: MessageSender | null;
  recipientName?: string;
  isEditing: boolean;
  editInput: string;
  replyMessage: MessageData | null;
  /** Quand true : même auteur que le message précédent < 3 min → masque avatar + nom */
  isGrouped?: boolean;
  onSetEditInput: Dispatch<SetStateAction<string>>;
  onReply: (id: string, content: string, authorName: string) => void;
  onCopy: (content: string) => void;
  onReaction: (id: string, emoji: string) => void;
  onRemoveReaction: (id: string, emoji: string) => void;
  onStartEdit: (id: string, content: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  highlight?: string;
}

// ── HighlightText ─────────────────────────────────────────────────────────────

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="rounded bg-yellow-400/40 text-[var(--foreground)] px-0.5 not-italic">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ── MessageItem ───────────────────────────────────────────────────────────────

export const MessageItem = memo(function MessageItem({
  message, currentUser, recipientName, isEditing, editInput, replyMessage,
  isGrouped = false,
  onSetEditInput, onReply, onCopy, onReaction, onRemoveReaction,
  onStartEdit, onSaveEdit, onCancelEdit, onDelete,
  highlight,
}: MessageItemProps) {
  const { prefs } = useLayoutPrefs();
  const d = densityCls(prefs.density);
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
        <span className="flex items-center gap-1.5 rounded-full border border-[var(--border)]/20 bg-[var(--surface-secondary)]/30 px-3 py-1 text-[10px] italic text-muted-foreground">
          <MarkdownRenderer content={message.content} />
          <span className="text-[9px] tabular-nums text-muted-foreground/70">{formatTime(message.createdAt)}</span>
        </span>
        <div className="h-px flex-1 bg-[var(--border)]/15" />
      </div>
    );
  }

  // Heure courte pour l'indicateur de groupe (HH:MM)
  const shortTime = new Date(message.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      data-message-id={message.id}
      className={cn(
        `group relative ${d.msgPx}`,
        isGrouped ? 'py-[1px]' : 'py-[1px]',
        message.pending && !message.failed && 'opacity-60',
        message.failed && 'opacity-70',
      )}>
      {/* ── Toolbar flottant ── */}
      <div className="absolute -top-4 right-4 z-20 flex items-center gap-0.5 rounded-xl border border-[var(--border)]/60 bg-[var(--surface)] px-1 py-0.5 opacity-0 shadow-lg shadow-black/30 ring-1 ring-black/5 transition-all duration-150 group-hover:opacity-100">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm" variant="ghost"
                className="size-7 rounded-xl text-[var(--foreground)]/60 hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"
                onClick={() => onReply(message.id, message.content, displayName || 'Utilisateur')}
              >
                <ReplyIcon size={15} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Répondre</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <EmojiPicker onSelect={(emoji) => onReaction(message.id, emoji)}>
          <div className="inline-flex items-center justify-center size-7 rounded-xl text-[var(--foreground)]/60 hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] cursor-pointer">
            <SmileIcon size={15} />
          </div>
        </EmojiPicker>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="inline-flex items-center justify-center size-7 rounded-xl text-[var(--foreground)]/60 hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] cursor-pointer">
              <MoreHorizontalIcon size={15} />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-44">
            <DropdownMenuItem onClick={() => onReply(message.id, message.content, displayName || 'Utilisateur')}><ReplyIcon size={14} /><span>Répondre</span></DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCopy(message.content)}><CopyIcon size={14} /><span>Copier le texte</span></DropdownMenuItem>
            <DropdownMenuItem><PinIcon size={14} /><span>Épingler</span></DropdownMenuItem>
            {isMe && <DropdownMenuItem onClick={() => onStartEdit(message.id, message.content)}><PencilIcon size={14} /><span>Modifier</span></DropdownMenuItem>}
            {isMe && <DropdownMenuItem className="text-red-500" onClick={() => onDelete(message.id)}><Trash2Icon size={14} /><span>Supprimer</span></DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Contenu ── */}
      <div className={`rounded-xl ${d.msgPx} ${isGrouped ? 'py-0.5' : d.msgPy} transition-colors duration-100 hover:bg-[var(--surface-secondary)]/20`}>
        <div className={`flex items-start ${d.msgGap}`}>

          {/* ── Avatar ou indicateur d'heure (groupé) ── */}
          {isGrouped ? (
            <div className={`flex ${d.msgAvatar} shrink-0 items-center justify-end`}>
              <span className={`select-none tabular-nums ${d.msgTime} text-transparent transition-colors duration-100 group-hover:text-muted-foreground/70`}>
                {shortTime}
              </span>
            </div>
          ) : (
            <UserProfilePopover userId={message.authorId}>
              <button type="button" className="mt-0.5 shrink-0">
                <Avatar className={`${d.msgAvatar} cursor-pointer ring-2 ring-[var(--border)]/20 shadow-sm transition-all duration-150 hover:scale-105 hover:ring-[var(--accent)]/30`}>
                  <AvatarImage src={resolveMediaUrl(isMe ? currentUser?.avatarUrl : message.sender?.avatarUrl)} alt={displayName} />
                  <AvatarFallback className={cn(
                    'font-bold text-sm',
                    isMe
                      ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                      : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
                  )}>
                    {initial}
                  </AvatarFallback>
                </Avatar>
              </button>
            </UserProfilePopover>
          )}

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
                  <span className="max-w-64 truncate text-muted-foreground">{replyMessage.content}</span>
                </div>
              );
            })()}

            {/* Auteur + horodatage — masqué si groupé */}
            {!isGrouped && (
              <div className="mb-0.5 flex items-center gap-2">
                <span className={`${d.msgName} font-semibold text-[var(--foreground)]`}>{displayName}</span>

                {message.sender?.isBot && (
                  <Badge
                    variant={message.sender.isVerifiedBot ? 'secondary' : 'outline'}
                    className="h-4 px-1.5 text-[8px] font-bold uppercase"
                  >
                    {message.sender.isVerifiedBot && (
                      <svg className="mr-0.5 size-2" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0l2.5 3.5L14.5 2l-1.5 4L16 8l-3.5 2.5L14.5 14l-4-1.5L8 16l-2.5-3.5L1.5 14l1.5-4L0 8l3.5-2.5L1.5 2l4 1.5L8 0z"/>
                      </svg>
                    )}
                    BOT
                  </Badge>
                )}

                <span className={`${d.msgTime} tabular-nums text-muted-foreground/70`}>
                  {formatTime(message.createdAt)}
                </span>
                {message.pending && !message.failed && <ClockIcon size={11} className="text-muted-foreground/50" />}
                {message.failed && (
                  <span className="flex items-center gap-1 text-[10px] text-red-400" title="Échec de l'envoi — ce message n'a pas été sauvegardé">
                    <AlertCircleIcon size={11} />
                    Échec de l&apos;envoi
                  </span>
                )}
                {!!message.isEdited && <span className="text-[10px] italic text-muted-foreground/70">(modifié)</span>}
              </div>
            )}

            {/* Corps du message */}
            {isEditing ? (
              <div className="mt-1.5 space-y-1.5">
                <textarea
                  value={editInput}
                  onChange={(e) => {
                    onSetEditInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSaveEdit(message.id); }
                    if (e.key === 'Escape') onCancelEdit();
                  }}
                  ref={(el) => {
                    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
                  }}
                  rows={1}
                  aria-label="Modifier le message"
                  autoFocus
                  className="w-full resize-none overflow-hidden rounded-xl border border-[var(--accent)]/30 bg-[var(--surface-secondary)]/50 px-3 py-2 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground/60 focus:border-[var(--accent)]/60 focus:ring-2 focus:ring-[var(--accent)]/20"
                />
                <p className="text-[10px] text-muted-foreground/70">Entrée pour sauvegarder · Échap pour annuler</p>
              </div>
            ) : (() => {
              const { textContent, images, files } = parseAttachments(message.content ?? '');
              return (
                <div className="mt-0.5 text-[13px] leading-relaxed text-foreground md:text-sm">
                  {textContent && (
                    highlight
                      ? <HighlightText text={textContent} query={highlight} />
                      : <MarkdownRenderer content={textContent} />
                  )}
                  {!message.isSystem && extractInviteCodes(message.content).map((code) => (
                    <InviteEmbed key={code} code={code} />
                  ))}
                  <AttachmentsEmbed images={images} files={files} />
                </div>
              );
            })()}

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
                      onClick={() => hasReacted ? onRemoveReaction(message.id, reaction.emoji) : onReaction(message.id, reaction.emoji)}
                      className={cn(
                        'inline-flex h-auto items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-all duration-150',
                        hasReacted
                          ? 'border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)] shadow-sm'
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
