'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SparklesIcon, ZapIcon, ShieldIcon, FlameIcon, MenuIcon, ArrowLeftIcon, SearchIcon, XIcon } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { useMobileNav } from '@/hooks/use-mobile-nav';

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

const TYPE_CONFIG: Record<string, { label: string; iconBg: string; iconColor: string; icon: React.ElementType }> = {
  feature:     { label: 'Nouveauté',        iconBg: 'bg-blue-500/10',   iconColor: 'text-blue-500',   icon: SparklesIcon },
  improvement: { label: 'Amélioration',     iconBg: 'bg-violet-500/10', iconColor: 'text-violet-500', icon: ZapIcon },
  fix:         { label: 'Correctif',         iconBg: 'bg-orange-500/10', iconColor: 'text-orange-500', icon: FlameIcon },
  security:    { label: 'Sécurité',          iconBg: 'bg-red-500/10',    iconColor: 'text-red-500',    icon: ShieldIcon },
  breaking:    { label: 'Changement majeur', iconBg: 'bg-red-700/10',    iconColor: 'text-red-600',    icon: FlameIcon },
};

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all',         label: 'Tout' },
  { value: 'feature',     label: 'Nouveauté' },
  { value: 'improvement', label: 'Amélioration' },
  { value: 'fix',         label: 'Correctif' },
  { value: 'security',    label: 'Sécurité' },
  { value: 'breaking',    label: 'Majeur' },
];

export default function ChangelogsPage() {
  const router = useRouter();
  const { isMobile, openSidebar } = useMobileNav();

  const [changelogs, setChangelogs] = useState<Changelog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    api
      .getChangelogs(100, 0)
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return changelogs.filter((cl) => {
      const matchType = typeFilter === 'all' || cl.type === typeFilter;
      const matchSearch = !q || cl.title.toLowerCase().includes(q) || cl.version.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [changelogs, search, typeFilter]);

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
          <SparklesIcon size={14} className="shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-semibold">Changelogs</span>
        </div>
        {!loading && changelogs.length > 0 && (
          <Badge variant="secondary" className="shrink-0 text-[11px]">
            {changelogs.length}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground"
          onClick={() => { setShowSearch((v) => !v); if (showSearch) setSearch(''); }}
        >
          {showSearch ? <XIcon size={14} /> : <SearchIcon size={14} />}
        </Button>
      </header>

      {/* Search bar */}
      {showSearch && (
        <div className="shrink-0 border-b border-border bg-background px-3 py-2">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {!loading && changelogs.length > 0 && (
        <div className="shrink-0 border-b border-border bg-background">
          <div className="flex gap-1 overflow-x-auto px-3 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={cn(
                  'shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  typeFilter === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 shrink-0 rounded-md" />
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="ml-auto h-4 w-24" />
                  </div>
                </div>
                <Skeleton className="mt-1 h-4 w-3/5" />
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-5/6" />
                <Skeleton className="h-3.5 w-4/6" />
              </CardContent>
            </Card>
          ))}
        </div>

      ) : filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <SparklesIcon size={22} className="text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              {search || typeFilter !== 'all' ? 'Aucun résultat' : 'Aucun changelog'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {search || typeFilter !== 'all'
                ? "Essayez avec d'autres filtres."
                : 'Revenez bientôt pour les mises à jour.'}
            </p>
          </div>
          {(search || typeFilter !== 'all') && (
            <Button variant="outline" size="sm" onClick={() => { setSearch(''); setTypeFilter('all'); }}>
              Effacer les filtres
            </Button>
          )}
        </div>

      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 p-4">
            {filtered.map((log, idx) => {
              const cfg = TYPE_CONFIG[log.type] ?? {
                label: log.type,
                iconBg: 'bg-muted',
                iconColor: 'text-muted-foreground',
                icon: SparklesIcon,
              };
              const Icon = cfg.icon;

              return (
                <Card key={log.id} className="overflow-hidden transition-shadow duration-150 hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-md', cfg.iconBg, cfg.iconColor)}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary" className={cn('text-xs', cfg.iconColor)}>
                            {cfg.label}
                          </Badge>
                          <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                            v{log.version}
                          </Badge>
                          {idx === 0 && typeFilter === 'all' && !search && (
                            <Badge>Dernière version</Badge>
                          )}
                          <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                            {new Date(log.created_at).toLocaleDateString('fr-FR', {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm font-semibold leading-snug text-foreground">
                          {log.title}
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {log.banner_url && (
                      <div className="mb-3 overflow-hidden rounded-md">
                        <img src={log.banner_url} alt="" className="max-h-36 w-full object-cover" />
                      </div>
                    )}

                    <div className={cn(
                      'prose prose-sm max-w-none text-muted-foreground',
                      '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
                      '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic',
                      '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-foreground',
                      '[&_h1]:text-sm [&_h1]:font-bold [&_h1]:text-foreground',
                      '[&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-foreground',
                      '[&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-foreground',
                      '[&_hr]:border-border',
                      '[&_li]:text-xs [&_li]:leading-relaxed',
                      '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1',
                      '[&_p]:text-xs [&_p]:leading-relaxed',
                      '[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted [&_pre]:p-3',
                      '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
                      '[&_strong]:font-semibold [&_strong]:text-foreground',
                      '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1',
                    )}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {log.content}
                      </ReactMarkdown>
                    </div>

                    {log.author_username && (
                      <>
                        <Separator className="my-3" />
                        <p className="text-xs text-muted-foreground">
                          par{' '}
                          <span className="font-medium text-foreground">@{log.author_username}</span>
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

