'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  RefreshCwIcon, PlusIcon, XIcon, ZoomInIcon, ZoomOutIcon,
  MaximizeIcon, LayoutGridIcon, Link2Icon,
  Trash2Icon, MoreHorizontalIcon, CloudIcon, GitBranchIcon,
  Layers3Icon, RotateCcwIcon, RadioIcon, MonitorIcon, ServerIcon,
} from 'lucide-react';
import { api } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

type ServiceType = 'users' | 'messages' | 'friends' | 'calls' | 'servers' | 'bots' | 'media';

interface ServiceMetrics {
  ramUsage: number; ramMax: number;
  cpuUsage: number; cpuMax: number;
  bandwidthUsage: number; requestCount20min: number;
}

interface ServiceInstance {
  id: string; serviceType: ServiceType;
  endpoint: string; domain: string; location: string;
  healthy: boolean; score: number;
  registeredAt: string; lastHeartbeat: string;
  metrics?: ServiceMetrics;
}

interface Pos { x: number; y: number; }
interface Conn { id: string; from: string; to: string; }

// ── Constants ─────────────────────────────────────────────────────────────────

const COLORS: Record<ServiceType, { accent: string; bg: string; border: string; text: string }> = {
  users:    { accent: '#a78bfa', bg: 'rgba(167,139,250,0.07)', border: 'rgba(167,139,250,0.18)', text: '#c4b5fd' },
  messages: { accent: '#60a5fa', bg: 'rgba(96,165,250,0.07)',  border: 'rgba(96,165,250,0.18)',  text: '#93c5fd' },
  friends:  { accent: '#f472b6', bg: 'rgba(244,114,182,0.07)', border: 'rgba(244,114,182,0.18)', text: '#f9a8d4' },
  calls:    { accent: '#34d399', bg: 'rgba(52,211,153,0.07)',  border: 'rgba(52,211,153,0.18)',  text: '#6ee7b7' },
  servers:  { accent: '#fb923c', bg: 'rgba(251,146,60,0.07)',  border: 'rgba(251,146,60,0.18)',  text: '#fdba74' },
  bots:     { accent: '#facc15', bg: 'rgba(250,204,21,0.07)',  border: 'rgba(250,204,21,0.18)',  text: '#fde047' },
  media:    { accent: '#22d3ee', bg: 'rgba(34,211,238,0.07)',  border: 'rgba(34,211,238,0.18)',  text: '#67e8f9' },
};

const ALL_TYPES: ServiceType[] = ['users', 'messages', 'friends', 'calls', 'servers', 'bots', 'media'];
const CW = 210; // card width
const CH = 106; // card height
const GP = 26;  // group padding
const GH = 36;  // group header height

// ── Static infrastructure nodes ───────────────────────────────────────────────

const STATIC_NODES = {
  __frontend__: {
    label: 'frontend',
    sublabel: 'alfychat.eu',
    tag: 'Next.js 14',
    accent: '#4ade80',
    bg: 'rgba(74,222,128,0.07)',
    border: 'rgba(74,222,128,0.18)',
    text: '#86efac',
  },
  __gateway__: {
    label: 'gateway',
    sublabel: 'gateway.alfychat.eu',
    tag: 'Socket.IO + Proxy',
    accent: '#f59e0b',
    bg: 'rgba(245,158,11,0.07)',
    border: 'rgba(245,158,11,0.18)',
    text: '#fcd34d',
  },
} as const;

type StaticNodeId = keyof typeof STATIC_NODES;
const STATIC_IDS: StaticNodeId[] = ['__frontend__', '__gateway__'];

// Default positions for static nodes
const STATIC_DEFAULT_POS: Record<StaticNodeId, Pos> = {
  __frontend__: { x: 40, y: 60 },
  __gateway__:  { x: 40, y: 220 },
};

// ── Layout helpers ─────────────────────────────────────────────────────────────

function computeLayout(instances: ServiceInstance[]): Record<string, Pos> {
  const pos: Record<string, Pos> = { ...STATIC_DEFAULT_POS };
  let gx = 400; // offset right to leave room for gateway/frontend
  for (const type of ALL_TYPES) {
    const insts = instances.filter(i => i.serviceType === type);
    if (!insts.length) continue;
    for (let idx = 0; idx < insts.length; idx++) {
      pos[insts[idx].id] = { x: gx + GP, y: GH + GP + idx * (CH + 14) };
    }
    gx += CW + GP * 2 + 20;
  }
  return pos;
}

function computeGroups(instances: ServiceInstance[], pos: Record<string, Pos>) {
  const res: Partial<Record<ServiceType, { x: number; y: number; w: number; h: number }>> = {};
  for (const type of ALL_TYPES) {
    const insts = instances.filter(i => i.serviceType === type && pos[i.id]);
    if (!insts.length) continue;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const i of insts) {
      const p = pos[i.id];
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + CW); maxY = Math.max(maxY, p.y + CH);
    }
    res[type] = { x: minX - GP, y: minY - GH - GP, w: maxX - minX + GP * 2, h: maxY - minY + GH + GP * 2 };
  }
  return res;
}

// ── SVG connection path ────────────────────────────────────────────────────────

function ConnPath({ from, to, onDelete }: { from: Pos; to: Pos; onDelete?: () => void }) {
  const [hov, setHov] = useState(false);
  const dx = Math.max(50, Math.abs(to.x - from.x) * 0.45);
  const d = `M${from.x},${from.y} C${from.x + dx},${from.y} ${to.x - dx},${to.y} ${to.x},${to.y}`;
  const col = hov ? '#f87171' : 'rgba(255,255,255,0.2)';
  return (
    <g>
      {/* fat transparent hit area */}
      <path d={d} fill="none" stroke="transparent" strokeWidth={14}
        style={{ cursor: onDelete ? 'pointer' : 'default', pointerEvents: onDelete ? 'stroke' : 'none' }}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onDelete}
      />
      {/* visible line */}
      <path d={d} fill="none" stroke={col} strokeWidth={1.5}
        strokeDasharray={hov ? '6 3' : undefined} style={{ pointerEvents: 'none' }}
      />
      {/* arrow head */}
      <polygon
        points={`${to.x},${to.y} ${to.x - 8},${to.y - 4} ${to.x - 8},${to.y + 4}`}
        fill={col} style={{ pointerEvents: 'none' }}
      />
    </g>
  );
}

// ── Service card ───────────────────────────────────────────────────────────────

function ServiceCard({
  inst, pos, onDragStart, onPortClick, onDelete, isSource, canLink, selected, onSelect,
}: {
  inst: ServiceInstance; pos: Pos;
  onDragStart: (e: React.MouseEvent) => void;
  onPortClick: (e: React.MouseEvent, side: 'left' | 'right') => void;
  onDelete: () => void;
  isSource: boolean; canLink: boolean; selected: boolean; onSelect: () => void;
}) {
  const c = COLORS[inst.serviceType];
  const stale = Date.now() - new Date(inst.lastHeartbeat).getTime() > 90_000;
  const online = inst.healthy && !stale;
  const [menu, setMenu] = useState(false);

  // close menu on outside click
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(false);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [menu]);

  return (
    <div
      style={{ position: 'absolute', left: pos.x, top: pos.y, width: CW, height: CH, userSelect: 'none', zIndex: selected ? 10 : 5 }}
      onMouseDown={e => { e.stopPropagation(); onDragStart(e); onSelect(); }}
    >
      {/* ─ Card ─ */}
      <div style={{
        width: '100%', height: '100%', background: '#141417',
        border: `1px solid ${selected ? c.accent : canLink ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.09)'}`,
        borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: selected
          ? `0 0 0 2px ${c.accent}22, 0 6px 24px rgba(0,0,0,0.5)`
          : '0 2px 12px rgba(0,0,0,0.35)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        cursor: 'grab',
      }}>
        {/* header */}
        <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 7, borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)' }}>
          <div style={{ width: 20, height: 20, borderRadius: 5, background: c.bg, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CloudIcon size={11} style={{ color: c.accent }} />
          </div>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.88)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {inst.id}
          </span>
          <div style={{ position: 'relative' }}>
            <button
              style={{ padding: '2px 3px', borderRadius: 4, color: 'rgba(255,255,255,0.22)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); setMenu(v => !v); }}
            >
              <MoreHorizontalIcon size={13} />
            </button>
            {menu && (
              <div
                style={{ position: 'absolute', right: 0, top: '100%', zIndex: 100, background: '#1d1d21', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 4, minWidth: 130, boxShadow: '0 6px 20px rgba(0,0,0,0.6)' }}
                onMouseDown={e => e.stopPropagation()}
              >
                <button
                  style={{ width: '100%', padding: '6px 10px', textAlign: 'left', fontSize: 12, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 7 }}
                  onClick={e => { e.stopPropagation(); setMenu(false); onDelete(); }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <Trash2Icon size={11} /> Supprimer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* body */}
        <div style={{ padding: '8px 10px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <GitBranchIcon size={10} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {inst.domain}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: online ? '#22c55e' : '#4b5563', boxShadow: online ? '0 0 5px #22c55e80' : 'none', flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: online ? '#86efac' : 'rgba(255,255,255,0.22)' }}>
                {online ? 'Service en ligne' : stale ? 'Inactif' : 'Hors ligne'}
              </span>
            </div>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.06)' }}>
              {inst.location}
            </span>
          </div>
        </div>
      </div>

      {/* Port — right */}
      <Port
        style={{ right: -7, top: CH / 2 - 7 }}
        active={isSource}
        accent={c.accent}
        onMouseDown={e => { e.stopPropagation(); onPortClick(e, 'right'); }}
      />
      {/* Port — left */}
      <Port
        style={{ left: -7, top: CH / 2 - 7 }}
        active={false}
        accent={c.accent}
        onMouseDown={e => { e.stopPropagation(); onPortClick(e, 'left'); }}
      />
    </div>
  );
}

function Port({ style, active, accent, onMouseDown }: { style: React.CSSProperties; active: boolean; accent: string; onMouseDown: (e: React.MouseEvent) => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      style={{
        position: 'absolute', width: 14, height: 14, borderRadius: '50%',
        background: active || hov ? accent : '#1a1a1e',
        border: `2px solid ${active || hov ? accent : 'rgba(255,255,255,0.2)'}`,
        cursor: 'crosshair', zIndex: 20, transition: 'all 0.12s',
        boxShadow: active || hov ? `0 0 8px ${accent}80` : 'none',
        ...style,
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    />
  );
}

// ── Group container ────────────────────────────────────────────────────────────

function GroupBox({ type, bounds, count }: { type: ServiceType; bounds: { x: number; y: number; w: number; h: number }; count: number }) {
  const c = COLORS[type];
  return (
    <div style={{
      position: 'absolute', left: bounds.x, top: bounds.y, width: bounds.w, height: bounds.h,
      border: `1px solid ${c.border}`, borderRadius: 12,
      background: c.bg, pointerEvents: 'none',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: GH, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 7, borderBottom: `1px solid ${c.border}` }}>
        <Layers3Icon size={11} style={{ color: c.accent, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: c.text, textTransform: 'capitalize', flex: 1 }}>{type}</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{count}</span>
        <div style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5, border: `1px solid ${c.border}` }}>
          <MoreHorizontalIcon size={11} style={{ color: 'rgba(255,255,255,0.2)' }} />
        </div>
      </div>
    </div>
  );
}

// ── Static node card (Gateway / Frontend) ────────────────────────────────────

function StaticNodeCard({ id, pos, onDragStart, onPortClick, isSource, canLink, selected, onSelect }: {
  id: StaticNodeId; pos: Pos;
  onDragStart: (e: React.MouseEvent) => void;
  onPortClick: (e: React.MouseEvent) => void;
  isSource: boolean; canLink: boolean; selected: boolean; onSelect: () => void;
}) {
  const n = STATIC_NODES[id];
  const Icon = id === '__gateway__' ? RadioIcon : MonitorIcon;

  return (
    <div
      style={{ position: 'absolute', left: pos.x, top: pos.y, width: CW, height: CH, userSelect: 'none', zIndex: selected ? 10 : 5 }}
      onMouseDown={e => { e.stopPropagation(); onDragStart(e); onSelect(); }}
    >
      <div style={{
        width: '100%', height: '100%', background: '#141417',
        border: `1px solid ${selected ? n.accent : canLink ? 'rgba(255,255,255,0.22)' : n.border}`,
        borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: selected
          ? `0 0 0 2px ${n.accent}22, 0 6px 24px rgba(0,0,0,0.5)`
          : `0 2px 12px rgba(0,0,0,0.35), inset 0 0 0 1px ${n.bg}`,
        transition: 'border-color 0.15s, box-shadow 0.15s',
        cursor: 'grab',
      }}>
        {/* header */}
        <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 7, borderBottom: `1px solid ${n.border}`, background: n.bg }}>
          <div style={{ width: 20, height: 20, borderRadius: 5, background: `${n.accent}18`, border: `1px solid ${n.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={11} style={{ color: n.accent }} />
          </div>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: n.text, letterSpacing: '0.01em' }}>
            {n.label}
          </span>
          <span style={{ fontSize: 9, fontWeight: 600, color: n.accent, background: `${n.accent}18`, border: `1px solid ${n.border}`, borderRadius: 4, padding: '1px 5px', letterSpacing: '0.02em' }}>
            INFRA
          </span>
        </div>

        {/* body */}
        <div style={{ padding: '8px 10px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ServerIcon size={10} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {n.sublabel}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: n.accent, boxShadow: `0 0 5px ${n.accent}80`, flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: n.text }}>En ligne</span>
            </div>
            <span style={{ fontSize: 10, color: n.accent, background: `${n.accent}10`, padding: '1px 6px', borderRadius: 4, border: `1px solid ${n.border}` }}>
              {n.tag}
            </span>
          </div>
        </div>
      </div>

      {/* Port right */}
      <Port style={{ right: -7, top: CH / 2 - 7 }} active={isSource} accent={n.accent} onMouseDown={e => { e.stopPropagation(); onPortClick(e); }} />
      {/* Port left */}
      <Port style={{ left: -7, top: CH / 2 - 7 }} active={false} accent={n.accent} onMouseDown={e => { e.stopPropagation(); onPortClick(e); }} />
    </div>
  );
}

// ── Add Modal ─────────────────────────────────────────────────────────────────

function AddModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ id: '', serviceType: 'messages' as ServiceType, endpoint: '', domain: '', location: 'EU' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.id.trim() || !form.endpoint.trim() || !form.domain.trim()) { setErr('ID, endpoint et domaine requis.'); return; }
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div style={{ position: 'relative', width: 420, background: '#0e0e10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', right: 16, top: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', lineHeight: 0 }}>
          <XIcon size={16} />
        </button>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.88)', marginBottom: 20 }}>Ajouter une instance</div>

        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>Type</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
          {ALL_TYPES.map(t => (
            <button key={t} onClick={() => setForm(f => ({ ...f, serviceType: t }))}
              style={{ padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.12s',
                background: form.serviceType === t ? COLORS[t].bg : 'rgba(255,255,255,0.04)',
                color: form.serviceType === t ? COLORS[t].text : 'rgba(255,255,255,0.3)',
                border: `1px solid ${form.serviceType === t ? COLORS[t].border : 'rgba(255,255,255,0.06)'}`,
              }}>{t}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { key: 'id', label: 'ID unique', ph: `${form.serviceType}-eu-2` },
            { key: 'endpoint', label: 'Endpoint', ph: `https://1.${form.serviceType}.alfychat.eu` },
            { key: 'domain', label: 'Domaine', ph: `1.${form.serviceType}.alfychat.eu` },
          ].map(({ key, label, ph }) => (
            <div key={key}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 5 }}>{label}</div>
              <input
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'white', outline: 'none', boxSizing: 'border-box' }}
                placeholder={ph} value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 5 }}>Région</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['EU', 'US', 'ASIA', 'AU'].map(loc => (
                <button key={loc} onClick={() => setForm(f => ({ ...f, location: loc }))}
                  style={{ flex: 1, padding: '7px', borderRadius: 8, fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.12s',
                    background: form.location === loc ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                    color: form.location === loc ? 'white' : 'rgba(255,255,255,0.28)',
                    border: `1px solid ${form.location === loc ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}`,
                  }}>{loc}</button>
              ))}
            </div>
          </div>
        </div>

        {err && <div style={{ marginTop: 12, fontSize: 12, color: '#f87171' }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, color: 'rgba(255,255,255,0.35)', background: 'none', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>Annuler</button>
          <button onClick={submit} disabled={busy}
            style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s',
              background: c.bg, border: `1px solid ${c.border}`, color: c.text, opacity: busy ? 0.5 : 1,
            }}>{busy ? 'Ajout…' : 'Ajouter'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────────

export function ServicesPanel() {
  const [instances, setInstances] = useState<ServiceInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState<Record<string, Pos>>(STATIC_DEFAULT_POS);
  const [connections, setConnections] = useState<Conn[]>([]);
  const [linking, setLinking] = useState<string | null>(null);
  const [mousePosWorld, setMousePosWorld] = useState<Pos>({ x: 0, y: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [showConns, setShowConns] = useState(true);
  const [pan, setPan] = useState({ x: 60, y: 40 });
  const [zoom, setZoom] = useState(0.9);

  const canvasRef = useRef<HTMLDivElement>(null);
  const sr = useRef({
    pan: { x: 60, y: 40 }, zoom: 0.9,
    dragging: null as null | { id: string; mx: number; my: number; sx: number; sy: number },
    panning: false, panStart: { x: 0, y: 0 }, panOrig: { x: 60, y: 40 },
  });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetch_ = useCallback(async () => {
    try {
      const res = await api.getAdminServices();
      if (res.success && res.data) {
        const insts: ServiceInstance[] = (res.data as any).instances ?? [];
        setInstances(insts);
        setPositions(prev => {
          const next = { ...prev };
          const newInsts = insts.filter(i => !next[i.id]);
          if (newInsts.length) {
            const lay = computeLayout(insts);
            for (const i of newInsts) next[i.id] = lay[i.id] ?? { x: 40, y: 40 };
          }
          return next;
        });
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetch_();
    const t = setInterval(fetch_, 15_000);
    return () => clearInterval(t);
  }, [fetch_]);

  // ── Persist connections ────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const s = localStorage.getItem('ac-svc-conns');
      if (s) setConnections(JSON.parse(s));
    } catch {}
  }, []);

  const saveConns = useCallback((c: Conn[]) => {
    setConnections(c);
    try { localStorage.setItem('ac-svc-conns', JSON.stringify(c)); } catch {}
  }, []);

  // ── Persist positions ─────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const s = localStorage.getItem('ac-svc-positions');
      if (s) {
        const saved: Record<string, Pos> = JSON.parse(s);
        setPositions(prev => ({ ...saved, ...prev }));
      }
    } catch {}
  }, []);

  const savePositions = useCallback((pos: Record<string, Pos>) => {
    try { localStorage.setItem('ac-svc-positions', JSON.stringify(pos)); } catch {}
  }, []);

  // ── Canvas ↔ world helpers ─────────────────────────────────────────────────
  const toWorld = useCallback((cx: number, cy: number): Pos => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (cx - rect.left - sr.current.pan.x) / sr.current.zoom,
      y: (cy - rect.top - sr.current.pan.y) / sr.current.zoom,
    };
  }, []);

  // ── Mouse events ──────────────────────────────────────────────────────────
  const onCanvasDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (linking) { setLinking(null); return; }
    setSelected(null);
    const s = sr.current;
    s.panning = true;
    s.panStart = { x: e.clientX, y: e.clientY };
    s.panOrig = { ...s.pan };
  }, [linking]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    const s = sr.current;
    if (s.dragging) {
      // Capture dragging object immediately — it can be nulled by onMouseUp
      // before the setPositions callback runs (race condition).
      const drag = s.dragging;
      const dx = (e.clientX - drag.mx) / s.zoom;
      const dy = (e.clientY - drag.my) / s.zoom;
      setPositions(prev => ({ ...prev, [drag.id]: { x: drag.sx + dx, y: drag.sy + dy } }));
    } else if (s.panning) {
      const np = { x: s.panOrig.x + (e.clientX - s.panStart.x), y: s.panOrig.y + (e.clientY - s.panStart.y) };
      s.pan = np;
      setPan({ ...np });
    }
    setMousePosWorld(toWorld(e.clientX, e.clientY));
  }, [toWorld]);

  const onMouseUp = useCallback(() => {
    const s = sr.current;
    const wasDragging = s.dragging !== null;
    s.dragging = null;
    s.panning = false;
    // Persist positions once drag is complete
    if (wasDragging) {
      setPositions(prev => {
        savePositions(prev);
        return prev;
      });
    }
  }, [savePositions]);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const s = sr.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const nz = Math.min(3, Math.max(0.15, s.zoom * factor));
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const np = { x: mx - (mx - s.pan.x) * (nz / s.zoom), y: my - (my - s.pan.y) * (nz / s.zoom) };
    s.zoom = nz; s.pan = np;
    setZoom(nz); setPan({ ...np });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [onMouseMove, onMouseUp, onWheel]);

  // ── Card interactions ──────────────────────────────────────────────────────
  const onDragStart = useCallback((e: React.MouseEvent, id: string) => {
    if (e.button !== 0) return;
    const pos = positions[id] ?? { x: 0, y: 0 };
    sr.current.dragging = { id, mx: e.clientX, my: e.clientY, sx: pos.x, sy: pos.y };
    sr.current.panning = false;
  }, [positions]);

  const onPortClick = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!linking) { setLinking(id); return; }
    if (linking === id) { setLinking(null); return; }
    const exists = connections.some(c => (c.from === linking && c.to === id) || (c.from === id && c.to === linking));
    if (!exists) saveConns([...connections, { id: `${linking}→${id}`, from: linking, to: id }]);
    setLinking(null);
  }, [linking, connections, saveConns]);

  const onDelete = useCallback(async (id: string) => {
    if (!confirm(`Retirer "${id}" du registre ?`)) return;
    try {
      await api.deleteAdminService(id);
      setInstances(prev => prev.filter(i => i.id !== id));
      setPositions(prev => { const n = { ...prev }; delete n[id]; return n; });
      saveConns(connections.filter(c => c.from !== id && c.to !== id));
    } catch {}
  }, [connections, saveConns]);

  // ── Fit / layout ──────────────────────────────────────────────────────────
  const fitScreen = useCallback(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    // include all nodes: service instances + static
    const allIds = [...instances.map(i => i.id), ...STATIC_IDS];
    for (const id of allIds) {
      const p = positions[id]; if (!p) continue;
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + CW); maxY = Math.max(maxY, p.y + CH);
    }
    if (minX === Infinity) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pad = 64;
    const nz = Math.min(1.2, Math.min(rect.width / (maxX - minX + pad * 2), rect.height / (maxY - minY + pad * 2)));
    const np = {
      x: (rect.width - (maxX - minX + pad * 2) * nz) / 2 - (minX - pad) * nz,
      y: (rect.height - (maxY - minY + pad * 2) * nz) / 2 - (minY - pad) * nz,
    };
    sr.current.zoom = nz; sr.current.pan = np;
    setZoom(nz); setPan(np);
  }, [instances, positions]);

  const autoLayout = useCallback(() => {
    const lay = computeLayout(instances);
    setPositions(lay);
    setTimeout(fitScreen, 50);
  }, [instances, fitScreen]);

  const resetCanvas = useCallback(() => {
    sr.current.pan = { x: 60, y: 40 }; sr.current.zoom = 0.9;
    setPan({ x: 60, y: 40 }); setZoom(0.9);
  }, []);

  // ── Port position helpers ──────────────────────────────────────────────────
  const rightPort = (id: string): Pos => {
    const p = positions[id] ?? { x: 0, y: 0 };
    return { x: p.x + CW, y: p.y + CH / 2 };
  };
  const leftPort = (id: string): Pos => {
    const p = positions[id] ?? { x: 0, y: 0 };
    return { x: p.x, y: p.y + CH / 2 };
  };

  // ── Groups ─────────────────────────────────────────────────────────────────
  const groups = useMemo(() => computeGroups(instances, positions), [instances, positions]);

  // ── Toolbar menu state ─────────────────────────────────────────────────────
  const [toolMenu, setToolMenu] = useState(false);
  useEffect(() => {
    if (!toolMenu) return;
    const close = (e: MouseEvent) => { setToolMenu(false); };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [toolMenu]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', height: '72vh', background: '#0b0b0d', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>

      {/* ── Background dot grid ── */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <pattern id="dots" width={24 * zoom} height={24 * zoom} patternUnits="userSpaceOnUse"
            x={pan.x % (24 * zoom)} y={pan.y % (24 * zoom)}>
            <circle cx={0} cy={0} r={0.6} fill="rgba(255,255,255,0.07)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>

      {/* ── Canvas ── */}
      <div ref={canvasRef} style={{ position: 'absolute', inset: 0, cursor: linking ? 'crosshair' : 'default' }}
        onMouseDown={onCanvasDown}
      >
        {/* World transform */}
        <div style={{ position: 'absolute', top: 0, left: 0, transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', width: 0, height: 0 }}>

          {/* SVG layer */}
          <svg style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
            {showConns && connections.map(conn => {
              const fp = positions[conn.from]; const tp = positions[conn.to];
              if (!fp || !tp) return null;
              return (
                <ConnPath key={conn.id}
                  from={rightPort(conn.from)} to={leftPort(conn.to)}
                  onDelete={() => saveConns(connections.filter(c => c.id !== conn.id))}
                />
              );
            })}
            {linking && positions[linking] && (
              <ConnPath from={rightPort(linking)} to={mousePosWorld} />
            )}
          </svg>

          {/* Group containers */}
          {ALL_TYPES.map(type => {
            const b = groups[type];
            const count = instances.filter(i => i.serviceType === type).length;
            if (!b || !count) return null;
            return <GroupBox key={type} type={type} bounds={b} count={count} />;
          })}

          {/* Static infrastructure nodes */}
          {STATIC_IDS.map(id => {
            const pos = positions[id];
            if (!pos) return null;
            return (
              <StaticNodeCard key={id} id={id} pos={pos}
                onDragStart={e => onDragStart(e, id)}
                onPortClick={e => onPortClick(e, id)}
                isSource={linking === id}
                canLink={linking !== null && linking !== id}
                selected={selected === id}
                onSelect={() => setSelected(id)}
              />
            );
          })}

          {/* Service cards */}
          {instances.map(inst => {
            const pos = positions[inst.id];
            if (!pos) return null;
            return (
              <ServiceCard key={inst.id} inst={inst} pos={pos}
                onDragStart={e => onDragStart(e, inst.id)}
                onPortClick={(e, _side) => onPortClick(e, inst.id)}
                onDelete={() => onDelete(inst.id)}
                isSource={linking === inst.id}
                canLink={linking !== null && linking !== inst.id}
                selected={selected === inst.id}
                onSelect={() => setSelected(inst.id)}
              />
            );
          })}
        </div>
      </div>

      {/* ── Top-right toolbar ── */}
      <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 30, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={fetch_}
          style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>
          <RefreshCwIcon size={13} className={loading ? 'animate-spin' : ''} />
        </button>
        <button onClick={() => setShowAdd(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.92)', border: 'none', color: '#0b0b0d', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <PlusIcon size={14} /> Add
        </button>
      </div>

      {/* ── Left toolbar ── */}
      <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 30 }}>

        {/* Grid / menu trigger */}
        <div style={{ position: 'relative' }}>
          <button
            onMouseDown={e => { e.stopPropagation(); setToolMenu(v => !v); }}
            style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(20,20,24,0.9)', border: '1px solid rgba(255,255,255,0.1)', color: toolMenu ? 'white' : 'rgba(255,255,255,0.45)', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
            <LayoutGridIcon size={14} />
          </button>

          {toolMenu && (
            <div
              onMouseDown={e => e.stopPropagation()}
              style={{ position: 'absolute', left: '100%', top: 0, marginLeft: 8, background: 'rgba(18,18,22,0.96)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 6, minWidth: 170, boxShadow: '0 8px 32px rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
              {[
                { icon: <Link2Icon size={13} />, label: showConns ? 'Masquer les liens' : 'Afficher les liens', action: () => { setShowConns(v => !v); setToolMenu(false); } },
                { icon: <LayoutGridIcon size={13} />, label: 'Auto Layout', action: () => { autoLayout(); setToolMenu(false); } },
                { icon: <RotateCcwIcon size={13} />, label: 'Reset Canvas', action: () => { resetCanvas(); setToolMenu(false); } },
              ].map((item, i) => (
                <button key={i} onClick={item.action}
                  style={{ width: '100%', padding: '7px 10px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.65)', fontSize: 12, cursor: 'pointer', borderRadius: 7, display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)', e.currentTarget.style.color = 'white')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none', e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}>
                  {item.icon}{item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Zoom in/out / fit */}
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2, background: 'rgba(20,20,24,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 3, backdropFilter: 'blur(8px)' }}>
          {[
            { icon: <ZoomInIcon size={13} />, label: 'Zoom +', action: () => { const nz = Math.min(3, sr.current.zoom * 1.2); sr.current.zoom = nz; setZoom(nz); } },
            { icon: <ZoomOutIcon size={13} />, label: 'Zoom -', action: () => { const nz = Math.max(0.15, sr.current.zoom / 1.2); sr.current.zoom = nz; setZoom(nz); } },
            { icon: <MaximizeIcon size={13} />, label: 'Fit to screen', action: fitScreen },
          ].map((btn, i) => (
            <button key={i} onClick={btn.action} title={btn.label}
              style={{ width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'rgba(255,255,255,0.38)', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.38)'; }}>
              {btn.icon}
            </button>
          ))}
        </div>

        {/* Link mode toggle */}
        <button onClick={() => setLinking(linking ? null : '')} title="Mode connexion"
          style={{ marginTop: 6, width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: linking !== null ? 'rgba(99,102,241,0.2)' : 'rgba(20,20,24,0.9)', border: `1px solid ${linking !== null ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`, color: linking !== null ? '#a5b4fc' : 'rgba(255,255,255,0.38)', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
          <Link2Icon size={14} />
        </button>
      </div>

      {/* ── Linking hint bar ── */}
      {linking !== null && (
        <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 30, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', fontSize: 11, padding: '6px 14px', borderRadius: 20, backdropFilter: 'blur(8px)', whiteSpace: 'nowrap' }}>
          {linking ? `Depuis "${linking}" — cliquez sur le port d'une autre carte` : 'Cliquez sur le port d\'une carte pour démarrer'}&nbsp;·&nbsp;
          <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setLinking(null)}>Annuler</span>
        </div>
      )}

      {/* ── Zoom indicator ── */}
      <div style={{ position: 'absolute', bottom: 14, right: 14, zIndex: 30, fontSize: 11, color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '3px 8px', border: '1px solid rgba(255,255,255,0.06)' }}>
        {Math.round(zoom * 100)}%
      </div>

      {/* ── Empty state ── */}
      {!loading && instances.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5, pointerEvents: 'none' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <Layers3Icon size={22} style={{ color: 'rgba(255,255,255,0.12)' }} />
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>Aucune instance enregistrée</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.13)' }}>Les services s&apos;enregistrent automatiquement au démarrage</div>
        </div>
      )}

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onDone={fetch_} />}
    </div>
  );
}
