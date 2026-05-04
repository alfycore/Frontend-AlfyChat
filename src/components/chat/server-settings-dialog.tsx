'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
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
import { useUIStyle } from '@/hooks/use-ui-style';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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

const SECTION_META: Record<Section, { icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  general:  { icon: SettingsIcon,    color: 'text-blue-400' },
  invites:  { icon: UserPlusIcon,    color: 'text-green-400' },
  droits:   { icon: KeyRoundIcon,    color: 'text-amber-400' },
  roles:    { icon: ShieldCheckIcon, color: 'text-purple-400' },
  channels: { icon: HashIcon,        color: 'text-cyan-400' },
  domain:   { icon: GlobeIcon,       color: 'text-indigo-400' },
  node:     { icon: ServerIcon,      color: 'text-rose-400' },
};

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
  const raw = Array.isArray(data?.invites) ? data.invites : [];
  return raw.map((inv: any) => ({
    id: inv.id,
    code: inv.code,
    customSlug: inv.customSlug ?? inv.custom_slug,
    maxUses: inv.maxUses ?? inv.max_uses,
    uses: inv.uses || 0,
    expiresAt: inv.expiresAt ?? inv.expires_at,
    isPermanent: Boolean(inv.isPermanent ?? inv.is_permanent),
    createdAt: inv.createdAt ?? inv.created_at ?? new Date().toISOString(),
  }));
}

function promiseRequest<T>(requester: (cb: (value: T) => void) => void) {
  return new Promise<T>((resolve) => requester(resolve));
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">{children}</p>;
}

function SettingsCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('overflow-hidden rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm', className)}>{children}</div>;
}

function SettingsRow({ label, description, children, border = true }: { label: string; description?: string; children?: React.ReactNode; border?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 px-5 py-4', border && 'border-b border-border/30 last:border-0')}>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        {description && <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function AlertNote({ tone, icon: Icon, children }: { tone: 'amber' | 'blue' | 'green' | 'red'; icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
  const cls = { amber: 'border-amber-500/20 bg-amber-500/8 text-amber-300', blue: 'border-sky-500/20 bg-sky-500/8 text-sky-300', green: 'border-emerald-500/20 bg-emerald-500/8 text-emerald-300', red: 'border-rose-500/20 bg-rose-500/8 text-rose-300' } as const;
  return (
    <div className={cn('flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-[13px] leading-relaxed', cls[tone])}>
      <Icon size={15} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function ServerSettingsDialog({ serverId, open, onOpenChange, onServerUpdated }: ServerSettingsDialogProps) {
  const { user } = useAuth();
  const { t, tx } = useTranslation();
  const ss = t.serverSettings;
  const ui = useUIStyle();

  const navItems = useMemo(() => [
    { id: 'general' as const,  label: ss.sections.general },
    { id: 'invites' as const,  label: ss.sections.invitations },
    { id: 'droits' as const,   label: ss.sections.permissions },
    { id: 'roles' as const,    label: ss.sections.roles },
    { id: 'channels' as const, label: ss.sections.channels },
    { id: 'domain' as const,   label: ss.sections.domain },
    { id: 'node' as const,     label: ss.sections.serverNode },
  ], [ss.sections]);

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
  const claimInFlightRef = useRef(false);

  const visibleSections = navItems.filter(({ id }) => {
    if (id === 'droits' && ownerJoinedViaInvite) return false;
    if (id === 'droits' && !canManageServer && server?.ownerId) return false;
    if (canManageServer) return true;
    return id === 'invites' || id === 'droits';
  });

  useEffect(() => {
    const h = (data: unknown) => {
      const p = (data as any)?.payload || data;
      if ((p as any)?.serverId !== serverId) return;
      setOwnerJoinedViaInvite(true);
      setSection((c) => (c === 'droits' ? 'invites' : c));
    };
    socketService.onServerOwnerJoined(h);
    return () => { socketService.off('SERVER_OWNER_JOINED', h as any); };
  }, [serverId]);

  useEffect(() => {
    if (!open || !serverId) return;
    const h = (data: any) => {
      const p = data?.payload || data;
      if (p?.serverId === serverId || p?.id === serverId) void loadDialogData();
    };
    socketService.on('SERVER_UPDATE', h);
    return () => { socketService.off('SERVER_UPDATE', h); };
  }, [open, serverId]);

  useEffect(() => {
    if (!open || !serverId) return;
    void loadDialogData();
  }, [open, serverId]);

  async function loadDialogData() {
    setIsLoading(true);
    const [sd, id, md, rd] = await Promise.all([
      promiseRequest<any>((cb) => socketService.requestServerInfo(serverId, cb)),
      promiseRequest<any>((cb) => socketService.requestInvites(serverId, cb)),
      promiseRequest<any>((cb) => socketService.requestMembers(serverId, cb)),
      promiseRequest<any>((cb) => socketService.requestRoles(serverId, cb)),
    ]);
    const ns = normalizeServer(serverId, sd);
    setServer(ns);
    setInvites(normalizeInvites(id));
    if (ns) { setName(ns.name || ''); setDescription(ns.description || ''); setIsPublic(Boolean(ns.isPublic)); setRequireInvite(!ns.isPublic); setDomainInput(ns.customDomain || ''); }

    const isOwner = Boolean(user && ns?.ownerId === user.id);
    let canManage = isOwner, canAdmin = isOwner;
    if (!canManage && user) {
      const members = Array.isArray(md?.members) ? md.members : [];
      const roles = Array.isArray(rd?.roles) ? rd.roles : [];
      const member = members.find((e: any) => (e.userId || e.user_id) === user.id);
      if (member) {
        const rids = Array.isArray(member.roleIds || member.role_ids) ? (member.roleIds || member.role_ids) : (() => { try { return JSON.parse(member.roleIds || member.role_ids || '[]'); } catch { return []; } })();
        const mroles = roles.filter((r: any) => rids.includes(r.id));
        canManage = mroles.some((r: any) => { const p = r.permissions; if (Array.isArray(p)) return p.includes('ADMIN') || p.includes('MANAGE_ROLES'); const b = typeof p === 'number' ? p : parseInt(p || '0', 10); return (b & 0x40) !== 0 || (b & 0x100) !== 0; });
        canAdmin = mroles.some((r: any) => { const p = r.permissions; if (Array.isArray(p)) return p.includes('ADMIN'); const b = typeof p === 'number' ? p : parseInt(p || '0', 10); return (b & 0x40) !== 0; });
      }
    }
    setCanManageServer(canManage);
    if (canAdmin) { const tr = await api.getNodeToken(serverId); setNodeToken(tr.success && tr.data ? (tr.data as any).nodeToken || '' : ''); }

    setSection((cur) => {
      const allowed = navItems.filter(({ id }) => {
        if (id === 'droits' && ownerJoinedViaInvite) return false;
        if (id === 'droits' && !canManage && ns?.ownerId) return false;
        if (canManage) return true;
        return id === 'invites' || id === 'droits';
      }).map((i) => i.id);
      if (allowed.includes(cur)) return cur;
      return canManage ? 'general' : 'invites';
    });
    setIsLoading(false);
  }

  async function handleSaveGeneral() {
    if (!name.trim()) return;
    setIsSaving(true);
    let nextIcon = server?.iconUrl, nextBanner = server?.bannerUrl;
    if (iconFile) { const r = await api.uploadImage(iconFile, 'icon'); if (r.success && r.data) nextIcon = r.data.url; }
    if (bannerFile) { const r = await api.uploadImage(bannerFile, 'banner'); if (r.success && r.data) nextBanner = r.data.url; }
    socketService.updateServerViaNode(serverId, { name: name.trim(), description, isPublic, iconUrl: nextIcon, bannerUrl: nextBanner });
    socketService.emitLocal('SERVER_UPDATE', { payload: { id: serverId, name: name.trim(), description, isPublic, iconUrl: nextIcon, bannerUrl: nextBanner } });
    setServer((p) => p ? { ...p, name: name.trim(), description, isPublic, iconUrl: nextIcon, bannerUrl: nextBanner } : p);
    setIconFile(null); setBannerFile(null); setIconPreview(null); setBannerPreview(null);
    setIsSaving(false);
    onServerUpdated?.();
  }

  async function handleCreateInvite() {
    if (isCreatingInvite) return;
    setIsCreatingInvite(true);
    socketService.createInvite(serverId, { customSlug: inviteSlug.trim() || undefined, maxUses: inviteMaxUses ? parseInt(inviteMaxUses, 10) : undefined, isPermanent: invitePermanent }, () => { setInviteSlug(''); setInviteMaxUses(''); setInvitePermanent(true); setIsCreatingInvite(false); void loadDialogData(); });
  }

  function handleDeleteInvite(invId: string) { socketService.deleteInvite(serverId, invId, () => void loadDialogData()); }

  function copyInviteLink(code: string) {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${code}`).then(() => { setCopiedCode(code); setTimeout(() => setCopiedCode(''), 1800); });
  }

  async function handleStartDomainVerify() {
    if (!domainInput.trim()) return;
    setIsDomainLoading(true);
    const r = await api.startDomainVerification(serverId, domainInput.trim());
    if (r.success && r.data) setDomainTxtRecord((r.data as any).txtRecord || '');
    setIsDomainLoading(false);
  }

  async function handleCheckDomainVerify() {
    setIsDomainLoading(true);
    await api.checkDomainVerification(serverId);
    await loadDialogData();
    setIsDomainLoading(false);
  }

  async function handleClaimAdmin() {
    if (!adminCode.trim() || !user?.id || claimInFlightRef.current) return;
    claimInFlightRef.current = true;
    setClaimLoading(true);
    setClaimResult(null);
    try {
      const r = await api.claimAdmin(serverId, adminCode.trim().toUpperCase(), user.id);
      if (r.success) { setClaimResult({ ok: true, msg: ss.permissions.adminGranted }); setAdminCode(''); await loadDialogData(); }
      else { setClaimResult({ ok: false, msg: r.error || ss.permissions.invalidCode }); }
    } finally { claimInFlightRef.current = false; setClaimLoading(false); }
  }

  function copyToken() { navigator.clipboard.writeText(nodeToken).then(() => { setCopiedToken(true); setTimeout(() => setCopiedToken(false), 1800); }); }

  /* ─── Section renders ─── */
  function renderGeneral() {
    return (
      <div className="space-y-5">
        <PageHeader title={ss.general.heading} description={ss.general.subtitle} action={
          <Button onClick={handleSaveGeneral} disabled={!name.trim() || isSaving} size="sm" className="gap-2 rounded-xl">
            {isSaving ? <Loader2Icon size={14} className="animate-spin" /> : <SaveIcon size={14} />}
            {ss.general.saveChanges}
          </Button>
        } />

        <SettingsCard className="overflow-hidden p-0">
          <button type="button" onClick={() => document.getElementById('ssd-banner')?.click()}
            className="group relative block h-36 w-full overflow-hidden bg-muted/40">
            {(bannerPreview || server?.bannerUrl) ? (
              <img src={bannerPreview || resolveMediaUrl(server?.bannerUrl)} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="text-sm font-medium text-white">Changer la bannière</span>
            </div>
          </button>
          <input id="ssd-banner" type="file" accept="image/*" className="hidden" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) { setBannerFile(f); setBannerPreview(URL.createObjectURL(f)); } }} />
        </SettingsCard>

        <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
          <SettingsCard className="flex flex-col items-center gap-3 p-5">
            <button type="button" onClick={() => document.getElementById('ssd-icon')?.click()} className="group relative">
              <Avatar className="size-20 rounded-3xl border border-border/50 shadow-lg">
                <AvatarImage src={iconPreview || resolveMediaUrl(server?.iconUrl) || undefined} className="rounded-3xl object-cover" />
                <AvatarFallback className="rounded-3xl bg-primary/12 text-xl font-bold text-primary">{(name || server?.name || 'SV').slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/45 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">Modifier</div>
            </button>
            <p className="text-center text-[11px] text-muted-foreground">Icône du serveur</p>
            <input id="ssd-icon" type="file" accept="image/*" className="hidden" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) { setIconFile(f); setIconPreview(URL.createObjectURL(f)); } }} />
          </SettingsCard>

          <SettingsCard>
            <div className="space-y-4 p-5">
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground/60">Nom du serveur</p>
                <Input value={name} onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder={ss.general.serverNamePlaceholder} className="rounded-xl" />
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground/60">Description</p>
                <textarea value={description} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} placeholder={ss.general.descriptionPlaceholder} rows={4}
                  className="w-full resize-none rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/45 focus:border-primary/40" />
              </div>
            </div>
          </SettingsCard>
        </div>

        <SettingsCard>
          <SettingsRow label={ss.general.publicServer} description={ss.general.publicServerDesc} border={false}>
            <Switch checked={isPublic} onCheckedChange={(v) => { setIsPublic(v); setRequireInvite(!v); }} />
          </SettingsRow>
        </SettingsCard>
      </div>
    );
  }

  function renderInvites() {
    return (
      <div className="space-y-5">
        <PageHeader title={ss.invitations.heading} description={ss.invitations.subtitle} />
        <SettingsCard>
          <div className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground/60">{ss.invitations.customSlug}</p>
                <Input value={inviteSlug} onChange={(e: ChangeEvent<HTMLInputElement>) => setInviteSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder={ss.invitations.slugPlaceholder} className="rounded-xl" />
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground/60">{ss.invitations.maxUses}</p>
                <Input type="number" value={inviteMaxUses} onChange={(e: ChangeEvent<HTMLInputElement>) => setInviteMaxUses(e.target.value)} placeholder="∞" className="rounded-xl" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-3 text-[13px] text-muted-foreground">
                <Switch checked={invitePermanent} onCheckedChange={setInvitePermanent} />
                {ss.invitations.permanent}
              </label>
              <Button onClick={handleCreateInvite} disabled={isCreatingInvite} size="sm" className="gap-2 rounded-xl">
                {isCreatingInvite ? <Loader2Icon size={13} className="animate-spin" /> : <PlusIcon size={13} />}
                {ss.invitations.create}
              </Button>
            </div>
          </div>
        </SettingsCard>
        <div className="space-y-2">
          {invites.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/40 py-10 text-center text-sm text-muted-foreground">{ss.invitations.noInvitations}</div>
          ) : invites.map((inv) => {
            const code = inv.customSlug || inv.code;
            const usageLabel = inv.uses === 1 ? tx(ss.invitations.usageSingular, { n: String(inv.uses) }) : tx(ss.invitations.usagePlural, { n: String(inv.uses) });
            return (
              <SettingsCard key={inv.id}>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10"><Link2Icon size={15} className="text-primary" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[13px] font-semibold text-foreground">{code}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{usageLabel}{inv.maxUses ? ` / ${inv.maxUses}` : ''}{inv.isPermanent ? `  ·  ${ss.invitations.permanentFlag}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="size-8 rounded-xl" onClick={() => copyInviteLink(code)}>
                      {copiedCode === code ? <CheckIcon size={14} className="text-emerald-400" /> : <CopyIcon size={14} />}
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 rounded-xl text-muted-foreground hover:text-destructive" onClick={() => handleDeleteInvite(inv.id)}>
                      <Trash2Icon size={14} />
                    </Button>
                  </div>
                </div>
              </SettingsCard>
            );
          })}
        </div>
      </div>
    );
  }

  function renderDroits() {
    return (
      <div className="space-y-5">
        <PageHeader title={ss.permissions.heading} description={ss.permissions.subtitle} />
        <SettingsCard>
          <SettingsRow label={ss.permissions.requireInvite} description={ss.permissions.requireInviteDesc} border={false}>
            <Switch checked={requireInvite} disabled={!canManageServer} onCheckedChange={canManageServer ? (v) => { setRequireInvite(v); setIsPublic(!v); } : undefined} />
          </SettingsRow>
        </SettingsCard>
        {canManageServer ? (
          <Button onClick={handleSaveGeneral} disabled={isSaving} size="sm" className="gap-2 rounded-xl">
            {isSaving ? <Loader2Icon size={13} className="animate-spin" /> : <SaveIcon size={13} />}
            {ss.permissions.save}
          </Button>
        ) : (
          <AlertNote tone="amber" icon={AlertTriangleIcon}>{ss.permissions.adminOnly}</AlertNote>
        )}
        {!server?.ownerId && (
          <SettingsCard>
            <div className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15"><ShieldCheckIcon size={15} className="text-amber-400" /></div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground">{ss.permissions.claimAdmin}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{ss.permissions.claimAdminDesc}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input value={adminCode} onChange={(e: ChangeEvent<HTMLInputElement>) => { setAdminCode(e.target.value.toUpperCase()); setClaimResult(null); }}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') void handleClaimAdmin(); }}
                  placeholder={ss.permissions.codePlaceholder} className="flex-1 rounded-xl font-mono tracking-widest" maxLength={14} />
                <Button onClick={handleClaimAdmin} disabled={!adminCode.trim() || claimLoading} size="sm" className="gap-2 rounded-xl">
                  {claimLoading ? <Loader2Icon size={13} className="animate-spin" /> : <KeyRoundIcon size={13} />}
                  {ss.permissions.validate}
                </Button>
              </div>
              {claimResult && (
                <div className={cn('flex items-center gap-2 rounded-2xl px-3 py-2.5 text-[13px]', claimResult.ok ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border border-rose-500/20 bg-rose-500/10 text-rose-400')}>
                  {claimResult.ok ? <CheckIcon size={13} /> : <XIcon size={13} />}
                  {claimResult.msg}
                </div>
              )}
            </div>
          </SettingsCard>
        )}
      </div>
    );
  }

  function renderRoles() {
    return (
      <div className="space-y-5">
        <PageHeader title={ss.roles.heading} description={ss.roles.subtitle} />
        <RoleManager serverId={serverId} />
      </div>
    );
  }

  function renderChannels() {
    return (
      <div className="space-y-5">
        <PageHeader title={ss.channels.heading} description={ss.channels.subtitle} />
        <ChannelManager serverId={serverId} onChannelsChanged={onServerUpdated} />
      </div>
    );
  }

  function renderDomain() {
    return (
      <div className="space-y-5">
        <PageHeader title={ss.domain.heading} description={ss.domain.subtitle} />
        <SettingsCard>
          <div className="space-y-4 p-5">
            <div className="flex gap-2">
              <Input value={domainInput} onChange={(e: ChangeEvent<HTMLInputElement>) => setDomainInput(e.target.value)} placeholder={ss.domain.placeholder} disabled={server?.domainVerified} className="flex-1 rounded-xl" />
              {!server?.domainVerified && (
                <Button variant="outline" onClick={handleStartDomainVerify} disabled={!domainInput.trim() || isDomainLoading} size="sm" className="rounded-xl">
                  {isDomainLoading ? <Loader2Icon size={13} className="animate-spin" /> : ss.domain.verify}
                </Button>
              )}
            </div>
            {server?.domainVerified && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-[13px] text-emerald-400">
                <CheckIcon size={14} />{ss.domain.verified}
              </div>
            )}
          </div>
        </SettingsCard>
        {domainTxtRecord && !server?.domainVerified && (
          <SettingsCard>
            <div className="space-y-3 p-5">
              <p className="text-[13px] font-semibold text-foreground">{ss.domain.dnsInstruction}</p>
              <div className="flex items-start gap-2">
                <code className="flex-1 break-all rounded-xl bg-muted/40 px-3 py-3 font-mono text-[11px] leading-relaxed text-muted-foreground">{domainTxtRecord}</code>
                <Button variant="ghost" size="icon" className="size-8 shrink-0 rounded-xl" onClick={() => navigator.clipboard.writeText(domainTxtRecord)}><CopyIcon size={14} /></Button>
              </div>
              <Button onClick={handleCheckDomainVerify} disabled={isDomainLoading} size="sm" className="gap-2 rounded-xl">
                {isDomainLoading ? <Loader2Icon size={13} className="animate-spin" /> : <GlobeIcon size={13} />}
                {ss.domain.checkDns}
              </Button>
            </div>
          </SettingsCard>
        )}
      </div>
    );
  }

  function renderNode() {
    const gatewayOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://gateway.alfychat.app';
    return (
      <div className="space-y-5">
        <PageHeader title={ss.serverNode.heading} description={ss.serverNode.subtitle} />
        <SettingsCard>
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/15"><ServerIcon size={15} className="text-rose-400" /></div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">{ss.serverNode.authToken}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{ss.serverNode.authTokenDesc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input value={showToken ? nodeToken : '•'.repeat(Math.max(nodeToken.length, 28))} readOnly className="flex-1 rounded-xl font-mono text-xs" />
              <Button variant="ghost" size="icon" className="size-8 rounded-xl" onClick={() => setShowToken((v) => !v)}>
                {showToken ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
              </Button>
              <Button variant="ghost" size="icon" className="size-8 rounded-xl" onClick={copyToken}>
                {copiedToken ? <CheckIcon size={14} className="text-emerald-400" /> : <CopyIcon size={14} />}
              </Button>
            </div>
          </div>
        </SettingsCard>
        <SettingsCard>
          <div className="space-y-3 p-5">
            <p className="text-[13px] font-semibold text-foreground">{ss.serverNode.startNode}</p>
            <p className="text-[12px] text-muted-foreground">{ss.serverNode.startNodeDesc}</p>
            <code className="block whitespace-pre-wrap break-all rounded-xl bg-muted/40 px-4 py-3.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {`npx @alfychat/server-node start \\\n  --server-id=${serverId} \\\n  --token=<your-token> \\\n  --gateway=${gatewayOrigin} \\\n  --port=4100`}
            </code>
          </div>
        </SettingsCard>
        <AlertNote tone="amber" icon={AlertTriangleIcon}>{ss.serverNode.authTokenDesc}</AlertNote>
      </div>
    );
  }

  function renderContent() {
    switch (section) {
      case 'general':  return renderGeneral();
      case 'invites':  return renderInvites();
      case 'droits':   return renderDroits();
      case 'roles':    return renderRoles();
      case 'channels': return renderChannels();
      case 'domain':   return renderDomain();
      case 'node':     return renderNode();
      default:         return null;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'h-[90vh] w-full sm:max-w-5xl overflow-hidden p-0 shadow-2xl shadow-black/40',
        'rounded-2xl border border-border/50',
        'max-sm:h-dvh max-sm:w-screen max-sm:max-w-none max-sm:rounded-none max-sm:border-0',
        ui.glassModal,
      )}>
        <DialogHeader className="sr-only">
          <DialogTitle>Paramètres du serveur</DialogTitle>
        </DialogHeader>

        <div className="grid h-full min-h-0 md:grid-cols-[260px_1fr]">
          {/* ─── Sidebar ─── */}
          <aside className={cn('flex min-h-0 flex-col border-r border-border/40 p-4', ui.glassModalSidebar)}>
            <div className="overflow-hidden rounded-2xl border border-border/30 bg-card/30">
              <div className="h-16 overflow-hidden">
                {(bannerPreview || server?.bannerUrl) ? (
                  <img src={bannerPreview || resolveMediaUrl(server?.bannerUrl)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/10" />
                )}
              </div>
              <div className="flex items-center gap-3 px-4 pb-4">
                <Avatar className="-mt-6 size-12 shrink-0 rounded-2xl border-2 border-card shadow-md">
                  <AvatarImage src={iconPreview || resolveMediaUrl(server?.iconUrl) || undefined} />
                  <AvatarFallback className="rounded-2xl bg-primary/15 text-sm font-bold text-primary">{(server?.name || 'SV').slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">{server?.name || 'Serveur'}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{canManageServer ? 'Administration' : 'Accès limité'}</p>
                </div>
              </div>
            </div>

            <div className="mb-1.5 mt-4"><SectionLabel>Navigation</SectionLabel></div>

            <ScrollArea className="min-h-0 flex-1">
              <nav className="flex flex-col gap-0.5">
                {visibleSections.map(({ id, label }) => {
                  const { icon: Icon, color } = SECTION_META[id];
                  const active = section === id;
                  return (
                    <button key={id} type="button" onClick={() => setSection(id)} className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-150', active ? 'bg-primary/12 text-primary shadow-sm ring-1 ring-primary/20' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground')}>
                      <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-xl', active ? 'bg-primary/20' : 'bg-muted/50')}>
                        <Icon size={14} className={active ? 'text-primary' : color} />
                      </span>
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </nav>
            </ScrollArea>

            <div className="mt-3 border-t border-border/30 pt-3">
              <button type="button" onClick={() => onOpenChange(false)}
                className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
                <XIcon size={14} />{ss.close}
              </button>
            </div>
          </aside>

          {/* ─── Content ─── */}
          <section className={cn('min-h-0 overflow-y-auto px-6 py-6', ui.isGlass ? 'bg-transparent' : 'bg-background')}>
            {isLoading ? (
              <div className="flex h-full items-center justify-center"><Spinner size="md" /></div>
            ) : renderContent()}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}