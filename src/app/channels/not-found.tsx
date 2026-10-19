'use client';

import { useRouter } from 'next/navigation';

import { useTranslation } from '@/components/locale-provider';
import { NotFoundView } from '@/components/alfy/errors/not-found-view';

export default function ChannelsNotFound() {
  const router = useRouter();
  const { t } = useTranslation();
  const nf = t.pages.notFound;

  return (
    <NotFoundView
      title={nf.appTitle}
      description={nf.appDescription}
      primary={{ label: t.chat.backToMessages, onPress: () => router.push('/channels/me') }}
      secondary={{ label: nf.discover, onPress: () => router.push('/channels/discover-server') }}
    />
  );
}
