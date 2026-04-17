'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button }    from '@/components/ui/button';
import { Badge }     from '@/components/ui/badge';
import { Input }     from '@/components/ui/input';
import { Textarea }  from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  PlusIcon, Edit2Icon, Trash2Icon, EyeIcon, EyeOffIcon,
  ShieldIcon, FileTextIcon, BellIcon, AlertTriangleIcon,
} from '@/components/icons';

// ─── Types ─────────────────────────────────────────────────────────────────────

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

// ─── Status/Type labels ────────────────────────────────────────────────────────

const ISSUE_STATUS: Record<KnownIssue['status'], { label: string; color: string }> = {
  investigating: { label: 'Investigation', color: 'bg-orange-500/10 text-orange-600' },
  in_progress:   { label: 'En cours',       color: 'bg-blue-500/10 text-blue-600' },
  resolved:      { label: 'Résolu',          color: 'bg-green-500/10 text-green-600' },
};
const ANNOUNCE_TYPE: Record<Announcement['type'], { label: string; color: string }> = {
  incident:    { label: 'Incident',     color: 'bg-red-500/10 text-red-600' },
  maintenance: { label: 'Maintenance',  color: 'bg-yellow-500/10 text-yellow-700' },
  news:        { label: 'Annonce',      color: 'bg-blue-500/10 text-blue-600' },
};

// ─── Main component ────────────────────────────────────────────────────────────

export function SupportContentPanel() {
  const [tab, setTab] = useState('categories');

  // Data
  const [categories, setCategories]     = useState<Category[]>([]);
  const [articles, setArticles]         = useState<Article[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [knownIssues, setKnownIssues]   = useState<KnownIssue[]>([]);
  const [loading, setLoading]           = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; label: string } | null>(null);

  // Category dialog
  const [catDialog, setCatDialog] = useState(false);
  const [catEdit, setCatEdit]     = useState<Category | null>(null);
  const [catForm, setCatForm]     = useState({ slug: '', title: '', description: '', iconName: 'circle-help', color: '#6366f1', sortOrder: 0, isActive: true });

  // Article dialog
  const [artDialog, setArtDialog]   = useState(false);
  const [artEdit, setArtEdit]       = useState<Article | null>(null);
  const [artForm, setArtForm]       = useState({ categoryId: '', slug: '', title: '', summary: '', content: '', tags: '', isPinned: false, isPublished: true, sortOrder: 0 });

  // Announcement dialog
  const [annDialog, setAnnDialog] = useState(false);
  const [annEdit, setAnnEdit]     = useState<Announcement | null>(null);
  const [annForm, setAnnForm]     = useState({ type: 'news' as Announcement['type'], title: '', summary: '', content: '', isResolved: false, isPublished: true });

  // Known issue dialog
  const [issDialog, setIssDialog] = useState(false);
  const [issEdit, setIssEdit]     = useState<KnownIssue | null>(null);
  const [issForm, setIssForm]     = useState({ title: '', description: '', status: 'investigating' as KnownIssue['status'], categoryLabel: '' });

  const [saving, setSaving] = useState(false);

  // ── Loaders ──────────────────────────────────────────────────────────────────

  const loadCategories = useCallback(async () => {
    const r = await api.get('/api/admin/support/categories');
    if (r.success && r.data) setCategories((r.data as any).data ?? r.data);
  }, []);

  const loadArticles = useCallback(async () => {
    const r = await api.get('/api/admin/support/articles');
    if (r.success && r.data) setArticles((r.data as any).data ?? r.data);
  }, []);

  const loadAnnouncements = useCallback(async () => {
    const r = await api.get('/api/admin/support/announcements');
    if (r.success && r.data) setAnnouncements((r.data as any).data ?? r.data);
  }, []);

  const loadKnownIssues = useCallback(async () => {
    const r = await api.get('/api/admin/support/known-issues');
    if (r.success && r.data) setKnownIssues((r.data as any).data ?? r.data);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadCategories(), loadArticles(), loadAnnouncements(), loadKnownIssues()])
      .finally(() => setLoading(false));
  }, [loadCategories, loadArticles, loadAnnouncements, loadKnownIssues]);

  // ── Delete ────────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    const map: Record<string, string> = {
      category: '/api/admin/support/categories',
      article: '/api/admin/support/articles',
      announcement: '/api/admin/support/announcements',
      issue: '/api/admin/support/known-issues',
    };
    await api.delete(`${map[type]}/${id}`);
    setDeleteTarget(null);
    if (type === 'category')     loadCategories();
    if (type === 'article')      loadArticles();
    if (type === 'announcement') loadAnnouncements();
    if (type === 'issue')        loadKnownIssues();
  };

  // ── Category save ──────────────────────────────────────────────────────────

  const openCatCreate = () => {
    setCatEdit(null);
    setCatForm({ slug: '', title: '', description: '', iconName: 'circle-help', color: '#6366f1', sortOrder: 0, isActive: true });
    setCatDialog(true);
  };
  const openCatEdit = (c: Category) => {
    setCatEdit(c);
    setCatForm({ slug: c.slug, title: c.title, description: c.description ?? '', iconName: c.iconName, color: c.color, sortOrder: c.sortOrder, isActive: c.isActive });
    setCatDialog(true);
  };
  const saveCat = async () => {
    setSaving(true);
    const body = { ...catForm };
    if (catEdit) {
      await api.patch(`/api/admin/support/categories/${catEdit.id}`, body);
    } else {
      await api.post('/api/admin/support/categories', body);
    }
    setSaving(false);
    setCatDialog(false);
    loadCategories();
  };

  // ── Article save ──────────────────────────────────────────────────────────

  const openArtCreate = () => {
    setArtEdit(null);
    setArtForm({ categoryId: '', slug: '', title: '', summary: '', content: '', tags: '', isPinned: false, isPublished: true, sortOrder: 0 });
    setArtDialog(true);
  };
  const openArtEdit = (a: Article) => {
    setArtEdit(a);
    setArtForm({ categoryId: a.categoryId ?? '', slug: a.slug, title: a.title, summary: a.summary ?? '', content: a.content ?? '', tags: a.tags.join(', '), isPinned: a.isPinned, isPublished: a.isPublished, sortOrder: a.sortOrder });
    setArtDialog(true);
  };
  const saveArt = async () => {
    setSaving(true);
    const body = {
      ...artForm,
      tags: artForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      categoryId: artForm.categoryId || null,
    };
    if (artEdit) {
      await api.patch(`/api/admin/support/articles/${artEdit.id}`, body);
    } else {
      await api.post('/api/admin/support/articles', body);
    }
    setSaving(false);
    setArtDialog(false);
    loadArticles();
  };

  // ── Announcement save ──────────────────────────────────────────────────────

  const openAnnCreate = () => {
    setAnnEdit(null);
    setAnnForm({ type: 'news', title: '', summary: '', content: '', isResolved: false, isPublished: true });
    setAnnDialog(true);
  };
  const openAnnEdit = (a: Announcement) => {
    setAnnEdit(a);
    setAnnForm({ type: a.type, title: a.title, summary: a.summary ?? '', content: a.content ?? '', isResolved: a.isResolved, isPublished: a.isPublished });
    setAnnDialog(true);
  };
  const saveAnn = async () => {
    setSaving(true);
    if (annEdit) {
      await api.patch(`/api/admin/support/announcements/${annEdit.id}`, annForm);
    } else {
      await api.post('/api/admin/support/announcements', annForm);
    }
    setSaving(false);
    setAnnDialog(false);
    loadAnnouncements();
  };

  // ── Known issue save ───────────────────────────────────────────────────────

  const openIssCreate = () => {
    setIssEdit(null);
    setIssForm({ title: '', description: '', status: 'investigating', categoryLabel: '' });
    setIssDialog(true);
  };
  const openIssEdit = (i: KnownIssue) => {
    setIssEdit(i);
    setIssForm({ title: i.title, description: i.description ?? '', status: i.status, categoryLabel: i.categoryLabel ?? '' });
    setIssDialog(true);
  };
  const saveIss = async () => {
    setSaving(true);
    if (issEdit) {
      await api.patch(`/api/admin/support/known-issues/${issEdit.id}`, issForm);
    } else {
      await api.post('/api/admin/support/known-issues', issForm);
    }
    setSaving(false);
    setIssDialog(false);
    loadKnownIssues();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="categories" className="gap-1.5"><ShieldIcon className="size-3.5" /> Catégories</TabsTrigger>
          <TabsTrigger value="articles" className="gap-1.5"><FileTextIcon className="size-3.5" /> Articles</TabsTrigger>
          <TabsTrigger value="announcements" className="gap-1.5"><BellIcon className="size-3.5" /> Annonces</TabsTrigger>
          <TabsTrigger value="issues" className="gap-1.5"><AlertTriangleIcon className="size-3.5" /> Problèmes</TabsTrigger>
        </TabsList>

        {/* ── CATEGORIES ──────────────────────────────────────────────────── */}
        <TabsContent value="categories" className="space-y-3 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{categories.length} catégorie(s)</p>
            <Button size="sm" onClick={openCatCreate}><PlusIcon className="size-3.5 mr-1.5" /> Nouvelle catégorie</Button>
          </div>
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {categories.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/50 transition-colors">
                <span className="size-3 rounded-full shrink-0" style={{ background: c.color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.slug} · {c.articleCount ?? 0} article(s)</p>
                </div>
                <Badge variant="outline" className={c.isActive ? 'text-green-600' : 'text-muted-foreground'}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => openCatEdit(c)}><Edit2Icon className="size-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteTarget({ type: 'category', id: c.id, label: c.title })}><Trash2Icon className="size-3.5" /></Button>
                </div>
              </div>
            ))}
            {!loading && categories.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucune catégorie</p>
            )}
          </div>
        </TabsContent>

        {/* ── ARTICLES ────────────────────────────────────────────────────── */}
        <TabsContent value="articles" className="space-y-3 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{articles.length} article(s)</p>
            <Button size="sm" onClick={openArtCreate}><PlusIcon className="size-3.5 mr-1.5" /> Nouvel article</Button>
          </div>
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {articles.map(a => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.slug} · {a.viewCount} vues</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {a.isPinned && <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-0">Épinglé</Badge>}
                  <Badge variant="outline" className={a.isPublished ? 'text-green-600' : 'text-muted-foreground'}>
                    {a.isPublished ? <EyeIcon className="size-3 mr-1" /> : <EyeOffIcon className="size-3 mr-1" />}
                    {a.isPublished ? 'Publié' : 'Brouillon'}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => openArtEdit(a)}><Edit2Icon className="size-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteTarget({ type: 'article', id: a.id, label: a.title })}><Trash2Icon className="size-3.5" /></Button>
                </div>
              </div>
            ))}
            {!loading && articles.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucun article</p>
            )}
          </div>
        </TabsContent>

        {/* ── ANNOUNCEMENTS ────────────────────────────────────────────────── */}
        <TabsContent value="announcements" className="space-y-3 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{announcements.length} annonce(s)</p>
            <Button size="sm" onClick={openAnnCreate}><PlusIcon className="size-3.5 mr-1.5" /> Nouvelle annonce</Button>
          </div>
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {announcements.map(a => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(a.publishedAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Badge className={`text-[10px] border-0 ${ANNOUNCE_TYPE[a.type].color}`}>{ANNOUNCE_TYPE[a.type].label}</Badge>
                  {a.isResolved && <Badge className="text-[10px] bg-green-500/10 text-green-600 border-0">Résolu</Badge>}
                  {!a.isPublished && <Badge variant="outline" className="text-[10px] text-muted-foreground">Masqué</Badge>}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => openAnnEdit(a)}><Edit2Icon className="size-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteTarget({ type: 'announcement', id: a.id, label: a.title })}><Trash2Icon className="size-3.5" /></Button>
                </div>
              </div>
            ))}
            {!loading && announcements.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucune annonce</p>
            )}
          </div>
        </TabsContent>

        {/* ── KNOWN ISSUES ─────────────────────────────────────────────────── */}
        <TabsContent value="issues" className="space-y-3 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{knownIssues.length} problème(s)</p>
            <Button size="sm" onClick={openIssCreate}><PlusIcon className="size-3.5 mr-1.5" /> Nouveau problème</Button>
          </div>
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {knownIssues.map(i => (
              <div key={i.id} className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{i.title}</p>
                  {i.categoryLabel && <p className="text-xs text-muted-foreground">{i.categoryLabel}</p>}
                </div>
                <Badge className={`text-[10px] border-0 ${ISSUE_STATUS[i.status].color}`}>{ISSUE_STATUS[i.status].label}</Badge>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => openIssEdit(i)}><Edit2Icon className="size-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteTarget({ type: 'issue', id: i.id, label: i.title })}><Trash2Icon className="size-3.5" /></Button>
                </div>
              </div>
            ))}
            {!loading && knownIssues.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucun problème connu</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Delete confirm ──────────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous supprimer <strong>{deleteTarget?.label}</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Category dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{catEdit ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Titre</label>
                <Input value={catForm.title} onChange={e => setCatForm(f => ({ ...f, title: e.target.value }))} placeholder="Sécurité" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Slug (URL)</label>
                <Input value={catForm.slug} onChange={e => setCatForm(f => ({ ...f, slug: e.target.value }))} placeholder="securite" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Description</label>
              <Textarea value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Icône (flaticon)</label>
                <Input value={catForm.iconName} onChange={e => setCatForm(f => ({ ...f, iconName: e.target.value }))} placeholder="shield" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Couleur</label>
                <div className="flex gap-2">
                  <input type="color" value={catForm.color} onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={catForm.color} onChange={e => setCatForm(f => ({ ...f, color: e.target.value }))} className="font-mono text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Ordre</label>
                <Input type="number" value={catForm.sortOrder} onChange={e => setCatForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="catActive" checked={catForm.isActive} onChange={e => setCatForm(f => ({ ...f, isActive: e.target.checked }))} />
              <label htmlFor="catActive" className="text-sm">Catégorie active (visible)</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)}>Annuler</Button>
            <Button onClick={saveCat} disabled={saving || !catForm.title || !catForm.slug}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Article dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={artDialog} onOpenChange={setArtDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{artEdit ? 'Modifier l\'article' : 'Nouvel article'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Titre</label>
                <Input value={artForm.title} onChange={e => setArtForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Slug (URL)</label>
                <Input value={artForm.slug} onChange={e => setArtForm(f => ({ ...f, slug: e.target.value }))} placeholder="mon-article" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Catégorie</label>
                <Select value={artForm.categoryId || '__none'} onValueChange={v => setArtForm(f => ({ ...f, categoryId: v === '__none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Aucune</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Tags (séparés par virgule)</label>
                <Input value={artForm.tags} onChange={e => setArtForm(f => ({ ...f, tags: e.target.value }))} placeholder="sécurité, 2fa" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Résumé</label>
              <Textarea value={artForm.summary} onChange={e => setArtForm(f => ({ ...f, summary: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Contenu (Markdown)</label>
              <Textarea value={artForm.content} onChange={e => setArtForm(f => ({ ...f, content: e.target.value }))} rows={10} className="font-mono text-sm" />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={artForm.isPublished} onChange={e => setArtForm(f => ({ ...f, isPublished: e.target.checked }))} />
                Publié
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={artForm.isPinned} onChange={e => setArtForm(f => ({ ...f, isPinned: e.target.checked }))} />
                Épinglé
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArtDialog(false)}>Annuler</Button>
            <Button onClick={saveArt} disabled={saving || !artForm.title || !artForm.slug}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Announcement dialog ──────────────────────────────────────────────────── */}
      <Dialog open={annDialog} onOpenChange={setAnnDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{annEdit ? 'Modifier l\'annonce' : 'Nouvelle annonce'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Type</label>
                <Select value={annForm.type} onValueChange={v => setAnnForm(f => ({ ...f, type: v as Announcement['type'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="news">Annonce</SelectItem>
                    <SelectItem value="incident">Incident</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Titre</label>
                <Input value={annForm.title} onChange={e => setAnnForm(f => ({ ...f, title: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Résumé</label>
              <Textarea value={annForm.summary} onChange={e => setAnnForm(f => ({ ...f, summary: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Contenu</label>
              <Textarea value={annForm.content} onChange={e => setAnnForm(f => ({ ...f, content: e.target.value }))} rows={5} />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={annForm.isPublished} onChange={e => setAnnForm(f => ({ ...f, isPublished: e.target.checked }))} />
                Publié
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={annForm.isResolved} onChange={e => setAnnForm(f => ({ ...f, isResolved: e.target.checked }))} />
                Résolu
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnDialog(false)}>Annuler</Button>
            <Button onClick={saveAnn} disabled={saving || !annForm.title}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Known issue dialog ────────────────────────────────────────────────────── */}
      <Dialog open={issDialog} onOpenChange={setIssDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{issEdit ? 'Modifier le problème' : 'Nouveau problème connu'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Titre</label>
                <Input value={issForm.title} onChange={e => setIssForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Statut</label>
                <Select value={issForm.status} onValueChange={v => setIssForm(f => ({ ...f, status: v as KnownIssue['status'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="investigating">Investigation</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="resolved">Résolu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Catégorie / Label</label>
              <Input value={issForm.categoryLabel} onChange={e => setIssForm(f => ({ ...f, categoryLabel: e.target.value }))} placeholder="Connexion, Messagerie…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Description</label>
              <Textarea value={issForm.description} onChange={e => setIssForm(f => ({ ...f, description: e.target.value }))} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssDialog(false)}>Annuler</Button>
            <Button onClick={saveIss} disabled={saving || !issForm.title}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
