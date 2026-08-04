'use client';

import { Popover, ScrollShadow, SearchField, Tooltip } from '@heroui/react';
import { Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { AlfyMessage } from '@/components/alfy/mock/types';
import { useUserById } from '@/components/alfy/user-directory';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { useAppPrefs } from '@/hooks/use-app-prefs';
import { api } from '@/lib/api';
import { conversationsStore } from '@/lib/conversations-store';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/components/locale-provider';

/** Nombre de conversations interrogées en parallèle sur une recherche globale. */
const MAX_CONVERSATIONS = 15;

interface GlobalHit {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
  conversationName: string;
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function highlight(text: string, q: string) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-warning/40 text-foreground">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/** Recherche de messages dans le salon, résultats en popover. */
export function SearchPanel({ messages, channelName, onJump }: { messages: AlfyMessage[]; channelName: string; onJump?: (id: string) => void }) {
  const { t, tx } = useTranslation();
  const userById = useUserById();
  const { prefs } = useAppPrefs();
  const [query, setQuery] = useState('');
  // La préférence « Rechercher » donne la portée par défaut ; l'utilisateur
  // peut toujours basculer pour une recherche ponctuelle.
  const [scope, setScope] = useState<'selected' | 'all'>(prefs.dmSearchScope);
  const [globalHits, setGlobalHits] = useState<GlobalHit[]>([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setScope(prefs.dmSearchScope), [prefs.dmSearchScope]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return messages.filter((m) => m.content.toLowerCase().includes(q)).slice(0, 30);
  }, [query, messages]);

  /* Recherche multi-conversations — une requête par MP, fusionnée par date. */
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = query.trim();
    if (scope !== 'all' || q.length < 2) {
      setGlobalHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(() => {
      const convs = conversationsStore.get().slice(0, MAX_CONVERSATIONS);
      void Promise.all(
        convs.map(async (c) => {
          const res = (await api.searchMessages(c.id, q, 5).catch(() => null)) as
            | { data?: unknown[] }
            | unknown[]
            | null;
          const raw = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
          return (raw as Record<string, unknown>[]).map<GlobalHit>((m) => ({
            id: String(m.id),
            content: String(m.content ?? ''),
            authorId: String(m.senderId ?? ''),
            createdAt: String(m.createdAt ?? new Date().toISOString()),
            conversationName: c.recipientName,
          }));
        }),
      ).then((lists) => {
        setGlobalHits(
          lists
            .flat()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 30),
        );
        setSearching(false);
      });
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, scope]);

  const isGlobal = scope === 'all';
  const count = isGlobal ? globalHits.length : results.length;

  return (
    <Popover>
      <Tooltip delay={300}>
        <Popover.Trigger
          aria-label={t.search.channelAriaLabel}
          className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Search className="size-4.5" />
        </Popover.Trigger>
        <Tooltip.Content>
          <p>{t.search.tooltip}</p>
        </Tooltip.Content>
      </Tooltip>
      <Popover.Content className="w-96 p-0">
        <Popover.Dialog aria-label={t.search.dialogAriaLabel} className="flex max-h-112 flex-col p-0">
          <div className="border-b border-separator p-2">
            <SearchField value={query} onChange={setQuery} aria-label={t.search.tooltip} autoFocus>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input
                  placeholder={isGlobal ? t.search.placeholderAllDms : tx(t.search.placeholderChannel, { name: channelName })}
                />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <div className="mt-2 flex gap-1" role="group" aria-label={t.search.scopeAriaLabel}>
              {([
                { id: 'selected', label: t.search.scopeSelected },
                { id: 'all', label: t.search.scopeAll },
              ] as const).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={scope === s.id}
                  onClick={() => setScope(s.id)}
                  className={cn(
                    'cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] font-medium outline-none transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-focus',
                    scope === s.id
                      ? 'bg-accent text-accent-fg'
                      : 'bg-surface-secondary text-muted hover:text-foreground',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <ScrollShadow className="min-h-0 flex-1 overflow-y-auto p-2" orientation="vertical">
            {query.trim() === '' ? (
              <p className="p-6 text-center text-xs text-muted">{t.search.emptyPrompt}</p>
            ) : searching ? (
              <p className="flex items-center justify-center gap-2 p-6 text-xs text-muted">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                {t.search.searching}
              </p>
            ) : count === 0 ? (
              <p className="p-6 text-center text-xs text-muted">{t.search.noMatch}</p>
            ) : (
              <>
                <p className="px-1 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
                  {tx(t.search.resultsCountLabel, { n: count, plural: count > 1 ? 's' : '' })}
                </p>
                <div className="flex flex-col gap-0.5">
                  {isGlobal
                    ? globalHits.map((m) => {
                        const author = userById(m.authorId);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => onJump?.(m.id)}
                            className="flex w-full cursor-pointer gap-2.5 rounded-md p-2 text-left outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
                          >
                            <AlfyAvatar name={author.displayName} avatarUrl={author.avatarUrl} size="sm" />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline gap-2">
                                <span className="truncate text-xs font-semibold">{author.displayName}</span>
                                <span className="shrink-0 text-[10px] text-muted">
                                  {dateFmt.format(new Date(m.createdAt))}
                                </span>
                              </span>
                              <span className="mb-0.5 block truncate text-[10px] text-accent">
                                {m.conversationName}
                              </span>
                              <span className="line-clamp-2 text-xs text-foreground/80">
                                {highlight(m.content, query.trim())}
                              </span>
                            </span>
                          </button>
                        );
                      })
                    : results.map((m) => {
                        const author = userById(m.authorId);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => onJump?.(m.id)}
                            className="flex w-full cursor-pointer gap-2.5 rounded-md p-2 text-left outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-focus"
                          >
                            <AlfyAvatar name={author.displayName} avatarUrl={author.avatarUrl} size="sm" />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline gap-2">
                                <span className="truncate text-xs font-semibold">{author.displayName}</span>
                                <span className="shrink-0 text-[10px] text-muted">
                                  {dateFmt.format(new Date(m.createdAt))}
                                </span>
                              </span>
                              <span className="line-clamp-2 text-xs text-foreground/80">
                                {highlight(m.content, query.trim())}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                </div>
              </>
            )}
          </ScrollShadow>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
