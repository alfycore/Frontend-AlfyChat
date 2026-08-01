import { cn } from '@/lib/utils';

/**
 * Briques partagées des panneaux de paramètres — carte de section avec
 * rangées séparées, pour un rythme visuel homogène partout.
 */

interface SettingsSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Accentuation danger (bordure rougie). */
  danger?: boolean;
}

export function SettingsSection({ title, description, children, className, danger }: SettingsSectionProps) {
  return (
    <section className={cn('mb-8', className)}>
      {title && (
        <h3 className="mb-0.5 text-[13px] font-semibold tracking-wide text-foreground/90 uppercase">
          {title}
        </h3>
      )}
      {description && <p className="mb-2 text-xs text-muted">{description}</p>}
      <div
        className={cn(
          'mt-2 overflow-hidden rounded-lg border bg-surface',
          danger ? 'border-danger/40' : 'border-border/70',
        )}
      >
        {children}
      </div>
    </section>
  );
}

interface SettingsRowProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Contrôle à droite (Switch, Button, Chip…). */
  children?: React.ReactNode;
  className?: string;
}

export function SettingsRow({ label, description, children, className }: SettingsRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-6 px-4 py-3.5 not-last:border-b not-last:border-separator',
        'transition-colors hover:bg-surface-secondary/50',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

/** Zone de contenu libre à l'intérieur d'une section (formulaires, tableaux). */
export function SettingsContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-4 py-4', className)}>{children}</div>;
}
