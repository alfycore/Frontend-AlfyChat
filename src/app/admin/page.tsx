'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  ShieldIcon,
  UsersIcon,
  AwardIcon,
  BarChart3Icon,
  PlusIcon,
  SearchIcon,
  Edit2Icon,
  Trash2Icon,
  UserPlusIcon,
  XIcon,
  CompassIcon,
  ServerIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  HandshakeIcon,
  SettingsIcon,
  Link2Icon,
  MailIcon,
  CopyIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  BanIcon,
  FileTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { sanitizeSvg } from '@/lib/sanitize';
import { Button, Card, Modal, Switch } from '@heroui/react';
import { ServicesPanel } from './services-panel';

// Liste d'icônes Bootstrap Icons (vraies classes bi-*)
const BOOTSTRAP_ICONS = [
  { value: 'bi-star-fill', label: 'Étoile' },
  { value: 'bi-trophy-fill', label: 'Trophée' },
  { value: 'bi-crown-fill', label: 'Couronne' },
  { value: 'bi-shield-fill', label: 'Bouclier' },
  { value: 'bi-gem', label: 'Gemme' },
  { value: 'bi-fire', label: 'Feu' },
  { value: 'bi-heart-fill', label: 'Cœur' },
  { value: 'bi-lightning-fill', label: 'Éclair' },
  { value: 'bi-rocket-fill', label: 'Fusée' },
  { value: 'bi-bug-fill', label: 'Bug' },
  { value: 'bi-code-slash', label: 'Code' },
  { value: 'bi-palette-fill', label: 'Palette' },
  { value: 'bi-music-note-beamed', label: 'Musique' },
  { value: 'bi-camera-fill', label: 'Caméra' },
  { value: 'bi-controller', label: 'Manette' },
  { value: 'bi-brush-fill', label: 'Pinceau' },
  { value: 'bi-cpu-fill', label: 'CPU' },
  { value: 'bi-gift-fill', label: 'Cadeau' },
  { value: 'bi-award-fill', label: 'Médaille' },
  { value: 'bi-patch-check-fill', label: 'Vérifié' },
  { value: 'bi-person-badge-fill', label: 'Badge ID' },
  { value: 'bi-chat-heart-fill', label: 'Chat Cœur' },
  { value: 'bi-hand-thumbs-up-fill', label: 'Pouce' },
  { value: 'bi-emoji-sunglasses-fill', label: 'Cool' },
  { value: 'bi-flag-fill', label: 'Drapeau' },
  { value: 'bi-tools', label: 'Outils' },
  { value: 'bi-wrench-adjustable', label: 'Clé' },
  { value: 'bi-terminal-fill', label: 'Terminal' },
  { value: 'bi-globe2', label: 'Globe' },
  { value: 'bi-mortarboard-fill', label: 'Diplômé' },
  { value: 'bi-eye-fill', label: 'Œil' },
  { value: 'bi-diamond-fill', label: 'Diamant' },
  { value: 'bi-flower1', label: 'Fleur' },
  { value: 'bi-snow2', label: 'Flocon' },
  { value: 'bi-sun-fill', label: 'Soleil' },
  { value: 'bi-moon-fill', label: 'Lune' },
];

type Tab = 'overview' | 'badges' | 'users' | 'discovery' | 'server-badges' | 'security' | 'changelogs' | 'settings' | 'monitoring' | 'status' | 'services';

type ServiceType = 'users' | 'messages' | 'friends' | 'calls' | 'servers' | 'bots' | 'media';
type ServiceInstance = {
  id: string;
  serviceType: ServiceType;
  endpoint: string;
  domain: string;
  location: string;
  healthy: boolean;
  score: number;
  registeredAt: string;
  lastHeartbeat: string;
  metrics?: {
    ramUsage: number;
    ramMax: number;
    cpuUsage: number;
    cpuMax: number;
    bandwidthUsage: number;
    requestCount20min: number;
  };
};

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState<any>(null);

  // Badges
  const [badges, setBadges] = useState<any[]>([]);
  const [showBadgeDialog, setShowBadgeDialog] = useState(false);
  const [editingBadge, setEditingBadge] = useState<any>(null);
  const [badgeForm, setBadgeForm] = useState({
    name: '',
    description: '',
    iconType: 'bootstrap' as 'bootstrap' | 'svg',
    iconValue: '',
    color: '#5865F2',
    displayOrder: 999,
  });
  const [iconSearch, setIconSearch] = useState('');

  // Users
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Badge assignment dialog
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userBadges, setUserBadges] = useState<any[]>([]);

  // Discovery
  const [applications, setApplications] = useState<any[]>([]);
  const [appStatusFilter, setAppStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');

  // Server badges
  const [discoverServers, setDiscoverServers] = useState<any[]>([]);
  const [serverBadgesPage, setServerBadgesPage] = useState(0);

  // Settings
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [inviteLinks, setInviteLinks] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteExpiry, setInviteExpiry] = useState('48');
  const [inviteCreating, setInviteCreating] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Monitoring
  const [monitoringData, setMonitoringData] = useState<any>(null);
  const [chartPeriod, setChartPeriod] = useState<'30min' | '10min' | 'hour' | 'day' | 'month'>('hour');
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  // Security (Gateway)
  const [bannedIPs, setBannedIPs] = useState<Array<{ ip: string; reason: string; bannedBy: string; bannedAt: string }>>([]);
  const [rateLimitStats, setRateLimitStats] = useState<{ totalBlocked: number; activeWindows: number } | null>(null);
  const [rateLimitConfig, setRateLimitConfig] = useState<{ window: number; max: number } | null>(null);
  const [banIPValue, setBanIPValue] = useState('');
  const [banReasonValue, setBanReasonValue] = useState('');

  // Status / Incidents
  const [statusIncidents, setStatusIncidents] = useState<any[]>([]);
  const [statusIncludeResolved, setStatusIncludeResolved] = useState(false);
  const [statusForm, setStatusForm] = useState({
    title: '',
    message: '',
    severity: 'warning' as 'info' | 'warning' | 'critical',
    status: 'investigating' as 'investigating' | 'identified' | 'monitoring' | 'resolved',
    services: '',
  });
  const [editingIncident, setEditingIncident] = useState<any>(undefined);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusExpandedServices, setStatusExpandedServices] = useState<Set<string>>(new Set());

  // Changelogs
  const [changelogs, setChangelogs] = useState<any[]>([]);

  // Services (load balancer registry)
  const [serviceInstances, setServiceInstances] = useState<ServiceInstance[]>([]);
  const [serviceForm, setServiceForm] = useState({
    id: '',
    serviceType: 'messages' as ServiceType,
    endpoint: '',
    domain: '',
    location: 'EU',
  });
  const [serviceFormError, setServiceFormError] = useState('');
  const [serviceSubmitting, setServiceSubmitting] = useState(false);
  const [changelogForm, setChangelogForm] = useState({
    version: '',
    title: '',
    content: '',
    type: 'feature' as 'feature' | 'fix' | 'improvement' | 'security' | 'breaking',
    bannerUrl: '',
  });
  const [changelogSubmitting, setChangelogSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/channels/me');
      return;
    }
    if (user && user.role === 'admin') {
      loadData();
    }
  }, [user, activeTab, appStatusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const res = await api.getAdminStats();
        if (res.success) setStats(res.data);
      } else if (activeTab === 'badges') {
        const res = await api.getAdminBadges();
        if (res.success && res.data) setBadges(res.data as any[]);
      } else if (activeTab === 'users') {
        const [usersRes, badgesRes] = await Promise.all([
          api.getAdminUsers(100, 0),
          api.getAdminBadges(),
        ]);
        if (usersRes.success && usersRes.data) setUsers(usersRes.data as any[]);
        if (badgesRes.success && badgesRes.data) setBadges(badgesRes.data as any[]);
      } else if (activeTab === 'discovery') {
        const res = await api.getDiscoverApplications(appStatusFilter);
        if (res.success && res.data) {
          const data = res.data as any;
          setApplications(Array.isArray(data) ? data : (data.applications ?? []));
        }
      } else if (activeTab === 'server-badges') {
        const res = await api.getAllServersAdmin();
        if (res.success && res.data) {
          const data = res.data as any;
          setDiscoverServers(Array.isArray(data) ? data : (data.servers ?? []));
        }
      } else if (activeTab === 'settings') {
        const [settingsRes, linksRes] = await Promise.all([
          api.getAdminSettings(),
          api.getInviteLinks(),
        ]);
        if (settingsRes.success && settingsRes.data) setSiteSettings(settingsRes.data as Record<string, string>);
        if (linksRes.success && linksRes.data) setInviteLinks(linksRes.data as any[]);
      } else if (activeTab === 'security') {
        const res = await api.getGatewayStats();
        if (res.success && res.data) {
          const d = res.data as any;
          setBannedIPs(d.bannedIPs || []);
          setRateLimitStats(d.rateLimitStats || null);
          setRateLimitConfig(d.config || null);
        }
      } else if (activeTab === 'changelogs') {
        const res = await api.getChangelogs();
        if (res.success && res.data) setChangelogs(res.data as any[]);
      } else if (activeTab === 'monitoring') {
        const [monRes, svcRes] = await Promise.all([
          api.getMonitoringStats(),
          api.getAdminServices(),
        ]);
        if (monRes.success && monRes.data) setMonitoringData(monRes.data);
        if (svcRes.success && svcRes.data) setServiceInstances((svcRes.data as any).instances ?? []);
        // Load chart with current period
        loadChartData(chartPeriod);
      } else if (activeTab === 'status') {
        const [incRes, svcRes] = await Promise.all([
          api.getAdminIncidents(statusIncludeResolved),
          api.getAdminServices(),
        ]);
        if (incRes.success && incRes.data) setStatusIncidents((incRes.data as any).incidents ?? []);
        if (svcRes.success && svcRes.data) setServiceInstances((svcRes.data as any).instances ?? []);
      } else if (activeTab === 'services') {
        const res = await api.getAdminServices();
        if (res.success && res.data) setServiceInstances((res.data as any).instances ?? []);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    }
    setLoading(false);
  };

  const loadChartData = async (period: '30min' | '10min' | 'hour' | 'day' | 'month') => {
    setChartLoading(true);
    try {
      const res = await api.getMonitoringUsersChart(period);
      if (res.success && res.data?.data) setChartData(res.data.data);
    } catch { /* ignore */ } finally {
      setChartLoading(false);
    }
  };

  // ============ Badge CRUD ============
  const handleCreateBadge = async () => {
    try {
      const res = await api.createBadge(badgeForm);
      if (res.success) {
        setShowBadgeDialog(false);
        resetBadgeForm();
        loadData();
      }
    } catch (error) {
      console.error('Erreur création badge:', error);
    }
  };

  const handleUpdateBadge = async () => {
    if (!editingBadge) return;
    try {
      const res = await api.updateBadge(editingBadge.id, badgeForm);
      if (res.success) {
        setShowBadgeDialog(false);
        setEditingBadge(null);
        resetBadgeForm();
        loadData();
      }
    } catch (error) {
      console.error('Erreur mise à jour badge:', error);
    }
  };

  const handleToggleBadge = async (badgeId: string, isActive: boolean) => {
    try {
      await api.toggleBadgeStatus(badgeId, !isActive);
      loadData();
    } catch (error) {
      console.error('Erreur toggle badge:', error);
    }
  };

  const handleDeleteBadge = async (badgeId: string) => {
    if (!confirm('Supprimer ce badge ?')) return;
    try {
      await api.deleteBadge(badgeId);
      loadData();
    } catch (error) {
      console.error('Erreur suppression badge:', error);
    }
  };

  // ============ Users ============
  const handleUpdateUserRole = async (userId: string, role: string) => {
    try {
      await api.updateUserRole(userId, role as any);
      loadData();
    } catch (error) {
      console.error('Erreur mise à jour rôle:', error);
    }
  };

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      loadData();
      return;
    }
    try {
      const res = await api.searchAdminUsers(query);
      if (res.success && res.data) setUsers(res.data as any[]);
    } catch (error) {
      console.error('Erreur recherche:', error);
    }
  };

  // ============ Badge assignment ============
  const openAssignDialog = (u: any) => {
    setSelectedUser(u);
    setUserBadges(u.badges || []);
    setShowAssignDialog(true);
  };

  const handleAssignBadge = async (badgeId: string) => {
    if (!selectedUser) return;
    try {
      const res = await api.assignBadgeToUser(selectedUser.id, badgeId);
      if (res.success) {
        const badge = badges.find((b) => b.id === badgeId);
        if (badge) {
          setUserBadges((prev) => [
            ...prev,
            {
              id: badge.id,
              name: badge.name,
              iconType: badge.iconType,
              iconValue: badge.iconValue,
              color: badge.color,
            },
          ]);
        }
        loadData();
      }
    } catch (error) {
      console.error('Erreur attribution badge:', error);
    }
  };

  const handleRemoveBadge = async (badgeId: string) => {
    if (!selectedUser) return;
    try {
      const res = await api.removeBadgeFromUser(selectedUser.id, badgeId);
      if (res.success) {
        setUserBadges((prev) => prev.filter((b: any) => b.id !== badgeId));
        loadData();
      }
    } catch (error) {
      console.error('Erreur retrait badge:', error);
    }
  };

  const isUserHasBadge = (badgeId: string) => {
    return userBadges.some((b: any) => b.id === badgeId);
  };

  // ============ Discovery ============
  const handleReviewApplication = async (applicationId: string, action: 'approved' | 'rejected') => {
    try {
      const res = await api.reviewApplication(applicationId, action);
      if (res.success) loadData();
    } catch (error) {
      console.error('Erreur review:', error);
    }
  };

  // ============ Security (IP Ban) ============
  const handleBanIP = async () => {
    if (!banIPValue.trim()) return;
    try {
      const res = await api.banIP(banIPValue.trim(), banReasonValue.trim() || undefined);
      if (res.success) {
        setBanIPValue('');
        setBanReasonValue('');
        loadData();
      }
    } catch (error) {
      console.error('Erreur ban IP:', error);
    }
  };

  const handleUnbanIP = async (ip: string) => {
    try {
      const res = await api.unbanIP(ip);
      if (res.success) {
        setBannedIPs((prev) => prev.filter((b) => b.ip !== ip));
      }
    } catch (error) {
      console.error('Erreur unban IP:', error);
    }
  };

  // ============ Server Badges ============
  const handleFeatureServer = async (serverId: string, feature: boolean) => {
    try {
      if (feature) {
        await api.featureServer(serverId);
      } else {
        await api.unfeatureServer(serverId);
      }
      setDiscoverServers((prev) =>
        prev.map((s) =>
          s.id === serverId ? { ...s, discovery_status: feature ? 'approved' : null } : s
        )
      );
    } catch (error) {
      console.error('Erreur feature server:', error);
    }
  };

  const handleUpdateServerBadge = async (
    serverId: string,
    data: { isCertified?: boolean; isPartnered?: boolean }
  ) => {
    try {
      await api.updateServerBadges(serverId, data);
      // Update local state immediately
      setDiscoverServers((prev) =>
        prev.map((s) =>
          s.id === serverId
            ? {
                ...s,
                is_certified: data.isCertified !== undefined ? data.isCertified : s.is_certified,
                is_partnered: data.isPartnered !== undefined ? data.isPartnered : s.is_partnered,
              }
            : s
        )
      );
    } catch (error) {
      console.error('Erreur badge serveur:', error);
    }
  };

  // ============ Services ============
  const handleAddService = async () => {
    if (!serviceForm.id.trim() || !serviceForm.endpoint.trim() || !serviceForm.domain.trim()) {
      setServiceFormError('ID, endpoint et domaine sont requis.');
      return;
    }
    setServiceFormError('');
    setServiceSubmitting(true);
    try {
      const res = await api.addAdminService(serviceForm);
      if (res.success) {
        setServiceForm({ id: '', serviceType: 'messages', endpoint: '', domain: '', location: 'EU' });
        loadData();
      } else {
        setServiceFormError((res as any).error || 'Erreur lors de l\'ajout.');
      }
    } catch {
      setServiceFormError('Erreur réseau.');
    }
    setServiceSubmitting(false);
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm(`Supprimer l'instance "${id}" ?`)) return;
    try {
      const res = await api.deleteAdminService(id);
      if (res.success) setServiceInstances((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Erreur suppression instance:', error);
    }
  };

  // ============ Helpers ============
  const openEditBadge = (badge: any) => {
    setEditingBadge(badge);
    setBadgeForm({
      name: badge.name,
      description: badge.description || '',
      iconType: badge.iconType,
      iconValue: badge.iconValue,
      color: badge.color,
      displayOrder: badge.displayOrder,
    });
    setShowBadgeDialog(true);
  };

  const resetBadgeForm = () => {
    setBadgeForm({
      name: '',
      description: '',
      iconType: 'bootstrap',
      iconValue: '',
      color: '#5865F2',
      displayOrder: 999,
    });
    setEditingBadge(null);
    setIconSearch('');
  };

  const filteredIcons = BOOTSTRAP_ICONS.filter(
    (icon) =>
      icon.label.toLowerCase().includes(iconSearch.toLowerCase()) ||
      icon.value.toLowerCase().includes(iconSearch.toLowerCase())
  );

  // Rendu d'une icône de badge (Bootstrap Icon ou SVG)
  const renderBadgeIcon = (
    iconType: string,
    iconValue: string,
    color: string,
    size: string = 'text-xl'
  ) => {
    if (iconType === 'bootstrap' && iconValue) {
      return <i className={`bi ${iconValue} ${size}`} style={{ color }} />;
    }
    if (iconType === 'svg' && iconValue) {
      return (
        <span
          dangerouslySetInnerHTML={{ __html: sanitizeSvg(iconValue) }}
          className="inline-block h-5 w-5"
        />
      );
    }
    return <i className={`bi bi-question-circle ${size} text-[var(--muted)]`} />;
  };

  // ============ Guard ============
  if (!user || user.role !== 'admin') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0b0b0d' }}>
        <div style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32, maxWidth: 360, textAlign: 'center' }}>
          <ShieldIcon size={32} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>Accès refusé</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Cette page est réservée aux administrateurs.</div>
          <button onClick={() => router.push('/channels/me')} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 20px', color: 'white', cursor: 'pointer', fontSize: 13 }}>
            Retour à l&apos;app
          </button>
        </div>
      </div>
    );
  }

  const NAV_ITEMS = [
    { id: 'overview' as Tab, label: "Vue d'ensemble", icon: BarChart3Icon },
    { id: 'users' as Tab, label: 'Utilisateurs', icon: UsersIcon },
    { id: 'badges' as Tab, label: 'Badges', icon: AwardIcon },
    { id: 'server-badges' as Tab, label: 'Badges serveurs', icon: ServerIcon },
    { id: 'discovery' as Tab, label: 'Découverte', icon: CompassIcon },
    { id: 'monitoring' as Tab, label: 'Monitoring', icon: BarChart3Icon },
    { id: 'status' as Tab, label: 'Status public', icon: CheckCircle2Icon },
    { id: 'security' as Tab, label: 'Sécurité', icon: ShieldAlertIcon },
    { id: 'changelogs' as Tab, label: 'Changelogs', icon: FileTextIcon },
    { id: 'settings' as Tab, label: 'Paramètres', icon: SettingsIcon },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0b0b0d' }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 220, flexShrink: 0, background: '#111113', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldIcon size={16} style={{ color: '#818cf8' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: 1.2 }}>Admin</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>AlfyChat</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px' }}>
          {NAV_ITEMS.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8, marginBottom: 1,
                  background: isActive ? 'rgba(255,255,255,0.08)' : 'none',
                  border: `1px solid ${isActive ? 'rgba(255,255,255,0.1)' : 'transparent'}`,
                  cursor: 'pointer', textAlign: 'left',
                  color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.42)',
                  fontSize: 13, fontWeight: isActive ? 600 : 400, transition: 'all 0.1s',
                }}
                onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}}
                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.42)'; }}}
              >
                <item.icon size={15} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.id === 'server-badges' && discoverServers.length > 0 && (
                  <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '1px 6px', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {discoverServers.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#a5b4fc', flexShrink: 0 }}>
            {user?.displayName?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.displayName}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Administrateur</div>
          </div>
          <button onClick={() => router.push('/channels/me')} title="Retour à l'app"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.22)', padding: '4px', borderRadius: 5, lineHeight: 0 }}>
            <XIcon size={14} />
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
        {/* Top bar */}
        <div style={{ padding: '14px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(11,11,13,0.85)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 20, flexShrink: 0 }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.88)', margin: 0 }}>
            {NAV_ITEMS.find(n => n.id === activeTab)?.label ?? 'Admin'}
          </h1>
          <button onClick={loadData}
            style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>
            ↻ Actualiser
          </button>
        </div>

        {/* Content */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6 sm:py-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="size-8 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Vue d'ensemble */}
            {activeTab === 'overview' && stats && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                  <div className="px-5 py-4">
                    <p className="text-sm text-[var(--muted)]">Utilisateurs total</p>
                    <p className="text-3xl font-semibold text-[var(--foreground)]">
                      {stats.totalUsers}
                    </p>
                  </div>
                </Card>
                <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                  <div className="px-5 py-4">
                    <p className="text-sm text-[var(--muted)]">En ligne</p>
                    <p className="text-3xl font-semibold text-green-500">
                      {stats.onlineUsers}
                    </p>
                  </div>
                </Card>
                <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                  <div className="px-5 py-4">
                    <p className="text-sm text-[var(--muted)]">Administrateurs</p>
                    <p className="text-3xl font-semibold text-[var(--accent)]">
                      {stats.admins}
                    </p>
                  </div>
                </Card>
                <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                  <div className="px-5 py-4">
                    <p className="text-sm text-[var(--muted)]">Modérateurs</p>
                    <p className="text-3xl font-semibold text-orange-500">
                      {stats.moderators}
                    </p>
                  </div>
                </Card>
              </div>
            )}

            {/* Badges */}
            {activeTab === 'badges' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-[var(--foreground)]">Gestion des badges</h2>
                  <Button
                    onPress={() => {
                      resetBadgeForm();
                      setShowBadgeDialog(true);
                    }}
                  >
                    <PlusIcon size={16} className="mr-2" />
                    Créer un badge
                  </Button>
                </div>

                {badges.length === 0 ? (
                  <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                    <div className="p-8 text-center">
                      <AwardIcon size={48} className="mx-auto mb-4 text-[var(--muted)]" />
                      <p className="text-lg font-medium text-[var(--foreground)]">Aucun badge</p>
                      <p className="text-sm text-[var(--muted)]">
                        Créez votre premier badge personnalisé.
                      </p>
                    </div>
                  </Card>
                ) : (
                  <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                    <div className="overflow-hidden rounded-xl">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)] bg-[var(--surface-secondary)]">
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)]">Badge</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)]">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)]">Ordre</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)]">Actif</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-[var(--muted)]">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {badges.map((badge) => (
                            <tr key={badge.id} className="bg-[var(--surface)]">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="flex size-10 items-center justify-center rounded-lg"
                                    style={{
                                      backgroundColor: badge.color + '20',
                                      border: `2px solid ${badge.color}40`,
                                    }}
                                  >
                                    {renderBadgeIcon(
                                      badge.iconType,
                                      badge.iconValue,
                                      badge.color,
                                      'text-lg'
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium text-[var(--foreground)]">{badge.name}</p>
                                    <p className="text-xs text-[var(--muted)]">
                                      {badge.description}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-xs text-[var(--muted)]">
                                  {badge.iconType === 'bootstrap'
                                    ? 'Bootstrap'
                                    : 'SVG'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[var(--foreground)]">{badge.displayOrder}</td>
                              <td className="px-4 py-3">
                                <Switch
                                  isSelected={badge.isActive}
                                  onChange={() =>
                                    handleToggleBadge(badge.id, badge.isActive)
                                  }
                                >
                                  <Switch.Control>
                                    <Switch.Thumb />
                                  </Switch.Control>
                                </Switch>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    isIconOnly
                                    onPress={() => openEditBadge(badge)}
                                  >
                                    <Edit2Icon size={16} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    isIconOnly
                                    onPress={() => handleDeleteBadge(badge.id)}
                                  >
                                    <Trash2Icon size={16} className="text-red-500" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Découverte serveurs */}
            {activeTab === 'discovery' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-[var(--foreground)]">Candidatures Découverte</h2>
                  <div className="flex gap-2">
                    {(['pending', 'approved', 'rejected'] as const).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={appStatusFilter === s ? 'primary' : 'outline'}
                        onPress={() => {
                          setAppStatusFilter(s);
                          api.getDiscoverApplications(s).then((res) => {
                            if (res.success && res.data) {
                              const d = res.data as any;
                              setApplications(Array.isArray(d) ? d : (d.applications ?? []));
                            }
                          });
                        }}
                      >
                        {s === 'pending' && <ClockIcon size={12} className="mr-1" />}
                        {s === 'approved' && <CheckCircle2Icon size={12} className="mr-1" />}
                        {s === 'rejected' && <XCircleIcon size={12} className="mr-1" />}
                        {s === 'pending' ? 'En attente' : s === 'approved' ? 'Approuvées' : 'Rejetées'}
                      </Button>
                    ))}
                  </div>
                </div>

                {applications.length === 0 ? (
                  <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                    <div className="p-8 text-center">
                      <CompassIcon size={48} className="mx-auto mb-4 text-[var(--muted)]" />
                      <p className="text-lg font-medium text-[var(--foreground)]">Aucune candidature</p>
                      <p className="text-sm text-[var(--muted)]">
                        Aucune candidature {appStatusFilter === 'pending' ? 'en attente' : appStatusFilter === 'approved' ? 'approuvée' : 'rejetée'} pour le moment.
                      </p>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {applications.map((app) => (
                      <Card key={app.id} className="border border-[var(--border)] bg-[var(--surface)] p-0">
                        <div className="flex items-start justify-between gap-4 p-4">
                          <div className="flex items-start gap-4 flex-1">
                            {app.serverIcon ? (
                              <img
                                src={app.serverIcon}
                                alt={app.serverName}
                                className="size-12 rounded-xl object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="flex size-12 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-lg font-bold text-[var(--foreground)]">
                                {(app.serverName || '?')[0]}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-[var(--foreground)]">{app.serverName}</p>
                                <span className="rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-xs text-[var(--muted)]">
                                  {app.memberCount ?? '?'} membres
                                </span>
                              </div>
                              <p className="text-sm text-[var(--muted)] mt-0.5">{app.serverDescription}</p>
                              <p className="mt-2 text-sm text-[var(--foreground)]">
                                <span className="font-medium">Raison :</span> {app.reason}
                              </p>
                              <p className="text-xs text-[var(--muted)] mt-1">
                                Candidature de <span className="font-medium">{app.applicantName || app.applicantId}</span>
                                {' · '}
                                {new Date(app.createdAt).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>
                          {appStatusFilter === 'pending' && (
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onPress={() => handleReviewApplication(app.id, 'approved')}
                              >
                                <CheckCircle2Icon size={12} className="mr-1" />
                                Approuver
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onPress={() => handleReviewApplication(app.id, 'rejected')}
                              >
                                <XCircleIcon size={12} className="mr-1" />
                                Rejeter
                              </Button>
                            </div>
                          )}
                          {appStatusFilter !== 'pending' && (
                            <span className={`rounded-full px-2 py-0.5 text-xs text-white ${appStatusFilter === 'approved' ? 'bg-green-600' : 'bg-red-500'}`}>
                              {appStatusFilter === 'approved' ? 'Approuvé' : 'Rejeté'}
                            </span>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Badges serveurs */}
            {activeTab === 'server-badges' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-[var(--foreground)]">Badges des serveurs</h2>
                  <p className="text-sm text-[var(--muted)]">
                    Gérez les badges et la visibilité dans la découverte pour tous les serveurs.
                  </p>
                </div>

                {discoverServers.length === 0 ? (
                  <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                    <div className="p-8 text-center">
                      <ServerIcon size={48} className="mx-auto mb-4 text-[var(--muted)]" />
                      <p className="text-lg font-medium text-[var(--foreground)]">Aucun serveur trouvé</p>
                      <p className="text-sm text-[var(--muted)]">
                        Aucun serveur enregistré sur AlfyChat.
                      </p>
                    </div>
                  </Card>
                ) : (
                  <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                    <div className="overflow-hidden rounded-xl">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)] bg-[var(--surface-secondary)]">
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)]">Serveur</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)]">Membres</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-[var(--muted)]">Découverte</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-[var(--muted)]">Certifié</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-[var(--muted)]">Partenaire</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {discoverServers.slice(serverBadgesPage * 10, (serverBadgesPage + 1) * 10).map((server) => {
                            const isFeatured = server.discovery_status === 'approved';
                            return (
                            <tr key={server.id} className="bg-[var(--surface)]">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {server.icon_url || server.iconUrl ? (
                                    <img
                                      src={server.icon_url || server.iconUrl}
                                      alt={server.name}
                                      className="size-9 rounded-xl object-cover"
                                    />
                                  ) : (
                                    <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--surface-secondary)] font-bold text-[var(--foreground)]">
                                      {(server.name || '?')[0]}
                                    </div>
                                  )}
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-medium text-[var(--foreground)]">{server.name}</p>
                                      {(server.is_certified || server.isCertified) && (
                                        <CheckCircle2Icon size={14} className="text-blue-500" />
                                      )}
                                      {(server.is_partnered || server.isPartnered) && (
                                        <HandshakeIcon size={14} className="text-purple-500" />
                                      )}
                                    </div>
                                    <p className="text-xs text-[var(--muted)] line-clamp-1">
                                      {server.description || 'Aucune description'}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-xs text-[var(--muted)]">{server.member_count ?? server.memberCount ?? '?'} membres</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Switch
                                  isSelected={isFeatured}
                                  onChange={(e) => handleFeatureServer(server.id, e)}
                                >
                                  <Switch.Control>
                                    <Switch.Thumb />
                                  </Switch.Control>
                                </Switch>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Switch
                                  isDisabled={!isFeatured}
                                  isSelected={!!(server.is_certified || server.isCertified)}
                                  onChange={(e) =>
                                    handleUpdateServerBadge(server.id, { isCertified: e })
                                  }
                                >
                                  <Switch.Control>
                                    <Switch.Thumb />
                                  </Switch.Control>
                                </Switch>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Switch
                                  isDisabled={!isFeatured}
                                  isSelected={!!(server.is_partnered || server.isPartnered)}
                                  onChange={(e) =>
                                    handleUpdateServerBadge(server.id, { isPartnered: e })
                                  }
                                >
                                  <Switch.Control>
                                    <Switch.Thumb />
                                  </Switch.Control>
                                </Switch>
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

                {/* Pagination */}
                {discoverServers.length > 10 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[var(--muted)]">
                      {serverBadgesPage * 10 + 1}–{Math.min((serverBadgesPage + 1) * 10, discoverServers.length)} sur {discoverServers.length} serveurs
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" isDisabled={serverBadgesPage === 0} onPress={() => setServerBadgesPage(p => p - 1)}>
                        ← Précédent
                      </Button>
                      <Button variant="outline" size="sm" isDisabled={(serverBadgesPage + 1) * 10 >= discoverServers.length} onPress={() => setServerBadgesPage(p => p + 1)}>
                        Suivant →
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Utilisateurs */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                    <input
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      placeholder="Rechercher un utilisateur..."
                      value={searchQuery}
                      onChange={(e) => handleSearchUsers(e.target.value)}
                    />
                  </div>
                </div>

                <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                  <div className="overflow-hidden rounded-xl">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface-secondary)]">
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)]">Utilisateur</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)]">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)]">Badges</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)]">Statut</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)]">Rôle</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)]">Créé le</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[var(--muted)]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {users.map((u) => (
                          <tr key={u.id} className="bg-[var(--surface)]">
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-[var(--foreground)]">{u.displayName}</p>
                                <p className="text-xs text-[var(--muted)]">
                                  @{u.username}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[var(--foreground)]">{u.email}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                {(u.badges || [])
                                  .slice(0, 3)
                                  .map((b: any, i: number) => (
                                    <div
                                      key={i}
                                      className="flex size-6 items-center justify-center rounded"
                                      style={{
                                        backgroundColor:
                                          (b.color || '#5865F2') + '20',
                                      }}
                                      title={b.name}
                                    >
                                      {renderBadgeIcon(
                                        b.iconType || 'bootstrap',
                                        b.iconValue || b.icon,
                                        b.color || '#5865F2',
                                        'text-xs'
                                      )}
                                    </div>
                                  ))}
                                {(u.badges || []).length > 3 && (
                                  <span className="text-xs text-[var(--muted)]">
                                    +{u.badges.length - 3}
                                  </span>
                                )}
                                {(!u.badges || u.badges.length === 0) && (
                                  <span className="text-xs text-[var(--muted)]">
                                    Aucun
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {u.isOnline ? (
                                <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs text-white">En ligne</span>
                              ) : (
                                <span className="rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-xs text-[var(--muted)]">Hors ligne</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <select
                                className="w-32 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                                value={u.role || 'user'}
                                onChange={(e) =>
                                  handleUpdateUserRole(u.id, e.target.value)
                                }
                              >
                                <option value="user">Utilisateur</option>
                                <option value="moderator">Modérateur</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-[var(--foreground)]">
                              {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                isIconOnly
                                onPress={() => openAssignDialog(u)}
                                aria-label="Gérer les badges"
                              >
                                <AwardIcon size={16} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* Sécurité */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-[var(--foreground)]">Sécurité &amp; Rate Limiting</h2>

                {/* Stats cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                    <div className="px-5 py-4">
                      <p className="text-sm text-[var(--muted)]">IPs bannies</p>
                      <p className="text-3xl font-semibold text-red-500">{bannedIPs.length}</p>
                    </div>
                  </Card>
                  <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                    <div className="px-5 py-4">
                      <p className="text-sm text-[var(--muted)]">Requêtes bloquées (rate limit)</p>
                      <p className="text-3xl font-semibold text-orange-500">{rateLimitStats?.totalBlocked ?? 0}</p>
                    </div>
                  </Card>
                  <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                    <div className="px-5 py-4">
                      <p className="text-sm text-[var(--muted)]">Config rate limit</p>
                      <p className="text-lg font-semibold text-[var(--foreground)]">
                        {rateLimitConfig ? `${rateLimitConfig.max} req / ${rateLimitConfig.window}s` : '—'}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {rateLimitStats?.activeWindows ?? 0} fenêtres actives
                      </p>
                    </div>
                  </Card>
                </div>

                {/* Ban IP form */}
                <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                  <div className="px-5 py-4">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
                      <BanIcon size={20} className="text-red-500" />
                      Bannir une IP
                    </h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      L&apos;IP sera bloquée au niveau du gateway (HTTP + WebSocket).
                    </p>
                  </div>
                  <div className="px-5 pb-4">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="text"
                        placeholder="Adresse IP (ex: 192.168.1.1)"
                        value={banIPValue}
                        onChange={(e) => setBanIPValue(e.target.value)}
                        className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted)] outline-none focus:border-[var(--accent)]"
                      />
                      <input
                        type="text"
                        placeholder="Raison (optionnel)"
                        value={banReasonValue}
                        onChange={(e) => setBanReasonValue(e.target.value)}
                        className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted)] outline-none focus:border-[var(--accent)]"
                      />
                      <Button
                        variant="danger"
                        onPress={handleBanIP}
                        isDisabled={!banIPValue.trim()}
                      >
                        <BanIcon size={16} />
                        Bannir
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Banned IPs list */}
                <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                  <div className="px-5 py-4">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
                      <ShieldAlertIcon size={20} className="text-orange-500" />
                      IPs bannies ({bannedIPs.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto px-5 pb-4">
                    {bannedIPs.length === 0 ? (
                      <p className="py-8 text-center text-sm text-[var(--muted)]">
                        Aucune IP bannie pour le moment.
                      </p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)]">
                            <th className="px-3 py-2 text-left font-medium text-[var(--muted)]">IP</th>
                            <th className="px-3 py-2 text-left font-medium text-[var(--muted)]">Raison</th>
                            <th className="px-3 py-2 text-left font-medium text-[var(--muted)]">Banni par</th>
                            <th className="px-3 py-2 text-left font-medium text-[var(--muted)]">Date</th>
                            <th className="px-3 py-2 text-right font-medium text-[var(--muted)]">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bannedIPs.map((ban) => (
                            <tr key={ban.ip} className="border-b border-[var(--border)]/40 hover:bg-[var(--background)]">
                              <td className="px-3 py-2 font-mono text-[var(--foreground)]">{ban.ip}</td>
                              <td className="px-3 py-2 text-[var(--muted)]">{ban.reason || '—'}</td>
                              <td className="px-3 py-2 text-[var(--muted)]">{ban.bannedBy || 'Système'}</td>
                              <td className="px-3 py-2 text-[var(--muted)]">
                                {ban.bannedAt ? new Date(ban.bannedAt).toLocaleString('fr-FR') : '—'}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onPress={() => handleUnbanIP(ban.ip)}
                                >
                                  <ShieldCheckIcon size={16} />
                                  Débannir
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* Changelogs */}
            {activeTab === 'changelogs' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-[var(--foreground)]">Changelogs</h2>

                {/* Formulaire de création */}
                <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                  <div className="px-5 py-4">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
                      <PlusIcon size={20} className="text-[var(--accent)]" />
                      Publier un changelog
                    </h3>
                  </div>
                  <div className="px-5 pb-5 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <label className="text-xs font-medium text-[var(--muted)]">Version</label>
                        <input
                          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                          placeholder="v1.2.0"
                          value={changelogForm.version}
                          onChange={(e) => setChangelogForm({ ...changelogForm, version: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <label className="text-xs font-medium text-[var(--muted)]">Type</label>
                        <select
                          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                          value={changelogForm.type}
                          onChange={(e) => setChangelogForm({ ...changelogForm, type: e.target.value as any })}
                        >
                          <option value="feature">✨ Nouveauté</option>
                          <option value="improvement">⚡ Amélioration</option>
                          <option value="fix">🐛 Correctif</option>
                          <option value="security">🔒 Sécurité</option>
                          <option value="breaking">💥 Changement majeur</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-xs font-medium text-[var(--muted)]">Titre</label>
                      <input
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        placeholder="Amélioration des appels vidéo"
                        value={changelogForm.title}
                        onChange={(e) => setChangelogForm({ ...changelogForm, title: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-xs font-medium text-[var(--muted)]">Contenu (Markdown supporté)</label>
                      <textarea
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
                        placeholder="- Correction du bug de connexion&#10;- Amélioration des performances&#10;- Nouvelle interface..."
                        rows={5}
                        value={changelogForm.content}
                        onChange={(e) => setChangelogForm({ ...changelogForm, content: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-xs font-medium text-[var(--muted)]">URL de la bannière (optionnel)</label>
                      <input
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        placeholder="https://example.com/banner.png"
                        value={changelogForm.bannerUrl}
                        onChange={(e) => setChangelogForm({ ...changelogForm, bannerUrl: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        isDisabled={!changelogForm.version || !changelogForm.title || !changelogForm.content || changelogSubmitting}
                        onPress={async () => {
                          setChangelogSubmitting(true);
                          try {
                            const res = await api.createChangelog(changelogForm);
                            if (res.success) {
                              setChangelogForm({ version: '', title: '', content: '', type: 'feature', bannerUrl: '' });
                              const updated = await api.getChangelogs();
                              if (updated.success && updated.data) setChangelogs(updated.data as any[]);
                            }
                          } catch (e) { console.error(e); }
                          setChangelogSubmitting(false);
                        }}
                      >
                        <PlusIcon size={16} className="mr-1" />
                        Publier
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Liste des changelogs */}
                {changelogs.length === 0 ? (
                  <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                    <div className="p-8 text-center">
                      <FileTextIcon size={48} className="mx-auto mb-4 text-[var(--muted)]" />
                      <p className="text-lg font-medium text-[var(--foreground)]">Aucun changelog</p>
                      <p className="text-sm text-[var(--muted)]">Publiez votre premier changelog ci-dessus.</p>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {changelogs.map((cl) => {
                      const typeColors: Record<string, string> = {
                        feature: 'bg-blue-500/15 text-blue-400',
                        improvement: 'bg-purple-500/15 text-purple-400',
                        fix: 'bg-orange-500/15 text-orange-400',
                        security: 'bg-red-500/15 text-red-400',
                        breaking: 'bg-red-700/15 text-red-500',
                      };
                      const typeLabels: Record<string, string> = {
                        feature: '✨ Nouveauté',
                        improvement: '⚡ Amélioration',
                        fix: '🐛 Correctif',
                        security: '🔒 Sécurité',
                        breaking: '💥 Majeur',
                      };
                      return (
                        <Card key={cl.id} className="border border-[var(--border)] bg-[var(--surface)] p-0">
                          <div className="flex items-start justify-between gap-4 p-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono font-bold text-[var(--accent)]">{cl.version}</span>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[cl.type] || typeColors.feature}`}>
                                  {typeLabels[cl.type] || cl.type}
                                </span>
                                <span className="text-xs text-[var(--muted)]">
                                  {new Date(cl.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </span>
                                {cl.author_username && (
                                  <span className="text-xs text-[var(--muted)]">· @{cl.author_username}</span>
                                )}
                              </div>
                              <p className="font-semibold text-[var(--foreground)]">{cl.title}</p>
                              <p className="mt-1 text-sm text-[var(--muted)] whitespace-pre-line line-clamp-3">{cl.content}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              isIconOnly
                              onPress={async () => {
                                if (!confirm('Supprimer ce changelog ?')) return;
                                await api.deleteChangelog(cl.id);
                                setChangelogs((prev) => prev.filter((c) => c.id !== cl.id));
                              }}
                            >
                              <Trash2Icon size={16} className="text-red-500" />
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Paramètres */}
            {/* Monitoring */}
            {activeTab === 'monitoring' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-[var(--foreground)]">Monitoring des services</h2>
                  <Button variant="outline" onPress={loadData}>Actualiser</Button>
                </div>

                {monitoringData && (
                  <>
                    {/* Connected users */}
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                        <div className="px-5 py-4">
                          <p className="text-sm text-[var(--muted)]">Utilisateurs connectés</p>
                          <p className="text-3xl font-semibold text-green-500">{monitoringData.connectedUsers.current}</p>
                        </div>
                      </Card>
                      <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                        <div className="px-5 py-4">
                          <p className="text-sm text-[var(--muted)]">Pic (24h)</p>
                          <p className="text-3xl font-semibold text-[var(--foreground)]">{monitoringData.connectedUsers.peak24h}</p>
                        </div>
                      </Card>
                      <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                        <div className="px-5 py-4">
                          <p className="text-sm text-[var(--muted)]">Dernière vérification</p>
                          <p className="text-sm font-medium text-[var(--foreground)] mt-2">
                            {new Date(monitoringData.checkedAt).toLocaleTimeString('fr-FR')}
                          </p>
                        </div>
                      </Card>
                    </div>

                    {/* User connection chart */}
                    <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                      <div className="px-5 py-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-[var(--foreground)]">Historique connexions</h3>
                          <div className="flex gap-1 rounded-lg border border-[var(--border)] p-1">
                            {(['30min', '10min', 'hour', 'day', 'month'] as const).map((p) => (
                              <button
                                key={p}
                                onClick={() => {
                                  setChartPeriod(p);
                                  loadChartData(p);
                                }}
                                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                                  chartPeriod === p
                                    ? 'bg-[var(--accent)] text-white'
                                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                                }`}
                              >
                                {p === '30min' ? '30 dernières min' : p === '10min' ? 'Par 10 min' : p === 'hour' ? 'Par heure' : p === 'day' ? 'Par jour' : 'Par mois'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {chartLoading ? (
                          <div className="flex h-52 items-center justify-center">
                            <div className="size-6 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
                          </div>
                        ) : chartData.length === 0 ? (
                          <div className="flex h-52 items-center justify-center text-sm text-[var(--muted)]">
                            Pas encore de données pour cette période.
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="connGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                              <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11, fill: 'var(--muted)' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v: string) => {
                                  if (chartPeriod === '30min' || chartPeriod === '10min' || chartPeriod === 'hour') return v.slice(11, 16); // HH:MM
                                  if (chartPeriod === 'day') return v.slice(5);                                                           // MM-DD
                                  return v;                                                                                                // YYYY-MM
                                }}
                              />
                              <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 11, fill: 'var(--muted)' }}
                                tickLine={false}
                                axisLine={false}
                              />
                              <Tooltip
                                contentStyle={{
                                  background: 'var(--surface)',
                                  border: '1px solid var(--border)',
                                  borderRadius: '8px',
                                  fontSize: 12,
                                  color: 'var(--foreground)',
                                }}
                                labelStyle={{ color: 'var(--muted)', marginBottom: 4 }}
                                formatter={(value: any, name: any) => {
                                  const labels: Record<string, string> = { avg: 'Moy.', max: 'Max', min: 'Min' };
                                  return [value, labels[String(name)] ?? name];
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="avg"
                                stroke="var(--accent)"
                                strokeWidth={2}
                                fill="url(#connGrad)"
                                dot={false}
                                activeDot={{ r: 4 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="max"
                                stroke="#22c55e"
                                strokeWidth={1.5}
                                strokeDasharray="4 2"
                                dot={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="min"
                                stroke="#f97316"
                                strokeWidth={1.5}
                                strokeDasharray="4 2"
                                dot={false}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}

                        <div className="mt-3 flex gap-4 text-xs text-[var(--muted)]">
                          <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 bg-[var(--accent)]" /> Moyenne</span>
                          <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 bg-green-500" style={{ borderTop: '1.5px dashed #22c55e' }} /> Maximum</span>
                          <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 bg-orange-500" style={{ borderTop: '1.5px dashed #f97316' }} /> Minimum</span>
                        </div>
                      </div>
                    </Card>

                    {/* Services — instances détaillées */}
                    {(() => {
                      const SERVICE_TYPES_MON: ServiceType[] = ['users', 'messages', 'friends', 'calls', 'servers', 'bots', 'media'];
                      const grouped = SERVICE_TYPES_MON.map(type => ({
                        type,
                        instances: serviceInstances.filter(i => i.serviceType === type),
                      })).filter(g => g.instances.length > 0);

                      const pct = (used: number, max: number) =>
                        max > 0 ? Math.round((used / max) * 100) : 0;

                      const barColor = (p: number) =>
                        p >= 85 ? '#ef4444' : p >= 60 ? '#f59e0b' : '#22c55e';

                      const MiniBar = ({ value, max, unit }: { value: number; max: number; unit: string }) => {
                        const p = pct(value, max);
                        return (
                          <div className="flex items-center gap-2 min-w-[110px]">
                            <div className="relative h-1.5 w-16 rounded-full bg-[var(--surface-secondary)] overflow-hidden">
                              <div
                                style={{ width: `${p}%`, background: barColor(p) }}
                                className="absolute inset-y-0 left-0 rounded-full"
                              />
                            </div>
                            <span className="text-xs tabular-nums" style={{ color: barColor(p) }}>
                              {p}%
                            </span>
                            <span className="text-xs text-[var(--muted)] tabular-nums">
                              {unit === 'MB' ? `${Math.round(value)}/${Math.round(max)} MB` : unit}
                            </span>
                          </div>
                        );
                      };

                      if (grouped.length === 0) {
                        return (
                          <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                            <div className="px-5 py-4">
                              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Instances de services</h3>
                              <p className="text-sm text-[var(--muted)]">Aucune instance enregistrée.</p>
                            </div>
                          </Card>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {grouped.map(({ type, instances }) => (
                            <Card key={type} className="border border-[var(--border)] bg-[var(--surface)] p-0">
                              <div className="px-5 py-4">
                                <h3 className="text-base font-semibold text-[var(--foreground)] mb-3 capitalize">{type}</h3>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-[var(--border)] bg-[var(--surface-secondary)]">
                                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--muted)]">#ID</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--muted)]">Domaine</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--muted)]">Lieu</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--muted)]">Statut</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--muted)]">CPU</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--muted)]">RAM</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--muted)]">Bande passante</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--muted)]">Req / 20 min</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--muted)]">Score</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--muted)]">Heartbeat</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border)]">
                                      {instances.map(inst => {
                                        const stale = Date.now() - new Date(inst.lastHeartbeat).getTime() > 90_000;
                                        const statusColor = !inst.healthy ? '#ef4444' : stale ? '#f59e0b' : '#22c55e';
                                        const statusLabel = !inst.healthy ? 'Hors ligne' : stale ? 'Inactif' : 'En ligne';
                                        return (
                                          <tr key={inst.id} className="bg-[var(--surface)] hover:bg-[var(--surface-secondary)] transition-colors">
                                            <td className="px-3 py-2 font-mono text-xs text-[var(--muted)]" title={inst.id}>
                                              {inst.id.slice(0, 8)}
                                            </td>
                                            <td className="px-3 py-2 text-[var(--foreground)]">{inst.domain}</td>
                                            <td className="px-3 py-2">
                                              <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: 'var(--surface-secondary)', color: 'var(--muted)' }}>
                                                {inst.location}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2">
                                              <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: statusColor }}>
                                                <span className="size-1.5 rounded-full" style={{ background: statusColor }} />
                                                {statusLabel}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2">
                                              {inst.metrics ? (
                                                <MiniBar value={inst.metrics.cpuUsage} max={inst.metrics.cpuMax} unit="" />
                                              ) : <span className="text-xs text-[var(--muted)]">—</span>}
                                            </td>
                                            <td className="px-3 py-2">
                                              {inst.metrics ? (
                                                <MiniBar value={inst.metrics.ramUsage} max={inst.metrics.ramMax} unit="MB" />
                                              ) : <span className="text-xs text-[var(--muted)]">—</span>}
                                            </td>
                                            <td className="px-3 py-2">
                                              {inst.metrics ? (
                                                <span className="text-xs tabular-nums text-[var(--foreground)]">
                                                  {inst.metrics.bandwidthUsage >= 1024
                                                    ? `${(inst.metrics.bandwidthUsage / 1024).toFixed(1)} GB`
                                                    : `${Math.round(inst.metrics.bandwidthUsage)} MB`}
                                                </span>
                                              ) : <span className="text-xs text-[var(--muted)]">—</span>}
                                            </td>
                                            <td className="px-3 py-2 text-xs tabular-nums text-[var(--foreground)]">
                                              {inst.metrics ? inst.metrics.requestCount20min.toLocaleString('fr-FR') : '—'}
                                            </td>
                                            <td className="px-3 py-2">
                                              <span className={`text-xs font-semibold ${
                                                inst.score >= 80 ? 'text-green-500' :
                                                inst.score >= 50 ? 'text-yellow-500' :
                                                'text-red-500'
                                              }`}>{inst.score}</span>
                                            </td>
                                            <td className="px-3 py-2 text-xs text-[var(--muted)] tabular-nums">
                                              {new Date(inst.lastHeartbeat).toLocaleTimeString('fr-FR')}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      );
                    })()}
                  </>
                )}

                {!monitoringData && !loading && (
                  <div className="flex h-40 items-center justify-center text-[var(--muted)]">
                    Aucune donnée de monitoring disponible.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'status' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-2xl font-bold text-[var(--foreground)]">Status public & Incidents</h2>

                {/* ── Services en temps réel ── */}
                {(() => {
                  const SERVICE_TYPES: ServiceType[] = ['users', 'messages', 'friends', 'calls', 'servers', 'bots', 'media'];
                  const SERVICE_LABELS: Record<ServiceType, string> = {
                    users: 'Users', messages: 'Messages', friends: 'Friends',
                    calls: 'Calls', servers: 'Servers', bots: 'Bots', media: 'Media',
                  };
                  const grouped = SERVICE_TYPES.map(type => ({
                    type,
                    label: `Service ${SERVICE_LABELS[type]}`,
                    instances: serviceInstances.filter(i => i.serviceType === type),
                  })).filter(g => g.instances.length > 0);

                  if (grouped.length === 0 && !loading) return null;

                  return (
                    <Card className="border border-[var(--border)] bg-[var(--surface)] p-0 overflow-hidden mb-2">
                      <div className="px-5 py-3 border-b border-[var(--border)] flex items-center gap-2">
                        <ServerIcon size={15} className="text-[var(--muted)]" />
                        <span className="font-semibold text-sm text-[var(--foreground)]">Infrastructure en temps réel</span>
                        <span className="ml-auto text-xs text-[var(--muted)]">{serviceInstances.length} instance{serviceInstances.length > 1 ? 's' : ''}</span>
                      </div>
                      <div className="divide-y divide-[var(--border)]">
                        {grouped.map(({ type, label, instances }) => {
                          const healthyCount = instances.filter(i => i.healthy).length;
                          const allOk = healthyCount === instances.length;
                          const noneOk = healthyCount === 0;
                          const isExpanded = statusExpandedServices.has(type);
                          const staleThreshold = 90_000;

                          return (
                            <div key={type}>
                              {/* Header (cliquable) */}
                              <button
                                onClick={() => setStatusExpandedServices(prev => {
                                  const next = new Set(prev);
                                  if (next.has(type)) next.delete(type); else next.add(type);
                                  return next;
                                })}
                                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-secondary)] transition-colors text-left"
                              >
                                {isExpanded
                                  ? <ChevronDownIcon size={13} className="text-[var(--muted)] flex-shrink-0" />
                                  : <ChevronRightIcon size={13} className="text-[var(--muted)] flex-shrink-0" />}
                                <span
                                  className={`size-2 rounded-full flex-shrink-0 ${
                                    allOk ? 'bg-green-500 shadow-[0_0_6px_#22c55e80]' :
                                    noneOk ? 'bg-red-500' : 'bg-yellow-400'
                                  }`}
                                />
                                <span className="text-sm font-medium text-[var(--foreground)] flex-1">{label}</span>
                                <span className={`text-xs font-medium ${
                                  allOk ? 'text-green-400' : noneOk ? 'text-red-400' : 'text-yellow-400'
                                }`}>
                                  {allOk ? 'Opérationnel' : noneOk ? 'Hors ligne' : `${healthyCount}/${instances.length} en ligne`}
                                </span>
                                <span className="text-xs text-[var(--muted)] ml-2">{instances.length} nœud{instances.length > 1 ? 's' : ''}</span>
                              </button>

                              {/* Détail des instances */}
                              {isExpanded && (
                                <div className="bg-[var(--surface-secondary)]/40">
                                  {instances.map(inst => {
                                    const stale = Date.now() - new Date(inst.lastHeartbeat).getTime() > staleThreshold;
                                    const online = inst.healthy && !stale;
                                    return (
                                      <div key={inst.id} className="flex items-center gap-3 px-8 py-2.5 border-t border-[var(--border)]/50 text-sm">
                                        <span className={`size-1.5 rounded-full flex-shrink-0 ${
                                          online ? 'bg-green-500' : stale ? 'bg-yellow-400' : 'bg-red-500'
                                        }`} />
                                        <span className="font-mono text-xs text-[var(--foreground)] flex-1 truncate" title={inst.id}>{inst.id}</span>
                                        <span className="text-xs text-[var(--muted)] hidden sm:block truncate max-w-[180px]" title={inst.domain}>{inst.domain}</span>
                                        <span className="text-[10px] text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded px-1.5 py-0.5">{inst.location}</span>
                                        <span className={`text-xs font-medium ${
                                          online ? 'text-green-400' : stale ? 'text-yellow-400' : 'text-red-400'
                                        }`}>
                                          {online ? 'En ligne' : stale ? 'Inactif' : 'Hors ligne'}
                                        </span>
                                        {inst.metrics && (
                                          <span className="text-[10px] text-[var(--muted)] hidden md:block">
                                            CPU {Math.round(inst.metrics.cpuUsage * 100 / (inst.metrics.cpuMax || 1))}%
                                            · RAM {Math.round(inst.metrics.ramUsage * 100 / (inst.metrics.ramMax || 1))}%
                                          </span>
                                        )}
                                        <span className="text-[10px] text-[var(--muted)]/50 hidden lg:block">
                                          {new Date(inst.lastHeartbeat).toLocaleTimeString('fr-FR')}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })()}
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="flex items-center gap-2 text-sm text-[var(--muted)] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={statusIncludeResolved}
                        onChange={async (e) => {
                          setStatusIncludeResolved(e.target.checked);
                          const res = await api.getAdminIncidents(e.target.checked);
                          if (res.success && res.data) setStatusIncidents((res.data as any).incidents ?? []);
                        }}
                        className="rounded"
                      />
                      Afficher les incidents résolus
                    </label>
                    <Button
                      size="sm"
                      onPress={() => {
                        setEditingIncident(null);
                        setStatusForm({ title: '', message: '', severity: 'warning', status: 'investigating', services: '' });
                      }}
                      className="bg-[var(--accent)] text-[var(--accent-foreground)]"
                    >
                      <PlusIcon size={14} /> Nouvel incident
                    </Button>
                  </div>
                </div>

                {/* Create / Edit form */}
                {editingIncident !== undefined && (
                  <Card className="border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
                    <h3 className="font-semibold text-[var(--foreground)]">
                      {editingIncident ? 'Modifier l\'incident' : 'Créer un incident'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-[var(--muted)] mb-1">Titre *</label>
                        <input
                          value={statusForm.title}
                          onChange={(e) => setStatusForm((p) => ({ ...p, title: e.target.value }))}
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                          placeholder="Ex: Dégradation du service messages"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-[var(--muted)] mb-1">Message (optionnel)</label>
                        <textarea
                          rows={3}
                          value={statusForm.message}
                          onChange={(e) => setStatusForm((p) => ({ ...p, message: e.target.value }))}
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] resize-none"
                          placeholder="Détails de l'incident, actions en cours…"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--muted)] mb-1">Sévérité</label>
                        <select
                          value={statusForm.severity}
                          onChange={(e) => setStatusForm((p) => ({ ...p, severity: e.target.value as any }))}
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--foreground)] outline-none"
                        >
                          <option value="info">Info</option>
                          <option value="warning">Avertissement</option>
                          <option value="critical">Critique</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--muted)] mb-1">Statut</label>
                        <select
                          value={statusForm.status}
                          onChange={(e) => setStatusForm((p) => ({ ...p, status: e.target.value as any }))}
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--foreground)] outline-none"
                        >
                          <option value="investigating">Investigation</option>
                          <option value="identified">Identifié</option>
                          <option value="monitoring">Surveillance</option>
                          <option value="resolved">Résolu</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-[var(--muted)] mb-1">Services concernés (séparés par virgule)</label>
                        <input
                          value={statusForm.services}
                          onChange={(e) => setStatusForm((p) => ({ ...p, services: e.target.value }))}
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                          placeholder="gateway, messages, users"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Button size="sm" variant="ghost" onPress={() => setEditingIncident(undefined)} isDisabled={statusSubmitting}>
                        Annuler
                      </Button>
                      <Button
                        size="sm"
                        className="bg-[var(--accent)] text-[var(--accent-foreground)]"
                        isDisabled={statusSubmitting || !statusForm.title.trim()}
                        onPress={async () => {
                          setStatusSubmitting(true);
                          const services = statusForm.services.split(',').map((s) => s.trim()).filter(Boolean);
                          try {
                            if (editingIncident) {
                              await api.updateIncident(editingIncident.id, {
                                title: statusForm.title,
                                message: statusForm.message || undefined,
                                severity: statusForm.severity,
                                status: statusForm.status,
                                services: services.length ? services : undefined,
                              });
                            } else {
                              await api.createIncident({
                                title: statusForm.title,
                                message: statusForm.message || undefined,
                                severity: statusForm.severity,
                                status: statusForm.status,
                                services: services.length ? services : undefined,
                              });
                            }
                            setEditingIncident(undefined);
                            const res = await api.getAdminIncidents(statusIncludeResolved);
                            if (res.success && res.data) setStatusIncidents((res.data as any).incidents ?? []);
                          } finally {
                            setStatusSubmitting(false);
                          }
                        }}
                      >
                        {statusSubmitting ? 'Enregistrement…' : editingIncident ? 'Mettre à jour' : 'Créer'}
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Incidents list */}
                {statusIncidents.length === 0 && !loading && (
                  <div className="flex h-32 items-center justify-center text-[var(--muted)] text-sm">
                    Aucun incident{statusIncludeResolved ? '' : ' actif'}.
                  </div>
                )}
                <div className="space-y-3">
                  {statusIncidents.map((inc: any) => (
                    <Card key={inc.id} className={`border bg-[var(--surface)] p-0 overflow-hidden ${
                      inc.severity === 'critical' ? 'border-red-500/30' :
                      inc.severity === 'warning'  ? 'border-amber-500/30' :
                      'border-sky-500/30'
                    }`}>
                      <div className="px-5 py-4 space-y-2">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <p className="font-semibold text-[var(--foreground)]">{inc.title}</p>
                            {inc.message && <p className="text-sm text-[var(--muted)] mt-0.5 whitespace-pre-wrap">{inc.message}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                              inc.severity === 'critical' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                              inc.severity === 'warning'  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' :
                              'border-sky-500/30 bg-sky-500/10 text-sky-400'
                            }`}>
                              {inc.severity === 'critical' ? 'Critique' : inc.severity === 'warning' ? 'Avertissement' : 'Info'}
                            </span>
                            <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface-secondary)] px-2 py-0.5 text-xs text-[var(--muted)]">
                              {inc.status === 'investigating' ? 'Investigation' : inc.status === 'identified' ? 'Identifié' : inc.status === 'monitoring' ? 'Surveillance' : 'Résolu'}
                            </span>
                          </div>
                        </div>
                        {inc.services && (
                          <div className="flex flex-wrap gap-1">
                            {JSON.parse(inc.services).map((s: string) => (
                              <span key={s} className="rounded-full border border-[var(--border)] bg-[var(--surface-secondary)] px-2 py-0.5 text-[10px] text-[var(--muted)]">{s}</span>
                            ))}
                          </div>
                        )}
                        <p className="text-[11px] text-[var(--muted)]/60">
                          Créé le {new Date(inc.created_at).toLocaleString('fr-FR')}
                          {inc.resolved_at && ` · Résolu le ${new Date(inc.resolved_at).toLocaleString('fr-FR')}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 border-t border-[var(--border)]/40 px-5 py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onPress={() => {
                            setEditingIncident(inc);
                            setStatusForm({
                              title: inc.title,
                              message: inc.message ?? '',
                              severity: inc.severity,
                              status: inc.status,
                              services: inc.services ? JSON.parse(inc.services).join(', ') : '',
                            });
                          }}
                          className="text-[var(--foreground)]"
                        >
                          <Edit2Icon size={13} /> Modifier
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                          onPress={async () => {
                            if (!confirm('Supprimer cet incident ?')) return;
                            await api.deleteIncident(inc.id);
                            setStatusIncidents((prev) => prev.filter((i: any) => i.id !== inc.id));
                          }}
                        >
                          <Trash2Icon size={13} /> Supprimer
                        </Button>
                        {inc.status !== 'resolved' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-emerald-400 ml-auto"
                            onPress={async () => {
                              await api.updateIncident(inc.id, { status: 'resolved' });
                              const res = await api.getAdminIncidents(statusIncludeResolved);
                              if (res.success && res.data) setStatusIncidents((res.data as any).incidents ?? []);
                            }}
                          >
                            <CheckCircle2Icon size={13} /> Marquer résolu
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'services' && (
              <ServicesPanel />
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-[var(--foreground)]">Paramètres du site</h2>

                {/* Inscriptions */}
                <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                  <div className="px-5 py-4">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
                      <UsersIcon size={20} />
                      Inscriptions
                    </h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Contrôlez qui peut créer un compte sur AlfyChat.
                    </p>
                  </div>
                  <div className="px-5 pb-4 space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4">
                      <div>
                        <p className="font-medium text-[var(--foreground)]">Inscriptions ouvertes</p>
                        <p className="text-sm text-[var(--muted)]">
                          Si désactivé, seuls les utilisateurs avec un lien d&apos;invitation pourront s&apos;inscrire.
                        </p>
                      </div>
                      <Switch
                        isSelected={siteSettings.registration_enabled !== 'false'}
                        onChange={async (e) => {
                          const value = e ? 'true' : 'false';
                          await api.updateAdminSetting('registration_enabled', value);
                          setSiteSettings((prev) => ({ ...prev, registration_enabled: value }));
                        }}
                      >
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                    </div>
                  </div>
                </Card>

                {/* Cloudflare Turnstile */}
                <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                  <div className="px-5 py-4">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
                      <ShieldCheckIcon size={20} />
                      Cloudflare Turnstile (Captcha)
                    </h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Protégez le formulaire d&apos;inscription contre les bots.
                    </p>
                  </div>
                  <div className="px-5 pb-4 space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4">
                      <div>
                        <p className="font-medium text-[var(--foreground)]">Activer Turnstile</p>
                        <p className="text-sm text-[var(--muted)]">
                          Les utilisateurs devront résoudre un captcha pour s&apos;inscrire.
                        </p>
                      </div>
                      <Switch
                        isSelected={siteSettings.turnstile_enabled === 'true'}
                        onChange={async (e) => {
                          const value = e ? 'true' : 'false';
                          await api.updateAdminSetting('turnstile_enabled', value);
                          setSiteSettings((prev) => ({ ...prev, turnstile_enabled: value }));
                        }}
                      >
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                    </div>
                    {siteSettings.turnstile_enabled === 'true' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--foreground)]">Clé du site (Site Key)</label>
                        <div className="flex gap-2">
                          <input
                            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                            placeholder="0x4AAAAAA..."
                            value={siteSettings.turnstile_site_key || ''}
                            onChange={(e) =>
                              setSiteSettings((prev) => ({ ...prev, turnstile_site_key: e.target.value }))
                            }
                          />
                          <Button
                            onPress={async () => {
                              await api.updateAdminSetting('turnstile_site_key', siteSettings.turnstile_site_key || '');
                            }}
                          >
                            Sauvegarder
                          </Button>
                        </div>
                        <p className="text-xs text-[var(--muted)]">
                          Obtenez votre clé sur{' '}
                          <span className="text-[var(--accent)]">dash.cloudflare.com → Turnstile</span>.
                          La clé secrète doit être configurée dans la variable d&apos;environnement <code className="rounded bg-[var(--surface-secondary)] px-1">TURNSTILE_SECRET_KEY</code> du service Users.
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Liens d'invitation */}
                <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                  <div className="px-5 py-4">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
                      <Link2Icon size={20} />
                      Liens d&apos;invitation
                    </h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Générez des liens d&apos;inscription à usage unique associés à un email.
                    </p>
                  </div>
                  <div className="px-5 pb-4 space-y-4">
                    {/* Formulaire de création */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                          <MailIcon size={16} className="text-[var(--muted)]" />
                        </div>
                        <input
                          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                          type="email"
                          placeholder="Email du futur utilisateur..."
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <select
                        className="w-36 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        value={inviteExpiry}
                        onChange={(e) => setInviteExpiry(e.target.value)}
                      >
                        <option value="24">24 heures</option>
                        <option value="48">48 heures</option>
                        <option value="168">7 jours</option>
                        <option value="720">30 jours</option>
                      </select>
                      <Button
                        isDisabled={!inviteEmail || inviteCreating}
                        onPress={async () => {
                          setInviteCreating(true);
                          try {
                            const res = await api.createInviteLink(inviteEmail, parseInt(inviteExpiry));
                            if (res.success && res.data) {
                              const data = res.data as any;
                              setInviteLinks((prev) => [data, ...prev]);
                              setInviteEmail('');
                              // Copier automatiquement
                              try {
                                await navigator.clipboard.writeText(data.link);
                                setCopiedLink(data.id);
                                setTimeout(() => setCopiedLink(null), 3000);
                              } catch {}
                            }
                          } finally {
                            setInviteCreating(false);
                          }
                        }}
                      >
                        <PlusIcon size={16} className="mr-1" />
                        Générer
                      </Button>
                    </div>

                    {/* Liste des liens */}
                    {inviteLinks.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center">
                        <Link2Icon size={40} className="mx-auto mb-3 text-[var(--muted)]" />
                        <p className="text-sm font-medium text-[var(--foreground)]">Aucun lien d&apos;invitation</p>
                        <p className="text-xs text-[var(--muted)]">
                          Créez un lien pour inviter quelqu&apos;un à s&apos;inscrire.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface-secondary)]">
                              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)]">Email</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)]">Statut</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)]">Expire</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted)]">Créé par</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--muted)]">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)]">
                            {inviteLinks.map((link) => {
                              const isExpired = new Date(link.expiresAt) < new Date();
                              const frontendUrl = typeof window !== 'undefined' ? window.location.origin : '';
                              const fullLink = `${frontendUrl}/register?invite=${link.code}`;
                              return (
                                <tr key={link.id} className="bg-[var(--surface)]">
                                  <td className="px-4 py-3 font-medium text-[var(--foreground)]">{link.email}</td>
                                  <td className="px-4 py-3">
                                    {link.used ? (
                                      <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs text-white">Utilisé</span>
                                    ) : isExpired ? (
                                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">Expiré</span>
                                    ) : (
                                      <span className="rounded-full border border-blue-500 bg-transparent px-2 py-0.5 text-xs text-blue-500">
                                        Actif
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-[var(--foreground)]">
                                    {new Date(link.expiresAt).toLocaleDateString('fr-FR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </td>
                                  <td className="px-4 py-3 text-[var(--foreground)]">
                                    {link.createdByUsername || '—'}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-1">
                                      {!link.used && !isExpired && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          isIconOnly
                                          aria-label="Copier le lien"
                                          onPress={async () => {
                                            try {
                                              await navigator.clipboard.writeText(fullLink);
                                              setCopiedLink(link.id);
                                              setTimeout(() => setCopiedLink(null), 3000);
                                            } catch {}
                                          }}
                                        >
                                          {copiedLink === link.id ? (
                                            <CheckCircle2Icon size={16} className="text-green-500" />
                                          ) : (
                                            <CopyIcon size={16} />
                                          )}
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        isIconOnly
                                        onPress={async () => {
                                          await api.deleteInviteLink(link.id);
                                          setInviteLinks((prev) => prev.filter((l) => l.id !== link.id));
                                        }}
                                      >
                                        <Trash2Icon size={16} className="text-red-500" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </main>
      </div>

      {/* ============ Modal création/édition badge ============ */}
      <Modal.Backdrop isOpen={showBadgeDialog} onOpenChange={setShowBadgeDialog}>
        <Modal.Container>
        <Modal.Dialog className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)] shadow-2xl">
          <Modal.Header>
            <Modal.Heading>
              {editingBadge ? 'Modifier le badge' : 'Créer un nouveau badge'}
            </Modal.Heading>
            <p className="text-sm text-[var(--muted)]">
              Les badges peuvent être attribués aux utilisateurs pour
              récompenser leurs actions.
            </p>
          </Modal.Header>

          <Modal.Body>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="badge-name" className="text-sm font-medium text-[var(--foreground)]">Nom du badge</label>
                <input
                  id="badge-name"
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  value={badgeForm.name}
                  onChange={(e) =>
                    setBadgeForm({ ...badgeForm, name: e.target.value })
                  }
                  placeholder="Développeur officiel"
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="badge-desc" className="text-sm font-medium text-[var(--foreground)]">Description</label>
                <textarea
                  id="badge-desc"
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
                  value={badgeForm.description}
                  onChange={(e) =>
                    setBadgeForm({ ...badgeForm, description: e.target.value })
                  }
                  placeholder="Développeur actif sur AlfyChat"
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-[var(--foreground)]">Type d&apos;icône</label>
                <select
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  value={badgeForm.iconType}
                  onChange={(e) =>
                    setBadgeForm({ ...badgeForm, iconType: e.target.value as 'bootstrap' | 'svg', iconValue: '' })
                  }
                >
                  <option value="bootstrap">Icône Bootstrap</option>
                  <option value="svg">Upload SVG</option>
                </select>
              </div>

              {badgeForm.iconType === 'bootstrap' ? (
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-[var(--foreground)]">Icône Bootstrap</label>
                  <input
                    className="mb-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    placeholder="Rechercher une icône..."
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                  />
                  <div className="h-64 overflow-y-auto rounded-md border border-[var(--border)] p-2">
                    <div className="grid grid-cols-6 gap-2">
                      {filteredIcons.map((icon) => (
                        <button
                          key={icon.value}
                          type="button"
                          className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 p-3 transition-all ${
                            badgeForm.iconValue === icon.value
                              ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-sm'
                              : 'border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--surface-secondary)]'
                          }`}
                          onClick={() =>
                            setBadgeForm({ ...badgeForm, iconValue: icon.value })
                          }
                        >
                          <i
                            className={`bi ${icon.value} text-2xl`}
                            style={{ color: badgeForm.color }}
                          />
                          <span className="text-[10px] leading-tight text-center text-[var(--muted)]">
                            {icon.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {badgeForm.iconValue && (
                    <p className="text-xs text-[var(--muted)]">
                      Sélectionné :{' '}
                      <code className="rounded bg-[var(--surface-secondary)] px-1">
                        {badgeForm.iconValue}
                      </code>
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-[var(--foreground)]">SVG personnalisé</label>
                  <input
                    type="file"
                    accept=".svg"
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setBadgeForm({
                            ...badgeForm,
                            iconValue: reader.result as string,
                          });
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                  {badgeForm.iconValue && (
                    <div className="rounded-lg border border-[var(--border)] p-4 text-center">
                      <div
                        dangerouslySetInnerHTML={{ __html: sanitizeSvg(badgeForm.iconValue) }}
                        className="inline-block h-12 w-12"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="badge-color" className="text-sm font-medium text-[var(--foreground)]">Couleur</label>
                  <div className="flex gap-2">
                    <input
                      id="badge-color"
                      type="color"
                      value={badgeForm.color}
                      onChange={(e) =>
                        setBadgeForm({ ...badgeForm, color: e.target.value })
                      }
                      className="h-10 w-20 cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)]"
                    />
                    <input
                      className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      value={badgeForm.color}
                      onChange={(e) =>
                        setBadgeForm({ ...badgeForm, color: e.target.value })
                      }
                      placeholder="#5865F2"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label htmlFor="badge-order" className="text-sm font-medium text-[var(--foreground)]">Ordre d&apos;affichage</label>
                  <input
                    id="badge-order"
                    type="number"
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    value={badgeForm.displayOrder}
                    onChange={(e) =>
                      setBadgeForm({
                        ...badgeForm,
                        displayOrder: parseInt(e.target.value) || 999,
                      })
                    }
                  />
                </div>
              </div>

              {/* Aperçu */}
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[var(--foreground)]">Aperçu</label>
                <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-4">
                  <div
                    className="flex size-12 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: badgeForm.color + '20',
                      border: `2px solid ${badgeForm.color}40`,
                    }}
                  >
                    {renderBadgeIcon(
                      badgeForm.iconType,
                      badgeForm.iconValue,
                      badgeForm.color,
                      'text-2xl'
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">
                      {badgeForm.name || 'Nom du badge'}
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {badgeForm.description || 'Description du badge'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="outline"
              slot="close"
            >
              Annuler
            </Button>
            <Button
              onPress={editingBadge ? handleUpdateBadge : handleCreateBadge}
              isDisabled={!badgeForm.name || !badgeForm.iconValue}
            >
              {editingBadge ? 'Mettre à jour' : 'Créer'}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* ============ Modal attribution de badges ============ */}
      <Modal.Backdrop isOpen={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <Modal.Container>
        <Modal.Dialog className="max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)] shadow-2xl">
          <Modal.Header>
            <Modal.Heading className="flex items-center gap-2">
              <AwardIcon size={20} />
              Badges de {selectedUser?.displayName}
            </Modal.Heading>
            <p className="text-sm text-[var(--muted)]">
              @{selectedUser?.username} — Ajoutez ou retirez des badges.
            </p>
          </Modal.Header>

          <Modal.Body>
            <div className="space-y-4 py-4">
              {/* Badges actuels */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Badges attribués</label>
                {userBadges.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[var(--border)] p-4 text-center text-sm text-[var(--muted)]">
                    Aucun badge attribué
                  </p>
                ) : (
                  <div className="space-y-2">
                    {userBadges.map((b: any) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex size-8 items-center justify-center rounded"
                            style={{
                              backgroundColor: (b.color || '#5865F2') + '20',
                              border: `1px solid ${b.color || '#5865F2'}40`,
                            }}
                          >
                            {renderBadgeIcon(
                              b.iconType || 'bootstrap',
                              b.iconValue || b.icon,
                              b.color || '#5865F2',
                              'text-sm'
                            )}
                          </div>
                          <span className="text-sm font-medium text-[var(--foreground)]">{b.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          isIconOnly
                          onPress={() => handleRemoveBadge(b.id)}
                          className="text-red-500 hover:text-red-500"
                        >
                          <XIcon size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Badges disponibles */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Ajouter un badge</label>
                <div className="space-y-2">
                  {badges
                    .filter(
                      (b) => b.isActive !== false && !isUserHasBadge(b.id)
                    )
                    .map((badge) => (
                      <div
                        key={badge.id}
                        className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-secondary)]"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex size-8 items-center justify-center rounded"
                            style={{
                              backgroundColor: badge.color + '20',
                              border: `1px solid ${badge.color}40`,
                            }}
                          >
                            {renderBadgeIcon(
                              badge.iconType,
                              badge.iconValue,
                              badge.color,
                              'text-sm'
                            )}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-[var(--foreground)]">
                              {badge.name}
                            </span>
                            {badge.description && (
                              <p className="text-xs text-[var(--muted)]">
                                {badge.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onPress={() => handleAssignBadge(badge.id)}
                        >
                          <UserPlusIcon size={12} className="mr-1" />
                          Ajouter
                        </Button>
                      </div>
                    ))}
                  {badges.filter(
                    (b) => b.isActive !== false && !isUserHasBadge(b.id)
                  ).length === 0 && (
                    <p className="rounded-lg border border-dashed border-[var(--border)] p-4 text-center text-sm text-[var(--muted)]">
                      {badges.length === 0
                        ? "Aucun badge créé. Créez-en d'abord dans l'onglet Badges."
                        : 'Tous les badges sont déjà attribués.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button slot="close">Fermer</Button>
          </Modal.Footer>
        </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
