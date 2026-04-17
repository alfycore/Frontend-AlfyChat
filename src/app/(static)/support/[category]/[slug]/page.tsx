import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleClient, Article, Category } from './article-client';

const API_BASE = process.env.INTERNAL_API_URL || 'http://localhost:3001';

async function fetchArticle(slug: string): Promise<Article | null> {
  try {
    const r = await fetch(`${API_BASE}/users/support/articles/${slug}`, { next: { revalidate: 60 } });
    if (!r.ok) return null;
    const data = await r.json();
    return data.data ?? null;
  } catch { return null; }
}

async function fetchCategory(slug: string): Promise<Category | null> {
  try {
    const r = await fetch(`${API_BASE}/users/support/categories/${slug}`, { next: { revalidate: 300 } });
    if (!r.ok) return null;
    const data = await r.json();
    return data.data ?? null;
  } catch { return null; }
}

type Props = { params: Promise<{ category: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const art = await fetchArticle(slug);
  if (!art) return { title: 'Article introuvable' };
  return {
    title: `${art.title} — Centre d'aide AlfyChat`,
    description: art.summary ?? undefined,
  };
}

export default async function ArticlePage({ params }: Props) {
  const { category: catSlug, slug } = await params;
  const [article, category] = await Promise.all([
    fetchArticle(slug),
    fetchCategory(catSlug),
  ]);

  if (!article || !article.isPublished) notFound();

  return <ArticleClient article={article} category={category} catSlug={catSlug} />;
}
