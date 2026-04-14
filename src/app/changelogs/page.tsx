'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { SparklesIcon, ZapIcon, ShieldIcon, FlameIcon, ArrowLeftIcon, SearchIcon, XIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

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

const TYPE_CONFIG: Record<string, { label: string; iconBg: string; iconColor: string; dot: string; icon: React.ElementType }> = {
  feature:     { label: 'Nouveauté',        iconBg: 'bg-blue-500/10',   iconColor: 'text-blue-500',   dot: 'bg-blue-500',   icon: SparklesIcon },
  improvement: { label: 'Amélioration',     iconBg: 'bg-violet-500/10', iconColor: 'text-violet-500', dot: 'bg-violet-500', icon: ZapIcon },
  fix:         { label: 'Correctif',         iconBg: 'bg-orange-500/10', iconColor: 'text-orange-500', dot: 'bg-orange-500', icon: FlameIcon },
  security:    { label: 'Sécurité',          iconBg: 'bg-red-500/10',    iconColor: 'text-red-500',    dot: 'bg-red-500',    icon: ShieldIcon },
  breaking:    { label: 'Changement majeur', iconBg: 'bg-red-700/10',    iconColor: 'text-red-600',    dot: 'bg-red-700',    icon: FlameIcon },
};

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all',         label: 'Toutes les mises à jour' },
  { value: 'feature',     label: 'Nouveautés' },
  { value: 'improvement', label: 'Améliorations' },
  { value: 'fix',         label: 'Correctifs' },
  { value: 'security',    label: 'Sécurité' },
  { value: 'breaking',    label: 'Changements majeurs' },
];

const PROSE = cn(
  'prose prose-sm max-w-none text-muted-foreground',
  '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
  '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic',
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm [&_code]:text-foreground',
  '[&_h1]:text-base [&_h1]:font-bold [&_h1]:text-foreground',
  '[&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground',
  '[&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-foreground',
  '[&_li]:text-sm [&_li]:leading-relaxed',
  '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1',
  '[&_p]:text-sm [&_p]:leading-relaxed',
  '[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted [&_pre]:p-4',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_strong]:font-semibold [&_strong]:text-foreground',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1',
);

export default function ChangelogsPublicPage() {
  const router = useRouter();
  const [changelogs, setChangelogs] = useState<Changelog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');

  useEffect(() => {
    api
      .getChangelogs(100, 0)
      .then((res) => setChangelogs(res.data ?? []))
      .catch(() => setChangelogs([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return changelogs.filter((cl) => {
      const matchType = typeFilter === 'all' || cl.type === typeFilter;
      const matchSearch = !q || cl.title.toLowerCase().includes(q) || cl.content.toLowerCase().includes(q) || cl.version.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [changelogs, search, typeFilter]);

  // Group by year/month for blog-style timeline
  const grouped = useMemo(() => {
    const map = new Map<string, Changelog[]>();
    for (const cl of filtered) {
      const d = new Date(cl.created_at);
      const key = d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(cl);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">

        {/* Back */}
        <Button variant="ghost" size="sm" className="mb-6 -ml-1 h-8 gap-1.5 text-xs text-muted-foreground" onClick={() => router.back()}>
          <ArrowLeftIcon size={13} />
          Retour
        </Button>

        {/* Hero */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <SparklesIcon size={15} className="text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Changelogs</h1>
            {!loading && changelogs.length > 0 && (
              <Badge variant="secondary" className="ml-1">{changelogs.length} entrées</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Suivez toutes les nouveautés, corrections et améliorations d&apos;AlfyChat.
          </p>
        </div>

        {/* Search + filters */}
        <div className="mb-8 space-y-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher une mise à jour…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <XIcon size={14} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  typeFilter === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-5 w-32" />
                <div className="space-y-4 pl-6 border-l border-border">
                  <Card>
                    <CardContent className="pt-5 space-y-3">
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-24 rounded-full" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <SparklesIcon size={24} className="text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-semibold">Aucune mise à jour trouvée</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {search || typeFilter !== 'all' ? 'Essayez avec d\'autres filtres.' : 'Revenez bientôt.'}
              </p>
            </div>
            {(search || typeFilter !== 'all') && (
              <Button variant="outline" size="sm" onClick={() => { setSearch(''); setTypeFilter('all'); }}>
                Effacer les filtres
              </Button>
            )}
          </div>
        ) : (
          /* Timeline grouped by month */
          <div className="space-y-10">
            {grouped.map(([month, entries]) => (
              <section key={month}>
                {/* Month heading */}
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="text-sm font-semibold capitalize text-muted-foreground">{month}</h2>
                  <div className="flex-1 border-t border-border" />
                  <span className="shrink-0 text-xs text-muted-foreground">{entries.length}</span>
                </div>

                {/* Entries */}
                <div className="space-y-4 border-l-2 border-border pl-6">
                  {entries.map((log, idx) => {
                    const cfg = TYPE_CONFIG[log.type] ?? {
                      label: log.type, iconBg: 'bg-muted', iconColor: 'text-muted-foreground',
                      dot: 'bg-muted-foreground', icon: SparklesIcon,
                    };
                    const Icon = cfg.icon;
                    const isFirst = idx === 0 && changelogs[0]?.id === log.id && typeFilter === 'all' && !search;

                    return (
                      <div key={log.id} className="relative">
                        {/* Timeline dot */}
                        <div className={cn(
                          'absolute -left-[2.1rem] top-4 size-3 rounded-full border-2 border-background ring-2',
                          cfg.dot, 'ring-border',
                        )} />

                        <Card className="overflow-hidden transition-shadow hover:shadow-md">
                          <CardContent className="pt-5">
                            {/* Top row */}
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <div className={cn('flex size-7 shrink-0 items-center justify-center rounded-md', cfg.iconBg, cfg.iconColor)}>
                                <Icon size={13} />
                              </div>
                              <Badge variant="secondary" className={cn('text-xs', cfg.iconColor)}>
                                {cfg.label}
                              </Badge>
                              <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                                v{log.version}
                              </Badge>
                              {isFirst && <Badge>Dernière version</Badge>}
                              <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                                {new Date(log.created_at).toLocaleDateString('fr-FR', {
                                  day: 'numeric', month: 'short', year: 'numeric',
                                })}
                              </span>
                            </div>

                            {/* Title */}
                            <h3 className="mb-3 text-base font-bold leading-snug text-foreground">
                              {log.title}
                            </h3>

                            {/* Banner */}
                            {log.banner_url && (
                              <div className="mb-4 overflow-hidden rounded-md">
                                <img src={log.banner_url} alt="" className="max-h-48 w-full object-cover" />
                              </div>
                            )}

                            {/* Content */}
                            <div className={PROSE}>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {log.content}
                              </ReactMarkdown>
                            </div>

                            {/* Author */}
                            {log.author_username && (
                              <>
                                <Separator className="mt-4 mb-3" />
                                <p className="text-xs text-muted-foreground">
                                  Publié par{' '}
                                  <span className="font-medium text-foreground">@{log.author_username}</span>
                                </p>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

