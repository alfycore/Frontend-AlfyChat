'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

const typeConfig: Record<string, { label: string; color: string; dot: string }> = {
  feature:     { label: '✨ Nouveauté',         color: 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20',    dot: 'bg-blue-400' },
  improvement: { label: '⚡ Amélioration',       color: 'bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/20', dot: 'bg-violet-400' },
  fix:         { label: '🐛 Correctif',          color: 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/20', dot: 'bg-orange-400' },
  security:    { label: '🔒 Sécurité',           color: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/20',      dot: 'bg-red-400' },
  breaking:    { label: '💥 Changement majeur',  color: 'bg-red-700/15 text-red-500 ring-1 ring-red-700/20',      dot: 'bg-red-600' },
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
    <div className="flex h-full flex-col overflow-y-auto">
      {/* ── Hero header ─────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-[var(--border)]/30">
        {/* Gradient blobs */}
        <div className="pointer-events-none absolute -top-10 left-1/4 h-40 w-60 rounded-full bg-[var(--accent)]/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-10 right-1/4 h-32 w-48 rounded-full bg-violet-500/8 blur-3xl" />

        <div className="relative mx-auto max-w-2xl px-6 py-10">
          {/* Badge */}
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/8 px-3 py-1 text-[11px] font-semibold text-[var(--accent)]">
            <span className="size-1.5 rounded-full bg-[var(--accent)]" />
            Mises à jour
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Changelogs
          </h1>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            Nouveautés, corrections et améliorations d&apos;AlfyChat
          </p>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        {loading ? (
          <div className="flex flex-col gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse overflow-hidden rounded-2xl border border-[var(--border)]/30 bg-[var(--surface)]/40 p-5"
              >
                <div className="mb-3 flex gap-2">
                  <div className="h-5 w-14 rounded-full bg-[var(--surface-secondary)]" />
                  <div className="h-5 w-24 rounded-full bg-[var(--surface-secondary)]" />
                </div>
                <div className="mb-2 h-5 w-2/3 rounded-lg bg-[var(--surface-secondary)]" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded-lg bg-[var(--surface-secondary)]" />
                  <div className="h-3 w-5/6 rounded-lg bg-[var(--surface-secondary)]" />
                  <div className="h-3 w-4/6 rounded-lg bg-[var(--surface-secondary)]" />
                </div>
              </div>
            ))}
          </div>
        ) : changelogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl border border-[var(--border)]/40 bg-[var(--surface-secondary)]/50">
              <span className="text-2xl">📋</span>
            </div>
            <div>
              <p className="font-semibold text-[var(--foreground)]">Aucun changelog</p>
              <p className="mt-0.5 text-sm text-[var(--muted)]">Revenez bientôt pour les mises à jour.</p>
            </div>
          </div>
        ) : (
          /* Timeline */
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-[var(--accent)]/30 via-[var(--border)]/20 to-transparent" />

            <div className="flex flex-col gap-6 pl-7">
              {changelogs.map((log, idx) => {
                const cfg = typeConfig[log.type] ?? { label: log.type, color: 'bg-zinc-500/15 text-zinc-400', dot: 'bg-zinc-400' };
                return (
                  <div key={log.id} className="relative">
                    {/* Timeline dot */}
                    <span
                      className={cn(
                        'absolute -left-[26px] top-[18px] size-2.5 rounded-full ring-2 ring-[var(--background)]',
                        idx === 0 ? 'bg-[var(--accent)] ring-[var(--accent)]/30' : cfg.dot,
                      )}
                    />

                    {/* Card */}
                    <div className="overflow-hidden rounded-2xl border border-[var(--border)]/30 bg-[var(--surface)]/60 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md hover:border-[var(--border)]/50">
                      {/* Banner */}
                      {log.banner_url && (
                        <div className="relative h-40 w-full overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={log.banner_url}
                            alt={`Banner ${log.title}`}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--surface)]/80" />
                        </div>
                      )}

                      <div className="p-5">
                        {/* Top row */}
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          {/* Version */}
                          <span className="rounded-full border border-[var(--border)]/40 bg-[var(--surface-secondary)]/80 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--muted)]">
                            v{log.version}
                          </span>

                          {/* Type badge */}
                          <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', cfg.color)}>
                            {cfg.label}
                          </span>

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
                        <div className="mb-3 h-px bg-[var(--border)]/20" />

                        {/* Markdown */}
                        <div className="prose prose-sm max-w-none text-[var(--muted)]
                          [&_a]:text-[var(--accent)] [&_a]:underline [&_a]:underline-offset-2
                          [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--accent)]/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-[var(--muted)]/70
                          [&_code]:rounded-md [&_code]:bg-[var(--surface-secondary)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px] [&_code]:text-[var(--foreground)]
                          [&_h1]:text-sm [&_h1]:font-bold [&_h1]:text-[var(--foreground)] [&_h1]:mb-1
                          [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[var(--foreground)] [&_h2]:mb-1
                          [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-[var(--foreground)] [&_h3]:mb-1
                          [&_hr]:border-[var(--border)]/30
                          [&_li]:text-sm [&_li]:leading-relaxed
                          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-0.5
                          [&_p]:text-sm [&_p]:leading-relaxed
                          [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-[var(--surface-secondary)]/80 [&_pre]:p-3 [&_pre]:border [&_pre]:border-[var(--border)]/20
                          [&_pre_code]:bg-transparent [&_pre_code]:p-0
                          [&_strong]:font-semibold [&_strong]:text-[var(--foreground)]
                          [&_table]:w-full [&_table]:text-sm
                          [&_td]:border [&_td]:border-[var(--border)]/30 [&_td]:px-3 [&_td]:py-2
                          [&_th]:border [&_th]:border-[var(--border)]/30 [&_th]:bg-[var(--surface-secondary)]/60 [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_th]:text-[var(--foreground)]
                          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-0.5">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {log.content}
                          </ReactMarkdown>
                        </div>

                        {/* Author */}
                        {log.author_username && (
                          <div className="mt-4 flex items-center gap-1.5 border-t border-[var(--border)]/20 pt-3">
                            <span className="flex size-5 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[9px] font-bold uppercase text-[var(--muted)]">
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
