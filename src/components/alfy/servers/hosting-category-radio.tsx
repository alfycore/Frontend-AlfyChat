'use client';

import { Label, Radio } from '@heroui/react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface HostingCategoryRadioProps {
  value: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  usage?: string;
  isDisabled?: boolean;
}

/** Carte de sélection de catégorie Type 1 (Standard/Communautaire), réutilisée
 * à la création et dans le profil du serveur. */
export function HostingCategoryRadio({ value, icon: Icon, title, subtitle, usage, isDisabled }: HostingCategoryRadioProps) {
  return (
    <Radio value={value} isDisabled={isDisabled}>
      <Radio.Content
        className={cn(
          'group/radio flex-col items-stretch gap-0 overflow-hidden rounded-xl border border-border bg-surface-2 p-0',
          'cursor-pointer transition-all duration-200 hover:border-accent/40 hover:bg-surface-3',
          'data-selected:border-accent data-selected:bg-accent/8 data-selected:hover:bg-accent/10',
          'data-disabled:cursor-not-allowed data-disabled:opacity-45 data-disabled:hover:border-border data-disabled:hover:bg-surface-2',
        )}
      >
        <span className="flex items-center gap-3 p-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-muted transition-colors duration-200 group-data-selected/radio:bg-accent group-data-selected/radio:text-(--accent-foreground)">
            <Icon className="size-4.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <Label className="text-sm font-semibold">{title}</Label>
            <span className="block text-xs text-muted">{subtitle}</span>
            {usage && <span className="mt-0.5 block text-[11px] tabular-nums text-muted/70">{usage}</span>}
          </span>
          <Radio.Control className="shrink-0">
            <Radio.Indicator />
          </Radio.Control>
        </span>
      </Radio.Content>
    </Radio>
  );
}
