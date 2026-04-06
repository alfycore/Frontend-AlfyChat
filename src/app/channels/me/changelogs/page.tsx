'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SparklesIcon, ZapIcon, ShieldIcon, FlameIcon, MenuIcon, ArrowLeftIcon } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useMobileNav } from '@/hooks/use-mobile-nav';
// redesigned — DM message row style

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

const TYPE: Record<string, { label: string; iconBg: string; iconColor: string; nameColor: string; icon: React.ElementType }> = {
  feature:     { label: 'Nouveaut\u00e9',        iconBg: 'bg-blue-500/15',   iconColor: 'text-blue-400',   nameColor: 'text-blue-400',   icon: SparklesIcon },
  improvement: { label: 'Am\u00e9lioration',     iconBg: 'bg-violet-500/15', iconColor: 'text-violet-400', nameColor: 'text-violet-400', icon: ZapIcon },
  fix:         { label: 'Correctif',              iconBg: 'bg-orange-500/15', iconColor: 'text-orange-400', nameColor: 'text-orange-400', icon: FlameIcon },
  security:    { label: 'S\u00e9curit\u00e9',    iconBg: 'bg-red-500/15',    iconColor: 'text-red-400',    nameColor: 'text-red-400',    icon: ShieldIcon },
  breaking:    { label: 'Changement majeur',      iconBg: 'bg-red-700/15',    iconColor: 'text-red-400',    nameColor: 'text-red-400',    icon: FlameIcon },
};

export default function ChangelogsPage() {
  const router = useRouter();
  const { isMobile, openSidebar } = useMobileNav();

  const [changelogs, setChangelogs] = useState<Changelog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getChangelogs(100, 0)
      .then((res) => setChangelogs((res.data ?? []) as Changelog[]))
      .catch(() => setChangelogs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-background">

      {/* Header ─ identique discover-server */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-3">
        {isMobile && (
          <Button
            variant="ghost" size="icon"
            className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={openSidebar}
          >
            <MenuIcon size={16} />
          </Button>
        )}
        <Button
          variant="ghost" size="icon"
          className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => router.back()}
        >
          <ArrowLeftIcon size={15} />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SparklesIcon size={14} className="shrink-0 text-muted-foreground" />
          <span className="truncate text-[13px] font-semibold">Changelogs</span>
        </div>
        {!loading && changelogs.length > 0 && (
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {changelogs.length} mises à jour
          </span>
        )}
      </header>

      {/* ── Loading ── */}
      {loading ? (
        <div className="space-y-px px-2 py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 rounded-xl px-3 py-2.5">
              <Skeleton className="mt-0.5 size-8 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="ml-auto h-3 w-16" />
                </div>
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          ))}
        </div>

      ) : changelogs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <SparklesIcon size={20} className="text-muted-foreground/40" />
          </div>
          <p className="mt-3 text-[13px] font-semibold">Aucun changelog</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/60">
            Revenez bientôt pour les mises à jour.
          </p>
        </div>

      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-2 py-2">
            {changelogs.map((log, idx) => {
              const cfg = TYPE[log.type] ?? {
                label: log.type,
                iconBg: 'bg-muted',
                iconColor: 'text-muted-foreground',
                nameColor: 'text-muted-foreground',
                icon: SparklesIcon,
              };
              const Icon = cfg.icon;

              return (
                <div
                  key={log.id}
                  className="group relative rounded-xl px-3 py-2.5 transition-colors duration-100 hover:bg-(--surface-secondary)/20"
                >
                  <div className="flex items-start gap-3">

                    {/* Icône type ─ remplace l'avatar DM */}
                    <div className={cn(
                      'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl',
                      cfg.iconBg, cfg.iconColor,
                    )}>
                      <Icon size={14} />
                    </div>

                    <div className="min-w-0 flex-1">

                      {/* Ligne 1 : type · version · badge latest · date  (= nom + horodatage DM) */}
                      <div className="mb-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span className={cn('text-[13px] font-semibold', cfg.nameColor)}>
                          {cfg.label}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-muted-foreground/60">
                          v{log.version}
                        </span>
                        {idx === 0 && (
                          <span className="rounded-md bg-(--accent)/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                            Dernière version
                          </span>
                        )}
                        <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground/50">
                          {new Date(log.created_at).toLocaleDateString('fr-FR', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </span>
                      </div>

                      {/* Titre  (= corps de message DM) */}
                      <p className="mb-1.5 text-[13px] font-bold leading-snug text-foreground">
                        {log.title}
                      </p>

                      {/* Bannière optionnelle */}
                      {log.banner_url && (
                        <div className="mb-2 overflow-hidden rounded-xl">
                          <img
                            src={log.banner_url}
                            alt=""
                            className="max-h-28 w-full object-cover"
                          />
                        </div>
                      )}

                      {/* Contenu markdown ─ même typo que le corps des messages */}
                      <div className={cn(
                        'prose prose-sm max-w-none text-muted-foreground/80',
                        '[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2',
                        '[&_blockquote]:border-l-2 [&_blockquote]:border-(--accent)/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground/70',
                        '[&_code]:rounded-md [&_code]:bg-surface-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px] [&_code]:text-foreground',
                        '[&_h1]:text-[13px] [&_h1]:font-bold [&_h1]:text-foreground',
                        '[&_h2]:text-[13px] [&_h2]:font-bold [&_h2]:text-foreground',
                        '[&_h3]:text-[12px] [&_h3]:font-bold [&_h3]:text-foreground',
                        '[&_hr]:border-(--border)/30',
                        '[&_li]:text-[13px] [&_li]:leading-relaxed',
                        '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-0.5',
                        '[&_p]:text-[13px] [&_p]:leading-relaxed',
                        '[&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-(--border)/30 [&_pre]:bg-surface-secondary [&_pre]:p-3',
                        '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
                        '[&_strong]:font-semibold [&_strong]:text-foreground',
                        '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-0.5',
                      )}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {log.content}
                        </ReactMarkdown>
                      </div>

                      {/* Auteur */}
                      {log.author_username && (
                        <p className="mt-1.5 text-[11px] text-muted-foreground/50">
                          par{' '}
                          <span className="text-muted-foreground/70">
                            @{log.author_username}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Séparateur léger entre entrées ─ comme dans la liste DM */}
                  {idx < changelogs.length - 1 && (
                    <div className="absolute bottom-0 left-14 right-3 h-px bg-(--border)/15" />
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
