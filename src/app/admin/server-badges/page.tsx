'use client';

import { useEffect, useState, useCallback } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge }  from '@/components/ui/badge';
import { CheckCircle2Icon, HandshakeIcon } from '@/components/icons';
import { api } from '@/lib/api';

const PAGE_SIZE = 15;

export default function AdminServerBadgesPage() {
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(0);
  const [search, setSearch]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.getAllServersAdmin();
    if (r.success && r.data) {
      const d = r.data as any;
      setServers(Array.isArray(d) ? d : (d.servers ?? []));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = servers.filter(s =>
    !search || (s.name || '').toLowerCase().includes(search.toLowerCase())
  );
  const paged   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const maxPage = Math.ceil(filtered.length / PAGE_SIZE) - 1;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Badges serveurs</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Découverte, certification et partenariats.</p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">{filtered.length} serveurs</span>
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder="Rechercher un serveur…"
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(0); }}
        className="mb-4 h-9 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      />

      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <p className="font-medium">Aucun serveur</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b border-border bg-muted/30 px-5 py-2.5">
              <span className="text-xs font-medium text-muted-foreground">Serveur</span>
              <span className="w-20 text-center text-xs font-medium text-muted-foreground">Membres</span>
              <span className="w-24 text-center text-xs font-medium text-muted-foreground">Découverte</span>
              <span className="w-20 text-center text-xs font-medium text-muted-foreground">Certifié</span>
              <span className="w-20 text-center text-xs font-medium text-muted-foreground">Partenaire</span>
            </div>

            <div className="divide-y divide-border">
              {paged.map(s => {
                const isFeatured   = s.discovery_status === 'approved';
                const isCertified  = !!(s.is_certified || s.isCertified);
                const isPartnered  = !!(s.is_partnered || s.isPartnered);

                return (
                  <div
                    key={s.id}
                    className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/20"
                  >
                    {/* Server info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted font-bold">
                        {(s.icon_url || s.iconUrl)
                          ? <img src={s.icon_url || s.iconUrl} alt="" className="size-full object-cover" />
                          : (s.name || '?')[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate font-medium">{s.name}</p>
                          {isCertified  && <CheckCircle2Icon className="size-3.5 shrink-0 text-blue-500" />}
                          {isPartnered  && <HandshakeIcon    className="size-3.5 shrink-0 text-purple-500" />}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{s.description || 'Aucune description'}</p>
                      </div>
                    </div>

                    <div className="flex w-20 justify-center">
                      <Badge variant="secondary">{s.member_count ?? s.memberCount ?? '?'}</Badge>
                    </div>

                    <div className="flex w-24 flex-col items-center gap-1">
                      <Switch
                        checked={isFeatured}
                        onCheckedChange={v =>
                          (v ? api.featureServer(s.id) : api.unfeatureServer(s.id)).then(() =>
                            setServers(prev => prev.map(x => x.id === s.id ? { ...x, discovery_status: v ? 'approved' : null } : x))
                          )
                        }
                      />
                      {isFeatured && <span className="text-[10px] font-medium text-green-500">Actif</span>}
                    </div>

                    <div className="flex w-20 flex-col items-center gap-1">
                      <Switch
                        disabled={!isFeatured}
                        checked={isCertified}
                        onCheckedChange={v =>
                          api.updateServerBadges(s.id, { isCertified: v }).then(() =>
                            setServers(prev => prev.map(x => x.id === s.id ? { ...x, is_certified: v } : x))
                          )
                        }
                      />
                      {isCertified && <span className="text-[10px] font-medium text-blue-500">Certifié</span>}
                    </div>

                    <div className="flex w-20 flex-col items-center gap-1">
                      <Switch
                        disabled={!isFeatured}
                        checked={isPartnered}
                        onCheckedChange={v =>
                          api.updateServerBadges(s.id, { isPartnered: v }).then(() =>
                            setServers(prev => prev.map(x => x.id === s.id ? { ...x, is_partnered: v } : x))
                          )
                        }
                      />
                      {isPartnered && <span className="text-[10px] font-medium text-purple-500">Partenaire</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {filtered.length > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} sur {filtered.length}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-40"
                >
                  ← Précédent
                </button>
                <button
                  disabled={page >= maxPage}
                  onClick={() => setPage(p => p + 1)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-40"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
