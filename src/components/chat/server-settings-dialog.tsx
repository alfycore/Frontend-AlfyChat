'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import {
  AlertTriangleIcon,
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  GlobeIcon,
  HashIcon,
  KeyRoundIcon,
  Link2Icon,
  Loader2Icon,
  PlusIcon,
  SaveIcon,
  ServerIcon,
  SettingsIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserPlusIcon,
  XIcon,
} from '@/components/icons';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/components/locale-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { ChannelManager } from '@/components/chat/channel-manager';
import { RoleManager } from '@/components/chat/role-manager';
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

const SECTION_ICONS: Record<Section, React.ComponentType<{ size?: number; className?: string }>> = {
  general: SettingsIcon,
  invites: UserPlusIcon,
  droits: KeyRoundIcon,
  roles: ShieldCheckIcon,
  channels: HashIcon,
  domain: GlobeIcon,
  node: ServerIcon,
};

function CardSurface({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-3xl border border-border/40 bg-card/40 p-5', className)}>
      {children}
    </div>
  );
}

function SectionIntro({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="font-heading text-xl tracking-tight text-foreground">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-[11px] font-medium text-muted-foreground/50">{children}</label>;
}

function InfoNote({
  icon: Icon,
  tone,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: 'amber' | 'blue' | 'green';
  children: React.ReactNode;
}) {
  const tones = {
    amber: 'border-amber-500/20 bg-amber-500/8 text-amber-200',
    blue: 'border-sky-500/20 bg-sky-500/8 text-sky-200',
    green: 'border-success/20 bg-success/8 text-success',
  } as const;

  return (
    <div className={cn('flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm', tones[tone])}>
      <div className="mt-0.5 shrink-0">
        <Icon size={15} />
      </div>
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

function normalizeServer(serverId: string, data: any): ServerInfo | null {
  if (!data || data.error) return null;
  return {
    id: data.id || serverId,
    name: data.name || 'Serveur',
    description: data.description || '',
    iconUrl: data.iconUrl || data.icon_url || undefined,
    bannerUrl: data.bannerUrl || data.banner_url || undefined,
    isPublic: data.isPublic ?? data.is_public ?? false,
    customDomain: data.customDomain || data.custom_domain || '',
    domainVerified: data.domainVerified ?? data.domain_verified ?? false,
    ownerId: data.ownerId || data.owner_id || undefined,
  };
}

function normalizeInvites(data: any): Invite[] {
  const rawInvites = Array.isArray(data?.invites) ? data.invites : [];
  return rawInvites.map((invite: any) => ({
    id: invite.id,
    code: invite.code,
    customSlug: invite.customSlug ?? invite.custom_slug,
    maxUses: invite.maxUses ?? invite.max_uses,
    uses: invite.uses || 0,
    expiresAt: invite.expiresAt ?? invite.expires_at,
    isPermanent: Boolean(invite.isPermanent ?? invite.is_permanent),
    createdAt: invite.createdAt ?? invite.created_at ?? new Date().toISOString(),
  }));
}

function promiseRequest<T>(requester: (callback: (value: T) => void) => void) {
  return new Promise<T>((resolve) => requester(resolve));
}

export function ServerSettingsDialog({
  serverId,
  open,
  onOpenChange,
  onServerUpdated,
}: ServerSettingsDialogProps) {
  const { user } = useAuth();
  const { t, tx } = useTranslation();
  const ss = t.serverSettings;

  const navItems = useMemo(
    () => [
      { id: 'general' as const, label: ss.sections.general },
      { id: 'invites' as const, label: ss.sections.invitations },
      { id: 'droits' as const, label: ss.sections.permissions },
      { id: 'roles' as const, label: ss.sections.roles },
      { id: 'channels' as const, label: ss.sections.channels },
      { id: 'domain' as const, label: ss.sections.domain },
      { id: 'node' as const, label: ss.sections.serverNode },
    ],
    [ss.sections],
  );

  const [section, setSection] = useState<Section>('general');
  const [server, setServer] = useState<ServerInfo | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [canManageServer, setCanManageServer] = useState(false);
  const [ownerJoinedViaInvite, setOwnerJoinedViaInvite] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [requireInvite, setRequireInvite] = useState(false);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const [inviteSlug, setInviteSlug] = useState('');
  const [inviteMaxUses, setInviteMaxUses] = useState('');
  const [invitePermanent, setInvitePermanent] = useState(true);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');

  const [domainInput, setDomainInput] = useState('');
  const [domainTxtRecord, setDomainTxtRecord] = useState('');
  const [isDomainLoading, setIsDomainLoading] = useState(false);

  const [nodeToken, setNodeToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const [adminCode, setAdminCode] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimResult, setClaimResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const visibleSections = navItems.filter(({ id }) => {
    if (id === 'droits' && ownerJoinedViaInvite) return false;
    if (id === 'droits' && !canManageServer && server?.ownerId) return false;
    if (canManageServer) return true;
    return id === 'invites' || id === 'droits';
  });

  useEffect(() => {
    const handleOwnerJoined = (data: unknown) => {
      const payload = (data as { payload?: Record<string, unknown> })?.payload || data;
      const serverEventId = (payload as { serverId?: string })?.serverId;
      if (serverEventId !== serverId) return;
      setOwnerJoinedViaInvite(true);
      setSection((currentSection) => (currentSection === 'droits' ? 'invites' : currentSection));
    };

    socketService.onServerOwnerJoined(handleOwnerJoined);
    return () => {
      socketService.off('SERVER_OWNER_JOINED', handleOwnerJoined as any);
    };
  }, [serverId]);

  useEffect(() => {
    if (!open || !serverId) return;

    const handleServerUpdate = (data: any) => {
      const payload = data?.payload || data;
      if (payload?.serverId === serverId || payload?.id === serverId) {
        void loadDialogData();
      }
    };

    socketService.on('SERVER_UPDATE', handleServerUpdate);
    return () => {
      socketService.off('SERVER_UPDATE', handleServerUpdate);
    };
  }, [open, serverId]);

  useEffect(() => {
    if (!open || !serverId) return;
    void loadDialogData();
  }, [open, serverId]);

  async function loadDialogData() {
    setIsLoading(true);

    const [serverData, inviteData, memberData, roleData, nodeTokenResponse] = await Promise.all([
      promiseRequest<any>((resolve) => socketService.requestServerInfo(serverId, resolve)),
      promiseRequest<any>((resolve) => socketService.requestInvites(serverId, resolve)),
      promiseRequest<any>((resolve) => socketService.requestMembers(serverId, resolve)),
      promiseRequest<any>((resolve) => socketService.requestRoles(serverId, resolve)),
      api.getNodeToken(serverId),
    ]);

    const normalizedServer = normalizeServer(serverId, serverData);
    setServer(normalizedServer);
    setInvites(normalizeInvites(inviteData));
    setNodeToken(nodeTokenResponse.success && nodeTokenResponse.data ? (nodeTokenResponse.data as any).nodeToken || '' : '');

    if (normalizedServer) {
      setName(normalizedServer.name || '');
      setDescription(normalizedServer.description || '');
      setIsPublic(Boolean(normalizedServer.isPublic));
      setRequireInvite(!normalizedServer.isPublic);
      setDomainInput(normalizedServer.customDomain || '');
    }

    const isOwner = Boolean(user && normalizedServer?.ownerId === user.id);
    let hasManageRights = isOwner;

    if (!hasManageRights && user) {
      const members = Array.isArray(memberData?.members) ? memberData.members : [];
      const roles = Array.isArray(roleData?.roles) ? roleData.roles : [];
      const member = members.find((entry: any) => (entry.userId || entry.user_id) === user.id);

      if (member) {
        const roleIds = Array.isArray(member.roleIds || member.role_ids)
          ? (member.roleIds || member.role_ids)
          : (() => {
              try {
                return JSON.parse(member.roleIds || member.role_ids || '[]');
              } catch {
                return [];
              }
            })();

        const memberRoles = roles.filter((role: any) => roleIds.includes(role.id));
        hasManageRights = memberRoles.some((role: any) => {
          const permissions = role.permissions;
          if (Array.isArray(permissions)) {
            return permissions.includes('ADMIN') || permissions.includes('MANAGE_ROLES');
          }
          const bitmask = typeof permissions === 'number' ? permissions : parseInt(permissions || '0', 10);
          return (bitmask & 0x40) !== 0 || (bitmask & 0x100) !== 0;
        });
      }
    }

    setCanManageServer(hasManageRights);
    setSection((currentSection) => {
      const allowedSections = navItems
        .filter(({ id }) => {
          if (id === 'droits' && ownerJoinedViaInvite) return false;
          if (id === 'droits' && !hasManageRights && normalizedServer?.ownerId) return false;
          if (hasManageRights) return true;
          return id === 'invites' || id === 'droits';
        })
        .map((item) => item.id);
      if (allowedSections.includes(currentSection)) return currentSection;
      return hasManageRights ? 'general' : 'invites';
    });

    setIsLoading(false);
  }

  async function handleSaveGeneral() {
    if (!name.trim()) return;

    setIsSaving(true);
    let nextIconUrl = server?.iconUrl;
    let nextBannerUrl = server?.bannerUrl;

    if (iconFile) {
      const uploadIconResponse = await api.uploadImage(iconFile, 'icon');
      if (uploadIconResponse.success && uploadIconResponse.data) {
        nextIconUrl = uploadIconResponse.data.url;
      }
    }

    if (bannerFile) {
      const uploadBannerResponse = await api.uploadImage(bannerFile, 'banner');
      if (uploadBannerResponse.success && uploadBannerResponse.data) {
        nextBannerUrl = uploadBannerResponse.data.url;
      }
    }

    socketService.updateServerViaNode(serverId, {
      name: name.trim(),
      description,
      isPublic: isPublic,
      iconUrl: nextIconUrl,
      bannerUrl: nextBannerUrl,
    });

    setIconFile(null);
    setBannerFile(null);
    setIconPreview(null);
    setBannerPreview(null);
    setIsSaving(false);

    setTimeout(() => {
      void loadDialogData();
      onServerUpdated?.();
    }, 300);
  }

  async function handleCreateInvite() {
    if (isCreatingInvite) return;
    setIsCreatingInvite(true);

    socketService.createInvite(
      serverId,
      {
        customSlug: inviteSlug.trim() || undefined,
        maxUses: inviteMaxUses ? parseInt(inviteMaxUses, 10) : undefined,
        isPermanent: invitePermanent,
      },
      () => {
        setInviteSlug('');
        setInviteMaxUses('');
        setInvitePermanent(true);
        setIsCreatingInvite(false);
        void loadDialogData();
      },
    );
  }

  function handleDeleteInvite(inviteId: string) {
    socketService.deleteInvite(serverId, inviteId, () => void loadDialogData());
  }

  function copyInviteLink(code: string) {
    const inviteUrl = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 1800);
    });
  }

  async function handleStartDomainVerify() {
    if (!domainInput.trim()) return;
    setIsDomainLoading(true);
    const response = await api.startDomainVerification(serverId, domainInput.trim());
    if (response.success && response.data) {
      setDomainTxtRecord((response.data as any).txtRecord || '');
    }
    setIsDomainLoading(false);
  }

  async function handleCheckDomainVerify() {
    setIsDomainLoading(true);
    await api.checkDomainVerification(serverId);
    await loadDialogData();
    setIsDomainLoading(false);
  }

  async function handleClaimAdmin() {
    if (!adminCode.trim() || !user?.id) return;
    setClaimLoading(true);
    setClaimResult(null);

    const response = await api.claimAdmin(serverId, adminCode.trim().toUpperCase(), user.id);
    if (response.success) {
      setClaimResult({ ok: true, msg: ss.permissions.adminGranted });
      setAdminCode('');
      await loadDialogData();
    } else {
      setClaimResult({ ok: false, msg: response.error || ss.permissions.invalidCode });
    }

    setClaimLoading(false);
  }

  function copyToken() {
    navigator.clipboard.writeText(nodeToken).then(() => {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 1800);
    });
  }

  function handleIconChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  }

  function handleBannerChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  }

  function handleClaimKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      void handleClaimAdmin();
    }
  }

  const usageLabel = (invite: Invite) => {
    const count = String(invite.uses);
    return invite.uses === 1
      ? tx(ss.invitations.usageSingular, { n: count })
      : tx(ss.invitations.usagePlural, { n: count });
  };

  function renderGeneralSection() {
    return (
      <div className="space-y-5">
        <SectionIntro
          title={ss.general.heading}
          description={ss.general.subtitle}
          actions={
            <Button onClick={handleSaveGeneral} disabled={!name.trim() || isSaving} className="gap-2 rounded-xl">
              {isSaving ? <Loader2Icon size={15} className="animate-spin" /> : <SaveIcon size={15} />}
              {ss.general.saveChanges}
            </Button>
          }
        />

        <CardSurface className="overflow-hidden p-0">
          <button
            type="button"
            onClick={() => document.getElementById('server-banner-upload')?.click()}
            className="group relative block h-40 w-full overflow-hidden bg-muted/40 text-left"
          >
            {(bannerPreview || server?.bannerUrl) ? (
              <img
                src={bannerPreview || resolveMediaUrl(server?.bannerUrl)}
                alt={ss.general.bannerAlt}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="h-full w-full bg-linear-to-br from-sky-500/20 via-cyan-500/10 to-accent/20" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              {ss.general.clickToChange}
            </div>
          </button>
          <input id="server-banner-upload" type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
        </CardSurface>

        <div className="grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)]">
          <CardSurface>
            <FieldLabel>{ss.general.serverName}</FieldLabel>
            <button
              type="button"
              onClick={() => document.getElementById('server-icon-upload')?.click()}
              className="group relative block"
            >
              <Avatar className="size-24 rounded-3xl border border-border/50 ring-2 ring-border/30 transition-all group-hover:ring-border/70">
                <AvatarImage src={iconPreview || resolveMediaUrl(server?.iconUrl) || undefined} className="rounded-3xl object-cover" />
                <AvatarFallback className="rounded-3xl bg-accent text-xl font-bold text-accent-foreground">
                  {(name || server?.name || 'SV').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/45 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                {ss.general.clickToChange}
              </div>
            </button>
            <input id="server-icon-upload" type="file" accept="image/*" className="hidden" onChange={handleIconChange} />
          </CardSurface>

          <CardSurface>
            <div className="space-y-4">
              <div>
                <FieldLabel>{ss.general.serverName}</FieldLabel>
                <Input value={name} onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)} placeholder={ss.general.serverNamePlaceholder} />
              </div>
              <div>
                <FieldLabel>{ss.general.description}</FieldLabel>
                <textarea
                  value={description}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setDescription(event.target.value)}
                  placeholder={ss.general.descriptionPlaceholder}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/45 focus:border-accent/40"
                />
              </div>
            </div>
          </CardSurface>
        </div>

        <CardSurface className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{ss.general.publicServer}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{ss.general.publicServerDesc}</p>
          </div>
          <Switch checked={isPublic} onCheckedChange={(v) => { setIsPublic(v); setRequireInvite(!v); }} />
        </CardSurface>
      </div>
    );
  }

  function renderInvitesSection() {
    return (
      <div className="space-y-5">
        <SectionIntro title={ss.invitations.heading} description={ss.invitations.subtitle} />

        <CardSurface>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px]">
            <div>
              <FieldLabel>{ss.invitations.customSlug}</FieldLabel>
              <Input
                value={inviteSlug}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setInviteSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder={ss.invitations.slugPlaceholder}
              />
            </div>
            <div>
              <FieldLabel>{ss.invitations.maxUses}</FieldLabel>
              <Input
                type="number"
                value={inviteMaxUses}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setInviteMaxUses(event.target.value)}
                placeholder="∞"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <label className="flex items-center gap-3 text-sm text-muted-foreground">
              <Switch checked={invitePermanent} onCheckedChange={setInvitePermanent} />
              {ss.invitations.permanent}
            </label>

            <Button onClick={handleCreateInvite} disabled={isCreatingInvite} className="gap-2 rounded-xl">
              {isCreatingInvite ? <Loader2Icon size={14} className="animate-spin" /> : <PlusIcon size={14} />}
              {ss.invitations.create}
            </Button>
          </div>
        </CardSurface>

        <div className="space-y-3">
          {invites.length === 0 ? (
            <CardSurface className="py-10 text-center text-sm text-muted-foreground">
              {ss.invitations.noInvitations}
            </CardSurface>
          ) : (
            invites.map((invite) => {
              const code = invite.customSlug || invite.code;
              return (
                <CardSurface key={invite.id} className="flex flex-wrap items-center gap-3 px-4 py-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                    <Link2Icon size={16} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm font-semibold text-foreground">{code}</p>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {usageLabel(invite)}
                      {invite.maxUses ? ` / ${invite.maxUses}` : ''}
                      {invite.isPermanent ? ` ${ss.invitations.permanentFlag}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="icon-sm" className="size-8" onClick={() => copyInviteLink(code)}>
                      {copiedCode === code ? <CheckIcon size={14} className="text-success" /> : <CopyIcon size={14} />}
                    </Button>
                    <Button variant="ghost" size="icon-sm" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteInvite(invite.id)}>
                      <Trash2Icon size={14} />
                    </Button>
                  </div>
                </CardSurface>
              );
            })
          )}
        </div>
      </div>
    );
  }

  function renderPermissionsSection() {
    return (
      <div className="space-y-5">
        <SectionIntro title={ss.permissions.heading} description={ss.permissions.subtitle} />

        <CardSurface className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{ss.permissions.requireInvite}</p>
            <p className="mt-1 text-sm text-muted-foreground">{ss.permissions.requireInviteDesc}</p>
          </div>
          <Switch checked={requireInvite} onCheckedChange={canManageServer ? (v) => { setRequireInvite(v); setIsPublic(!v); } : undefined} disabled={!canManageServer} />
        </CardSurface>

        {canManageServer ? (
          <Button onClick={handleSaveGeneral} disabled={isSaving} className="gap-2 rounded-xl">
            {isSaving ? <Loader2Icon size={14} className="animate-spin" /> : <SaveIcon size={14} />}
            {ss.permissions.save}
          </Button>
        ) : (
          <InfoNote icon={AlertTriangleIcon} tone="amber">
            {ss.permissions.adminOnly}
          </InfoNote>
        )}

        {!server?.ownerId && (
        <CardSurface>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-400">
              <ShieldCheckIcon size={15} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{ss.permissions.claimAdmin}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{ss.permissions.claimAdminDesc}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Input
              value={adminCode}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setAdminCode(event.target.value.toUpperCase());
                setClaimResult(null);
              }}
              onKeyDown={handleClaimKeyDown}
              placeholder={ss.permissions.codePlaceholder}
              className="flex-1 font-mono tracking-widest"
              maxLength={12}
            />
            <Button onClick={handleClaimAdmin} disabled={!adminCode.trim() || claimLoading} className="gap-2 rounded-xl">
              {claimLoading ? <Loader2Icon size={14} className="animate-spin" /> : <KeyRoundIcon size={14} />}
              {ss.permissions.validate}
            </Button>
          </div>

          {claimResult && (
            <div className={cn(
              'mt-3 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm',
              claimResult.ok
                ? 'border border-success/20 bg-success/10 text-success'
                : 'border border-destructive/20 bg-destructive/10 text-destructive',
            )}>
              {claimResult.ok ? <CheckIcon size={14} /> : <XIcon size={14} />}
              {claimResult.msg}
            </div>
          )}
        </CardSurface>
        )}
      </div>
    );
  }

  function renderRolesSection() {
    return (
      <div className="space-y-5">
        <SectionIntro title={ss.roles.heading} description={ss.roles.subtitle} />
        <RoleManager serverId={serverId} />
      </div>
    );
  }

  function renderChannelsSection() {
    return (
      <div className="space-y-5">
        <SectionIntro title={ss.channels.heading} description={ss.channels.subtitle} />
        <ChannelManager serverId={serverId} onChannelsChanged={onServerUpdated} />
      </div>
    );
  }

  function renderDomainSection() {
    return (
      <div className="space-y-5">
        <SectionIntro title={ss.domain.heading} description={ss.domain.subtitle} />

        <CardSurface>
          <div className="flex flex-wrap gap-2">
            <Input
              value={domainInput}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setDomainInput(event.target.value)}
              placeholder={ss.domain.placeholder}
              disabled={server?.domainVerified}
              className="flex-1"
            />
            {!server?.domainVerified && (
              <Button variant="outline" onClick={handleStartDomainVerify} disabled={!domainInput.trim() || isDomainLoading} className="rounded-xl">
                {isDomainLoading ? <Loader2Icon size={14} className="animate-spin" /> : ss.domain.verify}
              </Button>
            )}
          </div>

          {server?.domainVerified && (
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-success/20 bg-success/10 px-3 py-2.5 text-sm text-success">
              <CheckIcon size={14} />
              {ss.domain.verified}
            </div>
          )}
        </CardSurface>

        {domainTxtRecord && !server?.domainVerified && (
          <CardSurface>
            <p className="text-sm font-semibold text-foreground">{ss.domain.dnsInstruction}</p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 break-all rounded-2xl bg-muted/40 px-3 py-3 font-mono text-xs text-muted-foreground">
                {domainTxtRecord}
              </code>
              <Button variant="ghost" size="icon-sm" className="size-8" onClick={() => navigator.clipboard.writeText(domainTxtRecord)}>
                <CopyIcon size={14} />
              </Button>
            </div>
            <Button onClick={handleCheckDomainVerify} disabled={isDomainLoading} className="mt-3 gap-2 rounded-xl">
              {isDomainLoading ? <Loader2Icon size={14} className="animate-spin" /> : <GlobeIcon size={14} />}
              {ss.domain.checkDns}
            </Button>
          </CardSurface>
        )}
      </div>
    );
  }

  function renderNodeSection() {
    const gatewayOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://gateway.alfychat.app';

    return (
      <div className="space-y-5">
        <SectionIntro title={ss.serverNode.heading} description={ss.serverNode.subtitle} />

        <CardSurface>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <ServerIcon size={15} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{ss.serverNode.authToken}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{ss.serverNode.authTokenDesc}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={showToken ? nodeToken : '•'.repeat(Math.max(nodeToken.length, 24))}
              readOnly
              className="flex-1 font-mono text-xs"
            />
            <Button variant="ghost" size="icon-sm" className="size-8" onClick={() => setShowToken((current) => !current)}>
              {showToken ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
            </Button>
            <Button variant="ghost" size="icon-sm" className="size-8" onClick={copyToken}>
              {copiedToken ? <CheckIcon size={14} className="text-success" /> : <CopyIcon size={14} />}
            </Button>
          </div>
        </CardSurface>

        <CardSurface>
          <p className="text-sm font-semibold text-foreground">{ss.serverNode.startNode}</p>
          <p className="mt-1 text-sm text-muted-foreground">{ss.serverNode.startNodeDesc}</p>
          <code className="mt-3 block whitespace-pre-wrap break-all rounded-2xl bg-muted/40 px-3 py-3 font-mono text-xs leading-relaxed text-muted-foreground">
            {`npx @alfychat/server-node start \\
  --server-id=${serverId} \\
  --token=<your-token> \\
  --gateway=${gatewayOrigin} \\
  --port=4100`}
          </code>
        </CardSurface>

        <InfoNote icon={AlertTriangleIcon} tone="amber">
          {ss.serverNode.authTokenDesc}
        </InfoNote>
      </div>
    );
  }

  function renderSectionContent() {
    switch (section) {
      case 'general':
        return renderGeneralSection();
      case 'invites':
        return renderInvitesSection();
      case 'droits':
        return renderPermissionsSection();
      case 'roles':
        return renderRolesSection();
      case 'channels':
        return renderChannelsSection();
      case 'domain':
        return renderDomainSection();
      case 'node':
        return renderNodeSection();
      default:
        return null;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[88vh] max-w-5xl overflow-hidden rounded-2xl border border-border/50 bg-card/95 p-0 shadow-2xl shadow-black/30 backdrop-blur-xl sm:max-w-5xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Paramètres du serveur</DialogTitle>
        </DialogHeader>

        <div className="grid h-full min-h-0 md:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-r border-border/50 bg-card/40 p-4">
            <div className="overflow-hidden rounded-3xl border border-border/40 bg-card/50">
              <div className="h-24 bg-muted/30">
                {(bannerPreview || server?.bannerUrl) && (
                  <img src={bannerPreview || resolveMediaUrl(server?.bannerUrl)} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex items-end gap-3 px-4 pb-4">
                <Avatar className="-mt-8 size-16 rounded-3xl border-4 border-card shadow-lg">
                  <AvatarImage src={iconPreview || resolveMediaUrl(server?.iconUrl) || undefined} alt={server?.name} />
                  <AvatarFallback className="rounded-3xl bg-primary/12 font-heading text-lg tracking-tight text-primary">
                    {(server?.name || 'SV').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 pb-1">
                  <p className="truncate font-heading text-sm tracking-tight text-foreground">{server?.name || 'Serveur'}</p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {canManageServer ? 'Administration complète' : 'Accès limité'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 mb-2 px-2">
              <p className="text-[11px] font-medium text-muted-foreground/40">
                {ss.sectionHeader}
              </p>
            </div>

            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {visibleSections.map(({ id, label }) => {
                const Icon = SECTION_ICONS[id];
                const active = section === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSection(id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition-colors',
                      active
                        ? 'bg-linear-to-r from-primary/15 to-primary/5 text-primary ring-1 ring-primary/25 shadow-sm shadow-primary/10'
                        : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                    )}
                  >
                    <span className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-xl',
                      active ? 'bg-primary/15 text-primary' : 'bg-muted/50 text-muted-foreground',
                    )}>
                      <Icon size={15} />
                    </span>
                    <span className="truncate font-medium">{label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="pt-3">
              <Separator className="mb-3" />
              <Button variant="ghost" className="w-full justify-start gap-2 rounded-2xl text-muted-foreground" onClick={() => onOpenChange(false)}>
                <XIcon size={14} />
                {ss.close}
              </Button>
            </div>
          </aside>

          <section className="min-h-0 overflow-y-auto bg-background px-6 py-6 sm:px-7">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Spinner size="md" />
              </div>
            ) : (
              renderSectionContent()
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
