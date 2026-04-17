'use client';

import Link from 'next/link';
import {
  ShieldIcon, SettingsIcon, ServerIcon, HelpCircleIcon,
  ArrowLeftIcon, ClockIcon, EyeIcon, PinIcon,
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
      <div className="relative border-b border-border/50"
        style={{ background: `linear-gradient(135deg, ${color}10 0%, transparent 60%)` }}>
        <div className="mx-auto max-w-3xl px-6 py-10">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
            <Link href="/support" className="hover:text-foreground transition-colors">{s.helpCenterLabel}</Link>
            <span>/</span>
            {category && (
              <>
                <Link href={`/support/${catSlug}`} className="hover:text-foreground transition-colors flex items-center gap-1">
                  <Icon size={11} style={{ color }} />
                  {category.title}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-foreground font-medium truncate max-w-50">{article.title}</span>
          </nav>

          {/* Titre + métadonnées */}
          <div className="flex items-start gap-2 mb-3">
            {article.isPinned && (
              <span className="shrink-0 mt-1 flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5"
                style={{ background: color + '20', color }}>
                <PinIcon size={10} /> {s.pinnedBadge}
              </span>
            )}
          </div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold leading-tight mb-3">{article.title}</h1>
          {article.summary && (
            <p className="text-muted-foreground text-base leading-relaxed mb-4">{article.summary}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <EyeIcon size={11} /> {s.viewsCount.replace('{n}', article.viewCount.toLocaleString(locale))}
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon size={11} /> {s.updatedAt.replace('{date}', new Date(article.updatedAt).toLocaleDateString(locale))}
            </span>
          </div>

          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="flex gap-1.5 mt-4 flex-wrap">
              {article.tags.map(tag => (
                <span key={tag} className="text-xs rounded-full px-2.5 py-0.5 font-medium"
                  style={{ background: color + '15', color }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contenu */}
      <div className="mx-auto max-w-3xl px-6 py-10">
        {article.content ? (
          <article className="prose prose-sm max-w-none dark:prose-invert
            prose-headings:font-heading prose-headings:font-bold
            prose-h2:text-lg prose-h3:text-base
            prose-a:text-primary prose-a:underline prose-a:underline-offset-2
            prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
            prose-blockquote:border-l-4 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
            prose-img:rounded-xl prose-img:border prose-img:border-border
            prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
            [&_h2]:mt-8 [&_h3]:mt-6"
            style={{ '--tw-prose-bullets': color, '--tw-prose-counters': color } as React.CSSProperties}>
            <MarkdownContent content={article.content} />
          </article>
        ) : (
          <p className="text-muted-foreground text-center py-12">{s.contentPending}</p>
        )}

        {/* Navigation bas de page */}
        <div className="mt-12 pt-6 border-t border-border flex items-center justify-between gap-4">
          <Link href={`/support/${catSlug}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeftIcon size={14} />
            {category?.title ?? catSlug}
          </Link>
          <Link href="/support/contact"
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            style={{ background: color }}>
            {s.contactCTA}
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
    } else if (line.trim() === '') {
      // empty line — skip
    } else {
      elements.push(<p key={i}>{line}</p>);
    }
    i++;
  }

  return <>{elements}</>;
}
