'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Chip, Input, Label, ListBox, Modal, Select, TextArea, TextField,
} from '@heroui/react';
import { FileClock, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';

import { api } from '@/lib/api';
import {
  DateText, EmptyState, PageHeader, SectionCard, TableShell, TableSkeleton,
  Td, Th, Tr,
} from '@/components/alfy/admin/primitives';

type ChangelogType = 'feature' | 'fix' | 'improvement' | 'security' | 'breaking' | 'news';

interface Changelog {
  id: string;
  version?: string;
  title: string;
  content: string;
  type: ChangelogType;
  banner_url?: string | null;
  created_at: string;
  author_username?: string | null;
}

const TYPES: { key: ChangelogType; label: string; color: 'accent' | 'success' | 'warning' | 'danger' | 'default' }[] = [
  { key: 'feature',     label: 'Nouveauté',    color: 'accent' },
  { key: 'improvement', label: 'Amélioration', color: 'success' },
  { key: 'fix',         label: 'Correctif',    color: 'default' },
  { key: 'security',    label: 'Sécurité',     color: 'warning' },
  { key: 'breaking',    label: 'Rupture',      color: 'danger' },
  { key: 'news',        label: 'Annonce',      color: 'accent' },
];

const EMPTY_FORM = {
  version: '',
  title: '',
  content: '',
  type: 'feature' as ChangelogType,
  bannerUrl: '',
};

export default function AdminChangelogsPage() {
  const [items, setItems]     = useState<Changelog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Changelog | null>(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.getChangelogs(100, 0);
    if (res.success && res.data) setItems(res.data as Changelog[]);
    else setError(res.error ?? 'Impossible de charger les changelogs.');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (entry: Changelog) => {
    setEditing(entry);
    setForm({
      version: entry.version ?? '',
      title: entry.title,
      content: entry.content,
      type: entry.type,
      bannerUrl: entry.banner_url ?? '',
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError('Le titre et le contenu sont obligatoires.');
      return;
    }
    setSaving(true);

    const payload = {
      version: form.version.trim() || undefined,
      title: form.title.trim(),
      content: form.content.trim(),
      type: form.type,
      bannerUrl: form.bannerUrl.trim() || undefined,
    };

    const res = editing
      ? await api.updateChangelog(editing.id, payload)
      : await api.createChangelog(payload);
    setSaving(false);

    if (!res.success) {
      setError(res.error ?? 'Le changelog n’a pas pu être enregistré.');
      return;
    }
    setDialogOpen(false);
    load();
  };

  const remove = async (entry: Changelog) => {
    const res = await api.deleteChangelog(entry.id);
    if (res.success) load();
  };

  return (
    <>
      <PageHeader
        title="Changelogs"
        description="Notes de version publiées dans l’application et sur la page publique."
      >
        <Button size="sm" variant="secondary" onPress={load} isPending={loading}>
          <RotateCcw className="size-3.5" aria-hidden />
          Actualiser
        </Button>
        <Button size="sm" onPress={openCreate}>
          <Plus className="size-3.5" aria-hidden />
          Rédiger une note
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
        title="Notes publiées"
        description={`${items.length} note${items.length > 1 ? 's' : ''}`}
      >
        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={FileClock}
            title="Aucune note de version"
            description="Publiez une première note pour informer la communauté des évolutions."
            action={
              <Button size="sm" onPress={openCreate}>
                <Plus className="size-3.5" aria-hidden />
                Rédiger une note
              </Button>
            }
          />
        ) : (
          <TableShell
            minWidth={800}
            head={
              <>
                <Th>Note</Th>
                <Th>Type</Th>
                <Th>Version</Th>
                <Th>Auteur</Th>
                <Th>Publiée</Th>
                <Th align="right">Actions</Th>
              </>
            }
          >
            {items.map((entry) => {
              const type = TYPES.find((t) => t.key === entry.type);
              return (
                <Tr key={entry.id}>
                  <Td className="max-w-sm">
                    <p className="truncate text-sm font-medium">{entry.title}</p>
                    <p className="truncate text-xs text-muted">{entry.content}</p>
                  </Td>
                  <Td>
                    <Chip size="sm" variant="soft" color={type?.color ?? 'default'}>
                      <Chip.Label>{type?.label ?? entry.type}</Chip.Label>
                    </Chip>
                  </Td>
                  <Td>
                    <code className="text-xs text-muted">{entry.version || '—'}</code>
                  </Td>
                  <Td>
                    <span className="text-xs text-muted">
                      {entry.author_username ? `@${entry.author_username}` : '—'}
                    </span>
                  </Td>
                  <Td><DateText value={entry.created_at} /></Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        isIconOnly
                        aria-label={`Modifier ${entry.title}`}
                        onPress={() => openEdit(entry)}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        isIconOnly
                        aria-label={`Supprimer ${entry.title}`}
                        className="text-danger hover:bg-danger/10"
                        onPress={() => remove(entry)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </TableShell>
        )}
      </SectionCard>

      {/* ── Rédaction ── */}
      <Modal.Backdrop isOpen={dialogOpen} onOpenChange={setDialogOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[560px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-accent/12 text-accent">
                <FileClock className="size-5" aria-hidden />
              </Modal.Icon>
              <Modal.Heading>
                {editing ? 'Modifier la note' : 'Rédiger une note de version'}
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                <TextField
                  value={form.title}
                  onChange={(v) => setForm((f) => ({ ...f, title: v }))}
                  isRequired
                >
                  <Label>Titre</Label>
                  <Input placeholder="Appels de groupe en haute définition" />
                </TextField>

                <TextField
                  value={form.version}
                  onChange={(v) => setForm((f) => ({ ...f, version: v }))}
                >
                  <Label>Version</Label>
                  <Input placeholder="2.4.0" autoComplete="off" />
                </TextField>
              </div>

              <Select
                selectedKey={form.type}
                onSelectionChange={(k) => setForm((f) => ({ ...f, type: k as ChangelogType }))}
              >
                <Label>Type</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {TYPES.map((t) => (
                      <ListBox.Item key={t.key} id={t.key} textValue={t.label}>
                        <Label>{t.label}</Label>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

              <TextField
                value={form.content}
                onChange={(v) => setForm((f) => ({ ...f, content: v }))}
                isRequired
              >
                <Label>Contenu</Label>
                <TextArea rows={6} placeholder="Décrivez la nouveauté…" />
              </TextField>

              <TextField
                value={form.bannerUrl}
                onChange={(v) => setForm((f) => ({ ...f, bannerUrl: v }))}
              >
                <Label>Bannière</Label>
                <Input placeholder="https://…" autoComplete="off" />
              </TextField>
            </Modal.Body>

            <Modal.Footer>
              <Button slot="close" variant="tertiary" isDisabled={saving}>Annuler</Button>
              <Button onPress={save} isPending={saving}>
                {editing ? 'Enregistrer' : 'Publier'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
