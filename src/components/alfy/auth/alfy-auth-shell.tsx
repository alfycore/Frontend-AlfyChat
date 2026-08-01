'use client';

/**
 * Shell d'authentification alfy pour les vraies pages `(auth)/*`.
 * Porte `data-ui="alfy"` et le thème alfy : deux colonnes (formulaire à
 * gauche avec logo Krona, image à droite), comme l'ancien login mais en
 * composants HeroUI. Le contenu (formulaire) est injecté par chaque page.
 */

import '@/components/alfy/alfy-theme.css';

import Link from 'next/link';

import { AlfyMark } from '@/components/alfy/primitives/alfy-mark';
import { TrustBadges } from '@/components/alfy/primitives/trust-badges';

export function AlfyAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div data-ui="alfy" className="grid min-h-dvh grid-cols-1 bg-background lg:grid-cols-2">
      {/* Colonne formulaire */}
      <div className="flex min-h-0 flex-col">
        <div className="p-8 pb-0">
          <Link href="/" className="inline-flex items-center gap-2.5 opacity-90 transition-opacity hover:opacity-100">
            <AlfyMark className="size-6" />
            <span className="font-heading text-sm font-medium tracking-wide">ALFYCHAT</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-8 py-12">
          <div className="w-full max-w-xs">{children}</div>
        </div>
      </div>

      {/* Colonne image */}
      <div className="hidden p-4 lg:block">
        <div className="relative h-full overflow-hidden rounded-2xl">
          <img src="/backgrounds/defaut.jpg" alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-8">
            <h2 className="max-w-sm font-heading text-2xl font-bold text-balance text-white">
              Vos messages ne regardent que vous.
            </h2>
            <p className="mt-2 max-w-sm text-sm text-white/70">
              Chiffrement de bout en bout par défaut, serveurs auto-hébergeables, aucune donnée
              revendue.
            </p>
            <TrustBadges className="mt-4" compact />
          </div>
        </div>
      </div>
    </div>
  );
}

/** En-tête de formulaire (titre Krona + sous-titre). */
export function AlfyAuthHeading({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3">
      {icon}
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-[13px] leading-relaxed text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

/** Bandeau d'erreur / info dans les formulaires d'auth. */
export function AlfyAuthBanner({ message, variant = 'danger' }: { message: string; variant?: 'danger' | 'warning' | 'success' }) {
  const cls = {
    danger: 'border-danger/25 bg-danger/10 text-danger',
    warning: 'border-warning/25 bg-warning/10 text-warning',
    success: 'border-success/25 bg-success/10 text-success',
  }[variant];
  return <div className={`rounded-lg border px-4 py-3 text-[13px] ${cls}`}>{message}</div>;
}
