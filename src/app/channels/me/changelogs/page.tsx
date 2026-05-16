'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api, resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  SparklesIcon, ZapIcon, ShieldIcon, FlameIcon, MegaphoneIcon,
  ArrowLeftIcon, SearchIcon, XIcon, MenuIcon,
} from '@/components/icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useTranslation } from '@/components/locale-provider';
import { MarkdownRenderer } from '@/components/chat/markdown-renderer';

/* ── Types ──────────────────────────────────────────────────────────────────── */

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

/* ── Config ─────────────────────────────────────────────────────────────────── */

const TYPE_CFG = {
  news:        { badge: 'bg-teal-500/15 text-teal-500',     accent: 'border-l-teal-500',   flatHover: 'hover:border-teal-500/20',   icon: MegaphoneIcon },
  feature:     { badge: 'bg-blue-500/15 text-blue-500',     accent: 'border-l-blue-500',   flatHover: 'hover:border-blue-500/20',   icon: SparklesIcon  },
  improvement: { badge: 'bg-violet-500/15 text-violet-500', accent: 'border-l-violet-500', flatHover: 'hover:border-violet-500/20', icon: ZapIcon       },
  fix:         { badge: 'bg-orange-500/15 text-orange-500', accent: 'border-l-orange-500', flatHover: 'hover:border-orange-500/20', icon: FlameIcon     },
  security:    { badge: 'bg-red-500/15 text-red-500',       accent: 'border-l-red-500',    flatHover: 'hover:border-red-500/20',    icon: ShieldIcon    },
  breaking:    { badge: 'bg-rose-600/15 text-rose-500',     accent: 'border-l-rose-600',   flatHover: 'hover:border-rose-600/20',   icon: FlameIcon     },
} as const;

const FILTER_KEYS: FilterType[] = ['all', 'news', 'feature', 'improvement', 'fix', 'security', 'breaking'];

/* ── Component ──────────────────────────────────────────────────────────────── */

export default function ChangelogsPage() {
  const router = useRouter();
  const { isMobile, toggleSidebar } = useMobileNav();
  const ui = useUIStyle();
  const { t, locale } = useTranslation();
  const cl = t.changelogs;

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
    <div className={`flex h-full min-h-0 flex-col ${ui.contentBg}`}>

      {/* ── Header ── */}
      <div className={`flex h-12 shrink-0 items-center gap-2 px-2 sm:h-14 sm:gap-2.5 sm:px-3 ${ui.header}`}>
        {isMobile && (
          <Button size="icon-sm" variant="ghost" className="size-7 shrink-0 rounded-xl text-muted-foreground sm:size-8" onClick={toggleSidebar}>
            <MenuIcon size={15} />
          </Button>
        )}
        <Button size="icon-sm" variant="ghost" className="size-7 shrink-0 rounded-xl text-muted-foreground sm:size-8" onClick={() => router.back()}>
          <ArrowLeftIcon size={14} />
        </Button>
        <div className="flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-primary/10 sm:size-7 sm:rounded-[8px]">
          <SparklesIcon size={11} className="text-primary sm:size-3.25" />
        </div>
        <h1 className="flex-1 truncate text-[13px] font-semibold text-foreground sm:text-[14px]">{cl.title}</h1>
        {!loading && entries.length > 0 && (
          <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground sm:px-2 sm:text-[11px]', ui.chip)}>
            {entries.length}
          </span>
        )}
        <Button
          size="icon-sm"
          variant="ghost"
          className="size-7 shrink-0 rounded-xl text-muted-foreground sm:size-8"
          onClick={() => { setShowSearch(v => !v); if (showSearch) setSearch(''); }}
        >
          {showSearch ? <XIcon size={13} /> : <SearchIcon size={13} />}
        </Button>
      </div>

      {/* ── Search ── */}
      {showSearch && (
        <div className={cn(
          'shrink-0 px-2 py-1.5 sm:px-3 sm:py-2',
          ui.isGlass
            ? 'border-b border-white/8 dark:border-white/6'
            : 'border-b border-border/50',
        )}>
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground sm:size-3.5" />
            <Input
              autoFocus
              placeholder={cl.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 pl-7 text-xs rounded-xl sm:h-8 sm:pl-8 sm:text-sm"
            />
          </div>
        </div>
      )}

      {/* ── Filter pills ── */}
      {!loading && entries.length > 0 && (
        <div className={cn(
          'shrink-0',
          ui.isGlass
            ? 'border-b border-white/8 dark:border-white/6'
            : 'border-b border-border/50',
        )}>
          <div className="flex gap-1 overflow-x-auto px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-3 sm:py-2">
            {FILTER_KEYS.map((type) => {
              const count = counts[type] ?? 0;
              if (type !== 'all' && count === 0) return null;
              const active = filter === type;
              return (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={cn(
                    'flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all duration-150 sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : ui.isGlass
                      ? 'text-muted-foreground hover:bg-white/10 dark:hover:bg-white/8'
                      : 'text-muted-foreground hover:bg-foreground/6 hover:text-foreground',
                  )}
                >
                  {filterLabel(type)}
                  <span className={cn(
                    'rounded-full px-1 py-px text-[9px] tabular-nums sm:px-1.5 sm:text-[10px]',
                    active ? 'bg-white/20 text-white' : 'bg-foreground/6 text-muted-foreground',
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
                <div
                  key={i}
                  className={cn(
                    'overflow-hidden rounded-2xl border-l-4 border-l-muted',
                    ui.isGlass
                      ? 'bg-white/5 ring-1 ring-inset ring-white/10'
                      : 'border border-border/40 bg-card/60',
                  )}
                >
                  <div className="h-20 animate-pulse bg-foreground/6 sm:h-24" />
                  <div className="space-y-2 p-3 sm:space-y-2.5 sm:p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-14 animate-pulse rounded-full bg-foreground/10 sm:h-5 sm:w-16" />
                      <div className="h-4 w-10 animate-pulse rounded-lg bg-foreground/10 sm:h-5 sm:w-12" />
                      <div className="ml-auto h-3 w-16 animate-pulse rounded bg-foreground/10 sm:w-20" />
                    </div>
                    <div className="h-3.5 w-2/3 animate-pulse rounded bg-foreground/10 sm:h-4" />
                    <div className="space-y-1.5">
                      <div className="h-2.5 w-full animate-pulse rounded bg-foreground/10 sm:h-3" />
                      <div className="h-2.5 w-4/5 animate-pulse rounded bg-foreground/10 sm:h-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      ) : filtered.length === 0 ? (
        /* ── Empty ── */
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center sm:gap-4 sm:p-8">
          <div className={cn(
            'flex size-14 items-center justify-center rounded-[18px] sm:size-18 sm:rounded-[22px]',
            ui.isGlass
              ? 'bg-primary/10 backdrop-blur-xl ring-1 ring-inset ring-primary/20'
              : 'bg-primary/10',
          )}>
            <SparklesIcon size={22} className="text-primary/50 sm:size-7" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground sm:text-[13px]">
              {search || filter !== 'all' ? cl.noResultsShort : cl.noChangelogsShort}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground sm:text-[12px]">
              {search || filter !== 'all' ? cl.noResultsHint : cl.comingSoonShort}
            </p>
          </div>
          {(search || filter !== 'all') && (
            <Button variant="outline" size="sm" className="rounded-xl text-xs sm:text-sm" onClick={() => { setSearch(''); setFilter('all'); }}>
              {cl.clearFilters}
            </Button>
          )}
        </div>

      ) : (
        /* ── Feed ── */
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-3 sm:p-5">
            <div className="mx-auto w-full max-w-5xl">
              <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
                {filtered.map((entry, idx) => {
                  const cfg = TYPE_CFG[entry.type] ?? TYPE_CFG.feature;
                  const Icon = cfg.icon;
                  const isFirst = idx === 0 && filter === 'all' && !search;

                  return (
                    <article
                      key={entry.id}
                      className={cn(
                        'overflow-hidden rounded-2xl border-l-4 transition-all duration-200',
                        cfg.accent,
                        ui.isGlass
                          ? 'bg-white/7 backdrop-blur-xl ring-1 ring-inset ring-white/12 hover:bg-white/12 hover:ring-white/20 dark:bg-white/4 dark:hover:bg-white/8'
                          : cn('border-t border-r border-b border-border/40 bg-card/60 shadow-sm hover:bg-card hover:shadow-md', cfg.flatHover),
                      )}
                    >
                      {/* Banner */}
                      {entry.banner_url && (
                        <img
                          src={resolveMediaUrl(entry.banner_url) ?? entry.banner_url}
                          alt=""
                          className="w-full max-h-36 object-cover sm:max-h-48 lg:max-h-40"
                        />
                      )}

                      {/* Card header */}
                      <div className="px-3 pt-3 pb-2 sm:px-5 sm:pt-4 sm:pb-3">
                        <div className="mb-2 flex flex-wrap items-center gap-1 sm:mb-2.5 sm:gap-1.5">
                          <span className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none sm:px-2.5 sm:text-[11px]',
                            cfg.badge,
                          )}>
                            <Icon size={9} className="sm:size-2.5" />
                            {typeLabel(entry.type)}
                          </span>
                          {entry.version && (
                            <span className={cn(
                              'rounded-lg px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground sm:px-2 sm:text-[11px]',
                              ui.isGlass
                                ? 'bg-white/10 dark:bg-white/[0.07]'
                                : 'border border-border/60 bg-background/50',
                            )}>
                              v{entry.version}
                            </span>
                          )}
                          {isFirst && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold leading-none text-primary-foreground shadow-sm sm:px-2.5 sm:text-[10px]">
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
                        <h2 className="text-[13px] font-semibold leading-snug text-foreground sm:text-[14px]">{entry.title}</h2>
                      </div>

                      {/* Content */}
                      <div className="px-3 pb-3 text-[12px] text-muted-foreground leading-relaxed wrap-anywhere sm:px-5 sm:pb-4 sm:text-[13px]">
                        <MarkdownRenderer content={entry.content} />
                      </div>

                      {/* Author */}
                      {entry.author_username && (
                        <div className={cn(
                          'px-3 py-2 sm:px-5 sm:py-2.5',
                          ui.isGlass
                            ? 'border-t border-white/8 dark:border-white/6'
                            : 'border-t border-border/30',
                        )}>
                          <p className="text-[10px] text-muted-foreground/60 sm:text-[11px]">
                            {cl.publishedBy}{' '}
                            <span className="font-medium text-muted-foreground/80">@{entry.author_username}</span>
                          </p>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
