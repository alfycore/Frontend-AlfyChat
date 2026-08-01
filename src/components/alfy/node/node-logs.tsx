'use client';

import { Card, ScrollShadow, SearchField, Tag, TagGroup } from '@heroui/react';
import { useMemo, useState } from 'react';

import { NODE_LOGS } from '@/components/alfy/mock/data';
import type { AlfyLogLevel } from '@/components/alfy/mock/types';
import { cn } from '@/lib/utils';

const LEVELS: AlfyLogLevel[] = ['info', 'warn', 'error', 'debug'];

const LEVEL_CLASS: Record<AlfyLogLevel, string> = {
  info: 'text-[color:var(--alfy-node)]',
  warn: 'text-warning',
  error: 'text-danger',
  debug: 'text-muted',
};

const timeFmt = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export function NodeLogs() {
  const [query, setQuery] = useState('');
  const [levels, setLevels] = useState<Set<AlfyLogLevel>>(new Set(LEVELS));

  const logs = useMemo(
    () =>
      NODE_LOGS.filter(
        (l) => levels.has(l.level) && l.message.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, levels],
  );

  return (
    <Card className="col-span-full">
      <Card.Header>
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <Card.Title className="text-sm">Journaux</Card.Title>
          <div className="flex flex-wrap items-center gap-3">
            <TagGroup
              aria-label="Niveaux de log"
              selectionMode="multiple"
              selectedKeys={levels}
              onSelectionChange={(keys) => {
                if (keys === 'all') setLevels(new Set(LEVELS));
                else setLevels(new Set([...keys].map(String) as AlfyLogLevel[]));
              }}
            >
              <TagGroup.List className="gap-1">
                {LEVELS.map((level) => (
                  <Tag key={level} id={level} textValue={level} className="text-xs uppercase">
                    {level}
                  </Tag>
                ))}
              </TagGroup.List>
            </TagGroup>
            <SearchField value={query} onChange={setQuery} aria-label="Filtrer les journaux" className="w-52">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Filtrer…" />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          </div>
        </div>
      </Card.Header>
      <Card.Content>
        <ScrollShadow className="max-h-72 overflow-y-auto rounded-md bg-[color:var(--field-background)] p-3 font-mono text-xs leading-relaxed">
          {logs.map((log) => (
            <p key={log.id} className="flex gap-2 whitespace-pre-wrap">
              <span className="shrink-0 text-muted tabular-nums">{timeFmt.format(new Date(log.ts))}</span>
              <span className={cn('w-12 shrink-0 font-semibold uppercase', LEVEL_CLASS[log.level])}>
                {log.level}
              </span>
              <span className="min-w-0">{log.message}</span>
            </p>
          ))}
          {logs.length === 0 && <p className="text-muted">Aucune entrée ne correspond au filtre.</p>}
        </ScrollShadow>
      </Card.Content>
    </Card>
  );
}
