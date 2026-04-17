import { Metadata } from 'next';
import { SupportClient, Category, Article, Announcement, KnownIssue } from './support-client';

export const metadata: Metadata = {
  title: "Centre d'aide — AlfyChat",
  description: 'Trouvez des réponses à vos questions, consultez les problèmes connus et contactez notre équipe de support.',
};

const API_BASE = process.env.INTERNAL_API_URL || 'http://localhost:3001';

async function fetchSupport() {
  const opts = { next: { revalidate: 60 } };
  try {
    const [cats, popular, anns, issues] = await Promise.all([
      fetch(`${API_BASE}/users/support/categories`, opts).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/users/support/articles/popular?limit=6`, opts).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/users/support/announcements`, opts).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/users/support/known-issues`, opts).then(r => r.ok ? r.json() : null),
    ]);
    return {
      categories:      (cats?.data    ?? []) as Category[],
      popularArticles: (popular?.data ?? []) as Article[],
      announcements:   (anns?.data    ?? []) as Announcement[],
      knownIssues:     (issues?.data  ?? []) as KnownIssue[],
    };
  } catch {
    return { categories: [], popularArticles: [], announcements: [], knownIssues: [] };
  }
}

export default async function SupportPage() {
  const data = await fetchSupport();
  return <SupportClient {...data} />;
}
