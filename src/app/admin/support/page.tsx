'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Button, Chip, Input, Label, ListBox, Modal, Select, Tabs, TextArea, TextField,
} from '@heroui/react';
import {
  BookOpen, FolderTree, Megaphone, Pencil, Plus, RotateCcw, Trash2, TriangleAlert,
} from 'lucide-react';

import { api } from '@/lib/api';
import {
  DateText, EmptyState, PageHeader, SectionCard, TableShell, TableSkeleton,
  Td, Th, toStringList, Tr,
} from '@/components/alfy/admin/primitives';

type Kind = 'categories' | 'articles' | 'announcements' | 'issues';

interface Category {
  id: string; slug: string; title: string; description: string | null;
  iconName: string; color: string; sortOrder: number; isActive: boolean;
  articleCount?: number;
}
interface Article {
  id: string; categoryId: string | null; categorySlug: string | null;
  slug: string; title: string; summary: string | null; content: string | null;
  tags: string[]; isPublished: boolean; isPinned: boolean;
  viewCount: number; sortOrder: number;
}
interface Announcement {
  id: string; type: 'incident' | 'maintenance' | 'news';
  title: string; summary: string | null; content: string | null;
  isResolved: boolean; isPublished: boolean; publishedAt: string;
}
interface KnownIssue {
  id: string; title: string; description: string | null;
  status: 'investigating' | 'in_progress' | 'resolved';
  categoryLabel: string | null; createdAt: string;
}

/** Chemin d'API par type de contenu — le CRUD est identique partout. */
const ENDPOINTS: Record<Kind, string> = {
  categories:    '/api/admin/support/categories',
  articles:      '/api/admin/support/articles',
  announcements: '/api/admin/support/announcements',
  issues:        '/api/admin/support/known-issues',
};

const ISSUE_STATUSES = [
  { key: 'investigating', label: 'Investigation' },
  { key: 'in_progress',   label: 'En cours' },
  { key: 'resolved',      label: 'Résolu' },
];

const ANNOUNCEMENT_TYPES = [
  { key: 'incident',    label: 'Incident' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'news',        label: 'Annonce' },
];

export default function AdminSupportPage() {
  const [categories, setCategories]       = useState<Category[]>([]);
  const [articles, setArticles]           = useState<Article[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [issues, setIssues]               = useState<KnownIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Un seul formulaire pilote les quatre types de contenu
  const [kind, setKind]       = useState<Kind>('categories');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm]       = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [cat, art, ann, iss] = await Promise.all([
      api.get(ENDPOINTS.categories),
      api.get(ENDPOINTS.articles),
      api.get(ENDPOINTS.announcements),
      api.get(ENDPOINTS.issues),
    ]);

    const unwrap = <T,>(res: { success: boolean; data?: unknown }, key: string): T[] => {
      if (!res.success || !res.data) return [];
      const d = res.data as T[] | Record<string, T[]>;
      return Array.isArray(d) ? d : ((d as Record<string, T[]>)[key] ?? []);
    };

    setCategories(unwrap<Category>(cat, 'categories'));
    setArticles(unwrap<Article>(art, 'articles'));
    setAnnouncements(unwrap<Announcement>(ann, 'announcements'));
    setIssues(unwrap<KnownIssue>(iss, 'issues'));

    if (!cat.success) setError(cat.error ?? 'Impossible de charger le centre d’aide.');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openForm = (k: Kind, initial: Record<string, string> = {}, id: string | null = null) => {
    setKind(k);
    setForm(initial);
    setEditingId(id);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title?.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }
    setSaving(true);

    const payload: Record<string, unknown> = { ...form };
    if (kind === 'articles' && 'tags' in form) {
      payload.tags = toStringList(form.tags);
    }

    const res = editingId
      ? await api.patch(`${ENDPOINTS[kind]}/${editingId}`, payload)
      : await api.post(ENDPOINTS[kind], payload);
    setSaving(false);

    if (!res.success) {
      setError(res.error ?? 'Le contenu n’a pas pu être enregistré.');
      return;
    }
    setDialogOpen(false);
    load();
  };

  const remove = async (k: Kind, id: string) => {
    const res = await api.delete(`${ENDPOINTS[k]}/${id}`);
    if (res.success) load();
  };

  return (
    <>
      <PageHeader
        title="Centre d’aide"
        description="Catégories, articles, annonces et incidents connus de la base de connaissances publique."
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

      <Tabs defaultSelectedKey="categories">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Contenus du centre d’aide">
            <Tabs.Tab id="categories">
              <FolderTree className="size-3.5" aria-hidden />
              Catégories
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="articles">
              <BookOpen className="size-3.5" aria-hidden />
              Articles
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="announcements">
              <Megaphone className="size-3.5" aria-hidden />
              Annonces
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="issues">
              <TriangleAlert className="size-3.5" aria-hidden />
              Incidents connus
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        {/* ── Catégories ── */}
        <Tabs.Panel id="categories" className="pt-4">
          <SectionCard
            flush
            title="Catégories"
            description={`${categories.length} catégorie${categories.length > 1 ? 's' : ''}`}
            actions={
              <Button size="sm" onPress={() => openForm('categories', { title: '', slug: '', description: '' })}>
                <Plus className="size-3.5" aria-hidden />
                Ajouter
              </Button>
            }
          >
            {loading ? <TableSkeleton rows={3} cols={3} /> : categories.length === 0 ? (
              <EmptyState icon={FolderTree} title="Aucune catégorie" />
            ) : (
              <TableShell
                minWidth={640}
                head={<><Th>Catégorie</Th><Th>Slug</Th><Th>Articles</Th><Th align="right">Actions</Th></>}
              >
                {categories.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      {c.description && (
                        <p className="truncate text-xs text-muted">{c.description}</p>
                      )}
                    </Td>
                    <Td><code className="text-xs text-muted">{c.slug}</code></Td>
                    <Td><span className="text-sm tabular-nums">{c.articleCount ?? 0}</span></Td>
                    <Td align="right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm" variant="ghost" isIconOnly
                          aria-label={`Modifier ${c.title}`}
                          onPress={() => openForm('categories', {
                            title: c.title, slug: c.slug, description: c.description ?? '',
                          }, c.id)}
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button
                          size="sm" variant="ghost" isIconOnly
                          aria-label={`Supprimer ${c.title}`}
                          className="text-danger hover:bg-danger/10"
                          onPress={() => remove('categories', c.id)}
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
        </Tabs.Panel>

        {/* ── Articles ── */}
        <Tabs.Panel id="articles" className="pt-4">
          <SectionCard
            flush
            title="Articles"
            description={`${articles.length} article${articles.length > 1 ? 's' : ''}`}
            actions={
              <Button size="sm" onPress={() => openForm('articles', { title: '', slug: '', summary: '', content: '', tags: '' })}>
                <Plus className="size-3.5" aria-hidden />
                Rédiger
              </Button>
            }
          >
            {loading ? <TableSkeleton rows={4} cols={4} /> : articles.length === 0 ? (
              <EmptyState icon={BookOpen} title="Aucun article" />
            ) : (
              <TableShell
                minWidth={760}
                head={<><Th>Article</Th><Th>Catégorie</Th><Th>Vues</Th><Th>État</Th><Th align="right">Actions</Th></>}
              >
                {articles.map((a) => (
                  <Tr key={a.id}>
                    <Td className="max-w-sm">
                      <p className="truncate text-sm font-medium">{a.title}</p>
                      {a.summary && <p className="truncate text-xs text-muted">{a.summary}</p>}
                    </Td>
                    <Td><span className="text-xs text-muted">{a.categorySlug ?? '—'}</span></Td>
                    <Td><span className="text-sm tabular-nums">{a.viewCount}</span></Td>
                    <Td>
                      <Chip size="sm" variant="soft" color={a.isPublished ? 'success' : 'default'}>
                        <Chip.Label>{a.isPublished ? 'Publié' : 'Brouillon'}</Chip.Label>
                      </Chip>
                    </Td>
                    <Td align="right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm" variant="ghost" isIconOnly
                          aria-label={`Modifier ${a.title}`}
                          onPress={() => openForm('articles', {
                            title: a.title, slug: a.slug, summary: a.summary ?? '',
                            content: a.content ?? '', tags: toStringList(a.tags).join(', '),
                          }, a.id)}
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button
                          size="sm" variant="ghost" isIconOnly
                          aria-label={`Supprimer ${a.title}`}
                          className="text-danger hover:bg-danger/10"
                          onPress={() => remove('articles', a.id)}
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
        </Tabs.Panel>

        {/* ── Annonces ── */}
        <Tabs.Panel id="announcements" className="pt-4">
          <SectionCard
            flush
            title="Annonces"
            description={`${announcements.length} annonce${announcements.length > 1 ? 's' : ''}`}
            actions={
              <Button size="sm" onPress={() => openForm('announcements', { title: '', type: 'news', summary: '', content: '' })}>
                <Plus className="size-3.5" aria-hidden />
                Publier
              </Button>
            }
          >
            {loading ? <TableSkeleton rows={3} cols={3} /> : announcements.length === 0 ? (
              <EmptyState icon={Megaphone} title="Aucune annonce" />
            ) : (
              <TableShell
                minWidth={680}
                head={<><Th>Annonce</Th><Th>Type</Th><Th>État</Th><Th>Publiée</Th><Th align="right">Actions</Th></>}
              >
                {announcements.map((a) => (
                  <Tr key={a.id}>
                    <Td className="max-w-sm">
                      <p className="truncate text-sm font-medium">{a.title}</p>
                      {a.summary && <p className="truncate text-xs text-muted">{a.summary}</p>}
                    </Td>
                    <Td>
                      <Chip size="sm" variant="soft">
                        <Chip.Label>
                          {ANNOUNCEMENT_TYPES.find((t) => t.key === a.type)?.label ?? a.type}
                        </Chip.Label>
                      </Chip>
                    </Td>
                    <Td>
                      <Chip size="sm" variant="soft" color={a.isResolved ? 'success' : 'warning'}>
                        <Chip.Label>{a.isResolved ? 'Résolue' : 'En cours'}</Chip.Label>
                      </Chip>
                    </Td>
                    <Td><DateText value={a.publishedAt} /></Td>
                    <Td align="right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm" variant="ghost" isIconOnly
                          aria-label={`Modifier ${a.title}`}
                          onPress={() => openForm('announcements', {
                            title: a.title, type: a.type, summary: a.summary ?? '',
                            content: a.content ?? '',
                          }, a.id)}
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button
                          size="sm" variant="ghost" isIconOnly
                          aria-label={`Supprimer ${a.title}`}
                          className="text-danger hover:bg-danger/10"
                          onPress={() => remove('announcements', a.id)}
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
        </Tabs.Panel>

        {/* ── Incidents connus ── */}
        <Tabs.Panel id="issues" className="pt-4">
          <SectionCard
            flush
            title="Incidents connus"
            description={`${issues.length} incident${issues.length > 1 ? 's' : ''}`}
            actions={
              <Button size="sm" onPress={() => openForm('issues', { title: '', description: '', status: 'investigating' })}>
                <Plus className="size-3.5" aria-hidden />
                Déclarer
              </Button>
            }
          >
            {loading ? <TableSkeleton rows={3} cols={3} /> : issues.length === 0 ? (
              <EmptyState icon={TriangleAlert} title="Aucun incident connu" />
            ) : (
              <TableShell
                minWidth={640}
                head={<><Th>Incident</Th><Th>Statut</Th><Th>Déclaré</Th><Th align="right">Actions</Th></>}
              >
                {issues.map((i) => (
                  <Tr key={i.id}>
                    <Td className="max-w-sm">
                      <p className="truncate text-sm font-medium">{i.title}</p>
                      {i.description && (
                        <p className="truncate text-xs text-muted">{i.description}</p>
                      )}
                    </Td>
                    <Td>
                      <Chip
                        size="sm"
                        variant="soft"
                        color={i.status === 'resolved' ? 'success' : i.status === 'in_progress' ? 'accent' : 'warning'}
                      >
                        <Chip.Label>
                          {ISSUE_STATUSES.find((s) => s.key === i.status)?.label ?? i.status}
                        </Chip.Label>
                      </Chip>
                    </Td>
                    <Td><DateText value={i.createdAt} /></Td>
                    <Td align="right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm" variant="ghost" isIconOnly
                          aria-label={`Modifier ${i.title}`}
                          onPress={() => openForm('issues', {
                            title: i.title, description: i.description ?? '', status: i.status,
                          }, i.id)}
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button
                          size="sm" variant="ghost" isIconOnly
                          aria-label={`Supprimer ${i.title}`}
                          className="text-danger hover:bg-danger/10"
                          onPress={() => remove('issues', i.id)}
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
        </Tabs.Panel>
      </Tabs>

      {/* ── Formulaire unifié ── */}
      <Modal.Backdrop isOpen={dialogOpen} onOpenChange={setDialogOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[520px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>
                {editingId ? 'Modifier le contenu' : 'Nouveau contenu'}
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="space-y-4">
              <TextField
                value={form.title ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, title: v }))}
                isRequired
              >
                <Label>Titre</Label>
                <Input placeholder="Titre du contenu" />
              </TextField>

              {'slug' in form && (
                <TextField
                  value={form.slug ?? ''}
                  onChange={(v) => setForm((f) => ({ ...f, slug: v }))}
                >
                  <Label>Slug</Label>
                  <Input placeholder="premiers-pas" autoComplete="off" />
                </TextField>
              )}

              {kind === 'announcements' && (
                <Select
                  selectedKey={form.type ?? 'news'}
                  onSelectionChange={(k) => setForm((f) => ({ ...f, type: String(k) }))}
                >
                  <Label>Type</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {ANNOUNCEMENT_TYPES.map((t) => (
                        <ListBox.Item key={t.key} id={t.key} textValue={t.label}>
                          <Label>{t.label}</Label>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              )}

              {kind === 'issues' && (
                <Select
                  selectedKey={form.status ?? 'investigating'}
                  onSelectionChange={(k) => setForm((f) => ({ ...f, status: String(k) }))}
                >
                  <Label>Statut</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {ISSUE_STATUSES.map((s) => (
                        <ListBox.Item key={s.key} id={s.key} textValue={s.label}>
                          <Label>{s.label}</Label>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              )}

              {'summary' in form && (
                <TextField
                  value={form.summary ?? ''}
                  onChange={(v) => setForm((f) => ({ ...f, summary: v }))}
                >
                  <Label>Résumé</Label>
                  <TextArea rows={2} />
                </TextField>
              )}

              {'description' in form && (
                <TextField
                  value={form.description ?? ''}
                  onChange={(v) => setForm((f) => ({ ...f, description: v }))}
                >
                  <Label>Description</Label>
                  <TextArea rows={3} />
                </TextField>
              )}

              {'content' in form && (
                <TextField
                  value={form.content ?? ''}
                  onChange={(v) => setForm((f) => ({ ...f, content: v }))}
                >
                  <Label>Contenu</Label>
                  <TextArea rows={6} />
                </TextField>
              )}

              {'tags' in form && (
                <TextField
                  value={form.tags ?? ''}
                  onChange={(v) => setForm((f) => ({ ...f, tags: v }))}
                >
                  <Label>Mots-clés</Label>
                  <Input placeholder="compte, connexion" autoComplete="off" />
                </TextField>
              )}
            </Modal.Body>

            <Modal.Footer>
              <Button slot="close" variant="tertiary" isDisabled={saving}>Annuler</Button>
              <Button onPress={save} isPending={saving}>
                {editingId ? 'Enregistrer' : 'Créer'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
