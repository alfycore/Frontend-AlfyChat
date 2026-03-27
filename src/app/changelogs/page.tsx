'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

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
  const router = useRouter();
  const [changelogs, setChangelogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getChangelogs(100, 0)
      .then((res) => setChangelogs(res.data ?? []))
      .catch(() => setChangelogs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => router.push('/channels/me')}
            className="flex items-center gap-1.5 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          >
            ← Retour
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Changelogs</h1>
            <p className="text-sm text-[var(--muted)]">Nouveautés et mises à jour d&apos;AlfyChat</p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : changelogs.length === 0 ? (
          <div className="py-16 text-center text-[var(--muted)]">Aucun changelog pour le moment.</div>
        ) : (
          <div className="flex flex-col gap-5">
            {changelogs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
              >
                {/* Top row */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[var(--surface-secondary)] px-2 py-0.5 text-xs font-mono font-semibold text-[var(--muted)]">
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
                <h2 className="mb-2 text-base font-semibold text-[var(--foreground)]">{log.title}</h2>

                {/* Content */}
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{log.content}</p>

                {/* Author */}
                {log.author_username && (
                  <p className="mt-3 text-xs text-[var(--muted)]/60">Publié par {log.author_username}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
