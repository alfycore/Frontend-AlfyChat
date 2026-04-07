import Image from 'next/image';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ShieldIcon, LockIcon, UsersIcon,
  ArrowRightIcon, HeartIcon, CheckIcon,
  GlobeIcon, ZapIcon, PhoneIcon, BotIcon, HashIcon,
  Volume2Icon, SendIcon,
} from '@/components/icons';
import { NavAuthButtons } from '@/components/landing/nav-auth-buttons';
import { Avatar, Button, Card, Link, Separator } from '@heroui/react';

/* ── Data ─────────────────────────────────────────────────── */

const chat = [
  { id: 'a', avatar: 'A', bg: 'bg-blue-500',    text: 'Salut tout le monde ! 👋' },
  { id: 'b', avatar: 'B', bg: 'bg-emerald-500',  text: 'Le nouveau design est ouf 🎉' },
  { id: 'c', avatar: 'V', bg: 'bg-accent',       text: 'E2E activé, on est safe 🔒', own: true },
  { id: 'd', avatar: 'A', bg: 'bg-blue-500',     text: 'Hébergé en France 🇫🇷' },
];

const features = [
  { icon: ShieldIcon, title: 'Chiffrement E2E',   desc: 'AES-256 avec clés éphémères. Même nous ne pouvons pas lire vos messages.', color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  { icon: PhoneIcon,  title: 'Appels HD',         desc: 'Voix, vidéo et partage d\'écran — peer-to-peer via WebRTC.',               color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { icon: UsersIcon,  title: 'Serveurs & salons', desc: 'Créez vos communautés avec salons textuels et vocaux.',                    color: 'text-violet-400',  bg: 'bg-violet-500/10' },
  { icon: BotIcon,    title: 'API & Bots',        desc: 'Créez vos propres bots et intégrations via notre API ouverte.',             color: 'text-orange-400',  bg: 'bg-orange-500/10' },
  { icon: ZapIcon,    title: 'Temps réel',        desc: 'WebSocket natif. Frappe, présence, statuts — instantanément.',              color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  { icon: GlobeIcon,  title: 'RGPD natif',        desc: 'Hébergé en France. Export et suppression totale de vos données.',           color: 'text-cyan-400',    bg: 'bg-cyan-500/10' },
];

const levels = [
  { n: 1, name: 'Standard', tag: 'TLS',     desc: 'Chiffrement en transit. Idéal pour le quotidien.',                              color: 'blue' },
  { n: 2, name: 'Amélioré', tag: 'AES-256', desc: 'Chiffrement côté serveur. Messages protégés au repos.',                         color: 'violet' },
  { n: 3, name: 'Maximum',  tag: 'E2EE',    desc: 'Clés éphémères détruites après lecture. Personne ne peut lire — même AlfyCore.', color: 'accent', featured: true },
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
          <div className="flex items-center gap-2">
            <NavAuthButtons />
          </div>
        </div>
      </nav>

      {/* ━━ Hero ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative overflow-hidden">
        {/* Background glows */}
        <div className="pointer-events-none absolute -top-48 left-1/2 h-187.5 w-275 -translate-x-1/2 rounded-full bg-accent/6 blur-[150px]" />
        <div className="pointer-events-none absolute top-24 left-1/4 h-87.5 w-112.5 -translate-x-1/2 rounded-full bg-blue-500/4 blur-[110px]" />
        <div className="pointer-events-none absolute top-24 right-1/4 h-87.5 w-112.5 translate-x-1/2 rounded-full bg-violet-500/4 blur-[110px]" />

        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-28 md:pb-36 md:pt-48">
          <div className="mx-auto max-w-2xl text-center">
            {/* Status badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-separator bg-surface px-4 py-2 text-xs font-medium text-muted shadow-sm">
              <span className="size-1.5 animate-pulse rounded-full bg-success" />
              Open source · Association loi 1901
            </div>

            {/* Headline */}
            <h1 className="mb-6 font-(family-name:--font-krona) text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.1] tracking-tight">
              La messagerie{' '}
              <span className="bg-[linear-gradient(135deg,oklch(0.72_0.19_280),oklch(0.64_0.26_310),oklch(0.59_0.22_250))] bg-clip-text text-transparent">
                sécurisée
              </span>
              ,{' '}
              <span className="text-accent">française.</span>
            </h1>

            <p className="mx-auto mb-10 max-w-md text-base leading-relaxed text-muted">
              Chiffrement de bout en bout, conforme RGPD, hébergée en France.
              Gratuit et open source — pour toujours.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/register">
                <Button size="lg" className="gap-2 px-7">
                  Commencer gratuitement
                  <HugeiconsIcon icon={ArrowRightIcon} size={16} />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="px-7">
                  Se connecter
                </Button>
              </Link>
            </div>

            {/* Trust strip */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-5 text-xs text-muted">
              {['AES-256', '🇫🇷 Hébergé en France', 'RGPD conforme', '100 % open source'].map((b) => (
                <span key={b} className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={CheckIcon} size={12} className="text-success" />
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* ── App Mockup ──────────────────────────────── */}
          <div className="mx-auto mt-16 max-w-3xl md:mt-20">
            <Card variant="secondary" className="overflow-hidden p-1.5 shadow-2xl">
              <div className="overflow-hidden rounded-xl bg-background">
                {/* Title bar */}
                <div className="flex items-center gap-1.5 border-b border-separator px-4 py-2.5">
                  <div className="size-2.5 rounded-full bg-muted/20" />
                  <div className="size-2.5 rounded-full bg-muted/20" />
                  <div className="size-2.5 rounded-full bg-muted/20" />
                  <Image src="/logo/Alfychat.svg" alt="" width={12} height={12} className="ml-3 opacity-40" />
                  <span className="text-[10px] text-muted">AlfyChat</span>
                </div>
                <div className="flex" style={{ height: 288 }}>
                  {/* Sidebar */}
                  <div className="hidden w-36 shrink-0 border-r border-separator bg-surface py-3 sm:block">
                    <p className="mb-2 px-3 text-[8px] font-bold uppercase tracking-widest text-muted">Salons textuels</p>
                    {[
                      { n: 'général',  active: true },
                      { n: 'blabla',   active: false },
                      { n: 'projets',  active: false },
                    ].map((ch) => (
                      <div key={ch.n} className={`mx-1.5 mb-0.5 flex items-center gap-1.5 rounded-lg px-2.5 py-1.25 text-[11px] ${ch.active ? 'bg-accent-soft font-semibold text-accent' : 'text-muted'}`}>
                        <HugeiconsIcon icon={HashIcon} size={11} />
                        {ch.n}
                      </div>
                    ))}
                    <p className="mb-2 mt-3 px-3 text-[8px] font-bold uppercase tracking-widest text-muted">Vocal</p>
                    <div className="mx-1.5 flex items-center gap-1.5 rounded-lg px-2.5 py-1.25 text-[11px] text-muted">
                      <HugeiconsIcon icon={Volume2Icon} size={11} />
                      principal
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex flex-1 flex-col">
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
                        <span className="flex-1 text-[11px] text-muted">Écrire un message…</span>
                        <div className="flex size-6 items-center justify-center rounded-lg bg-accent">
                          <HugeiconsIcon icon={SendIcon} size={12} className="text-accent-foreground" />
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
        </div>
      </section>

      {/* ━━ Stats band ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="border-y border-separator">
        <div className="mx-auto grid max-w-4xl grid-cols-2 divide-x divide-separator md:grid-cols-4">
          {[
            { icon: LockIcon,  value: 'AES-256',    label: 'Chiffrement' },
            { icon: GlobeIcon, value: 'France 🇫🇷', label: 'Hébergement' },
            { icon: HeartIcon, value: '100 %',       label: 'Open source' },
            { icon: CheckIcon, value: 'Gratuit',     label: 'Pour toujours' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 px-6 py-5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                <HugeiconsIcon icon={s.icon} size={16} className="text-accent" />
              </div>
              <div>
                <p className="text-sm font-bold">{s.value}</p>
                <p className="text-[10px] text-muted">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ━━ Features ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-16 max-w-lg text-center">
            <span className="mb-3 inline-block text-[11px] font-semibold uppercase tracking-widest text-accent">
              Fonctionnalités
            </span>
            <h2 className="font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
              Tout ce qu&apos;il faut.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Conçu pour la confidentialité, construit pour la communauté.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} variant="secondary" className="group transition-colors hover:bg-surface-secondary">
                <Card.Header>
                  <div className={`mb-1 inline-flex size-11 items-center justify-center rounded-xl ${f.bg}`}>
                    <HugeiconsIcon icon={f.icon} size={22} className={f.color} />
                  </div>
                  <Card.Title className="text-[15px]">{f.title}</Card.Title>
                </Card.Header>
                <Card.Content>
                  <p className="text-sm leading-relaxed text-muted">{f.desc}</p>
                </Card.Content>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ Security ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative overflow-hidden py-28">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-150 w-200 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/4 blur-[120px]" />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-16 max-w-lg text-center">
            <span className="mb-3 inline-block text-[11px] font-semibold uppercase tracking-widest text-accent">
              Sécurité
            </span>
            <h2 className="font-(family-name:--font-krona) text-2xl tracking-tight md:text-3xl">
              3 niveaux de protection.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Choisissez le niveau adapté à chaque conversation.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {levels.map((lvl) => {
              const isAccent = lvl.color === 'accent';
              const dotClass  = isAccent ? 'bg-accent'    : `bg-${lvl.color}-400`;
              const textClass = isAccent ? 'text-accent'  : `text-${lvl.color}-400`;
              const tagClass  = isAccent
                ? 'bg-accent/15 text-accent'
                : `bg-${lvl.color}-400/10 text-${lvl.color}-400`;
              return (
                <Card
                  key={lvl.n}
                  variant="secondary"
                  className={`relative ${lvl.featured ? 'ring-1 ring-accent/30' : ''}`}
                >
                  {lvl.featured && (
                    <div className="absolute right-4 top-4">
                      <span className="rounded-full bg-accent-soft px-3 py-1 text-[10px] font-bold text-accent">
                        Recommandé
                      </span>
                    </div>
                  )}
                  <Card.Header>
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`size-2 rounded-full ${dotClass}`} />
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${textClass}`}>
                        Niveau {lvl.n}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <Card.Title className="font-(family-name:--font-krona) text-lg">
                        {lvl.name}
                      </Card.Title>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${tagClass}`}>
                        {lvl.tag}
                      </span>
                    </div>
                  </Card.Header>
                  <Card.Content>
                    <p className="text-sm leading-relaxed text-muted">{lvl.desc}</p>
                  </Card.Content>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ━━ CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-28">
        <div className="mx-auto max-w-3xl px-6">
          <Card variant="secondary" className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.6_0.2_280/7%),transparent_65%)]" />
            <Card.Header className="relative flex-col items-center pt-10 text-center">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-separator bg-background px-4 py-2 text-xs text-muted">
                <HugeiconsIcon icon={UsersIcon} size={12} className="text-accent/70" />
                Porté par AlfyCore · Association loi 1901
              </div>
              <Card.Title className="font-(family-name:--font-krona) text-2xl md:text-3xl">
                Rejoignez AlfyChat.
              </Card.Title>
              <Card.Description className="mx-auto max-w-sm text-sm leading-relaxed">
                Aucune pub. Aucun pistage. Développé par et pour la communauté.
              </Card.Description>
            </Card.Header>
            <Card.Content className="relative flex flex-col items-center gap-6 pb-10">
              <div className="flex flex-wrap justify-center gap-2">
                {['Open source', 'Hébergé en France', 'Conforme RGPD', 'Gratuit'].map((t) => (
                  <span key={t} className="flex items-center gap-1.5 rounded-full border border-separator bg-background px-3 py-1 text-[11px] text-muted">
                    <HugeiconsIcon icon={CheckIcon} size={10} className="text-success" />
                    {t}
                  </span>
                ))}
              </div>
              <Link href="/register">
                <Button size="lg" className="gap-2 px-8">
                  Créer mon compte
                  <HugeiconsIcon icon={ArrowRightIcon} size={16} />
                </Button>
              </Link>
            </Card.Content>
          </Card>
        </div>
      </section>

      {/* ━━ Footer ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="border-t border-separator">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="mb-8 grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Image src="/logo/Alfychat.svg" alt="AlfyChat" width={22} height={22} />
                <span className="font-(family-name:--font-krona) text-sm">AlfyChat</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted">
                Messagerie sécurisée par AlfyCore.
              </p>
            </div>
            {[
              { title: 'Produit',  links: [{ label: 'Créer un compte', href: '/register' }, { label: 'Connexion', href: '/login' }] },
              { title: 'Légal',   links: [{ label: 'CGU', href: '/terms' }, { label: 'Confidentialité', href: '/privacy' }] },
              { title: 'Contact', links: [{ label: 'contact@alfycore.org', href: 'mailto:contact@alfycore.org' }] },
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
            <p>© 2026 AlfyChat · AlfyCore</p>
            <p className="flex items-center gap-1">
              Fait avec <HugeiconsIcon icon={HeartIcon} size={10} className="text-danger" /> en France 🇫🇷
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
