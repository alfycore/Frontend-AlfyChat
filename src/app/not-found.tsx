'use client';

import { useRouter } from 'next/navigation';

import { useTranslation } from '@/components/locale-provider';
import { NotFoundView } from '@/components/alfy/errors/not-found-view';

export default function NotFound() {
  const router = useRouter();
  const { t } = useTranslation();
  const nf = t.pages.notFound;

  // Arrivé directement par un lien partagé, il n'y a pas d'historique
  // à remonter : on ouvre l'app plutôt que de quitter le site.
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/');
  };

  return (
    <NotFoundView
      standalone
      title={nf.title}
      description={nf.description}
      primary={{ label: nf.openApp, onPress: () => router.push('/') }}
      secondary={{ label: nf.goBack, onPress: goBack }}
    />
  );
}
