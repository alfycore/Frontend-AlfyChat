import Link from 'next/link';
import {
  ShieldIcon, LockIcon, UsersIcon, ArrowRightIcon, HeartIcon, CheckIcon,
  GlobeIcon, ZapIcon, PhoneIcon, BotIcon, CodeIcon, ServerIcon, DatabaseIcon,
  KeyIcon, StarIcon,
} from '@/components/icons';
import { NavAuthButtons } from '@/components/landing/nav-auth-buttons';
import { GeoTagline, GeoHostingBadge } from '@/components/landing/geo-tagline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from '@/components/ui/card';

/* ── Data ─────────────────────────────────────────────────── */

const features = [
  { icon: ShieldIcon, title: 'Chiffrement E2EE', desc: 'ECDH P-256 + AES-256-GCM. Clés côté client uniquement.' },
  { icon: PhoneIcon, title: 'Appels WebRTC', desc: 'Voix, vidéo, écran. DTLS-SRTP peer-to-peer.' },
  { icon: UsersIcon, title: 'Serveurs & Salons', desc: 'Textuels, vocaux, rôles, permissions.' },
  { icon: BotIcon, title: 'API & Bots', desc: 'SDK ouvert, architecture microservices.' },
  { icon: ZapIcon, title: 'Temps réel', desc: 'Socket.IO natif. Zéro latence.' },
  { icon: GlobeIcon, title: 'RGPD natif', desc: '100 % France. Export et suppression.' },
];

const stack = [
  { icon: ServerIcon, label: 'Microservices' },
  { icon: DatabaseIcon, label: 'MySQL + Redis' },
  { icon: ZapIcon, label: 'Socket.IO' },
  { icon: PhoneIcon, label: 'WebRTC Mesh' },
  { icon: ShieldIcon, label: 'ECDH P-256' },
  { icon: CodeIcon, label: 'Open Source' },
];

/* ── Page ─────────────────────────────────────────────────── */

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-(family-name:--font-geist-sans)">

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-(family-name:--font-krona) text-sm font-medium">
            <img src="/logo/Alfychat.svg" alt="ALFYCHAT" className="size-5" />
            ALFYCHAT
          </Link>
          <NavAuthButtons />
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-20 md:pt-36 md:pb-28">
        <div className="max-w-2xl">
          <Badge variant="outline" className="mb-6 gap-1.5">
            <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
            Open source · Association loi 1901
          </Badge>

          <h1 className="font-(family-name:--font-krona) text-3xl leading-snug tracking-tight md:text-5xl md:leading-tight">
            La messagerie <span className="text-primary">chiffrée</span>,{' '}
            <GeoTagline />
          </h1>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
            Chiffrement de bout en bout, hébergement français, zéro tracking.
            Portée par AlfyCore — gratuite et open source, pour toujours.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Créer un compte
                <ArrowRightIcon size={16} />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Se connecter
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
            {['ECDH + AES-256', <GeoHostingBadge key="g" />, 'RGPD natif', 'Gratuit'].map((t, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckIcon size={10} className="text-primary" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* ── Fonctionnalités ── */}
      <section className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="mb-12 max-w-md">
          <h2 className="font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
            Fonctionnalités
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tout le nécessaire pour communiquer en toute confidentialité.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <f.icon size={20} className="mb-2 text-primary" />
                <CardTitle className="text-sm">{f.title}</CardTitle>
                <CardDescription>{f.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* ── Sécurité ── */}
      <section className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="grid items-start gap-12 md:grid-cols-2">
          <div>
            <Badge variant="secondary" className="mb-4">Sécurité</Badge>
            <h2 className="font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
              Zero-knowledge,<br />par design.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Le serveur ne stocke que des ciphertexts opaques. Tout le chiffrement est côté client.
              AlfyCore ne peut techniquement rien lire — ni messages, ni appels, ni fichiers.
            </p>
          </div>

          <div className="space-y-2">
            {[
              { icon: KeyIcon, text: 'ECDH P-256 — échange de clés asymétriques' },
              { icon: LockIcon, text: 'AES-256-GCM — chiffrement symétrique' },
              { icon: ShieldIcon, text: 'Clés éphémères générées côté client' },
              { icon: ServerIcon, text: 'Zero-knowledge côté serveur' },
              { icon: PhoneIcon, text: 'DTLS-SRTP pour les appels WebRTC' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 rounded-lg border px-4 py-3">
                <item.icon size={16} className="shrink-0 text-primary" />
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* ── Stack technique ── */}
      <section className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="mb-12 max-w-md">
          <h2 className="font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
            Architecture
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Microservices Node.js, MySQL, Redis, Socket.IO, WebRTC.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {stack.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-2 rounded-lg border px-3 py-5 text-center">
              <s.icon size={20} className="text-primary" />
              <span className="text-xs font-medium">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* ── Open Source ── */}
      <section className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="grid items-start gap-12 md:grid-cols-2">
          <div>
            <Badge variant="secondary" className="mb-4">Open Source</Badge>
            <h2 className="font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
              Porté par AlfyCore,<br />pas par des investisseurs.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              AlfyCore est une association loi 1901 à but non lucratif, fondée en France.
              Aucun actionnaire, aucune pub, aucun tracking. Juste la communauté.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="https://alfycore.pro" target="_blank">
                <Button variant="outline" size="sm" className="gap-2">
                  <GlobeIcon size={14} />
                  alfycore.pro
                </Button>
              </Link>
              <Link href="mailto:contact@alfycore.org">
                <Button variant="outline" size="sm">
                  contact@alfycore.org
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: CodeIcon, title: 'Code ouvert', desc: 'Auditable à tout moment.' },
              { icon: ShieldIcon, title: 'Zero tracking', desc: 'Aucun pixel, aucun cookie.' },
              { icon: HeartIcon, title: 'Association', desc: 'Loi 1901, non lucratif.' },
              { icon: ServerIcon, title: 'Self-hostable', desc: 'Votre propre instance.' },
            ].map((f) => (
              <Card key={f.title} size="sm">
                <CardHeader>
                  <f.icon size={16} className="mb-1 text-primary" />
                  <CardTitle className="text-xs">{f.title}</CardTitle>
                  <CardDescription className="text-[11px]">{f.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* ── CTA ── */}
      <section className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <Card>
          <CardContent className="flex flex-col items-center gap-6 py-12 text-center">
            <h2 className="font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
              Rejoignez ALFYCHAT.
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Aucune pub. Aucun pistage. Pour toujours gratuit et open source.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Open source', 'France 🇫🇷', 'RGPD', 'Gratuit'].map((t) => (
                <Badge key={t} variant="outline">
                  <CheckIcon size={8} className="text-green-500" />
                  {t}
                </Badge>
              ))}
            </div>
            <div className="flex gap-3">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Créer mon compte
                  <ArrowRightIcon size={16} />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">Se connecter</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <img src="/logo/Alfychat.svg" alt="" className="size-4" />
            <span className="font-(family-name:--font-krona) text-[11px]">ALFYCHAT</span>
            <span className="text-muted-foreground/40">·</span>
            <span>© 2026 AlfyCore</span>
          </div>
          <div className="flex flex-wrap gap-4">
            {[
              { label: 'CGU', href: '/terms' },
              { label: 'Confidentialité', href: '/privacy' },
              { label: 'AlfyCore', href: 'https://alfycore.pro' },
              { label: 'Contact', href: 'mailto:contact@alfycore.org' },
            ].map((l) => (
              <Link key={l.label} href={l.href} className="transition-colors hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </div>
          <p className="flex items-center gap-1">
            Fait avec <HeartIcon size={10} className="text-destructive" /> en France 🇫🇷
          </p>
        </div>
      </footer>
    </div>
  );
}
