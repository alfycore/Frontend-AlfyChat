'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SparklesIcon, ZapIcon, ShieldIcon, FlameIcon } from '@/components/icons';
import { ScrollShadow, Skeleton } from '@heroui/react';

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

const typeConfig: Record<string, { label: string; color: string; badgeColor: string; dot: string; icon: any; iconColor: string }> = {
  feature:     { label: 'Nouveauté',        color: 'border-blue-500/25 bg-blue-500/15 text-blue-300',       badgeColor: 'bg-blue-500',    dot: 'bg-blue-400',    icon: SparklesIcon, iconColor: 'text-white' },
  improvement: { label: 'Amélioration',      color: 'border-violet-500/25 bg-violet-500/15 text-violet-300', badgeColor: 'bg-violet-500',  dot: 'bg-violet-400',  icon: ZapIcon,       iconColor: 'text-white' },
  fix:         { label: 'Correctif',         color: 'border-orange-500/25 bg-orange-500/15 text-orange-300', badgeColor: 'bg-orange-500',  dot: 'bg-orange-400',  icon: FlameIcon,     iconColor: 'text-white' },
  security:    { label: 'Sécurité',          color: 'border-red-500/25 bg-red-500/15 text-red-300',          badgeColor: 'bg-red-500',     dot: 'bg-red-400',     icon: ShieldIcon,    iconColor: 'text-white' },
  breaking:    { label: 'Changement majeur', color: 'border-red-700/25 bg-red-700/15 text-red-400',          badgeColor: 'bg-red-700',     dot: 'bg-red-600',     icon: FlameIcon,     iconColor: 'text-white' },
};

const TYPE_EMOJI: Record<string, string> = {
  feature: '✨', improvement: '⚡', fix: '🐛', security: '🔒', breaking: '💥',
};

export default function ChangelogsPage() {
  const [changelogs, setChangelogs] = useState<Changelog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getChangelogs(100, 0)
      .then((res) => setChangelogs((res.data ?? []) as Changelog[]))
      .catch(() => setChangelogs([]))
      .finally(() => setLoading(false));
  }, []);

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        {/* Header skeleton */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-white/5 px-6">
          <Skeleton className="size-9 rounded-2xl" animationType="shimmer" />
          <Skeleton className="h-4 w-28" animationType="shimmer" />
          <Skeleton className="ml-auto h-5 w-16 rounded-full" animationType="shimmer" />
        </div>
        <div className="mx-auto w-full max-w-2xl space-y-3 p-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="mb-3 flex gap-2">
                <Skeleton className="h-5 w-12 rounded-full" animationType="shimmer" />
                <Skeleton className="h-5 w-20 rounded-full" animationType="shimmer" />
              </div>
              <Skeleton className="mb-2 h-4 w-2/3 rounded-lg" animationType="shimmer" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-full rounded-lg" animationType="shimmer" />
                <Skeleton className="h-3 w-5/6 rounded-lg" animationType="shimmer" />
                <Skeleton className="h-3 w-3/4 rounded-lg" animationType="shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Main ──────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-white/5 px-4 md:px-6">
        <div className="flex size-9 items-center justify-center rounded-2xl bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/25">
          <SparklesIcon size={16} className="text-[var(--accent-foreground)]" />
        </div>
        <span className="text-[15px] font-bold tracking-tight text-[var(--foreground)]">Changelogs</span>
        {!loading && changelogs.length > 0 && (
          <span className="ml-auto rounded-full border border-white/15 bg-white/30 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--muted)] dark:border-white/10 dark:bg-white/8">
            {changelogs.length} mises à jour
          </span>
        )}
      </div>

      {changelogs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/20 bg-white/30 px-8 py-10 text-center dark:border-white/10 dark:bg-white/5">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--accent)]/15 via-transparent to-violet-500/10" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-32 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)]/20 " />
            <div className="relative flex flex-col items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--accent)] shadow-xl shadow-[var(--accent)]/30">
                <SparklesIcon size={26} className="text-[var(--accent-foreground)]" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-[var(--foreground)]">Aucun changelog</p>
                <p className="mt-1 text-[12px] text-[var(--muted)]">Revenez bientôt pour les mises à jour.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <ScrollShadow className="flex-1">
          {/* Stats strip */}
          <div className="flex flex-wrap gap-2 border-b border-white/10 bg-white/3 px-6 py-3 dark:bg-white/2">
            {Object.entries(typeConfig).map(([type, cfg]) => {
              const count = changelogs.filter((c) => c.type === type).length;
              if (count === 0) return null;
              return (
                <span
                  key={type}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                    cfg.color,
                  )}
                >
                  <span className={cn('size-1.5 rounded-full', cfg.dot)} />
                  {TYPE_EMOJI[type]} {cfg.label} · {count}
                </span>
              );
            })}
          </div>

          {/* Timeline */}
          <div className="relative mx-auto w-full max-w-2xl px-4 py-6 md:px-6">
            {/* Vertical line */}
            <div className="absolute left-[27px] top-6 bottom-6 w-px bg-gradient-to-b from-[var(--accent)]/40 via-white/10 to-transparent md:left-[35px]" />

            <div className="flex flex-col gap-4 pl-7 md:pl-9">
              {changelogs.map((log, idx) => {
                const cfg = typeConfig[log.type] ?? {
                  label: log.type,
                  color: 'border-white/20 bg-white/10 text-[var(--muted)]',
                  badgeColor: 'bg-white/20',
                  dot: 'bg-white/40',
                  icon: SparklesIcon,
                  iconColor: 'text-[var(--muted)]',
                };
                const Icon = cfg.icon;
                return (
                  <div key={log.id} className="relative">
                    {/* Timeline dot */}
                    <span
                      className={cn(
                        'absolute -left-[26px] top-[18px] size-2.5 rounded-full ring-2 md:-left-[30px]',
                        idx === 0
                          ? 'bg-[var(--accent)] ring-[var(--accent)]/40'
                          : `${cfg.dot} ring-[var(--background)]`,
                      )}
                    />

                    {/* Card */}
                    <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/30 transition-all duration-150 hover:bg-white/40 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8">
                      {/* Banner */}
                      {log.banner_url && (
                        <div className="relative h-36 w-full overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={log.banner_url}
                            alt={`Banner ${log.title}`}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50" />
                        </div>
                      )}

                      <div className="p-4">
                        {/* Top row */}
                        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                          {/* Type icon badge */}
                          <span className={cn('flex size-6 items-center justify-center rounded-lg shadow-sm', cfg.badgeColor)}>
                            <Icon size={12} className={cfg.iconColor} />
                          </span>

                          {/* Type label */}
                          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', cfg.color)}>
                            {TYPE_EMOJI[log.type]} {cfg.label}
                          </span>

                          {/* Version */}
                          <span className="rounded-full border border-white/20 bg-white/30 px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--foreground)]/60 dark:border-white/10 dark:bg-white/8">
                            v{log.version}
                          </span>

                          {/* Latest */}
                          {idx === 0 && (
                            <span className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                              Dernière version
                            </span>
                          )}

                          {/* Date */}
                          <span className="ml-auto text-[10px] text-[var(--muted)]/50">
                            {new Date(log.created_at).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>

                        {/* Title */}
                        <h2 className="mb-2.5 text-[14px] font-bold leading-snug text-[var(--foreground)]">
                          {log.title}
                        </h2>

                        {/* Divider */}
                        <div className="mb-2.5 h-px bg-white/10 dark:bg-white/8" />

                        {/* Markdown */}
                        <div className="prose prose-sm max-w-none text-[var(--muted)]
                          [&_a]:text-[var(--accent)] [&_a]:underline [&_a]:underline-offset-2
                          [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--accent)]/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-[var(--muted)]/70
                          [&_code]:rounded-md [&_code]:bg-white/20 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px] [&_code]:text-[var(--foreground)] [&_code]:dark:bg-white/8
                          [&_h1]:text-sm [&_h1]:font-bold [&_h1]:text-[var(--foreground)]
                          [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[var(--foreground)]
                          [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-[var(--foreground)]
                          [&_hr]:border-white/15
                          [&_li]:text-[13px] [&_li]:leading-relaxed
                          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-0.5
                          [&_p]:text-[13px] [&_p]:leading-relaxed
                          [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-white/20 [&_pre]:p-3 [&_pre]:border [&_pre]:border-white/15 [&_pre]:dark:bg-white/8
                          [&_pre_code]:bg-transparent [&_pre_code]:p-0
                          [&_strong]:font-semibold [&_strong]:text-[var(--foreground)]
                          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-0.5">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {log.content}
                          </ReactMarkdown>
                        </div>

                        {/* Author */}
                        {log.author_username && (
                          <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-2.5 dark:border-white/8">
                            <span className="flex size-5 items-center justify-center rounded-full border border-white/20 bg-white/30 text-[9px] font-bold uppercase text-[var(--foreground)]/60 dark:border-white/10 dark:bg-white/8">
                              {log.author_username.charAt(0)}
                            </span>
                            <p className="text-[11px] text-[var(--muted)]/60">
                              Publié par <span className="font-medium text-[var(--muted)]">@{log.author_username}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollShadow>
      )}
    </div>
  );
}
