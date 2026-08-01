'use client';

/**
 * Gabarit d'authentification à deux colonnes (repris de la page /login prod) :
 * formulaire à gauche avec logo Krona, image à droite en rounded-2xl.
 */

import { AlfyMark } from '@/components/alfy/primitives/alfy-mark';
import { TrustBadges } from '@/components/alfy/primitives/trust-badges';

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-full grid-cols-1 bg-background lg:grid-cols-2">
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center gap-2.5 p-8 pb-0">
          <AlfyMark className="size-6" />
          <span className="font-heading text-sm font-medium tracking-wide">ALFYCHAT</span>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-8 py-12">
          <div className="w-full max-w-xs">{children}</div>
        </div>
      </div>

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

/** En-tête de formulaire (titre + sous-titre). */
export function AuthHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-1">
      <h1 className="font-heading text-2xl font-bold">{title}</h1>
      {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
    </div>
  );
}
