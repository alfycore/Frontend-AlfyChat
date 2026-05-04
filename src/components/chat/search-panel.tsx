'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SearchIcon, XIcon, ClockIcon, HashIcon, MessageCircleIcon } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { resolveMediaUrl, api } from '@/lib/api';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import type { MessageData } from '@/components/chat/message-item';

interface SearchPanelProps {
  /** messages déjà chargés/déchiffrés côté client (pour DM E2EE) */
  localMessages: MessageData[];
  /** conversationId pour la recherche serveur (channels) */
  conversationId?: string;
  /** true si DM (recherche locale uniquement car E2EE) */
  isDM: boolean;
  /** Charge plus de messages serveur (pagination) */
  loadMoreMessages: () => Promise<void>;
  /** true s'il reste des messages à charger côté serveur */
  hasMoreMessages: boolean;
  /** true si un chargement est en cours */
  isLoadingMore: boolean;
  onClose: () => void;
  /** appelé quand l'utilisateur clique un résultat */
  onJumpToMessage: (messageId: string) => void;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="rounded-sm bg-primary/25 px-0.5 text-foreground">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function formatSearchDate(dateString: string, labels: { today: string; yesterday: string }): string {
  const date = new Date(dateString);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (date >= startOfToday) return labels.today.replace('{time}', time);
  if (date >= startOfYesterday) return labels.yesterday.replace('{time}', time);
  return `${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${time}`;
}

/** Nettoyage du texte des pièces jointes pour l'affichage */
function stripAttachments(content: string): string {
  return content
    .split('\n')
    .filter((l) => !l.startsWith('[attach:img]:') && !l.startsWith('[attach:file]:'))
    .join('\n')
    .trim();
}

export function SearchPanel({
  localMessages,
  conversationId,
  isDM,
  loadMoreMessages,
  hasMoreMessages,
  isLoadingMore,
  onClose,
  onJumpToMessage,
}: SearchPanelProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MessageData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadingAllRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-load all messages for DM when search panel opens (for complete search)
  const loadAllMessages = useCallback(async () => {
    if (loadingAllRef.current || !hasMoreMessages) {
      setAllLoaded(true);
      return;
    }
    loadingAllRef.current = true;
    setIsLoadingAll(true);
    try {
      // Load messages in batches until done
      let remaining = true;
      while (remaining) {
        await loadMoreMessages();
        // Small delay to avoid hammering
        await new Promise((r) => setTimeout(r, 100));
        // Re-check: hasMoreMessages is reactive, but we need to break somehow
        // We'll rely on the effect re-triggering once localMessages changes
        remaining = false;
      }
    } catch {
      // ignore
    } finally {
      loadingAllRef.current = false;
      setIsLoadingAll(false);
    }
  }, [hasMoreMessages, loadMoreMessages]);

  // Keep loading until all loaded for DM
  useEffect(() => {
    if (isDM && hasMoreMessages && !loadingAllRef.current && !allLoaded) {
      loadAllMessages();
    }
    if (!hasMoreMessages) {
      setAllLoaded(true);
    }
  }, [isDM, hasMoreMessages, allLoaded, loadAllMessages]);

  const searchLocal = useCallback(
    (q: string) => {
      const lower = q.toLowerCase();
      const matched = localMessages
        .filter((m) => {
          if (m.isSystem || m.ephemeral) return false;
          const text = stripAttachments(m.content || '');
          return text.toLowerCase().includes(lower);
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 30);
      setResults(matched);
      setIsSearching(false);
      setHasSearched(true);
    },
    [localMessages],
  );

  const searchServer = useCallback(
    async (q: string) => {
      if (!conversationId) return;
      try {
        const res = await api.searchMessages(conversationId, q) as any;
        const raw = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        // Map server response to MessageData format
        const mapped: MessageData[] = raw.map((m: any) => ({
          id: m.id,
          content: m.content,
          authorId: m.senderId,
          conversationId: m.conversationId,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
          isEdited: m.isEdited,
          replyToId: m.replyToId,
          reactions: m.reactions || [],
          sender: m.sender,
        }));
        setResults(mapped);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
        setHasSearched(true);
      }
    },
    [conversationId],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      if (isDM) {
        searchLocal(query.trim());
      } else {
        searchServer(query.trim());
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, isDM, searchLocal, searchServer]);

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2">
          <SearchIcon size={15} className="text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{t.search.title}</span>
        </div>
        <Button size="icon" variant="ghost" className="size-7" onClick={onClose}>
          <XIcon size={14} />
        </Button>
      </div>

      {/* Search input */}
      <div className="shrink-0 px-3 py-2.5">
        <div className="relative">
          <SearchIcon
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search.placeholder}
            className="h-8 pl-8 pr-8 text-sm"
          />
          {query && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery('')}
            >
              <XIcon size={12} />
            </button>
          )}
        </div>
        {isDM && (
          <p className="mt-1.5 text-[10px] text-muted-foreground/70">
            {isLoadingAll
              ? t.search.loadingMessages.replace('{count}', localMessages.length.toString())
              : allLoaded
                ? t.search.searchingE2EE.replace('{count}', localMessages.length.toString())
                : t.search.localE2EE}
          </p>
        )}
      </div>

      {/* Results */}
      <ScrollArea className="min-h-0 flex-1">
        {isSearching ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <Spinner size="sm" />
            <span className="text-xs">{t.search.searching}</span>
          </div>
        ) : !hasSearched ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <SearchIcon size={28} className="opacity-30" />
            <span className="text-xs">{t.search.minChars}</span>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <MessageCircleIcon size={28} className="opacity-30" />
            <span className="text-xs">{t.search.noResults}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 px-1.5 pb-2">
            <div className="px-2 pb-1 pt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {t.search.results.replace('{n}', results.length.toString())}
            </div>
            {results.map((msg) => {
              const cleanContent = stripAttachments(msg.content || '');
              const sender = msg.sender;
              return (
                <button
                  key={msg.id}
                  type="button"
                  className={cn(
                    'flex w-full gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors',
                    'hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none',
                  )}
                  onClick={() => onJumpToMessage(msg.id)}
                >
                  <Avatar className="mt-0.5 size-7 shrink-0">
                    <AvatarImage src={resolveMediaUrl(sender?.avatarUrl) || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {(sender?.displayName || sender?.username || '?')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="truncate text-xs font-semibold text-foreground">
                        {sender?.displayName || sender?.username || t.search.unknownSender}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground/70">
                        {formatSearchDate(msg.createdAt, { today: t.search.today, yesterday: t.search.searchYesterday })}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {highlightMatch(
                        cleanContent.length > 200
                          ? cleanContent.slice(0, 200) + '…'
                          : cleanContent,
                        query,
                      )}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
