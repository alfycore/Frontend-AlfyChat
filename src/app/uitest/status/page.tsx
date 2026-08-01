import { Chip } from '@heroui/react';
import { CheckCircle2 } from 'lucide-react';

const SERVICES = [
  { name: 'Passerelle (Gateway)', status: 'ok', uptime: '99,98 %' },
  { name: 'Messagerie', status: 'ok', uptime: '99,99 %' },
  { name: 'Appels (WebRTC / SFU)', status: 'ok', uptime: '99,92 %' },
  { name: 'Serveurs & rôles', status: 'ok', uptime: '99,97 %' },
  { name: 'Médias & fichiers', status: 'degraded', uptime: '99,40 %' },
  { name: 'Auto-hébergement (nodes)', status: 'ok', uptime: '99,95 %' },
] as const;

const LABEL = { ok: 'Opérationnel', degraded: 'Dégradé', down: 'Panne' } as const;
const COLOR = { ok: 'success', degraded: 'warning', down: 'danger' } as const;

export default function UitestStatusPage() {
  const allOk = SERVICES.every((s) => s.status === 'ok');
  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8 flex items-center gap-3 rounded-xl border border-border/70 bg-surface p-5">
          <CheckCircle2 className={allOk ? 'size-6 text-success' : 'size-6 text-warning'} aria-hidden />
          <div>
            <h1 className="text-lg font-bold">{allOk ? 'Tous les systèmes sont opérationnels' : 'Incident en cours'}</h1>
            <p className="text-xs text-muted">Mis à jour il y a 2 min · données synthétisées</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/70">
          {SERVICES.map((s, i) => (
            <div key={s.name} className={`flex items-center justify-between gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-separator' : ''}`}>
              <span className="text-sm font-medium">{s.name}</span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-muted tabular-nums">{s.uptime}</span>
                <Chip size="sm" color={COLOR[s.status]} variant="soft">{LABEL[s.status]}</Chip>
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-0.5">
          {Array.from({ length: 90 }).map((_, i) => (
            <span key={i} className={`h-8 flex-1 rounded-[1px] ${i === 71 ? 'bg-warning' : 'bg-success/70'}`} title={`Jour ${i + 1}`} />
          ))}
        </div>
        <p className="mt-2 text-center text-[11px] text-muted">90 derniers jours · 1 incident mineur</p>
      </div>
    </div>
  );
}
