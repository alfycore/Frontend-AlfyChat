'use client';

import Link from 'next/link';
import {
  ShieldIcon, LockIcon, ArrowRightIcon, CheckIcon,
  GlobeIcon, ZapIcon, BotIcon, CodeIcon, ServerIcon,
  MessageCircleIcon, HashIcon, MicIcon, KeyIcon, PhoneIcon,
  DownloadIcon, HeartIcon,
} from '@/components/icons';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { SiteNavbar } from '@/components/site-navbar';
import { SiteFooter } from '@/components/site-footer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/landing/reveal';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { WordRotate } from '@/components/ui/word-rotate';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { GeoHostingBadge } from '@/components/landing/geo-tagline';
import { useTranslation } from '@/components/locale-provider';

/* ─── OS Icons ───────────────────────────────────────────────────────────── */
function WinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="2" width="9" height="9" /><rect x="13" y="2" width="9" height="9" />
      <rect x="2" y="13" width="9" height="9" /><rect x="13" y="13" width="9" height="9" />
    </svg>
  );
}
function MacIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}
function LinuxIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C9.2 2 7 4.7 7 8c0 1.4.4 2.7 1 3.8C6.5 13 6 14.4 6 16c0 2.7 1.6 4.8 3 5.6.5.3 1 .4 1.6.4h2.8c.6 0 1.1-.1 1.6-.4 1.4-.8 3-2.9 3-5.6 0-1.6-.5-3-1-4.2.6-1.1 1-2.4 1-3.8C18 4.7 15.8 2 12 2zM9.5 8.5a1 1 0 110 2 1 1 0 010-2zm5 0a1 1 0 110 2 1 1 0 010-2z" />
    </svg>
  );
}

/* ─── Données ────────────────────────────────────────────────────────────── */

const FEATURES = [
  { Icon: ShieldIcon, title: 'Chiffrement E2E',   desc: "ECDH + AES-256-GCM. Chiffré côté client — illisible pour nos serveurs.",            color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
  { Icon: ZapIcon,    title: 'Temps réel',         desc: 'Gateway WebSocket maison. Messages et réactions instantanés sur tous vos appareils.', color: 'text-success', bg: 'bg-success/10 border-success/20' },
  { Icon: ServerIcon, title: 'Auto-hébergement',   desc: "Déployez votre instance en 3 commandes. Zéro dépendance envers nos serveurs.",        color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
  { Icon: BotIcon,    title: 'API & Bots',          desc: "SDK, webhooks et OAuth2 pour intégrer vos services directement dans vos salons.",    color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
  { Icon: GlobeIcon,  title: 'Multi-plateforme',   desc: 'Web, Desktop (Win / Mac / Linux) et Android. Toujours synchronisé.',                  color: 'text-success', bg: 'bg-success/10 border-success/20' },
  { Icon: CodeIcon,   title: 'Open source',         desc: "Code public et auditable. La communauté contribue et vérifie chaque ligne.",          color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
] as const;

const PREVIEW_BULLETS = [
  { Icon: MessageCircleIcon, text: 'Messages directs chiffrés de bout en bout' },
  { Icon: HashIcon,          text: 'Serveurs et salons thématiques organisés'  },
  { Icon: MicIcon,           text: 'Appels vocaux et vidéo sécurisés (DTLS)'  },
  { Icon: BotIcon,           text: 'Bots, intégrations et webhooks sur mesure' },
] as const;

const SECURITY_ITEMS = [
  { Icon: KeyIcon,    label: 'ECDH',              desc: 'Échange de clés sur courbes elliptiques'   },
  { Icon: LockIcon,   label: 'AES-256-GCM',       desc: 'Chiffrement authentifié côté client'       },
  { Icon: ShieldIcon, label: 'Clés éphémères',    desc: 'Rotation automatique à chaque session'     },
  { Icon: ServerIcon, label: 'Zéro connaissance', desc: 'Serveurs : contenu uniquement chiffré'     },
  { Icon: PhoneIcon,  label: 'DTLS 1.3',          desc: 'Voix & vidéo sécurisés via WebRTC'        },
] as const;

const ASSOC_CARDS = [
  { Icon: CodeIcon,   title: 'Open source',       desc: "Code public auditable par n'importe qui." },
  { Icon: ShieldIcon, title: 'Vie privée',         desc: 'Aucune revente, aucun tracking.'          },
  { Icon: HeartIcon,  title: 'Sans but lucratif',  desc: "Porté par une association, pas des actionnaires." },
  { Icon: ServerIcon, title: 'Auto-hébergement',  desc: 'Votre instance, votre contrôle.'          },
] as const;

const DOWNLOADS = [
  { Icon: WinIcon,   label: 'Windows',     sub: 'Windows 10 / 11',   ext: '.exe',      href: 'https://github.com/alfycore/desktop-alfychat/releases/download/dev-build/AlfyChat.Setup.1.0.1-Beta.exe' },
  { Icon: MacIcon,   label: 'macOS ARM',   sub: 'Apple Silicon',      ext: '.dmg',      href: 'https://github.com/alfycore/desktop-alfychat/releases/download/dev-build/AlfyChat-1.0.1-Beta-arm64.dmg' },
  { Icon: MacIcon,   label: 'macOS Intel', sub: 'Intel x86-64',       ext: '.dmg',      href: 'https://github.com/alfycore/desktop-alfychat/releases/download/dev-build/AlfyChat-1.0.1-Beta.dmg' },
  { Icon: LinuxIcon, label: 'Linux',       sub: 'AppImage universel',  ext: '.AppImage', href: 'https://github.com/alfycore/desktop-alfychat/releases/download/dev-build/AlfyChat-1.0.1-Beta.AppImage' },
] as const;

const STATS = [
  { n: '70+',    label: 'Serveurs actifs'  },
  { n: '2 000+', label: 'Utilisateurs'     },
  { n: '320 k+', label: 'Messages / jour'  },
  { n: '99,9 %', label: 'Disponibilité'    },
] as const;

const TRUST = ['Chiffrement E2E', 'Hébergé en France', 'RGPD', 'Gratuit'] as const;

/* ─── Petites primitives ─────────────────────────────────────────────────── */

/** Image avec fondu bas (et optionnel haut). Hauteur TOUJOURS fixe en px. */
function Img({ src, h, top = false, className }: { src: string; h: string; top?: boolean; className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl', className)}>
      <img src={src} alt="" className={cn('w-full object-cover object-center', h)} />
      {top  && <div className="pointer-events-none absolute inset-x-0 top-0    h-24 bg-linear-to-b from-background/60 to-transparent" />}
      <div   className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-background/75 to-transparent" />
    </div>
  );
}

function Rule() {
  return <div className="h-px bg-border/60" />;
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{children}</p>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */
export function HomeClient() {
  const { t } = useTranslation();
  const L = t.landing;
  return (
    <div className="bg-background text-foreground">
      <SiteNavbar />

      {/* ╔══════════════════════════════════════════════════════════════════╗
          ║  HERO  —  grid 2 colonnes identique à la page login             ║
          ╚══════════════════════════════════════════════════════════════════╝ */}
      <section className="grid min-h-[calc(100svh-65px)] lg:grid-cols-2">

        {/* Colonne gauche */}
        <div className="flex flex-col justify-center px-5 py-14 sm:px-8 sm:py-16 md:px-10 lg:px-14 lg:py-20">

          <Reveal>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs backdrop-blur-md sm:mb-8 sm:px-4 sm:text-sm">
              <span className="size-1.5 animate-pulse rounded-full bg-success" />
              <AnimatedGradientText colorFrom="#7c3aed" colorTo="#9E7AFF" speed={0.6} className="text-xs font-medium">
                {L.hero.badge}
              </AnimatedGradientText>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="font-heading text-4xl leading-[1.05] tracking-tight sm:text-5xl md:text-6xl xl:text-7xl">
              {L.hero.titleLine1}<br />
              <span className="bg-linear-to-br from-primary via-[#7c3aed] to-[#9E7AFF] bg-clip-text text-transparent">
                {L.hero.titleLine2}
              </span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground sm:mt-6 sm:text-base md:text-lg">
              <span>{L.hero.tagline}</span>
              <WordRotate
                words={[...L.hero.rotatingWords]}
                duration={2800}
                className="font-semibold text-foreground"
              />
            </div>
          </Reveal>

          <Reveal delay={220}>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-muted-foreground sm:mt-6 sm:text-base">
              {L.hero.subtitle}
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className="mt-8 flex flex-wrap gap-2.5 sm:mt-10 sm:gap-3">
              <Link href="/register">
                <ShimmerButton
                  background="oklch(0.457 0.24 277.023)"
                  borderRadius="14px"
                  className="gap-2 px-6 py-2.5 text-sm font-medium sm:px-8 sm:py-3 sm:text-base"
                >
                  {L.hero.ctaPrimary}
                  <ArrowRightIcon size={15} />
                </ShimmerButton>
              </Link>
              <Link href="/login">
                <InteractiveHoverButton className="h-10 rounded-2xl border border-border bg-background/60 px-6 text-sm backdrop-blur-md sm:h-12 sm:px-8 sm:text-base">
                  {L.hero.ctaSecondary}
                </InteractiveHoverButton>
              </Link>
            </div>
          </Reveal>

          <Reveal delay={360}>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 sm:mt-8 sm:gap-x-6">
              {[L.hero.badges.crypto, <GeoHostingBadge key="g" />, L.hero.badges.gdpr, L.hero.badges.free].map((item, i) => (
                <span key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground sm:text-xs">
                  <CheckIcon size={10} className="text-success" />
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
        </div>


        {/* Colonne droite — identique au login (p-4, rounded-2xl) */}
        <div className="hidden bg-background p-4 lg:block">
          <MotionFade direction="left" distance={14} duration={0.5} delay={0.12}
            className="relative h-full overflow-hidden rounded-2xl">
            <img
              src="/backgrounds/defaut.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            {/* fondus */}
            <div className="pointer-events-none absolute inset-x-0 top-0    h-32 bg-linear-to-b from-background/55 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-background/85 to-transparent" />

            {/* Badges flottants — même style que login */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-2.5">
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/80 px-4 py-3 backdrop-blur-md">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                  <LockIcon size={14} className="text-primary" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-foreground">Chiffrement actif</p>
                  <p className="text-[11px] text-muted-foreground">AES-256-GCM · ECDH</p>
                </div>
                <span className="ml-auto size-2 animate-pulse rounded-full bg-success" />
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/80 px-4 py-3 backdrop-blur-md">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-success/20 bg-success/10">
                  <ShieldIcon size={14} className="text-success" />
                </div>
                <p className="text-[12px] font-medium text-foreground">
                  Vos données vous appartiennent
                </p>
              </div>
            </div>
          </MotionFade>
        </div>
      </section>

      <Rule />

      {/* ╔══════════════════════════════════════════════════════════════════╗
          ║  STATS                                                          ║
          ╚══════════════════════════════════════════════════════════════════╝ */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <MotionStagger
          className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4"
        >
          {STATS.map(({ n, label }) => (
            <MotionStaggerItem key={label}>
              <div className="flex flex-col items-center gap-1 bg-background px-4 py-9 text-center">
                <span className="font-(family-name:--font-krona) text-3xl font-bold text-foreground">{n}</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
              </div>
            </MotionStaggerItem>
          ))}
        </MotionStagger>
      </section>

      <Rule />

      {/* ╔══════════════════════════════════════════════════════════════════╗
          ║  FONCTIONNALITÉS  —  1 col mob · 2 col sm · 3 col lg           ║
          ╚══════════════════════════════════════════════════════════════════╝ */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
        <MotionFade className="mb-10">
          <Label>Fonctionnalités</Label>
          <h2 className="font-(family-name:--font-krona) mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            Tout ce dont vous avez besoin,<br className="hidden sm:block" /> rien de superflu
          </h2>
        </MotionFade>

        <MotionStagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ Icon, title, desc, color, bg }) => (
            <MotionStaggerItem key={title}>
              <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
                <div className={cn('flex size-10 items-center justify-center rounded-xl border', bg)}>
                  <Icon size={18} className={color} />
                </div>
                <div>
                  <p className="font-(family-name:--font-krona) text-[13px] font-semibold">{title}</p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              </div>
            </MotionStaggerItem>
          ))}
        </MotionStagger>
      </section>

      <Rule />

      {/* ╔══════════════════════════════════════════════════════════════════╗
          ║  APERÇU  —  texte gauche · image droite h-[380px] fixe         ║
          ╚══════════════════════════════════════════════════════════════════╝ */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 md:grid-cols-2">

          <MotionFade>
            <Label>Aperçu</Label>
            <h2 className="font-(family-name:--font-krona) mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              Conçu pour la<br />vraie productivité
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              Une interface qui disparaît derrière vos échanges. Pas de distraction, pas de publicité.
            </p>
            <ul className="mt-7 flex flex-col gap-3">
              {PREVIEW_BULLETS.map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                    <Icon size={13} className="text-primary" />
                  </div>
                  <span className="text-[13px] text-foreground/80">{text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7">
              <Link href="/register">
                <Button className="gap-2 px-6">Essayer maintenant <ArrowRightIcon size={13} /></Button>
              </Link>
            </div>
          </MotionFade>

          <MotionFade direction="left" delay={0.1}>
            <div className="relative">
              <Img src="/backgrounds/defaut.jpg" h="h-[380px]" top />
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-3 py-2 backdrop-blur-md">
                <span className="size-1.5 animate-pulse rounded-full bg-success" />
                <span className="text-[11px] font-medium text-muted-foreground">Chiffré · En ligne</span>
              </div>
            </div>
          </MotionFade>

        </div>
      </section>

      <Rule />

      {/* ╔══════════════════════════════════════════════════════════════════╗
          ║  SÉCURITÉ  —  image gauche · liste droite                       ║
          ╚══════════════════════════════════════════════════════════════════╝ */}
      <section id="security" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
        <div className="grid items-start gap-12 md:grid-cols-2">

          <MotionFade>
            <Label>Sécurité</Label>
            <h2 className="font-(family-name:--font-krona) mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              Sécurité sans<br />
              <span className="bg-linear-to-r from-primary to-[#9E7AFF] bg-clip-text text-transparent">
                compromis
              </span>
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              Chaque couche est conçue pour garantir votre confidentialité, même si le serveur est compromis.
            </p>
            <div className="mt-6">
              <Img src="/backgrounds/defaut.jpg" h="h-[190px]" top />
            </div>
          </MotionFade>

          <MotionStagger className="flex flex-col gap-2.5 md:pt-14">
            {SECURITY_ITEMS.map(({ Icon, label, desc }) => (
              <MotionStaggerItem key={label}>
                <div className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                    <Icon size={15} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-(family-name:--font-krona) text-[12px] font-semibold">{label}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{desc}</p>
                  </div>
                  <CheckIcon size={13} className="shrink-0 text-success" />
                </div>
              </MotionStaggerItem>
            ))}
            <MotionStaggerItem>
              <Link href="/register" className="block pt-1">
                <Button size="lg" className="w-full gap-2">
                  Commencer gratuitement <ArrowRightIcon size={14} />
                </Button>
              </Link>
            </MotionStaggerItem>
          </MotionStagger>

        </div>
      </section>

      <Rule />

      {/* ╔══════════════════════════════════════════════════════════════════╗
          ║  ASSOCIATION  —  texte gauche · 2×2 cartes droite               ║
          ╚══════════════════════════════════════════════════════════════════╝ */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-start gap-12 md:grid-cols-2">

          <MotionFade>
            <Label>Association</Label>
            <h2 className="font-(family-name:--font-krona) mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              Porté par une<br />communauté engagée
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              AlfyChat est développé par AlfyCore, une association à but non lucratif. Notre mission : offrir une alternative libre, éthique et souveraine.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link href="https://alfycore.pro" target="_blank">
                <Button variant="outline" size="sm" className="gap-2">
                  <GlobeIcon size={13} />alfycore.pro
                </Button>
              </Link>
              <Link href="mailto:contact@alfycore.org">
                <Button variant="ghost" size="sm">contact@alfycore.org</Button>
              </Link>
            </div>
          </MotionFade>

          <MotionStagger className="grid grid-cols-2 gap-3">
            {ASSOC_CARDS.map(({ Icon, title, desc }) => (
              <MotionStaggerItem key={title}>
                <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
                  <div className="flex size-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                    <Icon size={15} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-(family-name:--font-krona) text-[12px] font-semibold">{title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{desc}</p>
                  </div>
                </div>
              </MotionStaggerItem>
            ))}
          </MotionStagger>

        </div>
      </section>

      <Rule />

      {/* ╔══════════════════════════════════════════════════════════════════╗
          ║  TÉLÉCHARGEMENT  —  2 col mob · 4 col desktop                   ║
          ╚══════════════════════════════════════════════════════════════════╝ */}
      <section id="download" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
        <MotionFade className="mb-10">
          <Label>Téléchargement</Label>
          <h2 className="font-(family-name:--font-krona) mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            Disponible partout
          </h2>
          <p className="mt-1.5 text-[12px] text-muted-foreground/50">Version 1.0.1-Beta</p>
        </MotionFade>

        <MotionStagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {DOWNLOADS.map(({ Icon, label, sub, ext, href }) => (
            <MotionStaggerItem key={label}>
              <a
                href={href}
                download
                className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-all group-hover:border-primary/20 group-hover:bg-primary/10 group-hover:text-primary">
                  <Icon size={17} />
                </div>
                <div>
                  <p className="font-(family-name:--font-krona) text-[12px] font-semibold">{label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
                </div>
                <div className="mt-auto flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors group-hover:text-primary">
                  <DownloadIcon size={11} />{ext}
                </div>
              </a>
            </MotionStaggerItem>
          ))}
        </MotionStagger>

        {/* Bannière image desktop — h fixe, fondu propre */}
        <MotionFade delay={0.15} className="mt-4 hidden md:block">
          <div className="relative overflow-hidden rounded-2xl">
            <img src="/backgrounds/defaut.jpg" alt="" className="h-[180px] w-full object-cover object-center" />
            <div className="pointer-events-none absolute inset-x-0 top-0    h-16 bg-linear-to-b from-background/60 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-background/85 to-transparent" />
            <div className="absolute bottom-5 left-6">
              <p className="font-(family-name:--font-krona) text-sm font-bold">AlfyChat Desktop</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">{"L'expérience complète sur votre ordinateur"}</p>
            </div>
          </div>
        </MotionFade>
      </section>

      <Rule />

      {/* ╔══════════════════════════════════════════════════════════════════╗
          ║  CTA FINAL  —  image opacité 8 % en fond, texte centré          ║
          ╚══════════════════════════════════════════════════════════════════╝ */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <MotionFade>
          <div className="relative overflow-hidden rounded-2xl border border-border">
            <img
              src="/backgrounds/defaut.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center opacity-[0.07]"
            />
            <div className="pointer-events-none absolute inset-0 bg-background/55" />

            <div className="relative flex flex-col items-center gap-6 px-6 py-20 text-center md:px-12">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 backdrop-blur-md">
                <span className="size-1.5 animate-pulse rounded-full bg-success" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Rejoignez la communauté
                </span>
              </span>

              <div>
                <h2 className="font-(family-name:--font-krona) text-2xl font-bold tracking-tight md:text-4xl">
                  Prenez le contrôle<br />
                  <span className="bg-linear-to-r from-primary to-[#9E7AFF] bg-clip-text text-transparent">
                    de vos conversations
                  </span>
                </h2>
                <p className="mx-auto mt-4 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                  Compte créé en 30 secondes. Aucune carte bancaire, aucune pub, jamais.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {TRUST.map((t) => (
                  <span key={t} className="flex items-center gap-1.5 rounded-full border border-border/50 bg-background/60 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-md">
                    <CheckIcon size={9} className="text-success" />{t}
                  </span>
                ))}
              </div>

              <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
                <Link href="/register" className="block">
                  <Button size="lg" className="w-full gap-2 px-8 sm:w-auto">
                    Créer un compte <ArrowRightIcon size={14} />
                  </Button>
                </Link>
                <Link href="/login" className="block">
                  <Button size="lg" variant="outline" className="w-full px-8 sm:w-auto">
                    Se connecter
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </MotionFade>
      </section>

      <SiteFooter />
    </div>
  );
}