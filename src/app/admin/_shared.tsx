import { sanitizeSvg } from '@/lib/sanitize';

export const UICONS_LIST = [
  { value: 'star', label: 'Étoile' }, { value: 'trophy', label: 'Trophée' },
  { value: 'crown', label: 'Couronne' }, { value: 'shield', label: 'Bouclier' },
  { value: 'diamond', label: 'Gemme' }, { value: 'fire-flame-simple', label: 'Feu' },
  { value: 'heart', label: 'Cœur' }, { value: 'bolt', label: 'Éclair' },
  { value: 'rocket', label: 'Fusée' }, { value: 'bug', label: 'Bug' },
  { value: 'code-simple', label: 'Code' }, { value: 'palette', label: 'Palette' },
  { value: 'music-note', label: 'Musique' }, { value: 'camera', label: 'Caméra' },
  { value: 'gamepad', label: 'Manette' }, { value: 'paint-brush', label: 'Pinceau' },
  { value: 'microchip', label: 'CPU' }, { value: 'gift', label: 'Cadeau' },
  { value: 'badge', label: 'Médaille' }, { value: 'check-circle', label: 'Vérifié' },
  { value: 'user-check', label: 'Badge ID' }, { value: 'comment-heart', label: 'Chat Cœur' },
  { value: 'thumbs-up', label: 'Pouce' }, { value: 'sunglasses', label: 'Cool' },
  { value: 'flag', label: 'Drapeau' }, { value: 'wrench-alt', label: 'Outils' },
  { value: 'terminal', label: 'Terminal' }, { value: 'world', label: 'Globe' },
  { value: 'graduation-cap', label: 'Diplômé' }, { value: 'eye', label: 'Œil' },
];

export function renderBadgeIcon(
  iconType: string,
  iconValue: string,
  color: string,
  size = 'text-xl',
) {
  if (iconType === 'bootstrap' && iconValue)
    return <i className={`fi fi-br-${iconValue} ${size}`} style={{ color }} />;
  if (iconType === 'flaticon' && iconValue)
    return <i className={`${iconValue} ${size}`} style={{ color }} />;
  if (iconType === 'svg' && iconValue)
    return (
      <span
        dangerouslySetInnerHTML={{ __html: sanitizeSvg(iconValue) }}
        className="inline-block h-5 w-5"
      />
    );
  return <i className="fi fi-br-question text-xl text-muted-foreground" />;
}

export function MiniBar({ value, max, unit }: { value: number; max: number; unit: string }) {
  const p = max > 0 ? Math.round((value / max) * 100) : 0;
  const toMB = (b: number) => b / 1_048_576;
  const color = p >= 85 ? '#ef4444' : p >= 60 ? '#f59e0b' : '#22c55e';
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
          style={{ width: `${p}%`, background: color }}
        />
      </div>
      <span className="text-xs tabular-nums" style={{ color }}>{p}%</span>
      {unit === 'MB' && (
        <span className="text-xs tabular-nums text-muted-foreground">
          {toMB(value) >= 1024
            ? `${(toMB(value) / 1024).toFixed(1)}/${(toMB(max) / 1024).toFixed(1)} GB`
            : `${Math.round(toMB(value))}/${Math.round(toMB(max))} MB`}
        </span>
      )}
    </div>
  );
}

export function StatusDot({
  healthy,
  lastHeartbeat,
}: {
  healthy: boolean;
  lastHeartbeat: string;
}) {
  const elapsed = Date.now() - new Date(lastHeartbeat).getTime();
  const color =
    elapsed > 600_000 ? '#ef4444' : elapsed > 90_000 ? '#f59e0b' : '#22c55e';
  const label =
    elapsed > 600_000 ? 'Hors ligne' : elapsed > 90_000 ? 'Inactif' : 'En ligne';
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

export type ServiceType =
  | 'users' | 'messages' | 'friends' | 'calls' | 'servers' | 'bots' | 'media';

export type ServiceInstance = {
  id: string;
  serviceType: ServiceType;
  endpoint: string;
  domain: string;
  location: string;
  healthy: boolean;
  enabled: boolean;
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
  };
};

export const SERVICE_TYPES: ServiceType[] = [
  'users', 'messages', 'friends', 'calls', 'servers', 'bots', 'media',
];

export function PageSpinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="size-7 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
    </div>
  );
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {description && (
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
