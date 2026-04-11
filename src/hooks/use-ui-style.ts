'use client';

import { useLayoutPrefs } from '@/hooks/use-layout-prefs';

/**
 * Returns pre-built Tailwind class strings for the current UI style.
 * Switch between 'flat' and 'glass' via Settings → Mise en page → Style d'interface.
 *
 * Glass mode: Apple-inspired frosted-glass panels.
 * Requires a background image or gradient (set in Mise en page → Fond d'écran)
 * so the backdrop-blur has something to blur against.
 */
export function useUIStyle() {
  const { prefs } = useLayoutPrefs();
  const g = prefs.uiStyle === 'glass';

  return {
    isGlass: g,

    // ── Root layout ────────────────────────────────────────────────────────
    rootPadding: g ? 'p-2 gap-2' : 'p-0 gap-0',
    panelWrapper: g ? 'rounded-2xl overflow-hidden' : 'overflow-hidden',

    // ── Sidebar / panel background ─────────────────────────────────────────
    sidebarBg: g
      ? 'bg-white/20 backdrop-blur-3xl dark:bg-white/[0.06] shadow-[inset_0_0.5px_0_rgba(255,255,255,0.35),0_0_0_0.5px_rgba(255,255,255,0.12)] border border-white/[0.14] dark:border-white/[0.08]'
      : 'bg-[var(--surface)]',

    // ── Header bars (inside panels) ────────────────────────────────────────
    header: g
      ? 'border-b border-white/[0.12] bg-white/[0.08] backdrop-blur-2xl dark:border-white/[0.06] dark:bg-white/[0.03]'
      : 'border-b border-[var(--border)] bg-[var(--surface)]',

    // ── Input bar ─────────────────────────────────────────────────────────
    inputBar: g
      ? 'rounded-2xl border border-white/[0.18] bg-white/30 backdrop-blur-3xl shadow-[0_2px_12px_rgba(0,0,0,0.06),inset_0_0.5px_0_rgba(255,255,255,0.45)] dark:border-white/[0.1] dark:bg-white/[0.08] dark:shadow-[0_2px_12px_rgba(0,0,0,0.25),inset_0_0.5px_0_rgba(255,255,255,0.06)]'
      : 'rounded-xl border border-[var(--border)] bg-[var(--surface)]',

    // ── Reply bar (above input) ────────────────────────────────────────────
    replyBar: g
      ? 'rounded-t-2xl border border-b-0 border-white/[0.15] bg-white/25 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-white/[0.05]'
      : 'rounded-t-xl border border-b-0 border-[var(--border)] bg-[var(--surface-secondary)]',

    // ── Clickable rows (DM entries, friend entries) ────────────────────────
    row: g
      ? 'rounded-xl border border-transparent bg-white/[0.06] hover:bg-white/[0.16] hover:border-white/[0.15] hover:shadow-[0_1px_6px_rgba(0,0,0,0.04)] transition-all duration-200 dark:bg-white/[0.03] dark:hover:bg-white/[0.08] dark:hover:border-white/[0.1]'
      : 'rounded-xl hover:bg-[var(--surface-secondary)]/70',

    // ── Empty-state / info cards ───────────────────────────────────────────
    emptyCard: g
      ? 'rounded-3xl border border-white/[0.15] bg-white/20 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_0.5px_0_rgba(255,255,255,0.3)] dark:border-white/[0.08] dark:bg-white/[0.04] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]'
      : 'rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)]',

    // ── Date separator chip ────────────────────────────────────────────────
    chip: g
      ? 'rounded-full border border-white/[0.18] bg-white/30 backdrop-blur-xl shadow-[0_1px_4px_rgba(0,0,0,0.04),inset_0_0.5px_0_rgba(255,255,255,0.35)] dark:border-white/[0.08] dark:bg-white/[0.06]'
      : 'rounded-full border border-[var(--border)] bg-[var(--surface)]',

    // ── Announcement / info banner ─────────────────────────────────────────
    announcementBanner: g
      ? 'rounded-2xl border border-amber-400/25 bg-amber-400/12 backdrop-blur-xl dark:border-amber-400/15 dark:bg-amber-400/[0.06]'
      : 'rounded-xl border border-amber-500/20 bg-amber-500/8',

    // ── Accent icon badge (same in both styles) ────────────────────────────
    iconBadge: 'rounded-2xl bg-[var(--accent)] shadow-lg',

    // ── Message hover highlight (glass gets subtle glow) ──────────────────
    msgHover: g
      ? 'hover:bg-white/[0.08] rounded-xl transition-colors duration-200 dark:hover:bg-white/[0.04]'
      : 'hover:bg-[var(--surface-secondary)]/40',

    // ── Floating action buttons / context menus ────────────────────────────
    floatingPanel: g
      ? 'rounded-2xl border border-white/[0.16] bg-white/35 backdrop-blur-3xl shadow-[0_12px_40px_rgba(0,0,0,0.1),inset_0_0.5px_0_rgba(255,255,255,0.4)] dark:border-white/[0.1] dark:bg-[oklch(0.18_0.006_286/0.65)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)]'
      : 'rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-md',
  };
}
