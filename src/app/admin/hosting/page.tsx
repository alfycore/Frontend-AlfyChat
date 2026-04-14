'use client';

import { useState, useEffect, useCallback } from 'react';
import { hostingApi } from '@/lib/hosting-api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['all', 'pending', 'active', 'suspended', 'banned'] as const;
type FilterStatus = typeof STATUS_OPTIONS[number];

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  suspended: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  banned: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function AdminHostingPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [provRes, statsRes] = await Promise.all([
        hostingApi.adminListProviders({ page, status: filter !== 'all' ? filter : undefined }),
        hostingApi.adminStats(),
      ]);
      const provData = (provRes as any)?.data ?? provRes ?? {};
      setProviders(Array.isArray(provData.providers ?? provData) ? (provData.providers ?? provData) : []);
      setTotal(provData.total ?? 0);
      setStats((statsRes as any)?.data ?? statsRes ?? {});
    } catch {
      toast.error('Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { loadData(); }, [loadData]);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      await hostingApi.adminSetProviderStatus(id, status);
      toast.success(`Statut mis à jour : ${status}`);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur mise à jour');
    } finally {
      setUpdating(null);
    }
  }

  const filtered = search
    ? providers.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()))
    : providers;

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Titre */}
        <div>
          <h1 className="text-2xl font-bold">Admin — Hébergeurs</h1>
          <p className="text-muted-foreground text-sm">Gestion des partenaires hébergeurs AlfyChat</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total hébergeurs" value={stats.total_providers ?? 0} icon="server" color="blue" />
            <StatCard label="En attente" value={stats.pending_providers ?? 0} icon="clock" color="yellow" />
            <StatCard label="Actifs" value={stats.active_providers ?? 0} icon="check-circle" color="emerald" />
            <StatCard label="Nœuds en ligne" value={(stats.online_db_nodes ?? 0) + (stats.online_media_nodes ?? 0)} icon="hdd-stack" color="purple" />
          </div>
        )}

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <div className="flex gap-1 bg-white/5 p-1 rounded-lg overflow-x-auto">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => { setFilter(s); setPage(1); }}
                className={`px-3 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${
                  filter === s ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Liste hébergeurs */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <i className="bi bi-server text-5xl block mb-2 opacity-20" />
            <p>Aucun hébergeur trouvé</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(provider => (
              <Card key={provider.id} className="bg-white/5 border-white/10">
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold">{provider.name}</span>
                        <span className="text-muted-foreground text-xs">@{provider.slug}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[provider.status] || ''}`}>
                          {provider.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{provider.email}</p>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                        {provider.country_code && <span><i className="bi bi-flag mr-1" />{provider.country_code}</span>}
                        {provider.website_url && (
                          <a href={provider.website_url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                            <i className="bi bi-globe2 mr-1" />{provider.website_url}
                          </a>
                        )}
                        <span><i className="bi bi-calendar mr-1" />{new Date(provider.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {provider.status === 'pending' && (
                        <Button
                          size="sm"
                          disabled={updating === provider.id}
                          onClick={() => updateStatus(provider.id, 'active')}
                          className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs"
                        >
                          <i className="bi bi-check-lg mr-1" />Approuver
                        </Button>
                      )}
                      {provider.status === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updating === provider.id}
                          onClick={() => updateStatus(provider.id, 'suspended')}
                          className="h-7 text-xs border-orange-500/40 text-orange-400 hover:bg-orange-500/10"
                        >
                          <i className="bi bi-pause-circle mr-1" />Suspendre
                        </Button>
                      )}
                      {(provider.status === 'suspended' || provider.status === 'pending') && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updating === provider.id}
                          onClick={() => updateStatus(provider.id, 'banned')}
                          className="h-7 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10"
                        >
                          <i className="bi bi-ban mr-1" />Bannir
                        </Button>
                      )}
                      {(provider.status === 'suspended' || provider.status === 'banned') && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updating === provider.id}
                          onClick={() => updateStatus(provider.id, 'active')}
                          className="h-7 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <i className="bi bi-check2-circle mr-1" />Réactiver
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <i className="bi bi-chevron-left" />
            </Button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <Button variant="outline" size="sm" disabled={providers.length < 20} onClick={() => setPage(p => p + 1)}>
              <i className="bi bi-chevron-right" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    purple: 'bg-purple-500/10 text-purple-400',
  };
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="pt-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
          <i className={`bi bi-${icon}`} />
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
