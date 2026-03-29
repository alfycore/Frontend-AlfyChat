'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ServerIcon,
  PlusIcon,
  Trash2Icon,
  CheckCircle2Icon,
  XCircleIcon,
  RefreshCwIcon,
  GripVerticalIcon,
  XIcon,
  CpuIcon,
  MemoryStickIcon,
  ActivityIcon,
  ZapIcon,
  GlobeIcon,
  LinkIcon,
} from 'lucide-react';

type ServiceType = 'users' | 'messages' | 'friends' | 'calls' | 'servers' | 'bots' | 'media';

export type ServiceInstance = {
  id: string;
  serviceType: ServiceType;
  endpoint: string;
  domain: string;
  location: string;
  healthy: boolean;
  score: number;
  registeredAt: string;
  lastHeartbeat: string;
  metrics?: {
    ramUsage: number;
    ramMax: number;
    cpuUsage: number;
    cpuMax: number;
    bandwidthUsage: number;
    requestCount20min: number;
    responseTimeMs?: number;
  };
};

interface Props {
  instances: ServiceInstance[];
  loading: boolean;
  onRefresh: () => void;
  onAdd: (data: {
    id: string;
    serviceType: ServiceType;
    endpoint: string;
    domain: string;
    location: string;
  }) => Promise<{ success: boolean; error?: string }>;
  onDelete: (id: string) => Promise<void>;
}

// ── Couleurs Railway par type ────────────────────────────────────────────────
const TYPE_COLORS: Record<ServiceType, {
  gradient: string;
  border: string;
  badge: string;
  badgeText: string;
  dot: string;
  glow: string;
}> = {
  users:    { gradient: 'from-violet-600/20 to-violet-600/5',  border: 'border-violet-500/25', badge: 'bg-violet-500/15', badgeText: 'text-violet-300', dot: 'bg-violet-400',  glow: 'shadow-violet-500/20' },
  messages: { gradient: 'from-blue-600/20 to-blue-600/5',      border: 'border-blue-500/25',   badge: 'bg-blue-500/15',   badgeText: 'text-blue-300',   dot: 'bg-blue-400',    glow: 'shadow-blue-500/20'   },
  friends:  { gradient: 'from-pink-600/20 to-pink-600/5',      border: 'border-pink-500/25',   badge: 'bg-pink-500/15',   badgeText: 'text-pink-300',   dot: 'bg-pink-400',    glow: 'shadow-pink-500/20'   },
  calls:    { gradient: 'from-emerald-600/20 to-emerald-600/5',border: 'border-emerald-500/25',badge: 'bg-emerald-500/15',badgeText: 'text-emerald-300',dot: 'bg-emerald-400', glow: 'shadow-emerald-500/20'},
  servers:  { gradient: 'from-orange-600/20 to-orange-600/5',  border: 'border-orange-500/25', badge: 'bg-orange-500/15', badgeText: 'text-orange-300', dot: 'bg-orange-400',  glow: 'shadow-orange-500/20' },
  bots:     { gradient: 'from-yellow-600/20 to-yellow-600/5',  border: 'border-yellow-500/25', badge: 'bg-yellow-500/15', badgeText: 'text-yellow-300', dot: 'bg-yellow-400',  glow: 'shadow-yellow-500/20' },
  media:    { gradient: 'from-cyan-600/20 to-cyan-600/5',      border: 'border-cyan-500/25',   badge: 'bg-cyan-500/15',   badgeText: 'text-cyan-300',   dot: 'bg-cyan-400',    glow: 'shadow-cyan-500/20'   },
};

const ALL_TYPES: ServiceType[] = ['users', 'messages', 'friends', 'calls', 'servers', 'bots', 'media'];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return `${Math.round(diff / 1000)}s`;
  if (diff < 3600000) return `${Math.round(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h`;
  return `${Math.round(diff / 86400000)}j`;
}

// ── Mini gauge circulaire SVG ────────────────────────────────────────────────
function CircleGauge({ value, size = 44, color }: { value: number; size?: number; color: string }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * (Math.min(100, Math.max(0, value)) / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={4} stroke="rgba(255,255,255,0.07)" fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r} strokeWidth={4} fill="none"
        stroke={color}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

// ── Barre de progression mini ────────────────────────────────────────────────
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ── Carte d'instance ─────────────────────────────────────────────────────────
function InstanceCard({
  instance,
  colors,
  onDelete,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  instance: ServiceInstance;
  colors: typeof TYPE_COLORS[ServiceType];
  onDelete: (id: string) => void;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const m = instance.metrics;
  const cpuPct = m ? m.cpuUsage : 0;
  const ramPct = m && m.ramMax > 0 ? Math.round((m.ramUsage / m.ramMax) * 100) : 0;
  const score = Math.round(instance.score);

  const scoreColor = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';
  const cpuColor = cpuPct < 60 ? '#22c55e' : cpuPct < 80 ? '#eab308' : '#ef4444';
  const ramColor = ramPct < 60 ? '#3b82f6' : ramPct < 80 ? '#eab308' : '#ef4444';

  const heartbeatAge = Date.now() - new Date(instance.lastHeartbeat).getTime();
  const isStale = heartbeatAge > 60000; // > 1min sans heartbeat

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`
        group relative flex flex-col gap-3 rounded-xl border bg-linear-to-b p-4 transition-all duration-200
        ${colors.gradient} ${colors.border}
        ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'}
        hover:shadow-lg hover:${colors.glow} cursor-default select-none
      `}
    >
      {/* Drag handle */}
      <div
        className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab opacity-0 group-hover:opacity-30 active:cursor-grabbing transition-opacity"
        title="Déplacer"
      >
        <GripVerticalIcon size={14} className="text-white" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {/* Status dot */}
            <span
              className={`inline-block h-2 w-2 shrink-0 rounded-full ${instance.healthy && !isStale ? colors.dot : 'bg-red-500'} ${instance.healthy && !isStale ? 'shadow-[0_0_6px_var(--dot-glow)]' : ''}`}
              style={{ '--dot-glow': colors.dot } as any}
            />
            <span className="truncate font-mono text-sm font-semibold text-white/90" title={instance.id}>
              {instance.id}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 pl-3.5">
            <GlobeIcon size={10} className="text-white/30 shrink-0" />
            <span className="truncate text-[11px] text-white/40" title={instance.domain}>
              {instance.domain}
            </span>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colors.badge} ${colors.badgeText}`}>
            {instance.location}
          </span>
          {!instance.healthy && (
            <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
              OFFLINE
            </span>
          )}
        </div>
      </div>

      {/* Score + métriques */}
      <div className="flex items-center gap-3">
        {/* Score circulaire */}
        <div className="relative shrink-0">
          <CircleGauge value={score} size={44} color={scoreColor} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-bold" style={{ color: scoreColor }}>{score}</span>
          </div>
        </div>

        {/* CPU + RAM */}
        <div className="flex-1 space-y-2 min-w-0">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1 text-[10px] text-white/40">
                <CpuIcon size={9} /> CPU
              </span>
              <span className="text-[10px] font-medium text-white/60">{cpuPct}%</span>
            </div>
            <MiniBar value={cpuPct} max={100} color={cpuColor} />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1 text-[10px] text-white/40">
                <MemoryStickIcon size={9} /> RAM
              </span>
              <span className="text-[10px] font-medium text-white/60">
                {m ? `${formatBytes(m.ramUsage)} / ${formatBytes(m.ramMax)}` : '—'}
              </span>
            </div>
            <MiniBar value={ramPct} max={100} color={ramColor} />
          </div>
        </div>
      </div>

      {/* Stats bas */}
      <div className="flex items-center justify-between border-t border-white/8 pt-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <ActivityIcon size={10} className="text-white/30" />
            <span className="text-[11px] text-white/50">
              {m ? `${m.requestCount20min} req/20m` : '—'}
            </span>
          </div>
          {m && m.bandwidthUsage > 0 && (
            <div className="flex items-center gap-1">
              <ZapIcon size={10} className="text-white/30" />
              <span className="text-[11px] text-white/50">{formatBytes(m.bandwidthUsage)}/s</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] ${isStale ? 'text-red-400' : 'text-white/30'}`}>
            ↻ {timeAgo(instance.lastHeartbeat)}
          </span>
          <button
            onClick={() => onDelete(instance.id)}
            className="rounded-lg p-1.5 text-white/20 transition-colors hover:bg-red-500/15 hover:text-red-400"
            title="Retirer du registre"
          >
            <Trash2Icon size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal d'ajout ─────────────────────────────────────────────────────────────
function AddModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: Props['onAdd'];
}) {
  const [form, setForm] = useState({
    id: '',
    serviceType: 'messages' as ServiceType,
    endpoint: '',
    domain: '',
    location: 'EU',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.id.trim() || !form.endpoint.trim() || !form.domain.trim()) {
      setError('ID, endpoint et domaine sont requis.');
      return;
    }
    setError('');
    setSubmitting(true);
    const res = await onAdd(form);
    setSubmitting(false);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Erreur lors de l\'ajout.');
    }
  };

  const colors = TYPE_COLORS[form.serviceType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d0d0f] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-white/30 hover:text-white/70 transition-colors">
          <XIcon size={16} />
        </button>

        <h3 className="mb-5 text-base font-semibold text-white">Ajouter une instance</h3>

        <div className="space-y-3">
          {/* Type selector */}
          <div>
            <label className="mb-1.5 block text-xs text-white/40">Type de service</label>
            <div className="flex flex-wrap gap-2">
              {ALL_TYPES.map((t) => {
                const c = TYPE_COLORS[t];
                return (
                  <button
                    key={t}
                    onClick={() => setForm((f) => ({ ...f, serviceType: t }))}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      form.serviceType === t
                        ? `${c.badge} ${c.badgeText} border ${c.border}`
                        : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/8'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fields */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-white/40">ID unique</label>
              <input
                className="w-full rounded-lg border border-white/8 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors"
                placeholder={`${form.serviceType}-eu-2`}
                value={form.id}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-white/40">Région</label>
              <div className="flex gap-1.5">
                {['EU', 'US', 'ASIA', 'AU'].map((loc) => (
                  <button
                    key={loc}
                    onClick={() => setForm((f) => ({ ...f, location: loc }))}
                    className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
                      form.location === loc
                        ? 'bg-white/15 text-white border border-white/20'
                        : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/8'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs text-white/40">Endpoint interne</label>
              <input
                className="w-full rounded-lg border border-white/8 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors"
                placeholder={`http://1.${form.serviceType}.alfychat.eu:300x`}
                value={form.endpoint}
                onChange={(e) => setForm((f) => ({ ...f, endpoint: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs text-white/40">Domaine public</label>
              <input
                className="w-full rounded-lg border border-white/8 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-white/20 transition-colors"
                placeholder={`1.${form.serviceType}.alfychat.eu`}
                value={form.domain}
                onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/8 py-2.5 text-sm text-white/50 hover:bg-white/5 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition-all ${
                colors.badge
              } ${colors.badgeText} border ${colors.border} hover:brightness-125 disabled:opacity-50`}
            >
              {submitting ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Panel principal ───────────────────────────────────────────────────────────
export function ServicesPanel({ instances, loading, onRefresh, onAdd, onDelete }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [order, setOrder] = useState<Record<ServiceType, string[]>>(
    () => Object.fromEntries(ALL_TYPES.map((t) => [t, []])) as unknown as Record<ServiceType, string[]>
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const dragItem = useRef<{ type: ServiceType; id: string } | null>(null);
  const dragOver = useRef<{ type: ServiceType; id: string } | null>(null);

  // Sync order with instances
  useEffect(() => {
    setOrder((prev) => {
      const next = { ...prev };
      for (const type of ALL_TYPES) {
        const current = instances.filter((i) => i.serviceType === type).map((i) => i.id);
        // Preserve drag order for existing items, append new ones
        const prevOrder = prev[type] ?? [];
        const kept = prevOrder.filter((id) => current.includes(id));
        const added = current.filter((id) => !kept.includes(id));
        next[type] = [...kept, ...added];
      }
      return next;
    });
  }, [instances]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(onRefresh, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh, onRefresh]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm(`Retirer l'instance "${id}" du registre ?`)) return;
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  }, [onDelete]);

  const handleAdd = useCallback(async (data: Parameters<Props['onAdd']>[0]) => {
    const res = await onAdd(data);
    if (res.success) onRefresh();
    return res;
  }, [onAdd, onRefresh]);

  // Drag & drop
  const handleDragStart = (type: ServiceType, id: string) => (e: React.DragEvent) => {
    dragItem.current = { type, id };
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragEnd = () => { dragItem.current = null; dragOver.current = null; };
  const handleDragOver = (type: ServiceType, id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    dragOver.current = { type, id };
  };
  const handleDrop = (type: ServiceType) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragItem.current || !dragOver.current) return;
    if (dragItem.current.type !== type || dragOver.current.type !== type) return;
    if (dragItem.current.id === dragOver.current.id) return;

    setOrder((prev) => {
      const arr = [...(prev[type] ?? [])];
      const fromIdx = arr.indexOf(dragItem.current!.id);
      const toIdx = arr.indexOf(dragOver.current!.id);
      if (fromIdx === -1 || toIdx === -1) return prev;
      arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, dragItem.current!.id);
      return { ...prev, [type]: arr };
    });
  };

  const activeTypes = ALL_TYPES.filter((t) => instances.some((i) => i.serviceType === t));
  const totalHealthy = instances.filter((i) => i.healthy).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Instances de services</h2>
          <p className="mt-0.5 text-sm text-white/40">
            {instances.length} instance{instances.length !== 1 ? 's' : ''} —{' '}
            <span className="text-emerald-400">{totalHealthy} sain{totalHealthy !== 1 ? 's' : ''}</span>
            {instances.length - totalHealthy > 0 && (
              <span className="text-red-400"> · {instances.length - totalHealthy} hors ligne</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all ${
              autoRefresh
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-white/8 bg-white/5 text-white/30 hover:bg-white/8'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/5 px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/8 disabled:opacity-50"
          >
            <RefreshCwIcon size={12} className={loading ? 'animate-spin' : ''} />
            Rafraîchir
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition-all hover:bg-white/15"
          >
            <PlusIcon size={12} />
            Ajouter
          </button>
        </div>
      </div>

      {/* Overview badges par type */}
      <div className="flex flex-wrap gap-2">
        {ALL_TYPES.map((type) => {
          const typeInstances = instances.filter((i) => i.serviceType === type);
          const healthyCount = typeInstances.filter((i) => i.healthy).length;
          const c = TYPE_COLORS[type];
          return (
            <div
              key={type}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${c.badge} ${c.border}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${healthyCount > 0 ? c.dot : 'bg-red-400'}`} />
              <span className={c.badgeText + ' font-medium capitalize'}>{type}</span>
              <span className="text-white/30">{typeInstances.length}</span>
            </div>
          );
        })}
      </div>

      {/* Grilles par type */}
      {instances.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/3 py-16 text-center">
          <ServerIcon size={32} className="mb-3 text-white/15" />
          <p className="text-sm text-white/30">Aucune instance enregistrée</p>
          <p className="mt-1 text-xs text-white/20">Les services s&apos;enregistrent automatiquement au démarrage</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-white/8 px-4 py-2 text-sm text-white/60 hover:bg-white/12 transition-colors"
          >
            <PlusIcon size={14} /> Ajouter manuellement
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {activeTypes.map((type) => {
            const c = TYPE_COLORS[type];
            const typeOrder = order[type] ?? [];
            const typeInstances = typeOrder
              .map((id) => instances.find((i) => i.id === id))
              .filter(Boolean) as ServiceInstance[];

            const bestScore = Math.max(...typeInstances.map((i) => i.score), 0);

            return (
              <div key={type}>
                {/* Section header */}
                <div className="mb-3 flex items-center gap-3">
                  <div className={`h-px flex-1 ${c.border} border-t`} />
                  <div className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest ${c.badge} ${c.border} ${c.badgeText}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                    {type}
                    <span className="opacity-60">·</span>
                    <span className="opacity-60">{typeInstances.length}</span>
                  </div>
                  <div className={`h-px flex-1 ${c.border} border-t`} />
                </div>

                {/* Cards grid */}
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop(type)}
                >
                  {typeInstances.map((instance) => (
                    <InstanceCard
                      key={instance.id}
                      instance={instance}
                      colors={c}
                      onDelete={handleDelete}
                      isDragging={dragItem.current?.id === instance.id}
                      onDragStart={handleDragStart(type, instance.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver(type, instance.id)}
                      onDrop={handleDrop(type)}
                    />
                  ))}

                  {/* "Meilleure instance" indicator */}
                  {typeInstances.length > 1 && (
                    <div className={`flex items-center justify-center rounded-xl border border-dashed ${c.border} p-4 opacity-40`}>
                      <div className="text-center">
                        <p className="text-xs font-medium text-white/50">Meilleure instance</p>
                        <p className={`mt-1 font-mono text-sm ${c.badgeText}`}>
                          {typeInstances.find((i) => i.score === bestScore)?.id ?? '—'}
                        </p>
                        <p className="mt-0.5 text-[10px] text-white/30">score {Math.round(bestScore)}/100</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showAddModal && (
        <AddModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
}
