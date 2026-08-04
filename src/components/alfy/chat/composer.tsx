'use client';

import { Button, Tooltip, toast } from '@heroui/react';
import { Loader2, Lock, Paperclip, SendHorizontal, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { SLASH_COMMANDS } from '@/components/alfy/mock/data';
import type { AlfyChannel, AlfyUser } from '@/components/alfy/mock/types';
import { EmojiPicker } from '@/components/alfy/chat/emoji-picker';
import { AlfyMarkdown } from '@/components/alfy/chat/markdown';
import { MentionMenu, type MentionItem } from '@/components/alfy/chat/mention-menu';
import { SlashMenu } from '@/components/alfy/chat/slash-menu';
import { useAppPrefs } from '@/hooks/use-app-prefs';
import { api } from '@/lib/api';

/** Émoticônes converties à l'envoi — préférence « Convertir les émoticônes ». */
const EMOTICONS: [RegExp, string][] = [
  [/(^|\s):-?\)(?=\s|$)/g, '$1🙂'],
  [/(^|\s):-?D(?=\s|$)/g, '$1😃'],
  [/(^|\s):-?\((?=\s|$)/g, '$1🙁'],
  [/(^|\s):-?\/(?=\s|$)/g, '$1😕'],
  [/(^|\s):-?P(?=\s|$)/gi, '$1😛'],
  [/(^|\s);-?\)(?=\s|$)/g, '$1😉'],
  [/(^|\s):-?O(?=\s|$)/gi, '$1😮'],
  [/(^|\s)XD(?=\s|$)/g, '$1😆'],
  [/(^|\s)<3(?=\s|$)/g, '$1❤️'],
  [/(^|\s):'\((?=\s|$)/g, '$1😢'],
];

function emojifyEmoticons(text: string): string {
  return EMOTICONS.reduce((acc, [re, rep]) => acc.replace(re, rep), text);
}

/** Le brouillon contient-il de quoi justifier un aperçu ? */
const HAS_SYNTAX = /(\*\*|__|~~|\|\||`|^>|^#{1,6}\s|\[[^\]]+\]\(|[@#])/m;

interface UploadedAttachment {
  name: string;
  url: string;
  isImage: boolean;
}

interface ComposerProps {
  placeholder: string;
  encrypted?: boolean;
  onSend?: (content: string) => void;
  onSendGif?: (url: string) => void;
  /** Membres et salons proposés en autocomplétion @ / #. */
  mentionUsers?: AlfyUser[];
  mentionChannels?: AlfyChannel[];
  /** Serveur courant — inclut ses émoji même s'ils sont réservés à lui-même. */
  serverId?: string;
}

/** Jeton @/# en cours de saisie juste avant le curseur. */
function activeToken(value: string, caret: number): { type: '@' | '#'; query: string; start: number } | null {
  const before = value.slice(0, caret);
  const m = before.match(/(^|\s)([@#])([\wÀ-ÿ.-]*)$/);
  if (!m) return null;
  const type = m[2] as '@' | '#';
  const query = m[3];
  return { type, query, start: caret - query.length - 1 };
}

export function Composer({
  placeholder,
  encrypted = true,
  onSend,
  onSendGif,
  mentionUsers = [],
  mentionChannels = [],
  serverId,
}: ComposerProps) {
  const [value, setValue] = useState('');
  const [caret, setCaret] = useState(0);
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { prefs } = useAppPrefs();

  const slashCommands = useMemo(() => {
    if (!prefs.commandSuggestions) return [];
    if (!value.startsWith('/') || value.includes(' ')) return [];
    const q = value.slice(1).toLowerCase();
    return SLASH_COMMANDS.filter((c) => c.name.startsWith(q));
  }, [value, prefs.commandSuggestions]);

  const token = useMemo(() => activeToken(value, caret), [value, caret]);

  const mentionItems = useMemo<MentionItem[]>(() => {
    if (!token) return [];
    const q = token.query.toLowerCase();
    if (token.type === '@') {
      return mentionUsers
        .filter((u) => u.displayName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
        .slice(0, 6)
        .map((user) => ({ kind: 'user', user }));
    }
    return mentionChannels
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 6)
      .map((channel) => ({ kind: 'channel', channel }));
  }, [token, mentionUsers, mentionChannels]);

  const insertMention = (item: MentionItem) => {
    if (!token) return;
    const label = item.kind === 'user' ? `@${item.user.displayName}` : `#${item.channel.name}`;
    const next = value.slice(0, token.start) + label + ' ' + value.slice(caret);
    setValue(next);
    const pos = token.start + label.length + 1;
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(pos, pos);
        setCaret(pos);
      }
    });
  };

  const send = () => {
    if (uploading) return;
    let content = value.trim();
    if (prefs.emoticonToEmoji) content = emojifyEmoticons(content);
    if (!content && attachments.length === 0) return;
    for (const a of attachments) {
      const line = a.isImage ? `\n[attach:img]:${a.url}` : `\n[attach:file]:${a.name}|${a.url}`;
      content = content ? content + line : line.trimStart();
    }
    onSend?.(content);
    setValue('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleFiles = async (files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    setUploading(true);
    try {
      for (const file of list) {
        const res = await api.uploadDocument(file);
        if (res.success && res.data) {
          setAttachments((a) => [...a, { name: file.name, url: res.data!.url, isImage: res.data!.isImage }]);
        } else {
          toast.danger('Envoi impossible', { description: res.error || file.name });
        }
      }
    } finally {
      setUploading(false);
    }
  };

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const showMentions = mentionItems.length > 0 && slashCommands.length === 0;

  // Aperçu du rendu pendant la saisie — n'apparaît que s'il y a de la syntaxe.
  const preview = prefs.previewSyntax && value.trim().length > 0 && HAS_SYNTAX.test(value)
    ? (prefs.emoticonToEmoji ? emojifyEmoticons(value) : value)
    : null;

  return (
    <div className="relative px-4 pb-4">
      {slashCommands.length > 0 && (
        <SlashMenu
          commands={slashCommands}
          onPick={(name) => {
            setValue(`/${name} `);
            textareaRef.current?.focus();
          }}
        />
      )}
      {showMentions && <MentionMenu items={mentionItems} onPick={insertMention} />}

      <div className="rounded-xl border border-border bg-field ring-1 ring-transparent transition-colors duration-150 focus-within:border-accent/50 focus-within:ring-accent/20">
        {preview && (
          <div className="border-b border-separator px-3 py-2">
            <p className="mb-1 text-[10px] font-semibold tracking-wider text-muted uppercase">Aperçu</p>
            <div className="text-sm text-foreground/90">
              <AlfyMarkdown content={preview} />
            </div>
          </div>
        )}
        {(attachments.length > 0 || uploading) && (
          <div className="flex flex-wrap gap-2 border-b border-separator p-2">
            {attachments.map((a, i) => (
              <span
                key={`${a.url}-${i}`}
                className="flex items-center gap-1.5 rounded-sm bg-surface-secondary px-2 py-1 text-xs"
              >
                {a.isImage ? (
                  <img src={a.url} alt="" className="size-4 rounded-sm object-cover" />
                ) : (
                  <Paperclip className="size-3 text-muted" aria-hidden />
                )}
                <span className="max-w-40 truncate">{a.name}</span>
                <button
                  type="button"
                  aria-label={`Retirer ${a.name}`}
                  onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                  className="cursor-pointer rounded-sm text-muted outline-none hover:text-danger focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {uploading && (
              <span className="flex items-center gap-1.5 rounded-sm bg-surface-secondary px-2 py-1 text-xs text-muted">
                <Loader2 className="size-3 animate-spin" aria-hidden />
                Envoi…
              </span>
            )}
          </div>
        )}
        <div className="flex items-end gap-1 p-1.5">
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <Tooltip delay={300}>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label="Joindre un fichier"
              className="text-muted"
              onPress={() => fileRef.current?.click()}
              isDisabled={uploading}
            >
              <Paperclip className="size-4.5" />
            </Button>
            <Tooltip.Content>
              <p>Joindre un fichier</p>
            </Tooltip.Content>
          </Tooltip>

          <textarea
            ref={textareaRef}
            value={value}
            rows={1}
            placeholder={placeholder}
            aria-label={placeholder}
            onChange={(e) => {
              setValue(e.target.value);
              setCaret(e.target.selectionStart ?? e.target.value.length);
              autoGrow(e.target);
            }}
            onKeyUp={(e) => setCaret((e.target as HTMLTextAreaElement).selectionStart ?? 0)}
            onClick={(e) => setCaret((e.target as HTMLTextAreaElement).selectionStart ?? 0)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
                e.preventDefault();
                send();
              }
              if (e.key === 'Enter' && showMentions) {
                e.preventDefault();
                insertMention(mentionItems[0]);
              }
            }}
            className="max-h-50 min-w-0 flex-1 resize-none self-center bg-transparent px-1 py-1.5 text-sm text-field-fg outline-none placeholder:text-field-ph"
          />

          <EmojiPicker
            onPick={(emoji) => {
              setValue((v) => v + emoji);
              textareaRef.current?.focus();
            }}
            onPickGif={(url) => onSendGif?.(url)}
            showStickers={prefs.stickerSuggestions}
            serverId={serverId}
          />
          {prefs.showSendButton && (
            <Button
              isIconOnly
              size="sm"
              aria-label="Envoyer le message"
              onPress={send}
              isDisabled={uploading || (!value.trim() && attachments.length === 0)}
            >
              <SendHorizontal className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {encrypted && (
        <p className="mt-1.5 flex items-center gap-1 truncate text-[10px] text-muted">
          <Lock className="size-2.5 shrink-0 text-(--alfy-e2e)" aria-hidden />
          <span className="truncate">Chiffré de bout en bout</span>
          <span className="hidden shrink-0 items-center gap-1 sm:flex">
            — markdown, <kbd className="font-sans">/</kbd> commandes,{' '}
            <kbd className="font-sans">@</kbd> mentions, <kbd className="font-sans">#</kbd> salons
          </span>
        </p>
      )}
    </div>
  );
}
