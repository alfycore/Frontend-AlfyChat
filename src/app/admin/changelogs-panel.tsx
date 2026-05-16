'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { api, resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

import { Button }          from '@/components/ui/button';
import { Input }           from '@/components/ui/input';
import { Textarea }        from '@/components/ui/textarea';
import { ScrollArea }      from '@/components/ui/scroll-area';
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
  SparklesIcon, ZapIcon, ShieldIcon, FlameIcon, MegaphoneIcon,
  PlusIcon, Edit2Icon, Trash2Icon, SearchIcon,
  EyeIcon, FileTextIcon, ImageIcon, XIcon, UploadIcon,
} from '@/components/icons';
import { MarkdownRenderer } from '@/components/chat/markdown-renderer';

// ─── Types ─────────────────────────────────────────────────────────────────────

type EntryType = 'feature' | 'fix' | 'improvement' | 'security' | 'breaking' | 'news';

interface FeedEntry {
  id: string;
  version: string;
  title: string;
  content: string;
  type: EntryType;
  banner_url?: string | null;
  author_username?: string | null;
  created_at: string;
}

const EMPTY_FORM = {
  version: '', title: '', content: '', type: 'feature' as EntryType, bannerUrl: '',
};

// ─── Config ────────────────────────────────────────────────────────────────────

const TYPE_CFG: Record<EntryType, {
  label: string;
  badge: string;
  accent: string;
  icon: React.ElementType;
}> = {
  news:        { label: 'Actualité',         badge: 'bg-teal-500/10 text-teal-600',    accent: 'border-l-teal-500',   icon: MegaphoneIcon },
  feature:     { label: 'Nouveauté',         badge: 'bg-blue-500/10 text-blue-600',    accent: 'border-l-blue-500',   icon: SparklesIcon  },
  improvement: { label: 'Amélioration',      badge: 'bg-violet-500/10 text-violet-600', accent: 'border-l-violet-500', icon: ZapIcon       },
  fix:         { label: 'Correctif',         badge: 'bg-orange-500/10 text-orange-600', accent: 'border-l-orange-500', icon: FlameIcon     },
  security:    { label: 'Sécurité',          badge: 'bg-red-500/10 text-red-600',      accent: 'border-l-red-500',    icon: ShieldIcon    },
  breaking:    { label: 'Changement majeur', badge: 'bg-rose-700/10 text-rose-700',    accent: 'border-l-rose-700',   icon: FlameIcon     },
};

const FILTER_OPTIONS: { value: 'all' | EntryType; label: string }[] = [
  { value: 'all',         label: 'Tout' },
  { value: 'news',        label: 'Actualité' },
  { value: 'feature',     label: 'Nouveauté' },
  { value: 'improvement', label: 'Amélioration' },
  { value: 'fix',         label: 'Correctif' },
  { value: 'security',    label: 'Sécurité' },
  { value: 'breaking',    label: 'Changement majeur' },
];

// ─── Banner upload helper ──────────────────────────────────────────────────────

function BannerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFile = async (file: File) => {
    setUploadError('');
    setUploading(true);
    try {
      const res = await api.uploadImage(file, 'banner');
      if (res.success && res.data?.url) {
        onChange(res.data.url);
      } else {
        setUploadError('Échec de l\'upload. Réessayez ou collez une URL.');
      }
    } catch {
      setUploadError('Erreur lors de l\'upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  };

  const preview = value ? (resolveMediaUrl(value) ?? value) : null;

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">
        Bannière <span className="font-normal text-muted-foreground/60">(optionnel)</span>
      </label>

      {/* Preview */}
      {preview && (
        <div className="relative overflow-hidden rounded-xl border border-border/60">
          <img src={preview} alt="" className="max-h-36 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          >
            <XIcon size={12} />
          </button>
        </div>
      )}

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-4 text-center hover:bg-muted/30 transition-colors"
      >
        <ImageIcon className="size-6 text-muted-foreground/40" />
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Glissez une image ici ou{' '}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="font-medium text-primary hover:underline disabled:opacity-50"
            >
              choisissez un fichier
            </button>
          </p>
          <p className="text-[10px] text-muted-foreground/50">PNG, JPG, WEBP — max 10 Mo</p>
        </div>
        {uploading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UploadIcon className="size-3 animate-bounce" />
            Upload en cours…
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        />
      </div>

      {/* URL fallback */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border/40" />
        <span className="text-[10px] text-muted-foreground/50">ou coller une URL</span>
        <div className="h-px flex-1 bg-border/40" />
      </div>
      <Input
        placeholder="https://…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs"
      />

      {uploadError && (
        <p className="text-xs text-destructive">{uploadError}</p>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ChangelogsPanel() {
  const [entries, setEntries]         = useState<FeedEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [typeFilter, setTypeFilter]   = useState<'all' | EntryType>('all');

  const [dialogOpen, setDialogOpen]       = useState(false);
  const [editingEntry, setEditingEntry]   = useState<FeedEntry | null>(null);
  const [form, setForm]                   = useState(EMPTY_FORM);
  const [submitting, setSubmitting]       = useState(false);
  const [formError, setFormError]         = useState('');
  const [dialogTab, setDialogTab]         = useState<'edit' | 'preview'>('edit');

  const [deleteTarget, setDeleteTarget]   = useState<FeedEntry | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.getChangelogs(200, 0);
      if (r.success && r.data) {
        const raw = r.data;
        const list: FeedEntry[] = Array.isArray(raw)
          ? (raw as FeedEntry[])
          : Array.isArray((raw as any)?.changelogs)
          ? ((raw as any).changelogs as FeedEntry[])
          : Array.isArray((raw as any)?.data)
          ? ((raw as any).data as FeedEntry[])
          : [];
        setEntries(list);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter((e) => {
      const matchType = typeFilter === 'all' || e.type === typeFilter;
      const matchSearch = !q || e.title.toLowerCase().includes(q) || e.version.toLowerCase().includes(q) || e.content.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [entries, search, typeFilter]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: entries.length };
    for (const e of entries) m[e.type] = (m[e.type] ?? 0) + 1;
    return m;
  }, [entries]);

  // ── Create / Edit ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingEntry(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setDialogTab('edit');
    setDialogOpen(true);
  };

  const openEdit = (entry: FeedEntry) => {
    setEditingEntry(entry);
    setForm({
      version:  entry.version,
      title:    entry.title,
      content:  entry.content,
      type:     entry.type,
      bannerUrl: entry.banner_url ?? '',
    });
    setFormError('');
    setDialogTab('edit');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setFormError('Titre et contenu sont requis.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const payload = {
        version:   form.version.trim() || undefined,
        title:     form.title.trim(),
        content:   form.content.trim(),
        type:      form.type,
        bannerUrl: form.bannerUrl.trim() || undefined,
      };
      if (editingEntry) {
        await api.updateChangelog(editingEntry.id, payload);
      } else {
        await api.createChangelog(payload as any);
      }
      setDialogOpen(false);
      await load();
    } catch {
      setFormError('Une erreur est survenue. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.deleteChangelog(deleteTarget.id);
      setEntries((prev) => prev.filter((e) => e.id !== deleteTarget.id));
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
          <h2 className="text-lg font-semibold">Actualités & Changelogs</h2>
          <p className="text-sm text-muted-foreground">Gérez le flux unifié publié sur la page publique.</p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <PlusIcon className="size-4" />
          Nouvelle entrée
        </Button>
      </div>

      {/* Stats row */}
      {!loading && entries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((opt) => {
            if (opt.value === 'all') return null;
            const count = counts[opt.value] ?? 0;
            if (count === 0) return null;
            const cfg = TYPE_CFG[opt.value as EntryType];
            const Icon = cfg.icon;
            const active = typeFilter === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTypeFilter(typeFilter === opt.value ? 'all' : opt.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all hover:shadow-sm',
                  active ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border/60 bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon size={11} />
                {opt.label}
                <span className={cn(
                  'rounded-full px-1.5 py-px text-[10px] tabular-nums',
                  active ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Button variant="outline" size="sm" onClick={load} className="h-8 shrink-0 text-xs">
          Actualiser
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border/50 bg-card border-l-4 border-l-muted">
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                  <div className="h-5 w-12 animate-pulse rounded-md bg-muted" />
                  <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>

      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/50 bg-card py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <FileTextIcon className="size-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {search || typeFilter !== 'all' ? 'Aucun résultat.' : 'Aucune entrée pour le moment.'}
          </p>
          {(search || typeFilter !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setTypeFilter('all'); }}>
              Effacer les filtres
            </Button>
          )}
        </div>

      ) : (
        <div className="space-y-2">
          {filtered.map((entry, idx) => {
            const cfg = TYPE_CFG[entry.type] ?? TYPE_CFG.feature;
            const Icon = cfg.icon;
            const isFirst = idx === 0 && entries[0]?.id === entry.id;
            return (
              <div
                key={entry.id}
                className={cn(
                  'overflow-hidden rounded-2xl border border-border/50 bg-card border-l-4 transition-shadow hover:shadow-sm',
                  cfg.accent,
                )}
              >
                {/* Banner thumbnail */}
                {entry.banner_url && (
                  <img
                    src={resolveMediaUrl(entry.banner_url) ?? entry.banner_url}
                    alt=""
                    className="w-full max-h-20 object-cover opacity-80"
                  />
                )}
                <div className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none', cfg.badge)}>
                        <Icon size={10} />
                        {cfg.label}
                      </span>
                      {entry.version && (
                        <span className="rounded-md border border-border/60 px-2 py-0.5 font-mono text-[11px] leading-none text-muted-foreground">
                          v{entry.version}
                        </span>
                      )}
                      {isFirst && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
                          Dernière
                        </span>
                      )}
                      <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{entry.content.slice(0, 120)}{entry.content.length > 120 ? '…' : ''}</p>
                    {entry.author_username && (
                      <p className="mt-1 text-[11px] text-muted-foreground/50">par @{entry.author_username}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(entry)}>
                      <Edit2Icon className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(entry)}>
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
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
                {/* Type + version */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Catégorie *</label>
                    <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as EntryType }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="news">📰 Actualité</SelectItem>
                        <SelectItem value="feature">✨ Nouveauté</SelectItem>
                        <SelectItem value="improvement">⚡ Amélioration</SelectItem>
                        <SelectItem value="fix">🐛 Correctif</SelectItem>
                        <SelectItem value="security">🔒 Sécurité</SelectItem>
                        <SelectItem value="breaking">💥 Changement majeur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Version <span className="font-normal text-muted-foreground/60">(optionnel pour actualités)</span>
                    </label>
                    <Input
                      placeholder="1.2.0"
                      value={form.version}
                      onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))}
                    />
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
                    Contenu * <span className="font-normal text-muted-foreground/60">(Markdown supporté)</span>
                  </label>
                  <Textarea
                    placeholder="Décrivez les changements…&#10;&#10;## Points clés&#10;- Nouvelle fonctionnalité X&#10;- Correction du bug Y"
                    value={form.content}
                    onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                    rows={10}
                    className="resize-none font-mono text-xs"
                  />
                </div>

                {/* Banner upload */}
                <BannerField
                  value={form.bannerUrl}
                  onChange={(url) => setForm((p) => ({ ...p, bannerUrl: url }))}
                />

                {formError && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{formError}</p>
                )}
              </div>
            </TabsContent>

            {/* Preview tab */}
            <TabsContent value="preview" className="m-0 min-h-0 flex-1 overflow-y-auto">
              <div className="p-6">
                {form.title || form.content ? (
                  <div className={cn(
                    'overflow-hidden rounded-2xl border border-border/50 bg-card border-l-4',
                    TYPE_CFG[form.type].accent,
                  )}>
                    {form.bannerUrl && (
                      <img
                        src={resolveMediaUrl(form.bannerUrl) ?? form.bannerUrl}
                        alt=""
                        className="w-full max-h-44 object-cover"
                      />
                    )}
                    <div className="px-4 pt-4 pb-3">
                      <div className="mb-2 flex flex-wrap items-center gap-1.5">
                        {(() => {
                          const cfg = TYPE_CFG[form.type];
                          const Icon = cfg.icon;
                          return (
                            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none', cfg.badge)}>
                              <Icon size={10} />
                              {cfg.label}
                            </span>
                          );
                        })()}
                        {form.version && (
                          <span className="rounded-md border border-border/60 px-2 py-0.5 font-mono text-[11px] leading-none text-muted-foreground">
                            v{form.version}
                          </span>
                        )}
                        <time className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                          {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </time>
                      </div>
                      {form.title && <h2 className="text-sm font-semibold text-foreground">{form.title}</h2>}
                    </div>
                    {form.content && (
                      <div className="px-4 pb-4 text-sm text-muted-foreground">
                        <MarkdownRenderer content={form.content} />
                      </div>
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
              disabled={submitting || !form.title.trim() || !form.content.trim()}
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
              <strong>{deleteTarget?.title}</strong>
              {deleteTarget?.version && <> — v{deleteTarget.version}</>}
              <br />
              Cette action est irréversible.
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
