'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!visible || filtered.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        onSelect(filtered[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [visible, filtered, selectedIndex, onSelect, onClose]
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

  if (!visible || filtered.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="absolute z-50 max-h-56 w-64 overflow-y-auto rounded-xl border border-[var(--border)]/60 bg-[var(--surface)]/95 p-1.5 shadow-2xl"
      style={{ bottom: position.top, left: position.left }}
    >
      <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">
        Membres — {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
      </div>
      {filtered.map((user, idx) => (
        <button
          key={user.id}
          data-mention-item
          className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm transition-all duration-200 ${
            idx === selectedIndex
              ? 'bg-[var(--accent)]/10 text-[var(--accent)] shadow-sm'
              : 'hover:bg-[var(--surface-secondary)]/40'
          }`}
          onMouseEnter={() => setSelectedIndex(idx)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(user);
          }}
        >
          <Avatar className="size-6">
            <AvatarImage src={resolveMediaUrl(user.avatarUrl)} alt={user.username} />
            <AvatarFallback className="text-xs">
              {(user.displayName || user.username)[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium">{user.displayName || user.username}</p>
            <p className="truncate text-xs text-[var(--muted)]">@{user.username}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
