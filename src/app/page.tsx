import Image from 'next/image';
import {
  ShieldIcon, LockIcon, UsersIcon,
  ArrowRightIcon, HeartIcon, CheckIcon,
  GlobeIcon, ZapIcon, PhoneIcon, BotIcon, HashIcon,
  Volume2Icon, SendIcon, CodeIcon, ServerIcon, DatabaseIcon,
  KeyIcon, MonitorUpIcon, MessageCircleIcon,
  VideoIcon, StarIcon,
} from '@/components/icons';
import { NavAuthButtons } from '@/components/landing/nav-auth-buttons';
import { GeoTagline, GeoHostingBadge } from '@/components/landing/geo-tagline';
import { Reveal, Stagger } from '@/components/landing/reveal';
import { Avatar, Button, Card, Link, Separator } from '@heroui/react';

/* ── Data ─────────────────────────────────────────────────── */

const chat = [
  { id: 'a', avatar: 'A', bg: 'from-blue-500 to-blue-600',     text: "Salut tout le monde ! 👋" },
  { id: 'b', avatar: 'L', bg: 'from-emerald-500 to-teal-600',  text: "Le E2EE est activé par défaut 🔒" },
  { id: 'c', avatar: 'V', bg: 'from-violet-500 to-accent',     text: "Hébergé en France, RGPD natif 🇫🇷", own: true },
  { id: 'd', avatar: 'A', bg: 'from-blue-500 to-blue-600',     text: "100% open-source, forever free ✨" },
];

const features = [
  {
    icon: ShieldIcon, title: 'Chiffrement E2EE',
    desc: 'ECDH P-256 + AES-256-GCM hybride. Clés éphémères générées côté client — AlfyCore ne peut rien lire.',
    color: 'text-blue-400', glow: 'shadow-blue-500/20', border: 'hover:border-blue-500/30',
  },
  {
    icon: PhoneIcon, title: 'Appels WebRTC HD',
    desc: 'Voix, vidéo, partage d\'écran et appels de groupe simultanés. Chiffrement DTLS-SRTP peer-to-peer.',
    color: 'text-emerald-400', glow: 'shadow-emerald-500/20', border: 'hover:border-emerald-500/30',
  },
  {
    icon: UsersIcon, title: 'Serveurs & Salons',
    desc: 'Créez vos communautés avec salons textuels, vocaux, rôles et permissions granulaires.',
    color: 'text-violet-400', glow: 'shadow-violet-500/20', border: 'hover:border-violet-500/30',
  },
  {
    icon: BotIcon, title: 'API & Bots',
    desc: 'Architecture microservices avec API ouverte. Créez vos bots et intégrations via notre SDK.',
    color: 'text-orange-400', glow: 'shadow-orange-500/20', border: 'hover:border-orange-500/30',
  },
  {
    icon: ZapIcon, title: 'Temps réel natif',
    desc: 'Socket.IO + WebSocket. Frappe en temps réel, présence, statuts, réactions — aucune latence.',
    color: 'text-amber-400', glow: 'shadow-amber-500/20', border: 'hover:border-amber-500/30',
  },
  {
    icon: GlobeIcon, title: 'RGPD & Souveraineté',
    desc: 'Infrastructure 100% française. Export, portabilité et suppression totale de vos données.',
    color: 'text-cyan-400', glow: 'shadow-cyan-500/20', border: 'hover:border-cyan-500/30',
  },
];

const levels = [
  {
    name: 'Signal Protocol E2EE', tag: 'Zero-Knowledge',
    desc: 'Le serveur stocke uniquement des ciphertexts opaques. Tout le chiffrement et déchiffrement se fait côté client — AlfyCore ne peut techniquement rien lire.',
    items: ['ECDH P-256 · échange de clés asymétriques', 'AES-256-GCM · chiffrement symétrique', 'Clés éphémères générées côté client', 'Zero-knowledge côté serveur', 'DTLS-SRTP pour les appels WebRTC'],
  },
];

const techStack = [
  { icon: ServerIcon,   label: 'Microservices',  desc: 'Node.js + Bun gateway',      color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  { icon: DatabaseIcon, label: 'MySQL + Redis',   desc: 'Cache distribué, pools 30+',  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { icon: ZapIcon,      label: 'Socket.IO',       desc: 'WebSocket natif temps réel', color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  { icon: PhoneIcon,    label: 'WebRTC Mesh',     desc: 'P2P DTLS-SRTP chiffré',      color: 'text-violet-400',  bg: 'bg-violet-500/10' },
  { icon: ShieldIcon,   label: 'ECDH P-256',      desc: 'Cryptographie côté client',  color: 'text-rose-400',    bg: 'bg-rose-500/10' },
  { icon: CodeIcon,     label: 'Open Source',     desc: 'MIT License, auditable',     color: 'text-cyan-400',    bg: 'bg-cyan-500/10' },
];

const steps = [
  { n: '01', title: 'Créez un compte', desc: 'Inscription gratuite. Aucune carte bancaire, aucune pub. Juste un e-mail.', icon: MessageCircleIcon, color: 'text-accent', glow: 'bg-accent/10' },
  { n: '02', title: 'Activez le E2EE', desc: 'Signal Protocol actif par défaut. Clés générées côté client, le serveur ne lit rien.', icon: KeyIcon, color: 'text-blue-400', glow: 'bg-blue-500/10' },
  { n: '03', title: 'Invitez vos proches', desc: 'Partagez un lien d\'invitation. Créez un serveur pour votre communauté.', icon: UsersIcon, color: 'text-emerald-400', glow: 'bg-emerald-500/10' },
  { n: '04', title: 'Communiquez librement', desc: 'Messages, appels HD, partage d\'écran — tout est chiffré de bout en bout.', icon: ShieldIcon, color: 'text-violet-400', glow: 'bg-violet-500/10' },
];

const openSourceFacts = [
  { icon: CodeIcon,   label: 'Code source ouvert', desc: 'Auditable par n\'importe qui à tout moment.' },
  { icon: CodeIcon,   label: 'Zero tracking',       desc: 'Aucun pixel publicitaire, aucun cookie de traçage.' },
  { icon: HeartIcon,  label: 'Porté par une asso.', desc: 'AlfyCore, association loi 1901 à but non lucratif.' },
  { icon: ServerIcon, label: 'Self-hostable',       desc: 'Déployez votre propre instance AlfyChat.' },
];

/* ── Glass helpers ────────────────────────────────────────── */
const glass = "relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/8 bg-white/60 dark:bg-white/5 shadow-xl";
const glassDark = "relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl";
const glassLight = "rounded-2xl border border-black/8 dark:border-white/8 bg-white/80 dark:bg-white/5 shadow-lg";

/* ── Page ─────────────────────────────────────────────────── */

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[oklch(0.97_0.01_282)] text-foreground dark:bg-[oklch(0.08_0.015_282)]">

      {/* ── Fond mesh fixe ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-60 left-1/2 h-[900px] w-[900px] -translate-x-1/2 rounded-full bg-accent/10 blur-[160px]" />
        <div className="absolute top-1/3 -left-40 h-[500px] w-[600px] rounded-full bg-blue-500/8 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[500px] w-[600px] rounded-full bg-violet-500/8 blur-[140px]" />
        <div className="absolute bottom-0 left-1/2 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-emerald-500/6 blur-[120px]" />
        {/* Grid overlay subtil */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0_282/3%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_282/3%)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* ━━ Navbar ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <nav className="sticky top-0 z-50 border-b border-black/8 dark:border-white/8 bg-white/70 dark:bg-black/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="flex size-8 items-center justify-center rounded-xl bg-accent/15 ring-1 ring-accent/20">
              <Image src="/logo/Alfychat.svg" alt="AlfyChat" width={20} height={20} />
            </div>
            <span className="font-(family-name:--font-krona) text-sm font-medium">AlfyChat</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {[
              { label: 'Fonctionnalités', href: '#fonctionnalites' },
              { label: 'Sécurité', href: '#securite' },
              { label: 'Open Source', href: '#opensource' },
              { label: 'AlfyCore', href: 'https://alfycore.pro', external: true },
            ].map((l) => (
              <Link
                key={l.label}
                href={l.href}
                target={l.external ? '_blank' : undefined}
                className="rounded-lg px-3 py-1.5 text-xs text-muted transition-all hover:bg-black/5 dark:hover:bg-white/8 hover:text-foreground no-underline"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <NavAuthButtons />
          </div>
        </div>
      </nav>

      {/* ━━ Hero ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative pt-28 pb-24 md:pt-44 md:pb-36">
        <div className="relative mx-auto max-w-6xl px-6">
          <Reveal direction="up">
            <div className="mx-auto max-w-3xl text-center">

              {/* Badge statut */}
              <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-black/10 dark:border-white/12 bg-white/70 dark:bg-white/6 px-4 py-2 text-[11px] font-medium text-muted shadow-sm">
                <span className="flex size-4 items-center justify-center rounded-full bg-success/15">
                  <span className="size-1.5 animate-pulse rounded-full bg-success" />
                </span>
                Open source · Association loi 1901 · alfychat.app
              </div>

              {/* Titre */}
              <h1 className="mb-6 font-(family-name:--font-krona) text-[clamp(2.25rem,6vw,4rem)] leading-[1.08] tracking-tight">
                La messagerie{' '}
                <span className="bg-[linear-gradient(135deg,oklch(0.75_0.18_280),oklch(0.60_0.28_310),oklch(0.55_0.24_250))] bg-clip-text text-transparent">
                  sécurisée
                </span>
                ,{' '}
                <GeoTagline />
              </h1>

              <p className="mx-auto mb-10 max-w-lg text-base leading-relaxed text-muted">
                ECDH P-256 · AES-256-GCM · WebRTC chiffré · Hébergée en France.
                Portée par AlfyCore — gratuite et open source pour toujours.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/register" className="no-underline">
                  <Button size="lg" className="gap-2 px-8 shadow-lg shadow-accent/25">
                    Commencer gratuitement
                    <ArrowRightIcon size={16} />
                  </Button>
                </Link>
                <Link href="https://alfycore.pro" target="_blank" className="no-underline">
                  <Button variant="tertiary" size="lg" className="border border-black/10 dark:border-white/12 bg-white/60 dark:bg-white/6 px-8">
                    AlfyCore →
                  </Button>
                </Link>
              </div>

              {/* Trust strip */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                {(['ECDH P-256 + AES-256-GCM', <GeoHostingBadge key="host" />, 'RGPD natif', '100 % open source'] as const).map((b, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="flex size-4 items-center justify-center rounded-full bg-success/15">
                      <CheckIcon size={10} className="text-success" />
                    </span>
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          {/* ── App Mockup ── */}
          <Reveal direction="up" delay={150}>
            <div className="mx-auto mt-20 max-w-3xl">
              {/* Glow derrière le mockup */}
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/3 h-80 w-3/4 rounded-full bg-accent/15 blur-[80px]" />

              <div className={`${glass} p-1.5`}>
                {/* Barre de titre */}
                <div className="flex items-center gap-1.5 rounded-xl border-b border-black/8 dark:border-white/8 bg-black/4 dark:bg-white/4 px-4 py-2.5">
                  <div className="size-2.5 rounded-full bg-red-500/50" />
                  <div className="size-2.5 rounded-full bg-yellow-500/50" />
                  <div className="size-2.5 rounded-full bg-green-500/50" />
                  <div className="ml-3 flex items-center gap-1.5 rounded-lg bg-black/5 dark:bg-white/5 px-3 py-1">
                    <Image src="/logo/Alfychat.svg" alt="" width={11} height={11} className="opacity-50" />
                    <span className="text-[10px] text-muted">alfychat.app</span>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 ring-1 ring-success/20">
                    <span className="size-1.5 rounded-full bg-success" />
                    <span className="text-[9px] font-semibold text-success">E2EE actif</span>
                  </div>
                </div>

                <div className="flex overflow-hidden rounded-xl" style={{ height: 300 }}>
                  {/* Sidebar */}
                  <div className="hidden w-44 shrink-0 border-r border-black/8 dark:border-white/6 bg-black/3 dark:bg-white/3 py-3 sm:block">
                    <div className="mb-2 flex items-center gap-2 px-3">
                      <div className="flex size-6 items-center justify-center rounded-lg bg-accent/20 ring-1 ring-accent/20">
                        <span className="text-[9px] font-bold text-accent">A</span>
                      </div>
                      <span className="text-[10px] font-semibold">AlfyCore</span>
                    </div>
                    <p className="mb-1.5 mt-3 px-3 text-[8px] font-bold uppercase tracking-widest text-muted/60">Salons textuels</p>
                    {[{ n: 'général', active: true }, { n: 'projets', active: false }, { n: 'off-topic', active: false }].map((ch) => (
                      <div key={ch.n} className={`mx-1.5 mb-0.5 flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[10px] transition-colors ${ch.active ? 'bg-accent/12 font-semibold text-accent' : 'text-muted hover:bg-black/4 dark:hover:bg-white/5'}`}>
                        <HashIcon size={9} />
                        {ch.n}
                      </div>
                    ))}
                    <p className="mb-1.5 mt-3 px-3 text-[8px] font-bold uppercase tracking-widest text-muted/60">Vocal</p>
                    <div className="mx-1.5 flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[10px] text-muted">
                      <Volume2Icon size={9} />principal
                    </div>
                  </div>

                  {/* Zone messages */}
                  <div className="flex flex-1 flex-col bg-transparent">
                    <div className="flex items-center gap-2 border-b border-black/6 dark:border-white/6 px-4 py-2">
                      <HashIcon size={11} className="text-muted" />
                      <span className="text-[11px] font-semibold">général</span>
                      <div className="ml-auto flex items-center gap-2">
                        <PhoneIcon size={10} className="text-muted/60" />
                        <VideoIcon size={10} className="text-muted/60" />
                        <UsersIcon size={10} className="text-muted/60" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-3 overflow-hidden p-4">
                      {chat.map((m) => (
                        <div key={m.id} className={`flex items-end gap-2 ${m.own ? 'flex-row-reverse' : ''}`}>
                          <div className={`size-6 shrink-0 rounded-full bg-gradient-to-br ${m.bg} flex items-center justify-center text-[9px] font-bold text-white shadow-sm`}>
                            {m.avatar}
                          </div>
                          <div className={`max-w-52 rounded-2xl px-3 py-1.5 text-[11px] leading-relaxed shadow-sm ${
                            m.own
                              ? 'rounded-br-sm bg-accent text-white'
                              : 'rounded-bl-sm border border-black/8 dark:border-white/8 bg-white/60 dark:bg-white/8'
                          }`}>
                            {m.text}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Input */}
                    <div className="border-t border-black/6 dark:border-white/6 p-3">
                      <div className="flex items-center gap-2 rounded-xl border border-black/8 dark:border-white/10 bg-white/60 dark:bg-white/6 px-3.5 py-2.5">
                        <span className="flex-1 text-[10px] text-muted">Écrire un message chiffré…</span>
                        <div className="flex size-6 items-center justify-center rounded-lg bg-accent shadow-sm shadow-accent/30">
                          <SendIcon size={11} className="text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ligne lumineuse */}
              <div className="mx-auto mt-px h-px w-2/3 bg-[linear-gradient(90deg,transparent,oklch(0.6_0.2_280/30%),transparent)]" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ━━ Stats band ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="border-y border-black/8 dark:border-white/8 bg-white/40 dark:bg-white/3">
        <div className="mx-auto grid max-w-4xl grid-cols-2 divide-x divide-black/8 dark:divide-white/8 md:grid-cols-4">
          {[
            { icon: LockIcon,  value: 'ECDH P-256', label: 'Chiffrement clé' },
            { icon: GlobeIcon, value: 'France 🇫🇷', label: 'Infrastructure' },
            { icon: HeartIcon, value: '100 %',       label: 'Open source' },
            { icon: CheckIcon, value: 'Gratuit',     label: 'Pour toujours' },
          ].map((s) => (
            <Reveal key={s.label} direction="up">
              <div className="flex items-center gap-3 px-6 py-5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-black/8 dark:border-white/10 bg-accent/10">
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
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-accent">
                <StarIcon size={10} />
                Fonctionnalités
              </span>
              <h2 className="mt-4 font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
                Tout ce qu&apos;il faut, rien de trop.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Conçu pour la confidentialité, construit pour la communauté.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} direction="up" delay={i * 70}>
                <div className={`group h-full rounded-2xl border border-black/8 dark:border-white/8 bg-white/60 dark:bg-white/4 p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${f.border} ${f.glow}`}>
                  <div className={`mb-4 inline-flex size-12 items-center justify-center rounded-2xl border border-current/10 bg-current/8 shadow-sm`}>
                    <f.icon size={22} className={f.color} />
                  </div>
                  <h3 className="mb-2 text-[15px] font-semibold">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ How it works ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative overflow-hidden border-y border-black/8 dark:border-white/8 py-28">
        <div className="pointer-events-none absolute inset-0 bg-accent/3" />
        <div className="relative mx-auto max-w-6xl px-6">
          <Reveal direction="up">
            <div className="mx-auto mb-16 max-w-lg text-center">
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-accent">
                Démarrage
              </span>
              <h2 className="mt-4 font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
                Prêt en 2 minutes.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Aucun logiciel à installer. Accessible depuis n&apos;importe quel navigateur.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-4">
            {steps.map((s, i) => (
              <Reveal key={s.n} direction="up" delay={i * 90}>
                <div className="group relative rounded-2xl border border-black/8 dark:border-white/8 bg-white/60 dark:bg-white/4 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                  {/* Connecteur */}
                  {i < steps.length - 1 && (
                    <div className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 md:block">
                      <ArrowRightIcon size={14} className="text-muted/30" />
                    </div>
                  )}
                  <div className="mb-4 flex items-center gap-3">
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${s.glow} ring-1 ring-current/10`}>
                      <s.icon size={18} className={s.color} />
                    </div>
                    <span className="font-(family-name:--font-krona) text-2xl font-bold text-muted/20">{s.n}</span>
                  </div>
                  <h3 className="mb-1.5 text-sm font-semibold">{s.title}</h3>
                  <p className="text-xs leading-relaxed text-muted">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ Security ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="securite" className="relative overflow-hidden py-28">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/8 blur-[130px]" />

        <div className="relative mx-auto max-w-6xl px-6">
          <Reveal direction="up">
            <div className="mx-auto mb-16 max-w-lg text-center">
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-accent">
                Sécurité
              </span>
              <h2 className="mt-4 font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
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
                <div className={`${glass} ring-1 ring-accent/25`}>
                  {/* Glow interne */}
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.6_0.2_280/8%),transparent_65%)]" />

                  <div className="relative p-6">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="size-2 rounded-full bg-accent" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Chiffrement unique</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <h3 className="font-(family-name:--font-krona) text-lg">{lvl.name}</h3>
                          <span className="rounded-lg bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">{lvl.tag}</span>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-[10px] font-bold text-success">
                        Actif par défaut
                      </span>
                    </div>
                    <p className="mb-5 text-sm leading-relaxed text-muted">{lvl.desc}</p>
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {lvl.items.map((item) => (
                        <li key={item} className="flex items-center gap-2 rounded-xl border border-black/6 dark:border-white/8 bg-black/3 dark:bg-white/4 px-3 py-2 text-xs text-muted">
                          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-accent/15">
                            <CheckIcon size={10} className="text-accent" />
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ Tech Stack ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="border-y border-black/8 dark:border-white/8 bg-white/30 dark:bg-white/2 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal direction="up">
            <div className="mx-auto mb-12 max-w-lg text-center">
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-accent">
                Architecture
              </span>
              <h2 className="mt-4 font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
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
                <div className="group flex flex-col items-center gap-3 rounded-2xl border border-black/8 dark:border-white/8 bg-white/60 dark:bg-white/4 px-3 py-5 text-center shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-current/20">
                  <div className={`flex size-11 items-center justify-center rounded-2xl ${t.bg} shadow-sm`}>
                    <t.icon size={20} className={t.color} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold">{t.label}</p>
                    <p className="mt-0.5 text-[9px] text-muted">{t.desc}</p>
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
                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-accent">
                  Open Source & Association
                </span>
                <h2 className="mb-4 mt-4 font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
                  Porté par AlfyCore,<br />pas par des investisseurs.
                </h2>
                <p className="mb-8 text-sm leading-relaxed text-muted">
                  AlfyCore est une association à but non lucratif (loi 1901) fondée en France.
                  Notre mission : construire des outils de communication libres, souverains et respectueux
                  de la vie privée. Aucun actionnaire. Aucune pression commerciale. Juste la communauté.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href="https://alfycore.pro" target="_blank" className="no-underline">
                    <Button variant="tertiary" size="sm" className="gap-2 border border-black/10 dark:border-white/12 bg-white/60 dark:bg-white/6">
                      <GlobeIcon size={14} />
                      alfycore.pro
                    </Button>
                  </Link>
                  <Link href="mailto:contact@alfycore.org" className="no-underline">
                    <Button variant="tertiary" size="sm" className="gap-2 border border-black/10 dark:border-white/12 bg-white/60 dark:bg-white/6">
                      contact@alfycore.org
                    </Button>
                  </Link>
                </div>
              </div>
            </Reveal>

            <Reveal direction="right">
              <div className="grid grid-cols-2 gap-3">
                {openSourceFacts.map((f) => (
                  <div key={f.label} className="rounded-2xl border border-black/8 dark:border-white/8 bg-white/60 dark:bg-white/4 p-5 transition-all duration-200 hover:shadow-md">
                    <div className="mb-3 flex size-9 items-center justify-center rounded-xl border border-accent/15 bg-accent/10">
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

      {/* ━━ Appels de groupe ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative overflow-hidden border-y border-black/8 dark:border-white/8 py-20">
        <div className="pointer-events-none absolute inset-0 bg-emerald-500/3" />
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <Reveal direction="up" delay={0}>
              <div className={`order-2 md:order-1 ${glass}`}>
                <div className="p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/12 ring-1 ring-emerald-500/20">
                      <PhoneIcon size={15} className="text-emerald-400" />
                    </div>
                    <span className="text-[12px] font-semibold">Appel de groupe — 4 participants</span>
                    <div className="ml-auto flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1">
                      <span className="size-1.5 animate-pulse rounded-full bg-success" />
                      <span className="text-[9px] font-semibold text-success">En cours</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { letter: 'A', bg: 'from-blue-500 to-blue-600',    name: 'Alice',    active: true },
                      { letter: 'B', bg: 'from-violet-500 to-violet-600', name: 'Baptiste', active: false },
                      { letter: 'C', bg: 'from-emerald-500 to-teal-600', name: 'Camille',  active: true },
                      { letter: 'V', bg: 'from-violet-500 to-accent',    name: 'Vous',     active: false, own: true },
                    ].map((p) => (
                      <div key={p.name} className={`flex items-center gap-2.5 rounded-xl p-2.5 transition-colors ${p.own ? 'border border-accent/20 bg-accent/8' : 'border border-black/6 dark:border-white/6 bg-black/3 dark:bg-white/4'}`}>
                        <div className={`size-8 shrink-0 rounded-full bg-gradient-to-br ${p.bg} flex items-center justify-center text-[11px] font-bold text-white shadow-sm`}>{p.letter}</div>
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-medium">{p.name}</p>
                          <p className={`text-[9px] ${p.active ? 'text-success' : 'text-muted/60'}`}>{p.active ? '🎙 parle…' : 'muet'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-2.5">
                    {[VideoIcon, MonitorUpIcon].map((Icon, i) => (
                      <div key={i} className="flex size-9 items-center justify-center rounded-full border border-black/8 dark:border-white/8 bg-black/4 dark:bg-white/6">
                        <Icon size={14} className="text-muted" />
                      </div>
                    ))}
                    <div className="flex size-10 items-center justify-center rounded-full border border-danger/20 bg-danger/12 shadow-sm shadow-danger/15">
                      <PhoneIcon size={15} className="text-danger" />
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal direction="right" delay={100}>
              <div className="order-1 md:order-2">
                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
                  Appels HD
                </span>
                <h2 className="mb-4 mt-4 font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
                  Appels de groupe simultanés.
                </h2>
                <p className="mb-6 text-sm leading-relaxed text-muted">
                  Architecture WebRTC mesh P2P — tous les membres d&apos;un groupe sont appelés en même temps,
                  sans serveur de médias centralisé. Chiffrement DTLS-SRTP de bout en bout.
                </p>
                <ul className="space-y-2.5">
                  {[
                    'Appel de groupe en un clic — tout le monde sonne',
                    'WebRTC DTLS-SRTP · zéro serveur de médias',
                    'Partage d\'écran chiffré en temps réel',
                    'Basculement vidéo / voix sans interruption',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-muted">
                      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                        <CheckIcon size={10} className="text-emerald-400" />
                      </span>
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
            <div className={`${glass} ring-1 ring-accent/20`}>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.6_0.2_280/10%),transparent_65%)]" />

              <div className="relative flex flex-col items-center gap-6 px-8 py-12 text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/12 bg-white/60 dark:bg-white/6 px-4 py-2 text-xs text-muted">
                  <UsersIcon size={12} className="text-accent/70" />
                  AlfyCore · Association loi 1901 · alfycore.pro
                </div>

                <div>
                  <h2 className="font-(family-name:--font-krona) text-2xl md:text-3xl">
                    Rejoignez AlfyChat.
                  </h2>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
                    Aucune pub. Aucun pistage. Développé par et pour la communauté — pour toujours gratuit.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  {['100% Open source', 'Hébergé en France', 'RGPD natif', 'Gratuit'].map((t) => (
                    <span key={t} className="flex items-center gap-1.5 rounded-full border border-black/8 dark:border-white/10 bg-white/60 dark:bg-white/6 px-3 py-1 text-[11px] text-muted">
                      <span className="flex size-3.5 items-center justify-center rounded-full bg-success/15">
                        <CheckIcon size={8} className="text-success" />
                      </span>
                      {t}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/register" className="no-underline">
                    <Button size="lg" className="gap-2 px-8 shadow-lg shadow-accent/25">
                      Créer mon compte
                      <ArrowRightIcon size={16} />
                    </Button>
                  </Link>
                  <Link href="/login" className="no-underline">
                    <Button variant="tertiary" size="lg" className="border border-black/10 dark:border-white/12 bg-white/60 dark:bg-white/6 px-8">
                      Se connecter
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ━━ Footer ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="border-t border-black/8 dark:border-white/8 bg-white/30 dark:bg-white/2">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="mb-8 grid gap-8 md:grid-cols-5">
            <div className="md:col-span-2">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-accent/12 ring-1 ring-accent/15">
                  <Image src="/logo/Alfychat.svg" alt="AlfyChat" width={18} height={18} />
                </div>
                <span className="font-(family-name:--font-krona) text-sm">AlfyChat</span>
              </div>
              <p className="mb-4 text-[11px] leading-relaxed text-muted">
                Messagerie sécurisée E2EE, hébergée en France.<br />
                Portée par AlfyCore — association loi 1901.
              </p>
              <div className="flex flex-col gap-1.5 text-[11px] text-muted">
                <span>🌐 alfychat.app</span>
                <Link href="https://alfycore.pro" target="_blank" className="transition-colors hover:text-foreground">🌐 alfycore.pro</Link>
                <Link href="mailto:contact@alfycore.org" className="transition-colors hover:text-foreground">✉️ contact@alfycore.org</Link>
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
                <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted/60">{col.title}</h4>
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
          <Separator className="opacity-40" />
          <div className="flex flex-col items-center justify-between gap-2 pt-6 text-[10px] text-muted md:flex-row">
            <p>© 2026 AlfyChat · AlfyCore · Association loi 1901</p>
            <p className="flex items-center gap-1.5">
              Fait avec <HeartIcon size={10} className="text-danger" /> en France 🇫🇷 · alfychat.app
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
