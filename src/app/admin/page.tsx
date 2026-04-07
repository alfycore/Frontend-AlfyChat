'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
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
} from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { Button, Card, Modal, Switch } from '@heroui/react';

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

type Tab = 'overview' | 'badges' | 'users' | 'discovery' | 'server-badges' | 'settings';

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

  // Settings
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [inviteLinks, setInviteLinks] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteExpiry, setInviteExpiry] = useState('48');
  const [inviteCreating, setInviteCreating] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

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
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    }
    setLoading(false);
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
          dangerouslySetInnerHTML={{ __html: iconValue }}
          className="inline-block h-5 w-5"
        />
      );
    }
    return <i className={`bi bi-question-circle ${size} text-[var(--muted)]`} />;
  };

  // ============ Guard ============
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-96 border border-[var(--border)] bg-[var(--surface)] p-0">
          <div className="px-5 py-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
              <HugeiconsIcon icon={ShieldIcon} size={20} className="text-red-500" />
              Accès refusé
            </h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Cette page est réservée aux administrateurs.
            </p>
          </div>
          <div className="px-5 pb-4">
            <Button
              onPress={() => router.push('/channels/me')}
              className="w-full"
            >
              Retour à l&apos;accueil
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)]/40 bg-[var(--surface)]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HugeiconsIcon icon={ShieldIcon} size={32} className="text-[var(--accent)]" />
              <div>
                <h1 className="text-2xl font-bold text-[var(--foreground)]">
                  Panneau d&apos;administration
                </h1>
                <p className="text-sm text-[var(--muted)]">
                  Gestion AlfyChat
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onPress={() => router.push('/channels/me')}
            >
              Retour à l&apos;app
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-[var(--border)]/40 bg-[var(--surface)]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav className="flex gap-6">
            {(
              [
                { id: 'overview', label: "Vue d'ensemble", icon: BarChart3Icon },
                { id: 'badges', label: 'Badges', icon: AwardIcon },
                { id: 'users', label: 'Utilisateurs', icon: UsersIcon },
                { id: 'discovery', label: 'Découverte', icon: CompassIcon },
                { id: 'server-badges', label: 'Badges serveurs', icon: ServerIcon },
                { id: 'settings', label: 'Paramètres', icon: SettingsIcon },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                <HugeiconsIcon icon={tab.icon} size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
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
                    <HugeiconsIcon icon={PlusIcon} size={16} className="mr-2" />
                    Créer un badge
                  </Button>
                </div>

                {badges.length === 0 ? (
                  <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                    <div className="p-8 text-center">
                      <HugeiconsIcon icon={AwardIcon} size={48} className="mx-auto mb-4 text-[var(--muted)]" />
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
                                    <HugeiconsIcon icon={Edit2Icon} size={16} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    isIconOnly
                                    onPress={() => handleDeleteBadge(badge.id)}
                                  >
                                    <HugeiconsIcon icon={Trash2Icon} size={16} className="text-red-500" />
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
                        {s === 'pending' && <HugeiconsIcon icon={ClockIcon} size={12} className="mr-1" />}
                        {s === 'approved' && <HugeiconsIcon icon={CheckCircle2Icon} size={12} className="mr-1" />}
                        {s === 'rejected' && <HugeiconsIcon icon={XCircleIcon} size={12} className="mr-1" />}
                        {s === 'pending' ? 'En attente' : s === 'approved' ? 'Approuvées' : 'Rejetées'}
                      </Button>
                    ))}
                  </div>
                </div>

                {applications.length === 0 ? (
                  <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                    <div className="p-8 text-center">
                      <HugeiconsIcon icon={CompassIcon} size={48} className="mx-auto mb-4 text-[var(--muted)]" />
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
                                <HugeiconsIcon icon={CheckCircle2Icon} size={12} className="mr-1" />
                                Approuver
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onPress={() => handleReviewApplication(app.id, 'rejected')}
                              >
                                <HugeiconsIcon icon={XCircleIcon} size={12} className="mr-1" />
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
                      <HugeiconsIcon icon={ServerIcon} size={48} className="mx-auto mb-4 text-[var(--muted)]" />
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
                          {discoverServers.map((server) => {
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
                                        <HugeiconsIcon icon={CheckCircle2Icon} size={14} className="text-blue-500" />
                                      )}
                                      {(server.is_partnered || server.isPartnered) && (
                                        <HugeiconsIcon icon={HandshakeIcon} size={14} className="text-purple-500" />
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
              </div>
            )}

            {/* Utilisateurs */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <HugeiconsIcon icon={SearchIcon} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
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
                                <HugeiconsIcon icon={AwardIcon} size={16} />
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

            {/* Paramètres */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-[var(--foreground)]">Paramètres du site</h2>

                {/* Inscriptions */}
                <Card className="border border-[var(--border)] bg-[var(--surface)] p-0">
                  <div className="px-5 py-4">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
                      <HugeiconsIcon icon={UsersIcon} size={20} />
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
                      <HugeiconsIcon icon={ShieldCheckIcon} size={20} />
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
                      <HugeiconsIcon icon={Link2Icon} size={20} />
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
                          <HugeiconsIcon icon={MailIcon} size={16} className="text-[var(--muted)]" />
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
                        <HugeiconsIcon icon={PlusIcon} size={16} className="mr-1" />
                        Générer
                      </Button>
                    </div>

                    {/* Liste des liens */}
                    {inviteLinks.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-[var(--border)] p-8 text-center">
                        <HugeiconsIcon icon={Link2Icon} size={40} className="mx-auto mb-3 text-[var(--muted)]" />
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
                                            <HugeiconsIcon icon={CheckCircle2Icon} size={16} className="text-green-500" />
                                          ) : (
                                            <HugeiconsIcon icon={CopyIcon} size={16} />
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
                                        <HugeiconsIcon icon={Trash2Icon} size={16} className="text-red-500" />
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
                        dangerouslySetInnerHTML={{ __html: badgeForm.iconValue }}
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
              <HugeiconsIcon icon={AwardIcon} size={20} />
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
                          <HugeiconsIcon icon={XIcon} size={16} />
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
                          <HugeiconsIcon icon={UserPlusIcon} size={12} className="mr-1" />
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
