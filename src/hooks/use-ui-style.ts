'use client';

import { useLayoutPrefs } from './use-layout-prefs';

/**
 * Returns pre-built Tailwind class strings for the two UI styles:
 *  - 'glass': rounded glassmorphism panels with backdrop-blur
 *  - 'flat': solid Discord-like surfaces, no blur, no gaps
 */
export function useUIStyle() {
  const { prefs } = useLayoutPrefs();
  const g = prefs.uiStyle !== 'flat'; // isGlass

  return {
    isGlass: g,

    // ── Root layout ────────────────────────────────────────────────────────
    // Gap + padding between panels (glass floats, flat touches)
    rootPadding: g ? 'p-1.5 gap-1.5' : 'p-0 gap-0',
    // Panel wrapper rounding
    panelWrapper: g ? 'rounded-2xl overflow-hidden' : 'overflow-hidden',

    // ── Sidebar / panel background ─────────────────────────────────────────
    sidebarBg: g
      ? 'bg-[var(--background)]/40 backdrop-blur-xl'
      : 'bg-[var(--background)] backdrop-blur-none',

    // ── Header bars (inside panels) ────────────────────────────────────────
    header: g
      ? 'border-b border-white/10 bg-white/5 backdrop-blur-sm'
      : 'border-b border-[var(--border)] bg-[var(--surface)]',

    // ── Input bar ─────────────────────────────────────────────────────────
    inputBar: g
      ? 'rounded-2xl border border-white/15 bg-white/60 backdrop-blur-sm dark:border-white/10 dark:bg-white/8'
      : 'rounded-xl border border-[var(--border)] bg-[var(--surface)]',

    // ── Reply bar (above input) ────────────────────────────────────────────
    replyBar: g
      ? 'rounded-t-2xl border border-b-0 border-white/15 bg-white/30 backdrop-blur-sm dark:border-white/10 dark:bg-white/5'
      : 'rounded-t-xl border border-b-0 border-[var(--border)] bg-[var(--surface-secondary)]',

    // ── Clickable rows (DM entries, friend entries) ────────────────────────
    row: g
      ? 'rounded-2xl border border-white/15 bg-white/30 backdrop-blur-sm hover:bg-white/40 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8'
      : 'rounded-xl hover:bg-[var(--surface-secondary)]/70',

    // ── Empty-state / info cards ───────────────────────────────────────────
    emptyCard: g
      ? 'rounded-3xl border border-white/20 bg-white/30 backdrop-blur-sm dark:border-white/10 dark:bg-white/5'
      : 'rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)]',

    // ── Date separator chip ────────────────────────────────────────────────
    chip: g
      ? 'rounded-2xl border border-white/15 bg-white/30 backdrop-blur-sm dark:border-white/10 dark:bg-white/8'
      : 'rounded-full border border-[var(--border)] bg-[var(--surface)]',

    // ── Announcement / info banner ─────────────────────────────────────────
    announcementBanner: g
      ? 'rounded-2xl border border-amber-500/25 bg-amber-500/10 backdrop-blur-sm dark:border-amber-500/20 dark:bg-amber-500/8'
      : 'rounded-xl border border-amber-500/20 bg-amber-500/8',

    // ── Accent icon badge (same in both styles) ────────────────────────────
    iconBadge: 'rounded-2xl bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/25',
  };
}
