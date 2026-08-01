'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@heroui/react';
import { House, MessageCircle, RotateCcw } from 'lucide-react';

import { ErrorPageShell, ErrorScreen } from '@/components/alfy/errors/error-screen';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Erreur AlfyChat:', error);
  }, [error]);

  return (
    <ErrorPageShell>
      <ErrorScreen
        code="500"
        channel="incident"
        tone="danger"
        title="Quelque chose a lâché de notre côté"
        message={
          <>
            Ce n’est pas vous. La page n’a pas pu être construite, et l’incident
            est remonté à l’équipe. Réessayer suffit la plupart du temps.
          </>
        }
        reference={error.digest}
        actions={
          <>
            <Button size="sm" variant="danger" onPress={reset}>
              <RotateCcw className="size-3.5" aria-hidden />
              Réessayer
            </Button>
            <Button size="sm" variant="secondary" onPress={() => router.push('/')}>
              <House className="size-3.5" aria-hidden />
              Accueil
            </Button>
            <Button size="sm" variant="ghost" onPress={() => router.push('/channels/me')}>
              <MessageCircle className="size-3.5" aria-hidden />
              Mes messages
            </Button>
          </>
        }
      />
    </ErrorPageShell>
  );
}
