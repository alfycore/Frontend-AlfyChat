'use client';

import { useState } from 'react';
import { Hash } from 'lucide-react';

import { SPECIAL_VIEWS, type SpecialViewType } from '@/components/alfy/chat/special-views';
import { cn } from '@/lib/utils';

const KEYS = Object.keys(SPECIAL_VIEWS) as SpecialViewType[];

export default function UitestViewsPage() {
  const [active, setActive] = useState<SpecialViewType>('announcement');
  const { Component } = SPECIAL_VIEWS[active];

  return (
    <div className="flex h-full min-h-0 bg-surface">
      {/* Sélecteur des types de salon */}
      <div className="w-56 shrink-0 overflow-y-auto border-r border-separator bg-surface-secondary/35 p-2">
        <p className="px-2 py-2 text-[11px] font-semibold tracking-wider text-muted uppercase">Types de salon</p>
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setActive(k)}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus',
              active === k ? 'bg-(--accent)/12 font-medium text-foreground' : 'text-muted hover:bg-surface-secondary hover:text-foreground',
            )}
          >
            <Hash className={cn('size-4', active === k ? 'text-accent' : 'opacity-60')} aria-hidden />
            {SPECIAL_VIEWS[k].label}
          </button>
        ))}
      </div>

      {/* Rendu de la vue */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        <Component />
      </div>
    </div>
  );
}
