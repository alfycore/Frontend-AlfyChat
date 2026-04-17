'use client';

import { useEffect } from 'react';
import MeLayout from '@/app/channels/me/layout';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

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
      <div className="flex h-full flex-col items-center justify-center gap-5 p-8 text-center">
        {/* Badge */}
        <div className="flex items-center justify-center rounded-full border border-destructive/20 bg-destructive/8 px-3 py-1">
          <span className="font-mono text-[11px] font-semibold text-destructive">Erreur</span>
        </div>

        {/* Icône */}
        <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-destructive"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </div>

        <div>
          <h1 className="font-heading text-2xl text-foreground">Une erreur est survenue</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Impossible de charger cette page. Vous pouvez réessayer ou revenir à l&apos;accueil.
          </p>
        </div>

        <Separator className="w-32 opacity-30" />

        <div className="flex gap-3">
          <Button variant="destructive" size="sm" onClick={reset}>
            Réessayer
          </Button>
          <Link href="/channels/me">
            <Button variant="outline" size="sm">
              Retour aux messages
            </Button>
          </Link>
        </div>

        {error.digest && (
          <p className="rounded-xl border border-border/40 bg-surface/30 px-4 py-2 font-mono text-[10px] text-muted-foreground/60">
            Réf&nbsp;: {error.digest}
          </p>
        )}
      </div>
    </MeLayout>
  );
}
