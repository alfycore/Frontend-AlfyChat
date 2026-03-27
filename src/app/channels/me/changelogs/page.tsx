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

const typeColors: Record<string, string> = {
  feature: 'bg-blue-500/15 text-blue-400',
  improvement: 'bg-purple-500/15 text-purple-400',
  fix: 'bg-orange-500/15 text-orange-400',
  security: 'bg-red-500/15 text-red-400',
  breaking: 'bg-red-700/15 text-red-500',
};

const typeLabels: Record<string, string> = {
  feature: '✨ Nouveauté',
  improvement: '⚡ Amélioration',
  fix: '🐛 Correctif',
  security: '🔒 Sécurité',
  breaking: '💥 Changement majeur',
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
    <div className="flex h-full flex-col overflow-y-auto bg-[var(--background)]">
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Changelogs</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Nouveautés et mises à jour d&apos;AlfyChat
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : changelogs.length === 0 ? (
          <div className="py-16 text-center text-[var(--muted)]">
            Aucun changelog pour le moment.
          </div>
        ) : (
          <div className="flex flex-col gap-5 pb-8">
            {changelogs.map((log) => (
              <div
                key={log.id}
                className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"
              >
                {/* Banner image */}
                {log.banner_url && (
                  <div className="relative h-44 w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={log.banner_url}
                      alt={`Banner for ${log.title}`}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--surface)]/60" />
                  </div>
                )}

                <div className="p-5">
                  {/* Top row: version + type badge + date */}
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[var(--surface-secondary)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--muted)]">
                      v{log.version}
                    </span>
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 text-xs font-semibold',
                        typeColors[log.type] ?? 'bg-zinc-500/15 text-zinc-400',
                      )}
                    >
                      {typeLabels[log.type] ?? log.type}
                    </span>
                    <span className="ml-auto text-xs text-[var(--muted)]">
                      {new Date(log.created_at).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">
                    {log.title}
                  </h2>

                  {/* Markdown content */}
                  <div className="prose prose-sm max-w-none text-[var(--muted)] [&_a]:text-[var(--accent)] [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--border)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--muted)] [&_code]:rounded [&_code]:bg-[var(--surface-secondary)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-[var(--foreground)] [&_h1]:text-sm [&_h1]:font-bold [&_h1]:text-[var(--foreground)] [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-[var(--foreground)] [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-[var(--foreground)] [&_hr]:border-[var(--border)] [&_li]:text-sm [&_li]:leading-relaxed [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:text-sm [&_p]:leading-relaxed [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-[var(--surface-secondary)] [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_strong]:text-[var(--foreground)] [&_table]:w-full [&_table]:text-sm [&_td]:border [&_td]:border-[var(--border)] [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-[var(--border)] [&_th]:bg-[var(--surface-secondary)] [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_th]:text-[var(--foreground)] [&_ul]:list-disc [&_ul]:pl-5">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {log.content}
                    </ReactMarkdown>
                  </div>

                  {/* Author */}
                  {log.author_username && (
                    <p className="mt-4 text-xs text-[var(--muted)]/60">
                      Publié par @{log.author_username}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
