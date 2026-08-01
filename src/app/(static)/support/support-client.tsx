'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldIcon, SettingsIcon, ServerIcon, HelpCircleIcon,
  MessageSquareIcon, BookOpenIcon, ArrowRightIcon,
  ZapIcon, CheckCircle2Icon, ClockIcon, InboxIcon, AlertTriangleIcon,
} from '@/components/icons';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { useTranslation } from '@/components/locale-provider';

export interface Category { id: string; slug: string; title: string; description: string | null; iconName: string; color: string; articleCount?: number; }
export interface Article  { id: string; slug: string; title: string; summary: string | null; viewCount: number; categorySlug: string | null; }
export interface Announcement { id: string; type: string; title: string; summary: string | null; isResolved: boolean; publishedAt: string; }
export interface KnownIssue   { id: string; title: string; description: string | null; status: string; categoryLabel: string | null; updatedAt: string; }

const ICON_MAP: Record<string, React.ElementType> = {
  shield: ShieldIcon, settings: SettingsIcon, server: ServerIcon, 'circle-help': HelpCircleIcon,
};

const ANN_COLOR: Record<string, string> = {
  incident: '#ef4444', maintenance: '#f59e0b', news: '#22c55e',
};

const ISSUE_COLOR: Record<string, string> = {
  investigating: '#f59e0b', in_progress: '#8b5cf6', resolved: '#22c55e',
};

interface Props {
  categories: Category[];
  popularArticles: Article[];
  announcements: Announcement[];
  knownIssues: KnownIssue[];
}

export function SupportClient({ categories, popularArticles, announcements, knownIssues }: Props) {
  const { t, tx, locale } = useTranslation();
  const s = t.static.support;
  const [query, setQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return popularArticles.filter(a =>
      a.title.toLowerCase().includes(q) || (a.summary ?? '').toLowerCase().includes(q)
    ).slice(0, 6);
  }, [query, popularArticles]);

  const activeIncidents = announcements.filter(a => !a.isResolved && a.type === 'incident');
  const openIssues = knownIssues.filter(i => i.status !== 'resolved');
  const hasAlert = activeIncidents.length > 0 || openIssues.length > 0;

  const annTypeLabel = (type: string) =>
    (s.announceType as Record<string, string>)[type] ?? type;
  const issueStatusLabel = (status: string) => {
    const m = s.status as Record<string, string>;
    return m[status === 'in_progress' ? 'inProgress' : status] ?? status;
  };

  return (
    <div className="min-h-screen bg-background">

      {/* Incident banner */}
      {hasAlert && (
        <div className="border-b border-amber-500/20 bg-amber-500/5">
          <div className="mx-auto max-w-6xl px-6 py-2.5 flex items-center gap-3">
            <AlertTriangleIcon size={13} className="text-amber-500 shrink-0" />
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 truncate">
              {activeIncidents[0]?.title ?? openIssues[0]?.title}
            </p>
            <Link href="/status"
              className="ml-auto shrink-0 text-xs font-medium text-amber-500 hover:underline underline-offset-2">
              {s.viewStatus}
            </Link>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <div className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 size-125 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-1/2 right-1/4 size-64 rounded-full bg-primary/3 blur-2xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-14">
          <MotionFade direction="up" distance={14} duration={0.45}>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 items-start">

              {/* Left: heading + search */}
              <div>
                <div className="mb-5 inline-flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-green-500" />
                  <span className="text-xs text-muted-foreground">{s.badge}</span>
                </div>
                <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-4 max-w-xl">
                  {s.heading}
                </h1>
                <p className="text-muted-foreground leading-relaxed mb-8 max-w-md">{s.intro}</p>

                {/* Search */}
                <div className="relative max-w-md">
                  <div className="flex items-center gap-3 h-12 rounded-xl border border-border bg-card px-4 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
                    <BookOpenIcon size={15} className="text-muted-foreground/50 shrink-0" />
                    <input
                      type="text"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Rechercher un article..."
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                    />
                    {query && (
                      <button onClick={() => setQuery('')}
                        className="text-muted-foreground/50 hover:text-foreground transition-colors text-xs">
                        ×
                      </button>
                    )}
                  </div>

                  {/* Search dropdown */}
                  {query.trim() && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-border bg-card shadow-xl overflow-hidden z-20">
                      {searchResults.length > 0 ? (
                        searchResults.map((art, i) => (
                          <Link key={art.id}
                            href={`/support/${art.categorySlug ?? 'general'}/${art.slug}`}
                            onClick={() => setQuery('')}
                            className={`group flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${i < searchResults.length - 1 ? 'border-b border-border/60' : ''}`}>
                            <BookOpenIcon size={13} className="text-muted-foreground shrink-0" />
                            <span className="text-sm flex-1 min-w-0 truncate group-hover:text-primary transition-colors">{art.title}</span>
                            <ArrowRightIcon size={12} className="text-muted-foreground shrink-0" />
                          </Link>
                        ))
                      ) : (
                        <div className="px-4 py-4 text-center text-sm text-muted-foreground">
                          Aucun résultat
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: quick actions */}
              <div className="space-y-2.5 pt-1 lg:pt-14">
                {[
                  { href: '/support/contact',     icon: MessageSquareIcon, color: 'text-primary', bg: 'bg-primary/10',    title: s.contactCTA,    sub: 'Ouvrir un ticket' },
                  { href: '/support/mes-tickets', icon: InboxIcon,         color: 'text-blue-500', bg: 'bg-blue-500/10',   title: s.myTickets,     sub: 'Vos demandes' },
                  { href: '/status',              icon: ZapIcon,           color: 'text-amber-500',bg: 'bg-amber-500/10',  title: s.serviceStatus, sub: "État des services" },
                ].map(({ href, icon: Icon, color, bg, title, sub }) => (
                  <Link key={href} href={href}
                    className="group flex items-center gap-3.5 rounded-xl border border-border bg-card/60 px-4 py-3.5 hover:bg-card hover:shadow-sm hover:border-border/80 transition-all">
                    <div className={`size-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                      <Icon size={17} className={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-none mb-0.5">{title}</p>
                      <p className="text-[11px] text-muted-foreground">{sub}</p>
                    </div>
                    <ArrowRightIcon size={13} className="text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          </MotionFade>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pt-14 pb-20 space-y-16">

        {/* ── Categories ── */}
        <MotionFade direction="up" distance={12} duration={0.5}>
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-bold tracking-tight">{s.browseByTheme}</h2>
            </div>
            <MotionStagger stagger={0.04} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map(cat => {
                const Icon = ICON_MAP[cat.iconName] ?? HelpCircleIcon;
                return (
                  <MotionStaggerItem key={cat.slug}>
                    <Link href={`/support/${cat.slug}`}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-transparent h-full">
                      {/* Colored top accent on hover */}
                      <div className="absolute top-0 inset-x-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: cat.color }} />
                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex items-start gap-3.5 mb-3">
                          <div className="size-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: cat.color + '18' }}>
                            <Icon size={18} style={{ color: cat.color }} />
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center justify-between gap-1">
                              <p className="font-semibold text-sm leading-tight">{cat.title}</p>
                              <ArrowRightIcon size={13}
                                className="text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                            </div>
                          </div>
                        </div>
                        {cat.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">
                            {cat.description}
                          </p>
                        )}
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <span className="text-[11px] font-semibold"
                            style={{ color: cat.color + 'cc' }}>
                            {tx(s.articlesCount, { n: cat.articleCount ?? 0 })}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </MotionStaggerItem>
                );
              })}
            </MotionStagger>
          </section>
        </MotionFade>

        {/* ── Popular Articles ── */}
        {popularArticles.length > 0 && (
          <MotionFade direction="up" distance={12} duration={0.5}>
            <section>
              <h2 className="text-base font-bold tracking-tight mb-6">{s.popularArticles}</h2>
              <div className="grid gap-x-12 md:grid-cols-2">
                {popularArticles.map((art, i) => (
                  <Link key={art.id}
                    href={`/support/${art.categorySlug ?? 'general'}/${art.slug}`}
                    className="group flex items-center gap-4 py-3.5 border-b border-border/50 hover:border-primary/20 transition-colors last:border-0">
                    <span className="text-3xl font-black font-mono text-muted-foreground/10 group-hover:text-primary/20 transition-colors shrink-0 w-9 text-right leading-none tabular-nums select-none">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium group-hover:text-primary transition-colors leading-snug line-clamp-1">
                        {art.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                        {tx(s.viewsCount, { n: art.viewCount.toLocaleString(locale) })}
                      </p>
                    </div>
                    <ArrowRightIcon size={12}
                      className="text-muted-foreground/20 group-hover:text-primary/60 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          </MotionFade>
        )}

        {/* ── Active Announcements ── */}
        {announcements.filter(a => !a.isResolved).length > 0 && (
          <MotionFade direction="up" distance={12} duration={0.5}>
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold tracking-tight">{s.announcements}</h2>
                <Link href="/status" className="text-xs text-primary hover:underline underline-offset-2">
                  {s.viewStatus}
                </Link>
              </div>
              <div className="space-y-2">
                {announcements.filter(a => !a.isResolved).map(ann => {
                  const color = ANN_COLOR[ann.type] ?? ANN_COLOR.news;
                  return (
                    <div key={ann.id}
                      className="flex gap-4 items-start rounded-xl border border-border bg-card px-5 py-4"
                      style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                            style={{ background: color + '18', color }}>
                            {annTypeLabel(ann.type)}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{ann.title}</p>
                        {ann.summary && (
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ann.summary}</p>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground/50 shrink-0 flex items-center gap-1 mt-0.5">
                        <ClockIcon size={10} />
                        {new Date(ann.publishedAt).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </MotionFade>
        )}

        {/* ── Known Issues ── */}
        {openIssues.length > 0 && (
          <MotionFade direction="up" distance={12} duration={0.5}>
            <section>
              <h2 className="text-base font-bold tracking-tight mb-4">{s.knownIssues}</h2>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {openIssues.map((issue, i) => {
                  const color = ISSUE_COLOR[issue.status] ?? ISSUE_COLOR.investigating;
                  return (
                    <div key={issue.id}
                      className={`flex items-center gap-4 px-5 py-3.5 ${i < openIssues.length - 1 ? 'border-b border-border/60' : ''}`}>
                      <span className="relative flex size-2 shrink-0">
                        <span className="animate-ping absolute inset-0 rounded-full opacity-50"
                          style={{ background: color }} />
                        <span className="relative rounded-full size-2" style={{ background: color }} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">{issue.title}</p>
                        {issue.categoryLabel && (
                          <p className="text-xs text-muted-foreground">{issue.categoryLabel}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-[11px] font-medium rounded-full px-2.5 py-0.5"
                        style={{ background: color + '15', color }}>
                        {issueStatusLabel(issue.status)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </MotionFade>
        )}

        {/* ── CTA strip ── */}
        <MotionFade direction="up" distance={12} duration={0.5}>
          <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 rounded-2xl border border-border bg-card/50 px-7 py-6">
            <div>
              <p className="font-semibold text-sm leading-tight mb-1">{s.notFoundTitle}</p>
              <p className="text-xs text-muted-foreground">{s.notFoundBody}</p>
            </div>
            <Link href="/support/contact"
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all">
              <MessageSquareIcon size={14} /> {s.openTicket}
            </Link>
          </section>
        </MotionFade>
      </div>

      {/* Footer */}
      <div className="border-t border-border/50">
        <div className="mx-auto max-w-6xl px-6 py-7 flex flex-wrap gap-4 justify-between items-center text-xs text-muted-foreground">
          <span>{t.static.common.footerCopyright}</span>
          <div className="flex gap-5">
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">{t.static.common.legalPrivacy}</Link>
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">{t.static.common.legalTerms}</Link>
            <Link href="/legal/rgpd" className="hover:text-foreground transition-colors">{t.static.common.legalRgpd}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
