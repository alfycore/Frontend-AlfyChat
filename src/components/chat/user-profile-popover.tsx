'use client';

import { useState, useEffect } from 'react';
import {
  BanIcon,
  CalendarIcon,
  CheckIcon,
  MessageCircleIcon,
  PaletteIcon,
  ShieldCheckIcon,
  SmileIcon,
  UserCheckIcon,
  UserPlusIcon,
  UserXIcon,
} from '@/components/icons';
import { api, resolveMediaUrl } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { socketService } from '@/lib/socket';
import { statusLabel, statusTextColor, statusColor, isVisibleOnline } from '@/lib/status';
import { sanitizeSvg } from '@/lib/sanitize';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from '@/components/ui/tooltip';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserBadge {
  id: string;
  name: string;
  icon: string;
  iconType?: 'bootstrap' | 'svg' | 'flaticon';
  iconValue?: string;
  color: string;
  earnedAt: string;
}

interface UserProfileData {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  status: string;
  isOnline: boolean;
  cardColor?: string;
  badges?: UserBadge[];
  showBadges?: boolean;
  hiddenBadgeIds?: string[];
  isBot?: boolean;
  isVerifiedBot?: boolean;
  createdAt?: string;
  interests?: string[];
}

type FriendStatus = 'none' | 'friend' | 'pending_sent' | 'pending_received';

interface UserProfilePopoverProps {
  userId: string;
  children: React.ReactNode;
  onOpenDM?: (recipientId: string, recipientName: string) => void;
  serverId?: string;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMemberSince(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
  if (diff < 30) return `${diff} jour${diff > 1 ? 's' : ''}`;
  if (diff < 365) { const m = Math.floor(diff / 30); return `${m} mois`; }
  const y = Math.floor(diff / 365);
  const rm = Math.floor((diff % 365) / 30);
  return rm > 0 ? `${y} an${y > 1 ? 's' : ''} et ${rm} mois` : `${y} an${y > 1 ? 's' : ''}`;
}

function BadgeIcon({ badge }: { badge: UserBadge }) {
  const val = badge.iconValue || badge.icon;
  if (badge.iconType === 'svg') return <span dangerouslySetInnerHTML={{ __html: sanitizeSvg(val) }} className="flex size-3 items-center justify-center [&>svg]:size-full" />;
  if (badge.iconType === 'flaticon') return <i className={`${val}`} style={{ color: badge.color, fontSize: 11, lineHeight: 1 }} />;
  return <i className={`fi fi-br-${val}`} style={{ color: badge.color, fontSize: 11, lineHeight: 1 }} />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserProfilePopover({
  userId,
  children,
  onOpenDM,
  serverId,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: UserProfilePopoverProps) {
  const { user: me } = useAuth();
  const isMe = me?.id === userId;

  // ── Open state ────────────────────────────────────────────────────────────
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = (v: boolean) => { setInternalOpen(v); externalOnOpenChange?.(v); };

  // ── Profile data ──────────────────────────────────────────────────────────
  const [profile,      setProfile     ] = useState<UserProfileData | null>(null);
  const [loading,      setLoading     ] = useState(false);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('none');
  const [localColor,   setLocalColor  ] = useState<string | null>(null);
  const [showFullBio,  setShowFullBio ] = useState(false);

  // ── Server moderation ─────────────────────────────────────────────────────
  const [serverRoles,   setServerRoles  ] = useState<Array<{ id: string; name: string; color: string; position: number; permissions?: any }>>([]);
  const [memberRoleIds, setMemberRoleIds] = useState<string[]>([]);
  const [showRoles,     setShowRoles    ] = useState(false);
  const [canManageRoles, setCanManageRoles] = useState(false);
  const [canKickBan,    setCanKickBan   ] = useState(false);
  const [confirmKick,   setConfirmKick  ] = useState(false);
  const [confirmBan,    setConfirmBan   ] = useState(false);
  const [banReason,     setBanReason    ] = useState('');

  // ── Color save debounce ───────────────────────────────────────────────────
  const [colorTimer, setColorTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // ── Load on open ──────────────────────────────────────────────────────────
  // Toujours re-fetcher à chaque ouverture : le profil de l'ami peut avoir changé
  useEffect(() => {
    if (!isOpen) {
      // Réinitialiser à la fermeture pour éviter un flash de données périmées
      setProfile(null);
      return;
    }
    loadProfile();
    if (!isMe) checkFriendship();
    if (serverId) loadServerRoles();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Presence socket ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (data: unknown) => {
      const p = ((data as any)?.payload ?? data) as { userId?: string; status?: string };
      if (p?.userId === userId && p?.status) {
        setProfile(prev => prev ? { ...prev, status: p.status! } : prev);
      }
    };
    socketService.onPresenceUpdate(handler);
    return () => socketService.off('PRESENCE_UPDATE', handler);
  }, [isOpen, userId]);

  // ── Loaders ───────────────────────────────────────────────────────────────
  async function loadProfile() {
    setLoading(true);
    try {
      const res = await api.getUser(userId);
      if (res.success && res.data) setProfile(res.data as UserProfileData);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function checkFriendship() {
    try {
      const fr = await api.getFriends();
      if (fr.success && Array.isArray(fr.data) && fr.data.some((f: any) => f.id === userId)) {
        setFriendStatus('friend'); return;
      }
      const rr = await api.getFriendRequests();
      if (rr.success && rr.data) {
        const { sent = [], received = [] } = rr.data as any;
        if (sent.some((r: any) => r.receiverId === userId || r.id === userId)) { setFriendStatus('pending_sent'); return; }
        if (received.some((r: any) => r.senderId === userId || r.id === userId)) { setFriendStatus('pending_received'); return; }
      }
      setFriendStatus('none');
    } catch { setFriendStatus('none'); }
  }

  function loadServerRoles() {
    if (!serverId) return;
    socketService.requestRoles(serverId, (roleData: any) => {
      const roles = (roleData?.roles ?? [])
        .map((r: any) => ({ id: r.id, name: r.name, color: r.color ?? '#99AAB5', position: r.position ?? 0, permissions: r.permissions }))
        .sort((a: any, b: any) => b.position - a.position);
      setServerRoles(roles);

      socketService.requestMembers(serverId!, (memberData: any) => {
        const members: any[] = memberData?.members ?? [];

        const target = members.find(m => (m.userId ?? m.user_id ?? m.id) === userId);
        if (target) {
          let ids = target.roleIds ?? target.role_ids ?? [];
          if (typeof ids === 'string') { try { ids = JSON.parse(ids); } catch { ids = []; } }
          setMemberRoleIds(ids);
        }

        const current = members.find(m => (m.userId ?? m.user_id ?? m.id) === me?.id);
        if (!current) return;
        let myIds = current.roleIds ?? current.role_ids ?? [];
        if (typeof myIds === 'string') { try { myIds = JSON.parse(myIds); } catch { myIds = []; } }

        let perms = 0;
        for (const role of roles) {
          if (!myIds.includes(role.id)) continue;
          if (Array.isArray(role.permissions)) {
            for (const p of role.permissions) {
              if (p === 'ADMIN')        perms |= 0x40;
              if (p === 'MANAGE_ROLES') perms |= 0x100;
              if (p === 'KICK')         perms |= 0x10;
              if (p === 'BAN')          perms |= 0x20;
            }
          } else {
            perms |= (typeof role.permissions === 'number' ? role.permissions : parseInt(String(role.permissions ?? 0), 10));
          }
        }
        const admin = !!(perms & 0x40);
        setCanManageRoles(admin || !!(perms & 0x100));
        setCanKickBan(admin || !!((perms & 0x10) || (perms & 0x20)));

        socketService.requestServerInfo(serverId!, (srv: any) => {
          if ((srv?.ownerId ?? srv?.owner_id) === me?.id) { setCanManageRoles(true); setCanKickBan(true); }
        });
      });
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  function handleColorChange(color: string) {
    setLocalColor(color);
    if (colorTimer) clearTimeout(colorTimer);
    setColorTimer(setTimeout(() => { api.updateProfile({ cardColor: color }).catch(() => {}); }, 600));
  }

  async function handleAddFriend() {
    if (!profile) return;
    try { await api.sendFriendRequest(profile.username); setFriendStatus('pending_sent'); } catch { /* ignore */ }
  }

  function handleSendMessage() {
    if (profile && onOpenDM) { onOpenDM(profile.id, profile.displayName || profile.username); setIsOpen(false); }
  }

  function handleKick() { if (serverId) { socketService.kickMember(serverId, userId); setConfirmKick(false); setIsOpen(false); } }

  function handleBan() {
    if (serverId) {
      socketService.banMember(serverId, userId, banReason || undefined);
      setConfirmBan(false); setBanReason(''); setIsOpen(false);
    }
  }

  function toggleRole(roleId: string) {
    if (!serverId) return;
    const next = memberRoleIds.includes(roleId) ? memberRoleIds.filter(id => id !== roleId) : [...memberRoleIds, roleId];
    setMemberRoleIds(next);
    socketService.updateMember(serverId, userId, { roleIds: next });
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const cardColor    = localColor ?? profile?.cardColor ?? '#5865F2';
  const visibleBadges = profile?.showBadges !== false ? (profile?.badges ?? []).filter((b: any) => !(profile?.hiddenBadgeIds ?? []).includes(b.id)).slice(0, 6) : [];
  const memberSince  = profile?.createdAt ? formatMemberSince(profile.createdAt) : null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>

      <PopoverContent
        side="left"
        sideOffset={10}
        className="w-[340px] overflow-hidden rounded-2xl border border-border/50 bg-card/95 p-0 shadow-2xl shadow-black/20 backdrop-blur-xl"
      >
        {loading || !profile ? (
          <div className="flex flex-col">
            <Skeleton className="h-24 w-full rounded-none" />
            <div className="-mt-8 mb-1.5 px-4">
              <Skeleton className="size-16 rounded-2xl ring-[3px] ring-card" />
            </div>
            <div className="space-y-1.5 px-4 pb-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-2.5 w-full" />
              <Skeleton className="h-2.5 w-3/4" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col">

            {/* ── Banner ── */}
            <div className="relative">
              <div className="h-24 w-full overflow-hidden">
                {profile.bannerUrl ? (
                  <img src={resolveMediaUrl(profile.bannerUrl)} alt="" className="size-full object-cover" />
                ) : (
                  <div
                    className="relative size-full"
                    style={{ background: `linear-gradient(135deg, ${cardColor}e6 0%, ${cardColor}66 55%, ${cardColor}14 100%)` }}
                  >
                    <div
                      className="absolute inset-0 opacity-30"
                      style={{
                        backgroundImage: `radial-gradient(circle at 20% 30%, ${cardColor}55 0%, transparent 45%), radial-gradient(circle at 80% 70%, #7c3aed33 0%, transparent 50%)`,
                      }}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-card/60 to-transparent" />
                  </div>
                )}
              </div>

              {/* Avatar */}
              <div className="absolute -bottom-7 left-4">
                <div className="relative">
                  <Avatar className="size-16 rounded-2xl ring-[3px] ring-card shadow-lg">
                    <AvatarImage src={resolveMediaUrl(profile.avatarUrl)} alt={profile.displayName} className="rounded-2xl" />
                    <AvatarFallback
                      className="rounded-2xl font-heading text-xl"
                      style={{ backgroundColor: cardColor + '20', color: cardColor }}
                    >
                      {(profile.displayName?.[0] ?? '?').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isVisibleOnline(profile?.status) && (
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full ring-[2.5px] ring-card shadow-sm',
                        statusColor(profile?.status),
                      )}
                    />
                  )}
                </div>
              </div>

              {/* Top-right actions */}
              <div className="absolute right-2.5 top-2.5 flex gap-1">
                {isMe ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <label className="flex size-7 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white/85 shadow-md backdrop-blur-md transition-all hover:scale-105 hover:bg-black/60 hover:text-white">
                          <PaletteIcon size={13} />
                          <input type="color" className="sr-only" value={cardColor} onChange={(e) => handleColorChange(e.target.value)} />
                        </label>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-[11px]">Couleur de la carte</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <FriendActionButton
                    status={friendStatus}
                    onAdd={handleAddFriend}
                  />
                )}
              </div>
            </div>

            {/* ── Identity ── */}
            <div className="mt-9 px-4 pb-1">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate font-heading text-base tracking-tight leading-tight text-foreground">{profile.displayName}</h3>
                {profile.isBot && (
                  <Badge
                    variant={profile.isVerifiedBot ? 'default' : 'outline'}
                    className="h-4 shrink-0 px-1 text-[8px] font-bold uppercase tracking-wider"
                  >
                    {profile.isVerifiedBot && (
                      <svg className="mr-0.5 inline size-1.5" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0l2.5 3.5L14.5 2l-1.5 4L16 8l-3.5 2.5L14.5 14l-4-1.5L8 16l-2.5-3.5L1.5 14l1.5-4L0 8l3.5-2.5L1.5 2l4 1.5L8 0z" />
                      </svg>
                    )}
                    BOT
                  </Badge>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                <span className="font-mono">@{profile.username}</span>
                <span className="text-border/60">·</span>
                <span className={cn('flex items-center gap-1 font-medium', statusTextColor(profile.status))}>
                  <span className={cn('size-1.5 rounded-full', statusColor(profile.status))} />
                  {statusLabel(profile.status)}
                </span>
              </p>
            </div>

            {/* ── Badges ── */}
            {visibleBadges.length > 0 && (
              <div className="px-4 pb-2 pt-3">
                <p className="mb-1.5 font-heading text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">Badges</p>
                <div className="flex flex-wrap gap-1">
                  {visibleBadges.map((badge) => (
                    <TooltipProvider key={badge.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-all hover:scale-105 hover:brightness-110"
                            style={{ backgroundColor: badge.color + '15', border: `1px solid ${badge.color}30`, boxShadow: `0 1px 3px ${badge.color}15` }}
                          >
                            <span className="flex size-3.5 shrink-0 items-center justify-center">
                              <BadgeIcon badge={badge} />
                            </span>
                            <span className="text-[10px] font-semibold" style={{ color: badge.color }}>
                              {badge.name}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="text-[10px]">
                          Obtenu le {new Date(badge.earnedAt).toLocaleDateString('fr-FR')}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>
            )}

            <div className="mx-4 my-1 h-px bg-linear-to-r from-transparent via-border/60 to-transparent" />

            {/* ── Bio ── */}
            {profile.bio && (
              <div className="px-4 py-2.5">
                <p className={cn('whitespace-pre-wrap text-[12px] leading-relaxed text-foreground/80', !showFullBio && 'line-clamp-3')}>
                  {profile.bio}
                </p>
                {profile.bio.length > 120 && (
                  <button
                    type="button"
                    className="mt-1 text-[10px] font-semibold text-primary transition-colors hover:text-primary/80"
                    onClick={() => setShowFullBio(v => !v)}
                  >
                    {showFullBio ? 'Réduire' : 'Lire la suite →'}
                  </button>
                )}
              </div>
            )}

            {/* ── Interests ── */}
            {(profile.interests?.length ?? 0) > 0 && (
              <div className="px-4 pb-2.5">
                <div className="flex flex-wrap gap-1">
                  {profile.interests!.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-all hover:scale-105"
                      style={{ backgroundColor: cardColor + '12', color: cardColor, border: `1px solid ${cardColor}25` }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Member since ── */}
            {memberSince && (
              <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-foreground/[0.03] px-2.5 py-1.5 text-[11px] text-muted-foreground/70">
                <CalendarIcon size={12} className="shrink-0 text-muted-foreground/50" />
                <span>Membre depuis</span>
                <span className="ml-auto font-semibold text-foreground/80">{memberSince}</span>
              </div>
            )}

            {/* ── Server roles ── */}
            {serverId && serverRoles.length > 0 && canManageRoles && (
              <div className="px-4 pb-2.5">
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-0.5"
                  onClick={() => setShowRoles(v => !v)}
                >
                  <p className="font-heading text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">Rôles</p>
                  <ShieldCheckIcon size={11} className={cn('text-muted-foreground/40 transition-transform duration-200', showRoles && 'rotate-180')} />
                </button>
                {showRoles && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {serverRoles.map((role) => {
                      const active = memberRoleIds.includes(role.id);
                      return (
                        <button
                          key={role.id}
                          type="button"
                          className={cn(
                            'flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] transition-all',
                            active ? 'opacity-100' : 'opacity-30 hover:opacity-60',
                          )}
                          style={{
                            borderColor: role.color + '40',
                            backgroundColor: active ? role.color + '18' : 'transparent',
                            color: role.color,
                          }}
                          onClick={() => toggleRole(role.id)}
                        >
                          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: role.color }} />
                          {role.name}
                          {active && <CheckIcon size={9} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── DM field ── */}
            {!isMe && (
              <div className="px-4 pb-3 pt-1">
                <button
                  type="button"
                  onClick={handleSendMessage}
                  className="group/dm flex h-9 w-full items-center gap-2 rounded-xl border border-border/40 bg-foreground/[0.03] px-3 text-[12px] text-muted-foreground transition-all duration-150 hover:border-primary/40 hover:bg-primary/8 hover:text-foreground hover:shadow-sm hover:shadow-primary/10"
                >
                  <MessageCircleIcon size={14} className="shrink-0 transition-colors group-hover/dm:text-primary" />
                  <span className="truncate">Envoyer un message à <span className="font-semibold text-foreground/80">@{profile.username}</span></span>
                </button>
              </div>
            )}

            {/* ── Kick / Ban ── */}
            {!isMe && serverId && canKickBan && (
              <>
                <div className="mx-4 h-px bg-linear-to-r from-transparent via-border/60 to-transparent" />
                <div className="flex flex-col gap-1.5 px-4 pb-3 pt-2.5">
                  {!confirmKick && !confirmBan && (
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 flex-1 gap-1.5 rounded-lg text-[11px] font-semibold text-amber-500 hover:bg-amber-500/10 hover:text-amber-500"
                        onClick={() => setConfirmKick(true)}
                      >
                        <UserXIcon size={13} /> Expulser
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 flex-1 gap-1.5 rounded-lg text-[11px] font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setConfirmBan(true)}
                      >
                        <BanIcon size={13} /> Bannir
                      </Button>
                    </div>
                  )}

                  {confirmKick && (
                    <div className="space-y-1.5 rounded-xl border border-amber-500/25 bg-linear-to-br from-amber-500/10 to-amber-500/5 p-2.5 shadow-sm shadow-amber-500/5">
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">
                        Expulser <span className="font-semibold text-foreground">{profile.displayName}</span> du serveur ?
                      </p>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="ghost" className="h-7 flex-1 rounded-md text-[11px]" onClick={() => setConfirmKick(false)}>Annuler</Button>
                        <Button size="sm" className="h-7 flex-1 gap-1 rounded-md bg-amber-500 text-[11px] text-white hover:bg-amber-600" onClick={handleKick}>
                          <UserXIcon size={11} /> Confirmer
                        </Button>
                      </div>
                    </div>
                  )}

                  {confirmBan && (
                    <div className="space-y-1.5 rounded-xl border border-destructive/25 bg-linear-to-br from-destructive/10 to-destructive/5 p-2.5 shadow-sm shadow-destructive/5">
                      <p className="text-[11px] text-destructive">
                        Bannir <span className="font-semibold text-foreground">{profile.displayName}</span> définitivement ?
                      </p>
                      <Input
                        placeholder="Raison (optionnel)"
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        className="h-7 rounded-md border-border/40 bg-background/60 text-[11px]"
                      />
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="ghost" className="h-7 flex-1 rounded-md text-[11px]" onClick={() => { setConfirmBan(false); setBanReason(''); }}>Annuler</Button>
                        <Button size="sm" className="h-7 flex-1 gap-1 rounded-md bg-destructive text-[11px] text-destructive-foreground hover:bg-destructive/90" onClick={handleBan}>
                          <BanIcon size={11} /> Confirmer
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="h-1" />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* ── Friend action button (banner overlay) ─────────────────────────────────── */

function FriendActionButton({ status, onAdd }: { status: FriendStatus; onAdd: () => void }) {
  const config: Record<FriendStatus, { icon: typeof UserPlusIcon; label: string; color: string; disabled: boolean }> = {
    none:             { icon: UserPlusIcon,  label: 'Ajouter en ami',     color: 'text-white/80 hover:text-white', disabled: false },
    friend:           { icon: UserCheckIcon, label: 'Ami',                color: 'text-success',                   disabled: true },
    pending_sent:     { icon: CheckIcon,     label: 'Demande envoyée',   color: 'text-amber-400',                 disabled: true },
    pending_received: { icon: UserPlusIcon,  label: 'Accepter la demande', color: 'text-primary hover:text-primary/80', disabled: false },
  };
  const c = config[status];
  const Icon = c.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon-sm"
            variant="secondary"
            className={cn('size-7 rounded-lg bg-black/40 shadow-md backdrop-blur-md transition-all hover:scale-105 hover:bg-black/60', c.color)}
            disabled={c.disabled}
            onClick={onAdd}
          >
            <Icon size={13} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-[11px]">{c.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
