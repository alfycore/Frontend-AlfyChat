'use client';

import { Description, Kbd, Label, ListBox } from '@heroui/react';

import type { AlfySlashCommand } from '@/components/alfy/mock/types';
import { useTranslation } from '@/components/locale-provider';

interface SlashMenuProps {
  commands: AlfySlashCommand[];
  onPick: (name: string) => void;
}

/**
 * Panneau de slash commands ancré au-dessus du composer.
 * Rendu inline (pas de Popover modal) pour ne pas voler le focus du champ.
 */
export function SlashMenu({ commands, onPick }: SlashMenuProps) {
  const { t } = useTranslation();
  if (commands.length === 0) return null;
  return (
    <div className="alfy-enter absolute right-0 bottom-full left-0 z-10 mb-2 overflow-hidden rounded-md border border-border bg-overlay shadow-lg">
      <p className="border-b border-separator px-3 py-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
        {t.chat.slashMenuTitle}
      </p>
      <ListBox
        aria-label={t.chat.slashMenuAriaLabel}
        selectionMode="none"
        onAction={(key) => onPick(String(key))}
        className="max-h-64 overflow-y-auto p-1"
      >
        {commands.map((c) => (
          <ListBox.Item key={c.name} id={c.name} textValue={c.name}>
            <Kbd className="shrink-0">/{c.name}</Kbd>
            <div className="flex min-w-0 flex-col">
              <Label>{c.description}</Label>
              {c.args && <Description>{c.args}</Description>}
            </div>
          </ListBox.Item>
        ))}
      </ListBox>
    </div>
  );
}
