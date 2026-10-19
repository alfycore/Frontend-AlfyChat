'use client';

/**
 * Primitives d'interface du module serveur, toutes sur composants HeroUI :
 * interrupteur décrit, titres de section, carte radio, ligne de réglage.
 */

import { Label, Radio, Switch } from '@heroui/react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn('text-xs font-bold tracking-[0.02em] text-muted uppercase', className)}>{children}</h3>;
}

export function PageTitle({ children, description }: { children: ReactNode; description?: ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold tracking-tight text-foreground">{children}</h2>
      {description && <p className="mt-1 max-w-prose text-sm text-muted">{description}</p>}
    </div>
  );
}

export function SettingSwitch({
  label,
  description,
  isSelected,
  onChange,
  isDisabled,
  danger,
  icon: Icon,
}: {
  label: ReactNode;
  description?: ReactNode;
  isSelected: boolean;
  onChange: (v: boolean) => void;
  isDisabled?: boolean;
  danger?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <Switch isSelected={isSelected} onChange={onChange} isDisabled={isDisabled} className="w-full">
      <Switch.Content className="flex w-full items-start justify-between gap-4 py-1">
        <span className="flex min-w-0 items-start gap-2.5">
          {Icon && <Icon className={cn('mt-0.5 size-4.5 shrink-0', danger ? 'text-danger' : 'text-muted')} aria-hidden />}
          <span className="min-w-0">
            <span className={cn('block text-[15px] font-medium', danger ? 'text-danger' : 'text-foreground')}>{label}</span>
            {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
          </span>
        </span>
        <Switch.Control className="mt-0.5 shrink-0">
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  );
}

export function RadioCard({
  value,
  icon: Icon,
  title,
  description,
  isDisabled,
}: {
  value: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  isDisabled?: boolean;
}) {
  return (
    <Radio value={value} isDisabled={isDisabled}>
      <Radio.Content
        className={cn(
          'group/radio flex w-full cursor-pointer items-center gap-3 rounded-lg border border-transparent bg-surface-secondary px-3 py-2.5',
          'transition-[background-color,border-color] duration-(--dur-1) hover:bg-surface-tertiary',
          'data-selected:border-accent/50 data-selected:bg-accent/10',
          'data-disabled:cursor-not-allowed data-disabled:opacity-45',
        )}
      >
        <Icon className="size-6 shrink-0 text-muted group-data-selected/radio:text-foreground" aria-hidden />
        <span className="min-w-0 flex-1">
          <Label className="block text-[15px] font-semibold">{title}</Label>
          {description && <span className="block text-xs text-muted">{description}</span>}
        </span>
        <Radio.Control className="shrink-0">
          <Radio.Indicator />
        </Radio.Control>
      </Radio.Content>
    </Radio>
  );
}

/** Ligne « libellé — valeur — action » des pages de réglages. */
export function SettingRow({ label, value, action }: { label: ReactNode; value?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-[0.02em] text-muted uppercase">{label}</p>
        {value && <div className="mt-0.5 truncate text-[15px] text-foreground">{value}</div>}
      </div>
      {action}
    </div>
  );
}
