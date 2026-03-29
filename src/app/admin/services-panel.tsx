'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCwIcon,
  CpuIcon,
  ActivityIcon,
  ZapIcon,
  GlobeIcon,
  ClockIcon,
  Trash2Icon,
  ServerIcon,
  PlusIcon,
  XIcon,
} from 'lucide-react';
import { api } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

type ServiceType = 'users' | 'messages' | 'friends' | 'calls' | 'servers' | 'bots' | 'media';

interface ServiceMetrics {
  ramUsage: number;
  ramMax: number;
  cpuUsage: number;
  cpuMax: number;
  bandwidthUsage: number;
  requestCount20min: number;
  responseTimeMs?: number;
}

interface ServiceInstance {
  id: string;
  serviceType: ServiceType;
  endpoint: string;
  domain: string;
  location: string;
  healthy: boolean;
  score: number;
  registeredAt: string;
  lastHeartbeat: string;
  metrics?: ServiceMetrics;
}

// ── Couleurs par type ─────────────────────────────────────────────────────────

const COLORS: Record<ServiceType, { accent: string; bg: string; border: string; text: string }> = {
  users:    { accent: '#a78bfa', bg: 'rgba(167,139,250,0.08)',  border: 'rgba(167,139,250,0.2)',  text: '#c4b5fd' },
  messages: { accent: '#60a5fa', bg: 'rgba(96,165,250,0.08)',   border: 'rgba(96,165,250,0.2)',   text: '#93c5fd' },
  friends:  { accent: '#f472b6', bg: 'rgba(244,114,182,0.08)',  border: 'rgba(244,114,182,0.2)',  text: '#f9a8d4' },
  calls:    { accent: '#34d399', bg: 'rgba(52,211,153,0.08)',   border: 'rgba(52,211,153,0.2)',   text: '#6ee7b7' },
  servers:  { accent: '#fb923c', bg: 'rgba(251,146,60,0.08)',   border: 'rgba(251,146,60,0.2)',   text: '#fdba74' },
  bots:     { accent: '#facc15', bg: 'rgba(250,204,21,0.08)',   border: 'rgba(250,204,21,0.2)',   text: '#fde047' },
  media:    { accent: '#22d3ee', bg: 'rgba(34,211,238,0.08)',   border: 'rgba(34,211,238,0.2)',   text: '#67e8f9' },
};

const ALL_TYPES: ServiceType[] = ['users', 'messages', 'friends', 'calls', 'servers', 'bots', 'media'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(bytes: number) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function ago(dateStr: string) {
  const d = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (d < 60) return `${Math.round(d)}s`;
  if (d < 3600) return `${Math.round(d / 60)}m`;
  if (d < 86400) return `${Math.round(d / 3600)}h`;
  return `${Math.round(d / 86400)}j`;
}

// ── Barre mini ────────────────────────────────────────────────────────────────

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/8">
      <div
        className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const fill = circ * (score / 100);
  const c = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';
  return (
    <div className="relative" style={{ width: 40, height: 40 }}>
      <svg width={40} height={40} viewBox="0 0 40 40" className="-rotate-90">
        <circle cx={20} cy={20} r={r} strokeWidth={3} stroke="rgba(255,255,255,0.08)" fill="none" />
        <circle
          cx={20} cy={20} r={r} strokeWidth={3} fill="none"
          stroke={c}
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold" style={{ color: c }}>{Math.round(score)}</span>
      </div>
    </div>
  );
}

// ── Carte instance ────────────────────────────────────────────────────────────

function InstanceCard({ inst, onDelete }: { inst: ServiceInstance; onDelete: (id: string) => void }) {
  const c = COLORS[inst.serviceType];
  const m = inst.metrics;
  const cpuPct = m?.cpuUsage ?? 0;
  const ramPct = m && m.ramMax > 0 ? Math.round((m.ramUsage / m.ramMax) * 100) : 0;
  const score = Math.round(inst.score);
  const heartbeatAgo = Date.now() - new Date(inst.lastHeartbeat).getTime();
  const stale = heartbeatAgo > 90_000;

  return (
    <div
      className="flex flex-col gap-3 rounded-xl p-4 transition-all duration-200"
      style={{
        background: `linear-gradient(135deg, ${c.bg}, rgba(0,0,0,0))`,
        border: `1px solid ${c.border}`,
      }}
    >
      {/* Top row */}
      <div className="flex items-start gap-2">
        <ScoreRing score={score} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                backgroundColor: inst.healthy && !stale ? c.accent : '#ef4444',
                boxShadow: inst.healthy && !stale ? `0 0 6px ${c.accent}` : 'none',
              }}
            />
            <span className="truncate font-mono text-[13px] font-semibold text-white/90">{inst.id}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 pl-3.5">
            <GlobeIcon size={9} className="shrink-0 text-white/25" />
            <span className="truncate text-[11px] text-white/40">{inst.domain}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
            style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
          >
            {inst.location}
          </span>
          {(!inst.healthy || stale) && (
            <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
              {stale ? 'STALE' : 'DOWN'}
            </span>
          )}
        </div>
      </div>

      {/* Métriques */}
      <div className="space-y-2">
        <div>
          <div className="mb-1 flex justify-between">
            <span className="flex items-center gap-1 text-[10px] text-white/35">
              <CpuIcon size={9} /> CPU
            </span>
            <span className="text-[10px] text-white/55">{cpuPct}%</span>
          </div>
          <Bar pct={cpuPct} color={cpuPct < 60 ? '#22c55e' : cpuPct < 80 ? '#eab308' : '#ef4444'} />
        </div>
        <div>
          <div className="mb-1 flex justify-between">
            <span className="flex items-center gap-1 text-[10px] text-white/35">
              RAM
            </span>
            <span className="text-[10px] text-white/55">
              {m ? `${fmt(m.ramUsage)} / ${fmt(m.ramMax)}` : '—'}
            </span>
          </div>
          <Bar pct={ramPct} color={ramPct < 60 ? '#3b82f6' : ramPct < 80 ? '#eab308' : '#ef4444'} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          {m && (
            <span className="flex items-center gap-1 text-[10px] text-white/40">
              <ActivityIcon size={9} /> {m.requestCount20min} req/20m
            </span>
          )}
          {m && m.bandwidthUsage > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-white/40">
              <ZapIcon size={9} /> {fmt(m.bandwidthUsage)}/s
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 text-[10px] ${stale ? 'text-red-400' : 'text-white/30'}`}>
            <ClockIcon size={9} /> {ago(inst.lastHeartbeat)}
          </span>
          <button
            onClick={() => onDelete(inst.id)}
            className="rounded-md p-1 text-white/15 transition-colors hover:bg-red-500/12 hover:text-red-400"
            title="Retirer du registre"
          >
            <Trash2Icon size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal ajout ───────────────────────────────────────────────────────────────

function AddModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ id: '', serviceType: 'messages' as ServiceType, endpoint: '', domain: '', location: 'EU' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.id.trim() || !form.endpoint.trim() || !form.domain.trim()) {
      setErr('ID, endpoint et domaine sont requis.'); return;
    }
    setBusy(true);
    try {
      const res = await api.addAdminService(form);
      if (res.success) { onDone(); onClose(); }
      else setErr((res as any).error ?? 'Erreur');
    } catch { setErr('Erreur réseau'); }
    setBusy(false);
  };

  const c = COLORS[form.serviceType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0e0e10] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 text-white/25 hover:text-white/60 transition-colors">
          <XIcon size={16} />
        </button>
        <h3 className="mb-5 text-sm font-semibold text-white">Ajouter une instance</h3>

        {/* Type */}
        <label className="mb-1.5 block text-[11px] text-white/40">Type</label>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {ALL_TYPES.map(t => (
            <button key={t} onClick={() => setForm(f => ({ ...f, serviceType: t }))}
              className="rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all"
              style={form.serviceType === t
                ? { background: COLORS[t].bg, color: COLORS[t].text, border: `1px solid ${COLORS[t].border}` }
                : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.06)' }
              }>{t}</button>
          ))}
        </div>

        <div className="space-y-3">
          {[
            { key: 'id', label: 'ID unique', placeholder: `${form.serviceType}-eu-2` },
            { key: 'endpoint', label: 'Endpoint interne', placeholder: `http://1.${form.serviceType}.alfychat.eu:3002` },
            { key: 'domain', label: 'Domaine public', placeholder: `1.${form.serviceType}.alfychat.eu` },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="mb-1 block text-[11px] text-white/40">{label}</label>
              <input
                className="w-full rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-white/18 transition-colors"
                placeholder={placeholder}
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}

          <div>
            <label className="mb-1 block text-[11px] text-white/40">Région</label>
            <div className="flex gap-1.5">
              {['EU', 'US', 'ASIA', 'AU'].map(loc => (
                <button key={loc} onClick={() => setForm(f => ({ ...f, location: loc }))}
                  className="flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-all"
                  style={form.location === loc
                    ? { background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.06)' }
                  }>{loc}</button>
              ))}
            </div>
          </div>
        </div>

        {err && <p className="mt-3 text-xs text-red-400">{err}</p>}

        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-white/8 py-2.5 text-sm text-white/40 hover:bg-white/4 transition-colors">Annuler</button>
          <button onClick={submit} disabled={busy}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition-all disabled:opacity-50"
            style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
          >{busy ? 'Ajout…' : 'Ajouter'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Panel principal ───────────────────────────────────────────────────────────

export function ServicesPanel() {
  const [instances, setInstances] = useState<ServiceInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchInstances = useCallback(async () => {
    try {
      const res = await api.getAdminServices();
      if (res.success && res.data) {
        setInstances((res.data as any).instances ?? []);
        setLastUpdated(new Date());
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstances();
    timerRef.current = setInterval(fetchInstances, 15_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchInstances]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm(`Retirer "${id}" du registre ?`)) return;
    try {
      await api.deleteAdminService(id);
      setInstances(prev => prev.filter(i => i.id !== id));
    } catch { /* silent */ }
  }, []);

  const totalHealthy = instances.filter(i => i.healthy).length;
  const activeTypes = ALL_TYPES.filter(t => instances.some(i => i.serviceType === t));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Instances de services</h2>
          <p className="mt-0.5 text-xs text-white/35">
            {instances.length} instance{instances.length !== 1 ? 's' : ''} ·{' '}
            <span className="text-emerald-400">{totalHealthy} sain{totalHealthy !== 1 ? 's' : ''}</span>
            {instances.length - totalHealthy > 0 && <span className="text-red-400"> · {instances.length - totalHealthy} hors ligne</span>}
            {lastUpdated && <span className="text-white/20"> · maj {ago(lastUpdated.toISOString())}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchInstances} disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-white/45 transition-colors hover:bg-white/7 disabled:opacity-40">
            <RefreshCwIcon size={12} className={loading ? 'animate-spin' : ''} />
            Rafraîchir
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-lg bg-white/8 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/12">
            <PlusIcon size={12} /> Ajouter
          </button>
        </div>
      </div>

      {/* Type pills */}
      <div className="flex flex-wrap gap-1.5">
        {ALL_TYPES.map(type => {
          const typeInsts = instances.filter(i => i.serviceType === type);
          const c = COLORS[type];
          const healthy = typeInsts.filter(i => i.healthy).length;
          return (
            <div key={type} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px]"
              style={{ background: typeInsts.length ? c.bg : 'rgba(255,255,255,0.03)', border: `1px solid ${typeInsts.length ? c.border : 'rgba(255,255,255,0.06)'}` }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: healthy > 0 ? c.accent : '#6b7280' }} />
              <span style={{ color: typeInsts.length ? c.text : 'rgba(255,255,255,0.2)' }} className="font-medium capitalize">{type}</span>
              {typeInsts.length > 0 && <span className="text-white/25">{typeInsts.length}</span>}
            </div>
          );
        })}
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCwIcon size={20} className="animate-spin text-white/20" />
        </div>
      ) : instances.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/6 py-16 text-center"
          style={{ background: 'rgba(255,255,255,0.02)' }}>
          <ServerIcon size={28} className="mb-3 text-white/12" />
          <p className="text-sm text-white/30">Aucune instance enregistrée</p>
          <p className="mt-1 text-xs text-white/18">Les services s&apos;enregistrent automatiquement au démarrage</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTypes.map(type => {
            const c = COLORS[type];
            const typeInsts = instances.filter(i => i.serviceType === type).sort((a, b) => b.score - a.score);
            return (
              <div key={type}>
                {/* Section label */}
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-px flex-1" style={{ backgroundColor: c.border }} />
                  <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest"
                    style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.accent }} />
                    {type}
                    <span className="opacity-50">·</span>
                    <span className="opacity-50">{typeInsts.length}</span>
                  </span>
                  <div className="h-px flex-1" style={{ backgroundColor: c.border }} />
                </div>

                {/* Cards */}
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(255px, 1fr))' }}>
                  {typeInsts.map(inst => (
                    <InstanceCard key={inst.id} inst={inst} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onDone={fetchInstances} />}
    </div>
  );
}
