'use client';

import {
  memo, useState, useEffect, useRef, useSyncExternalStore,
  type Dispatch, type SetStateAction,
} from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { createPortal } from 'react-dom';
import {
  ReplyIcon, CopyIcon, PinIcon, Trash2Icon, PencilIcon, SmileIcon,
  MoreHorizontalIcon, ClockIcon, AlertCircleIcon, XIcon,
} from '@/components/icons';
import {
  Avatar, Button, Chip, Drawer, Dropdown, Label, Surface, Tooltip,
} from '@heroui/react';
import { MarkdownRenderer } from '@/components/chat/markdown-renderer';
import { EmojiPicker } from '@/components/chat/emoji-picker';
import { UserProfilePopover } from '@/components/chat/user-profile-popover';
import { InviteEmbed, extractInviteCodes } from '@/components/chat/invite-embed';
import { Twemoji } from '@/lib/twemoji';
import { resolveMediaUrl } from '@/lib/api';
import { userProfileCache } from '@/lib/user-profile-cache';
import { useLayoutPrefs, densityCls } from '@/hooks/use-layout-prefs';
import { useUIStyle } from '@/hooks/use-ui-style';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/components/locale-provider';

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
  const [zoom, setZoom] = useState(1);
  const { t } = useTranslation();

  useEffect(() => { setZoom(1); }, [lightbox]);

  useEffect(() => {
    if (!lightbox) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom(prev => Math.min(5, Math.max(0.1, prev * (e.deltaY > 0 ? 0.9 : 1 / 0.9))));
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [lightbox]);

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
              className="max-h-72 max-w-xs cursor-zoom-in rounded-2xl object-cover shadow-md ring-1 ring-separator/20 transition-all duration-200 hover:opacity-95 hover:ring-accent/30"
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
          <Surface
            key={i}
            variant="secondary"
            className="inline-flex max-w-sm items-center gap-0 overflow-hidden rounded-2xl ring-1 ring-separator/30"
          >
            {/* Preview / download button */}
            <button
              type="button"
              className="flex flex-1 items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-tertiary/60"
              onClick={() => {
                if (canPreview) { setFilePreview({ name: f.name, src }); return; }
                // Sécurité : n'autoriser que les URLs relatives ou du même domaine
                try {
                  const u = new URL(src, window.location.origin);
                  if (u.origin === window.location.origin) window.open(u.href, '_blank', 'noopener,noreferrer');
                } catch { /* URL invalide ignorée */ }
              }}
            >
              <span className="text-xl leading-none">{icon}</span>
              <div className="min-w-0">
                <p className="max-w-[180px] truncate text-[12px] font-medium text-foreground/90">{f.name}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted">{ext || t.messageItem.file}{canPreview ? t.messageItem.previewAvailable : ''}</p>
              </div>
            </button>
            {/* Download button */}
            <a
              href={src}
              download={f.name}
              className="flex shrink-0 items-center border-l border-separator/20 px-2.5 py-2.5 text-muted transition-colors hover:bg-surface-tertiary/60 hover:text-foreground"
              title={t.messageItem.download}
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
              </svg>
            </a>
          </Surface>
        );
      })}

      {/* Image lightbox — portail plein écran avec zoom (Ctrl + molette) */}
      {lightbox && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={() => setLightbox(null)}
          onKeyDown={(e) => e.key === 'Escape' && setLightbox(null)}
          role="dialog"
          aria-modal
        >
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 text-white hover:bg-white/20"
            onPress={() => setLightbox(null)}
            aria-label={t.messageItem.closeLightbox}
          >
            <XIcon size={18} />
          </Button>
          {zoom !== 1 && (
            <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 select-none rounded-full bg-black/60 px-3 py-1 text-xs text-white/70">
              {Math.round(zoom * 100)}%
            </div>
          )}
          <img
            src={lightbox}
            alt=""
            style={{
              maxWidth: '100vw',
              maxHeight: '100vh',
              width: 'auto',
              height: 'auto',
              transform: `scale(${zoom})`,
              transformOrigin: 'center',
              transition: 'transform 0.05s',
            }}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />
        </div>,
        document.body,
      )}

      {/* File preview modal — portail (iframe pdf/txt/csv) */}
      {filePreview && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setFilePreview(null)}
          onKeyDown={(e) => e.key === 'Escape' && setFilePreview(null)}
          role="dialog"
          aria-modal
        >
          <Surface
            className="flex h-[90vh] w-[90vw] max-w-4xl flex-col overflow-hidden rounded-3xl shadow-2xl ring-1 ring-separator/40"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex shrink-0 items-center justify-between border-b border-separator/20 px-4 py-3">
              <span className="max-w-[300px] truncate text-[13px] font-semibold text-foreground">{filePreview.name}</span>
              <div className="flex items-center gap-2">
                <a
                  href={filePreview.src}
                  download={filePreview.name}
                  className="rounded-lg border border-separator/40 px-3 py-1.5 text-[11px] font-medium text-muted transition-colors hover:text-foreground"
                >
                  {t.messageItem.download}
                </a>
                <Button isIconOnly size="sm" variant="ghost" onPress={() => setFilePreview(null)} aria-label={t.messageItem.closeLightbox}>
                  <XIcon size={16} />
                </Button>
              </div>
            </div>
            {/* Iframe preview */}
            <iframe
              src={filePreview.src}
              title={filePreview.name}
              className="min-h-0 w-full flex-1 border-0"
            />
          </Surface>
        </div>,
        document.body,
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

export const formatTime = (dateString: string, labels?: { yesterday: string; daysAgo: string }): string => {
  const date = new Date(dateString);
  const now = new Date();
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (date >= startOfToday) return time;
  if (date >= startOfYesterday) return labels ? labels.yesterday.replace('{time}', time) : `hier à ${time}`;
  if (date >= oneWeekAgo) {
    const diffDays = Math.floor((startOfToday.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
    return labels ? labels.daysAgo.replace('{n}', String(diffDays)).replace('{time}', time) : `il y a ${diffDays} jours à ${time}`;
  }
  return `${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} à ${time}`;
};

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
          <mark key={i} className="rounded bg-accent/25 px-0.5 not-italic text-foreground">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ── Bot badge ─────────────────────────────────────────────────────────────────

function BotBadge({ verified }: { verified?: boolean }) {
  return (
    <Chip
      size="sm"
      color={verified ? 'accent' : 'default'}
      variant="soft"
      className="h-4 gap-0.5 px-1.5 text-[8px] font-bold uppercase tracking-wide"
    >
      {verified && (
        <svg className="size-2" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0l2.5 3.5L14.5 2l-1.5 4L16 8l-3.5 2.5L14.5 14l-4-1.5L8 16l-2.5-3.5L1.5 14l1.5-4L0 8l3.5-2.5L1.5 2l4 1.5L8 0z" />
        </svg>
      )}
      <Chip.Label>BOT</Chip.Label>
    </Chip>
  );
}

// ── Reactions ─────────────────────────────────────────────────────────────────

function ReactionList({
  message, currentUser, onReaction, onRemoveReaction, className,
}: {
  message: MessageData;
  currentUser: MessageSender | null;
  onReaction: (id: string, emoji: string) => void;
  onRemoveReaction: (id: string, emoji: string) => void;
  className?: string;
}) {
  if (!message.reactions || message.reactions.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {message.reactions.map((reaction, i) => {
        const hasReacted = !!currentUser && reaction.userIds?.includes(currentUser.id);
        return (
          <Button
            key={i}
            size="sm"
            variant="secondary"
            onPress={() => hasReacted ? onRemoveReaction(message.id, reaction.emoji) : onReaction(message.id, reaction.emoji)}
            className={cn(
              'h-7 gap-1 rounded-full px-2 text-xs font-medium transition-all duration-150',
              hasReacted && 'border-accent/40 bg-accent/10 text-accent shadow-sm',
            )}
          >
            <Twemoji emoji={reaction.emoji} size={14} />
            {reaction.count > 0 && <span className="tabular-nums">{reaction.count}</span>}
          </Button>
        );
      })}
    </div>
  );
}

// ── Floating action toolbar ───────────────────────────────────────────────────

function MessageToolbar({
  side, isMe, t,
  onReply, onReaction, onMenuAction,
}: {
  side: 'left' | 'right';
  isMe: boolean;
  t: ReturnType<typeof useTranslation>['t'];
  onReply: () => void;
  onReaction: (emoji: string) => void;
  onMenuAction: (key: React.Key) => void;
}) {
  return (
    <div
      className={cn(
        'absolute -top-4 z-20 opacity-0 transition-all duration-150 group-hover:opacity-100',
        side === 'left' ? 'left-3' : 'right-3',
      )}
    >
      <Surface className="flex items-center gap-0.5 rounded-full p-0.5 shadow-lg shadow-black/15 ring-1 ring-separator/50">
        <Tooltip delay={0}>
          <Button isIconOnly size="sm" variant="ghost" className="rounded-full" onPress={onReply} aria-label={t.messageItem.reply}>
            <ReplyIcon size={15} />
          </Button>
          <Tooltip.Content><p>{t.messageItem.reply}</p></Tooltip.Content>
        </Tooltip>

        <EmojiPicker onSelect={onReaction}>
          <Button isIconOnly size="sm" variant="ghost" className="rounded-full" aria-label="Emoji">
            <SmileIcon size={15} />
          </Button>
        </EmojiPicker>

        <Dropdown>
          <Button isIconOnly size="sm" variant="ghost" className="rounded-full" aria-label="Plus">
            <MoreHorizontalIcon size={15} />
          </Button>
          <Dropdown.Popover className="min-w-44">
            <Dropdown.Menu onAction={onMenuAction}>
              <Dropdown.Item id="reply" textValue={t.messageItem.reply}>
                <ReplyIcon size={14} /><Label>{t.messageItem.reply}</Label>
              </Dropdown.Item>
              <Dropdown.Item id="copy" textValue={t.messageItem.copyText}>
                <CopyIcon size={14} /><Label>{t.messageItem.copyText}</Label>
              </Dropdown.Item>
              <Dropdown.Item id="pin" textValue={t.messageItem.pin}>
                <PinIcon size={14} /><Label>{t.messageItem.pin}</Label>
              </Dropdown.Item>
              {isMe ? (
                <Dropdown.Item id="edit" textValue={t.messageItem.edit}>
                  <PencilIcon size={14} /><Label>{t.messageItem.edit}</Label>
                </Dropdown.Item>
              ) : null}
              {isMe ? (
                <Dropdown.Item id="delete" textValue={t.messageItem.delete} variant="danger">
                  <Trash2Icon size={14} /><Label>{t.messageItem.delete}</Label>
                </Dropdown.Item>
              ) : null}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </Surface>
    </div>
  );
}

// ── Quoted reply ──────────────────────────────────────────────────────────────

function QuotedReply({
  replyMessage, currentUser, recipientName, t, className,
}: {
  replyMessage: MessageData;
  currentUser: MessageSender | null;
  recipientName?: string;
  t: ReturnType<typeof useTranslation>['t'];
  className?: string;
}) {
  const repliedName = replyMessage.authorId === currentUser?.id
    ? currentUser?.displayName || currentUser?.username
    : replyMessage.sender?.displayName || replyMessage.sender?.username || recipientName || t.messageItem.user;
  return (
    <div className={cn(
      'flex items-center gap-1.5 rounded-xl border-l-2 border-accent/40 bg-surface-secondary/40 px-2.5 py-1 text-[11px]',
      className,
    )}>
      <ReplyIcon size={11} className="shrink-0 text-accent/60" />
      <span className="font-semibold text-accent/80">{repliedName}</span>
      <span className="max-w-64 truncate text-muted">{replyMessage.content}</span>
    </div>
  );
}

// ── Edit box ──────────────────────────────────────────────────────────────────

function EditBox({
  value, onChange, onSave, onCancel, t, className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  t: ReturnType<typeof useTranslation>['t'];
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <textarea
        value={value}
        onChange={(e) => { onChange(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px`; }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave(); }
          if (e.key === 'Escape') onCancel();
        }}
        ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }}
        rows={1}
        aria-label={t.messageItem.edit}
        autoFocus
        className="w-full resize-none overflow-hidden rounded-xl border border-accent/30 bg-surface-secondary/50 px-3 py-2 text-sm text-foreground shadow-sm outline-none placeholder:text-muted/60 focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
      />
      <p className="text-[10px] text-muted/70">{t.messageItem.editHint}</p>
    </div>
  );
}

// ── Gestes mobile ─────────────────────────────────────────────────────────────

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const DRAWER_EDGE = 44; // zone réservée au nav drawer (même valeur que use-swipe-drawer)

/* Bottom sheet Discord-style (HeroUI Drawer) */
function MobileMessageSheet({
  open, onOpenChange, isMe,
  onReply, onReaction, onCopy, onEdit, onDelete, t,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isMe: boolean;
  onReply: () => void;
  onReaction: (emoji: string) => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const actions = [
    { id: 'reply', icon: <ReplyIcon size={20} />, label: t.messageItem.reply, action: () => { onReply(); onOpenChange(false); }, danger: false },
    { id: 'copy', icon: <CopyIcon size={20} />, label: t.messageItem.copyText, action: () => { onCopy(); onOpenChange(false); }, danger: false },
    { id: 'pin', icon: <PinIcon size={20} />, label: t.messageItem.pin, action: () => onOpenChange(false), danger: false },
    ...(isMe ? [
      { id: 'edit', icon: <PencilIcon size={20} />, label: t.messageItem.edit, action: () => { onEdit(); onOpenChange(false); }, danger: false },
      { id: 'delete', icon: <Trash2Icon size={20} />, label: t.messageItem.delete, action: () => { onDelete(); onOpenChange(false); }, danger: true },
    ] : []),
  ];

  return (
    <Drawer.Backdrop isOpen={open} onOpenChange={onOpenChange} variant="blur">
      <Drawer.Content placement="bottom">
        <Drawer.Dialog className="mx-auto max-w-lg rounded-t-3xl pb-safe outline-none">
          <Drawer.Handle />
          <Drawer.Heading className="sr-only">Actions du message</Drawer.Heading>

          {/* Réactions rapides */}
          <div className="flex items-center justify-around border-b border-separator/40 px-4 py-3">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="flex size-11 items-center justify-center rounded-full transition-transform active:scale-125"
                onClick={() => { onReaction(emoji); onOpenChange(false); }}
              >
                <Twemoji emoji={emoji} size={26} />
              </button>
            ))}
            <EmojiPicker onSelect={(emoji) => { onReaction(emoji); onOpenChange(false); }}>
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-full bg-surface-secondary text-muted"
              >
                <SmileIcon size={18} />
              </button>
            </EmojiPicker>
          </div>

          {/* Actions */}
          <div className="flex flex-col py-1">
            {actions.map(({ id, icon, label, action, danger }) => (
              <button
                key={id}
                type="button"
                onClick={action}
                className={cn(
                  'flex items-center gap-4 px-5 py-3.5 text-sm font-medium transition-colors active:bg-surface-secondary',
                  danger ? 'text-danger' : 'text-foreground',
                )}
              >
                <span className={cn('shrink-0', danger ? 'text-danger' : 'text-muted')}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}

/* Wrapper gestes : swipe gauche → reply, double tap → ❤️, long press → sheet */
function MessageGestureWrapper({
  onReply,
  onDoubleTap,
  onLongPress,
  children,
}: {
  onReply: () => void;
  onDoubleTap: () => void;
  onLongPress: () => void;
  children: React.ReactNode;
}) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [heart, setHeart] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const swipeFired = useRef(false);
  const didMove = useRef(false);
  const lastTap = useRef(0);
  const lpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const THRESHOLD = 64;

  const clearLP = () => {
    if (lpTimer.current) { clearTimeout(lpTimer.current); lpTimer.current = null; }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const tt = e.touches[0];
    startX.current = tt.clientX;
    startY.current = tt.clientY;
    swipeFired.current = false;
    didMove.current = false;

    // Double tap
    const now = Date.now();
    if (now - lastTap.current < 300) {
      lastTap.current = 0;
      navigator.vibrate?.(10);
      setHeart(true);
      onDoubleTap();
      return;
    }
    lastTap.current = now;

    // Long press — uniquement hors zone nav drawer
    if (startX.current > DRAWER_EDGE) {
      lpTimer.current = setTimeout(() => {
        if (!didMove.current) {
          navigator.vibrate?.(30);
          onLongPress();
        }
      }, 500);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    didMove.current = true;
    clearLP();
    const dx = e.touches[0].clientX - startX.current; // négatif = swipe gauche
    const dy = Math.abs(e.touches[0].clientY - startY.current);
    if (dy > Math.abs(dx) || dx > 0) { setOffset(0); setSwiping(false); return; }
    setSwiping(true);
    setOffset(Math.max(dx, -(THRESHOLD + 16)));
    if (!swipeFired.current && -dx >= THRESHOLD) {
      swipeFired.current = true;
      navigator.vibrate?.(15);
    }
  };

  const handleTouchEnd = () => {
    clearLP();
    if (swipeFired.current) { swipeFired.current = false; onReply(); }
    setOffset(0);
    setSwiping(false);
  };

  // Éteint l'animation cœur après 700ms
  useEffect(() => {
    if (!heart) return;
    const tm = setTimeout(() => setHeart(false), 700);
    return () => clearTimeout(tm);
  }, [heart]);

  const progress = Math.min(-offset / THRESHOLD, 1);

  return (
    <div
      className="relative"
      style={{ touchAction: 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Icône reply (apparaît à droite en glissant vers la gauche) */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 flex size-8 items-center justify-center rounded-full bg-accent/15"
        style={{
          transform: `translateY(-50%) scale(${0.5 + 0.5 * progress})`,
          opacity: progress,
        }}
      >
        <ReplyIcon size={14} className="text-accent" />
      </div>

      {/* Animation cœur double tap */}
      {heart && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center text-3xl animate-heart-pop"
        >
          ❤️
        </div>
      )}

      {/* Contenu décalé */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? 'none' : 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
          willChange: swiping ? 'transform' : 'auto',
        }}
      >
        {children}
      </div>
    </div>
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
  useUIStyle();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  // S'abonner au cache de profils pour re-rendre quand un avatar/nom change
  useSyncExternalStore(userProfileCache.subscribe, userProfileCache.getSnapshot, userProfileCache.getServerSnapshot);

  const isMe = !!currentUser && message.authorId === currentUser.id;
  const cachedSender = !isMe && message.authorId ? userProfileCache.getProfile(message.authorId) : undefined;
  const displayName = isMe
    ? currentUser!.displayName || currentUser!.username
    : cachedSender?.displayName || cachedSender?.username || message.sender?.displayName || message.sender?.username || recipientName || t.messageItem.user;
  const senderAvatarUrl = isMe
    ? currentUser!.avatarUrl
    : cachedSender?.avatarUrl ?? message.sender?.avatarUrl;
  const initial = displayName?.[0]?.toUpperCase() || 'U';
  const authorName = displayName || t.messageItem.user;

  // ── Handlers partagés ──
  const handleMenuAction = (key: React.Key) => {
    switch (key) {
      case 'reply': onReply(message.id, message.content, authorName); break;
      case 'copy': onCopy(message.content); break;
      case 'pin': break;
      case 'edit': onStartEdit(message.id, message.content); break;
      case 'delete': onDelete(message.id); break;
    }
  };

  const mobileSheet = isMobile ? (
    <MobileMessageSheet
      open={sheetOpen}
      onOpenChange={setSheetOpen}
      isMe={isMe}
      onReply={() => onReply(message.id, message.content, authorName)}
      onReaction={(emoji) => onReaction(message.id, emoji)}
      onCopy={() => onCopy(message.content)}
      onEdit={() => onStartEdit(message.id, message.content)}
      onDelete={() => onDelete(message.id)}
      t={t}
    />
  ) : null;

  // ── Message système ──
  if (message.isSystem) {
    return (
      <div className="flex items-center justify-center gap-3 px-4 py-2">
        <div className="h-px flex-1 bg-separator/15" />
        <span className="flex items-center gap-1.5 rounded-full bg-surface-secondary/40 px-3 py-1 text-[10px] italic text-muted ring-1 ring-separator/20">
          <MarkdownRenderer content={message.content} />
          <span className="text-[9px] tabular-nums text-muted/70">{formatTime(message.createdAt, { yesterday: t.messageItem.yesterday, daysAgo: t.messageItem.daysAgo })}</span>
        </span>
        <div className="h-px flex-1 bg-separator/15" />
      </div>
    );
  }

  // Heure courte pour l'indicateur de groupe (HH:MM)
  const shortTime = new Date(message.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  // ════════════════════════════════════════════════════════════════════════════
  // ── Mode Bulles (iMessage / WhatsApp) ──
  // ════════════════════════════════════════════════════════════════════════════
  if (prefs.msgStyle === 'bubble') {
    const { textContent, images, files } = parseAttachments(message.content ?? '');
    return (
      <>
        <MessageGestureWrapper
          onReply={() => onReply(message.id, message.content, authorName)}
          onDoubleTap={() => onReaction(message.id, '❤️')}
          onLongPress={() => setSheetOpen(true)}
        >
          <div
            data-message-id={message.id}
            className={cn(
              'group relative px-3',
              isGrouped ? 'py-0.5' : 'pb-0.5 pt-2',
              message.pending && !message.failed && 'opacity-60',
              message.failed && 'opacity-70',
            )}
          >
            <MessageToolbar
              side={isMe ? 'left' : 'right'}
              isMe={isMe}
              t={t}
              onReply={() => onReply(message.id, message.content, authorName)}
              onReaction={(emoji) => onReaction(message.id, emoji)}
              onMenuAction={handleMenuAction}
            />

            {/* ── Layout bulle ── */}
            <div className={cn('flex items-end gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>

              {/* Avatar — uniquement 1er message d'un groupe, côté gauche (autres) */}
              {!isMe && (
                isGrouped
                  ? <div className={`${d.msgAvatar} shrink-0`} />
                  : (
                    <UserProfilePopover userId={message.authorId}>
                      <button type="button" className="mb-0.5 shrink-0">
                        <Avatar className={`${d.msgAvatar} cursor-pointer shadow-sm ring-2 ring-separator/20 transition-transform duration-150 hover:scale-105`}>
                          <Avatar.Image src={resolveMediaUrl(senderAvatarUrl)} alt={displayName} />
                          <Avatar.Fallback className="text-sm font-bold">{initial}</Avatar.Fallback>
                        </Avatar>
                      </button>
                    </UserProfilePopover>
                  )
              )}

              <div className={cn('flex min-w-0 max-w-[85%] flex-col gap-0.5 sm:max-w-[72%]', isMe ? 'items-end' : 'items-start')}>

                {/* Nom expéditeur (autres, premier du groupe) */}
                {!isMe && !isGrouped && (
                  <span className={`${d.msgTime} ml-1 font-semibold text-foreground/75`}>{displayName}</span>
                )}

                {/* Réponse citée */}
                {replyMessage && (
                  <QuotedReply
                    replyMessage={replyMessage}
                    currentUser={currentUser}
                    recipientName={recipientName}
                    t={t}
                    className={isMe ? 'self-end' : 'self-start'}
                  />
                )}

                {/* Bulle */}
                {isEditing ? (
                  <EditBox
                    value={editInput}
                    onChange={onSetEditInput}
                    onSave={() => onSaveEdit(message.id)}
                    onCancel={onCancelEdit}
                    t={t}
                    className="w-full"
                  />
                ) : (
                  <div className={cn(
                    'rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm [overflow-wrap:anywhere]',
                    isMe
                      ? 'rounded-br-sm bg-accent text-accent-foreground'
                      : 'rounded-bl-sm bg-surface-secondary text-foreground',
                  )}>
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
                )}

                {/* Horodatage + statut */}
                <div className={cn('flex items-center gap-1 px-1', isMe ? 'flex-row-reverse' : 'flex-row')}>
                  <span className={`${d.msgTime} tabular-nums text-muted/60`}>{shortTime}</span>
                  {message.pending && !message.failed && <ClockIcon size={10} className="text-muted/50" />}
                  {message.failed && <AlertCircleIcon size={10} className="text-danger" />}
                  {!!message.isEdited && <span className="text-[10px] italic text-muted/60">{t.messageItem.edited}</span>}
                </div>

                {/* Réactions */}
                <ReactionList
                  message={message}
                  currentUser={currentUser}
                  onReaction={onReaction}
                  onRemoveReaction={onRemoveReaction}
                />
              </div>
            </div>
          </div>
        </MessageGestureWrapper>
        {mobileSheet}
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ── Mode Compact (Discord / Slack) + Split ──
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <>
      <MessageGestureWrapper
        onReply={() => onReply(message.id, message.content, authorName)}
        onDoubleTap={() => onReaction(message.id, '❤️')}
        onLongPress={() => setSheetOpen(true)}
      >
        <div
          data-message-id={message.id}
          className={cn(
            `group relative ${d.msgPx}`,
            isGrouped ? 'py-0' : 'py-[1px]',
            message.pending && !message.failed && 'opacity-60',
            message.failed && 'opacity-70',
          )}
        >
          <MessageToolbar
            side="right"
            isMe={isMe}
            t={t}
            onReply={() => onReply(message.id, message.content, authorName)}
            onReaction={(emoji) => onReaction(message.id, emoji)}
            onMenuAction={handleMenuAction}
          />

          {/* ── Contenu ── */}
          <div className={`rounded-xl ${d.msgPx} ${isGrouped ? 'py-0' : `${d.msgPt} pb-0.5`} transition-colors duration-100 hover:bg-surface-secondary/20`}>
            <div className={`flex items-start ${d.msgGap}`}>

              {/* ── Avatar ou indicateur d'heure (groupé) ── */}
              {isGrouped ? (
                <div className={`flex ${d.msgAvatar} shrink-0 items-center justify-end`}>
                  <span className={`select-none tabular-nums ${d.msgTime} text-transparent transition-colors duration-100 group-hover:text-muted/70`}>
                    {shortTime}
                  </span>
                </div>
              ) : (
                <UserProfilePopover userId={message.authorId}>
                  <button type="button" className="mt-0.5 shrink-0">
                    <Avatar className={`${d.msgAvatar} cursor-pointer shadow-sm ring-2 ring-separator/20 transition-all duration-150 hover:scale-105 hover:ring-accent/30`}>
                      <Avatar.Image src={resolveMediaUrl(senderAvatarUrl)} alt={displayName} />
                      <Avatar.Fallback className="text-sm font-bold">{initial}</Avatar.Fallback>
                    </Avatar>
                  </button>
                </UserProfilePopover>
              )}

              {/* ── Contenu ── */}
              <div className="min-w-0 flex-1">

                {/* Réponse citée */}
                {replyMessage && (
                  <QuotedReply
                    replyMessage={replyMessage}
                    currentUser={currentUser}
                    recipientName={recipientName}
                    t={t}
                    className="mb-1.5"
                  />
                )}

                {/* Auteur + horodatage — masqué si groupé */}
                {!isGrouped && (
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className={`${d.msgName} font-semibold text-foreground`}>{displayName}</span>

                    {message.sender?.isBot && <BotBadge verified={message.sender.isVerifiedBot} />}

                    <span className={`${d.msgTime} tabular-nums text-muted/70`}>
                      {formatTime(message.createdAt, { yesterday: t.messageItem.yesterday, daysAgo: t.messageItem.daysAgo })}
                    </span>
                    {message.pending && !message.failed && <ClockIcon size={11} className="text-muted/50" />}
                    {message.failed && (
                      <span className="flex items-center gap-1 text-[10px] text-danger" title={t.messageItem.sendFailed}>
                        <AlertCircleIcon size={11} />
                        {t.messageItem.sendFailed}
                      </span>
                    )}
                    {!!message.isEdited && <span className="text-[10px] italic text-muted/70">{t.messageItem.edited}</span>}
                  </div>
                )}

                {/* Corps du message */}
                {isEditing ? (
                  <EditBox
                    value={editInput}
                    onChange={onSetEditInput}
                    onSave={() => onSaveEdit(message.id)}
                    onCancel={onCancelEdit}
                    t={t}
                    className="mt-1.5"
                  />
                ) : (() => {
                  const { textContent, images, files } = parseAttachments(message.content ?? '');
                  return (
                    <div className="mt-0.5 text-[13px] leading-relaxed text-foreground [overflow-wrap:anywhere] md:text-sm">
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
                <ReactionList
                  message={message}
                  currentUser={currentUser}
                  onReaction={onReaction}
                  onRemoveReaction={onRemoveReaction}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        </div>
      </MessageGestureWrapper>
      {mobileSheet}
    </>
  );
});
