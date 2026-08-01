'use client';

import Link from 'next/link';
import {
  ShieldIcon, SettingsIcon, ServerIcon, HelpCircleIcon,
  MessageSquareIcon, BookOpenIcon, ArrowRightIcon,
  ZapIcon, CheckCircle2Icon, ClockIcon, InboxIcon,
} from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { useTranslation } from '@/components/locale-provider';

export interface Category { id: string; slug: string; title: string; description: string | null; iconName: string; color: string; articleCount?: number; }
export interface Article  { id: string; slug: string; title: string; summary: string | null; viewCount: number; categorySlug: string | null; }
export interface Announcement { id: string; type: string; title: string; summary: string | null; isResolved: boolean; publishedAt: string; }
export interface KnownIssue   { id: string; title: string; description: string | null; status: string; categoryLabel: string | null; updatedAt: string; }

const ICON_MAP: Record<string, React.ElementType> = {
  shield: ShieldIcon, settings: SettingsIcon, server: ServerIcon,
  'circle-help': HelpCircleIcon,
};
function CategoryIcon({ name, color }: { name: string; color: string }) {
  const Icon = ICON_MAP[name] ?? HelpCircleIcon;
  return (
    <div className="shrink-0 size-10 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
      <Icon size={18} style={{ color }} />
    </div>
  );
}

interface Props {
  categories: Category[];
  popularArticles: Article[];
  announcements: Announcement[];
  knownIssues: KnownIssue[];
}

export function SupportClient({ categories, popularArticles, announcements, knownIssues }: Props) {
  const { t, tx, locale } = useTranslation();
  const s = t.static.support;

  const issueStatusFor = (status: string) => {
    const colors: Record<string, string> = { investigating: '#f59e0b', in_progress: '#8b5cf6', resolved: '#22c55e' };
    const labels: Record<string, string> = {
      investigating: s.status.investigating,
      in_progress: s.status.inProgress,
      resolved: s.status.resolved,
    };
    return { label: labels[status] ?? labels.investigating, color: colors[status] ?? colors.investigating };
  };

  const announceTypeFor = (type: string) => {
    const colors: Record<string, { color: string; bg: string }> = {
      incident:    { color: '#ef4444', bg: '#ef444415' },
      maintenance: { color: '#f59e0b', bg: '#f59e0b15' },
      news:        { color: '#22c55e', bg: '#22c55e15' },
    };
    const labels: Record<string, string> = {
      incident: s.announceType.incident,
      maintenance: s.announceType.maintenance,
      news: s.announceType.news,
    };
    const cfg = colors[type] ?? colors.news;
    return { label: labels[type] ?? labels.news, ...cfg };
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
        <div className="mx-auto max-w-4xl px-6 py-20 text-center relative">
          <MotionFade direction="down" distance={12} duration={0.5}>
            <Badge variant="outline" className="mb-4 text-[10px] font-mono">{s.badge}</Badge>
            <h1 className="font-heading text-4xl font-bold leading-tight mb-4">{s.heading}</h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">{s.intro}</p>
          </MotionFade>
          <MotionStagger stagger={0.06} className="flex gap-3 justify-center flex-wrap">
            <MotionStaggerItem>
              <Link href="/support/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <MessageSquareIcon size={16} /> {s.contactCTA}
              </Link>
            </MotionStaggerItem>
            <MotionStaggerItem>
              <Link href="/support/mes-tickets"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                <InboxIcon size={16} /> {s.myTickets}
              </Link>
            </MotionStaggerItem>
            <MotionStaggerItem>
              <Link href="/status"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                <ZapIcon size={16} /> {s.serviceStatus}
              </Link>
            </MotionStaggerItem>
          </MotionStagger>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-12 space-y-16">
        {/* Annonces */}
        {announcements.length > 0 && (
          <MotionFade direction="up" distance={14} duration={0.5}>
            <section>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">{s.announcements}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{s.announcementsDesc}</p>
                </div>
                <Link href="/status" className="text-xs text-primary flex items-center gap-1 hover:underline">
                  {s.viewStatus} <ArrowRightIcon size={12} />
                </Link>
              </div>
              <MotionStagger stagger={0.05} className="space-y-3">
                {announcements.map(ann => {
                  const cfg = announceTypeFor(ann.type);
                  return (
                    <MotionStaggerItem key={ann.id}>
                      <div className="rounded-xl border border-border bg-card p-4 flex gap-4 items-start">
                        <span className="shrink-0 mt-0.5 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm leading-snug">{ann.title}</p>
                            {ann.isResolved && (
                              <span className="shrink-0 flex items-center gap-1 text-xs text-green-500 font-medium">
                                <CheckCircle2Icon size={12} /> {s.resolvedLabel}
                              </span>
                            )}
                          </div>
                          {ann.summary && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ann.summary}</p>}
                          <p className="text-xs text-muted-foreground/60 mt-1.5 flex items-center gap-1">
                            <ClockIcon size={10} /> {new Date(ann.publishedAt).toLocaleDateString(locale)}
                          </p>
                        </div>
                      </div>
                    </MotionStaggerItem>
                  );
                })}
              </MotionStagger>
            </section>
          </MotionFade>
        )}

        {/* Problèmes connus */}
        {knownIssues.length > 0 && (
          <MotionFade direction="up" distance={14} duration={0.5}>
            <section>
              <h2 className="text-xl font-bold mb-2">{s.knownIssues}</h2>
              <p className="text-sm text-muted-foreground mb-6">{s.knownIssuesDesc}</p>
              <div className="rounded-xl border border-border overflow-hidden">
                {knownIssues.map((issue, i) => {
                  const st = issueStatusFor(issue.status);
                  return (
                    <div key={issue.id}
                      className={'flex items-center gap-4 px-5 py-4' + (i < knownIssues.length - 1 ? ' border-b border-border' : '')}>
                      <span className="shrink-0 size-2 rounded-full" style={{ background: st.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">{issue.title}</p>
                        {issue.categoryLabel && (
                          <p className="text-xs text-muted-foreground mt-0.5">{issue.categoryLabel}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: st.color + '20', color: st.color }}>
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </MotionFade>
        )}

        {/* Catégories */}
        <MotionFade direction="up" distance={14} duration={0.5}>
          <section>
            <h2 className="text-xl font-bold mb-2">{s.browseByTheme}</h2>
            <p className="text-sm text-muted-foreground mb-6">{s.browseByThemeDesc}</p>
            <MotionStagger stagger={0.05} className="grid gap-4 md:grid-cols-2">
              {categories.map(cat => (
                <MotionStaggerItem key={cat.slug}>
                  <Link href={`/support/${cat.slug}`}
                    className="group rounded-xl border border-border bg-card p-5 flex gap-4 items-start hover:border-primary/40 hover:bg-primary/5 transition-all h-full"
                    style={{ borderLeftColor: cat.color, borderLeftWidth: 3 }}>
                    <CategoryIcon name={cat.iconName} color={cat.color} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm">{cat.title}</p>
                        <ArrowRightIcon size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      {cat.description && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{cat.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground/60 mt-2">{tx(s.articlesCount, { n: cat.articleCount ?? 0 })}</p>
                    </div>
                  </Link>
                </MotionStaggerItem>
              ))}
            </MotionStagger>
          </section>
        </MotionFade>

        {/* Articles populaires */}
        {popularArticles.length > 0 && (
          <MotionFade direction="up" distance={14} duration={0.5}>
            <section>
              <h2 className="text-xl font-bold mb-2">{s.popularArticles}</h2>
              <p className="text-sm text-muted-foreground mb-6">{s.popularArticlesDesc}</p>
              <div className="rounded-xl border border-border overflow-hidden">
                {popularArticles.map((art, i) => (
                  <Link key={art.id} href={`/support/${art.categorySlug ?? 'general'}/${art.slug}`}
                    className={'flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors group' + (i < popularArticles.length - 1 ? ' border-b border-border' : '')}>
                    <BookOpenIcon size={16} className="text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{art.title}</p>
                      {art.summary && <p className="text-xs text-muted-foreground mt-0.5 truncate">{art.summary}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {tx(s.viewsCount, { n: art.viewCount.toLocaleString(locale) })}
                    </span>
                    <ArrowRightIcon size={12} className="text-muted-foreground group-hover:text-primary shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          </MotionFade>
        )}

        {/* CTA */}
        <MotionFade direction="up" distance={14} duration={0.5}>
          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
            <div className="size-12 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <MessageSquareIcon size={22} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">{s.notFoundTitle}</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">{s.notFoundBody}</p>
            <Link href="/support/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <MessageSquareIcon size={15} /> {s.openTicket}
            </Link>
          </section>
        </MotionFade>
      </div>

      {/* Footer */}
      <div className="border-t border-border/50 mt-8">
        <div className="mx-auto max-w-5xl px-6 py-8 flex flex-wrap gap-4 justify-between items-center text-xs text-muted-foreground">
          <span>{t.static.common.footerCopyright}</span>
          <div className="flex gap-4">
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">{t.static.common.legalPrivacy}</Link>
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">{t.static.common.legalTerms}</Link>
            <Link href="/legal/rgpd" className="hover:text-foreground transition-colors">{t.static.common.legalRgpd}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
