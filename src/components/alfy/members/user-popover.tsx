'use client';

import {
  Button,
  Chip,
  Dropdown,
  Header,
  Input,
  Label,
  Modal,
  Popover,
  TextField,
  toast,
} from '@heroui/react';
import {
  Ban,
  BadgeCheck,
  Check,
  Clock,
  Copy,
  Ellipsis,
  Flag,
  Lock,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { friendStateOf, mutualFriendsOf, mutualServersOf } from '@/components/alfy/mock/data';
import {
  PERMISSIONS,
  type AlfyBadge,
  type AlfyFriendState,
  type AlfyRole,
  type AlfyUser,
} from '@/components/alfy/mock/types';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { PRESENCE_LABELS, StatusDot } from '@/components/alfy/primitives/status-dot';
import { UserBadges } from '@/components/alfy/members/user-badges';
import { api, resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/components/locale-provider';

/** Champs de profil chargés à l'ouverture de la popup (absents des listes légères). */
interface ProfileDetails {
  bio?: string;
  bannerUrl?: string;
  bannerColor?: string;
  badges?: AlfyBadge[];
  createdAt?: string;
  interests?: string[];
}

const memberSince = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const lastSeenFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

function fakeSafetyNumber(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const groups: string[] = [];
  for (let i = 0; i < 6; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    groups.push(String(h % 100000).padStart(5, '0'));
  }
  return groups.join('  ');
}

const initials = (name: string) =>
  name.split(/\s+/).filter((p) => /\w/.test(p)).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

const FRIEND_ACTION_ICON: Record<AlfyFriendState, typeof UserPlus> = {
  none: UserPlus,
  pending_sent: Clock,
  pending_received: Check,
  friends: UserCheck,
};

/** Bouton d'action circulaire flottant sur la bannière (style Discord). */
function BannerButton({ label, onPress, children, isDisabled }: { label: string; onPress?: () => void; children: React.ReactNode; isDisabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      disabled={isDisabled}
      className={cn(
        'flex size-8 cursor-pointer items-center justify-center rounded-full text-white shadow-sm backdrop-blur-md outline-none',
        'bg-black/40 transition-all hover:scale-105 hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white/60',
        isDisabled && 'cursor-default opacity-60 hover:scale-100',
      )}
    >
      {children}
    </button>
  );
}

interface UserPopoverProps {
  user: AlfyUser;
  roles?: AlfyRole[];
  allServerRoles?: AlfyRole[];
  children: React.ReactNode;
  triggerClassName?: string;
  placement?: 'left' | 'right' | 'top' | 'bottom';
  isSelf?: boolean;
  moderatorPermissions?: number;
  /** Communs et relation — fournis par le container réel ; mock par défaut. */
  mutualFriends?: AlfyUser[];
  mutualServers?: { id: string; name: string }[];
  friendState?: AlfyFriendState;
  onKick?: () => void;
  onBan?: (reason: string) => void;
  onToggleRole?: (roleId: string, next: boolean) => void;
}

export function UserPopover({
  user,
  roles = [],
  allServerRoles,
  children,
  triggerClassName,
  placement = 'left',
  isSelf = false,
  moderatorPermissions = 0,
  mutualFriends: mutualFriendsProp,
  mutualServers: mutualServersProp,
  friendState: friendStateProp,
  onKick,
  onBan,
  onToggleRole,
}: UserPopoverProps) {
  const { t, tx } = useTranslation();
  const FRIEND_ACTION_TIP: Record<AlfyFriendState, string> = {
    none: t.admin.members.friendActionAdd,
    pending_sent: t.admin.members.friendActionPendingSent,
    pending_received: t.admin.members.friendActionPendingReceived,
    friends: t.admin.members.friendActionFriends,
  };
  const topRole = useMemo(() => [...roles].sort((a, b) => a.position - b.position)[0], [roles]);

  // Popup ouverte : déclenche le chargement du profil complet + amis en commun.
  const [open, setOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [details, setDetails] = useState<ProfileDetails | null>(null);
  const [realMutualFriends, setRealMutualFriends] = useState<AlfyUser[] | null>(null);
  const fetchedForRef = useRef<string | null>(null);

  // Fusionne le profil léger (venant d'une liste) avec les infos complètes chargées à l'ouverture.
  const displayUser = useMemo<AlfyUser>(() => ({ ...user, ...details }), [user, details]);

  // Communs : réels une fois chargés, sinon fournis par le container, sinon dérivés du mock.
  const mutualFriends = useMemo(
    () => (isSelf ? [] : (realMutualFriends ?? mutualFriendsProp ?? mutualFriendsOf(user.id))),
    [user.id, isSelf, realMutualFriends, mutualFriendsProp],
  );
  const mutualServers = useMemo(
    () => (isSelf ? [] : (mutualServersProp ?? mutualServersOf(user.id))),
    [user.id, isSelf, mutualServersProp],
  );

  const [friendState, setFriendState] = useState<AlfyFriendState>(
    () => friendStateProp ?? friendStateOf(user.id),
  );
  const [keysVerified, setKeysVerified] = useState(false);
  const [iBlocked, setIBlocked] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [banOpen, setBanOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [memberRoleIds, setMemberRoleIds] = useState<string[]>(() => roles.map((r) => r.id));
  const [bioExpanded, setBioExpanded] = useState(false);

  // Charge le profil complet (bio, bannière, badges…) + les amis en commun à l'ouverture.
  useEffect(() => {
    if (!open || isSelf || user.isBot) return;
    if (fetchedForRef.current === user.id) return;
    fetchedForRef.current = user.id;

    setProfileLoading(true);
    Promise.all([
      api.getUser(user.id).catch(() => null),
      api.getMutualFriends(user.id).catch(() => null),
      api.getBlockStatus(user.id).catch(() => null),
    ])
      .then(([profileRes, mutualRes, blockRes]) => {
        if (blockRes?.success) {
          setIBlocked(Boolean(blockRes.data?.iBlockedThem));
        }
        const p = (profileRes as any)?.success ? (profileRes as any).data : null;
        if (p) {
          setDetails({
            bio: p.bio ?? undefined,
            bannerUrl: p.bannerUrl ? resolveMediaUrl(p.bannerUrl) : undefined,
            bannerColor: p.cardColor ?? undefined,
            badges: Array.isArray(p.badges)
              ? p.badges.map((b: any) => ({
                  id: b.id,
                  name: b.name,
                  icon: b.icon,
                  iconType: b.iconType,
                  iconValue: b.iconValue,
                  color: b.color,
                }))
              : [],
            createdAt: p.createdAt ?? undefined,
            interests: Array.isArray(p.interests) ? p.interests : undefined,
          });
        }

        const m = mutualRes?.success ? mutualRes.data : null;
        if (m) {
          setRealMutualFriends(
            (m.mutualFriends ?? []).map((f) => ({
              id: f.id,
              username: f.username,
              displayName: f.displayName || f.username,
              avatarUrl: f.avatarUrl ? resolveMediaUrl(f.avatarUrl) : undefined,
              status: (f.status as AlfyUser['status']) ?? 'offline',
              badges: [],
              createdAt: new Date().toISOString(),
            })),
          );
          setFriendState(m.friendState);
        }
      })
      .finally(() => setProfileLoading(false));
  }, [open, isSelf, user.id, user.isBot]);

  const has = (bit: number) => (moderatorPermissions & (PERMISSIONS.ADMIN | bit)) !== 0;
  const canKick = !isSelf && has(PERMISSIONS.KICK_MEMBERS);
  const canBan = !isSelf && has(PERMISSIONS.BAN_MEMBERS);
  const canManageRoles = !isSelf && !!allServerRoles?.length && has(PERMISSIONS.MANAGE_ROLES);

  const assignedRoles = useMemo(
    () => (allServerRoles ?? roles).filter((r) => memberRoleIds.includes(r.id)).sort((a, b) => a.position - b.position),
    [allServerRoles, roles, memberRoleIds],
  );
  const unassignedRoles = useMemo(
    () => (allServerRoles ?? []).filter((r) => !memberRoleIds.includes(r.id)),
    [allServerRoles, memberRoleIds],
  );
  const shownRoles = assignedRoles.slice(0, 3);
  const overflow = assignedRoles.length - shownRoles.length;

  const bioLong = (displayUser.bio?.length ?? 0) > 90 || (displayUser.bio?.split('\n').length ?? 0) > 3;
  const tint = topRole?.color ?? 'var(--accent)';

  const toggleRole = (roleId: string) =>
    setMemberRoleIds((ids) => {
      const next = ids.includes(roleId) ? ids.filter((i) => i !== roleId) : [...ids, roleId];
      onToggleRole?.(roleId, next.includes(roleId));
      return next;
    });

  const advanceFriend = async () => {
    const prev = friendState;
    try {
      if (prev === 'none') {
        setFriendState('pending_sent');
        await api.sendFriendRequest(user.id);
        toast(t.admin.members.friendActionPendingSent, { description: user.displayName });
      } else if (prev === 'pending_received') {
        const res = await api.getFriendRequests();
        const received = (res as any)?.data?.received as { id: string; userId: string }[] | undefined;
        const match = received?.find((r) => r.userId === user.id);
        if (!match) throw new Error('Demande introuvable');
        await api.acceptFriendRequest(match.id);
        setFriendState('friends');
        toast(t.admin.members.toastFriendAdded, { description: user.displayName });
      } else if (prev === 'friends') {
        setFriendState('none');
        await api.removeFriend(user.id);
        toast(t.admin.members.toastFriendRemoved, { description: user.displayName });
      }
    } catch {
      setFriendState(prev); // rollback si l'appel échoue
      toast.danger(t.admin.members.toastActionFailed, { description: t.admin.members.toastRetryLater });
    }
  };

  const toggleBlock = async () => {
    const prevBlocked = iBlocked;
    const prevFriendState = friendState;
    // Bloquer supprime toujours la relation d'amitié côté serveur — refléter
    // ça localement pour ne pas laisser affiché un état d'ami périmé.
    setIBlocked(!prevBlocked);
    if (!prevBlocked) setFriendState('none');
    try {
      if (prevBlocked) await api.unblockUser(user.id);
      else await api.blockUser(user.id);
      toast(prevBlocked ? t.admin.members.toastUnblocked : t.admin.members.toastBlocked, {
        description: user.displayName,
      });
    } catch {
      setIBlocked(prevBlocked);
      setFriendState(prevFriendState);
      toast.danger(t.admin.members.toastActionFailed, { description: t.admin.members.toastRetryLater });
    }
  };

  const handleMenu = (key: React.Key) => {
    switch (key) {
      case 'copy-id':
        void navigator.clipboard.writeText(user.username);
        toast(t.admin.members.toastIdCopied, { description: `@${user.username}` });
        break;
      case 'verify':
        setVerifyOpen(true);
        break;
      case 'block':
        void toggleBlock();
        break;
      case 'report':
        toast(t.admin.members.toastReportSent, { description: t.admin.members.toastReportSentDesc });
        break;
      case 'kick':
        onKick?.();
        toast(t.admin.members.toastMemberKicked, { description: tx(t.admin.members.toastMemberKickedDesc, { name: user.displayName }) });
        break;
      case 'ban':
        setBanOpen(true);
        break;
    }
  };

  const FriendIcon = FRIEND_ACTION_ICON[friendState];

  return (
    <>
      <Popover isOpen={open} onOpenChange={setOpen}>
        <Popover.Trigger aria-label={tx(t.admin.members.profileOf, { name: user.displayName })} className={triggerClassName}>
          {children}
        </Popover.Trigger>
        <Popover.Content placement={placement} className="w-80 overflow-hidden p-0">
          <Popover.Dialog aria-label={tx(t.admin.members.profileOf, { name: user.displayName })} className="alfy-enter overflow-hidden p-0">
            {/* Bannière + actions flottantes */}
            <div className="relative">
              <div className="relative h-24 w-full overflow-hidden">
                {displayUser.bannerUrl ? (
                  <img src={displayUser.bannerUrl} alt="" className="size-full object-cover" />
                ) : (
                  <div
                    className="size-full"
                    style={{
                      background: `linear-gradient(135deg, ${displayUser.bannerColor ?? tint} 0%, color-mix(in oklab, ${displayUser.bannerColor ?? tint} 72%, #000) 100%)`,
                    }}
                  />
                )}
                {/* Reflet doux pour éviter l'aplat */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{ background: 'radial-gradient(130% 110% at 12% -10%, rgba(255,255,255,0.22), transparent 55%)' }}
                />
                <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-overlay/40 to-transparent" />
              </div>
              <div className="absolute top-3 right-3 flex items-center gap-2">
                {isSelf ? (
                  <BannerButton label={t.admin.members.editMyProfile}>
                    <Pencil className="size-4" />
                  </BannerButton>
                ) : (
                  <>
                    {!user.isBot && (
                      <BannerButton label={FRIEND_ACTION_TIP[friendState]} onPress={advanceFriend} isDisabled={friendState === 'pending_sent'}>
                        <FriendIcon className="size-4" />
                      </BannerButton>
                    )}
                    {!user.isBot && (
                      <BannerButton label={tx(t.admin.members.callUser, { name: user.displayName })}>
                        <Phone className="size-4" />
                      </BannerButton>
                    )}
                    <Dropdown>
                      <Dropdown.Trigger
                        aria-label={tx(t.admin.members.moreActionsOn, { name: user.displayName })}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white shadow-sm backdrop-blur-md outline-none transition-all hover:scale-105 hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white/60"
                      >
                        <Ellipsis className="size-4" />
                      </Dropdown.Trigger>
                      <Dropdown.Popover className="min-w-52">
                        <Dropdown.Menu onAction={handleMenu}>
                          <Dropdown.Section>
                            <Header>{t.admin.members.accountSection}</Header>
                            <Dropdown.Item id="copy-id" textValue={t.admin.members.copyId}>
                              <Copy className="size-4" />
                              <Label>{t.admin.members.copyId}</Label>
                            </Dropdown.Item>
                            {!user.isBot && (
                              <Dropdown.Item id="verify" textValue={t.admin.members.verifyKey}>
                                <ShieldCheck className="size-4" />
                                <Label>{t.admin.members.verifyKeyEncryption}</Label>
                              </Dropdown.Item>
                            )}
                            <Dropdown.Item id="block" textValue={iBlocked ? t.admin.members.unblock : t.admin.members.block} variant="danger">
                              <Ban className="size-4" />
                              <Label>{iBlocked ? t.admin.members.unblock : t.admin.members.block}</Label>
                            </Dropdown.Item>
                            <Dropdown.Item id="report" textValue={t.admin.members.report} variant="danger">
                              <Flag className="size-4" />
                              <Label>{t.admin.members.report}</Label>
                            </Dropdown.Item>
                          </Dropdown.Section>
                          {(canKick || canBan) && (
                            <Dropdown.Section>
                              <Header>{t.admin.members.moderationSection}</Header>
                              {canKick && (
                                <Dropdown.Item id="kick" textValue={t.admin.members.kick} variant="danger">
                                  <UserMinus className="size-4" />
                                  <Label>{t.admin.members.kickFromServer}</Label>
                                </Dropdown.Item>
                              )}
                              {canBan && (
                                <Dropdown.Item id="ban" textValue={t.admin.members.ban} variant="danger">
                                  <Ban className="size-4" />
                                  <Label>{t.admin.members.banFromServer}</Label>
                                </Dropdown.Item>
                              )}
                            </Dropdown.Section>
                          )}
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown>
                  </>
                )}
              </div>
            </div>

            {/* Corps */}
            <div className="px-3 pb-3">
              {/* Avatar en chevauchement */}
              <div className="-mt-10 mb-2 w-fit">
                <AlfyAvatar
                  name={user.displayName}
                  avatarUrl={user.avatarUrl}
                  size="lg"
                  status={user.status}
                  statusRingClass="ring-overlay"
                  className=" ring-overlay"
                />
              </div>

              {/* Carte d'infos */}
              <div className="rounded-xl bg-surface-secondary/50 p-3">
                {/* Nom + tag */}
                <div className="flex items-center gap-1.5">
                  <p className="min-w-0 truncate text-lg leading-tight font-bold" style={topRole ? { color: topRole.color } : undefined}>
                    {user.displayName}
                  </p>
                  {user.isBot && (
                    <Chip size="sm" color={user.isVerifiedBot ? 'accent' : 'default'} variant="soft" className="shrink-0">
                      {user.isVerifiedBot && <BadgeCheck className="size-2.5" aria-hidden />}
                      <Chip.Label className="text-[9px] font-bold tracking-wide">{t.admin.members.botBadge}</Chip.Label>
                    </Chip>
                  )}
                  <span className="shrink-0">
                    <UserBadges badges={displayUser.badges} size="sm" />
                  </span>
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                  <span className="truncate">@{user.username}</span>
                  <StatusDot status={user.status} size="xs" ring={false} />
                  <span className="truncate text-foreground/70">
                    {user.statusEmoji ? `${user.statusEmoji} ` : ''}
                    {user.customStatus || PRESENCE_LABELS[user.status]}
                  </span>
                </p>
                {(user.status === 'offline' || user.status === 'invisible') && user.lastSeenAt && (
                  <p className="mt-0.5 text-[10px] text-muted">{tx(t.admin.members.lastSeenAt, { date: lastSeenFmt.format(new Date(user.lastSeenAt)) })}</p>
                )}

                {/* Communs */}
                {!isSelf && (mutualFriends.length > 0 || mutualServers.length > 0) && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                    {mutualFriends.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <span className="flex -space-x-1.5">
                          {mutualFriends.slice(0, 3).map((f) =>
                            f.avatarUrl ? (
                              <img
                                key={f.id}
                                src={f.avatarUrl}
                                alt=""
                                className="size-4 rounded-full object-cover ring-1 ring-overlay"
                              />
                            ) : (
                              <span
                                key={f.id}
                                className="flex size-4 items-center justify-center rounded-full bg-surface-tertiary text-[7px] font-bold ring-1 ring-overlay"
                              >
                                {initials(f.displayName)}
                              </span>
                            ),
                          )}
                        </span>
                        {tx(mutualFriends.length > 1 ? t.admin.members.mutualFriendsCount : t.admin.members.mutualFriendCount, { n: mutualFriends.length })}
                      </span>
                    )}
                    {mutualServers.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <span className="flex -space-x-1.5">
                          {mutualServers.slice(0, 3).map((s) => (
                            <span
                              key={s.id}
                              className="flex size-4 items-center justify-center rounded-full bg-surface-tertiary text-[7px] font-bold ring-1 ring-overlay"
                            >
                              {initials(s.name)}
                            </span>
                          ))}
                        </span>
                        {tx(mutualServers.length > 1 ? t.admin.members.mutualServersCount : t.admin.members.mutualServerCount, { n: mutualServers.length })}
                      </span>
                    )}
                  </div>
                )}

                {/* Bio */}
                {displayUser.bio && (
                  <>
                    <div className="my-2.5 h-px bg-separator" />
                    <p className={cn('text-xs leading-relaxed whitespace-pre-wrap text-foreground/80', bioLong && !bioExpanded && 'line-clamp-3')}>
                      {displayUser.bio}
                    </p>
                    {bioLong && (
                      <button
                        type="button"
                        onClick={() => setBioExpanded((v) => !v)}
                        className="mt-1 cursor-pointer text-[11px] font-semibold text-muted outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        {bioExpanded ? t.admin.members.reduceBio : t.admin.members.showFullBio}
                      </button>
                    )}
                  </>
                )}

                {/* Rôles (éditables si permission) */}
                {(assignedRoles.length > 0 || canManageRoles) && (
                  <>
                    <div className="my-2.5 h-px bg-separator" />
                    <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-muted uppercase">{t.admin.members.rolesLabel}</p>
                    <div className="flex flex-wrap items-center gap-1">
                      {shownRoles.map((r) => (
                        <span
                          key={r.id}
                          className="flex items-center gap-1 rounded-md border py-0.5 pr-1 pl-1.5 text-[10px]"
                          style={{ borderColor: `${r.color}55`, color: r.color, backgroundColor: `${r.color}14` }}
                        >
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: r.color }} />
                          {r.name}
                          {canManageRoles && (
                            <button
                              type="button"
                              aria-label={tx(t.admin.members.removeRole, { role: r.name })}
                              onClick={() => toggleRole(r.id)}
                              className="cursor-pointer rounded-sm opacity-70 outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-focus"
                            >
                              <X className="size-2.5" />
                            </button>
                          )}
                        </span>
                      ))}
                      {overflow > 0 && (
                        <span className="rounded-md bg-surface-tertiary px-1.5 py-0.5 text-[10px] font-medium text-muted">
                          +{overflow}
                        </span>
                      )}
                      {canManageRoles && unassignedRoles.length > 0 && (
                        <Dropdown>
                          <Dropdown.Trigger
                            aria-label={t.admin.members.addRole}
                            className="flex size-5 cursor-pointer items-center justify-center rounded-md bg-surface-tertiary text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
                          >
                            <Plus className="size-3" />
                          </Dropdown.Trigger>
                          <Dropdown.Popover className="min-w-44">
                            <Dropdown.Menu onAction={(k) => toggleRole(String(k))}>
                              {unassignedRoles.map((r) => (
                                <Dropdown.Item key={r.id} id={r.id} textValue={r.name}>
                                  <span className="size-2 rounded-full" style={{ backgroundColor: r.color }} />
                                  <Label>{r.name}</Label>
                                </Dropdown.Item>
                              ))}
                            </Dropdown.Menu>
                          </Dropdown.Popover>
                        </Dropdown>
                      )}
                    </div>
                  </>
                )}

                {/* Méta : membre depuis + sécurité */}
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-muted">
                  <span>{tx(t.admin.members.memberSince, { date: memberSince.format(new Date(displayUser.createdAt)) })}</span>
                  {!isSelf && !user.isBot && (
                    keysVerified ? (
                      <span className="flex items-center gap-1 text-(--alfy-e2e)">
                        <ShieldCheck className="size-3" aria-hidden />
                        {t.admin.members.keyVerified}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setVerifyOpen(true)}
                        className="flex cursor-pointer items-center gap-1 font-medium outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        <Lock className="size-3 text-(--alfy-e2e)" aria-hidden />
                        {t.admin.members.verifyKey}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Champ message */}
              {!isSelf && (
                <button
                  type="button"
                  className="group/dm mt-2 flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-field px-3 text-xs text-muted outline-none transition-colors hover:border-accent/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <MessageCircle className="size-3.5 shrink-0 transition-colors group-hover/dm:text-accent" />
                  <span className="truncate">
                    {t.admin.members.sendMessageTo} <span className="font-semibold text-foreground/80">@{user.username}</span>
                  </span>
                </button>
              )}
            </div>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>

      {/* Modale : vérification de sécurité */}
      <Modal isOpen={verifyOpen} onOpenChange={setVerifyOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-96">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon className="bg-(--alfy-e2e-soft) text-(--alfy-e2e)">
                  <ShieldCheck className="size-5" />
                </Modal.Icon>
                <Modal.Heading>{t.admin.members.verifySecurityHeading}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-3">
                <p className="text-sm text-muted">
                  {tx(t.admin.members.verifySecurityDesc, { name: user.displayName })}
                </p>
                <p className="rounded-md bg-surface-secondary px-3 py-2.5 text-center font-mono text-sm tracking-wider">
                  {fakeSafetyNumber(user.id)}
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  slot="close"
                  className="w-full"
                  onPress={() => {
                    setKeysVerified(true);
                    toast(t.admin.members.keysVerifiedToast, { description: user.displayName });
                  }}
                >
                  {t.admin.members.markVerified}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Modale : bannissement avec motif */}
      <Modal isOpen={banOpen} onOpenChange={setBanOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-96">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon className="bg-danger/15 text-danger">
                  <Ban className="size-5" />
                </Modal.Icon>
                <Modal.Heading>{tx(t.admin.members.banHeading, { name: user.displayName })}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-3">
                <p className="text-sm text-muted">
                  {t.admin.members.banDesc}
                </p>
                <TextField value={banReason} onChange={setBanReason}>
                  <Label>{t.admin.members.banReasonLabel}</Label>
                  <Input placeholder={t.admin.members.banReasonPlaceholder} />
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button slot="close" variant="tertiary">
                  {t.common.cancel}
                </Button>
                <Button
                  slot="close"
                  variant="danger"
                  onPress={() => {
                    onBan?.(banReason);
                    toast(t.admin.members.toastMemberBanned, { description: banReason ? `${user.displayName} — ${banReason}` : user.displayName });
                    setBanReason('');
                  }}
                >
                  {t.admin.members.ban}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
