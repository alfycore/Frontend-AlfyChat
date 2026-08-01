'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input }  from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { PlusIcon, Edit2Icon, Trash2Icon } from '@/components/icons';
import { api } from '@/lib/api';
import { sanitizeSvg } from '@/lib/sanitize';
import { UICONS_LIST, renderBadgeIcon } from '../_shared';

const DEFAULT_FORM = {
  name: '', description: '',
  iconType: 'bootstrap' as 'bootstrap' | 'svg' | 'flaticon',
  iconValue: '', color: '#5865F2', displayOrder: 999,
};

export default function AdminBadgesPage() {
  const [badges, setBadges]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm]       = useState({ ...DEFAULT_FORM });
  const [iconSearch, setIconSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.getAdminBadges();
    if (r.success && r.data) setBadges(r.data as any[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const reset = () => { setForm({ ...DEFAULT_FORM }); setEditing(null); setIconSearch(''); };

  const openEdit = (b: any) => {
    setEditing(b);
    setForm({ name: b.name, description: b.description || '', iconType: b.iconType, iconValue: b.iconValue, color: b.color, displayOrder: b.displayOrder });
    setShowDialog(true);
  };

  const save = async () => {
    if (editing) await api.updateBadge(editing.id, form);
    else         await api.createBadge(form);
    setShowDialog(false); reset(); load();
  };

  const filtered = UICONS_LIST.filter(i =>
    i.label.toLowerCase().includes(iconSearch.toLowerCase()) ||
    i.value.toLowerCase().includes(iconSearch.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Badges</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {loading ? '…' : `${badges.length} badge${badges.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button size="sm" onClick={() => { reset(); setShowDialog(true); }}>
          <PlusIcon className="size-4" /> Créer un badge
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : badges.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-muted">
            <i className="fi fi-br-badge text-2xl text-muted-foreground" />
          </div>
          <p className="font-medium">Aucun badge</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Créez votre premier badge pour récompenser les utilisateurs.</p>
          <Button size="sm" className="mt-4" onClick={() => { reset(); setShowDialog(true); }}>
            <PlusIcon className="size-4" /> Créer un badge
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map(b => (
            <div
              key={b.id}
              className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-border bg-card p-4 transition-all duration-150 hover:shadow-sm"
            >
              {/* Icon */}
              <div
                className="flex size-14 shrink-0 items-center justify-center rounded-xl text-2xl"
                style={{ backgroundColor: b.color + '18', border: `2px solid ${b.color}30` }}
              >
                {renderBadgeIcon(b.iconType, b.iconValue, b.color, 'text-2xl')}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{b.name}</p>
                  <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: b.color + '18', color: b.color }}>
                    #{b.displayOrder}
                  </span>
                </div>
                {b.description && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{b.description}</p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <Switch
                    checked={b.isActive}
                    onCheckedChange={() => api.toggleBadgeStatus(b.id, !b.isActive).then(load)}
                  />
                  <span className="text-xs text-muted-foreground">{b.isActive ? 'Actif' : 'Inactif'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => openEdit(b)}
                  className="flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Edit2Icon className="size-3.5" />
                </button>
                <button
                  onClick={() => confirm('Supprimer ce badge ?') && api.deleteBadge(b.id).then(load)}
                  className="flex size-7 items-center justify-center rounded-md border border-destructive/20 bg-background text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Trash2Icon className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={o => { setShowDialog(o); if (!o) reset(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le badge' : 'Créer un badge'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Preview */}
            <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-xl text-3xl"
                style={{ backgroundColor: form.color + '18', border: `2px solid ${form.color}30` }}>
                {renderBadgeIcon(form.iconType, form.iconValue, form.color, 'text-3xl')}
              </div>
              <div>
                <p className="font-bold">{form.name || 'Nom du badge'}</p>
                <p className="text-sm text-muted-foreground">{form.description || 'Description'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nom *</label>
                <Input placeholder="Développeur officiel" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Ordre</label>
                <Input type="number" value={form.displayOrder} onChange={e => setForm(p => ({ ...p, displayOrder: parseInt(e.target.value) || 999 }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full resize-none rounded-lg border border-input bg-background p-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                rows={2} placeholder="Description" value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Type d&apos;icône</label>
                <select className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                  value={form.iconType} onChange={e => setForm(p => ({ ...p, iconType: e.target.value as any, iconValue: '' }))}>
                  <option value="bootstrap">Bootstrap (uicons)</option>
                  <option value="flaticon">Flaticon (CSS)</option>
                  <option value="svg">SVG personnalisé</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Couleur</label>
                <div className="flex gap-2">
                  <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-background" />
                  <Input value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} />
                </div>
              </div>
            </div>

            {form.iconType === 'bootstrap' && (
              <div className="space-y-2">
                <Input placeholder="Rechercher une icône…" value={iconSearch} onChange={e => setIconSearch(e.target.value)} />
                <div className="h-48 overflow-y-auto rounded-lg border border-border p-2">
                  <div className="grid grid-cols-6 gap-1.5">
                    {filtered.map(icon => (
                      <button key={icon.value} type="button"
                        className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2.5 transition-all ${form.iconValue === icon.value ? 'border-primary bg-primary/10' : 'border-transparent hover:border-border'}`}
                        onClick={() => setForm(p => ({ ...p, iconValue: icon.value }))}>
                        <i className={`fi fi-br-${icon.value} text-xl`} style={{ color: form.color }} />
                        <span className="text-center text-[9px] leading-tight text-muted-foreground">{icon.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {form.iconType === 'flaticon' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Classe CSS</label>
                <Input placeholder="fi fi-rr-heart" value={form.iconValue} onChange={e => setForm(p => ({ ...p, iconValue: e.target.value }))} />
              </div>
            )}

            {form.iconType === 'svg' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Fichier SVG</label>
                <input type="file" accept=".svg" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setForm(p => ({ ...p, iconValue: r.result as string })); r.readAsText(f); } }} />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={save} disabled={!form.name || !form.iconValue}>
              {editing ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
