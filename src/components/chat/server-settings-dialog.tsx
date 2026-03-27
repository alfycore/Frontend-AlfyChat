'use client';

import { useEffect, useState } from 'react';
import {
  SettingsIcon, Loader2Icon, SaveIcon, CopyIcon, CheckIcon,
  EyeIcon, EyeOffIcon, PlusIcon, Trash2Icon, Link2Icon,
  GlobeIcon, HashIcon, ShieldCheckIcon, ServerIcon, AlertTriangleIcon,
  XIcon, UserPlusIcon, KeyRoundIcon,
} from '@/components/icons';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/components/locale-provider';
import {
  Avatar,
  Button,
  InputGroup,
  Modal,
  Separator,
  Spinner,
  Switch,
} from '@heroui/react';
import { RoleManager } from '@/components/chat/role-manager';
import { ChannelManager } from '@/components/chat/channel-manager';
import { cn } from '@/lib/utils';

interface ServerInfo {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  bannerUrl?: string;
  isPublic?: boolean;
  customDomain?: string;
  domainVerified?: boolean;
  ownerId?: string;
}

interface Invite {
  id: string;
  code: string;
  customSlug?: string;
  maxUses?: number;
  uses: number;
  expiresAt?: string;
  isPermanent?: boolean;
  createdAt: string;
}

interface ServerSettingsDialogProps {
  serverId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServerUpdated?: () => void;
}

type Section = 'general' | 'invites' | 'droits' | 'roles' | 'channels' | 'domain' | 'node';

const NAV_ICON_MAP: Record<Section, any> = {
  general:  SettingsIcon,
  invites:  UserPlusIcon,
  droits:   KeyRoundIcon,
  roles:    ShieldCheckIcon,
  channels: HashIcon,
  domain:   GlobeIcon,
  node:     ServerIcon,
};

export function ServerSettingsDialog({
  serverId,
  open,
  onOpenChange,
  onServerUpdated,
}: ServerSettingsDialogProps) {
  const { user } = useAuth();
  const { t, tx } = useTranslation();
  const ss = t.serverSettings;

  const NAV_ITEMS: { id: Section; label: string }[] = [
    { id: 'general',  label: ss.sections.general },
    { id: 'invites',  label: ss.sections.invitations },
    { id: 'droits',   label: ss.sections.permissions },
    { id: 'roles',    label: ss.sections.roles },
    { id: 'channels', label: ss.sections.channels },
    { id: 'domain',   label: ss.sections.domain },
    { id: 'node',     label: ss.sections.serverNode },
  ];

  const [section, setSection] = useState<Section>('invites');
  const [server, setServer] = useState<ServerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [canManageServer, setCanManageServer] = useState(false);
  const [ownerJoinedViaInvite, setOwnerJoinedViaInvite] = useState(false);

  // General
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [requireInvite, setRequireInvite] = useState(false);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Invites
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteSlug, setInviteSlug] = useState('');
  const [inviteMaxUses, setInviteMaxUses] = useState('');
  const [invitePermanent, setInvitePermanent] = useState(true);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');

  // Domain
  const [domainInput, setDomainInput] = useState('');
  const [domainTxtRecord, setDomainTxtRecord] = useState('');
  const [isDomainLoading, setIsDomainLoading] = useState(false);

  // Node token
  const [nodeToken, setNodeToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Claim admin
  const [adminCode, setAdminCode] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimResult, setClaimResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    const handleOwnerJoined = (data: unknown) => {
      const payload = (data as { payload?: Record<string, unknown> })?.payload || data;
      const p = payload as { serverId?: string };
      if (p?.serverId === serverId) {
        setOwnerJoinedViaInvite(true);
        if (section === 'droits') setSection('invites');
      }
    };
    socketService.onServerOwnerJoined(handleOwnerJoined);
    return () => {
      socketService.off('SERVER_OWNER_JOINED', handleOwnerJoined as any);
    };
  }, [serverId, section, canManageServer]);

  useEffect(() => {
    if (open && serverId) {
      loadServer();
      loadInvites();
      loadNodeToken();
      checkPermissions();
    }
  }, [open, serverId]);

  useEffect(() => {
    if (!open || !serverId) return;
    const handleServerUpdate = (data: any) => {
      const payload = data?.payload || data;
      if (payload?.serverId === serverId || payload?.id === serverId) loadServer();
    };
    socketService.on('SERVER_UPDATE', handleServerUpdate);
    return () => { socketService.off('SERVER_UPDATE', handleServerUpdate); };
  }, [open, serverId]);

  const checkPermissions = () => {
    if (!user) return;
    socketService.requestServerInfo(serverId, (data: any) => {
      if (data?.error) return;
      const isOwner = (data.ownerId || data.owner_id) === user.id;
      if (isOwner) {
        setCanManageServer(true);
        setSection('general');
        return;
      }
      socketService.requestMembers(serverId, (memberData: any) => {
        const members = memberData?.members || [];
        socketService.requestRoles(serverId, (roleData: any) => {
          const roles = roleData?.roles || [];
          const member = members.find((m: any) => (m.userId || m.user_id) === user.id);
          if (member) {
            const roleIds: string[] = Array.isArray(member.roleIds || member.role_ids)
              ? (member.roleIds || member.role_ids)
              : (() => { try { return JSON.parse(member.roleIds || member.role_ids || '[]'); } catch { return []; } })();
            const userRoles = roles.filter((r: any) => roleIds.includes(r.id));
            const hasPerms = userRoles.some((r: any) => {
              const perms = r.permissions;
              if (Array.isArray(perms)) return perms.includes('ADMIN') || perms.includes('MANAGE_ROLES');
              const p = typeof perms === 'number' ? perms : parseInt(perms || '0', 10);
              return (p & 0x40) !== 0 || (p & 0x100) !== 0;
            });
            if (hasPerms) {
              setCanManageServer(true);
              setSection('general');
            }
          }
        });
      });
    });
  };

  const loadServer = async () => {
    setIsLoading(true);
    socketService.requestServerInfo(serverId, (data: any) => {
      if (data && !data.error) {
        const s: ServerInfo = {
          id: data.id || serverId,
          name: data.name,
          description: data.description,
          iconUrl: data.iconUrl || data.icon_url,
          bannerUrl: data.bannerUrl || data.banner_url,
          isPublic: data.isPublic ?? data.is_public,
          customDomain: data.customDomain || data.custom_domain,
          domainVerified: data.domainVerified ?? data.domain_verified,
          ownerId: data.ownerId || data.owner_id,
        };
        setServer(s);
        setName(s.name || '');
        setDescription(s.description || '');
        setIsPublic(s.isPublic || false);
        setRequireInvite(!s.isPublic);
        setDomainInput(s.customDomain || '');
      }
      setIsLoading(false);
    });
  };

  const loadInvites = async () => {
    socketService.requestInvites(serverId, (data: any) => {
      const raw = data?.invites || [];
      const mapped: Invite[] = raw.map((inv: any) => ({
        id: inv.id,
        code: inv.code,
        customSlug: inv.customSlug ?? inv.custom_slug,
        maxUses: inv.maxUses ?? inv.max_uses,
        uses: inv.uses || 0,
        expiresAt: inv.expiresAt ?? inv.expires_at,
        isPermanent: Boolean(inv.isPermanent ?? inv.is_permanent),
        createdAt: inv.createdAt ?? inv.created_at,
      }));
      setInvites(mapped);
    });
  };

  const loadNodeToken = async () => {
    const res = await api.getNodeToken(serverId);
    if (res.success && res.data) setNodeToken((res.data as any).nodeToken || '');
  };

  const handleSaveGeneral = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    let iconUrl = server?.iconUrl;
    let bannerUrl = server?.bannerUrl;
    if (iconFile) {
      const r = await api.uploadImage(iconFile, 'icon');
      if (r.success && r.data) iconUrl = r.data.url;
    }
    if (bannerFile) {
      const r = await api.uploadImage(bannerFile, 'banner');
      if (r.success && r.data) bannerUrl = r.data.url;
    }
    socketService.updateServerViaNode(serverId, { name: name.trim(), description, isPublic: isPublic && !requireInvite, iconUrl, bannerUrl });
    setIsSaving(false);
    setIconFile(null);
    setBannerFile(null);
    setIconPreview(null);
    setBannerPreview(null);
    setTimeout(() => loadServer(), 300);
    onServerUpdated?.();
  };

  const handleCreateInvite = async () => {
    if (isCreatingInvite) return;
    setIsCreatingInvite(true);
    socketService.createInvite(serverId, {
      customSlug: inviteSlug.trim() || undefined,
      maxUses: inviteMaxUses ? parseInt(inviteMaxUses) : undefined,
      isPermanent: invitePermanent,
    }, () => {
      setInviteSlug('');
      setInviteMaxUses('');
      setInvitePermanent(true);
      setIsCreatingInvite(false);
      loadInvites();
    });
  };

  const handleDeleteInvite = async (inviteId: string) => {
    socketService.deleteInvite(serverId, inviteId, () => loadInvites());
  };

  const copyInviteLink = (code: string) => {
    const url = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 2000);
    });
  };

  const handleStartDomainVerify = async () => {
    if (!domainInput.trim()) return;
    setIsDomainLoading(true);
    const res = await api.startDomainVerification(serverId, domainInput.trim());
    if (res.success && res.data) setDomainTxtRecord((res.data as any).txtRecord || '');
    setIsDomainLoading(false);
  };

  const handleCheckDomainVerify = async () => {
    setIsDomainLoading(true);
    await api.checkDomainVerification(serverId);
    loadServer();
    setIsDomainLoading(false);
  };

  const handleClaimAdmin = async () => {
    if (!adminCode.trim() || !user?.id) return;
    setClaimLoading(true);
    setClaimResult(null);
    const res = await api.claimAdmin(serverId, adminCode.trim().toUpperCase(), user.id);
    if (res.success) {
      setClaimResult({ ok: true, msg: ss.permissions.adminGranted });
      setAdminCode('');
      setCanManageServer(true);
      setSection('general');
      loadServer();
    } else {
      setClaimResult({ ok: false, msg: res.error || ss.permissions.invalidCode });
    }
    setClaimLoading(false);
  };

  const copyToken = () => {
    navigator.clipboard.writeText(nodeToken).then(() => {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    });
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const usageLabel = (inv: Invite) => {
    const n = String(inv.uses);
    return inv.uses === 1
      ? tx(ss.invitations.usageSingular, { n })
      : tx(ss.invitations.usagePlural, { n });
  };

  return (
    <Modal isOpen={open} onOpenChange={onOpenChange}>
      <Modal.Backdrop isDismissable>
      <Modal.Container size="lg">
        <Modal.Dialog className="h-[88vh] max-w-4xl overflow-hidden rounded-2xl border border-[var(--border)]/40 p-0 shadow-2xl">
          <div className="flex h-full">

          {/*  Left navigation  */}
          <aside className="flex w-52 shrink-0 flex-col border-r border-[var(--border)]/40 bg-[var(--background)]/80 backdrop-blur-xl py-5">
            <div className="mb-3 px-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/50">
                {ss.sectionHeader}
              </p>
              <p className="mt-0.5 truncate text-[13px] font-semibold">
                {server?.name || '...'}
              </p>
            </div>

            <nav className="flex flex-col gap-0.5 px-2">
              {NAV_ITEMS.filter(({ id }) => {
                if (id === 'droits' && ownerJoinedViaInvite) return false;
                if (canManageServer) return true;
                return id === 'invites' || id === 'droits';
              }).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setSection(id)}
                  className={cn(
                    'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors',
                    section === id
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'text-[var(--muted)] hover:bg-[var(--surface-secondary)]/70 hover:text-[var(--foreground)]',
                  )}
                >
                  {section === id && (
                    <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[var(--accent)]" />
                  )}
                  <div className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-md transition-colors',
                    section === id
                      ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                      : 'bg-[var(--surface-secondary)] text-[var(--muted)] group-hover:text-[var(--foreground)]',
                  )}>
                    {(() => { const NavIcon = NAV_ICON_MAP[id]; return <NavIcon size={13} />; })()}
                  </div>
                  {label}
                </button>
              ))}
            </nav>

            <div className="mt-auto px-2">
              <Separator className="mx-2 mb-2" />
              <button
                onClick={() => onOpenChange(false)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-secondary)]/70 hover:text-[var(--foreground)]"
              >
                <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--surface-secondary)]">
                  <XIcon size={13} />
                </div>
                {ss.close}
              </button>
            </div>
          </aside>

          {/* Right content */}
          <div className="flex flex-1 flex-col overflow-hidden bg-[var(--surface)]/30">
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner size="md" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-7">

                {/* GENERAL */}
                {section === 'general' && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-[17px] font-bold">{ss.general.heading}</h2>
                      <p className="mt-0.5 text-[12px] text-[var(--muted)]/60">{ss.general.subtitle}</p>
                    </div>

                    {/* Banner */}
                    <div className="rounded-xl border border-[var(--border)]/30 bg-[var(--surface-secondary)]/30 p-4 space-y-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/50">{ss.general.banner}</p>
                      <div
                        className="group relative h-28 w-full cursor-pointer overflow-hidden rounded-lg border border-[var(--border)]/30 bg-[var(--surface-secondary)]/50 transition-colors hover:border-[var(--border)]/60"
                        onClick={() => document.getElementById('banner-upload')?.click()}
                      >
                        {(bannerPreview || server?.bannerUrl) && (
                          <img
                            src={bannerPreview || resolveMediaUrl(server?.bannerUrl)}
                            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                            alt={ss.general.bannerAlt}
                          />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                          {ss.general.clickToChange}
                        </div>
                      </div>
                      <input id="banner-upload" type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
                    </div>

                    {/* Icon + name */}
                    <div className="rounded-xl border border-[var(--border)]/30 bg-[var(--surface-secondary)]/30 p-4">
                      <div className="flex items-center gap-4">
                        <div
                          className="group relative shrink-0 cursor-pointer"
                          onClick={() => document.getElementById('icon-upload')?.click()}
                        >
                          <Avatar className="size-16 rounded-xl ring-2 ring-[var(--border)]/30 transition-all group-hover:ring-[var(--border)]/60">
                            <Avatar.Image src={iconPreview || resolveMediaUrl(server?.iconUrl) || undefined} className="rounded-xl object-cover" />
                            <Avatar.Fallback className="rounded-xl text-base font-bold">
                              {name.substring(0, 2).toUpperCase()}
                            </Avatar.Fallback>
                          </Avatar>
                          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                            {ss.general.clickToChange}
                          </div>
                        </div>
                        <input id="icon-upload" type="file" accept="image/*" className="hidden" onChange={handleIconChange} />
                        <div className="flex-1 space-y-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/50">{ss.general.serverName}</p>
                          <InputGroup className="rounded-lg">
                            <InputGroup.Input
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder={ss.general.serverNamePlaceholder}
                            />
                          </InputGroup>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="rounded-xl border border-[var(--border)]/30 bg-[var(--surface-secondary)]/30 p-4 space-y-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/50">{ss.general.description}</p>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={ss.general.descriptionPlaceholder}
                        rows={3}
                        className="w-full resize-none rounded-lg border border-[var(--border)]/40 bg-[var(--background)]/60 px-3 py-2 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted)]/40 outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                      />
                    </div>

                    {/* Public server */}
                    <div className="flex items-center justify-between rounded-xl border border-[var(--border)]/30 bg-[var(--surface-secondary)]/30 p-4">
                      <div>
                        <p className="text-[13px] font-semibold">{ss.general.publicServer}</p>
                        <p className="mt-0.5 text-[11px] text-[var(--muted)]/60">{ss.general.publicServerDesc}</p>
                      </div>
                      <Switch isSelected={isPublic} onChange={setIsPublic} size="sm" />
                    </div>

                    <Button
                      onPress={handleSaveGeneral}
                      isDisabled={!name.trim() || isSaving}
                      className="gap-2 rounded-lg px-5"
                    >
                      {isSaving
                        ? <Loader2Icon size={15} className="animate-spin" />
                        : <SaveIcon size={15} />}
                      {ss.general.saveChanges}
                    </Button>
                  </div>
                )}

                {/* INVITATIONS */}
                {section === 'invites' && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-[17px] font-bold">{ss.invitations.heading}</h2>
                      <p className="mt-0.5 text-[12px] text-[var(--muted)]/60">{ss.invitations.subtitle}</p>
                    </div>

                    <div className="rounded-xl border border-[var(--border)]/30 bg-[var(--surface-secondary)]/30 p-4 space-y-3">
                      <p className="text-[13px] font-semibold">{ss.invitations.createInvite}</p>
                      <div className="flex gap-3">
                        <div className="flex-1 space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/50">{ss.invitations.customSlug}</p>
                          <InputGroup className="rounded-lg">
                            <InputGroup.Input
                              value={inviteSlug}
                              onChange={(e) => setInviteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                              placeholder={ss.invitations.slugPlaceholder}
                            />
                          </InputGroup>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]/50">{ss.invitations.maxUses}</p>
                          <InputGroup className="w-24 rounded-lg">
                            <InputGroup.Input
                              type="number"
                              value={inviteMaxUses}
                              onChange={(e) => setInviteMaxUses(e.target.value)}
                              placeholder="&#8734;"
                            />
                          </InputGroup>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch isSelected={invitePermanent} onChange={setInvitePermanent} size="sm" />
                          <span className="text-[13px] text-[var(--foreground)]/80">{ss.invitations.permanent}</span>
                        </div>
                        <Button size="sm" onPress={handleCreateInvite} isDisabled={isCreatingInvite} className="gap-2 rounded-lg">
                          {isCreatingInvite
                            ? <Loader2Icon size={13} className="animate-spin" />
                            : <PlusIcon size={13} />}
                          {ss.invitations.create}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {invites.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[var(--border)]/30 py-10 text-center">
                          <p className="text-[13px] text-[var(--muted)]/50">{ss.invitations.noInvitations}</p>
                        </div>
                      ) : (
                        invites.map((invite, i) => (
                          <div
                            key={invite.id}
                            className="flex items-center gap-3 rounded-lg border border-[var(--border)]/30 bg-[var(--surface-secondary)]/20 px-4 py-3 transition-colors hover:bg-[var(--surface-secondary)]/50"
                            style={{ animationDelay: `${i * 50}ms` }}
                          >
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10">
                              <Link2Icon size={14} className="text-[var(--accent)]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-mono text-[13px] font-medium">
                                {invite.customSlug || invite.code}
                              </p>
                              <p className="text-[11px] text-[var(--muted)]/60">
                                {usageLabel(invite)}
                                {invite.maxUses ? ` / ${invite.maxUses}` : ''}
                                {invite.isPermanent ? ` ${ss.invitations.permanentFlag}` : ''}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              isIconOnly
                              size="sm"
                              className="size-7 text-[var(--muted)]/50 hover:text-[var(--foreground)]"
                              onPress={() => copyInviteLink(invite.customSlug || invite.code)}
                            >
                              {copiedCode === (invite.customSlug || invite.code)
                                ? <CheckIcon size={13} className="text-green-400" />
                                : <CopyIcon size={13} />}
                            </Button>
                            <Button
                              variant="ghost"
                              isIconOnly
                              size="sm"
                              className="size-7 text-[var(--muted)]/50 hover:text-red-500"
                              onPress={() => handleDeleteInvite(invite.id)}
                            >
                              <Trash2Icon size={13} />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* PERMISSIONS */}
                {section === 'droits' && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-[17px] font-bold">{ss.permissions.heading}</h2>
                      <p className="mt-0.5 text-[12px] text-[var(--muted)]/60">{ss.permissions.subtitle}</p>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-[var(--border)]/30 bg-[var(--surface-secondary)]/30 p-4">
                      <div>
                        <p className="text-[13px] font-semibold">{ss.permissions.requireInvite}</p>
                        <p className="mt-0.5 text-[11px] text-[var(--muted)]/60">{ss.permissions.requireInviteDesc}</p>
                      </div>
                      <Switch
                        isSelected={requireInvite}
                        onChange={canManageServer ? setRequireInvite : undefined}
                        isDisabled={!canManageServer}
                        size="sm"
                      />
                    </div>

                    {canManageServer && (
                      <Button
                        onPress={handleSaveGeneral}
                        isDisabled={!name.trim() || isSaving}
                        className="gap-2 rounded-lg px-5"
                      >
                        {isSaving
                          ? <Loader2Icon size={15} className="animate-spin" />
                          : <SaveIcon size={15} />}
                        {ss.permissions.save}
                      </Button>
                    )}

                    {!canManageServer && (
                      <p className="text-[12px] text-[var(--muted)]/50 italic">{ss.permissions.adminOnly}</p>
                    )}

                    <Separator />

                    {/* Claim admin */}
                    <div className="rounded-xl border border-[var(--border)]/30 bg-[var(--surface-secondary)]/30 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                          <ShieldCheckIcon size={13} className="text-amber-500" />
                        </div>
                        <p className="text-[13px] font-semibold">{ss.permissions.claimAdmin}</p>
                      </div>
                      <p className="text-[11px] text-[var(--muted)]/60">{ss.permissions.claimAdminDesc}</p>
                      <div className="flex gap-2">
                        <InputGroup className="flex-1 rounded-lg">
                          <InputGroup.Input
                            value={adminCode}
                            onChange={(e) => { setAdminCode(e.target.value.toUpperCase()); setClaimResult(null); }}
                            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleClaimAdmin()}
                            placeholder={ss.permissions.codePlaceholder}
                            className="font-mono tracking-widest"
                            maxLength={12}
                          />
                        </InputGroup>
                        <Button
                          size="sm"
                          onPress={handleClaimAdmin}
                          isDisabled={!adminCode.trim() || claimLoading}
                          className="gap-1.5 rounded-lg"
                        >
                          {claimLoading
                            ? <Loader2Icon size={13} className="animate-spin" />
                            : <KeyRoundIcon size={13} />}
                          {ss.permissions.validate}
                        </Button>
                      </div>
                      {claimResult && (
                        <div className={cn(
                          'flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-medium',
                          claimResult.ok
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-red-500/10 text-red-500',
                        )}>
                          <claimResult.ok ? CheckIcon : XIcon size={13} />
                          {claimResult.msg}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ROLES */}
                {section === 'roles' && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-[17px] font-bold">{ss.roles.heading}</h2>
                      <p className="mt-0.5 text-[12px] text-[var(--muted)]/60">{ss.roles.subtitle}</p>
                    </div>
                    <RoleManager serverId={serverId} />
                  </div>
                )}

                {/* CHANNELS */}
                {section === 'channels' && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-[17px] font-bold">{ss.channels.heading}</h2>
                      <p className="mt-0.5 text-[12px] text-[var(--muted)]/60">{ss.channels.subtitle}</p>
                    </div>
                    <ChannelManager serverId={serverId} onChannelsChanged={onServerUpdated} />
                  </div>
                )}

                {/* DOMAIN */}
                {section === 'domain' && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-[17px] font-bold">{ss.domain.heading}</h2>
                      <p className="mt-0.5 text-[12px] text-[var(--muted)]/60">{ss.domain.subtitle}</p>
                    </div>

                    <div className="rounded-xl border border-[var(--border)]/30 bg-[var(--surface-secondary)]/30 p-4 space-y-3">
                      <div className="flex gap-2">
                        <InputGroup className="rounded-lg">
                          <InputGroup.Input
                            value={domainInput}
                            onChange={(e) => setDomainInput(e.target.value)}
                            placeholder={ss.domain.placeholder}
                            disabled={server?.domainVerified}
                          />
                        </InputGroup>
                        {!server?.domainVerified && (
                          <Button
                            variant="outline"
                            onPress={handleStartDomainVerify}
                            isDisabled={!domainInput.trim() || isDomainLoading}
                            className="rounded-lg"
                          >
                            {isDomainLoading
                              ? <Loader2Icon size={14} className="animate-spin" />
                              : ss.domain.verify}
                          </Button>
                        )}
                      </div>

                      {server?.domainVerified && (
                        <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2.5 text-[13px] text-green-400">
                          <CheckIcon size={14} className="shrink-0" />
                          <span className="font-medium">{ss.domain.verified}</span>
                        </div>
                      )}
                    </div>

                    {domainTxtRecord && !server?.domainVerified && (
                      <div className="rounded-xl border border-[var(--border)]/30 bg-[var(--surface-secondary)]/30 p-4 space-y-3">
                        <p className="text-[13px] font-semibold">{ss.domain.dnsInstruction}</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 break-all rounded-lg bg-[var(--background)]/60 px-3 py-2.5 font-mono text-[11px] text-[var(--muted)]/80">
                            {domainTxtRecord}
                          </code>
                          <Button
                            variant="ghost"
                            isIconOnly
                            size="sm"
                            className="size-7"
                            onPress={() => navigator.clipboard.writeText(domainTxtRecord)}
                          >
                            <CopyIcon size={13} />
                          </Button>
                        </div>
                        <Button size="sm" onPress={handleCheckDomainVerify} isDisabled={isDomainLoading} className="gap-2 rounded-lg">
                          {isDomainLoading
                            ? <Loader2Icon size={13} className="animate-spin" />
                            : <GlobeIcon size={13} />}
                          {ss.domain.checkDns}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* SERVER NODE */}
                {section === 'node' && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-[17px] font-bold">{ss.serverNode.heading}</h2>
                      <p className="mt-0.5 text-[12px] text-[var(--muted)]/60">{ss.serverNode.subtitle}</p>
                    </div>

                    {/* Token */}
                    <div className="rounded-xl border border-[var(--border)]/30 bg-[var(--surface-secondary)]/30 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10">
                          <ServerIcon size={13} className="text-[var(--accent)]" />
                        </div>
                        <p className="text-[13px] font-semibold">{ss.serverNode.authToken}</p>
                      </div>
                      <p className="text-[11px] text-[var(--muted)]/60">{ss.serverNode.authTokenDesc}</p>
                      <div className="flex items-center gap-2">
                        <InputGroup className="flex-1 rounded-lg">
                          <InputGroup.Input
                            value={showToken ? nodeToken : '\u2022'.repeat(nodeToken.length || 36)}
                            readOnly
                            className="font-mono text-[11px]"
                          />
                        </InputGroup>
                        <Button variant="ghost" isIconOnly size="sm" className="size-7" onPress={() => setShowToken((v) => !v)}>
                          {showToken
                            ? <EyeOffIcon size={14} />
                            : <EyeIcon size={14} />}
                        </Button>
                        <Button variant="ghost" isIconOnly size="sm" className="size-7" onPress={copyToken}>
                          {copiedToken
                            ? <CheckIcon size={14} className="text-green-400" />
                            : <CopyIcon size={14} />}
                        </Button>
                      </div>
                    </div>

                    {/* Start command */}
                    <div className="rounded-xl border border-[var(--border)]/30 bg-[var(--surface-secondary)]/30 p-4 space-y-3">
                      <p className="text-[13px] font-semibold">{ss.serverNode.startNode}</p>
                      <p className="text-[11px] text-[var(--muted)]/60">{ss.serverNode.startNodeDesc}</p>
                      <code className="block whitespace-pre-wrap break-all rounded-lg bg-[var(--background)]/60 px-3 py-3 font-mono text-[11px] leading-relaxed text-[var(--muted)]/80">
                        {`npx @alfychat/server-node start \\\n  --server-id=${serverId} \\\n  --token=<your-token> \\\n  --gateway=${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'} \\\n  --port=4100`}
                      </code>
                    </div>

                    {/* Warning */}
                    <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3.5">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                        <AlertTriangleIcon size={13} className="text-amber-500" />
                      </div>
                      <p className="text-[12px] text-[var(--muted)]/70 pt-0.5">
                        {ss.serverNode.authTokenDesc}
                      </p>
                    </div>

                    {/* Claim admin */}
                    <div className="rounded-xl border border-[var(--border)]/30 bg-[var(--surface-secondary)]/30 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                          <ShieldCheckIcon size={13} className="text-amber-500" />
                        </div>
                        <p className="text-[13px] font-semibold">{ss.serverNode.claimAdmin}</p>
                      </div>
                      <p className="text-[11px] text-[var(--muted)]/60">{ss.serverNode.claimAdminDesc}</p>
                      <div className="flex gap-2">
                        <InputGroup className="flex-1 rounded-lg">
                          <InputGroup.Input
                            value={adminCode}
                            onChange={(e) => { setAdminCode(e.target.value.toUpperCase()); setClaimResult(null); }}
                            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleClaimAdmin()}
                            placeholder={ss.serverNode.codePlaceholder}
                            className="font-mono tracking-widest"
                            maxLength={12}
                          />
                        </InputGroup>
                        <Button
                          size="sm"
                          onPress={handleClaimAdmin}
                          isDisabled={!adminCode.trim() || claimLoading}
                          className="rounded-lg"
                        >
                          {claimLoading
                            ? <Loader2Icon size={13} className="animate-spin" />
                            : ss.serverNode.validate}
                        </Button>
                      </div>
                      {claimResult && (
                        <div className={cn(
                          'flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-medium',
                          claimResult.ok
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-red-500/10 text-red-500',
                        )}>
                          <claimResult.ok ? CheckIcon : XIcon size={13} />
                          {claimResult.msg}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
          </div>
        </Modal.Dialog>
      </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}