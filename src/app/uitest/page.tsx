import { Card, Chip } from '@heroui/react';
import Link from 'next/link';

import { AlfyMark } from '@/components/alfy/primitives/alfy-mark';
import { TrustBadges } from '@/components/alfy/primitives/trust-badges';

const SCREENS = [
  { href: '/uitest/app', title: 'Application', description: 'Rail de serveurs, salons, chat, composer, membres et profils.', status: 'Phase 1' },
  { href: '/uitest/call', title: 'Appels', description: 'Appel vidéo 1:1 P2P, salon vocal SFU, qualité réseau.', status: 'Phase 2' },
  { href: '/uitest/settings/server', title: 'Paramètres serveur', description: 'Rôles et permissions, invitations, membres, modération.', status: 'Phase 3' },
  { href: '/uitest/settings/user', title: 'Paramètres du compte', description: 'Confidentialité, sécurité, clés de chiffrement, sessions.', status: 'Phase 3' },
  { href: '/uitest/node', title: 'Node auto-hébergé', description: 'Statut du nœud, journaux, configuration Docker et domaine.', status: 'Phase 4' },
  { href: '/uitest/dev', title: 'Portail développeur', description: 'Bots, clés API et webhooks.', status: 'Phase 4' },
  { href: '/uitest/onboarding', title: 'Onboarding', description: 'Création de compte en moins de 30 secondes, sans téléphone.', status: 'Phase 4' },
];

export default function UitestIndexPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <header className="alfy-enter mb-10 space-y-3">
          <div className="flex items-center gap-3">
            <AlfyMark className="size-8" />
            <h1 className="text-2xl font-semibold tracking-tight">Alfy — atelier UI</h1>
          </div>
          <p className="max-w-lg text-sm text-muted">
            Redesign complet d’AlfyChat en HeroUI v3, alimenté par des données factices.
            Chaque écran s’itère ici avant d’être branché sur les vraies routes.
          </p>
          <TrustBadges />
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          {SCREENS.map((s, i) => (
            <Link key={s.href} href={s.href} className="group outline-none">
              <Card
                className="alfy-enter h-full transition-colors group-hover:bg-surface-secondary group-focus-visible:ring-2 group-focus-visible:ring-[color:var(--focus)]"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <Card.Header>
                  <div className="flex w-full items-center justify-between gap-2">
                    <Card.Title>{s.title}</Card.Title>
                    <Chip size="sm" variant="soft">
                      {s.status}
                    </Chip>
                  </div>
                  <Card.Description>{s.description}</Card.Description>
                </Card.Header>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
