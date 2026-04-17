'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { RefreshCwIcon, HomeIcon, MessageCircleIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background text-foreground">
      {/* Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0_280/3%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_280/3%)_1px,transparent_1px)] bg-size-[72px_72px]" />
      {/* Destructive glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-105 w-150 -translate-x-1/2 rounded-full bg-destructive/[0.07] blur-[100px]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-b from-transparent to-background" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6 text-center">
        {/* Logo */}
        <Link href="/" className="mb-10 flex items-center gap-2.5 opacity-80 transition-opacity hover:opacity-100">
          <Image src="/logo/Alfychat.svg" alt="AlfyChat" width={24} height={24} />
          <span className="font-heading text-base text-foreground">AlfyChat</span>
        </Link>

        {/* Badge */}
        <div className="mb-5 flex items-center justify-center rounded-full border border-destructive/20 bg-destructive/8 px-3 py-1">
          <span className="font-mono text-[11px] font-semibold text-destructive">500</span>
        </div>

        {/* Heading */}
        <h1 className="mb-3 font-heading text-3xl tracking-tight text-foreground md:text-4xl">
          Erreur inattendue
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          Une erreur est survenue. Vous pouvez réessayer ou retourner à l&apos;accueil.
        </p>

        <Separator className="mb-8 opacity-30" />

        {/* Actions */}
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Button size="lg" variant="destructive" onClick={reset} className="w-full sm:w-auto">
            <RefreshCwIcon size={15} />
            Réessayer
          </Button>
          <Link href="/">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              <HomeIcon size={15} />
              Accueil
            </Button>
          </Link>
        </div>

        {/* Digest */}
        {error.digest && (
          <p className="mt-8 rounded-xl border border-border/40 bg-surface/30 px-4 py-2 font-mono text-[11px] text-muted-foreground/60">
            Réf : {error.digest}
          </p>
        )}
      </div>

      <p className="absolute bottom-5 font-mono text-[10px] text-muted-foreground/30">
        © 2026 AlfyChat · AlfyCore
      </p>
    </div>
  );
}

