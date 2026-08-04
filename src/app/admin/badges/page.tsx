'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Chip, Input, Label, ListBox, Modal, NumberField, Select,
  TextArea, TextField,
} from '@heroui/react';
import { Award, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';

import { api } from '@/lib/api';
import {
  EmptyState, PageHeader, SectionCard, TableShell, TableSkeleton, Td, Th, Toggle, Tr,
} from '@/components/alfy/admin/primitives';
import { renderBadgeIcon, getUiconsList } from '@/components/alfy/admin/badge-icon';
import { useTranslation } from '@/components/locale-provider';

type IconType = 'bootstrap' | 'svg' | 'flaticon';

interface Badge {
  id: string;
  name: string;
  description?: string;
  iconType: IconType;
  iconValue: string;
  color: string;
  displayOrder: number;
  isActive: boolean;
}

const ICON_TYPES: { key: IconType; label: string; hint: string }[] = [
  { key: 'bootstrap', label: 'Uicons',   hint: 'Jeu intégré, choix guidé' },
  { key: 'flaticon',  label: 'Flaticon', hint: 'Classe CSS complète' },
  { key: 'svg',       label: 'SVG',      hint: 'Balisage assaini avant affichage' },
];

const EMPTY_FORM = {
  name: '',
  description: '',
  iconType: 'bootstrap' as IconType,
  iconValue: 'star',
  color: '#8b5cf6',
  displayOrder: 999,
};

export default function AdminBadgesPage() {
  const { t } = useTranslation();
  const UICONS_LIST = getUiconsList(t);
  const [badges, setBadges]   = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Badge | null>(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [iconSearch, setIconSearch] = useState('');
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.getAdminBadges();
    if (res.success && res.data) setBadges(res.data as Badge[]);
    else setError(res.error ?? 'Impossible de charger les badges.');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setIconSearch('');
    setDialogOpen(true);
  };

  const openEdit = (badge: Badge) => {
    setEditing(badge);
    setForm({
      name: badge.name,
      description: badge.description ?? '',
      iconType: badge.iconType,
      iconValue: badge.iconValue,
      color: badge.color,
      displayOrder: badge.displayOrder,
    });
    setIconSearch('');
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.iconValue.trim()) {
      setError('Le nom et l’icône sont obligatoires.');
      return;
    }
    setSaving(true);
    const res = editing
      ? await api.updateBadge(editing.id, form)
      : await api.createBadge(form);
    setSaving(false);

    if (!res.success) {
      setError(res.error ?? 'Le badge n’a pas pu être enregistré.');
      return;
    }
    setDialogOpen(false);
    load();
  };

  const remove = async (badge: Badge) => {
    const res = await api.deleteBadge(badge.id);
    if (res.success) load();
  };

  const toggle = async (badge: Badge, isActive: boolean) => {
    setBadges((prev) => prev.map((b) => (b.id === badge.id ? { ...b, isActive } : b)));
    await api.toggleBadgeStatus(badge.id, isActive);
  };

  const visibleIcons = UICONS_LIST.filter(
    (i) =>
      i.label.toLowerCase().includes(iconSearch.toLowerCase()) ||
      i.value.toLowerCase().includes(iconSearch.toLowerCase()),
  );

  return (
    <>
      <PageHeader
        title="Badges"
        description="Distinctions attribuables aux comptes depuis la section Utilisateurs."
      >
        <Button size="sm" variant="secondary" onPress={load} isPending={loading}>
          <RotateCcw className="size-3.5" aria-hidden />
          Actualiser
        </Button>
        <Button size="sm" onPress={openCreate}>
          <Plus className="size-3.5" aria-hidden />
          Créer un badge
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
        title="Catalogue"
        description={`${badges.length} badge${badges.length > 1 ? 's' : ''}`}
      >
        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : badges.length === 0 ? (
          <EmptyState
            icon={Award}
            title="Aucun badge"
            description="Créez un premier badge pour distinguer des membres de la communauté."
            action={
              <Button size="sm" onPress={openCreate}>
                <Plus className="size-3.5" aria-hidden />
                Créer un badge
              </Button>
            }
          />
        ) : (
          <TableShell
            minWidth={720}
            head={
              <>
                <Th>Badge</Th>
                <Th>Source</Th>
                <Th>Ordre</Th>
                <Th>Actif</Th>
                <Th align="right">Actions</Th>
              </>
            }
          >
            {badges.map((b) => (
              <Tr key={b.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: `${b.color}22`,
                        border: `1px solid ${b.color}44`,
                      }}
                    >
                      {renderBadgeIcon(b.iconType, b.iconValue, b.color, 'text-lg')}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{b.name}</p>
                      {b.description && (
                        <p className="truncate text-xs text-muted">{b.description}</p>
                      )}
                    </div>
                  </div>
                </Td>
                <Td>
                  <Chip size="sm" variant="soft">
                    <Chip.Label>
                      {ICON_TYPES.find((t) => t.key === b.iconType)?.label ?? b.iconType}
                    </Chip.Label>
                  </Chip>
                </Td>
                <Td><span className="text-sm tabular-nums">{b.displayOrder}</span></Td>
                <Td>
                  <Toggle
                    isSelected={b.isActive}
                    onChange={(v) => toggle(b, v)}
                    label={`Activer ${b.name}`}
                  />
                </Td>
                <Td align="right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      isIconOnly
                      aria-label={`Modifier ${b.name}`}
                      onPress={() => openEdit(b)}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      isIconOnly
                      aria-label={`Supprimer ${b.name}`}
                      className="text-danger hover:bg-danger/10"
                      onPress={() => remove(b)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </TableShell>
        )}
      </SectionCard>

      {/* ── Formulaire ── */}
      <Modal.Backdrop isOpen={dialogOpen} onOpenChange={setDialogOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[520px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-accent/12 text-accent">
                <Award className="size-5" aria-hidden />
              </Modal.Icon>
              <Modal.Heading>
                {editing ? `Modifier « ${editing.name} »` : 'Créer un badge'}
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="space-y-4">
              {/* Aperçu en direct */}
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-secondary p-3">
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: `${form.color}22`,
                    border: `1px solid ${form.color}44`,
                  }}
                >
                  {renderBadgeIcon(form.iconType, form.iconValue, form.color, 'text-xl')}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {form.name || 'Nom du badge'}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {form.description || 'Aperçu en direct'}
                  </p>
                </div>
              </div>

              <TextField
                value={form.name}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                isRequired
              >
                <Label>Nom</Label>
                <Input placeholder="Bêta-testeur" />
              </TextField>

              <TextField
                value={form.description}
                onChange={(v) => setForm((f) => ({ ...f, description: v }))}
              >
                <Label>Description</Label>
                <TextArea rows={2} placeholder="A participé à la phase de test fermée" />
              </TextField>

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  selectedKey={form.iconType}
                  onSelectionChange={(k) =>
                    setForm((f) => ({ ...f, iconType: k as IconType, iconValue: '' }))
                  }
                >
                  <Label>Source de l’icône</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {ICON_TYPES.map((t) => (
                        <ListBox.Item key={t.key} id={t.key} textValue={t.label}>
                          <Label>{t.label}</Label>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm">Couleur</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                      aria-label="Couleur du badge"
                      className="size-9 shrink-0 cursor-pointer rounded-md border border-border bg-transparent"
                    />
                    <code className="text-xs text-muted">{form.color}</code>
                  </div>
                </div>
              </div>

              {/* Choix de l'icône selon la source */}
              {form.iconType === 'bootstrap' ? (
                <div>
                  <Label className="mb-1.5 block text-sm">Icône</Label>
                  <TextField value={iconSearch} onChange={setIconSearch} className="mb-2">
                    <Input placeholder="Filtrer les icônes…" />
                  </TextField>
                  <div className="grid max-h-44 grid-cols-6 gap-1.5 overflow-y-auto rounded-md border border-border p-2">
                    {visibleIcons.map((icon) => (
                      <button
                        key={icon.value}
                        type="button"
                        aria-label={icon.label}
                        aria-pressed={form.iconValue === icon.value}
                        onClick={() => setForm((f) => ({ ...f, iconValue: icon.value }))}
                        className={
                          'flex aspect-square items-center justify-center rounded-md border transition-colors ' +
                          (form.iconValue === icon.value
                            ? 'border-accent bg-accent/10'
                            : 'border-transparent hover:bg-surface-secondary')
                        }
                      >
                        {renderBadgeIcon('bootstrap', icon.value, form.color, 'text-base')}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <TextField
                  value={form.iconValue}
                  onChange={(v) => setForm((f) => ({ ...f, iconValue: v }))}
                  isRequired
                >
                  <Label>{form.iconType === 'svg' ? 'Balisage SVG' : 'Classe CSS'}</Label>
                  {form.iconType === 'svg' ? (
                    <TextArea rows={3} placeholder="<svg viewBox='0 0 24 24'>…</svg>" />
                  ) : (
                    <Input placeholder="fi fi-rr-star" />
                  )}
                </TextField>
              )}

              <NumberField
                value={form.displayOrder}
                onChange={(v) => setForm((f) => ({ ...f, displayOrder: v }))}
                minValue={0}
              >
                <Label>Ordre d’affichage</Label>
                <Input />
              </NumberField>
            </Modal.Body>

            <Modal.Footer>
              <Button slot="close" variant="tertiary" isDisabled={saving}>Annuler</Button>
              <Button onPress={save} isPending={saving}>
                {editing ? 'Enregistrer' : 'Créer'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
