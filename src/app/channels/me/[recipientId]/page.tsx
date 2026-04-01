'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { MessageCircleIcon, Loader2Icon, UserXIcon, ArrowLeftIcon } from '@/components/icons';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { ChatArea } from '@/components/chat/chat-area';

export default function DMPage() {
  const { user, isLoading: authLoading } = useAuth();
  const params = useParams();
  const recipientId = params.recipientId as string;

  const [recipientName, setRecipientName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Attendre que l'auth soit prête ET que l'utilisateur soit connecté
    if (authLoading || !user) return;
    if (!recipientId) return;

    const loadRecipient = async () => {
      setIsLoading(true);
      setError(false);
      try {
        const response = await api.getUser(recipientId);
        if (response.success && response.data) {
          const userData = response.data as { displayName: string };
          setRecipientName(userData.displayName);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Erreur chargement destinataire:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };
    loadRecipient();
  }, [recipientId, user, authLoading]);

  /* ── Auth ou données encore en chargement ── */
  if (authLoading || isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--background)]/50">
        <div className="flex flex-col items-center gap-5 animate-in fade-in-0 duration-500">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)]/80 shadow-2xl">
              <Loader2Icon size={28} className="animate-spin text-[var(--accent)]" />
            </div>
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-sm font-medium text-[var(--foreground)]/80">Chargement de la conversation</p>
            <p className="text-[11px] text-[var(--muted)]/60">Veuillez patienter…</p>
          </div>
          {/* Skeleton shimmer */}
          <div className="mt-4 w-72 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-[var(--border)]/30 bg-[var(--surface-secondary)]/20 p-3"
                style={{ opacity: 1 - i * 0.25 }}
              >
                <div className="size-8 shrink-0 animate-pulse rounded-full bg-[var(--surface-secondary)]/40" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-20 animate-pulse rounded-full bg-[var(--surface-secondary)]/40" />
                  <div className="h-2 animate-pulse rounded-full bg-[var(--surface-secondary)]/30" style={{ width: `${80 - i * 15}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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

