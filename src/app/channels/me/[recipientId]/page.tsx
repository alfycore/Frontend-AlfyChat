'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserX } from 'lucide-react';

import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { dmPrefetchCache } from '@/lib/dm-prefetch-cache';
import { useTranslation } from '@/components/locale-provider';
import { AlfyDmChat } from '@/components/alfy/live/alfy-dm-chat';

export default function DMPage() {
  const { user, isLoading: authLoading } = useAuth();
  const params = useParams();
  const recipientId = params?.recipientId as string;
  const { t } = useTranslation();
  const c = t.chat;

  const cached = recipientId ? dmPrefetchCache.getUser(recipientId) : null;
  const [error, setError] = useState(false);

  // Rafraîchit le cache de profil en arrière-plan (affichage instantané).
  useEffect(() => {
    if (authLoading || !user || !recipientId) return;
    api
      .getUser(recipientId)
      .then((res) => {
        if (res.success && res.data) {
          const u = res.data as Record<string, unknown>;
          dmPrefetchCache.setUser(recipientId, {
            id: u.id as string,
            username: u.username as string,
            displayName: (u.displayName as string) || (u.username as string),
            avatarUrl: u.avatarUrl as string | undefined,
            bannerUrl: u.bannerUrl as string | undefined,
            bio: u.bio as string | undefined,
            status: u.status as string | undefined,
            customStatus: (u.customStatus as string) ?? null,
          });
        } else if (!cached) {
          setError(true);
        }
      })
      .catch(() => {
        if (!cached) setError(true);
      });
  }, [recipientId, user, authLoading, cached]);

  /* Destinataire introuvable */
  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="alfy-enter flex flex-col items-center gap-4 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-danger/12 text-danger">
            <UserX className="size-6" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold">{c.userNotFound}</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">{c.userLoadError}</p>
          </div>
          <Link
            href="/channels/me"
            className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-secondary"
          >
            <ArrowLeft className="size-4" />
            {c.backToMessages}
          </Link>
        </div>
      </div>
    );
  }

  // Le layout gère la redirection vers /login.
  if (authLoading || !user || !recipientId) return null;

  return <AlfyDmChat key={recipientId} recipientId={recipientId} />;
}
