'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button }    from '@/components/ui/button';
import { Badge }     from '@/components/ui/badge';
import { Input }     from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { SearchIcon, AwardIcon, XIcon, UserPlusIcon } from '@/components/icons';
import { api } from '@/lib/api';
import { renderBadgeIcon } from '../_shared';

const ROLES: Record<string, { label: string; color: string }> = {
  admin:       { label: 'Admin',       color: 'bg-purple-500/15 text-purple-500 border-purple-500/25' },
  moderator:   { label: 'Modérateur',  color: 'bg-blue-500/15 text-blue-500 border-blue-500/25' },
  support_l1:  { label: 'Support N1',  color: 'bg-teal-500/15 text-teal-500 border-teal-500/25' },
  support_l2:  { label: 'Support N2',  color: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/25' },
  technician:  { label: 'Technicien',  color: 'bg-amber-500/15 text-amber-500 border-amber-500/25' },
  user:        { label: 'Utilisateur', color: 'bg-muted text-muted-foreground border-border' },
};

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const colors = [
    'bg-purple-500/20 text-purple-600',
    'bg-blue-500/20 text-blue-600',
    'bg-green-500/20 text-green-600',
    'bg-amber-500/20 text-amber-600',
    'bg-red-500/20 text-red-600',
    'bg-teal-500/20 text-teal-600',
    'bg-indigo-500/20 text-indigo-600',
    'bg-pink-500/20 text-pink-600',
  ];
  const color = colors[(name.charCodeAt(0) || 0) % colors.length];
  const dim = size === 'sm' ? 'size-7 text-[11px]' : 'size-9 text-sm';
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${dim} ${color}`}>
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers]     = useState<any[]>([]);
  const [badges, setBadges]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [showAssign, setShowAssign] = useState(false);
  const [selected, setSelected]     = useState<any>(null);
  const [userBadges, setUserBadges] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [ur, br] = await Promise.all([api.getAdminUsers(100, 0), api.getAdminBadges()]);
    if (ur.success && ur.data) setUsers(ur.data as any[]);
    if (br.success && br.data) setBadges(br.data as any[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSearch = async (q: string) => {
    setSearch(q);
    if (!q.trim()) { load(); return; }
    const r = await api.searchAdminUsers(q);
    if (r.success && r.data) setUsers(r.data as any[]);
  };

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utilisateurs</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {loading ? '…' : `${users.length} compte${users.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9 h-10"
          placeholder="Rechercher par nom, username ou email…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="divide-y divide-border">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="size-9 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-48 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
                <div className="h-6 w-24 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <SearchIcon className="mb-3 size-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">Aucun utilisateur trouvé</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Essayez un autre terme de recherche.</p>
          </div>
        ) : (
          <>
            {/* Header row */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 border-b border-border bg-muted/30 px-5 py-2.5">
              <div className="size-9" />
              <span className="text-xs font-medium text-muted-foreground">Utilisateur</span>
              <span className="text-xs font-medium text-muted-foreground w-28 text-center">Statut</span>
              <span className="text-xs font-medium text-muted-foreground w-32">Rôle</span>
              <span className="hidden text-xs font-medium text-muted-foreground sm:block w-20">Inscrit</span>
              <span className="w-8" />
            </div>
            <div className="divide-y divide-border">
              {users.map(u => {
                const role = ROLES[u.role || 'user'] ?? ROLES.user;
                return (
                  <div
                    key={u.id}
                    className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/20"
                  >
                    <Avatar name={u.displayName || u.username || '?'} />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{u.displayName}</p>
                        {/* badges preview */}
                        {(u.badges || []).slice(0, 3).map((b: any, i: number) => (
                          <span
                            key={i}
                            className="flex size-5 items-center justify-center rounded"
                            style={{ backgroundColor: (b.color || '#5865F2') + '22' }}
                            title={b.name}
                          >
                            {renderBadgeIcon(b.iconType || 'bootstrap', b.iconValue || b.icon, b.color || '#5865F2', 'text-[11px]')}
                          </span>
                        ))}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">@{u.username} · {u.email}</p>
                    </div>

                    {/* Online status */}
                    <div className="flex w-28 justify-center">
                      {u.isOnline ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-green-500">
                          <span className="relative flex size-2">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
                          </span>
                          En ligne
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Hors ligne</span>
                      )}
                    </div>

                    {/* Role selector */}
                    <div className="w-32">
                      <div className="relative">
                        <select
                          className={`h-7 w-full cursor-pointer appearance-none rounded-full border px-2.5 text-xs font-medium transition-colors ${role.color}`}
                          value={u.role || 'user'}
                          onChange={e => api.updateUserRole(u.id, e.target.value as any).then(load)}
                        >
                          {Object.entries(ROLES).map(([v, { label }]) => (
                            <option key={v} value={v}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Date */}
                    <span className="hidden w-20 text-xs text-muted-foreground sm:block">
                      {new Date(u.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </span>

                    {/* Actions */}
                    <button
                      title="Gérer les badges"
                      onClick={() => { setSelected(u); setUserBadges(u.badges || []); setShowAssign(true); }}
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <AwardIcon className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Badge assign dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              {selected && <Avatar name={selected.displayName || '?'} size="sm" />}
              Badges de {selected?.displayName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attribués</p>
              {userBadges.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  Aucun badge attribué
                </p>
              ) : (
                <div className="space-y-1.5">
                  {userBadges.map((b: any) => (
                    <div key={b.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg" style={{ backgroundColor: (b.color || '#5865F2') + '22' }}>
                        {renderBadgeIcon(b.iconType || 'bootstrap', b.iconValue || b.icon, b.color || '#5865F2', 'text-sm')}
                      </div>
                      <span className="flex-1 text-sm font-medium">{b.name}</span>
                      <button
                        onClick={() => api.removeBadgeFromUser(selected.id, b.id).then(() => { setUserBadges(p => p.filter((x: any) => x.id !== b.id)); load(); })}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <XIcon className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Separator />
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Disponibles</p>
              <div className="space-y-1.5">
                {badges
                  .filter(b => b.isActive !== false && !userBadges.some((x: any) => x.id === b.id))
                  .map(badge => (
                    <div key={badge.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted/30">
                      <div className="flex size-8 items-center justify-center rounded-lg" style={{ backgroundColor: badge.color + '22' }}>
                        {renderBadgeIcon(badge.iconType, badge.iconValue, badge.color, 'text-sm')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{badge.name}</p>
                        {badge.description && <p className="text-xs text-muted-foreground truncate">{badge.description}</p>}
                      </div>
                      <button
                        onClick={() => api.assignBadgeToUser(selected.id, badge.id).then(() => { setUserBadges(p => [...p, badge]); load(); })}
                        className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                      >
                        <UserPlusIcon className="size-3.5" /> Ajouter
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button>Fermer</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
