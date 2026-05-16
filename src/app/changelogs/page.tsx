'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api, resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  SparklesIcon, ZapIcon, ShieldIcon, FlameIcon, MegaphoneIcon,
  ArrowLeftIcon, SearchIcon, XIcon,
} from '@/components/icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/components/locale-provider';
import { MarkdownRenderer } from '@/components/chat/markdown-renderer';

interface FeedEntry {
  id: string;
  version: string;
  title: string;
  content: string;
  type: 'feature' | 'fix' | 'improvement' | 'security' | 'breaking' | 'news';
  banner_url?: string | null;
  author_username?: string | null;
  created_at: string;
}

type FilterType = 'all' | FeedEntry['type'];

const TYPE_CFG = {
  news:        { badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',        accent: 'border-l-teal-500',   flatHover: 'hover:shadow-teal-500/10',   icon: MegaphoneIcon },
  feature:     { badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',        accent: 'border-l-blue-500',   flatHover: 'hover:shadow-blue-500/10',   icon: SparklesIcon  },
  improvement: { badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',  accent: 'border-l-violet-500', flatHover: 'hover:shadow-violet-500/10', icon: ZapIcon       },
  fix:         { badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',  accent: 'border-l-orange-500', flatHover: 'hover:shadow-orange-500/10', icon: FlameIcon     },
  security:    { badge: 'bg-red-500/10 text-red-600 dark:text-red-400',           accent: 'border-l-red-500',    flatHover: 'hover:shadow-red-500/10',    icon: ShieldIcon    },
  breaking:    { badge: 'bg-rose-700/10 text-rose-700 dark:text-rose-400',        accent: 'border-l-rose-700',   flatHover: 'hover:shadow-rose-700/10',   icon: FlameIcon     },
} as const;

const FILTER_KEYS: FilterType[] = ['all', 'news', 'feature', 'improvement', 'fix', 'security', 'breaking'];

export default function ChangelogsPublicPage() {
  const { t, locale } = useTranslation();
  const cl = t.changelogs;
  const router = useRouter();

  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    api.getChangelogs(200, 0)
      .then((res) => {
        const raw = res.data;
        const list: FeedEntry[] = Array.isArray(raw)
          ? (raw as FeedEntry[])
          : Array.isArray((raw as any)?.changelogs)
          ? ((raw as any).changelogs as FeedEntry[])
          : Array.isArray((raw as any)?.data)
          ? ((raw as any).data as FeedEntry[])
          : [];
        setEntries(list);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: entries.length };
    for (const e of entries) m[e.type] = (m[e.type] ?? 0) + 1;
    return m;
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter((e) => {
      if (filter !== 'all' && e.type !== filter) return false;
      if (q && !e.title.toLowerCase().includes(q) && !e.version.toLowerCase().includes(q) && !e.content.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, search, filter]);

  const typeLabel = (type: FeedEntry['type']) => ({
    news: cl.typeNews, feature: cl.typeNew, improvement: cl.typeImprovement,
    fix: cl.typeFix, security: cl.typeSecurity, breaking: cl.typeBreaking,
  } as Record<string, string>)[type] ?? type;

  const filterLabel = (type: FilterType) => ({
    all: cl.filterAllShort, news: (cl as any).filterNews ?? cl.typeNews,
    feature: cl.typeNew, improvement: cl.typeImprovement,
    fix: cl.typeFix, security: cl.typeSecurity, breaking: cl.typeBreakingShort,
  } as Record<string, string>)[type] ?? type;

  return (
    <div className="flex min-h-0 flex-col bg-background">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur-sm sm:h-14 sm:gap-2.5 sm:px-4">
        <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground sm:size-8" onClick={() => router.back()}>
          <ArrowLeftIcon size={14} />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
          <SparklesIcon size={13} className="shrink-0 text-primary sm:size-3.5" />
          <span className="truncate text-[13px] font-semibold sm:text-sm">{cl.title}</span>
        </div>
        {!loading && entries.length > 0 && (
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground sm:px-2 sm:text-[11px]">
            {entries.length}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground sm:size-8"
          onClick={() => { setShowSearch(v => !v); if (showSearch) setSearch(''); }}
        >
          {showSearch ? <XIcon size={13} /> : <SearchIcon size={13} />}
        </Button>
      </header>

      {/* ── Search ── */}
      {showSearch && (
        <div className="shrink-0 border-b border-border px-2 py-1.5 sm:px-4 sm:py-2">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground sm:size-3.5" />
            <Input
              autoFocus
              placeholder={cl.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 pl-7 text-xs sm:h-8 sm:pl-8 sm:text-sm"
            />
          </div>
        </div>
      )}

      {/* ── Filter pills ── */}
      {!loading && entries.length > 0 && (
        <div className="shrink-0 border-b border-border">
          <div className="flex gap-1 overflow-x-auto px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-4 sm:py-2">
            {FILTER_KEYS.map((type) => {
              const count = counts[type] ?? 0;
              if (type !== 'all' && count === 0) return null;
              const active = filter === type;
              return (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={cn(
                    'flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs',
                    active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {filterLabel(type)}
                  <span className={cn(
                    'rounded-full px-1 py-px text-[9px] tabular-nums sm:px-1.5 sm:text-[10px]',
                    active ? 'bg-white/20 text-white' : 'bg-muted-foreground/15 text-muted-foreground',
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading ? (
        <div className="p-3 sm:p-5">
          <div className="mx-auto w-full max-w-5xl">
            <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-border/50 bg-card border-l-4 border-l-muted">
                  <div className="h-20 animate-pulse bg-muted sm:h-24" />
                  <div className="space-y-2 p-3 sm:space-y-2.5 sm:p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-14 animate-pulse rounded-full bg-muted sm:h-5 sm:w-16" />
                      <div className="h-4 w-10 animate-pulse rounded-md bg-muted sm:h-5 sm:w-12" />
                      <div className="ml-auto h-3 w-16 animate-pulse rounded bg-muted sm:w-20" />
                    </div>
                    <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted sm:h-4" />
                    <div className="space-y-1.5">
                      <div className="h-2.5 w-full animate-pulse rounded bg-muted sm:h-3" />
                      <div className="h-2.5 w-4/5 animate-pulse rounded bg-muted sm:h-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      ) : filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center sm:gap-4 sm:p-8">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted sm:size-16">
            <SparklesIcon size={22} className="text-muted-foreground/40 sm:size-6" />
          </div>
          <div>
            <p className="text-xs font-semibold sm:text-sm">
              {search || filter !== 'all' ? cl.noResultsShort : cl.noChangelogsShort}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
              {search || filter !== 'all' ? cl.noResultsHint : cl.comingSoonShort}
            </p>
          </div>
          {(search || filter !== 'all') && (
            <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={() => { setSearch(''); setFilter('all'); }}>
              {cl.clearFilters}
            </Button>
          )}
        </div>

      ) : (
        <div className="p-3 sm:p-5">
          <div className="mx-auto w-full max-w-5xl">
            <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
              {filtered.map((entry, idx) => {
                const cfg = TYPE_CFG[entry.type] ?? TYPE_CFG.feature;
                const Icon = cfg.icon;
                const isFirst = idx === 0 && filter === 'all' && !search;

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'overflow-hidden rounded-2xl border border-border/50 bg-card border-l-4 transition-shadow hover:shadow-md',
                      cfg.accent,
                    )}
                  >
                    {entry.banner_url && (
                      <img
                        src={resolveMediaUrl(entry.banner_url) ?? entry.banner_url}
                        alt=""
                        className="w-full max-h-36 object-cover sm:max-h-48 lg:max-h-40"
                      />
                    )}

                    <div className="px-3 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-3">
                      <div className="mb-2 flex flex-wrap items-center gap-1 sm:mb-2 sm:gap-1.5">
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none sm:text-[11px]', cfg.badge)}>
                          <Icon size={9} className="sm:size-2.5" />
                          {typeLabel(entry.type)}
                        </span>
                        {entry.version && (
                          <span className="rounded-md border border-border/60 px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground sm:px-2 sm:text-[11px]">
                            v{entry.version}
                          </span>
                        )}
                        {isFirst && (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold leading-none text-primary-foreground sm:text-[10px]">
                            {cl.latestVersion}
                          </span>
                        )}
                        <time
                          dateTime={entry.created_at}
                          className="ml-auto shrink-0 text-[10px] tabular-nums text-muted-foreground sm:text-[11px]"
                        >
                          {new Date(entry.created_at).toLocaleDateString(locale, {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </time>
                      </div>
                      <h2 className="text-[13px] font-semibold leading-snug text-foreground sm:text-sm">{entry.title}</h2>
                    </div>

                    <div className="px-3 pb-3 text-[12px] text-muted-foreground wrap-anywhere sm:px-4 sm:pb-4 sm:text-sm">
                      <MarkdownRenderer content={entry.content} />
                    </div>

                    {entry.author_username && (
                      <div className="border-t border-border/30 px-3 py-2 sm:px-4 sm:py-2.5">
                        <p className="text-[10px] text-muted-foreground/60 sm:text-[11px]">
                          {cl.publishedBy}{' '}
                          <span className="font-medium text-muted-foreground">@{entry.author_username}</span>
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
