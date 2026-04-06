'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UsersIcon, Loader2Icon, ArrowRightIcon, LogInIcon, ShieldCheckIcon } from '@/components/icons';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { cn } from '@/lib/utils';

interface InviteInfo {
  server: {
    id: string;
    name: string;
    description?: string;
    iconUrl?: string;
    bannerUrl?: string;
    memberCount?: number;
  };
  invite: {
    code: string;
    customSlug?: string;
    maxUses?: number;
    uses?: number;
    expiresAt?: string;
    isPermanent?: boolean;
  };
}

interface InviteEmbedProps {
  code: string;
}

export function InviteEmbed({ code }: InviteEmbedProps) {
  const router = useRouter();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const isLoggedIn = typeof window !== 'undefined' && Boolean(localStorage.getItem('alfychat_token'));

  useEffect(() => {
    let cancelled = false;
    api.resolveInvite(code).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setInfo(res.data as InviteInfo);
      } else {
        setError(res.error || 'Invitation invalide ou expirée');
      }
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [code]);

  const handleJoin = async () => {
    if (!isLoggedIn) {
      router.push(`/login?next=/invite/${code}`);
      return;
    }
    setIsJoining(true);
    const res = await api.joinServer(code);
    if (res.success) {
      setJoined(true);
      const currentUserId = (window as any).__alfychat_user_id;
      const ownerId = info?.server && ((info.server as any).ownerId || (info.server as any).owner_id);
      if (currentUserId && ownerId && currentUserId === ownerId && info?.server?.id) {
        socketService.getSocket()?.emit('SERVER_OWNER_JOINED', { serverId: info.server.id });
      }
      // Navigate to the server after a short delay
      setTimeout(() => router.push('/channels'), 600);
    } else {
      setError(res.error || 'Impossible de rejoindre ce serveur');
      setIsJoining(false);
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="mt-2 w-full max-w-xs overflow-hidden rounded-xl border border-[var(--border)]/30 bg-[var(--surface-secondary)]/40">
        <div className="h-14 w-full animate-pulse bg-[var(--surface-secondary)]/60" />
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <div className="size-8 shrink-0 animate-pulse rounded-lg bg-[var(--surface-secondary)]/60" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 animate-pulse rounded bg-[var(--surface-secondary)]/60" />
            <div className="h-2.5 w-16 animate-pulse rounded bg-[var(--surface-secondary)]/40" />
          </div>
          <div className="h-7 w-20 animate-pulse rounded-lg bg-[var(--surface-secondary)]/60" />
        </div>
      </div>
    );
  }

  // Error state
  if (error && !info) {
    return (
      <div className="mt-2 flex w-full max-w-xs items-center gap-2 rounded-xl border border-[var(--border)]/30 bg-[var(--surface-secondary)]/30 px-3 py-2.5">
        <ShieldCheckIcon size={14} className="shrink-0 text-danger/70" />
        <span className="text-[11px] text-[var(--muted)]/60">{error}</span>
      </div>
    );
  }

  const server = info?.server;

  return (
    <div className="mt-2 w-full max-w-xs overflow-hidden rounded-xl border border-[var(--border)]/30 bg-[var(--surface-secondary)]/40 shadow-sm">
      {/* Banner */}
      {server?.bannerUrl ? (
        <div
          className="h-14 w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${resolveMediaUrl(server.bannerUrl)})` }}
        />
      ) : (
        <div className="h-14 w-full bg-gradient-to-br from-[var(--accent)]/25 via-[var(--accent)]/10 to-transparent" />
      )}

      {/* Body */}
      <div className="px-3 pb-3 pt-0">
        {/* Icon overlapping banner */}
        <div className="-mt-5 mb-2">
          <Avatar className="size-10 rounded-lg ring-2 ring-[var(--surface-secondary)]">
            <AvatarImage src={resolveMediaUrl(server?.iconUrl)} className="object-cover" />
            <AvatarFallback className="rounded-lg text-sm font-bold">
              {server?.name?.substring(0, 2).toUpperCase() ?? '??'}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Info row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/40">
              Invitation à rejoindre
            </p>
            <p className="truncate text-[13px] font-semibold text-[var(--foreground)]">
              {server?.name}
            </p>
            {server?.memberCount !== undefined && (
              <span className="flex items-center gap-1 text-[11px] text-[var(--muted)]/50">
                <UsersIcon size={11} />
                {server.memberCount} membre{server.memberCount !== 1 ? 's' : ''}
              </span>
            )}
            {error && (
              <p className="mt-1 text-[11px] text-danger/80">{error}</p>
            )}
          </div>

          {/* Join button */}
          <Button
            size="sm"
            className={cn(
              'shrink-0 gap-1.5 rounded-lg text-[12px] font-semibold transition-all',
              joined && 'bg-success/20 text-success',
            )}
            onClick={joined ? undefined : handleJoin}
            disabled={isJoining}
          >
            {joined ? (
              'Rejoint ✓'
            ) : isJoining ? (
              <Loader2Icon size={13} className="animate-spin" />
            ) : isLoggedIn ? (
              <><ArrowRightIcon size={13} />Rejoindre</>
            ) : (
              <><LogInIcon size={13} />Connexion</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Extract invite codes from a message text.
 * Matches URLs like https://alfychat.app/invite/CODE or /invite/CODE
 */
export function extractInviteCodes(content: string): string[] {
  const regex = /(?:https?:\/\/[^\s/]*)?\/invite\/([A-Za-z0-9]{4,20})/g;
  const codes: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (!codes.includes(match[1])) codes.push(match[1]);
  }
  return codes;
}
