import { Button, Card, Chip } from '@heroui/react';
import { Code2, Flag, FolderGit2, Lock, Server, Users, Zap } from 'lucide-react';
import Link from 'next/link';

import { AlfyMark } from '@/components/alfy/primitives/alfy-mark';
import { TrustBadges } from '@/components/alfy/primitives/trust-badges';

const FEATURES = [
  { icon: Lock, title: 'Chiffré de bout en bout', text: 'Protocole Signal audité, par défaut, sur tous vos messages privés.' },
  { icon: Server, title: 'Auto-hébergeable', text: 'Faites tourner vos propres serveurs via Docker. Vos données, votre machine.' },
  { icon: Users, title: 'Communautés & rôles', text: 'Serveurs, salons, rôles colorés et permissions fines façon Discord.' },
  { icon: Zap, title: 'Appels HD P2P', text: 'Voix et vidéo pair-à-pair, indicateurs de latence et de qualité en direct.' },
  { icon: Code2, title: 'API ouverte', text: 'Bots, webhooks et OAuth2 documentés. Construisez ce que vous voulez.' },
  { icon: Flag, title: 'Hébergé en France', text: 'Infrastructure française, conformité RGPD, aucune donnée revendue.' },
];

export default function UitestLandingPage() {
  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Nav */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/uitest/landing" className="flex items-center gap-2">
          <AlfyMark className="size-6" />
          <span className="font-heading text-sm font-medium tracking-wide">ALFYCHAT</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/uitest/changelogs"><Button variant="ghost" size="sm">Nouveautés</Button></Link>
          <Link href="/uitest/auth/login"><Button variant="secondary" size="sm">Se connecter</Button></Link>
          <Link href="/uitest/auth/register"><Button size="sm">Créer un compte</Button></Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-12 text-center">
        <Chip variant="soft" className="mb-5">
          <Lock className="size-3 text-(--alfy-e2e)" aria-hidden />
          <Chip.Label>Messagerie chiffrée, française et open source</Chip.Label>
        </Chip>
        <h1 className="font-heading text-4xl leading-tight font-bold text-balance sm:text-5xl">
          Vos conversations ne regardent que vous.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted">
          AlfyChat réunit le confort d&apos;un Discord et les garanties de Signal : chiffrement de
          bout en bout, serveurs auto-hébergeables et respect total de votre vie privée.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Link href="/uitest/auth/register"><Button size="lg">Commencer gratuitement</Button></Link>
          <Link href="/uitest/app"><Button size="lg" variant="secondary">Voir la démo</Button></Link>
        </div>
        <TrustBadges className="mt-8 justify-center" />
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <Card.Header>
                <span className="flex size-9 items-center justify-center rounded-xl bg-accent/12 text-accent">
                  <Icon className="size-4.5" aria-hidden />
                </span>
                <Card.Title className="mt-2 text-sm">{title}</Card.Title>
                <Card.Description>{text}</Card.Description>
              </Card.Header>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-12 text-center">
        <div className="rounded-2xl border border-border/70 bg-surface p-10">
          <h2 className="font-heading text-2xl font-bold">Prêt·e en moins de 30 secondes</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">Sans numéro de téléphone. Sans pub. Sans compromis sur votre vie privée.</p>
          <Link href="/uitest/auth/register"><Button size="lg" className="mt-5">Créer mon compte</Button></Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-separator">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted">
            <AlfyMark className="size-5" />
            <span>© 2026 AlfyChat — Hébergé en France</span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <Link href="/uitest/status" className="hover:text-foreground">Statut</Link>
            <Link href="/uitest/changelogs" className="hover:text-foreground">Nouveautés</Link>
            <Link href="/uitest/legal/cgu" className="hover:text-foreground">CGU</Link>
            <Link href="/uitest/legal/privacy" className="hover:text-foreground">Confidentialité</Link>
            <Link href="/uitest/legal/mentions" className="hover:text-foreground">Mentions légales</Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
              <FolderGit2 className="size-3.5" /> Open source
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
