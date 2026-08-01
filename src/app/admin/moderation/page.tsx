'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Chip, Input, Label, ListBox, Modal, SearchField, Select, Tabs,
  TextField, Tooltip,
} from '@heroui/react';
import {
  AlertTriangle, Ban, Filter, Gavel, Plus, RotateCcw, ShieldCheck, SpellCheck2,
  Trash2, VolumeX,
} from 'lucide-react';

import {
  api, type ModerationStats, type ModerationTerm, type Sanction,
  type SanctionType, type TermMatchType,
} from '@/lib/api';
import {
  DateText, EmptyState, InitialAvatar, PageHeader, RelativeExpiry, SectionCard,
  StatCard, TableShell, TableSkeleton, Td, Th, Tr,
} from '@/components/alfy/admin/primitives';
import { SANCTION_META, SanctionDialog, type SanctionTarget } from '@/components/alfy/admin/sanction-dialog';

// ── Filtres du journal ───────────────────────────────────────────────────────

const TYPE_FILTERS: { key: string; label: string }[] = [
  { key: 'all',  label: 'Tous les types' },
  { key: 'ban',  label: 'Bannissements' },
  { key: 'mute', label: 'Réductions au silence' },
  { key: 'kick', label: 'Déconnexions' },
  { key: 'warn', label: 'Avertissements' },
];

const MATCH_TYPES: { key: TermMatchType; label: string; hint: string }[] = [
  { key: 'word',      label: 'Mot entier',   hint: 'Bloque « con » sans bloquer « Connor »' },
  { key: 'substring', label: 'Fragment',     hint: 'Bloque dès que la suite apparaît, où que ce soit' },
  { key: 'exact',     label: 'Pseudo exact', hint: 'Bloque uniquement ce pseudo, à l’identique' },
];

/** Chip colorée correspondant au type de sanction. */
function SanctionChip({ type }: { type: SanctionType }) {
  const color = { ban: 'danger', mute: 'accent', kick: 'default', warn: 'warning' } as const;
  const Icon = SANCTION_META[type].icon;
  return (
    <Chip size="sm" variant="soft" color={color[type]}>
      <Chip.Label className="flex items-center gap-1.5">
        <Icon className="size-3 shrink-0" aria-hidden />
        {SANCTION_META[type].label}
      </Chip.Label>
    </Chip>
  );
}

export default function ModerationPage() {
  const [stats, setStats]       = useState<ModerationStats | null>(null);
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [terms, setTerms]       = useState<ModerationTerm[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // Filtres du journal
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeOnly, setActiveOnly] = useState(false);
  const [search, setSearch]         = useState('');

  // Dialogues
  const [sanctionTarget, setSanctionTarget] = useState<SanctionTarget | null>(null);
  const [termOpen, setTermOpen]   = useState(false);
  const [newTerm, setNewTerm]     = useState('');
  const [newMatch, setNewMatch]   = useState<TermMatchType>('word');
  const [termSaving, setTermSaving] = useState(false);
  const [termError, setTermError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [statsRes, sanctionsRes, termsRes] = await Promise.all([
      api.getModerationStats(),
      api.getModerationSanctions({
        ...(typeFilter !== 'all' && { type: typeFilter as SanctionType }),
        activeOnly,
        limit: 200,
      }),
      api.getModerationTerms(),
    ]);

    if (statsRes.success && statsRes.data) setStats(statsRes.data);
    if (sanctionsRes.success && sanctionsRes.data) setSanctions(sanctionsRes.data);
    if (termsRes.success && termsRes.data) setTerms(termsRes.data);

    if (!sanctionsRes.success) {
      setError(sanctionsRes.error ?? 'Impossible de charger le journal des sanctions.');
    }

    setLoading(false);
  }, [typeFilter, activeOnly]);

  useEffect(() => { load(); }, [load]);

  // La recherche filtre côté client — le journal tient en une page
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sanctions;
    return sanctions.filter(
      (s) =>
        s.username?.toLowerCase().includes(q) ||
        s.displayName?.toLowerCase().includes(q) ||
        s.reason.toLowerCase().includes(q) ||
        s.issuedByUsername?.toLowerCase().includes(q),
    );
  }, [sanctions, search]);

  const revoke = async (sanction: Sanction) => {
    const res = await api.revokeSanction(sanction.id);
    if (res.success) load();
    else setError(res.error ?? 'La sanction n’a pas pu être levée.');
  };

  const addTerm = async () => {
    if (newTerm.trim().length < 2) {
      setTermError('Le terme doit contenir au moins 2 caractères.');
      return;
    }
    setTermSaving(true);
    setTermError(null);

    const res = await api.addModerationTerm(newTerm.trim(), newMatch);
    setTermSaving(false);

    if (!res.success) {
      setTermError(res.error ?? 'Le terme n’a pas pu être ajouté.');
      return;
    }
    setTermOpen(false);
    setNewTerm('');
    setNewMatch('word');
    load();
  };

  const removeTerm = async (term: ModerationTerm) => {
    const res = await api.deleteModerationTerm(term.id);
    if (res.success) load();
  };

  return (
    <>
      <PageHeader
        title="Modération"
        description="Sanctions à l’échelle de la plateforme et filtre des pseudos à l’inscription."
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

      {/* ── Compteurs ── */}
      <div className="admin-stagger mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Bannissements actifs"
          value={stats?.activeBans ?? 0}
          icon={Ban}
          tone="danger"
          loading={loading && !stats}
        />
        <StatCard
          label="Comptes réduits au silence"
          value={stats?.activeMutes ?? 0}
          icon={VolumeX}
          tone="accent"
          loading={loading && !stats}
        />
        <StatCard
          label="Avertissements"
          value={stats?.warnings30d ?? 0}
          hint="Sur les 30 derniers jours"
          icon={AlertTriangle}
          tone="warning"
          loading={loading && !stats}
        />
        <StatCard
          label="Total des sanctions"
          value={stats?.totalSanctions ?? 0}
          hint="Depuis l’ouverture"
          icon={Gavel}
          loading={loading && !stats}
        />
      </div>

      <Tabs defaultSelectedKey="journal">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Sections de modération">
            <Tabs.Tab id="journal">
              <Gavel className="size-3.5" aria-hidden />
              Journal des sanctions
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="terms">
              <SpellCheck2 className="size-3.5" aria-hidden />
              Filtre des pseudos
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        {/* ── Journal ── */}
        <Tabs.Panel id="journal" className="pt-4">
          <SectionCard
            flush
            title="Sanctions"
            description={`${visible.length} entrée${visible.length > 1 ? 's' : ''}`}
            actions={
              <>
                <SearchField
                  aria-label="Rechercher une sanction"
                  value={search}
                  onChange={setSearch}
                  className="w-full sm:w-56"
                >
                  <Input placeholder="Pseudo, motif, modérateur…" />
                </SearchField>

                <Select
                  aria-label="Filtrer par type"
                  selectedKey={typeFilter}
                  onSelectionChange={(k) => setTypeFilter(String(k))}
                  className="w-44"
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {TYPE_FILTERS.map((f) => (
                        <ListBox.Item key={f.key} id={f.key} textValue={f.label}>
                          <Label>{f.label}</Label>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <Button
                  size="sm"
                  variant={activeOnly ? 'primary' : 'secondary'}
                  onPress={() => setActiveOnly((v) => !v)}
                >
                  <Filter className="size-3.5" aria-hidden />
                  En vigueur
                </Button>
              </>
            }
          >
            {loading ? (
              <TableSkeleton rows={6} cols={5} />
            ) : visible.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="Aucune sanction"
                description={
                  search || activeOnly || typeFilter !== 'all'
                    ? 'Aucune entrée ne correspond à ces filtres.'
                    : 'Le journal est vide — rien à signaler sur la plateforme.'
                }
              />
            ) : (
              <TableShell
                minWidth={880}
                head={
                  <>
                    <Th>Compte</Th>
                    <Th>Sanction</Th>
                    <Th>Motif</Th>
                    <Th>Échéance</Th>
                    <Th>Émise par</Th>
                    <Th>Date</Th>
                    <Th align="right">Action</Th>
                  </>
                }
              >
                {visible.map((s) => (
                  <Tr key={s.id} className={s.active ? undefined : 'opacity-55'}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <InitialAvatar name={s.displayName ?? s.username ?? '?'} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {s.displayName ?? s.username ?? 'Compte supprimé'}
                          </p>
                          {s.username && (
                            <p className="truncate text-xs text-muted">@{s.username}</p>
                          )}
                        </div>
                      </div>
                    </Td>
                    <Td><SanctionChip type={s.type} /></Td>
                    <Td className="max-w-[22rem]">
                      <p className="truncate text-sm" title={s.reason}>{s.reason}</p>
                      {s.revoked && (
                        <p className="mt-0.5 text-xs text-muted">
                          Levée{s.revokeReason ? ` — ${s.revokeReason}` : ''}
                        </p>
                      )}
                    </Td>
                    <Td>
                      {s.revoked ? (
                        <Chip size="sm" variant="soft"><Chip.Label>Levée</Chip.Label></Chip>
                      ) : s.type === 'warn' || s.type === 'kick' ? (
                        <span className="text-xs text-muted">Ponctuelle</span>
                      ) : (
                        <RelativeExpiry value={s.expiresAt} />
                      )}
                    </Td>
                    <Td>
                      <span className="text-xs text-muted">
                        {s.issuedByUsername ? `@${s.issuedByUsername}` : 'Système'}
                      </span>
                    </Td>
                    <Td><DateText value={s.createdAt} withTime /></Td>
                    <Td align="right">
                      {s.active && (s.type === 'ban' || s.type === 'mute') ? (
                        <Tooltip>
                          <Button size="sm" variant="ghost" onPress={() => revoke(s)}>
                            Lever
                          </Button>
                          <Tooltip.Content>
                            {s.type === 'ban' ? 'Débannir ce compte' : 'Rendre la parole'}
                          </Tooltip.Content>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </TableShell>
            )}
          </SectionCard>
        </Tabs.Panel>

        {/* ── Filtre des pseudos ── */}
        <Tabs.Panel id="terms" className="pt-4">
          <Alert status="accent" className="mb-4">
            <Alert.Content>
              <Alert.Title>Comment fonctionne le filtre</Alert.Title>
              <Alert.Description>
                Une liste intégrée bloque déjà les insultes courantes, les termes haineux et
                les pseudos usurpant l’identité du staff. Elle résout le leetspeak
                («&nbsp;n1gg3r&nbsp;»), les accents et les lettres répétées. Les termes
                ci-dessous s’y ajoutent, et s’appliquent à l’inscription, au changement de
                pseudo et au nom affiché.
              </Alert.Description>
            </Alert.Content>
          </Alert>

          <SectionCard
            flush
            title="Termes ajoutés par le staff"
            description={`${terms.length} terme${terms.length > 1 ? 's' : ''} personnalisé${terms.length > 1 ? 's' : ''}`}
            actions={
              <Button size="sm" onPress={() => { setNewTerm(''); setTermError(null); setTermOpen(true); }}>
                <Plus className="size-3.5" aria-hidden />
                Ajouter un terme
              </Button>
            }
          >
            {loading ? (
              <TableSkeleton rows={4} cols={3} />
            ) : terms.length === 0 ? (
              <EmptyState
                icon={SpellCheck2}
                title="Aucun terme personnalisé"
                description="La liste intégrée s’applique déjà. Ajoutez un terme pour couvrir un cas qu’elle laisse passer."
              />
            ) : (
              <TableShell
                minWidth={560}
                head={
                  <>
                    <Th>Terme</Th>
                    <Th>Correspondance</Th>
                    <Th>Ajouté le</Th>
                    <Th align="right">Action</Th>
                  </>
                }
              >
                {terms.map((t) => {
                  const match = MATCH_TYPES.find((m) => m.key === t.matchType);
                  return (
                    <Tr key={t.id}>
                      <Td>
                        <code className="rounded bg-surface-secondary px-1.5 py-0.5 font-mono text-xs">
                          {t.term}
                        </code>
                      </Td>
                      <Td>
                        <Chip size="sm" variant="soft">
                          <Chip.Label>{match?.label ?? t.matchType}</Chip.Label>
                        </Chip>
                      </Td>
                      <Td><DateText value={t.createdAt} /></Td>
                      <Td align="right">
                        <Button
                          size="sm"
                          variant="ghost"
                          isIconOnly
                          aria-label={`Retirer ${t.term}`}
                          className="text-danger hover:bg-danger/10"
                          onPress={() => removeTerm(t)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </Td>
                    </Tr>
                  );
                })}
              </TableShell>
            )}
          </SectionCard>
        </Tabs.Panel>
      </Tabs>

      {/* Dialogue d'ajout de terme */}
      <Modal.Backdrop isOpen={termOpen} onOpenChange={setTermOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[420px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-accent/12 text-accent">
                <SpellCheck2 className="size-5" aria-hidden />
              </Modal.Icon>
              <Modal.Heading>Ajouter un terme interdit</Modal.Heading>
            </Modal.Header>

            <Modal.Body className="space-y-4">
              <TextField value={newTerm} onChange={setNewTerm} isRequired>
                <Label>Terme</Label>
                <Input placeholder="terme à bloquer" autoComplete="off" />
              </TextField>

              <div>
                <p className="mb-2 text-xs font-medium text-muted">Mode de correspondance</p>
                <div className="space-y-1.5">
                  {MATCH_TYPES.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setNewMatch(m.key)}
                      aria-pressed={newMatch === m.key}
                      className={
                        'flex w-full flex-col items-start rounded-md border px-3 py-2 text-left transition-colors ' +
                        (newMatch === m.key
                          ? 'border-accent bg-accent/10'
                          : 'border-border hover:bg-surface-secondary')
                      }
                    >
                      <span className="text-sm font-medium">{m.label}</span>
                      <span className="text-xs text-muted">{m.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              {termError && (
                <Alert status="danger">
                  <Alert.Content>
                    <Alert.Description>{termError}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}
            </Modal.Body>

            <Modal.Footer>
              <Button slot="close" variant="tertiary" isDisabled={termSaving}>
                Annuler
              </Button>
              <Button onPress={addTerm} isPending={termSaving}>
                Ajouter
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Dialogue de sanction — ouvert depuis la page Utilisateurs, partagé ici */}
      <SanctionDialog
        isOpen={sanctionTarget !== null}
        onOpenChange={(open) => !open && setSanctionTarget(null)}
        target={sanctionTarget}
        onApplied={load}
      />
    </>
  );
}
