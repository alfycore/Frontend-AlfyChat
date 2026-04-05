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
import { sanitizeSvg } from '@/lib/sanitize';
import { cn } from '@/lib/utils';
import {
  Avatar,
  Badge,
  Button,
  Chip,
  InputGroup,
  Popover,
  Separator,
  Skeleton,
  Tooltip,
} from '@heroui/react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserBadge {
  id: string;
  name: string;
  icon: string;
  iconType?: 'bootstrap' | 'svg';
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

const STATUS = {
  online:    { label: 'En ligne',          badge: 'success' as const, text: 'text-green-500'  },
  idle:      { label: 'Absent',            badge: 'warning' as const, text: 'text-yellow-500' },
  dnd:       { label: 'Ne pas déranger',   badge: 'danger'  as const, text: 'text-red-500'    },
  invisible: { label: 'Invisible',         badge: undefined,          text: 'text-gray-400'   },
  offline:   { label: 'Hors ligne',        badge: undefined,          text: 'text-gray-400'   },
} as const;

function getStatus(s: string) {
  return STATUS[s as keyof typeof STATUS] ?? STATUS.offline;
}

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
  if (badge.iconType === 'svg') return <span dangerouslySetInnerHTML={{ __html: sanitizeSvg(val) }} />;
  return <i className={`bi ${val}`} style={{ color: badge.color, fontSize: 14 }} />;
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
  useEffect(() => {
    if (!isOpen) return;
    if (!profile) loadProfile();
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
  const statusInfo   = getStatus(profile?.status ?? 'offline');
  const visibleBadges = profile?.showBadges !== false ? (profile?.badges ?? []).slice(0, 6) : [];
  const memberSince  = profile?.createdAt ? formatMemberSince(profile.createdAt) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger>{children}</Popover.Trigger>

      <Popover.Content
        placement="left"
        shouldFlip
        offset={8}
        className="w-[320px] overflow-hidden rounded-2xl border border-(--border)/40 bg-background p-0 shadow-2xl"
      >
        {loading || !profile ? (
          /* ── Skeleton ── */
          <div className="flex flex-col">
            <Skeleton className="h-24 w-full rounded-none" />
            <div className="-mt-8 mb-2 px-4">
              <Skeleton className="size-16 rounded-full ring-4 ring-background" />
            </div>
            <div className="space-y-2 px-4 pb-4">
              <Skeleton className="h-4 w-32 rounded-lg" />
              <Skeleton className="h-3 w-20 rounded-lg" />
              <Skeleton className="mt-3 h-3 w-full rounded-lg" />
              <Skeleton className="h-3 w-3/4 rounded-lg" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col">

            {/* ── Banner + avatar block ── */}
            <div className="relative">
              {/* Banner */}
              <div className="h-24 w-full overflow-hidden">
                {profile.bannerUrl
                  ? <img src={resolveMediaUrl(profile.bannerUrl)} alt="" className="size-full object-cover" />
                  : <div
                      className="size-full"
                      style={{ background: `linear-gradient(135deg, ${cardColor}dd 0%, ${cardColor}66 60%, ${cardColor}22 100%)` }}
                    />
                }
              </div>

              {/* Avatar */}
              <div className="absolute -bottom-7 left-4">
                <Badge.Anchor>
                  <Avatar className="size-14.5 ring-[3px] ring-background">
                    <Avatar.Image src={resolveMediaUrl(profile.avatarUrl)} alt={profile.displayName} />
                    <Avatar.Fallback
                      className="text-xl font-bold"
                      style={{ backgroundColor: cardColor + '30', color: cardColor }}
                    >
                      {(profile.displayName?.[0] ?? '?').toUpperCase()}
                    </Avatar.Fallback>
                  </Avatar>
                  {statusInfo.badge && (
                    <Badge color={statusInfo.badge} placement="bottom-right" size="sm" />
                  )}
                </Badge.Anchor>
              </div>

              {/* Action buttons — top right */}
              <div className="absolute right-2.5 top-2.5 flex gap-1">
                {isMe ? (
                  <Tooltip delay={0}>
                    <label className="flex size-7 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60">
                      <PaletteIcon size={13} />
                      <input type="color" className="sr-only" value={cardColor} onChange={(e) => handleColorChange(e.target.value)} />
                    </label>
                    <Tooltip.Content showArrow placement="left">
                      <Tooltip.Arrow />
                      <p className="text-xs">Couleur de la carte</p>
                    </Tooltip.Content>
                  </Tooltip>
                ) : (
                  <>
                    {friendStatus === 'none' && (
                      <Tooltip delay={0}>
                        <Button isIconOnly size="sm" variant="secondary" className="size-7 rounded-lg bg-black/40 text-white backdrop-blur-sm hover:bg-black/60" onPress={handleAddFriend}>
                          <UserPlusIcon size={13} />
                        </Button>
                        <Tooltip.Content showArrow placement="left"><Tooltip.Arrow /><p className="text-xs">Ajouter en ami</p></Tooltip.Content>
                      </Tooltip>
                    )}
                    {friendStatus === 'friend' && (
                      <Tooltip delay={0}>
                        <Button isIconOnly size="sm" variant="secondary" className="size-7 rounded-lg bg-black/40 text-green-400 backdrop-blur-sm" isDisabled>
                          <UserCheckIcon size={13} />
                        </Button>
                        <Tooltip.Content showArrow placement="left"><Tooltip.Arrow /><p className="text-xs">Ami</p></Tooltip.Content>
                      </Tooltip>
                    )}
                    {friendStatus === 'pending_sent' && (
                      <Tooltip delay={0}>
                        <Button isIconOnly size="sm" variant="secondary" className="size-7 rounded-lg bg-black/40 text-yellow-400 backdrop-blur-sm" isDisabled>
                          <CheckIcon size={13} />
                        </Button>
                        <Tooltip.Content showArrow placement="left"><Tooltip.Arrow /><p className="text-xs">Demande envoyée</p></Tooltip.Content>
                      </Tooltip>
                    )}
                    {friendStatus === 'pending_received' && (
                      <Tooltip delay={0}>
                        <Button isIconOnly size="sm" variant="secondary" className="size-7 rounded-lg bg-black/40 text-blue-400 backdrop-blur-sm hover:bg-black/60" onPress={handleAddFriend}>
                          <UserPlusIcon size={13} />
                        </Button>
                        <Tooltip.Content showArrow placement="left"><Tooltip.Arrow /><p className="text-xs">Accepter la demande</p></Tooltip.Content>
                      </Tooltip>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── Identity ── */}
            <div className="mt-9 px-4 pb-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-[15px] font-bold leading-tight">{profile.displayName}</h3>
                {profile.isBot && (
                  <Chip
                    size="sm"
                    variant="soft"
                    color={profile.isVerifiedBot ? 'accent' : 'default'}
                    className="h-4.5 px-1.5 text-[9px] font-bold uppercase tracking-wide"
                  >
                    {profile.isVerifiedBot && (
                      <svg className="mr-0.5 inline size-2" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0l2.5 3.5L14.5 2l-1.5 4L16 8l-3.5 2.5L14.5 14l-4-1.5L8 16l-2.5-3.5L1.5 14l1.5-4L0 8l3.5-2.5L1.5 2l4 1.5L8 0z" />
                      </svg>
                    )}
                    BOT
                  </Chip>
                )}
              </div>
              <p className="text-[12px] text-muted">
                @{profile.username}
                <span className="mx-1 opacity-40">·</span>
                <span className={statusInfo.text}>{statusInfo.label}</span>
              </p>
            </div>

            {/* ── Badges ── */}
            {visibleBadges.length > 0 && (
              <div className="px-4 pb-3 pt-2">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-(--muted)/60">Badges</p>
                <div className="flex flex-wrap gap-1.5">
                  {visibleBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="group relative flex items-center gap-1.5 rounded-xl px-2 py-1 transition-all hover:scale-[1.03]"
                      style={{
                        backgroundColor: badge.color + '18',
                        border: `1px solid ${badge.color}35`,
                      }}
                    >
                      {/* Icon */}
                      <span className="flex size-4.5 shrink-0 items-center justify-center">
                        <BadgeIcon badge={badge} />
                      </span>
                      {/* Name always visible */}
                      <span className="text-[11px] font-semibold" style={{ color: badge.color }}>
                        {badge.name}
                      </span>
                      {/* Date on hover */}
                      <span className="pointer-events-none absolute -top-7 left-0 z-10 whitespace-nowrap rounded-lg bg-surface px-2 py-1 text-[10px] text-muted opacity-0 shadow-lg ring-1 ring-(--border)/30 transition-opacity group-hover:opacity-100">
                        Obtenu le {new Date(badge.earnedAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Divider ── */}
            <div className="mx-4"><Separator /></div>

            {/* ── Bio ── */}
            {profile.bio && (
              <div className="px-4 py-2.5">
                <p className={cn('whitespace-pre-wrap text-[12.5px] leading-relaxed text-(--foreground)/80', !showFullBio && 'line-clamp-3')}>
                  {profile.bio}
                </p>
                {profile.bio.length > 120 && (
                  <button
                    type="button"
                    className="mt-1 text-[11px] font-medium text-(--accent) hover:underline"
                    onClick={() => setShowFullBio(v => !v)}
                  >
                    {showFullBio ? 'Réduire' : 'Lire la suite'}
                  </button>
                )}
              </div>
            )}

            {/* ── Interests ── */}
            {(profile.interests?.length ?? 0) > 0 && (
              <div className="px-4 pb-2.5">
                <div className="flex flex-wrap gap-1">
                  {profile.interests!.map((tag) => (
                    <Chip
                      key={tag}
                      size="sm"
                      variant="soft"
                      className="h-5 rounded-full text-[11px] font-medium"
                      style={{ backgroundColor: cardColor + '18', color: cardColor, border: `1px solid ${cardColor}30` }}
                    >
                      {tag}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            {/* ── Member since ── */}
            {memberSince && (
              <div className="flex items-center gap-2 px-4 pb-2.5 text-[11.5px] text-muted">
                <CalendarIcon size={12} className="shrink-0 opacity-60" />
                <span>Membre depuis</span>
                <span className="ml-auto font-semibold text-(--foreground)/70">{memberSince}</span>
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
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-(--muted)/50">Rôles</p>
                  <ShieldCheckIcon size={12} className={cn('text-muted transition-transform duration-200', showRoles && 'rotate-180')} />
                </button>
                {showRoles && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {serverRoles.map((role) => {
                      const active = memberRoleIds.includes(role.id);
                      return (
                        <button
                          key={role.id}
                          type="button"
                          className={cn(
                            'flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] transition-all',
                            active ? 'opacity-100' : 'opacity-40 hover:opacity-70',
                          )}
                          style={{
                            borderColor: role.color,
                            backgroundColor: active ? role.color + '20' : 'transparent',
                            color: role.color,
                          }}
                          onClick={() => toggleRole(role.id)}
                        >
                          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: role.color }} />
                          {role.name}
                          {active && <CheckIcon size={10} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Divider ── */}
            <div className="mx-4"><Separator /></div>

            {/* ── DM field ── */}
            {!isMe && (
              <div className="px-4 pb-3 pt-2.5">
                <InputGroup variant="secondary" className="h-9 rounded-xl">
                  <InputGroup.Input
                    placeholder={`Envoyer un message à @${profile.username}`}
                    className="cursor-pointer text-[12px]"
                    readOnly
                    onClick={handleSendMessage}
                    onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSendMessage(); }}
                  />
                  <div className="flex shrink-0 items-center pr-1">
                    <Button isIconOnly size="sm" variant="ghost" className="size-7 rounded-lg text-muted" onPress={handleSendMessage}>
                      <SmileIcon size={14} />
                    </Button>
                  </div>
                </InputGroup>
              </div>
            )}

            {/* ── Kick / Ban ── */}
            {!isMe && serverId && canKickBan && (
              <>
                <div className="mx-4"><Separator /></div>
                <div className="flex flex-col gap-2 px-4 pb-3 pt-2.5">
                  {!confirmKick && !confirmBan && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 gap-1.5 rounded-xl border-orange-400/30 text-[11px] text-orange-400 hover:bg-orange-500/10" onPress={() => setConfirmKick(true)}>
                        <UserXIcon size={13} /> Expulser
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 gap-1.5 rounded-xl border-red-400/30 text-[11px] text-red-400 hover:bg-red-500/10" onPress={() => setConfirmBan(true)}>
                        <BanIcon size={13} /> Bannir
                      </Button>
                    </div>
                  )}

                  {confirmKick && (
                    <div className="space-y-2 rounded-xl border border-orange-500/20 bg-orange-500/5 p-2.5">
                      <p className="text-[11px] text-orange-300">Expulser <span className="font-semibold">{profile.displayName}</span> du serveur ?</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="flex-1 rounded-xl text-[11px]" onPress={() => setConfirmKick(false)}>Annuler</Button>
                        <Button size="sm" className="flex-1 gap-1 rounded-xl bg-orange-600 text-[11px] hover:bg-orange-500" onPress={handleKick}>
                          <UserXIcon size={11} /> Confirmer
                        </Button>
                      </div>
                    </div>
                  )}

                  {confirmBan && (
                    <div className="space-y-2 rounded-xl border border-red-500/20 bg-red-500/5 p-2.5">
                      <p className="text-[11px] text-red-300">Bannir <span className="font-semibold">{profile.displayName}</span> définitivement ?</p>
                      <InputGroup variant="secondary" className="h-7 rounded-xl border-(--border)/50">
                        <InputGroup.Input
                          placeholder="Raison (optionnel)"
                          value={banReason}
                          onChange={(e) => setBanReason(e.target.value)}
                          className="text-[11px]"
                        />
                      </InputGroup>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="flex-1 rounded-xl text-[11px]" onPress={() => { setConfirmBan(false); setBanReason(''); }}>Annuler</Button>
                        <Button size="sm" className="flex-1 gap-1 rounded-xl bg-red-600 text-[11px] hover:bg-red-500" onPress={handleBan}>
                          <BanIcon size={11} /> Confirmer
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="h-1.5" />
          </div>
        )}
      </Popover.Content>
    </Popover>
  );
}
