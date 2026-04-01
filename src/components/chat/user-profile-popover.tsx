'use client';

import { useState, useEffect } from 'react';
import {
  MessageCircleIcon,
  UserPlusIcon,
  UserCheckIcon,
  CalendarIcon,
  CheckIcon,
  ShieldCheckIcon,
  BanIcon,
  UserXIcon,
} from '@/components/icons';
import { api, resolveMediaUrl } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { socketService } from '@/lib/socket';
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
import { cn } from '@/lib/utils';
import { sanitizeSvg } from '@/lib/sanitize';

/* ------------------------------------------------------------------ */

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

const statusConfig: Record<string, { color: string; label: string; dot: string }> = {
  online: { color: 'bg-green-500', label: 'En ligne', dot: 'bg-green-500 shadow-green-500/50' },
  idle: { color: 'bg-yellow-500', label: 'Absent', dot: 'bg-yellow-500 shadow-yellow-500/50' },
  dnd: { color: 'bg-red-500', label: 'Ne pas déranger', dot: 'bg-red-500 shadow-red-500/50' },
  invisible: { color: 'bg-gray-500', label: 'Invisible', dot: 'bg-gray-400 shadow-gray-400/50' },
  offline: { color: 'bg-gray-500', label: 'Hors ligne', dot: 'bg-gray-400 shadow-gray-400/50' },
};

function renderBadgeIcon(badge: UserBadge) {
  const iconKey = badge.iconValue || badge.icon;
  if (badge.iconType === 'svg') {
    return <span dangerouslySetInnerHTML={{ __html: sanitizeSvg(iconKey) }} />;
  }
  return <i className={`bi ${iconKey}`} style={{ color: badge.color, fontSize: '14px' }} />;
}

type FriendStatus = 'none' | 'friend' | 'pending_sent' | 'pending_received';

interface UserProfilePopoverProps {
  userId: string;
  children: React.ReactNode;
  onOpenDM?: (recipientId: string, recipientName: string) => void;
  serverId?: string;
  /** Contrôle externe de l'ouverture (optionnel) */
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}

export function UserProfilePopover({ userId, children, onOpenDM, serverId, open: externalOpen, onOpenChange: externalOnOpenChange }: UserProfilePopoverProps) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = (v: boolean) => { setInternalOpen(v); externalOnOpenChange?.(v); };
  const [loading, setLoading] = useState(false);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('none');

  /* Server role management */
  const [serverRoles, setServerRoles] = useState<Array<{ id: string; name: string; color: string; position: number }>>([]);
  const [memberRoleIds, setMemberRoleIds] = useState<string[]>([]);
  const [showRoles, setShowRoles] = useState(false);
  const [confirmKick, setConfirmKick] = useState(false);
  const [confirmBan, setConfirmBan] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [canManageRoles, setCanManageRoles] = useState(false);
  const [canKickBan, setCanKickBan] = useState(false);

  const isMe = currentUser?.id === userId;

  useEffect(() => {
    if (isOpen && !profile) {
      loadProfile();
      if (!isMe) checkFriendship();
    }
    if (isOpen && serverId) {
      loadServerRoles();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !userId) return;
    const handlePresence = (data: unknown) => {
      const payload = (data as { payload?: Record<string, unknown> })?.payload || data;
      const p = payload as { userId?: string; status?: string };
      if (p?.userId === userId && p?.status) {
        setProfile((prev) => (prev ? { ...prev, status: p.status as string } : prev));
      }
    };
    socketService.onPresenceUpdate(handlePresence);
    return () => socketService.off('PRESENCE_UPDATE', handlePresence);
  }, [isOpen, userId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await api.getUser(userId);
      if (response.success && response.data) {
        setProfile(response.data as UserProfileData);
      }
    } catch (e) {
      console.error('Erreur chargement profil:', e);
    }
    setLoading(false);
  };

  const checkFriendship = async () => {
    try {
      const friendsRes = await api.getFriends();
      if (friendsRes.success && Array.isArray(friendsRes.data)) {
        const isFriend = friendsRes.data.some((f: any) => f.id === userId);
        if (isFriend) { setFriendStatus('friend'); return; }
      }
      const reqRes = await api.getFriendRequests();
      if (reqRes.success && reqRes.data) {
        const data = reqRes.data as any;
        const sent = data.sent || [];
        const received = data.received || [];
        if (sent.some((r: any) => r.receiverId === userId || r.id === userId)) { setFriendStatus('pending_sent'); return; }
        if (received.some((r: any) => r.senderId === userId || r.id === userId)) { setFriendStatus('pending_received'); return; }
      }
      setFriendStatus('none');
    } catch {
      setFriendStatus('none');
    }
  };

  const loadServerRoles = () => {
    if (!serverId) return;
    socketService.requestRoles(serverId, (roleData: any) => {
      const rawRoles = (roleData?.roles || []).map((r: any) => ({
        id: r.id, name: r.name, color: r.color || '#99AAB5', position: r.position || 0, permissions: r.permissions,
      }));
      rawRoles.sort((a: any, b: any) => b.position - a.position);
      setServerRoles(rawRoles);

      socketService.requestMembers(serverId, (memberData: any) => {
        const members = memberData?.members || [];
        const member = members.find((m: any) => (m.userId || m.user_id || m.id) === userId);
        if (member) {
          let roleIds = member.roleIds || member.role_ids || [];
          if (typeof roleIds === 'string') { try { roleIds = JSON.parse(roleIds); } catch { roleIds = []; } }
          setMemberRoleIds(roleIds);
        }
        const currentMember = members.find((m: any) => (m.userId || m.user_id || m.id) === currentUser?.id);
        if (!currentMember) return;
        let myRoleIds = currentMember.roleIds || currentMember.role_ids || [];
        if (typeof myRoleIds === 'string') { try { myRoleIds = JSON.parse(myRoleIds); } catch { myRoleIds = []; } }
        let combinedPerms = 0;
        for (const role of rawRoles) {
          if (myRoleIds.includes(role.id)) {
            const perms = (role as any).permissions;
            if (Array.isArray(perms)) {
              for (const p of perms) {
                if (p === 'ADMIN') combinedPerms |= 0x40;
                if (p === 'MANAGE_ROLES') combinedPerms |= 0x100;
                if (p === 'KICK') combinedPerms |= 0x10;
                if (p === 'BAN') combinedPerms |= 0x20;
              }
            } else {
              const p = typeof perms === 'number' ? perms : parseInt(String(perms) || '0', 10);
              combinedPerms |= p;
            }
          }
        }
        const isAdmin = !!(combinedPerms & 0x40);
        setCanManageRoles(isAdmin || !!(combinedPerms & 0x100));
        setCanKickBan(isAdmin || !!((combinedPerms & 0x10) || (combinedPerms & 0x20)));
        socketService.requestServerInfo(serverId, (serverData: any) => {
          const ownerId = serverData?.ownerId || serverData?.owner_id;
          if (ownerId === currentUser?.id) { setCanManageRoles(true); setCanKickBan(true); }
        });
      });
    });
  };

  const toggleRole = (roleId: string) => {
    if (!serverId) return;
    const newRoleIds = memberRoleIds.includes(roleId)
      ? memberRoleIds.filter((id) => id !== roleId)
      : [...memberRoleIds, roleId];
    setMemberRoleIds(newRoleIds);
    socketService.updateMember(serverId, userId, { roleIds: newRoleIds });
  };

  const handleSendMessage = () => {
    if (profile && onOpenDM) {
      onOpenDM(profile.id, profile.displayName || profile.username);
      setIsOpen(false);
    }
  };

  const handleKick = () => {
    if (!serverId) return;
    socketService.kickMember(serverId, userId);
    setConfirmKick(false);
    setIsOpen(false);
  };

  const handleBan = () => {
    if (!serverId) return;
    socketService.banMember(serverId, userId, banReason || undefined);
    setConfirmBan(false);
    setBanReason('');
    setIsOpen(false);
  };

  const handleAddFriend = async () => {
    try {
      await api.sendFriendRequest(profile?.username || '');
      setFriendStatus('pending_sent');
    } catch (e) {
      console.error('Erreur envoi demande ami:', e);
    }
  };

  const status = statusConfig[profile?.status || 'offline'] ?? statusConfig.offline;
  const cardColor = profile?.cardColor || '#5865F2';
  const badgeColor = ({ online: 'success', idle: 'warning', dnd: 'danger' } as Record<string, 'success' | 'warning' | 'danger'>)[profile?.status || ''];

  const createdDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const memberSince = profile?.createdAt
    ? (() => {
        const created = new Date(profile.createdAt);
        const now = new Date();
        const diffMs = now.getTime() - created.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 30) return `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
        if (diffDays < 365) { const months = Math.floor(diffDays / 30); return `${months} mois`; }
        const years = Math.floor(diffDays / 365);
        const remainingMonths = Math.floor((diffDays % 365) / 30);
        return remainingMonths > 0
          ? `${years} an${years > 1 ? 's' : ''} et ${remainingMonths} mois`
          : `${years} an${years > 1 ? 's' : ''}`;
      })()
    : null;

  const visibleBadges =
    profile?.showBadges !== false && profile?.badges ? profile.badges.slice(0, 6) : [];

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={setIsOpen}
    >
      <Popover.Trigger>{children}</Popover.Trigger>
      <Popover.Content placement="right" shouldFlip offset={8} className="w-[300px] overflow-hidden rounded-2xl border border-[var(--border)]/20 bg-[var(--surface)] p-0 shadow-2xl">
        {loading || !profile ? (
          /* ── Skeleton ── */
          <div className="flex flex-col">
            <Skeleton className="h-[88px] w-full rounded-none" />
            <div className="px-4 -mt-10 mb-2 flex items-end justify-between">
              <Skeleton className="size-[72px] rounded-full ring-4 ring-[var(--surface)]" />
            </div>
            <div className="space-y-2 px-4 pb-4">
              <Skeleton className="h-[14px] w-32 rounded-lg" />
              <Skeleton className="h-3 w-20 rounded-lg" />
              <Skeleton className="h-3 w-full mt-3 rounded-lg" />
              <Skeleton className="h-3 w-3/4 rounded-lg" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col">

            {/* ── Banner ── */}
            <div className="relative h-[88px] shrink-0 overflow-hidden">
              {profile.bannerUrl ? (
                <img src={resolveMediaUrl(profile.bannerUrl)} alt="" className="size-full object-cover" />
              ) : (
                <div
                  className="size-full"
                  style={{
                    background: `linear-gradient(160deg, ${cardColor} 0%, ${cardColor}bb 40%, ${cardColor}44 100%)`,
                  }}
                />
              )}
              {/* bottom fade into card bg */}
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[var(--surface)] to-transparent" />
            </div>

            {/* ── Avatar row ── */}
            <div className="flex items-end justify-between px-4 -mt-10 mb-2">
              <Badge.Anchor>
                <Avatar
                  className="size-[72px] ring-4 ring-[var(--surface)] shadow-lg"
                  style={{ backgroundColor: cardColor + '25', color: cardColor }}
                >
                  <Avatar.Image src={resolveMediaUrl(profile.avatarUrl)} />
                  <Avatar.Fallback className="text-2xl font-bold">
                    {profile.displayName?.[0]?.toUpperCase() || '?'}
                  </Avatar.Fallback>
                </Avatar>
                {badgeColor && (
                  <Badge color={badgeColor} placement="bottom-right" size="sm" />
                )}
              </Badge.Anchor>

              {!isMe && (
                <div className="flex items-center gap-1.5">
                  <Tooltip delay={0}>
                    <Button
                      isIconOnly size="sm"
                      className="size-8 rounded-full text-white shadow-md"
                      style={{ backgroundColor: cardColor }}
                      onPress={handleSendMessage}
                    >
                      <MessageCircleIcon size={15} />
                    </Button>
                    <Tooltip.Content showArrow><Tooltip.Arrow /><p className="text-xs">Message</p></Tooltip.Content>
                  </Tooltip>

                  {friendStatus === 'none' && (
                    <Tooltip delay={0}>
                      <Button isIconOnly size="sm" variant="secondary" className="size-8 rounded-full" onPress={handleAddFriend}>
                        <UserPlusIcon size={14} />
                      </Button>
                      <Tooltip.Content showArrow><Tooltip.Arrow /><p className="text-xs">Ajouter en ami</p></Tooltip.Content>
                    </Tooltip>
                  )}
                  {friendStatus === 'friend' && (
                    <Tooltip delay={0}>
                      <Button isIconOnly size="sm" variant="secondary" className="size-8 rounded-full text-green-500" isDisabled>
                        <UserCheckIcon size={14} />
                      </Button>
                      <Tooltip.Content showArrow><Tooltip.Arrow /><p className="text-xs">Déjà ami</p></Tooltip.Content>
                    </Tooltip>
                  )}
                  {friendStatus === 'pending_sent' && (
                    <Tooltip delay={0}>
                      <Button isIconOnly size="sm" variant="secondary" className="size-8 rounded-full text-yellow-500" isDisabled>
                        <CheckIcon size={14} />
                      </Button>
                      <Tooltip.Content showArrow><Tooltip.Arrow /><p className="text-xs">Demande envoyée</p></Tooltip.Content>
                    </Tooltip>
                  )}
                  {friendStatus === 'pending_received' && (
                    <Tooltip delay={0}>
                      <Button isIconOnly size="sm" variant="secondary" className="size-8 rounded-full text-blue-400" onPress={handleAddFriend}>
                        <UserPlusIcon size={14} />
                      </Button>
                      <Tooltip.Content showArrow><Tooltip.Arrow /><p className="text-xs">Accepter</p></Tooltip.Content>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>

            {/* ── Name / username / status ── */}
            <div className="px-4 pb-3">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-base font-bold leading-tight">{profile.displayName}</h3>
                {profile.isBot && (
                  <span className={cn(
                    'shrink-0 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-bold uppercase',
                    profile.isVerifiedBot
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-[var(--muted)]/15 text-[var(--muted)] border border-[var(--muted)]/30',
                  )}>
                    {profile.isVerifiedBot && <svg className="size-2.5" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0l2.5 3.5L14.5 2l-1.5 4L16 8l-3.5 2.5L14.5 14l-4-1.5L8 16l-2.5-3.5L1.5 14l1.5-4L0 8l3.5-2.5L1.5 2l4 1.5L8 0z"/></svg>}
                    BOT
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--muted)]">@{profile.username}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className={cn('size-2 shrink-0 rounded-full shadow-sm', status.dot)} />
                <span className="text-xs text-[var(--muted)]">{status.label}</span>
              </div>
            </div>

            {/* ── Separator ── */}
            <div className="mx-4"><Separator /></div>

            {/* ── Body ── */}
            <div className="flex flex-col gap-3 px-4 py-3">

              {/* Badges */}
              {visibleBadges.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]/50">Badges</p>
                  <div className="flex flex-wrap gap-1.5">
                    {visibleBadges.map((badge) => (
                      <Tooltip key={badge.id} delay={0}>
                        <button
                          type="button"
                          className="flex size-7 items-center justify-center rounded-lg transition-all hover:scale-110 hover:brightness-110"
                          style={{ backgroundColor: badge.color + '18', border: `1px solid ${badge.color}35` }}
                        >
                          {renderBadgeIcon(badge)}
                        </button>
                        <Tooltip.Content showArrow>
                          <Tooltip.Arrow />
                          <p className="text-xs font-semibold">{badge.name}</p>
                          <p className="text-[10px] opacity-60">Obtenu le {new Date(badge.earnedAt).toLocaleDateString('fr-FR')}</p>
                        </Tooltip.Content>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )}

              {/* Bio */}
              {profile.bio && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]/50">À propos</p>
                  <p className="whitespace-pre-wrap text-[13px] leading-snug text-[var(--foreground)]/80">{profile.bio}</p>
                </div>
              )}

              {/* Interests */}
              {profile.interests && profile.interests.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]/50">Intérêts</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.interests.map((interest) => (
                      <span
                        key={interest}
                        className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{ backgroundColor: cardColor + '18', color: cardColor, border: `1px solid ${cardColor}30` }}
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Member since */}
              <div className="flex items-center gap-2 text-[12px]">
                <CalendarIcon size={13} className="shrink-0 text-[var(--muted)]" />
                <span className="text-[var(--muted)]">Membre depuis</span>
                <span className="ml-auto font-semibold text-[var(--foreground)]/80">{memberSince}</span>
              </div>

              {/* Server roles */}
              {serverId && serverRoles.length > 0 && canManageRoles && (
                <div>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between"
                    onClick={() => setShowRoles((v) => !v)}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]/50">Rôles</p>
                    <ShieldCheckIcon size={12} className={cn('text-[var(--muted)] transition-transform', showRoles && 'rotate-180')} />
                  </button>
                  {showRoles && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {serverRoles.map((role: any) => {
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
                              borderColor: role.color || '#888',
                              backgroundColor: active ? (role.color || '#888') + '20' : 'transparent',
                              color: role.color || '#888',
                            }}
                            onClick={() => toggleRole(role.id)}
                          >
                            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: role.color || '#888' }} />
                            {role.name}
                            {active && <CheckIcon size={10} />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Kick / Ban ── */}
            {!isMe && serverId && canKickBan && (
              <>
                <div className="mx-4"><Separator /></div>
                <div className="flex flex-col gap-2 px-4 pb-3 pt-2">
                  {!confirmKick && !confirmBan && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 gap-1.5 rounded-full text-[11px] text-orange-400 border-orange-400/30 hover:bg-orange-500/10" onPress={() => setConfirmKick(true)}>
                        <UserXIcon size={13} />Expulser
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 gap-1.5 rounded-full text-[11px] text-red-400 border-red-400/30 hover:bg-red-500/10" onPress={() => setConfirmBan(true)}>
                        <BanIcon size={13} />Bannir
                      </Button>
                    </div>
                  )}
                  {confirmKick && (
                    <div className="space-y-2 rounded-xl border border-orange-500/20 bg-orange-500/5 p-2.5">
                      <p className="text-[11px] text-orange-300">Expulser {profile?.displayName} ?</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="flex-1 rounded-xl text-[11px]" onPress={() => setConfirmKick(false)}>Annuler</Button>
                        <Button size="sm" className="flex-1 gap-1 rounded-xl text-[11px] bg-orange-600 hover:bg-orange-500" onPress={handleKick}>
                          <UserXIcon size={11} />Confirmer
                        </Button>
                      </div>
                    </div>
                  )}
                  {confirmBan && (
                    <div className="space-y-2 rounded-xl border border-red-500/20 bg-red-500/5 p-2.5">
                      <p className="text-[11px] text-red-300">Bannir {profile?.displayName} ?</p>
                      <InputGroup className="h-7 rounded-xl border-[var(--border)]/50" variant="secondary">
                        <InputGroup.Input placeholder="Raison (optionnel)" value={banReason} onChange={(e) => setBanReason(e.target.value)} className="text-[11px]" />
                      </InputGroup>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="flex-1 rounded-xl text-[11px]" onPress={() => { setConfirmBan(false); setBanReason(''); }}>Annuler</Button>
                        <Button size="sm" className="flex-1 gap-1 rounded-xl text-[11px] bg-red-600 hover:bg-red-500" onPress={handleBan}>
                          <BanIcon size={11} />Confirmer
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
      </Popover.Content>
    </Popover>
  );
}
