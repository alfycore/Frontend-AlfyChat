import Image from 'next/image';
import {
  ShieldIcon, LockIcon, UsersIcon,
  ArrowRightIcon, HeartIcon, CheckIcon,
  GlobeIcon, ZapIcon, PhoneIcon, BotIcon, HashIcon,
  Volume2Icon, SendIcon, CodeIcon, ServerIcon, DatabaseIcon,
  KeyIcon, EyeOffIcon, MonitorUpIcon, MessageCircleIcon,
  VideoIcon, BellIcon, StarIcon,
} from '@/components/icons';
import { NavAuthButtons } from '@/components/landing/nav-auth-buttons';
import { GeoTagline, GeoHostingBadge } from '@/components/landing/geo-tagline';
import { Reveal, Stagger } from '@/components/landing/reveal';
import { Avatar, Button, Card, Link, Separator } from '@heroui/react';

/* ── Data ─────────────────────────────────────────────────── */

const chat = [
  { id: 'a', avatar: 'A', bg: 'bg-blue-500',   text: "Salut tout le monde ! 👋" },
  { id: 'b', avatar: 'L', bg: 'bg-emerald-500', text: "Le E2EE est activé par défaut 🔒" },
  { id: 'c', avatar: 'V', bg: 'bg-accent',      text: "Hébergé en France, RGPD natif 🇫🇷", own: true },
  { id: 'd', avatar: 'A', bg: 'bg-blue-500',    text: "100% open-source, forever free ✨" },
];

const features = [
  {
    icon: ShieldIcon, title: 'Chiffrement E2EE',
    desc: 'ECDH P-256 + AES-256-GCM hybride. Clés éphémères générées côté client — AlfyCore ne peut rien lire.',
    color: 'text-blue-400', bg: 'bg-blue-500/10',
  },
  {
    icon: PhoneIcon, title: 'Appels WebRTC HD',
    desc: 'Voix, vidéo, partage d\'écran et appels de groupe simultanés. Chiffrement DTLS-SRTP peer-to-peer.',
    color: 'text-emerald-400', bg: 'bg-emerald-500/10',
  },
  {
    icon: UsersIcon, title: 'Serveurs & Salons',
    desc: 'Créez vos communautés avec salons textuels, vocaux, rôles et permissions granulaires.',
    color: 'text-violet-400', bg: 'bg-violet-500/10',
  },
  {
    icon: BotIcon, title: 'API & Bots',
    desc: 'Architecture microservices avec API ouverte. Créez vos bots et intégrations via notre SDK.',
    color: 'text-orange-400', bg: 'bg-orange-500/10',
  },
  {
    icon: ZapIcon, title: 'Temps réel natif',
    desc: 'Socket.IO + WebSocket. Frappe en temps réel, présence, statuts, réactions — aucune latence.',
    color: 'text-amber-400', bg: 'bg-amber-500/10',
  },
  {
    icon: GlobeIcon, title: 'RGPD & Souveraineté',
    desc: 'Infrastructure 100% française. Export, portabilité et suppression totale de vos données.',
    color: 'text-cyan-400', bg: 'bg-cyan-500/10',
  },
];

const levels = [
  {
    name: 'Signal Protocol E2EE', tag: 'Zero-Knowledge',
    desc: 'Le serveur stocke uniquement des ciphertexts opaques. Tout le chiffrement et déchiffrement se fait côté client — AlfyCore ne peut techniquement rien lire.',
    items: ['ECDH P-256 · échange de clés asymétriques', 'AES-256-GCM · chiffrement symétrique', 'Clés éphémères générées côté client', 'Zero-knowledge côté serveur', 'DTLS-SRTP pour les appels WebRTC'],
    color: 'accent', featured: true,
  },
];

const techStack = [
  { icon: ServerIcon,   label: 'Microservices',     desc: 'Node.js + Bun gateway',       color: 'text-blue-400' },
  { icon: DatabaseIcon, label: 'MySQL + Redis',      desc: 'Cache distribué, pools 30+',   color: 'text-emerald-400' },
  { icon: ZapIcon,      label: 'Socket.IO',          desc: 'WebSocket natif temps réel',  color: 'text-amber-400' },
  { icon: PhoneIcon,    label: 'WebRTC Mesh',         desc: 'P2P DTLS-SRTP chiffré',       color: 'text-violet-400' },
  { icon: ShieldIcon,   label: 'ECDH P-256',          desc: 'Cryptographie côté client',   color: 'text-rose-400' },
  { icon: CodeIcon,     label: 'Open Source',         desc: 'MIT License, auditable',      color: 'text-cyan-400' },
];

const steps = [
  { n: '01', title: 'Créez un compte', desc: 'Inscription gratuite. Aucune carte bancaire, aucune pub. Juste un e-mail.', icon: MessageCircleIcon },
  { n: '02', title: 'Activez le E2EE', desc: 'Signal Protocol actif par défaut. Clés générées côté client, le serveur ne lit rien.', icon: KeyIcon },
  { n: '03', title: 'Invitez vos proches', desc: 'Partagez un lien d\'invitation. Créez un serveur pour votre communauté.', icon: UsersIcon },
  { n: '04', title: 'Communiquez librement', desc: 'Messages, appels HD, partage d\'écran — tout est chiffré de bout en bout.', icon: ShieldIcon },
];

const openSourceFacts = [
  { icon: CodeIcon,    label: 'Code source ouvert', desc: 'Auditable par n\'importe qui à tout moment.' },
  { icon: CodeIcon,    label: 'Zero tracking',       desc: 'Aucun pixel publicitaire, aucun cookie de traçage.' },
  { icon: HeartIcon,     label: 'Porté par une asso.', desc: 'AlfyCore, association loi 1901 à but non lucratif.' },
  { icon: ServerIcon,    label: 'Self-hostable',        desc: 'Déployez votre propre instance AlfyChat.' },
];

/* ── Page ─────────────────────────────────────────────────── */

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ━━ Navbar ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <nav className="sticky top-0 z-50 border-b border-separator bg-background/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <Image src="/logo/Alfychat.svg" alt="AlfyChat" width={28} height={28} />
            <span className="font-(family-name:--font-krona) text-sm font-medium text-foreground">AlfyChat</span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            <Link href="#fonctionnalites" className="text-xs text-muted transition-colors hover:text-foreground no-underline">Fonctionnalités</Link>
            <Link href="#securite" className="text-xs text-muted transition-colors hover:text-foreground no-underline">Sécurité</Link>
            <Link href="#opensource" className="text-xs text-muted transition-colors hover:text-foreground no-underline">Open Source</Link>
            <Link href="https://alfycore.pro" target="_blank" className="text-xs text-muted transition-colors hover:text-foreground no-underline">AlfyCore</Link>
          </div>

          <div className="flex items-center gap-2">
            <NavAuthButtons />
          </div>
        </div>
      </nav>

      {/* ━━ Hero ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative overflow-hidden">
        {/* Background glows */}
        <div className="pointer-events-none absolute -top-48 left-1/2 h-[750px] w-[1100px] -translate-x-1/2 rounded-full bg-accent/6 blur-[150px]" />
        <div className="pointer-events-none absolute top-24 left-1/4 h-[350px] w-[450px] -translate-x-1/2 rounded-full bg-blue-500/4 blur-[110px]" />
        <div className="pointer-events-none absolute top-24 right-1/4 h-[350px] w-[450px] translate-x-1/2 rounded-full bg-violet-500/4 blur-[110px]" />

        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-28 md:pb-36 md:pt-48">
          <Reveal direction="up">
            <div className="mx-auto max-w-2xl text-center">
              {/* Status badge */}
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-separator bg-surface px-4 py-2 text-xs font-medium text-muted shadow-sm">
                <span className="size-1.5 animate-pulse rounded-full bg-success" />
                Open source · Association loi 1901 · alfychat.app
              </div>

              {/* Headline */}
              <h1 className="mb-6 font-(family-name:--font-krona) text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.1] tracking-tight">
                La messagerie{' '}
                <span className="bg-[linear-gradient(135deg,oklch(0.72_0.19_280),oklch(0.64_0.26_310),oklch(0.59_0.22_250))] bg-clip-text text-transparent">
                  sécurisée
                </span>
                ,{' '}
                <GeoTagline />
              </h1>

              <p className="mx-auto mb-10 max-w-md text-base leading-relaxed text-muted">
                ECDH P-256 · AES-256-GCM · WebRTC chiffré · Hébergée en France.
                Portée par AlfyCore — gratuite et open source pour toujours.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/register" className="no-underline">
                  <Button size="lg" className="gap-2 px-7">
                    Commencer gratuitement
                    <ArrowRightIcon size={16} />
                  </Button>
                </Link>
                <Link href="https://alfycore.pro" target="_blank" className="no-underline">
                  <Button variant="tertiary" size="lg" className="px-7">
                    AlfyCore →
                  </Button>
                </Link>
              </div>

              {/* Trust strip */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-5 text-xs text-muted">
                {(['ECDH P-256 + AES-256-GCM', <GeoHostingBadge key="host" />, 'RGPD natif', '100 % open source'] as const).map((b, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <CheckIcon size={12} className="text-success" />
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          {/* ── App Mockup ──────────────────────────────── */}
          <Reveal direction="up" delay={150}>
            <div className="mx-auto mt-16 max-w-3xl md:mt-20">
              <Card variant="secondary" className="overflow-hidden p-1.5 shadow-2xl">
                <div className="overflow-hidden rounded-xl bg-background">
                  {/* Title bar */}
                  <div className="flex items-center gap-1.5 border-b border-separator px-4 py-2.5">
                    <div className="size-2.5 rounded-full bg-red-500/40" />
                    <div className="size-2.5 rounded-full bg-yellow-500/40" />
                    <div className="size-2.5 rounded-full bg-green-500/40" />
                    <Image src="/logo/Alfychat.svg" alt="" width={12} height={12} className="ml-3 opacity-40" />
                    <span className="text-[10px] text-muted">alfychat.app</span>
                    <div className="ml-auto flex items-center gap-1">
                      <div className="flex items-center gap-1 rounded-md bg-success/10 px-2 py-0.5">
                        <span className="size-1.5 rounded-full bg-success" />
                        <span className="text-[9px] font-medium text-success">E2EE actif</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex" style={{ height: 300 }}>
                    {/* Sidebar */}
                    <div className="hidden w-40 shrink-0 border-r border-separator bg-surface py-3 sm:block">
                      <div className="mb-1 flex items-center gap-1.5 px-3">
                        <div className="size-5 rounded-lg bg-accent/20" />
                        <span className="text-[10px] font-semibold">AlfyCore</span>
                      </div>
                      <p className="mb-1.5 mt-3 px-3 text-[8px] font-bold uppercase tracking-widest text-muted">Salons textuels</p>
                      {[{ n: 'général', active: true }, { n: 'projets', active: false }, { n: 'off-topic', active: false }].map((ch) => (
                        <div key={ch.n} className={`mx-1.5 mb-0.5 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] ${ch.active ? 'bg-accent/10 font-semibold text-accent' : 'text-muted'}`}>
                          <HashIcon size={10} />
                          {ch.n}
                        </div>
                      ))}
                      <p className="mb-1.5 mt-3 px-3 text-[8px] font-bold uppercase tracking-widest text-muted">Vocal</p>
                      <div className="mx-1.5 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] text-muted">
                        <Volume2Icon size={10} />
                        principal
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex flex-1 flex-col">
                      <div className="border-b border-separator px-4 py-2 flex items-center gap-2">
                        <HashIcon size={12} className="text-muted" />
                        <span className="text-[11px] font-semibold">général</span>
                        <div className="ml-auto flex items-center gap-1.5">
                          <PhoneIcon size={11} className="text-muted" />
                          <VideoIcon size={11} className="text-muted" />
                          <UsersIcon size={11} className="text-muted" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-3 overflow-hidden p-4">
                        {chat.map((m) => (
                          <div key={m.id} className={`flex items-end gap-2 ${m.own ? 'flex-row-reverse' : ''}`}>
                            <Avatar className={`size-6 shrink-0 text-[9px] font-bold text-white ${m.bg}`}>
                              <Avatar.Fallback className={`text-[9px] font-bold text-white ${m.bg}`}>
                                {m.avatar}
                              </Avatar.Fallback>
                            </Avatar>
                            <div className={`max-w-52 rounded-2xl px-3 py-1.5 text-[11px] leading-relaxed ${m.own ? 'rounded-br-sm bg-accent text-accent-foreground' : 'rounded-bl-sm bg-default text-foreground'}`}>
                              {m.text}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Input */}
                      <div className="border-t border-separator p-3">
                        <div className="flex items-center rounded-xl bg-default px-3.5 py-2.5">
                          <span className="flex-1 text-[11px] text-muted">Écrire un message chiffré…</span>
                          <div className="flex size-6 items-center justify-center rounded-lg bg-accent">
                            <SendIcon size={12} className="text-accent-foreground" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
              {/* Ambient glow */}
              <div className="mx-auto -mt-px h-px w-2/3 bg-[linear-gradient(90deg,transparent,oklch(0.6_0.2_280/25%),transparent)]" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ━━ Stats band ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="border-y border-separator">
        <div className="mx-auto grid max-w-4xl grid-cols-2 divide-x divide-separator md:grid-cols-4">
          {[
            { icon: LockIcon,    value: 'ECDH P-256',   label: 'Chiffrement clé' },
            { icon: GlobeIcon,   value: 'France 🇫🇷',  label: 'Infrastructure' },
            { icon: HeartIcon,   value: '100 %',         label: 'Open source' },
            { icon: CheckIcon,   value: 'Gratuit',       label: 'Pour toujours' },
          ].map((s) => (
            <Reveal key={s.label} direction="up">
              <div className="flex items-center gap-3 px-6 py-5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <s.icon size={16} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-bold">{s.value}</p>
                  <p className="text-[10px] text-muted">{s.label}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ━━ Features ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="fonctionnalites" className="py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal direction="up">
            <div className="mx-auto mb-16 max-w-lg text-center">
              <span className="mb-3 inline-block text-[11px] font-semibold uppercase tracking-widest text-accent">
                Fonctionnalités
              </span>
              <h2 className="font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
                Tout ce qu&apos;il faut, rien de trop.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Conçu pour la confidentialité, construit pour la communauté. Zéro compromis.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} direction="up" delay={i * 70}>
                <Card variant="secondary" className="group h-full transition-colors hover:bg-surface-secondary">
                  <Card.Header>
                    <div className={`mb-1 inline-flex size-11 items-center justify-center rounded-xl ${f.bg}`}>
                      <f.icon size={22} className={f.color} />
                    </div>
                    <Card.Title className="text-[15px]">{f.title}</Card.Title>
                  </Card.Header>
                  <Card.Content>
                    <p className="text-sm leading-relaxed text-muted">{f.desc}</p>
                  </Card.Content>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ How it works ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="border-y border-separator py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal direction="up">
            <div className="mx-auto mb-16 max-w-lg text-center">
              <span className="mb-3 inline-block text-[11px] font-semibold uppercase tracking-widest text-accent">
                Démarrage
              </span>
              <h2 className="font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
                Prêt en 2 minutes.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Aucun logiciel à installer. Accessible depuis n&apos;importe quel navigateur moderne.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-4">
            {steps.map((s, i) => (
              <Reveal key={s.n} direction="up" delay={i * 90}>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                      <s.icon size={18} className="text-accent" />
                    </div>
                    <span className="font-(family-name:--font-krona) text-3xl font-bold text-accent/20">{s.n}</span>
                  </div>
                  <div>
                    <h3 className="mb-1.5 text-sm font-semibold">{s.title}</h3>
                    <p className="text-xs leading-relaxed text-muted">{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ Security ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="securite" className="relative overflow-hidden py-28">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/4 blur-[120px]" />

        <div className="relative mx-auto max-w-6xl px-6">
          <Reveal direction="up">
            <div className="mx-auto mb-16 max-w-lg text-center">
              <span className="mb-3 inline-block text-[11px] font-semibold uppercase tracking-widest text-accent">
                Sécurité
              </span>
              <h2 className="font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
                Chiffrement Signal Protocol.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Un seul niveau — le maximum. Zero-knowledge natif : AlfyCore ne peut lire aucun message.
              </p>
            </div>
          </Reveal>

          <div className="mx-auto max-w-2xl">
            {levels.map((lvl, i) => (
              <Reveal key={lvl.name} direction="up" delay={i * 90}>
                <Card variant="secondary" className="relative ring-1 ring-accent/30">
                  <div className="absolute right-4 top-4">
                    <span className="rounded-full bg-accent-soft px-3 py-1 text-[10px] font-bold text-accent">
                      Actif par défaut
                    </span>
                  </div>
                  <Card.Header>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="size-2 rounded-full bg-accent" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Chiffrement unique</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <Card.Title className="font-(family-name:--font-krona) text-lg">{lvl.name}</Card.Title>
                      <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">{lvl.tag}</span>
                    </div>
                  </Card.Header>
                  <Card.Content>
                    <p className="mb-4 text-sm leading-relaxed text-muted">{lvl.desc}</p>
                    <ul className="space-y-1.5">
                      {lvl.items.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-xs text-muted">
                          <CheckIcon size={12} className="text-accent" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </Card.Content>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ Tech Stack ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="border-y border-separator py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal direction="up">
            <div className="mx-auto mb-12 max-w-lg text-center">
              <span className="mb-3 inline-block text-[11px] font-semibold uppercase tracking-widest text-accent">
                Architecture
              </span>
              <h2 className="font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
                Conçu pour la fiabilité.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Microservices indépendants, base MySQL, cache Redis, gateway Socket.IO.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {techStack.map((t, i) => (
              <Reveal key={t.label} direction="up" delay={i * 60}>
                <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-separator bg-surface px-3 py-5 text-center transition-colors hover:bg-surface-secondary">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-background">
                    <t.icon size={20} className={t.color} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold">{t.label}</p>
                    <p className="text-[9px] text-muted">{t.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ Open Source ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="opensource" className="py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <Reveal direction="left">
              <div>
                <span className="mb-3 inline-block text-[11px] font-semibold uppercase tracking-widest text-accent">
                  Open Source & Association
                </span>
                <h2 className="mb-4 font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
                  Porté par AlfyCore,<br />pas par des investisseurs.
                </h2>
                <p className="mb-8 text-sm leading-relaxed text-muted">
                  AlfyCore est une association à but non lucratif (loi 1901) fondée en France.
                  Notre mission : construire des outils de communication libres, souverains et respectueux
                  de la vie privée. Aucun actionnaire. Aucune pression commerciale. Juste la communauté.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href="https://alfycore.pro" target="_blank" className="no-underline">
                    <Button variant="tertiary" size="sm" className="gap-2">
                      <GlobeIcon size={14} />
                      alfycore.pro
                    </Button>
                  </Link>
                  <Link href="mailto:contact@alfycore.org" className="no-underline">
                    <Button variant="tertiary" size="sm" className="gap-2">
                      contact@alfycore.org
                    </Button>
                  </Link>
                </div>
              </div>
            </Reveal>

            <Reveal direction="right">
              <div className="grid grid-cols-2 gap-3">
                {openSourceFacts.map((f) => (
                  <div key={f.label} className="rounded-2xl border border-separator bg-surface p-4">
                    <div className="mb-2 flex size-8 items-center justify-center rounded-lg bg-accent/10">
                      <f.icon size={16} className="text-accent" />
                    </div>
                    <p className="mb-1 text-[12px] font-semibold">{f.label}</p>
                    <p className="text-[11px] leading-relaxed text-muted">{f.desc}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ━━ Appels de groupe spotlight ━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="border-y border-separator bg-surface py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <Reveal direction="up" delay={0}>
              <div className="order-2 md:order-1">
                <div className="overflow-hidden rounded-2xl border border-separator bg-background p-5 shadow-xl">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10">
                      <PhoneIcon size={16} className="text-emerald-400" />
                    </div>
                    <span className="text-[12px] font-semibold">Appel de groupe — 4 participants</span>
                    <div className="ml-auto flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5">
                      <span className="size-1.5 animate-pulse rounded-full bg-success" />
                      <span className="text-[9px] font-medium text-success">En cours</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { letter: 'A', bg: 'bg-blue-500',    name: 'Alice',   active: true },
                      { letter: 'B', bg: 'bg-violet-500',  name: 'Baptiste', active: false },
                      { letter: 'C', bg: 'bg-emerald-500', name: 'Camille', active: true },
                      { letter: 'V', bg: 'bg-accent',      name: 'Vous',    active: false, own: true },
                    ].map((p) => (
                      <div key={p.name} className={`flex items-center gap-2.5 rounded-xl p-2.5 ${p.own ? 'bg-accent/8 ring-1 ring-accent/20' : 'bg-surface'}`}>
                        <div className={`size-8 rounded-full ${p.bg} flex items-center justify-center text-[11px] font-bold text-white`}>{p.letter}</div>
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-medium">{p.name}</p>
                          <p className={`text-[9px] ${p.active ? 'text-success' : 'text-muted'}`}>{p.active ? '🎙 parle…' : 'muet'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-full bg-surface">
                      <VideoIcon size={14} className="text-muted" />
                    </div>
                    <div className="flex size-8 items-center justify-center rounded-full bg-surface">
                      <MonitorUpIcon size={14} className="text-muted" />
                    </div>
                    <div className="flex size-9 items-center justify-center rounded-full bg-danger/10">
                      <PhoneIcon size={15} className="text-danger" />
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal direction="right" delay={100}>
              <div className="order-1 md:order-2">
                <span className="mb-3 inline-block text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
                  Appels HD
                </span>
                <h2 className="mb-4 font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
                  Appels de groupe simultanés.
                </h2>
                <p className="mb-6 text-sm leading-relaxed text-muted">
                  Architecture WebRTC mesh P2P — tous les membres d&apos;un groupe sont appelés en même temps,
                  sans serveur de médias centralisé. Chiffrement DTLS-SRTP de bout en bout sur chaque flux audio/vidéo.
                </p>
                <ul className="space-y-2.5">
                  {[
                    'Appel de groupe en un clic — tout le monde sonne',
                    'WebRTC DTLS-SRTP · zéro serveur de médias',
                    'Partage d\'écran chiffré en temps réel',
                    'Basculement vidéo / voix sans interruption',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted">
                      <CheckIcon size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ━━ CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-28">
        <div className="mx-auto max-w-3xl px-6">
          <Reveal direction="up">
            <Card variant="secondary" className="relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.6_0.2_280/7%),transparent_65%)]" />
              <Card.Header className="relative flex-col items-center pt-10 text-center">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-separator bg-background px-4 py-2 text-xs text-muted">
                  <UsersIcon size={12} className="text-accent/70" />
                  AlfyCore · Association loi 1901 · alfycore.pro
                </div>
                <Card.Title className="font-(family-name:--font-krona) text-2xl md:text-3xl">
                  Rejoignez AlfyChat.
                </Card.Title>
                <Card.Description className="mx-auto max-w-sm text-sm leading-relaxed">
                  Aucune pub. Aucun pistage. Développé par et pour la communauté — pour toujours gratuit.
                </Card.Description>
              </Card.Header>
              <Card.Content className="relative flex flex-col items-center gap-6 pb-10">
                <div className="flex flex-wrap justify-center gap-2">
                  {['100% Open source', 'Hébergé en France', 'RGPD natif', 'Gratuit'].map((t) => (
                    <span key={t} className="flex items-center gap-1.5 rounded-full border border-separator bg-background px-3 py-1 text-[11px] text-muted">
                      <CheckIcon size={10} className="text-success" />
                      {t}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/register" className="no-underline">
                    <Button size="lg" className="gap-2 px-8">
                      Créer mon compte
                      <ArrowRightIcon size={16} />
                    </Button>
                  </Link>
                  <Link href="/login" className="no-underline">
                    <Button variant="tertiary" size="lg" className="px-8">
                      Se connecter
                    </Button>
                  </Link>
                </div>
              </Card.Content>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* ━━ Footer ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="border-t border-separator">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="mb-8 grid gap-8 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="mb-3 flex items-center gap-2">
                <Image src="/logo/Alfychat.svg" alt="AlfyChat" width={22} height={22} />
                <span className="font-(family-name:--font-krona) text-sm">AlfyChat</span>
              </div>
              <p className="mb-4 text-[11px] leading-relaxed text-muted">
                Messagerie sécurisée E2EE, hébergée en France.<br />
                Portée par AlfyCore — association loi 1901.
              </p>
              <div className="flex flex-col gap-1 text-[11px] text-muted">
                <span>🌐 alfychat.app</span>
                <Link href="https://alfycore.pro" target="_blank" className="hover:text-foreground">🌐 alfycore.pro</Link>
                <Link href="mailto:contact@alfycore.org" className="hover:text-foreground">✉️ contact@alfycore.org</Link>
              </div>
            </div>
            {[
              {
                title: 'Produit',
                links: [
                  { label: 'Créer un compte', href: '/register' },
                  { label: 'Connexion', href: '/login' },
                  { label: 'API & Bots', href: '/developers' },
                ],
              },
              {
                title: 'Légal',
                links: [
                  { label: 'CGU', href: '/terms' },
                  { label: 'Confidentialité', href: '/privacy' },
                  { label: 'RGPD', href: '/rgpd' },
                ],
              },
              {
                title: 'Association',
                links: [
                  { label: 'AlfyCore', href: 'https://alfycore.pro' },
                  { label: 'Contact', href: 'mailto:contact@alfycore.org' },
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-xs text-muted transition-colors hover:text-foreground">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex flex-col items-center justify-between gap-2 pt-6 text-[10px] text-muted md:flex-row">
            <p>© 2026 AlfyChat · AlfyCore · Association loi 1901</p>
            <p className="flex items-center gap-1">
              Fait avec <HeartIcon size={10} className="text-danger" /> en France 🇫🇷 · alfychat.app
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

