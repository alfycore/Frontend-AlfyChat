'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import MeLayout from '@/app/channels/me/layout';
import { Button } from '@/components/ui/button';
import { AlertTriangleIcon, RefreshCwIcon, MessageCircleIcon } from '@/components/icons';
import { PanelErrorState } from '@/components/error-screens';

export default function ChannelsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erreur channels:', error);
  }, [error]);

  return (
    <MeLayout>
      <PanelErrorState
        code="Erreur"
        tone="destructive"
        icon={<AlertTriangleIcon size={26} />}
        title="Une erreur est survenue"
        description="Impossible de charger cette page. Vous pouvez réessayer ou revenir à vos messages."
        digest={error.digest}
      >
        <Button variant="destructive" size="sm" onClick={reset}>
          <RefreshCwIcon size={14} />
          Réessayer
        </Button>
        <Link href="/channels/me">
          <Button variant="outline" size="sm">
            <MessageCircleIcon size={14} />
            Retour aux messages
          </Button>
        </Link>
      </PanelErrorState>
    </MeLayout>
  );
}
