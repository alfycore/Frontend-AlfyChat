'use client';

/**
 * Écrans d'erreur — statiques, épurés, pilotés par les variables de thème
 * (globals.css). La teinte (`tone`) expose une variable CSS `--tone`
 * réutilisée par le badge, l'icône et le code.
 *
 *  • FullErrorScreen  → pages plein écran (404 global, 500 global)
 *  • PanelErrorState  → état compact dans un layout (channels)
 */

import Link from 'next/link';
import Image from 'next/image';
import type { CSSProperties, ReactNode } from 'react';

type Tone = 'primary' | 'destructive';
const toneToVar = (t: Tone) => (t === 'destructive' ? 'var(--destructive)' : 'var(--primary)');

export function FullErrorScreen({
  code,
  title,
  description,
  tone = 'primary',
  digest,
  children,
}: {
  code: string;
  title: string;
  description: string;
  tone?: Tone;
  digest?: string;
  children?: ReactNode;
}) {
  return (
    <main
      style={{ '--tone': toneToVar(tone) } as CSSProperties}
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-foreground"
    >
      <div className="flex w-full max-w-md flex-col items-center text-center">
        {/* Logo */}
        <Link
          href="/"
          className="mb-12 flex items-center gap-2.5 opacity-70 transition-opacity hover:opacity-100"
        >
          <Image src="/logo/Alfychat.svg" alt="AlfyChat" width={22} height={22} />
          <span className="font-heading text-[15px] tracking-tight">AlfyChat</span>
        </Link>

        {/* Code */}
        <span className="font-heading text-7xl leading-none tracking-tight text-(--tone)">
          {code}
        </span>

        {/* Titre */}
        <h1 className="mt-6 mb-3 font-heading text-2xl tracking-tight text-foreground">
          {title}
        </h1>

        {/* Description */}
        <p className="mb-8 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        {/* Actions */}
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          {children}
        </div>

        {/* Digest */}
        {digest && (
          <p className="mt-10 font-mono text-[11px] text-muted-foreground/50">
            Réf&nbsp;: {digest}
          </p>
        )}
      </div>
    </main>
  );
}

export function PanelErrorState({
  code,
  title,
  description,
  tone = 'primary',
  icon,
  digest,
  children,
}: {
  code: string;
  title: string;
  description: string;
  tone?: Tone;
  icon: ReactNode;
  digest?: string;
  children?: ReactNode;
}) {
  return (
    <div
      style={{ '--tone': toneToVar(tone) } as CSSProperties}
      className="flex h-full flex-col items-center justify-center gap-5 p-8 text-center"
    >
      {/* Icône */}
      <div className="flex size-14 items-center justify-center rounded-2xl bg-(--tone)/10 text-(--tone)">
        {icon}
      </div>

      {/* Badge code */}
      <div className="flex items-center gap-1.5 rounded-full border border-(--tone)/20 bg-(--tone)/8 px-3 py-1">
        <span className="font-mono text-[11px] font-semibold text-(--tone)">{code}</span>
      </div>

      <div>
        <h1 className="font-heading text-xl tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">{children}</div>

      {digest && (
        <p className="font-mono text-[10px] text-muted-foreground/50">Réf&nbsp;: {digest}</p>
      )}
    </div>
  );
}
