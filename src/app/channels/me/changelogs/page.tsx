'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SparklesIcon } from '@/components/icons';

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

const typeConfig: Record<string, { label: string; color: string; glow: string; dot: string }> = {
  feature:     { label: '✨ Nouveauté',        color: 'border-blue-500/25 bg-blue-500/15 text-blue-300',     glow: 'bg-blue-500/10',    dot: 'bg-blue-400' },
  improvement: { label: '⚡ Amélioration',      color: 'border-violet-500/25 bg-violet-500/15 text-violet-300', glow: 'bg-violet-500/10', dot: 'bg-violet-400' },
  fix:         { label: '🐛 Correctif',         color: 'border-orange-500/25 bg-orange-500/15 text-orange-300', glow: 'bg-orange-500/10', dot: 'bg-orange-400' },
  security:    { label: '🔒 Sécurité',          color: 'border-red-500/25 bg-red-500/15 text-red-300',        glow: 'bg-red-500/10',     dot: 'bg-red-400' },
  breaking:    { label: '💥 Changement majeur', color: 'border-red-700/25 bg-red-700/15 text-red-400',        glow: 'bg-red-700/10',     dot: 'bg-red-600' },
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

  return (
    <div className="relative flex h-full flex-col overflow-y-auto">
      {/* ── Background blobs ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-80 w-96 rounded-full bg-[var(--accent)]/8 blur-3xl" />
        <div className="absolute -top-20 right-1/4 h-64 w-80 rounded-full bg-violet-500/6 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 h-56 w-72 rounded-full bg-[var(--accent)]/5 blur-3xl" />
      </div>

      {/* ── Hero header ── */}
      <div className="relative overflow-hidden border-b border-white/10 bg-white/5 backdrop-blur-sm dark:border-white/5 dark:bg-white/3">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--accent)]/10 via-transparent to-violet-600/8" />

        <div className="relative mx-auto max-w-2xl px-6 py-10">
          {/* Icon badge */}
          <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-[var(--accent)] p-3 shadow-lg shadow-[var(--accent)]/25">
            <SparklesIcon size={20} className="text-[var(--accent-foreground)]" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Changelogs
          </h1>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            Nouveautés, corrections et améliorations d&apos;AlfyChat
          </p>

          {/* Stats strip */}
          {!loading && changelogs.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
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
                    {cfg.label.split(' ').slice(1).join(' ')} · {count}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse overflow-hidden rounded-2xl border border-white/15 bg-white/30 p-5 backdrop-blur-sm dark:border-white/8 dark:bg-white/5"
              >
                <div className="mb-3 flex gap-2">
                  <div className="h-5 w-14 rounded-full bg-white/20 dark:bg-white/10" />
                  <div className="h-5 w-24 rounded-full bg-white/20 dark:bg-white/10" />
                </div>
                <div className="mb-2 h-5 w-2/3 rounded-lg bg-white/20 dark:bg-white/10" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded-lg bg-white/15 dark:bg-white/8" />
                  <div className="h-3 w-5/6 rounded-lg bg-white/15 dark:bg-white/8" />
                  <div className="h-3 w-4/6 rounded-lg bg-white/15 dark:bg-white/8" />
                </div>
              </div>
            ))}
          </div>
        ) : changelogs.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/30 p-10 text-center backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--accent)]/5 via-transparent to-violet-600/5" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-24 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)]/15 blur-3xl" />
            <div className="relative flex flex-col items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]/20">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <p className="font-semibold text-[var(--foreground)]">Aucun changelog</p>
                <p className="mt-0.5 text-sm text-[var(--muted)]">Revenez bientôt pour les mises à jour.</p>
              </div>
            </div>
          </div>
        ) : (
          /* Timeline */
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-[var(--accent)]/40 via-white/10 to-transparent" />

            <div className="flex flex-col gap-5 pl-7">
              {changelogs.map((log, idx) => {
                const cfg = typeConfig[log.type] ?? { label: log.type, color: 'border-white/20 bg-white/10 text-[var(--muted)]', glow: 'bg-white/5', dot: 'bg-white/40' };
                return (
                  <div key={log.id} className="relative">
                    {/* Timeline dot */}
                    <span
                      className={cn(
                        'absolute -left-[26px] top-[18px] size-2.5 rounded-full ring-2',
                        idx === 0
                          ? 'bg-[var(--accent)] ring-[var(--accent)]/40 shadow-sm shadow-[var(--accent)]/50'
                          : `${cfg.dot} ring-[var(--background)]`,
                      )}
                    />

                    {/* Card */}
                    <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-white/30 hover:bg-white/40 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:border-white/15 dark:hover:bg-white/8">
                      {/* Optional glow at top left */}
                      <div className={cn('pointer-events-none absolute -left-4 -top-4 h-20 w-20 rounded-full blur-2xl opacity-60', cfg.glow)} />

                      {/* Banner */}
                      {log.banner_url && (
                        <div className="relative h-40 w-full overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={log.banner_url}
                            alt={`Banner ${log.title}`}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
                        </div>
                      )}

                      <div className="relative p-5">
                        {/* Top row */}
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          {/* Version */}
                          <span className="rounded-full border border-white/20 bg-white/30 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--foreground)]/60 backdrop-blur-sm dark:border-white/10 dark:bg-white/8">
                            v{log.version}
                          </span>

                          {/* Type badge */}
                          <span className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', cfg.color)}>
                            {cfg.label}
                          </span>

                          {/* Latest badge */}
                          {idx === 0 && (
                            <span className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
                              Dernière version
                            </span>
                          )}

                          {/* Date */}
                          <span className="ml-auto text-[11px] text-[var(--muted)]/60">
                            {new Date(log.created_at).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        </div>

                        {/* Title */}
                        <h2 className="mb-3 text-[15px] font-bold leading-snug text-[var(--foreground)]">
                          {log.title}
                        </h2>

                        {/* Divider */}
                        <div className="mb-3 h-px bg-white/15 dark:bg-white/8" />

                        {/* Markdown */}
                        <div className="prose prose-sm max-w-none text-[var(--muted)]
                          [&_a]:text-[var(--accent)] [&_a]:underline [&_a]:underline-offset-2
                          [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--accent)]/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-[var(--muted)]/70
                          [&_code]:rounded-md [&_code]:bg-white/20 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px] [&_code]:text-[var(--foreground)] [&_code]:dark:bg-white/8
                          [&_h1]:text-sm [&_h1]:font-bold [&_h1]:text-[var(--foreground)] [&_h1]:mb-1
                          [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[var(--foreground)] [&_h2]:mb-1
                          [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-[var(--foreground)] [&_h3]:mb-1
                          [&_hr]:border-white/15
                          [&_li]:text-sm [&_li]:leading-relaxed
                          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-0.5
                          [&_p]:text-sm [&_p]:leading-relaxed
                          [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-white/20 [&_pre]:p-3 [&_pre]:border [&_pre]:border-white/15 [&_pre]:dark:bg-white/8
                          [&_pre_code]:bg-transparent [&_pre_code]:p-0
                          [&_strong]:font-semibold [&_strong]:text-[var(--foreground)]
                          [&_table]:w-full [&_table]:text-sm
                          [&_td]:border [&_td]:border-white/15 [&_td]:px-3 [&_td]:py-2
                          [&_th]:border [&_th]:border-white/15 [&_th]:bg-white/10 [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_th]:text-[var(--foreground)]
                          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-0.5">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {log.content}
                          </ReactMarkdown>
                        </div>

                        {/* Author */}
                        {log.author_username && (
                          <div className="mt-4 flex items-center gap-2 border-t border-white/15 pt-3 dark:border-white/8">
                            <span className="flex size-5 items-center justify-center rounded-full border border-white/20 bg-white/30 text-[9px] font-bold uppercase text-[var(--foreground)]/60 backdrop-blur-sm dark:border-white/10 dark:bg-white/8">
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
        )}
      </div>
    </div>
  );
}
