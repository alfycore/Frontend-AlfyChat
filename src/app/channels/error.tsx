'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@heroui/react';
import { MessageCircle, RotateCcw } from 'lucide-react';

import MeLayout from '@/app/channels/me/layout';
import { ErrorScreen } from '@/components/alfy/errors/error-screen';

export default function ChannelsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Erreur channels:', error);
  }, [error]);

  return (
    <MeLayout>
      <div className="flex h-full items-center justify-center p-6">
        <ErrorScreen
          compact
          code="Erreur"
          channel="incident"
          tone="danger"
          title="Cette vue n’a pas pu se charger"
          message={
            <>
              Vos messages sont intacts — seul l’affichage a échoué. Réessayez,
              ou revenez à vos conversations.
            </>
          }
          reference={error.digest}
          actions={
            <>
              <Button size="sm" variant="danger" onPress={reset}>
                <RotateCcw className="size-3.5" aria-hidden />
                Réessayer
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onPress={() => router.push('/channels/me')}
              >
                <MessageCircle className="size-3.5" aria-hidden />
                Retour aux messages
              </Button>
            </>
          }
        />
      </div>
    </MeLayout>
  );
}
