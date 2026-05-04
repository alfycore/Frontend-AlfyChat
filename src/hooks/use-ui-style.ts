'use client';

import { useLayoutPrefs } from '@/hooks/use-layout-prefs';

/**
 * Returns pre-built Tailwind class strings for the current UI style.
 * Switch between 'flat' and 'glass' via Settings → Mise en page → Style d'interface.
 *
 * Glass mode: Apple-inspired frosted-glass panels with blur.
 *   - Dark theme (dark wallpaper / no wallpaper): white-tinted glass, subtle highlights
 *   - Light theme (light wallpaper): white/opaque frosted glass, dark borders
 * Flat mode: Clean Notion-like panels with rounded corners + subtle shadows.
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
    // Light theme (light wallpaper): white/60 frosted glass, dark border
    // Dark theme (dark wallpaper or no wallpaper): white/10 glass, white border
    sidebarBg: g
      ? [
          'backdrop-blur-3xl',
          // light theme
          'bg-white/[0.58]',
          'border border-black/[0.09]',
          'shadow-[inset_0_0.5px_0_rgba(255,255,255,0.85),0_0_0_0.5px_rgba(0,0,0,0.06)]',
          // dark theme
          'dark:bg-white/[0.09]',
          'dark:border-white/[0.10]',
          'dark:shadow-[inset_0_0.5px_0_rgba(255,255,255,0.18),0_0_0_0.5px_rgba(255,255,255,0.08)]',
        ].join(' ')
      : 'bg-sidebar',

    // ── Header bars (inside panels) ────────────────────────────────────────
    header: g
      ? [
          'backdrop-blur-2xl',
          'border-b border-black/[0.07] bg-white/[0.35]',
          'dark:border-white/[0.08] dark:bg-white/[0.05]',
        ].join(' ')
      : 'border-b border-border/50 bg-sidebar',

    // ── Input bar ─────────────────────────────────────────────────────────
    inputBar: g
      ? [
          'rounded-2xl backdrop-blur-3xl',
          'border border-black/[0.10] bg-white/[0.65]',
          'shadow-[0_2px_12px_rgba(0,0,0,0.06),inset_0_0.5px_0_rgba(255,255,255,0.90)]',
          'dark:border-white/[0.12] dark:bg-white/[0.10]',
          'dark:shadow-[0_2px_12px_rgba(0,0,0,0.30),inset_0_0.5px_0_rgba(255,255,255,0.08)]',
        ].join(' ')
      : 'rounded-xl border border-border/60 bg-background/80',

    // ── Reply bar (above input) ────────────────────────────────────────────
    replyBar: g
      ? [
          'rounded-t-2xl border border-b-0 backdrop-blur-2xl',
          'border-black/[0.08] bg-white/[0.50]',
          'dark:border-white/[0.10] dark:bg-white/[0.06]',
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
          'rounded-3xl backdrop-blur-2xl',
          'border border-black/[0.08] bg-white/[0.55]',
          'shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_0.5px_0_rgba(255,255,255,0.80)]',
          'dark:border-white/[0.08] dark:bg-white/[0.05]',
          'dark:shadow-[0_8px_32px_rgba(0,0,0,0.25)]',
        ].join(' ')
      : 'rounded-2xl border border-border/60 bg-sidebar shadow-sm',

    // ── Date separator chip ────────────────────────────────────────────────
    chip: g
      ? [
          'rounded-full backdrop-blur-xl',
          'border border-black/[0.10] bg-white/[0.60]',
          'shadow-[0_1px_4px_rgba(0,0,0,0.05),inset_0_0.5px_0_rgba(255,255,255,0.80)]',
          'dark:border-white/[0.10] dark:bg-white/[0.08]',
          'dark:shadow-[0_1px_4px_rgba(0,0,0,0.10),inset_0_0.5px_0_rgba(255,255,255,0.06)]',
        ].join(' ')
      : 'rounded-full border border-border/50 bg-background',

    // ── Announcement / info banner ─────────────────────────────────────────
    announcementBanner: g
      ? 'rounded-2xl border border-amber-400/30 bg-amber-400/[0.15] backdrop-blur-xl dark:border-amber-400/20 dark:bg-amber-400/[0.08]'
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
    // Used by chat-area, group-chat-area, views, etc.
    // Light: semi-opaque white frosted glass; Dark: subtle white tint
    contentBg: g
      ? 'bg-white/[0.50] backdrop-blur-2xl dark:bg-white/[0.08]'
      : '',

    // ── Settings / large modal background ─────────────────────────────────
    // Light theme: white/75 frosted glass — visible and clean on bright bg
    // Dark theme: dark translucent — maintains depth on dark bg
    glassModal: g
      ? [
          'backdrop-blur-md',
          'bg-white/[0.75]',
          'dark:bg-[oklch(0.16_0.006_286/0.82)]',
        ].join(' ')
      : 'bg-card',

    // ── Settings modal sidebar ─────────────────────────────────────────────
    glassModalSidebar: g
      ? 'bg-black/[0.04] dark:bg-white/[0.04]'
      : 'bg-muted/30',

    // ── Floating panels / context menus ───────────────────────────────────
    floatingPanel: g
      ? [
          'rounded-2xl backdrop-blur-3xl',
          'border border-black/[0.09] bg-white/[0.70]',
          'shadow-[0_12px_40px_rgba(0,0,0,0.10),inset_0_0.5px_0_rgba(255,255,255,0.90)]',
          'dark:border-white/[0.12] dark:bg-[oklch(0.18_0.006_286/0.72)]',
          'dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)]',
        ].join(' ')
      : 'rounded-2xl border border-border/60 bg-background shadow-lg',
  };
}
