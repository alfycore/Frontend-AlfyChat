import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CategoryClient, CategoryWithArticles } from './category-client';

const API_BASE = process.env.INTERNAL_API_URL || 'http://localhost:3001';

async function fetchCategory(slug: string): Promise<CategoryWithArticles | null> {
  try {
    const r = await fetch(`${API_BASE}/users/support/categories/${slug}`, { next: { revalidate: 60 } });
    if (!r.ok) return null;
    const data = await r.json();
    return data.data ?? null;
  } catch { return null; }
}

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const cat = await fetchCategory(slug);
  if (!cat) return { title: 'Catégorie introuvable' };
  return {
    title: `${cat.title} — Centre d'aide AlfyChat`,
    description: cat.description ?? undefined,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const cat = await fetchCategory(slug);
  if (!cat) notFound();
  return <CategoryClient cat={cat} />;
}
