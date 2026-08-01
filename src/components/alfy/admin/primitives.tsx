'use client';

import { Button, Chip, Skeleton, Spinner, Switch, Tooltip } from '@heroui/react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Briques partagées de la console d'administration.
 *
 * Le rythme visuel repose sur trois niveaux de surface : `bg-surface` pour les
 * cartes, `bg-surface-secondary` pour les en-têtes de tableau et les zones
 * inertes, `border-separator` pour les séparations internes. Les cartes se
 * détachent du fond par `border-border`.
 */

// ── En-tête de page ──────────────────────────────────────────────────────────

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  /** Actions alignées à droite (boutons, filtres). */
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-heading text-xl tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

// ── Carte de section ─────────────────────────────────────────────────────────

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  danger,
  /** Retire le padding interne — pour loger un tableau bord à bord. */
  flush,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  danger?: boolean;
  flush?: boolean;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-lg border bg-surface',
        danger ? 'border-danger/40' : 'border-border',
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-separator px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={flush ? undefined : 'p-4'}>{children}</div>
    </section>
  );
}

// ── Tuile de statistique ─────────────────────────────────────────────────────

export type StatTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const STAT_TONES: Record<StatTone, { value: string; icon: string }> = {
  neutral: { value: 'text-foreground', icon: 'bg-default text-foreground' },
  accent:  { value: 'text-accent',     icon: 'bg-accent/12 text-accent' },
  success: { value: 'text-success',    icon: 'bg-success/12 text-success' },
  warning: { value: 'text-warning',    icon: 'bg-warning/12 text-warning' },
  danger:  { value: 'text-danger',     icon: 'bg-danger/12 text-danger' },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  loading,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: StatTone;
  loading?: boolean;
}) {
  const t = STAT_TONES[tone];
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border/60">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
        {Icon && (
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-md transition-transform duration-200',
              'group-hover:scale-105',
              t.icon,
            )}
          >
            <Icon className="size-3.5" aria-hidden />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-9 w-20 rounded-md" />
      ) : (
        <p className={cn('mt-1.5 font-heading text-3xl leading-none tabular-nums', t.value)}>
          {value}
        </p>
      )}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

// ── États vides et de chargement ─────────────────────────────────────────────

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon && (
        <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-surface-secondary">
          <Icon className="size-5 text-muted" aria-hidden />
        </span>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingPanel({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <Spinner size="lg" />
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

/** Lignes fantômes pour un tableau en cours de chargement. */
export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-separator">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          {Array.from({ length: cols - 1 }).map((_, c) => (
            <Skeleton
              key={c}
              className="h-3.5 rounded"
              style={{ width: `${[38, 18, 14, 12, 10][c] ?? 12}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Indicateurs ──────────────────────────────────────────────────────────────

/** Pastille d'état colorée, avec pulsation optionnelle pour le « vivant ». */
export function StatusDot({
  tone,
  label,
  pulse,
}: {
  tone: 'success' | 'warning' | 'danger' | 'muted';
  label: string;
  pulse?: boolean;
}) {
  const color = {
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    muted: 'text-muted',
  }[tone];
  const bg = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    muted: 'bg-muted',
  }[tone];

  return (
    <span className={cn('flex items-center gap-1.5 text-xs font-medium', color)}>
      <span className="relative flex size-2 shrink-0">
        {pulse && (
          <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-60', bg)} />
        )}
        <span className={cn('relative inline-flex size-2 rounded-full', bg)} />
      </span>
      {label}
    </span>
  );
}

/** Barre de charge compacte (RAM, CPU) — vire à l'ambre puis au rouge. */
export function LoadBar({
  value,
  max,
  format,
}: {
  value: number;
  max: number;
  /** Libellé additionnel à droite (ex. « 512/1024 MB »). */
  format?: (value: number, max: number) => string;
}) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const tone = pct >= 85 ? 'bg-danger' : pct >= 60 ? 'bg-warning' : 'bg-success';
  const text = pct >= 85 ? 'text-danger' : pct >= 60 ? 'text-warning' : 'text-success';

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-surface-tertiary">
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out', tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn('text-xs tabular-nums', text)}>{pct}%</span>
      {format && <span className="text-xs tabular-nums text-muted">{format(value, max)}</span>}
    </div>
  );
}

// ── Tableau ──────────────────────────────────────────────────────────────────

/**
 * Enveloppe de tableau : défilement horizontal contenu, en-tête collant.
 * Les sections construisent leurs colonnes elles-mêmes — la variété des
 * données admin rend une abstraction générique plus coûteuse qu'utile.
 */
export function TableShell({
  head,
  children,
  minWidth = 720,
}: {
  head: React.ReactNode;
  children: React.ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        <thead className="bg-surface-secondary">
          <tr className="text-left">{head}</tr>
        </thead>
        <tbody className="divide-y divide-separator">{children}</tbody>
      </table>
    </div>
  );
}

export function Th({
  children,
  className,
  align = 'left',
}: {
  children?: React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-2.5 text-xs font-medium whitespace-nowrap text-muted',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  align = 'left',
}: {
  children?: React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <td
      className={cn(
        'px-4 py-3 align-middle',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  className,
  onPress,
}: {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
}) {
  return (
    <tr
      onClick={onPress}
      className={cn(
        'transition-colors hover:bg-surface-secondary/60',
        onPress && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </tr>
  );
}

// ── Divers ───────────────────────────────────────────────────────────────────

/** Avatar de repli : initiale sur fond dérivé du nom, stable entre les rendus. */
export function InitialAvatar({
  name,
  size = 'md',
  src,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  src?: string | null;
}) {
  const dim = { sm: 'size-7 text-[11px]', md: 'size-9 text-sm', lg: 'size-12 text-base' }[size];
  const hues = [265, 210, 150, 35, 0, 320, 190, 95];
  const hue = hues[(name?.charCodeAt(0) ?? 0) % hues.length];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={cn('shrink-0 rounded-full object-cover', dim)}
      />
    );
  }

  return (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-full font-semibold', dim)}
      style={{
        backgroundColor: `oklch(65% 0.13 ${hue} / 0.18)`,
        color: `oklch(62% 0.16 ${hue})`,
      }}
      aria-hidden
    >
      {name?.[0]?.toUpperCase() ?? '?'}
    </span>
  );
}

/**
 * Normalise en tableau de chaînes une valeur qui peut arriver sous plusieurs
 * formes : les colonnes JSON du backend remontent tantôt en tableau, tantôt
 * en chaîne JSON, tantôt en liste séparée par des virgules.
 */
export function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      // Chaîne mal formée — on retombe sur le découpage par virgules
    }
  }

  return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
}

/** Date lisible, avec l'heure en option. */
export function DateText({ value, withTime }: { value?: string | null; withTime?: boolean }) {
  if (!value) return <span className="text-muted">—</span>;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return <span className="text-muted">—</span>;
  return (
    <span className="text-xs whitespace-nowrap text-muted tabular-nums">
      {d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
      {withTime && ` · ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
    </span>
  );
}

/** Compte à rebours en clair : « dans 3 j », « expiré ». */
export function RelativeExpiry({ value }: { value?: string | null }) {
  if (!value) return <Chip size="sm" variant="soft"><Chip.Label>Permanent</Chip.Label></Chip>;

  const ms = new Date(value).getTime() - Date.now();
  if (ms <= 0) {
    return <Chip size="sm" variant="soft"><Chip.Label>Expiré</Chip.Label></Chip>;
  }

  const mins = Math.round(ms / 60_000);
  const label =
    mins < 60 ? `${mins} min`
    : mins < 1440 ? `${Math.round(mins / 60)} h`
    : `${Math.round(mins / 1440)} j`;

  return (
    <Chip size="sm" variant="soft" color="warning">
      <Chip.Label>Encore {label}</Chip.Label>
    </Chip>
  );
}

/**
 * Interrupteur seul — l'anatomie complète de HeroUI est verbeuse et revient
 * dans presque chaque section.
 */
export function Toggle({
  isSelected,
  onChange,
  label,
  isDisabled,
}: {
  isSelected: boolean;
  onChange: (value: boolean) => void;
  /** Obligatoire : sert de nom accessible même sans texte visible. */
  label: string;
  isDisabled?: boolean;
}) {
  return (
    <Switch
      isSelected={isSelected}
      onChange={onChange}
      isDisabled={isDisabled}
      aria-label={label}
    >
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  );
}

/** Rangée « libellé + description + contrôle », le rythme des pages de réglages. */
export function SettingRow({
  label,
  description,
  children,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-3.5 not-last:border-b not-last:border-separator">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

/** Bouton d'action discret pour les cellules de tableau. */
export function RowAction({
  icon: Icon,
  label,
  onPress,
  tone = 'neutral',
  isDisabled,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  tone?: 'neutral' | 'danger';
  isDisabled?: boolean;
}) {
  return (
    <Tooltip>
      <Button
        size="sm"
        variant="ghost"
        isIconOnly
        aria-label={label}
        onPress={onPress}
        isDisabled={isDisabled}
        className={tone === 'danger' ? 'text-danger hover:bg-danger/10' : undefined}
      >
        <Icon className="size-4" aria-hidden />
      </Button>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}
