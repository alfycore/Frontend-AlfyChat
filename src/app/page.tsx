import Link from 'next/link';
import {
  ShieldIcon, LockIcon, UsersIcon, ArrowRightIcon, HeartIcon, CheckIcon,
  GlobeIcon, ZapIcon, PhoneIcon, BotIcon, CodeIcon, ServerIcon, DatabaseIcon,
  KeyIcon, MessageCircleIcon, BellIcon, Share2Icon,
} from '@/components/icons';
import { NavAuthButtons } from '@/components/landing/nav-auth-buttons';
import { GeoTagline, GeoHostingBadge } from '@/components/landing/geo-tagline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DotPattern } from '@/components/ui/dot-pattern';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { MagicCard } from '@/components/ui/magic-card';
import { Marquee } from '@/components/ui/marquee';
import { BorderBeam } from '@/components/ui/border-beam';
import { WordRotate } from '@/components/ui/word-rotate';
import { TextReveal } from '@/components/ui/text-reveal';
import { Safari } from '@/components/ui/safari';
import { OrbitingCircles } from '@/components/ui/orbiting-circles';
import { BentoCard, BentoGrid } from '@/components/ui/bento-grid';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { AnimatedList, AnimatedListItem } from '@/components/ui/animated-list';
import { DottedMap } from '@/components/ui/dotted-map';
import { Highlighter } from '@/components/ui/highlighter';
import { GatewayBeam } from '@/components/landing/gateway-beam';
import { cn } from '@/lib/utils';

/* ── Data ─────────────────────────────────────────────────── */

const stack = [
  { icon: ServerIcon, label: 'Microservices' },
  { icon: DatabaseIcon, label: 'MySQL + Redis' },
  { icon: ZapIcon, label: 'Socket.IO' },
  { icon: PhoneIcon, label: 'WebRTC Mesh' },
  { icon: ShieldIcon, label: 'ECDH P-256' },
  { icon: CodeIcon, label: 'Open Source' },
  { icon: ServerIcon, label: 'Node.js' },
  { icon: DatabaseIcon, label: 'TypeScript' },
  { icon: GlobeIcon, label: 'Next.js 14' },
  { icon: ZapIcon, label: 'Bun Runtime' },
];

const notifications = [
  { icon: '🔒', title: 'Message chiffré', body: 'Clé éphémère ECDH générée' },
  { icon: '📞', title: 'Appel WebRTC', body: 'DTLS-SRTP peer-to-peer' },
  { icon: '👥', title: 'Serveur rejoint', body: 'Rôles & permissions actifs' },
  { icon: '🤖', title: 'Bot connecté', body: 'API microservices prête' },
  { icon: '🇫🇷', title: 'Hébergé en France', body: 'RGPD · zéro tracking' },
];

const bentoFeatures = [
  {
    Icon: ShieldIcon as React.ElementType,
    name: 'Chiffrement E2EE',
    description: 'ECDH P-256 + AES-256-GCM. Vos clés ne quittent jamais votre appareil.',
    href: '/register',
    cta: 'En savoir plus',
    className: 'col-span-3 lg:col-span-1',
    background: (
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
        <LockIcon size={120} className="text-primary" />
      </div>
    ),
  },
  {
    Icon: GlobeIcon as React.ElementType,
    name: 'Présence mondiale',
    description: 'Hébergé en France, accessible partout. RGPD natif, zéro tracking.',
    href: '/register',
    cta: 'Voir la carte',
    className: 'col-span-3 lg:col-span-2',
    background: (
      <div className="absolute inset-0 opacity-40 [mask-image:linear-gradient(to_top,transparent_10%,#000_80%)]">
        <DottedMap
          markers={[
            { lat: 48.8566, lng: 2.3522 },
            { lat: 51.5074, lng: -0.1278 },
            { lat: 52.52, lng: 13.405 },
            { lat: 40.7128, lng: -74.006 },
            { lat: 35.6762, lng: 139.6503 },
          ]}
          dotColor="oklch(0.457 0.24 277.023)"
          markerColor="oklch(0.457 0.24 277.023)"
        />
      </div>
    ),
  },
  {
    Icon: Share2Icon as React.ElementType,
    name: 'Gateway & Microservices',
    description: 'Architecture distribuée : un gateway central orchestre 7+ microservices indépendants.',
    href: '/developers',
    cta: 'En savoir plus',
    className: 'col-span-3 lg:col-span-2',
    background: (
      <GatewayBeam className="absolute top-4 right-2 h-[300px] border-none [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] transition-all duration-300 ease-out group-hover:scale-105" />
    ),
  },
  {
    Icon: BotIcon as React.ElementType,
    name: 'API & Bots',
    description: 'SDK ouvert. Créez vos propres bots et intégrations.',
    href: '/developers',
    cta: 'Documentation',
    className: 'col-span-3 lg:col-span-1',
    background: (
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
        <CodeIcon size={120} className="text-primary" />
      </div>
    ),
  },
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
          <div className="hidden items-center gap-6 text-sm md:flex">
            {[
              { label: 'Fonctionnalités', href: '#features' },
              { label: 'Sécurité', href: '#security' },
              { label: 'Développeurs', href: '/developers' },
            ].map((l) => (
              <Link key={l.label} href={l.href} className="text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </div>
          <NavAuthButtons />
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative  px-6 pt-20 pb-0 md:pt-28">
        <DotPattern
          className={cn('opacity-40 dark:opacity-20', 'mask-[radial-gradient(700px_circle_at_left_top,white,transparent)]')}
          width={24} height={24} cr={1}
        />

        {/* Texte + Safari en 2 colonnes */}
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="grid items-center gap-10 md:grid-cols-2">
            {/* Colonne gauche : texte */}
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-sm backdrop-blur-sm">
                <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
                <AnimatedGradientText colorFrom="#6d28d9" colorTo="#7c3aed" speed={0.6} className="text-xs font-medium">
                  Open source · Association loi 1901
                </AnimatedGradientText>
              </div>

              <h1 className="font-(family-name:--font-krona) text-3xl leading-snug tracking-tight md:text-4xl md:leading-tight">
                La messagerie{' '}
                <Highlighter action="underline" color="oklch(0.457 0.24 277.023)" strokeWidth={2} animationDuration={800}>
                  chiffrée
                </Highlighter>
                ,{' '}
                <GeoTagline />
              </h1>

              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <span>La plateforme</span>
                <WordRotate
                  words={['100% privée.', 'open source.', 'sans tracking.', 'hébergée en France.', 'gratuite.', 'sécurisée.']}
                  duration={2800}
                  className="font-semibold text-primary"
                />
              </div>

              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Chiffrement de bout en bout, hébergement français, zéro tracking.
                Portée par AlfyCore — gratuite et open source, pour toujours.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/register">
                  <ShimmerButton
                    background="oklch(0.457 0.24 277.023)"
                    borderRadius="12px"
                    className="gap-2 px-7 py-2.5 text-sm font-medium"
                  >
                    Créer un compte
                    <ArrowRightIcon size={14} />
                  </ShimmerButton>
                </Link>
                <Link href="/login">
                  <InteractiveHoverButton className="h-11 rounded-xl border border-border px-6 text-sm">
                    Se connecter
                  </InteractiveHoverButton>
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
                {['ECDH + AES-256', <GeoHostingBadge key="g" />, 'RGPD natif', 'Gratuit'].map((t, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckIcon size={10} className="text-primary" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Colonne droite : Safari mockup */}
            <div className="relative hidden md:block">
              {/* Halo violet derrière */}
              <div className="pointer-events-none absolute -inset-10 rounded-full bg-primary/10 blur-3xl" />
                 <Safari
                url="alfychat.app"
                imageSrc="/screenshots/app-preview.png"
                className="relative w-full drop-shadow-2xl"
              />
            </div>
          </div>
        </div>

        {/* Gradient de fondu vers le bas */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-background to-transparent" />
      </section>



      {/* ── Orbiting (Tech visuel) ── */}
      <section className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <Badge variant="secondary" className="mb-4">Architecture</Badge>
            <h2 className="font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
              Construit sur une stack<br />moderne & ouverte.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Microservices Node.js, MySQL, Redis, Socket.IO, WebRTC. Chaque composant est open source et auto-hébergeable.
            </p>
            <div className="mt-6">
              <Link href="/developers">
                <Button variant="outline" size="sm" className="gap-2">
                  <CodeIcon size={14} />
                  Voir la documentation
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative flex h-[380px] w-full items-center justify-center">
            <OrbitingCircles iconSize={38} radius={140} speed={0.8}>
              <div className="flex size-10 items-center justify-center rounded-full border bg-background">
                <ShieldIcon size={18} className="text-primary" />
              </div>
              <div className="flex size-10 items-center justify-center rounded-full border bg-background">
                <ZapIcon size={18} className="text-primary" />
              </div>
              <div className="flex size-10 items-center justify-center rounded-full border bg-background">
                <DatabaseIcon size={18} className="text-primary" />
              </div>
              <div className="flex size-10 items-center justify-center rounded-full border bg-background">
                <PhoneIcon size={18} className="text-primary" />
              </div>
            </OrbitingCircles>
            <OrbitingCircles iconSize={28} radius={75} reverse speed={1.4}>
              <div className="flex size-8 items-center justify-center rounded-full border bg-background">
                <ServerIcon size={14} className="text-muted-foreground" />
              </div>
              <div className="flex size-8 items-center justify-center rounded-full border bg-background">
                <CodeIcon size={14} className="text-muted-foreground" />
              </div>
              <div className="flex size-8 items-center justify-center rounded-full border bg-background">
                <BotIcon size={14} className="text-muted-foreground" />
              </div>
            </OrbitingCircles>
            {/* Centre */}
            <div className="relative z-10 flex size-16 items-center justify-center rounded-2xl bg-primary p-3">
              <img src="/logo/Alfychat.svg" alt="A" className="size-full" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stack Marquee ── */}
      <section className="border-y bg-muted/20 py-6">
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-linear-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-linear-to-l from-background to-transparent" />
          <Marquee pauseOnHover className="[--duration:22s] [--gap:1.5rem]">
            {stack.map((s) => (
              <div key={s.label} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-4 py-2">
                <s.icon size={14} className="shrink-0 text-primary" />
                <span className="text-sm font-medium whitespace-nowrap">{s.label}</span>
              </div>
            ))}
          </Marquee>
        </div>
      </section>

      {/* ── Bento features ── */}
      <section id="features" className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="mb-12">
          <Badge variant="secondary" className="mb-3">Fonctionnalités</Badge>
          <h2 className="font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
            Tout ce qu'il vous faut.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Conçu pour la confidentialité, la performance et la simplicité.
          </p>
        </div>
        <BentoGrid>
          {bentoFeatures.map((f, i) => (
            <BentoCard key={i} {...f} />
          ))}
        </BentoGrid>
      </section>

      {/* ── Sécurité ── */}
      <section id="security" className="border-y bg-muted/10">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
          <div className="grid items-start gap-12 md:grid-cols-2">
            <div>
              <Badge variant="secondary" className="mb-4">Sécurité</Badge>
              <h2 className="font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
                Zero-knowledge,<br />
                <Highlighter action="box" color="oklch(0.457 0.24 277.023)" strokeWidth={1.5} isView>
                  par design.
                </Highlighter>
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
                <div key={item.text} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-muted/50">
                  <item.icon size={16} className="shrink-0 text-primary" />
                  <span className="text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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
                  <GlobeIcon size={14} />alfycore.pro
                </Button>
              </Link>
              <Link href="mailto:contact@alfycore.org">
                <Button variant="outline" size="sm">contact@alfycore.org</Button>
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
              <MagicCard key={f.title} className="rounded-xl border bg-card" gradientFrom="#9E7AFF" gradientTo="#7c3aed" gradientColor="rgba(109,40,217,0.06)" gradientOpacity={1}>
                <div className="p-4">
                  <f.icon size={16} className="mb-1.5 text-primary" />
                  <p className="text-xs font-semibold">{f.title}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{f.desc}</p>
                </div>
              </MagicCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-5xl px-6 pb-20 md:pb-28">
        <div className="relative overflow-hidden rounded-2xl border bg-card">
          <BorderBeam colorFrom="#7c3aed" colorTo="#9E7AFF" duration={8} size={120} />
          <div className="flex flex-col items-center gap-6 px-8 py-14 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs backdrop-blur-sm">
              <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
              Gratuit · Open Source · Pour toujours
            </div>
            <h2 className="font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
              Rejoignez ALFYCHAT.
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Aucune pub. Aucun pistage. Pour toujours gratuit et open source.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Open source', 'France 🇫🇷', 'RGPD', 'Gratuit'].map((t) => (
                <Badge key={t} variant="outline">
                  <CheckIcon size={8} className="text-green-500" />{t}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/register">
                <ShimmerButton
                  background="oklch(0.457 0.24 277.023)"
                  borderRadius="12px"
                  className="gap-2 px-7 py-2.5 text-sm font-medium"
                >
                  Créer mon compte <ArrowRightIcon size={14} />
                </ShimmerButton>
              </Link>
              <Link href="/login">
                <InteractiveHoverButton className="h-11 rounded-xl border border-border px-6 text-sm">
                  Se connecter
                </InteractiveHoverButton>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t bg-muted/20">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
            {/* Brand */}
            <div className="sm:col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 font-(family-name:--font-krona) text-sm font-medium">
                <img src="/logo/Alfychat.svg" alt="" className="size-5" />
                ALFYCHAT
              </Link>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Messagerie chiffrée open source. Portée par AlfyCore, association loi 1901.
              </p>
              <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                Fait avec <HeartIcon size={10} className="text-destructive" /> en France 🇫🇷
              </p>
            </div>
            {/* Produit */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Produit</p>
              <ul className="space-y-2 text-sm">
                {[
                  { label: 'Fonctionnalités', href: '#features' },
                  { label: 'Sécurité', href: '#security' },
                  { label: 'Téléchargement', href: '/app' },
                  { label: 'Changelog', href: '/changelogs' },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-muted-foreground transition-colors hover:text-foreground">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            {/* Développeurs */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Développeurs</p>
              <ul className="space-y-2 text-sm">
                {[
                  { label: 'Documentation', href: '/developers/docs' },
                  { label: 'API Bots', href: '/developers/bots' },
                  { label: 'Portail dev', href: '/developers' },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-muted-foreground transition-colors hover:text-foreground">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            {/* Légal */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Légal</p>
              <ul className="space-y-2 text-sm">
                {[
                  { label: 'CGU', href: '/legal/cgu' },
                  { label: 'Confidentialité', href: '/legal/privacy' },
                  { label: 'Cookies', href: '/legal/cookies' },
                  { label: 'Mentions légales', href: '/legal/mentions' },
                  { label: 'Contact', href: 'mailto:contact@alfycore.org' },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-muted-foreground transition-colors hover:text-foreground">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground md:flex-row">
            <span className="font-(family-name:--font-krona) text-[10px]">© 2026 AlfyCore · Association loi 1901</span>
            <div className="flex flex-wrap gap-4">
              {[
                { label: 'CGU', href: '/legal/cgu' },
                { label: 'Confidentialité', href: '/legal/privacy' },
                { label: 'alfycore.pro', href: 'https://alfycore.pro' },
              ].map((l) => (
                <Link key={l.label} href={l.href} className="transition-colors hover:text-foreground">{l.label}</Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
