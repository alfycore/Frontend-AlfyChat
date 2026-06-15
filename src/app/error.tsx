'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCwIcon, HomeIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { FullErrorScreen } from '@/components/error-screens';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erreur AlfyChat:', error);
  }, [error]);

  return (
    <FullErrorScreen
      code="500"
      tone="destructive"
      title="Erreur inattendue"
      description="Quelque chose s'est mal passé de notre côté. Vous pouvez réessayer ou revenir à l'accueil."
      digest={error.digest}
    >
      <Button size="lg" variant="destructive" onClick={reset} className="w-full sm:w-auto">
        <RefreshCwIcon size={15} />
        Réessayer
      </Button>
      <Link href="/" className="sm:w-auto">
        <Button size="lg" variant="outline" className="w-full sm:w-auto">
          <HomeIcon size={15} />
          Accueil
        </Button>
      </Link>
    </FullErrorScreen>
  );
}
