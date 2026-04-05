'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MessageCircleIcon, UserXIcon, ArrowLeftIcon } from '@/components/icons';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { ChatArea } from '@/components/chat/chat-area';
import { dmPrefetchCache } from '@/lib/dm-prefetch-cache';

export default function DMPage() {
  const { user, isLoading: authLoading } = useAuth();
  const params = useParams();
  const recipientId = params.recipientId as string;

  // Initialiser depuis le cache si disponible → affichage instantané
  const cached = recipientId ? dmPrefetchCache.getUser(recipientId) : null;
  const [recipientName, setRecipientName] = useState(cached?.displayName ?? '');
  const [error, setError] = useState(false);

  useEffect(() => {
    // Attendre que l'auth soit prête ET que l'utilisateur soit connecté
    if (authLoading || !user) return;
    if (!recipientId) return;

    // Rafraîchir le nom en arrière-plan (cache ou fetch) — sans spinner
    api.getUser(recipientId).then((res) => {
      if (res.success && res.data) {
        const u = res.data as any;
        const name = u.displayName || u.username;
        setRecipientName(name);
        dmPrefetchCache.setUser(recipientId, {
          id: u.id,
          username: u.username,
          displayName: name,
          avatarUrl: u.avatarUrl,
          bannerUrl: u.bannerUrl,
          bio: u.bio,
          status: u.status,
          customStatus: u.customStatus ?? null,
        });
      } else if (!cached) {
        setError(true);
      }
    }).catch(() => { if (!cached) setError(true); });
  }, [recipientId, user, authLoading]);

  /* ── Error state ── */
  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--background)]/50">
        <div className="flex flex-col items-center gap-5 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-destructive/30 bg-[var(--surface)]/80 shadow-2xl">
              <UserXIcon size={28} className="text-red-500/70" />
            </div>
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-sm font-semibold text-[var(--foreground)]/80">Utilisateur introuvable</p>
            <p className="max-w-xs text-center text-[12px] leading-relaxed text-[var(--muted)]/60">
              Impossible de charger cette conversation. L&apos;utilisateur n&apos;existe peut-être plus.
            </p>
          </div>
          <Link
            href="/channels/me"
            className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--border)]/60 bg-[var(--surface)]/60 px-5 py-2.5 text-sm font-medium text-[var(--foreground)]/80 shadow-lg transition-all duration-200 hover:bg-[var(--surface)]/80 hover:shadow-xl"
          >
            <ArrowLeftIcon size={16} />
            Retour aux messages
          </Link>
        </div>
      </div>
    );
  }

  /* ── Non authentifié (ne devrait pas arriver — le layout redirige) ── */
  if (!user) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--background)]/50">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)]/80 shadow-2xl">
          <MessageCircleIcon size={28} className="text-[var(--muted)]" />
        </div>
      </div>
    );
  }

  /* ── Chat ── */
  return (
    <div className="flex h-full w-full flex-col animate-in fade-in-0 duration-300">
      <ChatArea key={recipientId} recipientId={recipientId} recipientName={recipientName} />
    </div>
  );
}

