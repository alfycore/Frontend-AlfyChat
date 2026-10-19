import type { Metadata } from 'next';

import { DEFAULT_LOCALE, translations } from '@/i18n';
import { InviteView } from '@/components/alfy/invite/invite-view';

/**
 * /invite/[code] — composant serveur : il ne fait que préparer l'aperçu du
 * lien (titre, description, image) pour les applis où il est collé, puis
 * laisse la page interactive à `InviteView`.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface PreviewLite {
  server?: {
    name?: string;
    description?: string | null;
    iconUrl?: string | null;
    bannerUrl?: string | null;
    memberCount?: number;
    onlineCount?: number | null;
  };
}

const absolute = (url?: string | null) => (!url ? undefined : /^https?:\/\//.test(url) ? url : `${API_URL}${url}`);
const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));

/** Aperçu anonyme, mis en cache une minute ; jamais bloquant plus de 2,5 s. */
async function fetchPreview(code: string): Promise<PreviewLite | null> {
  try {
    const res = await fetch(`${API_URL}/api/servers/invite/${encodeURIComponent(code)}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    return (await res.json()) as PreviewLite;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  // Comme le LocaleProvider : l'anglais comble les clés absentes d'une langue.
  const t: typeof translations.en.invite = { ...translations.en.invite, ...translations[DEFAULT_LOCALE].invite };
  const server = (await fetchPreview(code))?.server;
  // Une invitation n'a rien à faire dans un moteur de recherche.
  if (!server?.name) return { title: t.invalid, robots: { index: false, follow: false } };

  const title = fill(t.metaTitle, { name: server.name });
  const counts = [
    typeof server.onlineCount === 'number' ? fill(t.online, { n: server.onlineCount }) : null,
    server.memberCount === 1 ? t.membersOne : fill(t.membersMany, { n: server.memberCount ?? 0 }),
  ]
    .filter(Boolean)
    .join(' · ');
  const description = server.description?.trim() ? `${server.description.trim()} — ${counts}` : counts;
  const banner = absolute(server.bannerUrl);
  const image = banner ?? absolute(server.iconUrl);

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: 'website', siteName: 'AlfyChat', images: image ? [image] : undefined },
    twitter: { card: banner ? 'summary_large_image' : 'summary', title, description, images: image ? [image] : undefined },
  };
}

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <InviteView code={code} />;
}
