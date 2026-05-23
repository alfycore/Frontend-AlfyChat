'use client';

import { useLayoutPrefs } from '@/hooks/use-layout-prefs';

/**
 * Returns pre-built Tailwind class strings for the current UI style.
 * Switch between 'flat' and 'glass' via Settings → Mise en page → Style d'interface.
 *
 * Glass mode: Apple-inspired frosted-glass panels with blur.
 *   Blur intensity and panel opacity are controlled by CSS variables set at
 *   runtime from layout prefs (--glass-blur, --glass-opacity).
 *   Tint color is layered via --glass-tint-color.
 *
 * BackgroundProvider auto-switches the theme (light/dark) based on wallpaper
 * brightness, so Tailwind dark: variants are the correct adaptation mechanism.
 */
export function useUIStyle() {
  const { prefs } = useLayoutPrefs();
  const g = prefs.uiStyle === 'glass';

  return {
    isGlass: g,

    // ── Root layout ────────────────────────────────────────────────────────
    rootPadding: 'p-2 gap-2',

    // ── Panel wrapper — for content & member list ──────────────────────────
    panelWrapper: g
      ? 'rounded-2xl overflow-hidden'
      : 'rounded-xl bg-card overflow-hidden border border-border/40 shadow-sm',

    // ── Sidebar wrapper ────────────────────────────────────────────────────
    sidebarWrapper: g
      ? 'rounded-2xl overflow-hidden'
      : 'rounded-xl overflow-hidden',

    dividerRight: '',
    dividerLeft: '',
    dividerBottom: '',

    // ── Sidebar / panel background ─────────────────────────────────────────
    sidebarBg: g
      ? [
          'glass-blur glass-bg-sidebar',
          'border border-black/[0.09]',
          'shadow-[inset_0_0.5px_0_rgba(255,255,255,0.85),0_0_0_0.5px_rgba(0,0,0,0.06)]',
          'dark:border-white/[0.10]',
          'dark:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.18),0_0_0_0.5px_rgba(255,255,255,0.08)]',
        ].join(' ')
      : 'bg-sidebar',

    // ── Header bars (inside panels) ────────────────────────────────────────
    header: g
      ? [
          'glass-blur glass-bg-header',
          'border-b border-black/[0.07]',
          'dark:border-white/[0.08]',
        ].join(' ')
      : 'border-b border-border/50 bg-sidebar',

    // ── Input bar ─────────────────────────────────────────────────────────
    inputBar: g
      ? [
          'rounded-2xl glass-blur glass-bg-input',
          'border border-black/[0.10]',
          'shadow-[0_2px_12px_rgba(0,0,0,0.06),inset_0_0.5px_0_rgba(255,255,255,0.90)]',
          'dark:border-white/[0.12]',
          'dark:shadow-[0_2px_12px_rgba(0,0,0,0.30),inset_0_0.5px_0_rgba(255,255,255,0.08)]',
        ].join(' ')
      : 'rounded-xl border border-border/60 bg-background/80',

    // ── Reply bar (above input) ────────────────────────────────────────────
    replyBar: g
      ? [
          'rounded-t-2xl border border-b-0 glass-blur glass-bg-reply',
          'border-black/[0.08]',
          'dark:border-white/[0.10]',
        ].join(' ')
      : 'rounded-t-xl border border-b-0 border-border/60 bg-sidebar',

    // ── Clickable rows (DM entries, friend entries) ────────────────────────
    row: g
      ? [
          'rounded-xl border border-transparent transition-all duration-200',
          'bg-black/[0.03] hover:bg-black/[0.08] hover:border-black/[0.08]',
          'hover:shadow-[0_1px_6px_rgba(0,0,0,0.05)]',
          'dark:bg-white/[0.03] dark:hover:bg-white/[0.09] dark:hover:border-white/[0.10]',
        ].join(' ')
      : 'rounded-xl hover:bg-foreground/[0.055] transition-colors duration-150',

    // ── Empty-state / info cards ───────────────────────────────────────────
    emptyCard: g
      ? [
          'rounded-3xl glass-blur glass-bg-empty',
          'border border-black/[0.08]',
          'shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_0.5px_0_rgba(255,255,255,0.80)]',
          'dark:border-white/[0.08]',
          'dark:shadow-[0_8px_32px_rgba(0,0,0,0.25)]',
        ].join(' ')
      : 'rounded-2xl border border-border/60 bg-sidebar shadow-sm',

    // ── Date separator chip ────────────────────────────────────────────────
    chip: g
      ? [
          'rounded-full glass-blur glass-bg-chip',
          'border border-black/[0.10]',
          'shadow-[0_1px_4px_rgba(0,0,0,0.05),inset_0_0.5px_0_rgba(255,255,255,0.80)]',
          'dark:border-white/[0.10]',
          'dark:shadow-[0_1px_4px_rgba(0,0,0,0.10),inset_0_0.5px_0_rgba(255,255,255,0.06)]',
        ].join(' ')
      : 'rounded-full border border-border/50 bg-background',

    // ── Announcement / info banner ─────────────────────────────────────────
    announcementBanner: g
      ? 'rounded-2xl border border-amber-400/30 bg-amber-400/[0.15] glass-blur dark:border-amber-400/20 dark:bg-amber-400/[0.08]'
      : 'rounded-xl border border-amber-500/20 bg-amber-500/8',

    // ── Accent icon badge ──────────────────────────────────────────────────
    iconBadge: 'rounded-2xl bg-[var(--accent)] shadow-lg',

    // ── Message hover highlight ────────────────────────────────────────────
    msgHover: g
      ? 'hover:bg-black/[0.04] dark:hover:bg-white/[0.05] rounded-xl transition-colors duration-200'
      : 'hover:bg-foreground/[0.04] rounded-xl transition-colors duration-150',

    // ── Panel transitions ──────────────────────────────────────────────────
    panelTransition: 'ui-apple-ease transition-all duration-300 will-change-transform',
    sidebarTransition: 'ui-apple-ease transition-transform duration-300 will-change-transform',
    contentTransition: 'ui-apple-ease transition-opacity duration-250',
    mobilePanel: 'rounded-none sm:rounded-xl',

    // ── Chat/content panel background ─────────────────────────────────────
    contentBg: g
      ? 'glass-bg-content glass-blur dark:glass-bg-content'
      : '',

    // ── Settings / large modal background ─────────────────────────────────
    glassModal: g
      ? 'glass-blur glass-bg-modal'
      : 'bg-card',

    // ── Settings modal sidebar ─────────────────────────────────────────────
    glassModalSidebar: g
      ? 'bg-black/[0.04] dark:bg-white/[0.04]'
      : 'bg-muted/30',

    // ── Floating panels / context menus ───────────────────────────────────
    floatingPanel: g
      ? [
          'rounded-2xl glass-blur glass-bg-float',
          'border border-black/[0.09]',
          'shadow-[0_12px_40px_rgba(0,0,0,0.10),inset_0_0.5px_0_rgba(255,255,255,0.90)]',
          'dark:border-white/[0.12]',
          'dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)]',
        ].join(' ')
      : 'rounded-2xl border border-border/60 bg-background shadow-lg',
  };
}
