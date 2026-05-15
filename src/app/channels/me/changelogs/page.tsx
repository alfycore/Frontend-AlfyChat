'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api, resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import { SparklesIcon, ZapIcon, ShieldIcon, FlameIcon, MenuIcon, ArrowLeftIcon, SearchIcon, XIcon } from '@/components/icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { useTranslation } from '@/components/locale-provider';
import { MarkdownRenderer } from '@/components/chat/markdown-renderer';

interface Changelog {
  id: string;
  version: string;
  title: string;
  content: string;
  type: 'feature' | 'fix' | 'improvement' | 'security' | 'breaking';
  banner_url?: string | null;
  author_username?: string | null;
  created_at: string;
}

type FilterType = 'all' | Changelog['type'];

const TYPE_CFG = {
  feature:     { dot: 'bg-blue-500',   glow: 'shadow-blue-500/40',   badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',        line: 'border-l-blue-500/50',    icon: SparklesIcon },
  improvement: { dot: 'bg-violet-500', glow: 'shadow-violet-500/40', badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',  line: 'border-l-violet-500/50',  icon: ZapIcon      },
  fix:         { dot: 'bg-orange-500', glow: 'shadow-orange-500/40', badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',  line: 'border-l-orange-500/50',  icon: FlameIcon    },
  security:    { dot: 'bg-red-500',    glow: 'shadow-red-500/40',    badge: 'bg-red-500/10 text-red-600 dark:text-red-400',           line: 'border-l-red-500/50',     icon: ShieldIcon   },
  breaking:    { dot: 'bg-rose-700',   glow: 'shadow-rose-700/40',   badge: 'bg-rose-700/10 text-rose-700 dark:text-rose-400',        line: 'border-l-rose-700/50',    icon: FlameIcon    },
} as const;

const FILTER_KEYS: FilterType[] = ['all', 'feature', 'improvement', 'fix', 'security', 'breaking'];

export default function ChangelogsPage() {
  const router = useRouter();
  const { isMobile, openSidebar } = useMobileNav();
  const { t, locale } = useTranslation();
  const cl = t.changelogs;

  const [changelogs, setChangelogs] = useState<Changelog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    api.getChangelogs(100, 0)
      .then((res) => {
        const raw = res.data;
        const list: Changelog[] = Array.isArray(raw)
          ? (raw as Changelog[])
          : Array.isArray((raw as any)?.changelogs)
          ? ((raw as any).changelogs as Changelog[])
          : Array.isArray((raw as any)?.data)
          ? ((raw as any).data as Changelog[])
          : [];
        setChangelogs(list);
      })
      .catch(() => setChangelogs([]))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: changelogs.length };
    for (const c of changelogs) m[c.type] = (m[c.type] ?? 0) + 1;
    return m;
  }, [changelogs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return changelogs.filter((c) => {
      if (filter !== 'all' && c.type !== filter) return false;
      if (q && !c.title.toLowerCase().includes(q) && !c.version.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [changelogs, search, filter]);

  const typeLabel = (type: Changelog['type']) =>
    type === 'feature' ? cl.typeNew
    : type === 'improvement' ? cl.typeImprovement
    : type === 'fix' ? cl.typeFix
    : type === 'security' ? cl.typeSecurity
    : cl.typeBreaking;

  const filterLabel = (type: FilterType) =>
    type === 'all' ? cl.filterAllShort
    : type === 'feature' ? cl.typeNew
    : type === 'improvement' ? cl.filterImprovement
    : type === 'fix' ? cl.typeFix
    : type === 'security' ? cl.typeSecurity
    : cl.typeBreakingShort;

  return (
    <div className="flex h-dvh flex-col bg-background">

      {/* Header */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
        {isMobile && (
          <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" onClick={openSidebar}>
            <MenuIcon size={16} />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" onClick={() => router.back()}>
          <ArrowLeftIcon size={15} />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SparklesIcon size={14} className="shrink-0 text-primary" />
          <span className="truncate text-sm font-semibold">{cl.title}</span>
        </div>
        {!loading && changelogs.length > 0 && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
            {changelogs.length}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground"
          onClick={() => { setShowSearch(v => !v); if (showSearch) setSearch(''); }}
        >
          {showSearch ? <XIcon size={14} /> : <SearchIcon size={14} />}
        </Button>
      </header>

      {/* Search bar */}
      {showSearch && (
        <div className="shrink-0 border-b border-border px-3 py-2">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder={cl.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>
      )}

      {/* Filter pills */}
      {!loading && changelogs.length > 0 && (
        <div className="shrink-0 border-b border-border">
          <div className="flex gap-1 overflow-x-auto px-3 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTER_KEYS.map((type) => {
              const count = counts[type] ?? 0;
              if (type !== 'all' && count === 0) return null;
              const active = filter === type;
              return (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {filterLabel(type)}
                  <span className={cn(
                    'rounded-full px-1.5 py-px text-[10px] tabular-nums',
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

      {/* Loading skeletons — timeline style */}
      {loading ? (
        <div className="p-6">
          <div className="relative pl-8">
            <div className="absolute left-2.75 top-0 h-full w-px bg-border/40" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="relative mb-8">
                <div className="absolute -left-5 top-2.5 size-4 rounded-full bg-muted ring-4 ring-background" />
                <div className="overflow-hidden rounded-2xl border border-border/50 bg-card p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                    <div className="h-5 w-12 animate-pulse rounded-md bg-muted" />
                    <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="mb-3 h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="space-y-2">
                    <div className="h-3 w-full animate-pulse rounded bg-muted" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      ) : filtered.length === 0 ? (
        /* Empty state */
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted">
            <SparklesIcon size={24} className="text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              {search || filter !== 'all' ? cl.noResultsShort : cl.noChangelogsShort}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {search || filter !== 'all' ? cl.noResultsHint : cl.comingSoonShort}
            </p>
          </div>
          {(search || filter !== 'all') && (
            <Button variant="outline" size="sm" onClick={() => { setSearch(''); setFilter('all'); }}>
              {cl.clearFilters}
            </Button>
          )}
        </div>

      ) : (
        /* Timeline */
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-6">
            <div className="relative pl-8">
              {/* Vertical connecting line */}
              <div className="absolute left-2.75 top-2 bottom-2 w-px bg-border/40" />

              {filtered.map((log, idx) => {
                const cfg = TYPE_CFG[log.type] ?? TYPE_CFG.feature;
                const Icon = cfg.icon;
                const isFirst = idx === 0 && filter === 'all' && !search;

                return (
                  <div key={log.id} className="relative mb-5 last:mb-0">
                    {/* Timeline dot */}
                    <div className={cn(
                      'absolute -left-5 top-3 size-4 rounded-full ring-4 ring-background shadow-md',
                      cfg.dot,
                      cfg.glow,
                    )} />

                    {/* Card */}
                    <div className={cn(
                      'overflow-hidden rounded-2xl border border-border/50 bg-card border-l-2 transition-shadow hover:shadow-md',
                      cfg.line,
                    )}>
                      {/* Card header */}
                      <div className="px-4 pt-4 pb-3">
                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none', cfg.badge)}>
                            <Icon size={10} />
                            {typeLabel(log.type)}
                          </span>
                          <span className="rounded-md border border-border/60 px-2 py-0.5 font-mono text-[11px] leading-none text-muted-foreground">
                            v{log.version}
                          </span>
                          {isFirst && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
                              {cl.latestVersion}
                            </span>
                          )}
                          <time
                            dateTime={log.created_at}
                            className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground"
                          >
                            {new Date(log.created_at).toLocaleDateString(locale, {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })}
                          </time>
                        </div>
                        <h2 className="text-sm font-semibold leading-snug text-foreground">
                          {log.title}
                        </h2>
                      </div>

                      {/* Banner */}
                      {log.banner_url && (
                        <div className="mx-4 mb-3 overflow-hidden rounded-xl">
                          <img
                            src={resolveMediaUrl(log.banner_url) ?? log.banner_url}
                            alt=""
                            className="max-h-44 w-full object-cover"
                          />
                        </div>
                      )}

                      {/* Content */}
                      <div className="px-4 pb-4 text-sm text-muted-foreground">
                        <MarkdownRenderer content={log.content} />
                      </div>

                      {/* Author */}
                      {log.author_username && (
                        <div className="border-t border-border/30 px-4 py-2.5">
                          <p className="text-[11px] text-muted-foreground/60">
                            {cl.publishedBy}{' '}
                            <span className="font-medium text-muted-foreground">@{log.author_username}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
