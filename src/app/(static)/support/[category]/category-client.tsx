'use client';

import Link from 'next/link';
import {
  ShieldIcon, SettingsIcon, ServerIcon, HelpCircleIcon,
  ArrowLeftIcon, ArrowRightIcon, BookOpenIcon, PinIcon,
} from '@/components/icons';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { useTranslation } from '@/components/locale-provider';

export interface Category {
  id: string; slug: string; title: string; description: string | null;
  iconName: string; color: string; articleCount?: number;
}
export interface Article {
  id: string; slug: string; title: string; summary: string | null;
  viewCount: number; isPinned: boolean; tags: string[];
}
export interface CategoryWithArticles extends Category { articles: Article[]; }

const ICON_MAP: Record<string, React.ElementType> = {
  shield: ShieldIcon, settings: SettingsIcon, server: ServerIcon, 'circle-help': HelpCircleIcon,
};

export function CategoryClient({ cat }: { cat: CategoryWithArticles }) {
  const { t, locale } = useTranslation();
  const s = t.static.support;

  const Icon = ICON_MAP[cat.iconName] ?? HelpCircleIcon;
  const pinned = cat.articles.filter(a => a.isPinned);
  const regular = cat.articles.filter(a => !a.isPinned);

  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <div className="border-b border-border/50">
        <div className="mx-auto max-w-4xl px-6 pt-10 pb-12">
          <MotionFade direction="up" distance={12} duration={0.4}>
            <Link href="/support"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8 group">
              <ArrowLeftIcon size={12} className="group-hover:-translate-x-0.5 transition-transform" />
              {s.backToHelp}
            </Link>
            <div className="flex items-center gap-5">
              <div className="shrink-0 size-14 rounded-2xl flex items-center justify-center"
                style={{ background: cat.color + '18' }}>
                <Icon size={26} style={{ color: cat.color }} />
              </div>
              <div>
                <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight">{cat.title}</h1>
                {cat.description && (
                  <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{cat.description}</p>
                )}
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <span className="text-xs font-semibold rounded-full px-3 py-1"
                style={{ background: cat.color + '14', color: cat.color }}>
                {cat.articles.length} {s.articlesAvailable.replace('{n}', '').trim()}
              </span>
            </div>
          </MotionFade>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-10">

        {/* Empty state */}
        {cat.articles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="size-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: cat.color + '14' }}>
              <BookOpenIcon size={24} style={{ color: cat.color + 'aa' }} />
            </div>
            <p className="font-medium text-muted-foreground">{s.noArticlesInCategory}</p>
          </div>
        )}

        {/* Pinned */}
        {pinned.length > 0 && (
          <MotionFade direction="up" distance={10} duration={0.4}>
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-3">
                <PinIcon size={11} className="text-muted-foreground/60" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {s.pinnedArticles}
                </span>
              </div>
              <div className="rounded-2xl overflow-hidden border"
                style={{ borderColor: cat.color + '30' }}>
                <MotionStagger stagger={0.04}>
                  {pinned.map((art, i) => (
                    <MotionStaggerItem key={art.id}>
                      <ArticleRow art={art} catSlug={cat.slug} color={cat.color}
                        border={i < pinned.length - 1} locale={locale}
                        viewsLabel={s.viewsCount} />
                    </MotionStaggerItem>
                  ))}
                </MotionStagger>
              </div>
            </section>
          </MotionFade>
        )}

        {/* Regular */}
        {regular.length > 0 && (
          <MotionFade direction="up" distance={10} duration={0.4}>
            <section>
              {pinned.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <BookOpenIcon size={11} className="text-muted-foreground/60" />
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    {s.allArticles}
                  </span>
                </div>
              )}
              <div className="rounded-2xl border border-border overflow-hidden">
                <MotionStagger stagger={0.04}>
                  {regular.map((art, i) => (
                    <MotionStaggerItem key={art.id}>
                      <ArticleRow art={art} catSlug={cat.slug} color={cat.color}
                        border={i < regular.length - 1} locale={locale}
                        viewsLabel={s.viewsCount} />
                    </MotionStaggerItem>
                  ))}
                </MotionStagger>
              </div>
            </section>
          </MotionFade>
        )}

        {/* Footer nav */}
        {cat.articles.length > 0 && (
          <div className="flex items-center justify-between pt-10 mt-10 border-t border-border flex-wrap gap-3">
            <Link href="/support"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
              <ArrowLeftIcon size={13} className="group-hover:-translate-x-0.5 transition-transform" />
              {s.helpCenterLabel}
            </Link>
            <Link href="/support/contact"
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
              style={{ background: cat.color }}>
              {s.contactCTA} <ArrowRightIcon size={13} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function ArticleRow({
  art, catSlug, color, border, locale, viewsLabel,
}: {
  art: Article; catSlug: string; color: string; border: boolean;
  locale: string; viewsLabel: string;
}) {
  return (
    <Link
      href={`/support/${catSlug}/${art.slug}`}
      className={`group flex items-start gap-4 px-5 py-4 hover:bg-muted/40 transition-colors${border ? ' border-b border-border/60' : ''}`}
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium group-hover:text-primary transition-colors leading-snug">{art.title}</p>
        {art.summary && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{art.summary}</p>
        )}
        {art.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {art.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] rounded-full px-2 py-0.5 font-medium"
                style={{ background: color + '12', color }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 mt-0.5">
        <span className="text-[11px] text-muted-foreground/60 tabular-nums">
          {viewsLabel.replace('{n}', art.viewCount.toLocaleString(locale))}
        </span>
        <ArrowRightIcon size={12}
          className="text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}
