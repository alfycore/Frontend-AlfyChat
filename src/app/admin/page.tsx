'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// shadcn
import { Button }        from '@/components/ui/button';
import { Badge }         from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input }         from '@/components/ui/input';
import { Switch }        from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Separator }     from '@/components/ui/separator';

// icons
import {
  ShieldIcon, UsersIcon, AwardIcon, BarChart3Icon, PlusIcon,
  SearchIcon, Edit2Icon, Trash2Icon, UserPlusIcon, XIcon,
  CompassIcon, ServerIcon, CheckCircle2Icon, XCircleIcon, ClockIcon,
  HandshakeIcon, SettingsIcon, Link2Icon, MailIcon, CopyIcon,
  ShieldCheckIcon, ShieldAlertIcon, BanIcon, FileTextIcon,
  ChevronDownIcon, ChevronRightIcon, KeyIcon, RefreshCwIcon,
  EyeIcon, EyeOffIcon,
} from '@/components/icons';

import { useAuth }      from '@/hooks/use-auth';
import { api }          from '@/lib/api';
import { sanitizeSvg }  from '@/lib/sanitize';
import { ServicesPanel } from './services-panel';

// ─── Types ───────────────────────────────────────────────────────────────────

const UICONS_LIST = [
  { value: 'star', label: 'Étoile' }, { value: 'trophy', label: 'Trophée' },
  { value: 'crown', label: 'Couronne' }, { value: 'shield', label: 'Bouclier' },
  { value: 'diamond', label: 'Gemme' }, { value: 'fire-flame-simple', label: 'Feu' },
  { value: 'heart', label: 'Cœur' }, { value: 'bolt', label: 'Éclair' },
  { value: 'rocket', label: 'Fusée' }, { value: 'bug', label: 'Bug' },
  { value: 'code-simple', label: 'Code' }, { value: 'palette', label: 'Palette' },
  { value: 'music-note', label: 'Musique' }, { value: 'camera', label: 'Caméra' },
  { value: 'gamepad', label: 'Manette' }, { value: 'paint-brush', label: 'Pinceau' },
  { value: 'microchip', label: 'CPU' }, { value: 'gift', label: 'Cadeau' },
  { value: 'badge', label: 'Médaille' }, { value: 'check-circle', label: 'Vérifié' },
  { value: 'user-check', label: 'Badge ID' }, { value: 'comment-heart', label: 'Chat Cœur' },
  { value: 'thumbs-up', label: 'Pouce' }, { value: 'sunglasses', label: 'Cool' },
  { value: 'flag', label: 'Drapeau' }, { value: 'wrench-alt', label: 'Outils' },
  { value: 'terminal', label: 'Terminal' }, { value: 'world', label: 'Globe' },
  { value: 'graduation-cap', label: 'Diplômé' }, { value: 'eye', label: 'Œil' },
];

type Tab = 'overview' | 'users' | 'badges' | 'server-badges' | 'discovery' |
           'monitoring' | 'status' | 'security' | 'changelogs' | 'services' | 'settings';
type ServiceType = 'users' | 'messages' | 'friends' | 'calls' | 'servers' | 'bots' | 'media';
type ServiceInstance = {
  id: string; serviceType: ServiceType; endpoint: string; domain: string;
  location: string; healthy: boolean; enabled: boolean; score: number;
  registeredAt: string; lastHeartbeat: string;
  metrics?: { ramUsage: number; ramMax: number; cpuUsage: number; cpuMax: number; bandwidthUsage: number; requestCount20min: number };
};

const NAV: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',      label: "Vue d'ensemble",   icon: BarChart3Icon },
  { id: 'users',         label: 'Utilisateurs',      icon: UsersIcon },
  { id: 'badges',        label: 'Badges',            icon: AwardIcon },
  { id: 'server-badges', label: 'Badges serveurs',   icon: ServerIcon },
  { id: 'discovery',     label: 'Découverte',        icon: CompassIcon },
  { id: 'monitoring',    label: 'Monitoring',        icon: BarChart3Icon },
  { id: 'status',        label: 'Status public',     icon: CheckCircle2Icon },
  { id: 'security',      label: 'Sécurité',          icon: ShieldAlertIcon },
  { id: 'changelogs',    label: 'Changelogs',        icon: FileTextIcon },
  { id: 'services',      label: 'Services',          icon: ServerIcon },
  { id: 'settings',      label: 'Paramètres',        icon: SettingsIcon },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function MiniBar({ value, max, unit }: { value: number; max: number; unit: string }) {
  const p = max > 0 ? Math.round((value / max) * 100) : 0;
  const toMB = (b: number) => b / 1_048_576;
  const color = p >= 85 ? '#ef4444' : p >= 60 ? '#f59e0b' : '#22c55e';
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${p}%`, background: color }} />
      </div>
      <span className="text-xs tabular-nums" style={{ color }}>{p}%</span>
      {unit === 'MB' && (
        <span className="text-xs tabular-nums text-muted-foreground">
          {toMB(value) >= 1024
            ? `${(toMB(value)/1024).toFixed(1)}/${(toMB(max)/1024).toFixed(1)} GB`
            : `${Math.round(toMB(value))}/${Math.round(toMB(max))} MB`}
        </span>
      )}
    </div>
  );
}

function StatusDot({ healthy, lastHeartbeat }: { healthy: boolean; lastHeartbeat: string }) {
  const elapsed = Date.now() - new Date(lastHeartbeat).getTime();
  const color = elapsed > 600_000 ? '#ef4444' : elapsed > 90_000 ? '#f59e0b' : '#22c55e';
  const label = elapsed > 600_000 ? 'Hors ligne' : elapsed > 90_000 ? 'Inactif' : 'En ligne';
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab]       = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState<any>(null);
  // Badges
  const [badges, setBadges]             = useState<any[]>([]);
  const [showBadgeDialog, setShowBadgeDialog] = useState(false);
  const [editingBadge, setEditingBadge] = useState<any>(null);
  const [iconSearch, setIconSearch]     = useState('');
  const [flaticonSearch, setFlaticonSearch] = useState('');
  const [badgeForm, setBadgeForm] = useState({
    name: '', description: '', iconType: 'bootstrap' as 'bootstrap' | 'svg' | 'flaticon',
    iconValue: '', color: '#5865F2', displayOrder: 999,
  });
  // Users
  const [users, setUsers]           = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userBadges, setUserBadges]   = useState<any[]>([]);
  // Discovery
  const [applications, setApplications]       = useState<any[]>([]);
  const [appStatusFilter, setAppStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  // Server badges
  const [discoverServers, setDiscoverServers]   = useState<any[]>([]);
  const [serverBadgesPage, setServerBadgesPage] = useState(0);
  // Settings
  const [siteSettings, setSiteSettings]   = useState<Record<string, string>>({});
  const [inviteLinks, setInviteLinks]     = useState<any[]>([]);
  const [inviteEmail, setInviteEmail]     = useState('');
  const [inviteExpiry, setInviteExpiry]   = useState('48');
  const [inviteCreating, setInviteCreating] = useState(false);
  const [copiedLink, setCopiedLink]       = useState<string | null>(null);
  // Monitoring
  const [monitoringData, setMonitoringData] = useState<any>(null);
  const [chartPeriod, setChartPeriod]       = useState<'30min' | '10min' | 'hour' | 'day' | 'month'>('hour');
  const [chartData, setChartData]           = useState<any[]>([]);
  const [chartLoading, setChartLoading]     = useState(false);
  // Security
  const [bannedIPs, setBannedIPs]           = useState<any[]>([]);
  const [rateLimitStats, setRateLimitStats] = useState<any>(null);
  const [rateLimitConfig, setRateLimitConfig] = useState<any>(null);
  const [banIP, setBanIP]     = useState('');
  const [banReason, setBanReason] = useState('');
  // Status
  const [incidents, setIncidents]             = useState<any[]>([]);
  const [includeResolved, setIncludeResolved] = useState(false);
  const [editingIncident, setEditingIncident] = useState<any>(undefined);
  const [incidentSubmitting, setIncidentSubmitting] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    title: '', message: '', severity: 'warning' as 'info' | 'warning' | 'critical',
    status: 'investigating' as 'investigating' | 'identified' | 'monitoring' | 'resolved',
    services: '',
  });
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  // Changelogs
  const [changelogs, setChangelogs]       = useState<any[]>([]);
  const [changelogSubmitting, setChangelogSubmitting] = useState(false);
  const [changelogForm, setChangelogForm] = useState({
    version: '', title: '', content: '',
    type: 'feature' as 'feature' | 'fix' | 'improvement' | 'security' | 'breaking',
    bannerUrl: '',
  });
  // Services
  const [serviceInstances, setServiceInstances] = useState<ServiceInstance[]>([]);
  const [serviceForm, setServiceForm] = useState({
    id: '', serviceType: 'messages' as ServiceType, endpoint: '', domain: '', location: 'EU',
  });
  const [serviceFormError, setServiceFormError] = useState('');
  const [serviceSubmitting, setServiceSubmitting] = useState(false);
  // Service key rotation
  const [rotatingId, setRotatingId]     = useState<string | null>(null);
  const [rotatedKey, setRotatedKey]     = useState<{ id: string; key: string } | null>(null);
  const [showKey, setShowKey]           = useState(false);
  const [keyCopied, setKeyCopied]       = useState(false);

  // ── load ──────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'overview') {
        const r = await api.getAdminStats();
        if (r.success) setStats(r.data);
      } else if (tab === 'badges') {
        const r = await api.getAdminBadges();
        if (r.success && r.data) setBadges(r.data as any[]);
      } else if (tab === 'users') {
        const [ur, br] = await Promise.all([api.getAdminUsers(100, 0), api.getAdminBadges()]);
        if (ur.success && ur.data) setUsers(ur.data as any[]);
        if (br.success && br.data) setBadges(br.data as any[]);
      } else if (tab === 'discovery') {
        const r = await api.getDiscoverApplications(appStatusFilter);
        if (r.success && r.data) {
          const d = r.data as any;
          setApplications(Array.isArray(d) ? d : (d.applications ?? []));
        }
      } else if (tab === 'server-badges') {
        const r = await api.getAllServersAdmin();
        if (r.success && r.data) {
          const d = r.data as any;
          setDiscoverServers(Array.isArray(d) ? d : (d.servers ?? []));
        }
      } else if (tab === 'settings') {
        const [sr, lr] = await Promise.all([api.getAdminSettings(), api.getInviteLinks()]);
        if (sr.success && sr.data) setSiteSettings(sr.data as any);
        if (lr.success && lr.data) setInviteLinks(lr.data as any[]);
      } else if (tab === 'security') {
        const r = await api.getGatewayStats();
        if (r.success && r.data) {
          const d = r.data as any;
          setBannedIPs(d.bannedIPs || []);
          setRateLimitStats(d.rateLimitStats || null);
          setRateLimitConfig(d.config || null);
        }
      } else if (tab === 'changelogs') {
        const r = await api.getChangelogs();
        if (r.success && r.data) setChangelogs(r.data as any[]);
      } else if (tab === 'monitoring') {
        const [mr, sr] = await Promise.all([api.getMonitoringStats(), api.getAdminServices()]);
        if (mr.success && mr.data) setMonitoringData(mr.data);
        if (sr.success && sr.data) setServiceInstances((sr.data as any).instances ?? []);
        loadChart(chartPeriod);
      } else if (tab === 'status') {
        const [ir, sr] = await Promise.all([
          api.getAdminIncidents(includeResolved),
          api.getAdminServices(),
        ]);
        if (ir.success && ir.data) setIncidents((ir.data as any).incidents ?? []);
        if (sr.success && sr.data) setServiceInstances((sr.data as any).instances ?? []);
      } else if (tab === 'services') {
        const r = await api.getAdminServices();
        if (r.success && r.data) setServiceInstances((r.data as any).instances ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [tab, appStatusFilter, includeResolved, chartPeriod]);

  useEffect(() => {
    if (user && user.role !== 'admin') { router.push('/channels/me'); return; }
    if (user?.role === 'admin') loadData();
  }, [user, tab, appStatusFilter]);

  const loadChart = async (p: typeof chartPeriod) => {
    setChartLoading(true);
    try {
      const r = await api.getMonitoringUsersChart(p);
      if (r.success && r.data?.data) setChartData(r.data.data);
    } catch { /* ignore */ } finally { setChartLoading(false); }
  };

  // ── Badge CRUD ────────────────────────────────────────────────────────────

  const resetBadgeForm = () => {
    setBadgeForm({ name: '', description: '', iconType: 'bootstrap', iconValue: '', color: '#5865F2', displayOrder: 999 });
    setEditingBadge(null); setIconSearch(''); setFlaticonSearch('');
  };

  const renderBadgeIcon = (iconType: string, iconValue: string, color: string, size = 'text-xl') => {
    if (iconType === 'bootstrap' && iconValue)
      return <i className={`fi fi-br-${iconValue} ${size}`} style={{ color }} />;
    if (iconType === 'flaticon' && iconValue)
      return <i className={`${iconValue} ${size}`} style={{ color }} />;
    if (iconType === 'svg' && iconValue)
      return <span dangerouslySetInnerHTML={{ __html: sanitizeSvg(iconValue) }} className="inline-block h-5 w-5" />;
    return <i className="fi fi-br-question text-xl text-muted-foreground" />;
  };

  const filteredIcons = UICONS_LIST.filter(i =>
    i.label.toLowerCase().includes(iconSearch.toLowerCase()) ||
    i.value.toLowerCase().includes(iconSearch.toLowerCase())
  );

  const handleBadgeSave = async () => {
    if (editingBadge) {
      await api.updateBadge(editingBadge.id, badgeForm);
    } else {
      await api.createBadge(badgeForm);
    }
    setShowBadgeDialog(false); resetBadgeForm(); loadData();
  };

  // ── Service key rotation ──────────────────────────────────────────────────

  const handleRotateKey = async (id: string) => {
    setRotatingId(id);
    try {
      const r = await api.rotateAdminServiceKey(id);
      if (r.success && r.data?.serviceKey) {
        setRotatedKey({ id, key: r.data.serviceKey });
        setShowKey(false); setKeyCopied(false);
      }
    } finally { setRotatingId(null); }
  };

  const handleToggleService = async (id: string, enabled: boolean) => {
    await api.patchAdminService(id, { enabled });
    setServiceInstances(prev => prev.map(s => s.id === id ? { ...s, enabled } : s));
  };

  // ── Guard ─────────────────────────────────────────────────────────────────

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-sm text-center">
          <CardContent className="pt-6 pb-6 space-y-4">
            <ShieldIcon className="mx-auto size-8 text-destructive" />
            <p className="font-semibold">Accès refusé</p>
            <p className="text-sm text-muted-foreground">Cette page est réservée aux administrateurs.</p>
            <Button variant="outline" onClick={() => router.push('/channels/me')}>Retour à l&apos;app</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-background text-foreground">

      {/* ── Sidebar ── */}
      <aside className="sticky top-0 flex h-screen w-52 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <ShieldIcon className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Admin</p>
            <p className="text-[11px] text-muted-foreground">AlfyChat</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-2 overflow-y-auto">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                tab === id
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 border-t border-border px-3 py-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-xs font-bold text-primary">
            {user?.displayName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{user?.displayName}</p>
            <p className="text-[10px] text-muted-foreground">Administrateur</p>
          </div>
          <button onClick={() => router.push('/channels/me')} className="text-muted-foreground hover:text-foreground">
            <XIcon className="size-3.5" />
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
          <h1 className="text-base font-semibold">{NAV.find(n => n.id === tab)?.label}</h1>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCwIcon className="size-3.5" /> Actualiser
          </Button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="size-7 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="mx-auto max-w-7xl space-y-6">

              {/* ── Overview ── */}
              {tab === 'overview' && stats && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { label: 'Utilisateurs', value: stats.totalUsers, color: 'text-foreground' },
                      { label: 'En ligne',     value: stats.onlineUsers, color: 'text-green-500' },
                      { label: 'Administrateurs', value: stats.admins, color: 'text-primary' },
                      { label: 'Modérateurs', value: stats.moderators, color: 'text-orange-500' },
                    ].map(({ label, value, color }) => (
                      <Card key={label}>
                        <CardContent className="py-4">
                          <p className="text-sm text-muted-foreground">{label}</p>
                          <p className={`mt-1 text-3xl font-semibold ${color}`}>{value}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {/* ── Badges ── */}
              {tab === 'badges' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Gestion des badges</h2>
                    <Button size="sm" onClick={() => { resetBadgeForm(); setShowBadgeDialog(true); }}>
                      <PlusIcon className="size-4" /> Créer un badge
                    </Button>
                  </div>

                  {badges.length === 0 ? (
                    <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun badge.</CardContent></Card>
                  ) : (
                    <Card>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Badge</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Ordre</TableHead>
                            <TableHead>Actif</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {badges.map((b) => (
                            <TableRow key={b.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="flex size-10 items-center justify-center rounded-lg"
                                    style={{ backgroundColor: b.color + '22', border: `2px solid ${b.color}44` }}>
                                    {renderBadgeIcon(b.iconType, b.iconValue, b.color, 'text-lg')}
                                  </div>
                                  <div>
                                    <p className="font-medium">{b.name}</p>
                                    <p className="text-xs text-muted-foreground">{b.description}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{b.iconType === 'bootstrap' ? 'Bootstrap' : b.iconType === 'flaticon' ? 'Flaticon' : 'SVG'}</Badge>
                              </TableCell>
                              <TableCell>{b.displayOrder}</TableCell>
                              <TableCell>
                                <Switch
                                  checked={b.isActive}
                                  onCheckedChange={() => api.toggleBadgeStatus(b.id, !b.isActive).then(loadData)}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon-sm"
                                    onClick={() => { setEditingBadge(b); setBadgeForm({ name: b.name, description: b.description || '', iconType: b.iconType, iconValue: b.iconValue, color: b.color, displayOrder: b.displayOrder }); setShowBadgeDialog(true); }}>
                                    <Edit2Icon className="size-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon-sm"
                                    onClick={() => confirm('Supprimer ce badge ?') && api.deleteBadge(b.id).then(loadData)}>
                                    <Trash2Icon className="size-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Card>
                  )}
                </div>
              )}

              {/* ── Users ── */}
              {tab === 'users' && (
                <div className="space-y-4">
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Rechercher un utilisateur..."
                      value={searchQuery}
                      onChange={async (e) => {
                        setSearchQuery(e.target.value);
                        if (!e.target.value.trim()) { loadData(); return; }
                        const r = await api.searchAdminUsers(e.target.value);
                        if (r.success && r.data) setUsers(r.data as any[]);
                      }}
                    />
                  </div>
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Utilisateur</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Badges</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Rôle</TableHead>
                          <TableHead>Créé le</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell>
                              <p className="font-medium">{u.displayName}</p>
                              <p className="text-xs text-muted-foreground">@{u.username}</p>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{u.email}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {(u.badges || []).slice(0, 3).map((b: any, i: number) => (
                                  <div key={i} className="flex size-6 items-center justify-center rounded"
                                    style={{ backgroundColor: (b.color || '#5865F2') + '22' }} title={b.name}>
                                    {renderBadgeIcon(b.iconType || 'bootstrap', b.iconValue || b.icon, b.color || '#5865F2', 'text-xs')}
                                  </div>
                                ))}
                                {(u.badges || []).length > 3 && <span className="text-xs text-muted-foreground">+{u.badges.length - 3}</span>}
                                {(!u.badges || u.badges.length === 0) && <span className="text-xs text-muted-foreground">Aucun</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.isOnline ? 'default' : 'secondary'}
                                className={u.isOnline ? 'bg-green-500 text-white' : ''}>
                                {u.isOnline ? 'En ligne' : 'Hors ligne'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <select
                                className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                                value={u.role || 'user'}
                                onChange={(e) => api.updateUserRole(u.id, e.target.value as any).then(loadData)}
                              >
                                <option value="user">Utilisateur</option>
                                <option value="moderator">Modérateur</option>
                                <option value="admin">Admin</option>
                              </select>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon-sm"
                                onClick={() => { setSelectedUser(u); setUserBadges(u.badges || []); setShowAssignDialog(true); }}>
                                <AwardIcon className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              )}

              {/* ── Discovery ── */}
              {tab === 'discovery' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Candidatures Découverte</h2>
                    <div className="flex gap-2">
                      {(['pending', 'approved', 'rejected'] as const).map((s) => (
                        <Button key={s} size="sm" variant={appStatusFilter === s ? 'default' : 'outline'}
                          onClick={() => {
                            setAppStatusFilter(s);
                            api.getDiscoverApplications(s).then(r => {
                              if (r.success && r.data) {
                                const d = r.data as any;
                                setApplications(Array.isArray(d) ? d : (d.applications ?? []));
                              }
                            });
                          }}>
                          {s === 'pending' ? <ClockIcon className="size-3" /> : s === 'approved' ? <CheckCircle2Icon className="size-3" /> : <XCircleIcon className="size-3" />}
                          {s === 'pending' ? 'En attente' : s === 'approved' ? 'Approuvées' : 'Rejetées'}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {applications.length === 0 ? (
                    <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune candidature.</CardContent></Card>
                  ) : (
                    <div className="space-y-3">
                      {applications.map((app) => (
                        <Card key={app.id}>
                          <CardContent className="flex items-start gap-4 py-4">
                            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted font-bold">
                              {app.serverIcon ? <img src={app.serverIcon} alt="" className="size-full object-cover" /> : (app.serverName || '?')[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{app.serverName}</p>
                                <Badge variant="secondary">{app.memberCount ?? '?'} membres</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5">{app.serverDescription}</p>
                              <p className="mt-1 text-sm"><span className="font-medium">Raison :</span> {app.reason}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {app.applicantName || app.applicantId} · {new Date(app.createdAt).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            {appStatusFilter === 'pending' && (
                              <div className="flex flex-col gap-2 shrink-0">
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => api.reviewApplication(app.id, 'approved').then(loadData)}>
                                  <CheckCircle2Icon className="size-3" /> Approuver
                                </Button>
                                <Button size="sm" variant="destructive"
                                  onClick={() => api.reviewApplication(app.id, 'rejected').then(loadData)}>
                                  <XCircleIcon className="size-3" /> Rejeter
                                </Button>
                              </div>
                            )}
                            {appStatusFilter !== 'pending' && (
                              <Badge className={appStatusFilter === 'approved' ? 'bg-green-600 text-white' : 'bg-destructive text-white'}>
                                {appStatusFilter === 'approved' ? 'Approuvé' : 'Rejeté'}
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Server Badges ── */}
              {tab === 'server-badges' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Badges des serveurs</h2>
                  {discoverServers.length === 0 ? (
                    <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun serveur.</CardContent></Card>
                  ) : (
                    <>
                      <Card>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Serveur</TableHead>
                              <TableHead>Membres</TableHead>
                              <TableHead className="text-center">Découverte</TableHead>
                              <TableHead className="text-center">Certifié</TableHead>
                              <TableHead className="text-center">Partenaire</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {discoverServers.slice(serverBadgesPage * 10, (serverBadgesPage + 1) * 10).map((s) => {
                              const isFeatured = s.discovery_status === 'approved';
                              return (
                                <TableRow key={s.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted font-bold">
                                        {(s.icon_url || s.iconUrl) ? <img src={s.icon_url || s.iconUrl} alt="" className="size-full object-cover" /> : (s.name || '?')[0]}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <p className="font-medium">{s.name}</p>
                                          {(s.is_certified || s.isCertified) && <CheckCircle2Icon className="size-3.5 text-blue-500" />}
                                          {(s.is_partnered || s.isPartnered) && <HandshakeIcon className="size-3.5 text-purple-500" />}
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-1">{s.description || 'Aucune description'}</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell><Badge variant="secondary">{s.member_count ?? s.memberCount ?? '?'}</Badge></TableCell>
                                  <TableCell className="text-center">
                                    <Switch checked={isFeatured} onCheckedChange={(v) => (v ? api.featureServer(s.id) : api.unfeatureServer(s.id)).then(() => setDiscoverServers(prev => prev.map(x => x.id === s.id ? { ...x, discovery_status: v ? 'approved' : null } : x)))} />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Switch disabled={!isFeatured} checked={!!(s.is_certified || s.isCertified)} onCheckedChange={(v) => api.updateServerBadges(s.id, { isCertified: v }).then(() => setDiscoverServers(prev => prev.map(x => x.id === s.id ? { ...x, is_certified: v } : x)))} />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Switch disabled={!isFeatured} checked={!!(s.is_partnered || s.isPartnered)} onCheckedChange={(v) => api.updateServerBadges(s.id, { isPartnered: v }).then(() => setDiscoverServers(prev => prev.map(x => x.id === s.id ? { ...x, is_partnered: v } : x)))} />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </Card>
                      {discoverServers.length > 10 && (
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            {serverBadgesPage * 10 + 1}–{Math.min((serverBadgesPage + 1) * 10, discoverServers.length)} sur {discoverServers.length}
                          </p>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" disabled={serverBadgesPage === 0} onClick={() => setServerBadgesPage(p => p - 1)}>← Précédent</Button>
                            <Button variant="outline" size="sm" disabled={(serverBadgesPage + 1) * 10 >= discoverServers.length} onClick={() => setServerBadgesPage(p => p + 1)}>Suivant →</Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Security ── */}
              {tab === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">Sécurité & Rate Limiting</h2>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <Card><CardContent className="py-4">
                      <p className="text-sm text-muted-foreground">IPs bannies</p>
                      <p className="mt-1 text-3xl font-semibold text-destructive">{bannedIPs.length}</p>
                    </CardContent></Card>
                    <Card><CardContent className="py-4">
                      <p className="text-sm text-muted-foreground">Requêtes bloquées</p>
                      <p className="mt-1 text-3xl font-semibold text-orange-500">{rateLimitStats?.totalBlocked ?? 0}</p>
                    </CardContent></Card>
                    <Card><CardContent className="py-4">
                      <p className="text-sm text-muted-foreground">Config rate limit</p>
                      <p className="mt-1 text-lg font-semibold">{rateLimitConfig ? `${rateLimitConfig.max} req/${rateLimitConfig.window}s` : '—'}</p>
                      <p className="text-xs text-muted-foreground">{rateLimitStats?.activeWindows ?? 0} fenêtres actives</p>
                    </CardContent></Card>
                  </div>

                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BanIcon className="size-4 text-destructive" /> Bannir une IP</CardTitle></CardHeader>
                    <CardContent className="flex gap-2">
                      <Input placeholder="192.168.1.1" value={banIP} onChange={e => setBanIP(e.target.value)} />
                      <Input placeholder="Raison (optionnel)" value={banReason} onChange={e => setBanReason(e.target.value)} />
                      <Button variant="destructive" disabled={!banIP.trim()}
                        onClick={() => api.banIP(banIP.trim(), banReason.trim() || undefined).then(() => { setBanIP(''); setBanReason(''); loadData(); })}>
                        <BanIcon className="size-4" /> Bannir
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldAlertIcon className="size-4 text-orange-500" /> IPs bannies ({bannedIPs.length})</CardTitle></CardHeader>
                    <CardContent>
                      {bannedIPs.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">Aucune IP bannie.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>IP</TableHead><TableHead>Raison</TableHead>
                              <TableHead>Banni par</TableHead><TableHead>Date</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {bannedIPs.map((b) => (
                              <TableRow key={b.ip}>
                                <TableCell className="font-mono text-xs">{b.ip}</TableCell>
                                <TableCell className="text-muted-foreground">{b.reason || '—'}</TableCell>
                                <TableCell className="text-muted-foreground">{b.bannedBy || 'Système'}</TableCell>
                                <TableCell className="text-muted-foreground">{b.bannedAt ? new Date(b.bannedAt).toLocaleString('fr-FR') : '—'}</TableCell>
                                <TableCell className="text-right">
                                  <Button size="sm" variant="outline"
                                    onClick={() => api.unbanIP(b.ip).then(() => setBannedIPs(p => p.filter(x => x.ip !== b.ip)))}>
                                    <ShieldCheckIcon className="size-3.5" /> Débannir
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ── Changelogs ── */}
              {tab === 'changelogs' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">Changelogs</h2>

                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PlusIcon className="size-4 text-primary" /> Publier un changelog</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Version</label>
                          <Input placeholder="v1.2.0" value={changelogForm.version} onChange={e => setChangelogForm(p => ({ ...p, version: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Type</label>
                          <select className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                            value={changelogForm.type} onChange={e => setChangelogForm(p => ({ ...p, type: e.target.value as any }))}>
                            <option value="feature">✨ Nouveauté</option>
                            <option value="improvement">⚡ Amélioration</option>
                            <option value="fix">🐛 Correctif</option>
                            <option value="security">🔒 Sécurité</option>
                            <option value="breaking">💥 Changement majeur</option>
                          </select>
                        </div>
                      </div>
                      <Input placeholder="Titre" value={changelogForm.title} onChange={e => setChangelogForm(p => ({ ...p, title: e.target.value }))} />
                      <textarea
                        className="w-full resize-none rounded-lg border border-input bg-background p-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        rows={4} placeholder="Contenu (Markdown supporté)"
                        value={changelogForm.content} onChange={e => setChangelogForm(p => ({ ...p, content: e.target.value }))}
                      />
                      <Input placeholder="URL bannière (optionnel)" value={changelogForm.bannerUrl} onChange={e => setChangelogForm(p => ({ ...p, bannerUrl: e.target.value }))} />
                      <div className="flex justify-end">
                        <Button disabled={!changelogForm.version || !changelogForm.title || !changelogForm.content || changelogSubmitting}
                          onClick={async () => {
                            setChangelogSubmitting(true);
                            try {
                              await api.createChangelog(changelogForm);
                              setChangelogForm({ version: '', title: '', content: '', type: 'feature', bannerUrl: '' });
                              const r = await api.getChangelogs();
                              if (r.success && r.data) setChangelogs(r.data as any[]);
                            } finally { setChangelogSubmitting(false); }
                          }}>
                          <PlusIcon className="size-4" /> Publier
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {changelogs.length === 0 ? (
                    <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun changelog publié.</CardContent></Card>
                  ) : (
                    <div className="space-y-3">
                      {changelogs.map((cl) => {
                        const typeMap: Record<string, { label: string; cls: string }> = {
                          feature: { label: '✨ Nouveauté', cls: 'bg-blue-500/15 text-blue-400' },
                          improvement: { label: '⚡ Amélioration', cls: 'bg-purple-500/15 text-purple-400' },
                          fix: { label: '🐛 Correctif', cls: 'bg-orange-500/15 text-orange-400' },
                          security: { label: '🔒 Sécurité', cls: 'bg-red-500/15 text-red-400' },
                          breaking: { label: '💥 Majeur', cls: 'bg-red-700/15 text-red-500' },
                        };
                        const t = typeMap[cl.type] || typeMap.feature;
                        return (
                          <Card key={cl.id}>
                            <CardContent className="flex items-start justify-between gap-4 py-4">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <code className="text-xs font-bold text-primary">{cl.version}</code>
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.cls}`}>{t.label}</span>
                                  <span className="text-xs text-muted-foreground">{new Date(cl.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                  {cl.author_username && <span className="text-xs text-muted-foreground">· @{cl.author_username}</span>}
                                </div>
                                <p className="font-semibold">{cl.title}</p>
                                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground whitespace-pre-line">{cl.content}</p>
                              </div>
                              <Button variant="ghost" size="icon-sm"
                                onClick={() => confirm('Supprimer ce changelog ?') && api.deleteChangelog(cl.id).then(() => setChangelogs(p => p.filter(c => c.id !== cl.id)))}>
                                <Trash2Icon className="size-4 text-destructive" />
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Monitoring ── */}
              {tab === 'monitoring' && (
                <div className="space-y-6">
                  {monitoringData && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <Card><CardContent className="py-4">
                          <p className="text-sm text-muted-foreground">Utilisateurs connectés</p>
                          <p className="mt-1 text-3xl font-semibold text-green-500">{monitoringData.connectedUsers?.current}</p>
                        </CardContent></Card>
                        <Card><CardContent className="py-4">
                          <p className="text-sm text-muted-foreground">Pic (24h)</p>
                          <p className="mt-1 text-3xl font-semibold">{monitoringData.connectedUsers?.peak24h}</p>
                        </CardContent></Card>
                        <Card><CardContent className="py-4">
                          <p className="text-sm text-muted-foreground">Dernière vérif.</p>
                          <p className="mt-2 text-sm font-medium">{new Date(monitoringData.checkedAt).toLocaleTimeString('fr-FR')}</p>
                        </CardContent></Card>
                      </div>

                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Historique connexions</CardTitle>
                            <div className="flex gap-1 rounded-lg border border-border p-1">
                              {(['30min', '10min', 'hour', 'day', 'month'] as const).map((p) => (
                                <button key={p} onClick={() => { setChartPeriod(p); loadChart(p); }}
                                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${chartPeriod === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                                  {p === '30min' ? '30 min' : p === '10min' ? '10 min' : p === 'hour' ? 'Heure' : p === 'day' ? 'Jour' : 'Mois'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {chartLoading ? (
                            <div className="flex h-52 items-center justify-center"><div className="size-6 animate-spin rounded-full border-[3px] border-primary border-t-transparent" /></div>
                          ) : chartData.length === 0 ? (
                            <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">Pas de données pour cette période.</div>
                          ) : (
                            <ResponsiveContainer width="100%" height={220}>
                              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false}
                                  tickFormatter={(v: string) => ['30min', '10min', 'hour'].includes(chartPeriod) ? v.slice(11, 16) : chartPeriod === 'day' ? v.slice(5) : v} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                                <Area type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#grad)" dot={false} activeDot={{ r: 4 }} />
                                <Line type="monotone" dataKey="max" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                                <Line type="monotone" dataKey="min" stroke="#f97316" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                              </AreaChart>
                            </ResponsiveContainer>
                          )}
                        </CardContent>
                      </Card>

                      {/* Instances */}
                      {(['users', 'messages', 'friends', 'calls', 'servers', 'bots', 'media'] as ServiceType[])
                        .map(type => ({ type, instances: serviceInstances.filter(i => i.serviceType === type) }))
                        .filter(g => g.instances.length > 0)
                        .map(({ type, instances }) => (
                          <Card key={type}>
                            <CardHeader><CardTitle className="capitalize text-base">{type}</CardTitle></CardHeader>
                            <CardContent>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>#ID</TableHead><TableHead>Domaine</TableHead>
                                    <TableHead>Lieu</TableHead><TableHead>Statut</TableHead>
                                    <TableHead>CPU</TableHead><TableHead>RAM</TableHead>
                                    <TableHead>Bande passante</TableHead><TableHead>Req/20min</TableHead>
                                    <TableHead>Score</TableHead><TableHead>Heartbeat</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {instances.map(inst => {
                                    const bwMB = (inst.metrics?.bandwidthUsage ?? 0) / 1_048_576;
                                    return (
                                      <TableRow key={inst.id}>
                                        <TableCell className="font-mono text-xs text-muted-foreground" title={inst.id}>{inst.id.slice(0, 8)}</TableCell>
                                        <TableCell>{inst.domain}</TableCell>
                                        <TableCell><Badge variant="secondary">{inst.location}</Badge></TableCell>
                                        <TableCell><StatusDot healthy={inst.healthy} lastHeartbeat={inst.lastHeartbeat} /></TableCell>
                                        <TableCell>{inst.metrics ? <MiniBar value={inst.metrics.cpuUsage} max={inst.metrics.cpuMax} unit="" /> : '—'}</TableCell>
                                        <TableCell>{inst.metrics ? <MiniBar value={inst.metrics.ramUsage} max={inst.metrics.ramMax} unit="MB" /> : '—'}</TableCell>
                                        <TableCell className="text-xs tabular-nums">{bwMB >= 1024 ? `${(bwMB/1024).toFixed(1)} GB` : `${bwMB.toFixed(1)} MB`}</TableCell>
                                        <TableCell className="tabular-nums">{inst.metrics?.requestCount20min.toLocaleString('fr-FR') ?? '—'}</TableCell>
                                        <TableCell className={`font-semibold text-xs ${inst.score >= 80 ? 'text-green-500' : inst.score >= 50 ? 'text-yellow-500' : 'text-destructive'}`}>{inst.score?.toFixed(1)}</TableCell>
                                        <TableCell className="text-xs tabular-nums text-muted-foreground">{new Date(inst.lastHeartbeat).toLocaleTimeString('fr-FR')}</TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </CardContent>
                          </Card>
                        ))}
                    </>
                  )}
                  {!monitoringData && <div className="flex h-40 items-center justify-center text-muted-foreground">Aucune donnée de monitoring.</div>}
                </div>
              )}

              {/* ── Status ── */}
              {tab === 'status' && (
                <div className="space-y-6">
                  {/* Infra en temps réel */}
                  {serviceInstances.length > 0 && (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm"><ServerIcon className="size-4 text-muted-foreground" /> Infrastructure en temps réel</CardTitle>
                        <span className="text-xs text-muted-foreground">{serviceInstances.length} instances</span>
                      </CardHeader>
                      <CardContent className="p-0">
                        {(['users', 'messages', 'friends', 'calls', 'servers', 'bots', 'media'] as ServiceType[])
                          .map(type => ({ type, instances: serviceInstances.filter(i => i.serviceType === type) }))
                          .filter(g => g.instances.length > 0)
                          .map(({ type, instances }) => {
                            const healthy = instances.filter(i => i.healthy).length;
                            const allOk = healthy === instances.length;
                            const noneOk = healthy === 0;
                            const expanded = expandedServices.has(type);
                            return (
                              <div key={type} className="border-b border-border last:border-0">
                                <button
                                  onClick={() => setExpandedServices(p => { const n = new Set(p); n.has(type) ? n.delete(type) : n.add(type); return n; })}
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors">
                                  {expanded ? <ChevronDownIcon className="size-3.5 text-muted-foreground" /> : <ChevronRightIcon className="size-3.5 text-muted-foreground" />}
                                  <span className={`size-2 rounded-full ${allOk ? 'bg-green-500' : noneOk ? 'bg-destructive' : 'bg-yellow-400'}`} />
                                  <span className="flex-1 text-sm font-medium capitalize">{type}</span>
                                  <span className={`text-xs font-medium ${allOk ? 'text-green-400' : noneOk ? 'text-destructive' : 'text-yellow-400'}`}>
                                    {allOk ? 'Opérationnel' : noneOk ? 'Hors ligne' : `${healthy}/${instances.length}`}
                                  </span>
                                </button>
                                {expanded && (
                                  <div className="bg-muted/30">
                                    {instances.map(inst => {
                                      const stale = Date.now() - new Date(inst.lastHeartbeat).getTime() > 90_000;
                                      const online = inst.healthy && !stale;
                                      return (
                                        <div key={inst.id} className="flex items-center gap-3 border-t border-border/50 px-8 py-2.5 text-sm">
                                          <span className={`size-1.5 rounded-full ${online ? 'bg-green-500' : stale ? 'bg-yellow-400' : 'bg-destructive'}`} />
                                          <span className="flex-1 truncate font-mono text-xs">{inst.id}</span>
                                          <span className="hidden truncate text-xs text-muted-foreground sm:block max-w-[180px]">{inst.domain}</span>
                                          <Badge variant="outline" className="text-[10px]">{inst.location}</Badge>
                                          <span className={`text-xs font-medium ${online ? 'text-green-400' : stale ? 'text-yellow-400' : 'text-destructive'}`}>
                                            {online ? 'En ligne' : stale ? 'Inactif' : 'Hors ligne'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                      <input type="checkbox" checked={includeResolved} className="rounded"
                        onChange={async e => {
                          setIncludeResolved(e.target.checked);
                          const r = await api.getAdminIncidents(e.target.checked);
                          if (r.success && r.data) setIncidents((r.data as any).incidents ?? []);
                        }} />
                      Afficher les incidents résolus
                    </label>
                    <Button size="sm"
                      onClick={() => { setEditingIncident(null); setIncidentForm({ title: '', message: '', severity: 'warning', status: 'investigating', services: '' }); }}>
                      <PlusIcon className="size-3.5" /> Nouvel incident
                    </Button>
                  </div>

                  {editingIncident !== undefined && (
                    <Card>
                      <CardHeader><CardTitle className="text-base">{editingIncident ? "Modifier l'incident" : 'Créer un incident'}</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        <Input placeholder="Titre *" value={incidentForm.title} onChange={e => setIncidentForm(p => ({ ...p, title: e.target.value }))} />
                        <textarea className="w-full resize-none rounded-lg border border-input bg-background p-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                          rows={3} placeholder="Message (optionnel)" value={incidentForm.message} onChange={e => setIncidentForm(p => ({ ...p, message: e.target.value }))} />
                        <div className="grid grid-cols-2 gap-3">
                          <select className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm" value={incidentForm.severity} onChange={e => setIncidentForm(p => ({ ...p, severity: e.target.value as any }))}>
                            <option value="info">Info</option>
                            <option value="warning">Avertissement</option>
                            <option value="critical">Critique</option>
                          </select>
                          <select className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm" value={incidentForm.status} onChange={e => setIncidentForm(p => ({ ...p, status: e.target.value as any }))}>
                            <option value="investigating">Investigation</option>
                            <option value="identified">Identifié</option>
                            <option value="monitoring">Surveillance</option>
                            <option value="resolved">Résolu</option>
                          </select>
                        </div>
                        <Input placeholder="Services (séparés par virgule)" value={incidentForm.services} onChange={e => setIncidentForm(p => ({ ...p, services: e.target.value }))} />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" disabled={incidentSubmitting} onClick={() => setEditingIncident(undefined)}>Annuler</Button>
                          <Button size="sm" disabled={incidentSubmitting || !incidentForm.title.trim()}
                            onClick={async () => {
                              setIncidentSubmitting(true);
                              const services = incidentForm.services.split(',').map(s => s.trim()).filter(Boolean);
                              try {
                                const payload = { title: incidentForm.title, message: incidentForm.message || undefined, severity: incidentForm.severity, status: incidentForm.status, services: services.length ? services : undefined };
                                if (editingIncident) await api.updateIncident(editingIncident.id, payload);
                                else await api.createIncident(payload);
                                setEditingIncident(undefined);
                                const r = await api.getAdminIncidents(includeResolved);
                                if (r.success && r.data) setIncidents((r.data as any).incidents ?? []);
                              } finally { setIncidentSubmitting(false); }
                            }}>
                            {incidentSubmitting ? 'Enregistrement…' : editingIncident ? 'Mettre à jour' : 'Créer'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {incidents.length === 0 && (
                    <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Aucun incident{includeResolved ? '' : ' actif'}.</div>
                  )}
                  <div className="space-y-3">
                    {incidents.map((inc: any) => (
                      <Card key={inc.id} className={`overflow-hidden ${inc.severity === 'critical' ? 'ring-1 ring-destructive/30' : inc.severity === 'warning' ? 'ring-1 ring-amber-500/30' : 'ring-1 ring-sky-500/30'}`}>
                        <CardContent className="py-4 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">{inc.title}</p>
                              {inc.message && <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{inc.message}</p>}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <Badge variant={inc.severity === 'critical' ? 'destructive' : 'outline'}
                                className={inc.severity === 'warning' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : inc.severity === 'info' ? 'border-sky-500/30 bg-sky-500/10 text-sky-400' : ''}>
                                {inc.severity === 'critical' ? 'Critique' : inc.severity === 'warning' ? 'Avertissement' : 'Info'}
                              </Badge>
                              <Badge variant="secondary">
                                {inc.status === 'investigating' ? 'Investigation' : inc.status === 'identified' ? 'Identifié' : inc.status === 'monitoring' ? 'Surveillance' : 'Résolu'}
                              </Badge>
                            </div>
                          </div>
                          {inc.services && (
                            <div className="flex flex-wrap gap-1">
                              {JSON.parse(inc.services).map((s: string) => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                            </div>
                          )}
                          <p className="text-[11px] text-muted-foreground">Créé le {new Date(inc.created_at).toLocaleString('fr-FR')}</p>
                        </CardContent>
                        <div className="flex items-center gap-2 border-t border-border/40 px-4 py-2">
                          <Button size="sm" variant="ghost"
                            onClick={() => { setEditingIncident(inc); setIncidentForm({ title: inc.title, message: inc.message ?? '', severity: inc.severity, status: inc.status, services: inc.services ? JSON.parse(inc.services).join(', ') : '' }); }}>
                            <Edit2Icon className="size-3.5" /> Modifier
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                            onClick={() => confirm('Supprimer cet incident ?') && api.deleteIncident(inc.id).then(() => setIncidents(p => p.filter((i: any) => i.id !== inc.id)))}>
                            <Trash2Icon className="size-3.5" /> Supprimer
                          </Button>
                          {inc.status !== 'resolved' && (
                            <Button size="sm" variant="ghost" className="ml-auto text-emerald-500"
                              onClick={async () => {
                                await api.updateIncident(inc.id, { status: 'resolved' });
                                const r = await api.getAdminIncidents(includeResolved);
                                if (r.success && r.data) setIncidents((r.data as any).incidents ?? []);
                              }}>
                              <CheckCircle2Icon className="size-3.5" /> Marquer résolu
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Services ── */}
              {tab === 'services' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">Registre des services</h2>

                  {/* Ajouter un service */}
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PlusIcon className="size-4 text-primary" /> Ajouter une instance</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">ID</label>
                          <Input placeholder="users-eu-2" value={serviceForm.id} onChange={e => setServiceForm(p => ({ ...p, id: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Type</label>
                          <select className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                            value={serviceForm.serviceType} onChange={e => setServiceForm(p => ({ ...p, serviceType: e.target.value as ServiceType }))}>
                            {(['users', 'messages', 'friends', 'calls', 'servers', 'bots', 'media'] as ServiceType[]).map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Location</label>
                          <Input placeholder="EU" value={serviceForm.location} onChange={e => setServiceForm(p => ({ ...p, location: e.target.value }))} />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-xs text-muted-foreground">Endpoint</label>
                          <Input placeholder="https://2.users.alfychat.eu" value={serviceForm.endpoint} onChange={e => setServiceForm(p => ({ ...p, endpoint: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Domaine</label>
                          <Input placeholder="2.users.alfychat.eu" value={serviceForm.domain} onChange={e => setServiceForm(p => ({ ...p, domain: e.target.value }))} />
                        </div>
                      </div>
                      {serviceFormError && <p className="text-xs text-destructive">{serviceFormError}</p>}
                      <div className="flex justify-end">
                        <Button disabled={serviceSubmitting || !serviceForm.id || !serviceForm.endpoint || !serviceForm.domain}
                          onClick={async () => {
                            setServiceSubmitting(true); setServiceFormError('');
                            try {
                              const r = await api.addAdminService(serviceForm);
                              if (r.success) {
                                setServiceForm({ id: '', serviceType: 'messages', endpoint: '', domain: '', location: 'EU' });
                                loadData();
                              } else {
                                setServiceFormError((r as any).error || 'Erreur.');
                              }
                            } catch { setServiceFormError('Erreur réseau.'); }
                            setServiceSubmitting(false);
                          }}>
                          <PlusIcon className="size-4" /> Ajouter
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Liste par type */}
                  {(['users', 'messages', 'friends', 'calls', 'servers', 'bots', 'media'] as ServiceType[])
                    .map(type => ({ type, instances: serviceInstances.filter(i => i.serviceType === type) }))
                    .filter(g => g.instances.length > 0)
                    .map(({ type, instances }) => (
                      <Card key={type}>
                        <CardHeader><CardTitle className="capitalize text-base">{type}</CardTitle></CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Domaine</TableHead>
                                <TableHead>Lieu</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead>Activé</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Heartbeat</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {instances.map(inst => (
                                <TableRow key={inst.id}>
                                  <TableCell className="font-mono text-xs text-muted-foreground" title={inst.id}>{inst.id}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1.5">
                                      {inst.domain}
                                      {/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(inst.domain) && (
                                        <Badge variant="outline" className="border-orange-500/30 bg-orange-500/10 text-orange-400 text-[10px]">LOCAL</Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell><Badge variant="secondary">{inst.location}</Badge></TableCell>
                                  <TableCell><StatusDot healthy={inst.healthy} lastHeartbeat={inst.lastHeartbeat} /></TableCell>
                                  <TableCell>
                                    <Switch
                                      checked={inst.enabled !== false}
                                      onCheckedChange={(v) => handleToggleService(inst.id, v)}
                                    />
                                  </TableCell>
                                  <TableCell className={`font-semibold text-xs ${inst.score >= 80 ? 'text-green-500' : inst.score >= 50 ? 'text-yellow-500' : 'text-destructive'}`}>
                                    {inst.score?.toFixed(1)}
                                  </TableCell>
                                  <TableCell className="text-xs tabular-nums text-muted-foreground">
                                    {new Date(inst.lastHeartbeat).toLocaleTimeString('fr-FR')}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button size="icon-sm" variant="outline" title="Régénérer la clé SERVICE_KEY"
                                        disabled={rotatingId === inst.id}
                                        onClick={() => handleRotateKey(inst.id)}>
                                        {rotatingId === inst.id
                                          ? <div className="size-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                          : <KeyIcon className="size-3.5" />}
                                      </Button>
                                      <Button size="icon-sm" variant="ghost"
                                        onClick={() => confirm(`Supprimer l'instance "${inst.id}" ?`) && api.deleteAdminService(inst.id).then(() => setServiceInstances(p => p.filter(s => s.id !== inst.id)))}>
                                        <Trash2Icon className="size-3.5 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    ))}

                  {/* Graphe réseau */}
                  <ServicesPanel />
                </div>
              )}

              {/* ── Settings ── */}
              {tab === 'settings' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">Paramètres du site</h2>

                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><UsersIcon className="size-4" /> Inscriptions</CardTitle>
                    <CardDescription>Contrôlez qui peut créer un compte.</CardDescription></CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div>
                          <p className="font-medium text-sm">Inscriptions ouvertes</p>
                          <p className="text-xs text-muted-foreground">Si désactivé, seuls les utilisateurs avec un lien d&apos;invitation pourront s&apos;inscrire.</p>
                        </div>
                        <Switch
                          checked={siteSettings.registration_enabled !== 'false'}
                          onCheckedChange={async (v) => {
                            const val = v ? 'true' : 'false';
                            await api.updateAdminSetting('registration_enabled', val);
                            setSiteSettings(p => ({ ...p, registration_enabled: val }));
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheckIcon className="size-4" /> Cloudflare Turnstile</CardTitle>
                    <CardDescription>Protégez le formulaire d&apos;inscription contre les bots.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div>
                          <p className="font-medium text-sm">Activer Turnstile</p>
                          <p className="text-xs text-muted-foreground">Les utilisateurs devront résoudre un captcha.</p>
                        </div>
                        <Switch
                          checked={siteSettings.turnstile_enabled === 'true'}
                          onCheckedChange={async (v) => {
                            const val = v ? 'true' : 'false';
                            await api.updateAdminSetting('turnstile_enabled', val);
                            setSiteSettings(p => ({ ...p, turnstile_enabled: val }));
                          }}
                        />
                      </div>
                      {siteSettings.turnstile_enabled === 'true' && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Clé du site (Site Key)</label>
                          <div className="flex gap-2">
                            <Input placeholder="0x4AAAAAA..." value={siteSettings.turnstile_site_key || ''}
                              onChange={e => setSiteSettings(p => ({ ...p, turnstile_site_key: e.target.value }))} />
                            <Button onClick={() => api.updateAdminSetting('turnstile_site_key', siteSettings.turnstile_site_key || '')}>
                              Sauvegarder
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Obtenez votre clé sur <span className="text-primary">dash.cloudflare.com → Turnstile</span>.
                            La clé secrète doit être dans <code className="rounded bg-muted px-1">TURNSTILE_SECRET_KEY</code>.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Link2Icon className="size-4" /> Liens d&apos;invitation</CardTitle>
                    <CardDescription>Générez des liens d&apos;inscription à usage unique.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <MailIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input type="email" className="pl-8" placeholder="email@exemple.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                        </div>
                        <select className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm" value={inviteExpiry} onChange={e => setInviteExpiry(e.target.value)}>
                          <option value="24">24 h</option>
                          <option value="48">48 h</option>
                          <option value="168">7 jours</option>
                          <option value="720">30 jours</option>
                        </select>
                        <Button disabled={!inviteEmail || inviteCreating}
                          onClick={async () => {
                            setInviteCreating(true);
                            try {
                              const r = await api.createInviteLink(inviteEmail, parseInt(inviteExpiry));
                              if (r.success && r.data) {
                                const d = r.data as any;
                                setInviteLinks(p => [d, ...p]);
                                setInviteEmail('');
                                try { await navigator.clipboard.writeText(d.link); setCopiedLink(d.id); setTimeout(() => setCopiedLink(null), 3000); } catch {}
                              }
                            } finally { setInviteCreating(false); }
                          }}>
                          <PlusIcon className="size-4" /> Générer
                        </Button>
                      </div>
                      {inviteLinks.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border p-8 text-center">
                          <Link2Icon className="mx-auto mb-3 size-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Aucun lien d&apos;invitation créé.</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Email</TableHead><TableHead>Statut</TableHead>
                              <TableHead>Expire</TableHead><TableHead>Créé par</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {inviteLinks.map((link) => {
                              const isExpired = new Date(link.expiresAt) < new Date();
                              const fullLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?invite=${link.code}`;
                              return (
                                <TableRow key={link.id}>
                                  <TableCell className="font-medium">{link.email}</TableCell>
                                  <TableCell>
                                    {link.used ? <Badge className="bg-green-600 text-white">Utilisé</Badge>
                                      : isExpired ? <Badge variant="destructive">Expiré</Badge>
                                      : <Badge variant="outline" className="border-blue-500 text-blue-500">Actif</Badge>}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">{new Date(link.expiresAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                                  <TableCell className="text-muted-foreground">{link.createdByUsername || '—'}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      {!link.used && !isExpired && (
                                        <Button variant="ghost" size="icon-sm"
                                          onClick={async () => { try { await navigator.clipboard.writeText(fullLink); setCopiedLink(link.id); setTimeout(() => setCopiedLink(null), 3000); } catch {} }}>
                                          {copiedLink === link.id ? <CheckCircle2Icon className="size-4 text-green-500" /> : <CopyIcon className="size-4" />}
                                        </Button>
                                      )}
                                      <Button variant="ghost" size="icon-sm"
                                        onClick={() => api.deleteInviteLink(link.id).then(() => setInviteLinks(p => p.filter(l => l.id !== link.id)))}>
                                        <Trash2Icon className="size-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

            </div>
          )}
        </main>
      </div>

      {/* ── Dialog Badge ── */}
      <Dialog open={showBadgeDialog} onOpenChange={setShowBadgeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBadge ? 'Modifier le badge' : 'Créer un badge'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nom</label>
              <Input placeholder="Développeur officiel" value={badgeForm.name} onChange={e => setBadgeForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <textarea className="w-full resize-none rounded-lg border border-input bg-background p-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                rows={2} placeholder="Description" value={badgeForm.description} onChange={e => setBadgeForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type d&apos;icône</label>
              <select className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                value={badgeForm.iconType} onChange={e => setBadgeForm(p => ({ ...p, iconType: e.target.value as any, iconValue: '' }))}>
                <option value="bootstrap">Icône Bootstrap (uicons)</option>
                <option value="flaticon">Icône Flaticon (classe CSS)</option>
                <option value="svg">SVG personnalisé</option>
              </select>
            </div>
            {badgeForm.iconType === 'bootstrap' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Icône (uicons)</label>
                <Input placeholder="Rechercher..." value={iconSearch} onChange={e => setIconSearch(e.target.value)} />
                <div className="h-56 overflow-y-auto rounded-lg border border-border p-2">
                  <div className="grid grid-cols-6 gap-2">
                    {filteredIcons.map(icon => (
                      <button key={icon.value} type="button"
                        className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all ${badgeForm.iconValue === icon.value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                        onClick={() => setBadgeForm(p => ({ ...p, iconValue: icon.value }))}>
                        <i className={`fi fi-br-${icon.value} text-2xl`} style={{ color: badgeForm.color }} />
                        <span className="text-center text-[10px] leading-tight text-muted-foreground">{icon.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : badgeForm.iconType === 'flaticon' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Classe CSS Flaticon</label>
                <p className="text-xs text-muted-foreground">
                  Entrez la classe CSS complète depuis <a href="https://www.flaticon.com/uicons" target="_blank" rel="noopener noreferrer" className="text-primary underline">flaticon.com/uicons</a> (ex: <code className="rounded bg-muted px-1">fi fi-rr-heart</code>, <code className="rounded bg-muted px-1">fi fi-ss-star</code>, <code className="rounded bg-muted px-1">fi fi-bs-crown</code>)
                </p>
                <Input placeholder="fi fi-rr-heart" value={badgeForm.iconValue} onChange={e => setBadgeForm(p => ({ ...p, iconValue: e.target.value }))} />
                {badgeForm.iconValue && (
                  <div className="rounded-lg border border-border p-4 text-center">
                    <i className={`${badgeForm.iconValue} text-4xl`} style={{ color: badgeForm.color }} />
                    <p className="mt-2 text-xs text-muted-foreground">Aperçu</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">SVG</label>
                <input type="file" accept=".svg" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) { const r = new FileReader(); r.onload = () => setBadgeForm(p => ({ ...p, iconValue: r.result as string })); r.readAsText(f); }
                  }} />
                {badgeForm.iconValue && (
                  <div className="rounded-lg border border-border p-4 text-center">
                    <div dangerouslySetInnerHTML={{ __html: sanitizeSvg(badgeForm.iconValue) }} className="inline-block size-12" />
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Couleur</label>
                <div className="flex gap-2">
                  <input type="color" value={badgeForm.color} onChange={e => setBadgeForm(p => ({ ...p, color: e.target.value }))} className="h-8 w-16 cursor-pointer rounded-lg border border-border bg-background" />
                  <Input value={badgeForm.color} onChange={e => setBadgeForm(p => ({ ...p, color: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Ordre</label>
                <Input type="number" value={badgeForm.displayOrder} onChange={e => setBadgeForm(p => ({ ...p, displayOrder: parseInt(e.target.value) || 999 }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Aperçu</label>
              <div className="flex items-center gap-3 rounded-lg border border-border p-4">
                <div className="flex size-12 items-center justify-center rounded-lg" style={{ backgroundColor: badgeForm.color + '22', border: `2px solid ${badgeForm.color}44` }}>
                  {renderBadgeIcon(badgeForm.iconType, badgeForm.iconValue, badgeForm.color, 'text-2xl')}
                </div>
                <div>
                  <p className="font-semibold">{badgeForm.name || 'Nom du badge'}</p>
                  <p className="text-sm text-muted-foreground">{badgeForm.description || 'Description'}</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={handleBadgeSave} disabled={!badgeForm.name || !badgeForm.iconValue}>
              {editingBadge ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog assign badges ── */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Badges de {selectedUser?.displayName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="mb-2 text-sm font-medium">Badges attribués</p>
              {userBadges.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Aucun badge attribué</p>
              ) : (
                <div className="space-y-2">
                  {userBadges.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded" style={{ backgroundColor: (b.color || '#5865F2') + '22', border: `1px solid ${b.color || '#5865F2'}44` }}>
                          {renderBadgeIcon(b.iconType || 'bootstrap', b.iconValue || b.icon, b.color || '#5865F2', 'text-sm')}
                        </div>
                        <span className="text-sm font-medium">{b.name}</span>
                      </div>
                      <Button variant="ghost" size="icon-sm"
                        onClick={() => api.removeBadgeFromUser(selectedUser.id, b.id).then(() => { setUserBadges(p => p.filter((x: any) => x.id !== b.id)); loadData(); })}>
                        <XIcon className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Separator />
            <div>
              <p className="mb-2 text-sm font-medium">Ajouter un badge</p>
              <div className="space-y-2">
                {badges.filter(b => b.isActive !== false && !userBadges.some((x: any) => x.id === b.id)).map(badge => (
                  <div key={badge.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded" style={{ backgroundColor: badge.color + '22', border: `1px solid ${badge.color}44` }}>
                        {renderBadgeIcon(badge.iconType, badge.iconValue, badge.color, 'text-sm')}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{badge.name}</p>
                        {badge.description && <p className="text-xs text-muted-foreground">{badge.description}</p>}
                      </div>
                    </div>
                    <Button size="sm" variant="outline"
                      onClick={() => api.assignBadgeToUser(selectedUser.id, badge.id).then(() => { setUserBadges(p => [...p, badge]); loadData(); })}>
                      <UserPlusIcon className="size-3.5" /> Ajouter
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button>Fermer</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog clé de service ── */}
      <Dialog open={!!rotatedKey} onOpenChange={(open) => { if (!open) setRotatedKey(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyIcon className="size-4 text-primary" /> Nouvelle clé générée
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
              Cette clé ne sera plus jamais affichée. Copiez-la maintenant et ajoutez-la dans le <code className="rounded bg-muted px-1">.env</code> du service <strong>{rotatedKey?.id}</strong>.
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">SERVICE_KEY</label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <code className="flex-1 break-all text-xs font-mono">
                  {showKey ? rotatedKey?.key : '•'.repeat(48)}
                </code>
                <button onClick={() => setShowKey(v => !v)} className="shrink-0 text-muted-foreground hover:text-foreground">
                  {showKey ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
            </div>
            <Button className="w-full" variant={keyCopied ? 'secondary' : 'default'}
              onClick={async () => {
                if (rotatedKey) {
                  await navigator.clipboard.writeText(`SERVICE_KEY=${rotatedKey.key}`);
                  setKeyCopied(true);
                }
              }}>
              {keyCopied ? <><CheckCircle2Icon className="size-4" /> Copié !</> : <><CopyIcon className="size-4" /> Copier SERVICE_KEY=...</>}
            </Button>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => setRotatedKey(null)}>Fermer</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
