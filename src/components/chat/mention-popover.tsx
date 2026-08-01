'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Avatar } from '@heroui/react';
import { resolveMediaUrl } from '@/lib/api';

export interface MentionUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

interface MentionPopoverProps {
  query: string;
  users: MentionUser[];
  visible: boolean;
  position: { top: number; left: number };
  onSelect: (user: MentionUser) => void;
  onClose: () => void;
}

export function MentionPopover({
  query,
  users,
  visible,
  position,
  onSelect,
  onClose,
}: MentionPopoverProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = users.filter((u) => {
    const q = query.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.displayName?.toLowerCase().includes(q) ?? false)
    );
  }).slice(0, 8);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!visible || filtered.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((p) => (p + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((p) => (p - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        onSelect(filtered[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [visible, filtered, selectedIndex, onSelect, onClose],
  );

  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown, true);
      return () => document.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [visible, handleKeyDown]);

  useEffect(() => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('[data-mention-item]');
      items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!visible) return null;

  const panelCls =
    'absolute z-50 w-64 overflow-hidden rounded-2xl border border-separator bg-overlay shadow-overlay backdrop-blur-xl';

  if (filtered.length === 0) {
    if (!query) return null;
    return (
      <div className={panelCls} style={{ bottom: position.top, left: position.left }}>
        <div className="flex items-center gap-2 px-3 py-2.5 text-[13px] text-danger/80">
          <span className="text-base leading-none">⚠️</span>
          Utilisateur invalide
        </div>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className={`${panelCls} max-h-56 overflow-y-auto`}
      style={{ bottom: position.top, left: position.left }}
    >
      <div className="px-3 py-1.5 text-[11px] font-medium text-muted/70">
        Membres — {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
      </div>
      {filtered.map((user, idx) => (
        <button
          key={user.id}
          data-mention-item
          className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-sm transition-colors duration-150 ${
            idx === selectedIndex
              ? 'bg-accent/10 text-accent'
              : 'hover:bg-foreground/[0.06]'
          }`}
          onMouseEnter={() => setSelectedIndex(idx)}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(user); }}
        >
          <Avatar size="sm" className="shrink-0 rounded-lg">
            <Avatar.Image src={resolveMediaUrl(user.avatarUrl) ?? undefined} alt={user.username} />
            <Avatar.Fallback className="rounded-lg text-[10px] font-bold">
              {(user.displayName || user.username)[0]?.toUpperCase()}
            </Avatar.Fallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[13px] font-medium leading-tight text-foreground">
              {user.displayName || user.username}
            </p>
            <p className="truncate font-mono text-[10px] leading-tight text-muted">
              @{user.username}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
