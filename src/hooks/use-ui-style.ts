'use client';

import { useLayoutPrefs } from '@/hooks/use-layout-prefs';

/**
 * Returns pre-built Tailwind class strings for the current UI style.
 * 'glass' → Apple-style frosted glass via CSS vars set by useLayoutPrefs.
 * 'flat'  → Clean solid surfaces using HeroUI surface tokens.
 */
export function useUIStyle() {
  const { prefs } = useLayoutPrefs();
  const g = prefs.uiStyle === 'glass';

  return {
    isGlass: g,

    rootPadding: 'p-2 gap-2',

    panelWrapper: g
      ? 'rounded-2xl overflow-hidden ring-1 ring-black/[0.06] dark:ring-white/[0.08]'
      : 'rounded-xl bg-surface overflow-hidden shadow-sm',

    sidebarWrapper: g
      ? 'rounded-2xl overflow-hidden ring-1 ring-black/[0.06] dark:ring-white/[0.08]'
      : 'rounded-xl overflow-hidden',

    dividerRight: '',
    dividerLeft: '',
    dividerBottom: '',

    sidebarBg: g
      ? [
          'glass-blur glass-bg-sidebar',
          'border border-black/[0.08]',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.90),0_0_0_0.5px_rgba(0,0,0,0.05),0_4px_24px_rgba(0,0,0,0.04)]',
          'dark:border-white/[0.09]',
          'dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_0_0.5px_rgba(255,255,255,0.07),0_4px_24px_rgba(0,0,0,0.30)]',
        ].join(' ')
      : 'bg-surface',

    header: g
      ? [
          'glass-blur glass-bg-header',
          'border-b border-black/[0.06]',
          'shadow-[0_0.5px_0_rgba(255,255,255,0.70)]',
          'dark:border-white/[0.07]',
          'dark:shadow-[0_0.5px_0_rgba(255,255,255,0.06)]',
        ].join(' ')
      : 'bg-surface',

    inputBar: g
      ? [
          'rounded-2xl glass-blur glass-bg-input',
          'border border-black/[0.09]',
          'shadow-[0_4px_20px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.95)]',
          'dark:border-white/[0.11]',
          'dark:shadow-[0_4px_20px_rgba(0,0,0,0.40),inset_0_1px_0_rgba(255,255,255,0.07)]',
        ].join(' ')
      : 'rounded-2xl bg-surface-secondary',

    replyBar: g
      ? [
          'rounded-t-2xl border border-b-0 glass-blur glass-bg-reply',
          'border-black/[0.07]',
          'dark:border-white/[0.09]',
        ].join(' ')
      : 'rounded-t-2xl bg-surface-secondary',

    row: g
      ? [
          'rounded-xl border border-transparent transition-all duration-200',
          'hover:bg-black/[0.07] hover:border-black/[0.06]',
          'hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_0.5px_0_rgba(255,255,255,0.70)]',
          'dark:hover:bg-white/[0.08] dark:hover:border-white/[0.09]',
          'dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.25)]',
        ].join(' ')
      : 'rounded-xl hover:bg-foreground/[0.055] transition-colors duration-150',

    emptyCard: g
      ? [
          'rounded-3xl glass-blur glass-bg-empty',
          'border border-black/[0.07]',
          'shadow-[0_12px_40px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.85)]',
          'dark:border-white/[0.07]',
          'dark:shadow-[0_12px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]',
        ].join(' ')
      : 'rounded-2xl bg-surface shadow-sm',

    chip: g
      ? [
          'rounded-full glass-blur glass-bg-chip',
          'border border-black/[0.08]',
          'shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_0.5px_0_rgba(255,255,255,0.85)]',
          'dark:border-white/[0.09]',
          'dark:shadow-[0_2px_8px_rgba(0,0,0,0.20),inset_0_0.5px_0_rgba(255,255,255,0.06)]',
        ].join(' ')
      : 'rounded-full bg-surface-secondary',

    announcementBanner: g
      ? 'rounded-2xl border border-warning/25 bg-warning/[0.12] glass-blur shadow-[inset_0_0.5px_0_rgba(255,255,255,0.60)] dark:border-warning/18 dark:bg-warning/[0.07]'
      : 'rounded-xl bg-warning/10',

    iconBadge: 'rounded-2xl bg-accent shadow-lg shadow-accent/20',

    msgHover: g
      ? 'hover:bg-black/[0.035] dark:hover:bg-white/[0.04] rounded-xl transition-colors duration-200'
      : 'hover:bg-foreground/[0.04] rounded-xl transition-colors duration-150',

    panelTransition: 'ui-apple-ease transition-all duration-300 will-change-transform',
    sidebarTransition: 'ui-apple-ease transition-transform duration-300 will-change-transform',
    contentTransition: 'ui-apple-ease transition-opacity duration-250',
    mobilePanel: 'rounded-none sm:rounded-xl',

    contentBg: g ? 'glass-bg-content glass-blur' : '',

    glassModal: g
      ? 'glass-blur glass-bg-modal ring-1 ring-black/[0.08] dark:ring-white/[0.10] shadow-2xl shadow-black/20'
      : 'bg-overlay shadow-2xl shadow-black/20',

    glassModalSidebar: g
      ? 'bg-black/[0.04] dark:bg-white/[0.04]'
      : 'bg-default/30',

    floatingPanel: g
      ? [
          'rounded-2xl glass-blur glass-bg-float',
          'border border-black/[0.08]',
          'shadow-[0_16px_48px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.92)]',
          'dark:border-white/[0.11]',
          'dark:shadow-[0_16px_48px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.07)]',
        ].join(' ')
      : 'rounded-2xl bg-overlay shadow-overlay',
  };
}
