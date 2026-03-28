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
}

export function UserProfilePopover({ userId, children, onOpenDM, serverId }: UserProfilePopoverProps) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
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
      <Popover.Content placement="right top" offset={8} className="w-80 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl">
        {loading || !profile ? (
          /* ──── Skeleton ──── */
          <div className="space-y-3 p-4">
            <Skeleton className="h-20 w-full rounded-xl" />
            <div className="flex items-end gap-3 -mt-6 px-1">
              <Skeleton className="size-14 shrink-0 rounded-full ring-4 ring-[var(--background)]" />
              <div className="flex-1 space-y-1.5 pt-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="space-y-1.5 pt-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* ──── Banner ──── */}
            <div className="relative h-20 overflow-hidden">
              {profile.bannerUrl ? (
                <img
                  src={resolveMediaUrl(profile.bannerUrl)}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <div
                  className="size-full"
                  style={{
                    background: `linear-gradient(145deg, ${cardColor}, ${cardColor}80, ${cardColor}40)`,
                  }}
                />
              )}
              {/* Gradient overlay for readability */}
              <div className="absolute inset-0 bg-linear-to-b from-black/10 via-transparent to-background/80" />

              {/* Status pill on banner */}
              <div className="absolute right-2.5 top-2.5">
                <div
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md',
                    'bg-black/30 text-white/90',
                  )}
                >
                  <span className={cn('size-1.5 rounded-full', status.dot)} />
                  {status.label}
                </div>
              </div>
            </div>

            {/* ──── Avatar row ──── */}
            <div className="relative px-4">
              <div
                className="-mt-9 inline-block rounded-full p-0.75"
                style={{
                  background: `linear-gradient(135deg, ${cardColor}, ${cardColor}60)`,
                }}
              >
                <div className="relative rounded-full bg-[var(--background)] p-0.5">
                  <Avatar
                    className="size-16"
                    style={{ backgroundColor: cardColor + '20', color: cardColor }}
                  >
                    <Avatar.Image src={resolveMediaUrl(profile.avatarUrl)} />
                    <Avatar.Fallback className="text-xl font-bold">
                      {profile.displayName?.[0]?.toUpperCase() || '?'}
                    </Avatar.Fallback>
                  </Avatar>
                  <span
                    className={cn(
                      'absolute bottom-0 right-0 size-4 rounded-full border-[2.5px] border-[var(--background)] shadow-sm',
                      status.dot,
                    )}
                  />
                </div>
              </div>
            </div>

            {/* ──── Identity ──── */}
            <div className="space-y-3 px-4   pb-1">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-[15px] font-bold leading-tight">
                    {profile.displayName}
                  </h3>
                  {profile.isBot && (
                    <span className={cn(
                      'inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-bold uppercase leading-none',
                      profile.isVerifiedBot
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : 'bg-[var(--muted)]/15 text-[var(--muted)] border border-[var(--muted)]/30'
                    )}>
                      {profile.isVerifiedBot && (
                        <svg className="size-2.5" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 0l2.5 3.5L14.5 2l-1.5 4L16 8l-3.5 2.5L14.5 14l-4-1.5L8 16l-2.5-3.5L1.5 14l1.5-4L0 8l3.5-2.5L1.5 2l4 1.5L8 0z"/>
                        </svg>
                      )}
                      BOT
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--muted)]">@{profile.username}</p>
              </div>

              {/* ──── Badges ──── */}
              {visibleBadges.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {visibleBadges.map((badge) => (
                    <Tooltip key={badge.id} delay={0}>
                      <button
                        type="button"
                        className="flex size-7 items-center justify-center rounded-xl transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={{
                          backgroundColor: badge.color + '15',
                          border: `1px solid ${badge.color}30`,
                        }}
                      >
                        {renderBadgeIcon(badge)}
                      </button>
                      <Tooltip.Content>
                        <div className="text-center">
                          <p className="text-xs font-semibold">{badge.name}</p>
                          <p className="text-[10px] text-[var(--muted)]">
                            Obtenu le{' '}
                            {new Date(badge.earnedAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </Tooltip.Content>
                    </Tooltip>
                  ))}
                </div>
              )}
            </div>

            <div className="mx-4">
              <Separator />
            </div>

            {/* ──── Content sections ──── */}
            <div className="space-y-2.5 px-4 py-3">
              {/* Bio */}
              {profile.bio && (
                <div className="rounded-xl bg-[var(--surface-secondary)]/60 px-3 py-2.5">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/60">
                    À propos
                  </p>
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--foreground)]/85">
                    {profile.bio}
                  </p>
                </div>
              )}

              {/* Infos */}
              <div className="rounded-xl bg-[var(--surface-secondary)]/60 px-3 py-2.5">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/60">
                  Informations
                </p>
                <div className="flex items-center gap-2 text-[12px]">
                  <div
                    className="flex size-5 items-center justify-center rounded-md"
                    style={{ backgroundColor: cardColor + '20' }}
                  >
                    <CalendarIcon size={12} style={{ color: cardColor }} />
                  </div>
                  <span className="text-[var(--muted)]">Membre depuis</span>
                  <span className="ml-auto font-semibold text-[var(--foreground)]/90">{memberSince}</span>
                </div>
                {createdDate && (
                  <p className="mt-0.5 pl-7 text-[10px] text-[var(--muted)]">
                    Inscrit le {createdDate}
                  </p>
                )}
              </div>

              {/* ──── Server roles ──── */}
              {serverId && serverRoles.length > 0 && canManageRoles && (
                <div className="rounded-xl bg-[var(--surface-secondary)]/60 px-3 py-2.5">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between"
                    onClick={() => setShowRoles((v) => !v)}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/60">
                      Rôles
                    </p>
                    <ShieldCheckIcon size={13}
                      className={cn(
                        'text-[var(--muted)] transition-transform',
                        showRoles && 'rotate-180',
                      )} />
                  </button>
                  {showRoles && (
                    <div className="mt-2 flex flex-col gap-1">
                      {serverRoles.map((role: any) => {
                        const active = memberRoleIds.includes(role.id);
                        return (
                          <button
                            key={role.id}
                            type="button"
                            className={cn(
                              'flex items-center gap-2 rounded-xl px-2 py-1.5 text-[11px] transition-colors',
                              active
                                ? 'bg-[var(--surface-secondary)]/10 text-[var(--foreground)]'
                                : 'text-[var(--muted)] hover:bg-surface-tertiary',
                            )}
                            onClick={() => toggleRole(role.id)}
                          >
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: role.color || '#888' }}
                            />
                            <span className="flex-1 truncate text-left">{role.name}</span>
                            {active && (
                              <CheckIcon size={11}
                                className="text-green-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ──── Actions ──── */}
            {!isMe && (
              <>
                <div className="mx-4">
                  <Separator />
                </div>
                <div className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5 rounded-xl text-xs font-semibold"
                      onPress={handleSendMessage}
                      style={{ backgroundColor: cardColor, color: '#fff' }}
                    >
                      <MessageCircleIcon size={14} />
                      Message
                    </Button>
                    {friendStatus === 'friend' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 rounded-xl text-[11px] text-green-500 border-green-500/30"
                        isDisabled
                      >
                        <UserCheckIcon size={13} />
                        Ami
                      </Button>
                    ) : friendStatus === 'pending_sent' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 rounded-xl text-[11px] text-yellow-500 border-yellow-500/30"
                        isDisabled
                      >
                        <CheckIcon size={13} />
                        En attente
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 rounded-xl text-[11px]"
                        onPress={handleAddFriend}
                      >
                        <UserPlusIcon size={13} />
                        Ajouter
                      </Button>
                    )}
                  </div>

                  {/* Kick / Ban */}
                  {serverId && canKickBan && (
                    <>
                      {!confirmKick && !confirmBan && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-1.5 rounded-xl text-[11px] text-orange-400 border-orange-400/25 hover:bg-orange-500/10"
                            onPress={() => setConfirmKick(true)}
                          >
                            <UserXIcon size={13} />
                            Expulser
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-1.5 rounded-xl text-[11px] text-red-400 border-red-400/25 hover:bg-red-500/10"
                            onPress={() => setConfirmBan(true)}
                          >
                            <BanIcon size={13} />
                            Bannir
                          </Button>
                        </div>
                      )}

                      {confirmKick && (
                        <div className="space-y-2 rounded-xl border border-orange-500/25 bg-orange-500/5 p-2.5">
                          <p className="text-[11px] text-orange-300">
                            Expulser {profile?.displayName || profile?.username} ?
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="flex-1 rounded-xl text-[11px]"
                              onPress={() => setConfirmKick(false)}
                            >
                              Annuler
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 gap-1 rounded-xl text-[11px] bg-orange-600 hover:bg-orange-700"
                              onPress={handleKick}
                            >
                              <UserXIcon size={11} />
                              Confirmer
                            </Button>
                          </div>
                        </div>
                      )}

                      {confirmBan && (
                        <div className="space-y-2 rounded-xl border border-red-500/25 bg-red-500/5 p-2.5">
                          <p className="text-[11px] text-red-300">
                            Bannir {profile?.displayName || profile?.username} ?
                          </p>
                          <InputGroup className="h-7 rounded-xl border-[var(--border)]/60" variant="secondary">
                            <InputGroup.Input
                              placeholder="Raison (optionnel)"
                              value={banReason}
                              onChange={(e) => setBanReason(e.target.value)}
                              className="text-[11px]"
                            />
                          </InputGroup>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="flex-1 rounded-xl text-[11px]"
                              onPress={() => {
                                setConfirmBan(false);
                                setBanReason('');
                              }}
                            >
                              Annuler
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 gap-1 rounded-xl text-[11px] bg-red-600 hover:bg-red-700"
                              onPress={handleBan}
                            >
                              <BanIcon size={11} />
                              Confirmer
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {isMe && <div className="h-2" />}
          </div>
        )}
      </Popover.Content>
    </Popover>
  );
}
