'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { RefreshCwIcon, HomeIcon } from '@/components/icons';
import { Button, Link } from '@heroui/react';

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
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0_280/3%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_280/3%)_1px,transparent_1px)] bg-size-[72px_72px]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-red-500/[0.06] blur-[120px]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-b from-transparent to-background" />

      <div className="relative z-10 flex flex-col items-center px-8 text-center">
        {/* Logo */}
        <Link href="/" className="mb-12 flex items-center gap-2.5 no-underline">
          <Image src="/logo/Alfychat.svg" alt="AlfyChat" width={28} height={28} />
          <span className="font-[family-name:var(--font-krona)] text-lg text-foreground">AlfyChat</span>
        </Link>

        {/* 500 */}
        <h1 className="mb-3 font-[family-name:var(--font-krona)] bg-[linear-gradient(135deg,oklch(0.65_0.2_25),oklch(0.6_0.2_50),oklch(0.7_0.15_60))] bg-clip-text text-[6rem] leading-none text-transparent md:text-[9rem]">
          500
        </h1>

        <h2 className="mb-3 font-[family-name:var(--font-krona)] text-xl tracking-tight">
          Erreur inattendue
        </h2>

        <p className="mb-10 max-w-sm text-muted">
          Une erreur est survenue. Vous pouvez réessayer ou retourner à l&apos;accueil.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onPress={reset}>
            <RefreshCwIcon size={16} />
            Réessayer
          </Button>
          <Link href="/">
            <Button size="lg" variant="outline">
              <HomeIcon size={16} />
              Accueil
            </Button>
          </Link>
        </div>

        {error.digest && (
          <p className="mt-8 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2 font-mono text-[11px] text-muted">
            Réf : {error.digest}
          </p>
        )}
      </div>

      <p className="absolute bottom-6 text-[10px] text-muted/40">
        © 2026 AlfyChat · AlfyCore
      </p>
    </div>
  );
}
