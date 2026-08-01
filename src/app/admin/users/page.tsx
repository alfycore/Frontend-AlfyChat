'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Chip, Input, Label, ListBox, Modal, SearchField, Select, Separator,
} from '@heroui/react';
import {
  Award, Ban, Gavel, Plus, RotateCcw, ShieldCheck, Users, VolumeX, X,
} from 'lucide-react';

import { api, type AdminRole, type ModerationStatus, type Sanction } from '@/lib/api';
import {
  DateText, EmptyState, InitialAvatar, PageHeader, SectionCard, StatusDot,
  TableShell, TableSkeleton, Td, Th, Tr,
} from '@/components/alfy/admin/primitives';
import { SANCTION_META, SanctionDialog, type SanctionTarget } from '@/components/alfy/admin/sanction-dialog';
import { renderBadgeIcon } from '@/components/alfy/admin/badge-icon';

interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: AdminRole;
  badges: BadgeSnapshot[];
  isOnline: boolean;
  createdAt: string;
}

interface BadgeSnapshot {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  iconType?: string;
  iconValue?: string;
  color?: string;
  isActive?: boolean;
}

const ROLES: { key: AdminRole; label: string; color: 'accent' | 'danger' | 'success' | 'warning' | 'default' }[] = [
  { key: 'user',       label: 'Utilisateur', color: 'default' },
  { key: 'moderator',  label: 'Modérateur',  color: 'accent' },
  { key: 'support_l1', label: 'Support N1',  color: 'success' },
  { key: 'support_l2', label: 'Support N2',  color: 'success' },
  { key: 'technician', label: 'Technicien',  color: 'warning' },
  { key: 'admin',      label: 'Admin',       color: 'danger' },
];

const ROLE_BY_KEY = Object.fromEntries(ROLES.map((r) => [r.key, r]));

export default function AdminUsersPage() {
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [badges, setBadges]   = useState<BadgeSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [error, setError]     = useState<string | null>(null);

  // Dossier de modération ouvert
  const [fileUser, setFileUser]     = useState<AdminUser | null>(null);
  const [fileStatus, setFileStatus] = useState<ModerationStatus | null>(null);
  const [fileHistory, setFileHistory] = useState<Sanction[]>([]);
  const [fileLoading, setFileLoading] = useState(false);

  // Dialogues
  const [sanctionTarget, setSanctionTarget] = useState<SanctionTarget | null>(null);
  const [badgeUser, setBadgeUser] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [usersRes, badgesRes] = await Promise.all([
      api.getAdminUsers(200, 0),
      api.getAdminBadges(),
    ]);

    if (usersRes.success && usersRes.data) setUsers(usersRes.data as AdminUser[]);
    else setError(usersRes.error ?? 'Impossible de charger les comptes.');

    if (badgesRes.success && badgesRes.data) setBadges(badgesRes.data as BadgeSnapshot[]);

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // La recherche passe par l'API — la liste peut dépasser la page chargée
  const runSearch = async (q: string) => {
    setSearch(q);
    if (!q.trim()) { load(); return; }
    const res = await api.searchAdminUsers(q);
    if (res.success && res.data) setUsers(res.data as AdminUser[]);
  };

  const changeRole = async (user: AdminUser, role: AdminRole) => {
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)));
    const res = await api.updateUserRole(user.id, role);
    if (!res.success) {
      setError(res.error ?? 'Le rôle n’a pas pu être modifié.');
      load();
    }
  };

  const openFile = async (user: AdminUser) => {
    setFileUser(user);
    setFileLoading(true);
    setFileStatus(null);
    setFileHistory([]);

    const res = await api.getUserModeration(user.id);
    if (res.success && res.data) {
      setFileStatus(res.data.status);
      setFileHistory(res.data.history);
    }
    setFileLoading(false);
  };

  const refreshFile = async () => {
    if (fileUser) await openFile(fileUser);
  };

  const lift = async (kind: 'ban' | 'mute') => {
    if (!fileUser) return;
    const res = kind === 'ban'
      ? await api.unbanUser(fileUser.id)
      : await api.unmuteUser(fileUser.id);
    if (res.success) refreshFile();
  };

  const toggleBadge = async (user: AdminUser, badge: BadgeSnapshot, has: boolean) => {
    const res = has
      ? await api.removeBadgeFromUser(user.id, badge.id)
      : await api.assignBadgeToUser(user.id, badge.id);
    if (!res.success) return;

    const next = has
      ? user.badges.filter((b) => b.id !== badge.id)
      : [...user.badges, badge];

    setBadgeUser({ ...user, badges: next });
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, badges: next } : u)));
  };

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description="Rôles, badges et dossier de modération de chaque compte."
      >
        <Button size="sm" variant="secondary" onPress={load} isPending={loading}>
          <RotateCcw className="size-3.5" aria-hidden />
          Actualiser
        </Button>
      </PageHeader>

      {error && (
        <Alert status="danger" className="mb-5">
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <SectionCard
        flush
        title="Comptes"
        description={`${users.length} résultat${users.length > 1 ? 's' : ''}`}
        actions={
          <SearchField
            aria-label="Rechercher un compte"
            value={search}
            onChange={runSearch}
            className="w-full sm:w-72"
          >
            <Input placeholder="Nom, pseudo ou adresse e-mail…" />
          </SearchField>
        }
      >
        {loading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun compte trouvé"
            description={search ? 'Aucun compte ne correspond à cette recherche.' : undefined}
          />
        ) : (
          <TableShell
            minWidth={900}
            head={
              <>
                <Th>Compte</Th>
                <Th>Badges</Th>
                <Th>Présence</Th>
                <Th>Rôle</Th>
                <Th>Inscrit</Th>
                <Th align="right">Actions</Th>
              </>
            }
          >
            {users.map((u) => (
              <Tr key={u.id}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <InitialAvatar name={u.displayName || u.username} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{u.displayName}</p>
                      <p className="truncate text-xs text-muted">
                        @{u.username} · {u.email}
                      </p>
                    </div>
                  </div>
                </Td>

                <Td>
                  <div className="flex items-center gap-1">
                    {(u.badges ?? []).slice(0, 4).map((b, i) => (
                      <span
                        key={b.id ?? i}
                        className="flex size-5 items-center justify-center rounded"
                        style={{ backgroundColor: `${b.color ?? '#8b5cf6'}22` }}
                      >
                        {renderBadgeIcon(
                          b.iconType ?? 'bootstrap',
                          b.iconValue ?? b.icon ?? '',
                          b.color ?? '#8b5cf6',
                          'text-[10px]',
                        )}
                      </span>
                    ))}
                    {(u.badges?.length ?? 0) > 4 && (
                      <span className="text-xs text-muted">+{u.badges.length - 4}</span>
                    )}
                    {(u.badges?.length ?? 0) === 0 && (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </div>
                </Td>

                <Td>
                  <StatusDot
                    tone={u.isOnline ? 'success' : 'muted'}
                    label={u.isOnline ? 'En ligne' : 'Hors ligne'}
                    pulse={u.isOnline}
                  />
                </Td>

                <Td>
                  <Select
                    aria-label={`Rôle de ${u.displayName}`}
                    selectedKey={u.role ?? 'user'}
                    onSelectionChange={(k) => changeRole(u, k as AdminRole)}
                    className="w-36"
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {ROLES.map((r) => (
                          <ListBox.Item key={r.key} id={r.key} textValue={r.label}>
                            <Label>{r.label}</Label>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </Td>

                <Td><DateText value={u.createdAt} /></Td>

                <Td align="right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      isIconOnly
                      aria-label={`Badges de ${u.displayName}`}
                      onPress={() => setBadgeUser(u)}
                    >
                      <Award className="size-4" aria-hidden />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      isIconOnly
                      aria-label={`Dossier de modération de ${u.displayName}`}
                      onPress={() => openFile(u)}
                    >
                      <Gavel className="size-4" aria-hidden />
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </TableShell>
        )}
      </SectionCard>

      {/* ── Dossier de modération ── */}
      <Modal.Backdrop isOpen={fileUser !== null} onOpenChange={(o) => !o && setFileUser(null)}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[560px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-accent/12 text-accent">
                <Gavel className="size-5" aria-hidden />
              </Modal.Icon>
              <Modal.Heading>Dossier de modération</Modal.Heading>
            </Modal.Header>

            <Modal.Body className="space-y-4">
              {fileUser && (
                <div className="flex items-center gap-3">
                  <InitialAvatar name={fileUser.displayName || fileUser.username} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{fileUser.displayName}</p>
                    <p className="truncate text-xs text-muted">@{fileUser.username}</p>
                  </div>
                  <Chip
                    size="sm"
                    variant="soft"
                    color={ROLE_BY_KEY[fileUser.role ?? 'user']?.color ?? 'default'}
                    className="ml-auto"
                  >
                    <Chip.Label>{ROLE_BY_KEY[fileUser.role ?? 'user']?.label}</Chip.Label>
                  </Chip>
                </div>
              )}

              {/* Statut courant */}
              {fileLoading ? (
                <p className="py-6 text-center text-sm text-muted">Chargement du dossier…</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {fileStatus?.banned && (
                      <Alert status="danger">
                        <Alert.Content>
                          <Alert.Title>
                            Compte banni
                            {fileStatus.bannedUntil
                              ? ` jusqu'au ${new Date(fileStatus.bannedUntil).toLocaleString('fr-FR')}`
                              : ' définitivement'}
                          </Alert.Title>
                          <Alert.Description>
                            Motif : {fileStatus.banReason ?? 'non précisé'}
                          </Alert.Description>
                        </Alert.Content>
                      </Alert>
                    )}
                    {fileStatus?.muted && (
                      <Alert status="warning">
                        <Alert.Content>
                          <Alert.Title>
                            Réduit au silence
                            {fileStatus.mutedUntil
                              ? ` jusqu'au ${new Date(fileStatus.mutedUntil).toLocaleString('fr-FR')}`
                              : ' de façon permanente'}
                          </Alert.Title>
                          <Alert.Description>
                            Motif : {fileStatus.muteReason ?? 'non précisé'}
                          </Alert.Description>
                        </Alert.Content>
                      </Alert>
                    )}
                    {fileStatus && !fileStatus.banned && !fileStatus.muted && (
                      <Alert status="success">
                        <Alert.Content>
                          <Alert.Description>
                            Aucune sanction en vigueur
                            {fileStatus.warnings > 0
                              ? ` — ${fileStatus.warnings} avertissement${fileStatus.warnings > 1 ? 's' : ''} au dossier.`
                              : '.'}
                          </Alert.Description>
                        </Alert.Content>
                      </Alert>
                    )}
                  </div>

                  {/* Actions de levée */}
                  {(fileStatus?.banned || fileStatus?.muted) && (
                    <div className="flex flex-wrap gap-2">
                      {fileStatus.banned && (
                        <Button size="sm" variant="secondary" onPress={() => lift('ban')}>
                          <ShieldCheck className="size-3.5" aria-hidden />
                          Débannir
                        </Button>
                      )}
                      {fileStatus.muted && (
                        <Button size="sm" variant="secondary" onPress={() => lift('mute')}>
                          <VolumeX className="size-3.5" aria-hidden />
                          Rendre la parole
                        </Button>
                      )}
                    </div>
                  )}

                  <Separator />

                  {/* Historique */}
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted">
                      Historique ({fileHistory.length})
                    </p>
                    {fileHistory.length === 0 ? (
                      <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted">
                        Aucune sanction enregistrée pour ce compte.
                      </p>
                    ) : (
                      <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                        {fileHistory.map((s) => {
                          const Icon = SANCTION_META[s.type].icon;
                          return (
                            <li
                              key={s.id}
                              className="flex items-start gap-2.5 rounded-md border border-border px-3 py-2"
                            >
                              <Icon
                                className={`mt-0.5 size-3.5 shrink-0 ${s.active ? 'text-danger' : 'text-muted'}`}
                                aria-hidden
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium">
                                  {SANCTION_META[s.type].label}
                                  {s.revoked && ' · levée'}
                                </p>
                                <p className="truncate text-xs text-muted" title={s.reason}>
                                  {s.reason}
                                </p>
                              </div>
                              <DateText value={s.createdAt} />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </Modal.Body>

            <Modal.Footer>
              <Button slot="close" variant="tertiary">Fermer</Button>
              <Button
                variant="danger"
                onPress={() => {
                  if (!fileUser) return;
                  setSanctionTarget({
                    id: fileUser.id,
                    username: fileUser.username,
                    displayName: fileUser.displayName,
                  });
                }}
              >
                <Ban className="size-3.5" aria-hidden />
                Sanctionner
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* ── Badges d'un compte ── */}
      <Modal.Backdrop isOpen={badgeUser !== null} onOpenChange={(o) => !o && setBadgeUser(null)}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[440px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-accent/12 text-accent">
                <Award className="size-5" aria-hidden />
              </Modal.Icon>
              <Modal.Heading>Badges de {badgeUser?.displayName}</Modal.Heading>
            </Modal.Header>

            <Modal.Body>
              {badges.filter((b) => b.isActive !== false).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">
                  Aucun badge n’a encore été créé.
                </p>
              ) : (
                <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
                  {badges
                    .filter((b) => b.isActive !== false)
                    .map((badge) => {
                      const has = !!badgeUser?.badges?.some((b) => b.id === badge.id);
                      return (
                        <li
                          key={badge.id}
                          className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5"
                        >
                          <span
                            className="flex size-8 shrink-0 items-center justify-center rounded-md"
                            style={{ backgroundColor: `${badge.color ?? '#8b5cf6'}22` }}
                          >
                            {renderBadgeIcon(
                              badge.iconType ?? 'bootstrap',
                              badge.iconValue ?? '',
                              badge.color ?? '#8b5cf6',
                              'text-sm',
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{badge.name}</p>
                            {badge.description && (
                              <p className="truncate text-xs text-muted">{badge.description}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant={has ? 'ghost' : 'secondary'}
                            onPress={() => badgeUser && toggleBadge(badgeUser, badge, has)}
                            className={has ? 'text-danger hover:bg-danger/10' : undefined}
                          >
                            {has ? <X className="size-3.5" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
                            {has ? 'Retirer' : 'Ajouter'}
                          </Button>
                        </li>
                      );
                    })}
                </ul>
              )}
            </Modal.Body>

            <Modal.Footer>
              <Button slot="close" variant="tertiary">Fermer</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <SanctionDialog
        isOpen={sanctionTarget !== null}
        onOpenChange={(o) => !o && setSanctionTarget(null)}
        target={sanctionTarget}
        onApplied={() => { setSanctionTarget(null); refreshFile(); }}
      />
    </>
  );
}
