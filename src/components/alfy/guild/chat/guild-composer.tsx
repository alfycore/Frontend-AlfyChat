'use client';

/**
 * Zone de saisie d'un salon de serveur (gabarit Discord).
 *
 *  - « + » : envoyer un fichier ; coller ou glisser un fichier fonctionne aussi ;
 *  - bandeau « Réponse à … » avec bascule de mention (@ ON / OFF) ;
 *  - autocomplétion `@membre`, `@rôle`, `@everyone`, `#salon` (flèches, Tab, Entrée) ;
 *  - Entrée envoie, Maj+Entrée va à la ligne, ↑ dans un champ vide modifie
 *    son dernier message ;
 *  - mode lent : compte à rebours après envoi (sauf pour qui gère le salon) ;
 *  - sans droit d'envoi, la zone est remplacée par un message explicite.
 *
 * Brouillons et pièces jointes survivent au changement de salon.
 */

import { Avatar, Button, Dropdown, Label, Spinner, Tooltip, toast } from '@heroui/react';
import { AtSign, FileText, Hash, Lock, Plus, SendHorizontal, Timer, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { useTranslation } from '@/components/locale-provider';
import { useAppPrefs } from '@/hooks/use-app-prefs';
import { api, resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import { EmojiPicker } from '@/components/alfy/chat/emoji-picker';
import type { AlfyMessage } from '@/components/alfy/mock/types';
import { CHANNEL_ICONS } from '@/components/alfy/guild/channel-icons';
import type { GuildChannel, GuildMember, GuildRole } from '@/components/alfy/guild/types';

const MAX_LENGTH = 2000;
const MAX_HEIGHT = 50 * 22;
const TYPING_EVERY_MS = 2500;
const MAX_UPLOAD = 10 * 1024 * 1024;

interface Pending {
  id: string;
  name: string;
  url: string;
  isImage: boolean;
}

const drafts = new Map<string, string>();
/** Horloge des gestionnaires d'évènements (jamais appelée pendant le rendu). */
const nowMs = () => Date.now();
const pendingFiles = new Map<string, Pending[]>();
/** Fin du mode lent par salon (survit au changement de vue). */
const slowUntil = new Map<string, number>();

type Suggestion =
  | { kind: 'member'; id: string; label: string; sub: string; avatarUrl?: string; insert: string }
  | { kind: 'role'; id: string; label: string; color: string; insert: string }
  | { kind: 'everyone'; id: string; label: string; sub: string; insert: string }
  | { kind: 'channel'; id: string; label: string; channel: GuildChannel; insert: string };

export interface ComposerSendPayload {
  content: string;
  attachments: string[];
  mentionedUserIds: string[];
  replyToId?: string;
}

interface GuildComposerProps {
  serverId: string;
  channel: GuildChannel;
  members: Record<string, GuildMember>;
  roles: GuildRole[];
  channels: GuildChannel[];
  canSend: boolean;
  canAttach: boolean;
  canMentionEveryone: boolean;
  /** Exempté du mode lent (gère les messages ou le salon). */
  slowExempt: boolean;
  replyTo?: { message: AlfyMessage; authorName: string } | null;
  onCancelReply: () => void;
  onSend: (payload: ComposerSendPayload) => void;
  onTyping: () => void;
  /** ↑ dans une zone vide. */
  onEditLast: () => void;
  compact?: boolean;
}

export function GuildComposer({
  serverId,
  channel,
  members,
  roles,
  channels,
  canSend,
  canAttach,
  canMentionEveryone,
  slowExempt,
  replyTo,
  onCancelReply,
  onSend,
  onTyping,
  onEditLast,
  compact = false,
}: GuildComposerProps) {
  const { t, tx } = useTranslation();
  const { prefs } = useAppPrefs();
  const key = channel.id;
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastTyping = useRef(0);

  const [value, setValue] = useState(() => drafts.get(key) ?? '');
  const [files, setFiles] = useState<Pending[]>(() => pendingFiles.get(key) ?? []);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [ping, setPing] = useState(true);
  const [now, setNow] = useState(nowMs);
  const [suggestIndex, setSuggestIndex] = useState(0);
  const [caret, setCaret] = useState(0);

  /* ── Mode lent ───────────────────────────────────────────────────────── */
  const slowRemaining = Math.max(0, Math.ceil(((slowUntil.get(key) ?? 0) - now) / 1000));
  useEffect(() => {
    if (slowRemaining <= 0) return;
    const id = window.setInterval(() => setNow(nowMs()), 500);
    return () => window.clearInterval(id);
  }, [slowRemaining]);

  const resize = useCallback(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, []);
  useEffect(() => {
    resize();
  }, [value, resize]);
  useEffect(() => {
    requestAnimationFrame(() => areaRef.current?.focus());
  }, []);
  /* Nouvelle réponse : mention réactivée (en phase de rendu), focus dans la zone. */
  const replyKey = replyTo?.message.id ?? null;
  const [pingFor, setPingFor] = useState(replyKey);
  if (replyKey !== pingFor) {
    setPingFor(replyKey);
    if (replyKey) setPing(true);
  }
  useEffect(() => {
    if (replyKey) areaRef.current?.focus();
  }, [replyKey]);

  const updateFiles = useCallback(
    (fn: (list: Pending[]) => Pending[]) =>
      setFiles((list) => {
        const next = fn(list);
        if (next.length) pendingFiles.set(key, next);
        else pendingFiles.delete(key);
        return next;
      }),
    [key],
  );

  const upload = useCallback(
    async (list: File[]) => {
      if (!list.length || !canSend) return;
      if (!canAttach) {
        toast.danger(t.guild.composer.noAttach);
        return;
      }
      setUploading(true);
      try {
        for (const file of list) {
          if (file.size > MAX_UPLOAD) {
            toast.danger(t.guild.composer.tooLarge, { description: file.name });
            continue;
          }
          const res = await api.uploadServerFile(serverId, file, channel.id);
          if (res.success && res.data?.url) {
            const url = res.data.url;
            updateFiles((prev) => [
              ...prev,
              { id: `${nowMs()}-${Math.random().toString(36).slice(2)}`, name: res.data!.originalName || file.name, url, isImage: file.type.startsWith('image/') },
            ]);
          } else {
            toast.danger(t.guild.composer.uploadFailed, { description: res.error || file.name });
          }
        }
      } finally {
        setUploading(false);
        areaRef.current?.focus();
      }
    },
    [canSend, canAttach, serverId, channel.id, updateFiles, t],
  );

  /* ── Autocomplétion ──────────────────────────────────────────────────── */
  const token = useMemo(() => {
    const before = value.slice(0, caret);
    const m = /(^|\s)([@#])([\p{L}\p{N}_.-]{0,32})$/u.exec(before);
    if (!m) return null;
    return { trigger: m[2] as '@' | '#', query: m[3].toLowerCase(), start: before.length - m[3].length - 1 };
  }, [value, caret]);

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!token) return [];
    const q = token.query;
    if (token.trigger === '#') {
      return channels
        .filter((c) => c.type !== 'category' && c.name.toLowerCase().includes(q))
        .slice(0, 8)
        .map((c) => ({ kind: 'channel', id: c.id, label: c.name, channel: c, insert: `#${c.name} ` }));
    }
    const out: Suggestion[] = [];
    if (canMentionEveryone) {
      for (const special of ['everyone', 'here'] as const) {
        if (special.startsWith(q)) out.push({ kind: 'everyone', id: special, label: `@${special}`, sub: special === 'everyone' ? t.guild.composer.everyoneDesc : t.guild.composer.hereDesc, insert: `@${special} ` });
      }
    }
    const people = Object.values(members)
      .filter((m) => {
        const nick = (m.nickname ?? '').toLowerCase();
        return m.user.username.toLowerCase().includes(q) || m.user.displayName.toLowerCase().includes(q) || nick.includes(q);
      })
      .slice(0, 8)
      .map<Suggestion>((m) => ({
        kind: 'member',
        id: m.userId,
        label: m.nickname || m.user.displayName,
        sub: m.user.username,
        avatarUrl: m.user.avatarUrl,
        insert: `@${m.user.username} `,
      }));
    const roleHits = roles
      .filter((r) => !r.isDefault && (r.mentionable || canMentionEveryone) && r.name.toLowerCase().includes(q))
      .slice(0, 4)
      .map<Suggestion>((r) => ({ kind: 'role', id: r.id, label: `@${r.name}`, color: r.color, insert: `@${r.name.replace(/\s+/g, '_')} ` }));
    return [...out, ...people, ...roleHits].slice(0, 10);
  }, [token, channels, members, roles, canMentionEveryone, t]);

  const tokenKey = token ? `${token.trigger}${token.query}` : '';
  const [indexFor, setIndexFor] = useState(tokenKey);
  if (tokenKey !== indexFor) {
    setIndexFor(tokenKey);
    setSuggestIndex(0);
  }

  const applySuggestion = (s: Suggestion) => {
    if (!token) return;
    const next = value.slice(0, token.start) + s.insert + value.slice(caret);
    const pos = token.start + s.insert.length;
    change(next);
    requestAnimationFrame(() => {
      const el = areaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(pos, pos);
      setCaret(pos);
    });
  };

  /* ── Saisie / envoi ──────────────────────────────────────────────────── */
  const change = (text: string) => {
    setValue(text);
    if (text) drafts.set(key, text);
    else drafts.delete(key);
    const ts = nowMs();
    if (text && ts - lastTyping.current > TYPING_EVERY_MS) {
      lastTyping.current = ts;
      onTyping();
    }
  };

  const insertAtCaret = (text: string) => {
    const el = areaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + text + value.slice(end);
    change(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + text.length, start + text.length);
    });
  };

  const send = () => {
    const content = value.trim();
    if ((!content && files.length === 0) || !canSend || uploading) return;
    if (content.length > MAX_LENGTH) {
      toast.danger(tx(t.guild.composer.tooLong, { max: MAX_LENGTH }));
      return;
    }
    if (slowRemaining > 0) return;

    let payload = content;
    for (const f of files) {
      const line = f.isImage ? `\n[attach:img]:${f.url}` : `\n[attach:file]:${f.name}|${f.url}`;
      payload = payload ? payload + line : line.trimStart();
    }
    // Mentions réelles : @pseudo correspondant à un membre du serveur.
    const handles = new Set(Array.from(content.matchAll(/@([\p{L}\p{N}_.-]{2,32})/gu)).map((m) => m[1].toLowerCase()));
    const mentioned = Object.values(members)
      .filter((m) => handles.has(m.user.username.toLowerCase()))
      .map((m) => m.userId);
    if (replyTo && ping && replyTo.message.authorId) mentioned.push(replyTo.message.authorId);

    onSend({ content: payload, attachments: files.map((f) => f.url), mentionedUserIds: [...new Set(mentioned)], replyToId: replyTo?.message.id });
    setValue('');
    drafts.delete(key);
    updateFiles(() => []);
    onCancelReply();
    if (channel.slowMode > 0 && !slowExempt) {
      const t0 = nowMs();
      slowUntil.set(key, t0 + channel.slowMode * 1000);
      setNow(t0);
    }
    requestAnimationFrame(resize);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestIndex((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        applySuggestion(suggestions[suggestIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setCaret(-1);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
      return;
    }
    if (e.key === 'Escape' && replyTo) {
      onCancelReply();
      return;
    }
    if (e.key === 'ArrowUp' && !value) {
      e.preventDefault();
      onEditLast();
    }
  };

  /* ── Rendu ───────────────────────────────────────────────────────────── */
  if (!canSend) {
    return (
      <div className={cn('shrink-0 px-4', compact ? 'pb-3' : 'pb-6')}>
        <div className="flex h-11 items-center gap-2 rounded-lg border border-separator bg-surface-secondary px-4 text-sm text-muted">
          <Lock className="size-4 shrink-0" aria-hidden />
          {t.guild.chat.noSendPermission}
        </div>
      </div>
    );
  }

  const ChannelIcon = CHANNEL_ICONS[channel.type] ?? CHANNEL_ICONS.text;
  const length = value.length;

  return (
    <div
      className={cn('relative shrink-0 px-4', compact ? 'pb-3' : 'pb-6')}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDragOver(false);
        void upload(Array.from(e.dataTransfer.files));
      }}
    >
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="alfy-enter absolute inset-x-4 bottom-full z-20 mb-2 overflow-hidden rounded-lg border border-border bg-overlay shadow-lg">
          <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-[0.04em] text-muted uppercase">
            {token?.trigger === '#' ? t.guild.composer.suggestChannels : t.guild.composer.suggestMembers}
          </p>
          <ul role="listbox" className="max-h-72 overflow-y-auto p-1">
            {suggestions.map((s, i) => (
              <li key={`${s.kind}-${s.id}`} role="option" aria-selected={i === suggestIndex}>
                <button
                  type="button"
                  onMouseEnter={() => setSuggestIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applySuggestion(s);
                  }}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm',
                    i === suggestIndex ? 'bg-foreground/8 text-foreground' : 'text-foreground/85',
                  )}
                >
                  {s.kind === 'member' && (
                    <>
                      <Avatar className="size-6 text-[10px]">
                        {s.avatarUrl && <Avatar.Image src={resolveMediaUrl(s.avatarUrl)} alt="" />}
                        <Avatar.Fallback>{s.label.slice(0, 1)}</Avatar.Fallback>
                      </Avatar>
                      <span className="truncate font-medium">{s.label}</span>
                      <span className="ml-auto truncate text-xs text-muted">{s.sub}</span>
                    </>
                  )}
                  {s.kind === 'everyone' && (
                    <>
                      <AtSign className="size-5 text-muted" aria-hidden />
                      <span className="font-medium">{s.label}</span>
                      <span className="ml-auto truncate text-xs text-muted">{s.sub}</span>
                    </>
                  )}
                  {s.kind === 'role' && (
                    <>
                      <span className="size-3 rounded-full" style={{ background: s.color }} aria-hidden />
                      <span className="font-medium" style={{ color: s.color }}>
                        {s.label}
                      </span>
                    </>
                  )}
                  {s.kind === 'channel' && (
                    <>
                      {(() => {
                        const Icon = CHANNEL_ICONS[s.channel.type] ?? Hash;
                        return <Icon className="size-4.5 text-muted" aria-hidden />;
                      })()}
                      <span className="truncate font-medium">{s.label}</span>
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        className={cn(
          'overflow-hidden rounded-lg border bg-surface-secondary transition-[border-color,box-shadow] duration-(--dur-1)',
          dragOver ? 'border-accent shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_25%,transparent)]' : 'border-transparent',
        )}
      >
        {replyTo && (
          <div className="alfy-enter flex items-center gap-2 border-b border-separator bg-foreground/4 px-4 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate text-muted">
              {t.guild.composer.replyingTo} <span className="font-semibold text-foreground">{replyTo.authorName}</span>
            </span>
            <Tooltip delay={300} closeDelay={0}>
              <button
                type="button"
                onClick={() => setPing((p) => !p)}
                aria-pressed={ping}
                className={cn(
                  'flex cursor-pointer items-center gap-0.5 rounded-sm px-1 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-focus',
                  ping ? 'text-accent' : 'text-muted',
                )}
              >
                <AtSign className="size-3.5" aria-hidden />
                {ping ? t.guild.composer.pingOn : t.guild.composer.pingOff}
              </button>
              <Tooltip.Content>
                <p>{ping ? t.guild.composer.pingOnHint : t.guild.composer.pingOffHint}</p>
              </Tooltip.Content>
            </Tooltip>
            <button
              type="button"
              aria-label={t.guild.composer.cancelReply}
              onClick={onCancelReply}
              className="flex size-5 cursor-pointer items-center justify-center rounded-full bg-foreground/15 text-surface-secondary outline-none hover:bg-foreground/30 focus-visible:ring-2 focus-visible:ring-focus"
            >
              <X className="size-3" strokeWidth={3} aria-hidden />
            </button>
          </div>
        )}

        {files.length > 0 && (
          <div className="flex gap-3 overflow-x-auto border-b border-separator p-3">
            {files.map((f) => (
              <div key={f.id} className="alfy-enter relative flex h-36 w-36 shrink-0 flex-col overflow-hidden rounded-md border border-separator bg-surface">
                {f.isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveMediaUrl(f.url)} alt="" className="min-h-0 flex-1 object-cover" />
                ) : (
                  <span className="flex flex-1 items-center justify-center text-muted">
                    <FileText className="size-10" aria-hidden />
                  </span>
                )}
                <span className="truncate px-2 py-1 text-xs">{f.name}</span>
                <button
                  type="button"
                  aria-label={t.guild.composer.removeFile}
                  onClick={() => updateFiles((prev) => prev.filter((x) => x.id !== f.id))}
                  className="absolute top-1 right-1 flex size-6 cursor-pointer items-center justify-center rounded-md bg-overlay text-danger shadow-sm outline-none hover:bg-danger hover:text-(--danger-foreground) focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-start gap-1 pr-2 pl-1">
          <Dropdown>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={t.guild.composer.more}
              className="mt-1.5 size-8 min-w-8 rounded-full text-muted hover:text-foreground"
              isDisabled={uploading}
            >
              {uploading ? <Spinner size="sm" /> : <Plus className="size-5 rounded-full" aria-hidden />}
            </Button>
            <Dropdown.Popover placement="top start" className="min-w-52">
              <Dropdown.Menu aria-label={t.guild.composer.more}>
                <Dropdown.Item id="upload" textValue={t.guild.composer.uploadFile} isDisabled={!canAttach} onAction={() => fileRef.current?.click()}>
                  <Upload className="size-4" aria-hidden />
                  <Label>{t.guild.composer.uploadFile}</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              void upload(Array.from(e.target.files ?? []));
              e.target.value = '';
            }}
          />

          <textarea
            ref={areaRef}
            rows={1}
            value={value}
            aria-label={tx(t.guild.chat.composerPlaceholder, { name: channel.name })}
            placeholder={tx(t.guild.chat.composerPlaceholder, { name: channel.name })}
            onChange={(e) => {
              change(e.target.value);
              setCaret(e.target.selectionStart ?? e.target.value.length);
            }}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
            onKeyDown={onKeyDown}
            onPaste={(e) => {
              const list = Array.from(e.clipboardData?.files ?? []);
              if (!list.length) return;
              e.preventDefault();
              void upload(list);
            }}
            className="min-h-11 flex-1 resize-none bg-transparent px-2 py-2.75 text-[15px] leading-5.5 text-foreground outline-none placeholder:text-muted/80"
          />

          <div className="mt-1.5 flex shrink-0 items-center gap-0.5">
            <EmojiPicker
              serverId={serverId}
              showStickers={prefs.stickerSuggestions}
              onPick={(emoji) => insertAtCaret(emoji)}
              onPickGif={(url) => insertAtCaret(`${url} `)}
            />
            {(prefs.showSendButton || files.length > 0) && (
            <Tooltip delay={300} closeDelay={0}>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label={t.guild.composer.send}
                className={cn('size-8 min-w-8 transition-colors duration-(--dur-1)', value.trim() || files.length ? 'text-accent' : 'text-muted')}
                isDisabled={(!value.trim() && files.length === 0) || slowRemaining > 0 || uploading}
                onPress={send}
              >
                <SendHorizontal className="size-4.5" aria-hidden />
              </Button>
              <Tooltip.Content>
                <p>{t.guild.composer.send}</p>
              </Tooltip.Content>
            </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Pied : mode lent / compteur. */}
      <div className="pointer-events-none absolute right-6 bottom-1 flex items-center gap-3 text-[11px] text-muted">
        {length > MAX_LENGTH - 200 && (
          <span className={cn('tabular-nums', length > MAX_LENGTH && 'font-semibold text-danger')}>{MAX_LENGTH - length}</span>
        )}
        {channel.slowMode > 0 && !slowExempt && (
          <span className="flex items-center gap-1">
            <Timer className="size-3" aria-hidden />
            {slowRemaining > 0 ? tx(t.guild.composer.slowWait, { s: slowRemaining }) : t.guild.composer.slowOn}
          </span>
        )}
      </div>

      {dragOver && (
        <div className="pointer-events-none absolute inset-x-4 -top-24 bottom-6 z-30 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent bg-accent/10 text-accent backdrop-blur-sm">
          <ChannelIcon className="size-8" aria-hidden />
          <p className="text-sm font-semibold">{tx(t.guild.composer.dropHere, { name: channel.name })}</p>
        </div>
      )}
    </div>
  );
}
