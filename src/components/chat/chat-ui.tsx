'use client';

/**
 * Kit visuel partagé par les trois « chat areas » (DM, groupe, serveur).
 * Composants purement présentationnels — aucune logique métier ici.
 */

import type {
  ReactNode,
  RefObject,
  KeyboardEvent as ReactKeyboardEvent,
  ClipboardEvent as ReactClipboardEvent,
} from 'react';
import { cn } from '@/lib/utils';
import { useUIStyle } from '@/hooks/use-ui-style';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { EmojiPicker } from '@/components/chat/emoji-picker';
import {
  SmileIcon,
  SendIcon,
  PaperclipIcon,
  XIcon,
  ImageIcon,
  FileTextIcon,
  ReplyIcon,
  ArrowLeftIcon,
} from '@/components/icons';

/* ── Indicateur de frappe — trois points qui rebondissent ─────────────────── */
export function TypingIndicator({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground', className)}>
      <span className="flex items-center gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block size-1.5 animate-bounce rounded-full bg-primary/50"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
          />
        ))}
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}

/* ── Séparateur « Nouveaux messages » ─────────────────────────────────────── */
export function NewMessagesDivider({ label = 'Nouveaux messages' }: { label?: string }) {
  return (
    <div className="my-2 flex select-none items-center gap-2 px-4">
      <div className="h-px flex-1 bg-destructive/40" />
      <span className="shrink-0 text-[11px] font-semibold tracking-wide text-destructive">{label}</span>
      <div className="h-px flex-1 bg-destructive/40" />
    </div>
  );
}

/* ── État vide d'une conversation ─────────────────────────────────────────── */
export function ChatEmptyState({
  icon,
  iconClassName,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  iconClassName?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  const ui = useUIStyle();
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16">
      <div
        className={cn(
          'flex max-w-sm flex-col items-center gap-4 px-9 py-8 text-center',
          ui.emptyCard,
          'duration-500 animate-in fade-in-50 zoom-in-95',
        )}
      >
        <div
          className={cn(
            'flex size-16 items-center justify-center rounded-[20px] bg-foreground/6 ring-1 ring-border/60 ring-inset',
            iconClassName,
          )}
        >
          {icon}
        </div>
        <div className="space-y-1">
          <p className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">{title}</p>
          {description && <p className="mx-auto max-w-xs text-[13px] leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Squelette de chargement des messages ─────────────────────────────────── */
const SKELETON_ROWS = [
  { self: false, w: 'w-48', two: false },
  { self: true, w: 'w-40', two: false },
  { self: false, w: 'w-64', two: true },
  { self: false, w: 'w-36', two: false },
  { self: true, w: 'w-52', two: true },
  { self: false, w: 'w-44', two: false },
];

export function MessagesSkeleton() {
  return (
    <div className="flex h-full flex-col justify-end gap-4 px-3 py-4">
      {SKELETON_ROWS.map((r, i) => (
        <div
          key={i}
          className={cn('flex items-end gap-2.5', r.self && 'flex-row-reverse')}
          style={{ opacity: 0.25 + i * 0.12 }}
        >
          {!r.self && <Skeleton className="size-8 shrink-0 rounded-full" />}
          <div className={cn('flex flex-col gap-1', r.self ? 'items-end' : 'items-start')}>
            {!r.self && <Skeleton className="mb-0.5 h-3 w-20 rounded" />}
            <div className={cn('space-y-1.5 rounded-2xl bg-foreground/5 px-3 py-2.5', r.w)}>
              <Skeleton className="h-3 w-full rounded" />
              {r.two && <Skeleton className="h-3 w-3/4 rounded" />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Tuile d'icône d'en-tête (avatar / icône de salon) ────────────────────── */
export function ChatIconTile({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.06] ring-1 ring-border/50 ring-inset',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ── Bouton d'action d'en-tête (icône + tooltip) ──────────────────────────── */
export function HeaderAction({
  label,
  onClick,
  disabled,
  active,
  className,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant={active ? 'secondary' : 'ghost'}
            onClick={onClick}
            disabled={disabled}
            className={cn('size-8 rounded-xl text-muted-foreground hover:text-foreground', active && 'text-foreground', className)}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ── En-tête de conversation ──────────────────────────────────────────────── */
export function ChatHeader({
  onBack,
  leading,
  title,
  subtitle,
  badge,
  actions,
  heightClass = 'h-14',
}: {
  onBack?: () => void;
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  heightClass?: string;
}) {
  const ui = useUIStyle();
  return (
    <header className={cn('flex shrink-0 items-center gap-2.5 px-2.5 md:px-3.5', heightClass, ui.header)}>
      {onBack && (
        <Button
          size="icon"
          variant="ghost"
          onClick={onBack}
          className="size-8 shrink-0 rounded-xl text-muted-foreground md:hidden"
          aria-label="Retour"
        >
          <ArrowLeftIcon size={18} />
        </Button>
      )}
      {leading}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-semibold tracking-[-0.01em] text-foreground">{title}</span>
          {badge}
        </div>
        {subtitle && <span className="truncate text-[11px] leading-tight text-muted-foreground/70">{subtitle}</span>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-0.5">{actions}</div>}
    </header>
  );
}

/* ── Composer (zone de saisie) ────────────────────────────────────────────── */
export interface ComposerAttachment {
  name: string;
  url: string;
  isImage: boolean;
}

export function ChatComposer({
  textareaRef,
  value,
  onChange,
  onKeyDown,
  onPaste,
  onSend,
  placeholder,
  dimmed,
  attachments,
  onRemoveAttachment,
  onAttachClick,
  isUploading,
  hideAttach,
  onEmoji,
  onGif,
  reply,
  onCancelReply,
  extras,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: ReactClipboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  placeholder: string;
  dimmed?: boolean;
  attachments?: ComposerAttachment[];
  onRemoveAttachment?: (index: number) => void;
  onAttachClick?: () => void;
  isUploading?: boolean;
  hideAttach?: boolean;
  onEmoji: (emoji: string) => void;
  onGif?: (url: string) => void;
  reply?: { authorName: string; content: string } | null;
  onCancelReply?: () => void;
  extras?: ReactNode;
}) {
  const ui = useUIStyle();
  const hasContent = value.trim().length > 0 || (attachments?.length ?? 0) > 0;

  return (
    <div className="relative shrink-0 px-3 pb-3 pt-1 md:px-4 md:pb-4">
      {extras}

      {/* Aperçu de réponse */}
      {reply && (
        <div className={cn('flex items-center gap-2.5 px-3 py-2', ui.replyBar)}>
          <ReplyIcon size={13} className="shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-primary">Réponse à {reply.authorName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{reply.content}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="size-6 shrink-0 rounded-lg"
            onClick={onCancelReply}
            type="button"
            aria-label="Annuler la réponse"
          >
            <XIcon size={12} />
          </Button>
        </div>
      )}

      {/* Barre de saisie */}
      <div
        className={cn(
          'flex items-end gap-1.5 px-2 py-1.5 transition-all duration-200 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15',
          ui.inputBar,
          reply && 'rounded-tl-none rounded-tr-none border-t-0',
          dimmed && 'pointer-events-none opacity-40',
        )}
      >
        {!hideAttach && (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0 self-end rounded-xl text-muted-foreground hover:text-foreground"
                  disabled={isUploading}
                  onClick={onAttachClick}
                  aria-label="Joindre un fichier"
                >
                  {isUploading ? <Spinner size="sm" /> : <PaperclipIcon size={17} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Joindre un fichier (image, PDF, DOCX… &lt;10 Mo)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {attachments && attachments.length > 0 && (
            <div className="flex flex-wrap gap-1 px-0.5 pt-1">
              {attachments.map((att, i) => (
                <Badge key={i} variant="secondary" className="gap-1 py-0.5 text-[11px]">
                  {att.isImage ? (
                    <ImageIcon size={11} className="shrink-0 text-sky-500" />
                  ) : (
                    <FileTextIcon size={11} className="shrink-0 text-amber-500" />
                  )}
                  <span className="max-w-30 truncate">{att.name}</span>
                  <button
                    type="button"
                    className="ml-0.5 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveAttachment?.(i)}
                    aria-label="Retirer la pièce jointe"
                  >
                    <XIcon size={10} />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder={placeholder}
            className="w-full resize-none border-0 bg-transparent py-1.5 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground/50"
            style={{ minHeight: '24px', maxHeight: '120px', overflowY: 'auto' }}
            aria-label="Message"
          />
        </div>

        <div className="flex shrink-0 items-center gap-0.5 self-end">
          <EmojiPicker onSelect={onEmoji} onGifSelect={onGif}>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
              aria-label="Emoji"
            >
              <SmileIcon size={18} />
            </Button>
          </EmojiPicker>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn(
              'size-8 rounded-xl transition-all duration-200',
              hasContent
                ? 'scale-100 bg-primary text-primary-foreground shadow-sm shadow-primary/30 hover:bg-primary/90'
                : 'scale-90 text-muted-foreground/40',
            )}
            disabled={!hasContent}
            onClick={onSend}
            aria-label="Envoyer"
          >
            <SendIcon size={17} />
          </Button>
        </div>
      </div>
    </div>
  );
}
