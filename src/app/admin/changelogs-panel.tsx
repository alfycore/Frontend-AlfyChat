'use client';

import { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

import { Button }          from '@/components/ui/button';
import { Badge }           from '@/components/ui/badge';
import { Input }           from '@/components/ui/input';
import { Textarea }        from '@/components/ui/textarea';
import { Separator }       from '@/components/ui/separator';
import { ScrollArea }      from '@/components/ui/scroll-area';
import { Skeleton }        from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  SparklesIcon, ZapIcon, ShieldIcon, FlameIcon,
  PlusIcon, Edit2Icon, Trash2Icon, SearchIcon,
  EyeIcon, FileTextIcon,
} from '@/components/icons';

// ─── Types ─────────────────────────────────────────────────────────────────────

type ChangelogType = 'feature' | 'fix' | 'improvement' | 'security' | 'breaking';

interface Changelog {
  id: string;
  version: string;
  title: string;
  content: string;
  type: ChangelogType;
  banner_url?: string | null;
  author_username?: string | null;
  created_at: string;
}

const EMPTY_FORM = {
  version: '', title: '', content: '', type: 'feature' as ChangelogType, bannerUrl: '',
};

// ─── Config ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ChangelogType, { label: string; iconBg: string; iconColor: string; badgeClass: string; icon: React.ElementType }> = {
  feature:     { label: 'Nouveauté',        iconBg: 'bg-blue-500/10',   iconColor: 'text-blue-500',   badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',   icon: SparklesIcon },
  improvement: { label: 'Amélioration',     iconBg: 'bg-violet-500/10', iconColor: 'text-violet-500', badgeClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', icon: ZapIcon },
  fix:         { label: 'Correctif',         iconBg: 'bg-orange-500/10', iconColor: 'text-orange-500', badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', icon: FlameIcon },
  security:    { label: 'Sécurité',          iconBg: 'bg-red-500/10',    iconColor: 'text-red-500',    badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400',     icon: ShieldIcon },
  breaking:    { label: 'Changement majeur', iconBg: 'bg-red-700/10',    iconColor: 'text-red-600',    badgeClass: 'bg-red-700/10 text-red-700 dark:text-red-400',     icon: FlameIcon },
};

const FILTER_OPTIONS: { value: 'all' | ChangelogType; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'feature', label: 'Nouveauté' },
  { value: 'improvement', label: 'Amélioration' },
  { value: 'fix', label: 'Correctif' },
  { value: 'security', label: 'Sécurité' },
  { value: 'breaking', label: 'Changement majeur' },
];

// ─── Markdown prose classes ─────────────────────────────────────────────────────

const PROSE_CLASSES = cn(
  'prose prose-sm max-w-none text-muted-foreground',
  '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
  '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic',
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-foreground',
  '[&_h1]:text-sm [&_h1]:font-bold [&_h1]:text-foreground',
  '[&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-foreground',
  '[&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-foreground',
  '[&_li]:text-xs [&_li]:leading-relaxed',
  '[&_ol]:list-decimal [&_ol]:pl-5',
  '[&_p]:text-xs [&_p]:leading-relaxed',
  '[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted [&_pre]:p-3',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_strong]:font-semibold [&_strong]:text-foreground',
  '[&_ul]:list-disc [&_ul]:pl-5',
);

// ─── Component ────────────────────────────────────────────────────────────────

export function ChangelogsPanel() {
  const [changelogs, setChangelogs]   = useState<Changelog[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [typeFilter, setTypeFilter]   = useState<'all' | ChangelogType>('all');

  // Dialog state
  const [dialogOpen, setDialogOpen]         = useState(false);
  const [editingEntry, setEditingEntry]     = useState<Changelog | null>(null);
  const [form, setForm]                     = useState(EMPTY_FORM);
  const [submitting, setSubmitting]         = useState(false);
  const [formError, setFormError]           = useState('');
  const [dialogTab, setDialogTab]           = useState<'edit' | 'preview'>('edit');

  // Delete dialog
  const [deleteTarget, setDeleteTarget]     = useState<Changelog | null>(null);
  const [deleteLoading, setDeleteLoading]   = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.getChangelogs(200, 0);
      if (r.success && r.data) setChangelogs(r.data as Changelog[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return changelogs.filter((cl) => {
      const matchesType = typeFilter === 'all' || cl.type === typeFilter;
      const matchesSearch = !q || cl.title.toLowerCase().includes(q) || cl.version.toLowerCase().includes(q) || cl.content.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [changelogs, search, typeFilter]);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cl of changelogs) counts[cl.type] = (counts[cl.type] ?? 0) + 1;
    return counts;
  }, [changelogs]);

  // ── Open create dialog ─────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingEntry(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setDialogTab('edit');
    setDialogOpen(true);
  };

  // ── Open edit dialog ───────────────────────────────────────────────────────

  const openEdit = (cl: Changelog) => {
    setEditingEntry(cl);
    setForm({
      version:  cl.version,
      title:    cl.title,
      content:  cl.content,
      type:     cl.type,
      bannerUrl: cl.banner_url ?? '',
    });
    setFormError('');
    setDialogTab('edit');
    setDialogOpen(true);
  };

  // ── Submit create/edit ──────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.version.trim() || !form.title.trim() || !form.content.trim()) {
      setFormError('Version, titre et contenu sont requis.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      if (editingEntry) {
        await api.updateChangelog(editingEntry.id, {
          version:  form.version.trim(),
          title:    form.title.trim(),
          content:  form.content.trim(),
          type:     form.type,
          bannerUrl: form.bannerUrl.trim() || undefined,
        });
      } else {
        await api.createChangelog({
          version:  form.version.trim(),
          title:    form.title.trim(),
          content:  form.content.trim(),
          type:     form.type,
          bannerUrl: form.bannerUrl.trim() || undefined,
        });
      }
      setDialogOpen(false);
      await load();
    } catch {
      setFormError('Une erreur est survenue. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.deleteChangelog(deleteTarget.id);
      setChangelogs((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Changelogs & Blog</h2>
          <p className="text-sm text-muted-foreground">Gérez les entrées publiées sur la page publique.</p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <PlusIcon className="size-4" />
          Nouvelle entrée
        </Button>
      </div>

      {/* Stats cards */}
      {!loading && changelogs.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(Object.keys(TYPE_CONFIG) as ChangelogType[]).map((type) => {
            const cfg = TYPE_CONFIG[type];
            const Icon = cfg.icon;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl border border-border p-3 text-left transition-all hover:bg-muted/40',
                  typeFilter === type && 'ring-2 ring-primary',
                )}
              >
                <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', cfg.iconBg, cfg.iconColor)}>
                  <Icon size={14} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{cfg.label}</p>
                  <p className="text-lg font-bold leading-none">{stats[type] ?? 0}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                typeFilter === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={load} className="h-8 text-xs shrink-0">
          Actualiser
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-start gap-3 py-4">
                <Skeleton className="size-9 shrink-0 rounded-md" />
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="ml-auto h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <FileTextIcon className="size-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {search || typeFilter !== 'all' ? 'Aucun résultat pour ces filtres.' : 'Aucune entrée pour le moment.'}
            </p>
            {(search || typeFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setTypeFilter('all'); }}>
                Effacer les filtres
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((cl, idx) => {
            const cfg = TYPE_CONFIG[cl.type] ?? TYPE_CONFIG.feature;
            const Icon = cfg.icon;
            return (
              <Card key={cl.id} className="transition-shadow hover:shadow-sm">
                <CardContent className="flex items-start gap-3 py-4">
                  {/* Icon */}
                  <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-md', cfg.iconBg, cfg.iconColor)}>
                    <Icon size={15} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className={cn('text-[11px]', cfg.iconColor)}>
                        {cfg.label}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-[11px] text-muted-foreground">
                        v{cl.version}
                      </Badge>
                      {idx === 0 && changelogs[0]?.id === cl.id && (
                        <Badge className="text-[11px]">Dernière version</Badge>
                      )}
                      <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                        {new Date(cl.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="mb-1 text-sm font-semibold text-foreground">{cl.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground whitespace-pre-line">{cl.content}</p>
                    {cl.author_username && (
                      <p className="mt-1 text-xs text-muted-foreground/60">par @{cl.author_username}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(cl)}>
                      <Edit2Icon className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(cl)}>
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Dialog ────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle>
              {editingEntry ? 'Modifier l\'entrée' : 'Nouvelle entrée'}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={dialogTab} onValueChange={(v) => setDialogTab(v as 'edit' | 'preview')} className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-border px-6 pt-2">
              <TabsList className="h-8">
                <TabsTrigger value="edit" className="gap-1.5 text-xs">
                  <Edit2Icon className="size-3" />
                  Édition
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-1.5 text-xs">
                  <EyeIcon className="size-3" />
                  Aperçu
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Edit tab */}
            <TabsContent value="edit" className="m-0 min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-4 px-6 py-4">
                {/* Row: version + type */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Version *</label>
                    <Input
                      placeholder="1.2.0"
                      value={form.version}
                      onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Catégorie *</label>
                    <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as ChangelogType }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="feature">✨ Nouveauté</SelectItem>
                        <SelectItem value="improvement">⚡ Amélioration</SelectItem>
                        <SelectItem value="fix">🐛 Correctif</SelectItem>
                        <SelectItem value="security">🔒 Sécurité</SelectItem>
                        <SelectItem value="breaking">💥 Changement majeur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Titre *</label>
                  <Input
                    placeholder="Titre de l'entrée"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>

                {/* Content */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Contenu *{' '}
                    <span className="font-normal text-muted-foreground/60">(Markdown supporté)</span>
                  </label>
                  <Textarea
                    placeholder="Décrivez les changements…&#10;&#10;## Points clés&#10;- Nouvelle fonctionnalité X&#10;- Correction du bug Y"
                    value={form.content}
                    onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                    rows={10}
                    className="resize-none font-mono text-xs"
                  />
                </div>

                {/* Banner URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    URL Bannière{' '}
                    <span className="font-normal text-muted-foreground/60">(optionnel)</span>
                  </label>
                  <Input
                    placeholder="https://…"
                    value={form.bannerUrl}
                    onChange={(e) => setForm((p) => ({ ...p, bannerUrl: e.target.value }))}
                  />
                </div>

                {formError && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{formError}</p>
                )}
              </div>
            </TabsContent>

            {/* Preview tab */}
            <TabsContent value="preview" className="m-0 min-h-0 flex-1 overflow-y-auto">
              <div className="px-6 py-4">
                {form.title || form.content ? (
                  <div className="space-y-3">
                    {/* Preview header */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(() => {
                        const cfg = TYPE_CONFIG[form.type];
                        return (
                          <Badge variant="secondary" className={cn('text-xs', cfg.iconColor)}>
                            {cfg.label}
                          </Badge>
                        );
                      })()}
                      {form.version && (
                        <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                          v{form.version}
                        </Badge>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    {form.title && (
                      <h3 className="text-base font-semibold text-foreground">{form.title}</h3>
                    )}

                    {form.bannerUrl && (
                      <div className="overflow-hidden rounded-md">
                        <img src={form.bannerUrl} alt="" className="max-h-40 w-full object-cover" />
                      </div>
                    )}

                    <Separator />

                    {form.content ? (
                      <div className={PROSE_CLASSES}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {form.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground/50 italic">Aucun contenu…</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                    <EyeIcon className="size-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Remplissez le formulaire pour voir l&apos;aperçu.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !form.version.trim() || !form.title.trim() || !form.content.trim()}
            >
              {submitting ? (editingEntry ? 'Mise à jour…' : 'Publication…') : (editingEntry ? 'Enregistrer' : 'Publier')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ──────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>v{deleteTarget?.version} — {deleteTarget?.title}</strong>
              <br />
              Cette action est irréversible. L&apos;entrée sera supprimée de la page publique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? 'Suppression…' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
