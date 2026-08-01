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
import { PRESENCE_LABELS } from '@/components/alfy/primitives/status-dot';
import { UserBadges } from '@/components/alfy/members/user-badges';
import { api, resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

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

const STATUS_COLOR = {
  online: 'var(--success)',
  idle: 'var(--warning)',
  dnd: 'var(--danger)',
  invisible: 'var(--muted)',
  offline: 'var(--muted)',
} as const;

const FRIEND_ACTION: Record<AlfyFriendState, { icon: typeof UserPlus; tip: string }> = {
  none: { icon: UserPlus, tip: 'Ajouter en ami' },
  pending_sent: { icon: Clock, tip: 'Demande envoyée' },
  pending_received: { icon: Check, tip: 'Accepter la demande' },
  friends: { icon: UserCheck, tip: 'Amis — retirer' },
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
  isSelf = false,
  moderatorPermissions = 0,
  mutualFriends: mutualFriendsProp,
  mutualServers: mutualServersProp,
  friendState: friendStateProp,
  onKick,
  onBan,
  onToggleRole,
}: UserPopoverProps) {
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
    ])
      .then(([profileRes, mutualRes]) => {
        const p = (profileRes as any)?.data;
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

        const m = mutualRes?.data;
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
        toast('Demande envoyée', { description: user.displayName });
      } else if (prev === 'pending_received') {
        const res = await api.getFriendRequests();
        const received = (res as any)?.data?.received as { id: string; userId: string }[] | undefined;
        const match = received?.find((r) => r.userId === user.id);
        if (!match) throw new Error('Demande introuvable');
        await api.acceptFriendRequest(match.id);
        setFriendState('friends');
        toast('Ami·e ajouté·e', { description: user.displayName });
      } else if (prev === 'friends') {
        setFriendState('none');
        await api.removeFriend(user.id);
        toast('Ami·e retiré·e', { description: user.displayName });
      }
    } catch {
      setFriendState(prev); // rollback si l'appel échoue
      toast.danger('Action impossible', { description: 'Réessayez plus tard.' });
    }
  };

  const handleMenu = (key: React.Key) => {
    switch (key) {
      case 'copy-id':
        void navigator.clipboard.writeText(user.username);
        toast('Identifiant copié', { description: `@${user.username}` });
        break;
      case 'verify':
        setVerifyOpen(true);
        break;
      case 'block':
        toast('Utilisateur·rice bloqué·e', { description: user.displayName });
        break;
      case 'report':
        toast('Signalement envoyé', { description: 'Notre équipe va l’examiner.' });
        break;
      case 'kick':
        onKick?.();
        toast('Membre expulsé', { description: `${user.displayName} a été retiré·e du serveur.` });
        break;
      case 'ban':
        setBanOpen(true);
        break;
    }
  };

  const FriendIcon = FRIEND_ACTION[friendState].icon;

  return (
    <>
      <Popover isOpen={open} onOpenChange={setOpen}>
        <Popover.Trigger aria-label={`Profil de ${user.displayName}`} className={triggerClassName}>
          {children}
        </Popover.Trigger>
        <Popover.Content placement="left" className="w-80 overflow-hidden p-0">
          <Popover.Dialog aria-label={`Profil de ${user.displayName}`} className="alfy-enter overflow-hidden p-0">
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
                  <BannerButton label="Modifier mon profil">
                    <Pencil className="size-4" />
                  </BannerButton>
                ) : (
                  <>
                    {!user.isBot && (
                      <BannerButton label={FRIEND_ACTION[friendState].tip} onPress={advanceFriend} isDisabled={friendState === 'pending_sent'}>
                        <FriendIcon className="size-4" />
                      </BannerButton>
                    )}
                    {!user.isBot && (
                      <BannerButton label={`Appeler ${user.displayName}`}>
                        <Phone className="size-4" />
                      </BannerButton>
                    )}
                    <Dropdown>
                      <Dropdown.Trigger
                        aria-label={`Plus d'actions sur ${user.displayName}`}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white shadow-sm backdrop-blur-md outline-none transition-all hover:scale-105 hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-white/60"
                      >
                        <Ellipsis className="size-4" />
                      </Dropdown.Trigger>
                      <Dropdown.Popover className="min-w-52">
                        <Dropdown.Menu onAction={handleMenu}>
                          <Dropdown.Section>
                            <Header>Compte</Header>
                            <Dropdown.Item id="copy-id" textValue="Copier l'identifiant">
                              <Copy className="size-4" />
                              <Label>Copier l&apos;identifiant</Label>
                            </Dropdown.Item>
                            {!user.isBot && (
                              <Dropdown.Item id="verify" textValue="Vérifier la clé">
                                <ShieldCheck className="size-4" />
                                <Label>Vérifier la clé de chiffrement</Label>
                              </Dropdown.Item>
                            )}
                            <Dropdown.Item id="block" textValue="Bloquer" variant="danger">
                              <Ban className="size-4" />
                              <Label>Bloquer</Label>
                            </Dropdown.Item>
                            <Dropdown.Item id="report" textValue="Signaler" variant="danger">
                              <Flag className="size-4" />
                              <Label>Signaler</Label>
                            </Dropdown.Item>
                          </Dropdown.Section>
                          {(canKick || canBan) && (
                            <Dropdown.Section>
                              <Header>Modération</Header>
                              {canKick && (
                                <Dropdown.Item id="kick" textValue="Expulser" variant="danger">
                                  <UserMinus className="size-4" />
                                  <Label>Expulser du serveur</Label>
                                </Dropdown.Item>
                              )}
                              {canBan && (
                                <Dropdown.Item id="ban" textValue="Bannir" variant="danger">
                                  <Ban className="size-4" />
                                  <Label>Bannir du serveur</Label>
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
                  className="rounded-full ring-4 ring-overlay"
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
                      <Chip.Label className="text-[9px] font-bold tracking-wide">BOT</Chip.Label>
                    </Chip>
                  )}
                  <span className="shrink-0">
                    <UserBadges badges={displayUser.badges} size="sm" />
                  </span>
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                  <span className="truncate">@{user.username}</span>
                  <span
                    aria-hidden
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: STATUS_COLOR[user.status] }}
                  />
                  <span className="truncate text-foreground/70">
                    {user.statusEmoji ? `${user.statusEmoji} ` : ''}
                    {user.customStatus || PRESENCE_LABELS[user.status]}
                  </span>
                </p>
                {(user.status === 'offline' || user.status === 'invisible') && user.lastSeenAt && (
                  <p className="mt-0.5 text-[10px] text-muted">Vu le {lastSeenFmt.format(new Date(user.lastSeenAt))}</p>
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
                        {mutualFriends.length} ami{mutualFriends.length > 1 ? 's' : ''} en commun
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
                        {mutualServers.length} serveur{mutualServers.length > 1 ? 's' : ''} en commun
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
                        {bioExpanded ? 'Réduire la bio' : 'Afficher la bio complète'}
                      </button>
                    )}
                  </>
                )}

                {/* Rôles (éditables si permission) */}
                {(assignedRoles.length > 0 || canManageRoles) && (
                  <>
                    <div className="my-2.5 h-px bg-separator" />
                    <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-muted uppercase">Rôles</p>
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
                              aria-label={`Retirer le rôle ${r.name}`}
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
                            aria-label="Ajouter un rôle"
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
                  <span>Membre depuis {memberSince.format(new Date(displayUser.createdAt))}</span>
                  {!isSelf && !user.isBot && (
                    keysVerified ? (
                      <span className="flex items-center gap-1 text-(--alfy-e2e)">
                        <ShieldCheck className="size-3" aria-hidden />
                        Clé vérifiée
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setVerifyOpen(true)}
                        className="flex cursor-pointer items-center gap-1 font-medium outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        <Lock className="size-3 text-(--alfy-e2e)" aria-hidden />
                        Vérifier la clé
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
                    Envoyer un message à <span className="font-semibold text-foreground/80">@{user.username}</span>
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
                <Modal.Heading>Vérifier la sécurité de la conversation</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-3">
                <p className="text-sm text-muted">
                  Comparez ce numéro avec {user.displayName} par un autre canal (en personne, par
                  téléphone). S&apos;ils correspondent, votre conversation n&apos;a pas d&apos;intercepteur.
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
                    toast('Clés vérifiées', { description: user.displayName });
                  }}
                >
                  Marquer comme vérifiée
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
                <Modal.Heading>Bannir {user.displayName} ?</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-3">
                <p className="text-sm text-muted">
                  Le membre ne pourra plus rejoindre ce serveur. Un motif peut être enregistré dans
                  le journal d&apos;audit.
                </p>
                <TextField value={banReason} onChange={setBanReason}>
                  <Label>Motif (facultatif)</Label>
                  <Input placeholder="Ex. spam répété" />
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button slot="close" variant="tertiary">
                  Annuler
                </Button>
                <Button
                  slot="close"
                  variant="danger"
                  onPress={() => {
                    onBan?.(banReason);
                    toast('Membre banni', { description: banReason ? `${user.displayName} — ${banReason}` : user.displayName });
                    setBanReason('');
                  }}
                >
                  Bannir
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
