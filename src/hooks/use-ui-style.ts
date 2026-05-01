'use client';

import { useLayoutPrefs } from '@/hooks/use-layout-prefs';

/**
 * Returns pre-built Tailwind class strings for the current UI style.
 * Switch between 'flat' and 'glass' via Settings → Mise en page → Style d'interface.
 *
 * Glass mode: Apple-inspired frosted-glass panels with blur.
 * Flat mode:  Clean Notion-like panels with rounded corners + subtle shadows.
 */
export function useUIStyle() {
  const { prefs } = useLayoutPrefs();
  const g = prefs.uiStyle === 'glass';

  return {
    isGlass: g,

    // ── Root layout ────────────────────────────────────────────────────────
    rootPadding: g ? 'p-2 gap-2' : 'p-2 gap-2',

    // ── Panel wrapper — for content & member list (box avec bordure) ──────
    panelWrapper: g
      ? 'rounded-2xl overflow-hidden'
      : 'rounded-xl bg-card overflow-hidden border border-border/40 shadow-sm',

    // ── Sidebar wrapper — for server-list & channel-list (pas de box) ──────
    sidebarWrapper: g
      ? 'rounded-2xl overflow-hidden'
      : 'rounded-xl overflow-hidden',

    // ── Dividers between flat-mode panels ─────────────────────────────────
    // (not needed in flat-box mode — panels are visually separated by gap + border)
    dividerRight: g ? '' : '',
    dividerLeft:  g ? '' : '',
    dividerBottom: g ? '' : '',

    // ── Sidebar / panel background ─────────────────────────────────────────
    sidebarBg: g
      ? 'bg-white/20 backdrop-blur-3xl dark:bg-white/[0.06] shadow-[inset_0_0.5px_0_rgba(255,255,255,0.35),0_0_0_0.5px_rgba(255,255,255,0.12)] border border-white/[0.14] dark:border-white/[0.08]'
      : 'bg-sidebar',

    // ── Header bars (inside panels) ────────────────────────────────────────
    header: g
      ? 'border-b border-white/[0.12] bg-white/[0.08] backdrop-blur-2xl dark:border-white/[0.06] dark:bg-white/[0.03]'
      : 'border-b border-border/50 bg-sidebar',

    // ── Input bar ─────────────────────────────────────────────────────────
    inputBar: g
      ? 'rounded-2xl border border-white/[0.18] bg-white/30 backdrop-blur-3xl shadow-[0_2px_12px_rgba(0,0,0,0.06),inset_0_0.5px_0_rgba(255,255,255,0.45)] dark:border-white/[0.1] dark:bg-white/[0.08] dark:shadow-[0_2px_12px_rgba(0,0,0,0.25),inset_0_0.5px_0_rgba(255,255,255,0.06)]'
      : 'rounded-xl border border-border/60 bg-background/80',

    // ── Reply bar (above input) ────────────────────────────────────────────
    replyBar: g
      ? 'rounded-t-2xl border border-b-0 border-white/[0.15] bg-white/25 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-white/[0.05]'
      : 'rounded-t-xl border border-b-0 border-border/60 bg-sidebar',

    // ── Clickable rows (DM entries, friend entries) ────────────────────────
    row: g
      ? 'rounded-xl border border-transparent bg-white/[0.06] hover:bg-white/[0.16] hover:border-white/[0.15] hover:shadow-[0_1px_6px_rgba(0,0,0,0.04)] transition-all duration-200 dark:bg-white/[0.03] dark:hover:bg-white/[0.08] dark:hover:border-white/[0.1]'
      : 'rounded-xl hover:bg-foreground/[0.055] transition-colors duration-150',

    // ── Empty-state / info cards ───────────────────────────────────────────
    emptyCard: g
      ? 'rounded-3xl border border-white/[0.15] bg-white/20 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_0.5px_0_rgba(255,255,255,0.3)] dark:border-white/[0.08] dark:bg-white/[0.04] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]'
      : 'rounded-2xl border border-border/60 bg-sidebar shadow-sm',

    // ── Date separator chip ────────────────────────────────────────────────
    chip: g
      ? 'rounded-full border border-white/[0.18] bg-white/30 backdrop-blur-xl shadow-[0_1px_4px_rgba(0,0,0,0.04),inset_0_0.5px_0_rgba(255,255,255,0.35)] dark:border-white/[0.08] dark:bg-white/[0.06]'
      : 'rounded-full border border-border/50 bg-background',

    // ── Announcement / info banner ─────────────────────────────────────────
    announcementBanner: g
      ? 'rounded-2xl border border-amber-400/25 bg-amber-400/12 backdrop-blur-xl dark:border-amber-400/15 dark:bg-amber-400/[0.06]'
      : 'rounded-xl border border-amber-500/20 bg-amber-500/8',

    // ── Accent icon badge (same in both styles) ────────────────────────────
    iconBadge: 'rounded-2xl bg-[var(--accent)] shadow-lg',

    // ── Message hover highlight ────────────────────────────────────────────
    msgHover: g
      ? 'hover:bg-white/[0.08] rounded-xl transition-colors duration-200 dark:hover:bg-white/[0.04]'
      : 'hover:bg-foreground/[0.04] rounded-xl transition-colors duration-150',

    // ── Smooth Apple-like transitions for panels/sidebars
    // Use the global `.ui-apple-ease` helper for the cubic-bezier timing.
    panelTransition: g
      ? 'ui-apple-ease transition-all duration-300 will-change-transform'
      : 'ui-apple-ease transition-all duration-300 will-change-transform',
    sidebarTransition: g
      ? 'ui-apple-ease transition-transform duration-300 will-change-transform'
      : 'ui-apple-ease transition-transform duration-300 will-change-transform',
    contentTransition: 'ui-apple-ease transition-opacity duration-250',
    // Mobile panels are full-bleed on small screens, rounded on larger screens
    mobilePanel: 'rounded-none sm:rounded-xl',

    // ── Floating action buttons / context menus ────────────────────────────
    floatingPanel: g
      ? 'rounded-2xl border border-white/[0.16] bg-white/35 backdrop-blur-3xl shadow-[0_12px_40px_rgba(0,0,0,0.1),inset_0_0.5px_0_rgba(255,255,255,0.4)] dark:border-white/[0.1] dark:bg-[oklch(0.18_0.006_286/0.65)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)]'
      : 'rounded-2xl border border-border/60 bg-background shadow-lg',
  };
}
