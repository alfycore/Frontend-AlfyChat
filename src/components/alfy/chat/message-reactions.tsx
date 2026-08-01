'use client';

import { Tooltip } from '@heroui/react';
import { SmilePlus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import type { AlfyReaction } from '@/components/alfy/mock/types';
import { pop } from '@/components/alfy/motion';
import { cn } from '@/lib/utils';

interface MessageReactionsProps {
  reactions: AlfyReaction[];
  onToggle?: (emoji: string) => void;
  onAdd?: () => void;
}

export function MessageReactions({ reactions, onToggle, onAdd }: MessageReactionsProps) {
  if (reactions.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      <AnimatePresence initial={false}>
        {reactions.map((r) => (
          <motion.button
            key={r.emoji}
            layout
            variants={pop}
            initial="hidden"
            animate="visible"
            exit="exit"
            whileTap={{ scale: 0.95 }}
            type="button"
            aria-pressed={r.me}
            aria-label={`${r.emoji} — ${r.count} réactions${r.me ? ', dont la vôtre' : ''}`}
            onClick={() => onToggle?.(r.emoji)}
            className={cn(
              'flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-xs outline-none',
              'transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-[color:var(--focus)]',
              r.me
                ? 'border-[color:var(--accent)]/50 bg-[color:var(--accent)]/15 text-foreground'
                : 'border-transparent bg-surface-secondary text-muted hover:border-border hover:text-foreground',
            )}
          >
            <span aria-hidden>{r.emoji}</span>
            <span className="font-medium tabular-nums">{r.count}</span>
          </motion.button>
        ))}
      </AnimatePresence>
      <Tooltip delay={300}>
        <button
          type="button"
          aria-label="Ajouter une réaction"
          onClick={onAdd}
          className="flex cursor-pointer items-center rounded-full bg-surface-secondary px-2 py-1 text-muted opacity-0 transition-opacity group-hover/msg:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] outline-none"
        >
          <SmilePlus className="size-3.5" aria-hidden />
        </button>
        <Tooltip.Content>
          <p>Ajouter une réaction</p>
        </Tooltip.Content>
      </Tooltip>
    </div>
  );
}
