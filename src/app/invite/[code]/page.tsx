'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { UsersIcon, HashIcon, Loader2Icon, ShieldCheckIcon, ArrowRightIcon, LogInIcon } from '@/components/icons';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { Avatar, Button } from '@heroui/react';

interface InviteInfo {
  server: {
    id: string;
    name: string;
    description?: string;
    iconUrl?: string;
    bannerUrl?: string;
    memberCount?: number;
    onlineCount?: number;
    isPublic?: boolean;
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

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' && localStorage.getItem('alfychat_token');
    setIsLoggedIn(Boolean(token));
    loadInvite();
  }, [code]);

  const loadInvite = async () => {
    setIsLoading(true);
    setError('');
    const res = await api.resolveInvite(code);
    if (res.success && res.data) {
      setInviteInfo(res.data as InviteInfo);
    } else {
      setError(res.error || 'Invitation invalide ou expirée');
    }
    setIsLoading(false);
  };

  const handleJoin = async () => {
    if (!isLoggedIn) {
      router.push(`/login?next=/invite/${code}`);
      return;
    }

    setIsJoining(true);
    const res = await api.joinServer(code);
    if (res.success) {
      const currentUserId = typeof window !== 'undefined'
        ? (window as any).__alfychat_user_id
        : null;
      const ownerId = inviteInfo?.server && ((inviteInfo.server as any).ownerId || (inviteInfo.server as any).owner_id);
      if (currentUserId && ownerId && currentUserId === ownerId && inviteInfo?.server?.id) {
        socketService.getSocket()?.emit('SERVER_OWNER_JOINED', { serverId: inviteInfo.server.id });
      }
      router.push('/channels');
    } else {
      setError(res.error || 'Impossible de rejoindre ce serveur');
      setIsJoining(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0_280/3%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_280/3%)_1px,transparent_1px)] bg-size-[72px_72px]" />
        <HugeiconsIcon icon={Loader2Icon} size={22} className="relative z-10 animate-spin text-primary/40" />
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (error && !inviteInfo) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden gap-5 bg-background p-8 text-center">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0_280/3%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_280/3%)_1px,transparent_1px)] bg-size-[72px_72px]" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-xl bg-danger/10">
            <HugeiconsIcon icon={ShieldCheckIcon} size={26} className="text-danger" />
          </div>
          <div>
            <h1 className="mb-1.5 text-[22px] font-bold tracking-tight">Invitation invalide</h1>
            <p className="max-w-sm text-[13px] text-muted/60">{error}</p>
          </div>
          <Button variant="outline" onPress={() => router.push('/')} className="rounded-lg border-border/40">
            Retour à l&apos;accueil
          </Button>
        </div>
      </div>
    );
  }

  // ── Main card ──────────────────────────────────────────────────────────────

  const server = inviteInfo?.server;
  const invite = inviteInfo?.invite;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0_280/3%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_280/3%)_1px,transparent_1px)] bg-size-[72px_72px]" />

      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border/40 bg-card shadow-2xl">

        {/* Banner */}
        {server?.bannerUrl ? (
          <div
            className="h-24 w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${resolveMediaUrl(server.bannerUrl)})` }}
          />
        ) : (
          <div className="h-24 w-full bg-linear-to-br from-primary/25 via-primary/10 to-background" />
        )}

        <div className="px-5 pb-5">
          {/* Server icon — overlaps banner */}
          <div className="-mt-7 mb-3">
            <Avatar className="size-14 rounded-xl ring-4 ring-card">
              <Avatar.Image src={resolveMediaUrl(server?.iconUrl)} className="object-cover" />
              <Avatar.Fallback className="rounded-xl text-lg font-bold">
                {server?.name.substring(0, 2).toUpperCase()}
              </Avatar.Fallback>
            </Avatar>
          </div>

          {/* Invite label */}
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted/50">
            Vous êtes invité à rejoindre
          </p>

          {/* Server name */}
          <h1 className="text-[20px] font-bold leading-tight">{server?.name}</h1>

          {/* Description */}
          {server?.description && (
            <p className="mt-1 text-[12px] text-muted/60">{server.description}</p>
          )}

          {/* Stats */}
          <div className="mt-3 flex items-center gap-4">
            {server?.memberCount !== undefined && (
              <span className="flex items-center gap-1.5 text-[12px] text-muted/60">
                <HugeiconsIcon icon={UsersIcon} size={13} />
                {server.memberCount} membre{server.memberCount !== 1 ? 's' : ''}
              </span>
            )}
            {invite?.uses !== undefined && invite?.maxUses && (
              <span className="flex items-center gap-1.5 text-[12px] text-muted/60">
                <HugeiconsIcon icon={HashIcon} size={13} />
                {invite.uses}/{invite.maxUses} utilisations
              </span>
            )}
          </div>

          {/* Expiry */}
          {invite?.expiresAt && !invite.isPermanent && (
            <p className="mt-2 text-[11px] text-muted/50">
              Expire le {new Date(invite.expiresAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}

          {/* Error inline */}
          {error && (
            <p className="mt-3 text-[12px] text-danger">{error}</p>
          )}

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-2">
            <Button
              size="lg"
              className="w-full gap-2 rounded-lg text-[14px] font-semibold"
              onPress={handleJoin}
              isDisabled={isJoining}
            >
              {isJoining ? (
                <HugeiconsIcon icon={Loader2Icon} size={17} className="animate-spin" />
              ) : isLoggedIn ? (
                <HugeiconsIcon icon={ArrowRightIcon} size={17} />
              ) : (
                <HugeiconsIcon icon={LogInIcon} size={17} />
              )}
              {isLoggedIn ? 'Rejoindre le serveur' : 'Se connecter pour rejoindre'}
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-lg text-[13px] text-muted/60"
              onPress={() => router.push('/')}
            >
              Pas maintenant
            </Button>
          </div>
        </div>
      </div>

      <p className="relative z-10 mt-4 text-[11px] text-muted/40">
        AlfyChat — Messagerie sécurisée et décentralisée
      </p>
    </div>
  );
}
