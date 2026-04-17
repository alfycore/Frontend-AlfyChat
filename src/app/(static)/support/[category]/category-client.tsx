'use client';

import Link from 'next/link';
import {
  ShieldIcon, SettingsIcon, ServerIcon, HelpCircleIcon,
  ArrowLeftIcon, ArrowRightIcon, BookOpenIcon, PinIcon,
} from '@/components/icons';
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
      <div className="relative overflow-hidden border-b border-border/50"
        style={{ background: `linear-gradient(135deg, ${cat.color}12 0%, transparent 60%)` }}>
        <div className="mx-auto max-w-4xl px-6 py-16">
          <Link href="/support" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeftIcon size={14} /> {s.backToHelp}
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="size-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: cat.color + '20' }}>
              <Icon size={24} style={{ color: cat.color }} />
            </div>
            <div>
              <h1 className="font-heading text-3xl font-bold">{cat.title}</h1>
              {cat.description && (
                <p className="text-muted-foreground mt-1">{cat.description}</p>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            <span style={{ color: cat.color }} className="font-semibold">{cat.articles.length}</span>{' '}
            {s.articlesAvailable.replace('{n}', '').trim()}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-10 space-y-10">

        {/* Épinglés */}
        {pinned.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
              <PinIcon size={13} /> {s.pinnedArticles}
            </h2>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: cat.color + '40' }}>
              {pinned.map((art, i) => (
                <ArticleCard key={art.id} art={art} catSlug={cat.slug} color={cat.color}
                  border={i < pinned.length - 1} locale={locale} viewsLabel={s.viewsCount} />
              ))}
            </div>
          </section>
        )}

        {/* Tous les articles */}
        {regular.length > 0 && (
          <section>
            {pinned.length > 0 && (
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                <BookOpenIcon size={13} /> {s.allArticles}
              </h2>
            )}
            <div className="rounded-xl border border-border overflow-hidden">
              {regular.map((art, i) => (
                <ArticleCard key={art.id} art={art} catSlug={cat.slug} color={cat.color}
                  border={i < regular.length - 1} locale={locale} viewsLabel={s.viewsCount} />
              ))}
            </div>
          </section>
        )}

        {cat.articles.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpenIcon size={32} className="mx-auto mb-3 opacity-40" />
            <p>{s.noArticlesInCategory}</p>
          </div>
        )}

        {/* Footer nav */}
        <div className="flex justify-between items-center pt-4 border-t border-border">
          <Link href="/support" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeftIcon size={14} /> {s.helpCenterLabel}
          </Link>
          <Link href="/support/contact"
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            style={{ background: cat.color }}>
            {s.contactCTA} <ArrowRightIcon size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function ArticleCard({
  art, catSlug, color, border, locale, viewsLabel,
}: {
  art: Article; catSlug: string; color: string; border: boolean;
  locale: string; viewsLabel: string;
}) {
  return (
    <Link href={`/support/${catSlug}/${art.slug}`}
      className={'flex items-start gap-4 px-5 py-4 hover:bg-muted/40 transition-colors group' + (border ? ' border-b border-border' : '')}
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium group-hover:text-primary transition-colors leading-snug">{art.title}</p>
        {art.summary && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{art.summary}</p>
        )}
        {art.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {art.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] rounded-full px-2 py-0.5 font-medium"
                style={{ background: color + '15', color }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 mt-0.5">
        <span className="text-xs text-muted-foreground">
          {viewsLabel.replace('{n}', art.viewCount.toLocaleString(locale))}
        </span>
        <ArrowRightIcon size={12} className="text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}
