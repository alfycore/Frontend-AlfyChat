'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@heroui/react';
import { Compass, MessageCircle } from 'lucide-react';

import MeLayout from '@/app/channels/me/layout';
import { useTranslation } from '@/components/locale-provider';
import { ErrorScreen } from '@/components/alfy/errors/error-screen';

export default function ChannelsNotFound() {
  const router = useRouter();
  const { t } = useTranslation();
  const c = t.chat;

  return (
    <MeLayout>
      <div className="flex h-full items-center justify-center p-6">
        <ErrorScreen
          compact
          code="404"
          channel="introuvable"
          tone="accent"
          title={c.channelNotFound}
          message={c.channelNotFoundDesc}
          actions={
            <>
              <Button size="sm" onPress={() => router.push('/channels/me')}>
                <MessageCircle className="size-3.5" aria-hidden />
                {c.backToMessages}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onPress={() => router.push('/channels/discover-server')}
              >
                <Compass className="size-3.5" aria-hidden />
                Découvrir des serveurs
              </Button>
            </>
          }
        />
      </div>
    </MeLayout>
  );
}
