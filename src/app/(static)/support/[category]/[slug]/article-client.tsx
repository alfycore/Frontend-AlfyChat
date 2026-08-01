'use client';

import Link from 'next/link';
import {
  ShieldIcon, SettingsIcon, ServerIcon, HelpCircleIcon,
  ArrowLeftIcon, ArrowRightIcon, ClockIcon, EyeIcon, PinIcon,
} from '@/components/icons';
import { useTranslation } from '@/components/locale-provider';

export interface Article {
  id: string; slug: string; title: string; summary: string | null;
  content: string | null; viewCount: number; isPinned: boolean;
  tags: string[]; isPublished: boolean; categorySlug: string | null;
  updatedAt: string;
}
export interface Category { slug: string; title: string; iconName: string; color: string; }

const ICON_MAP: Record<string, React.ElementType> = {
  shield: ShieldIcon, settings: SettingsIcon, server: ServerIcon, 'circle-help': HelpCircleIcon,
};

export function ArticleClient({
  article, category, catSlug,
}: {
  article: Article; category: Category | null; catSlug: string;
}) {
  const { t, locale } = useTranslation();
  const s = t.static.support;

  const color = category?.color ?? '#6366f1';
  const Icon = ICON_MAP[category?.iconName ?? ''] ?? HelpCircleIcon;

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <div className="border-b border-border/50">
        <div className="mx-auto max-w-3xl px-6 pt-10 pb-10">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-8 flex-wrap">
            <Link href="/support" className="hover:text-foreground transition-colors">
              {s.helpCenterLabel}
            </Link>
            <span className="text-border">/</span>
            {category && (
              <>
                <Link href={`/support/${catSlug}`}
                  className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
                  <Icon size={11} style={{ color }} />
                  {category.title}
                </Link>
                <span className="text-border">/</span>
              </>
            )}
            <span className="text-foreground/70 font-medium truncate max-w-48">{article.title}</span>
          </nav>

          {/* Pinned badge */}
          {article.isPinned && (
            <div className="mb-3">
              <span className="inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-0.5"
                style={{ background: color + '18', color }}>
                <PinIcon size={10} /> {s.pinnedBadge}
              </span>
            </div>
          )}

          {/* Title */}
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight leading-tight mb-4">
            {article.title}
          </h1>
          {article.summary && (
            <p className="text-muted-foreground leading-relaxed mb-5 text-base">{article.summary}</p>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground/60">
            <span className="flex items-center gap-1.5">
              <EyeIcon size={11} />
              {s.viewsCount.replace('{n}', article.viewCount.toLocaleString(locale))}
            </span>
            <span className="flex items-center gap-1.5">
              <ClockIcon size={11} />
              {s.updatedAt.replace('{date}', new Date(article.updatedAt).toLocaleDateString(locale))}
            </span>
          </div>

          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="flex gap-1.5 mt-5 flex-wrap">
              {article.tags.map(tag => (
                <span key={tag} className="text-xs rounded-full px-2.5 py-0.5 font-medium"
                  style={{ background: color + '12', color }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-10">
        {article.content ? (
          <article className="prose prose-sm max-w-none dark:prose-invert
            prose-headings:font-heading prose-headings:font-bold prose-headings:tracking-tight
            prose-h2:text-xl prose-h3:text-base
            prose-a:text-primary prose-a:no-underline prose-a:font-medium hover:prose-a:underline
            prose-code:rounded-lg prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
            prose-pre:rounded-xl prose-pre:border prose-pre:border-border prose-pre:bg-muted
            prose-blockquote:border-l-[3px] prose-blockquote:pl-4 prose-blockquote:not-italic prose-blockquote:text-muted-foreground
            prose-img:rounded-2xl prose-img:border prose-img:border-border
            prose-ul:my-2 prose-ol:my-2 prose-li:my-1
            [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:mt-7 [&_h3]:mb-3"
            style={{ '--tw-prose-bullets': color, '--tw-prose-counters': color } as React.CSSProperties}>
            <MarkdownContent content={article.content} />
          </article>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Icon size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{s.contentPending}</p>
          </div>
        )}

        {/* Bottom nav */}
        <div className="mt-14 pt-7 border-t border-border flex items-center justify-between gap-4 flex-wrap">
          <Link href={`/support/${catSlug}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
            <ArrowLeftIcon size={13} className="group-hover:-translate-x-0.5 transition-transform" />
            {category?.title ?? catSlug}
          </Link>
          <Link href="/support/contact"
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
            style={{ background: color }}>
            {s.contactCTA} <ArrowRightIcon size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('# ')) {
      elements.push(<h1 key={i}>{line.slice(2)}</h1>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i}>{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i}>{line.slice(4)}</h3>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(<ul key={i}>{items.map((it, j) => <li key={j}>{it}</li>)}</ul>);
      continue;
    } else if (line.startsWith('> ')) {
      elements.push(<blockquote key={i}>{line.slice(2)}</blockquote>);
    } else if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(<pre key={i}><code>{codeLines.join('\n')}</code></pre>);
    } else if (line.trim() !== '') {
      elements.push(<p key={i}>{line}</p>);
    }
    i++;
  }

  return <>{elements}</>;
}
