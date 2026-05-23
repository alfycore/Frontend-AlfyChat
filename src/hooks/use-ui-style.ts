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
  useLayoutPrefs(); // keep subscription for re-renders
  const g = true; // glass-first: always render the glass aesthetic

  return {
    isGlass: g,

    // ── Root layout ────────────────────────────────────────────────────────
    rootPadding: 'p-2 gap-2',

    // ── Panel wrapper — for content & member list ──────────────────────────
    panelWrapper: g
      ? 'rounded-2xl overflow-hidden ring-1 ring-black/[0.06] dark:ring-white/[0.08]'
      : 'rounded-xl bg-card overflow-hidden border border-border/40 shadow-sm',

    // ── Sidebar wrapper ────────────────────────────────────────────────────
    sidebarWrapper: g
      ? 'rounded-2xl overflow-hidden ring-1 ring-black/[0.06] dark:ring-white/[0.08]'
      : 'rounded-xl overflow-hidden',

    dividerRight: '',
    dividerLeft: '',
    dividerBottom: '',

    // ── Sidebar / panel background ─────────────────────────────────────────
    sidebarBg: g
      ? [
          'glass-blur glass-bg-sidebar',
          'border border-black/[0.08]',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.90),0_0_0_0.5px_rgba(0,0,0,0.05),0_4px_24px_rgba(0,0,0,0.04)]',
          'dark:border-white/[0.09]',
          'dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_0_0.5px_rgba(255,255,255,0.07),0_4px_24px_rgba(0,0,0,0.30)]',
        ].join(' ')
      : 'bg-sidebar',

    // ── Header bars (inside panels) ────────────────────────────────────────
    header: g
      ? [
          'glass-blur glass-bg-header',
          'border-b border-black/[0.06]',
          'shadow-[0_0.5px_0_rgba(255,255,255,0.70)]',
          'dark:border-white/[0.07]',
          'dark:shadow-[0_0.5px_0_rgba(255,255,255,0.06)]',
        ].join(' ')
      : 'border-b border-border/50 bg-sidebar',

    // ── Input bar ─────────────────────────────────────────────────────────
    inputBar: g
      ? [
          'rounded-2xl glass-blur glass-bg-input',
          'border border-black/[0.09]',
          'shadow-[0_4px_20px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.95)]',
          'dark:border-white/[0.11]',
          'dark:shadow-[0_4px_20px_rgba(0,0,0,0.40),inset_0_1px_0_rgba(255,255,255,0.07)]',
        ].join(' ')
      : 'rounded-xl border border-border/60 bg-background/80',

    // ── Reply bar (above input) ────────────────────────────────────────────
    replyBar: g
      ? [
          'rounded-t-2xl border border-b-0 glass-blur glass-bg-reply',
          'border-black/[0.07]',
          'dark:border-white/[0.09]',
        ].join(' ')
      : 'rounded-t-xl border border-b-0 border-border/60 bg-sidebar',

    // ── Clickable rows (DM entries, friend entries) ────────────────────────
    row: g
      ? [
          'rounded-xl border border-transparent transition-all duration-200',
          'hover:bg-black/[0.07] hover:border-black/[0.06]',
          'hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_0.5px_0_rgba(255,255,255,0.70)]',
          'dark:hover:bg-white/[0.08] dark:hover:border-white/[0.09]',
          'dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.25)]',
        ].join(' ')
      : 'rounded-xl hover:bg-foreground/[0.055] transition-colors duration-150',

    // ── Empty-state / info cards ───────────────────────────────────────────
    emptyCard: g
      ? [
          'rounded-3xl glass-blur glass-bg-empty',
          'border border-black/[0.07]',
          'shadow-[0_12px_40px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.85)]',
          'dark:border-white/[0.07]',
          'dark:shadow-[0_12px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]',
        ].join(' ')
      : 'rounded-2xl border border-border/60 bg-sidebar shadow-sm',

    // ── Date separator chip ────────────────────────────────────────────────
    chip: g
      ? [
          'rounded-full glass-blur glass-bg-chip',
          'border border-black/[0.08]',
          'shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_0.5px_0_rgba(255,255,255,0.85)]',
          'dark:border-white/[0.09]',
          'dark:shadow-[0_2px_8px_rgba(0,0,0,0.20),inset_0_0.5px_0_rgba(255,255,255,0.06)]',
        ].join(' ')
      : 'rounded-full border border-border/50 bg-background',

    // ── Announcement / info banner ─────────────────────────────────────────
    announcementBanner: g
      ? 'rounded-2xl border border-amber-400/25 bg-amber-400/[0.12] glass-blur shadow-[inset_0_0.5px_0_rgba(255,255,255,0.60)] dark:border-amber-400/18 dark:bg-amber-400/[0.07]'
      : 'rounded-xl border border-amber-500/20 bg-amber-500/8',

    // ── Accent icon badge ──────────────────────────────────────────────────
    iconBadge: 'rounded-2xl bg-[var(--accent)] shadow-lg shadow-[var(--accent)]/20',

    // ── Message hover highlight ────────────────────────────────────────────
    msgHover: g
      ? 'hover:bg-black/[0.035] dark:hover:bg-white/[0.04] rounded-xl transition-colors duration-200'
      : 'hover:bg-foreground/[0.04] rounded-xl transition-colors duration-150',

    // ── Panel transitions ──────────────────────────────────────────────────
    panelTransition: 'ui-apple-ease transition-all duration-300 will-change-transform',
    sidebarTransition: 'ui-apple-ease transition-transform duration-300 will-change-transform',
    contentTransition: 'ui-apple-ease transition-opacity duration-250',
    mobilePanel: 'rounded-none sm:rounded-xl',

    // ── Chat/content panel background ─────────────────────────────────────
    contentBg: g
      ? 'glass-bg-content glass-blur'
      : '',

    // ── Settings / large modal background ─────────────────────────────────
    // Use a nearly-opaque card background so the modal is visible on all wallpapers
    glassModal: 'bg-card/[0.97] backdrop-blur-2xl ring-1 ring-black/[0.07] dark:ring-white/[0.09] shadow-2xl shadow-black/20',

    // ── Settings modal sidebar ─────────────────────────────────────────────
    glassModalSidebar: 'bg-foreground/[0.03] dark:bg-white/[0.04]',

    // ── Floating panels / context menus ───────────────────────────────────
    floatingPanel: g
      ? [
          'rounded-2xl glass-blur glass-bg-float',
          'border border-black/[0.08]',
          'shadow-[0_16px_48px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.92)]',
          'dark:border-white/[0.11]',
          'dark:shadow-[0_16px_48px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.07)]',
        ].join(' ')
      : 'rounded-2xl border border-border/60 bg-background shadow-lg',
  };
}
