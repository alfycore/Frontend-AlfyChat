'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldIcon, LockIcon, UsersIcon, ArrowRightIcon, HeartIcon, CheckIcon,
  GlobeIcon, ZapIcon, PhoneIcon, BotIcon, CodeIcon, ServerIcon, DatabaseIcon,
  KeyIcon, MessageCircleIcon, Share2Icon, HashIcon, MicIcon, SendIcon,
  SmileIcon, PlusIcon, SearchIcon, BellIcon, TerminalIcon, BookOpenIcon,
  DownloadIcon,
} from '@/components/icons';
import { SiteNavbar } from '@/components/site-navbar';
import { SiteFooter } from '@/components/site-footer';
import { GeoHostingBadge } from '@/components/landing/geo-tagline';
import { GatewayBeam } from '@/components/landing/gateway-beam';
import { Reveal, Stagger } from '@/components/landing/reveal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { MagicCard } from '@/components/ui/magic-card';
import { Marquee } from '@/components/ui/marquee';
import { BorderBeam } from '@/components/ui/border-beam';
import { WordRotate } from '@/components/ui/word-rotate';
import { Safari } from '@/components/ui/safari';
import { OrbitingCircles } from '@/components/ui/orbiting-circles';
import { BentoCard, BentoGrid } from '@/components/ui/bento-grid';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { DottedMap } from '@/components/ui/dotted-map';
import { RetroGrid } from '@/components/ui/retro-grid';
import { NumberTicker } from '@/components/ui/number-ticker';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';

// ─── Download URLs — update these when releasing new builds ───────────────────
const DL_BASE = 'https://github.com/alfycore/desktop-alfychat/releases/download/dev-build';
const DOWNLOADS = {
  windows:  { url: `${DL_BASE}/AlfyChat.Setup.1.0.1-Beta.exe`,              sha: '9588d0b7a5209ad347f2634b551173f82215839dfc90131cdb5cbc680f8579a7', ext: '.exe' },
  macArm:   { url: `${DL_BASE}/AlfyChat-1.0.1-Beta-arm64.dmg`,              sha: 'e0747f6864a536f04164759be550ac106284446af7ab6180432120e9032cfe71', ext: '.dmg' },
  macIntel: { url: `${DL_BASE}/AlfyChat-1.0.1-Beta.dmg`,                    sha: '03fed29199419d6e5a41b3e12d1e2324aab95ae0d10f2b1f5bc58f5ff39bcc7d', ext: '.dmg' },
  linux:    { url: `${DL_BASE}/AlfyChat-1.0.1-Beta.AppImage`,               sha: '9a0985a27f4daa3ba43d2358cb9e37fe8d10ad1c4747b91b8cfdef007daca332', ext: '.AppImage' },
  deb:      { url: `${DL_BASE}/alfychat-desktop_1.0.1-Beta_amd64.deb`,      sha: '9d784f1292221f492f08154af210d0b77b3fa7ca80dfff4d9226bcc86adcaa79', ext: '.deb' },
  android:  { url: '/alfychat.apk', sha: '', ext: '.apk' },
} as const;

type PlatformKey = keyof typeof DOWNLOADS;
type DetectedOS = 'windows' | 'mac' | 'linux' | 'android' | 'ios' | null;

function detectOS(): DetectedOS {
  if (typeof window === 'undefined') return null;
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Mac/i.test(ua)) return 'mac';
  if (/Linux/i.test(ua)) return 'linux';
  return null;
}

const OS_TO_PLATFORMS: Record<string, PlatformKey[]> = {
  windows: ['windows'],
  mac:     ['macArm', 'macIntel'],
  linux:   ['linux', 'deb'],
  android: ['android'],
};

function WinIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="2" y="2" width="9" height="9" />
      <rect x="13" y="2" width="9" height="9" />
      <rect x="2" y="13" width="9" height="9" />
      <rect x="13" y="13" width="9" height="9" />
    </svg>
  );
}

function MacOSIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function LinuxOSIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C9.2 2 7 4.7 7 8c0 1.4.4 2.7 1 3.8C6.5 13 6 14.4 6 16c0 2.7 1.6 4.8 3 5.6.5.3 1 .4 1.6.4h2.8c.6 0 1.1-.1 1.6-.4 1.4-.8 3-2.9 3-5.6 0-1.6-.5-3-1-4.2.6-1.1 1-2.4 1-3.8C18 4.7 15.8 2 12 2zM9.5 8.5a1 1 0 110 2 1 1 0 010-2zm5 0a1 1 0 110 2 1 1 0 010-2z" />
    </svg>
  );
}

function AndroidOSIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.6 9.48l1.84-3.18a.64.64 0 00-.26-.85.64.64 0 00-.83.22l-1.88 3.24a11.46 11.46 0 00-8.94 0L5.65 5.67a.64.64 0 00-.87-.2.64.64 0 00-.22.83L6.4 9.48A10.78 10.78 0 001 18h22a10.78 10.78 0 00-5.4-8.52zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z" />
    </svg>
  );
}

const PLATFORM_ICON: Record<PlatformKey, React.FC<{ size?: number; className?: string }>> = {
  windows:  WinIcon,
  macArm:   MacOSIcon,
  macIntel: MacOSIcon,
  linux:    LinuxOSIcon,
  deb:      LinuxOSIcon,
  android:  AndroidOSIcon,
};

function DownloadSection({ L }: { L: import('@/i18n').Translations['landing'] }) {
  const [os, setOs] = useState<DetectedOS>(null);

  useEffect(() => { setOs(detectOS()); }, []);

  const dl = L.download;
  const recommendedKeys: PlatformKey[] = os && OS_TO_PLATFORMS[os] ? OS_TO_PLATFORMS[os] : [];
  const otherKeys = (Object.keys(DOWNLOADS) as PlatformKey[]).filter((k) => !recommendedKeys.includes(k));

  const renderCard = (key: PlatformKey, featured = false) => {
    const Icon = PLATFORM_ICON[key];
    const meta = DOWNLOADS[key];
    const info = dl.platforms[key];
    return (
      <a
        key={key}
        href={meta.url}
        download={meta.url !== '#'}
        className={cn(
          'group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5',
          featured && 'border-primary/30 bg-primary/5',
        )}
      >
        {featured && (
          <span className="absolute right-3 top-3 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {dl.recommended}
          </span>
        )}
        <div className={cn(
          'flex size-10 items-center justify-center rounded-xl',
          featured ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
        )}>
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <p className="font-heading text-sm">{info.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{info.desc}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            featured
              ? 'bg-primary text-primary-foreground group-hover:bg-primary/90'
              : 'bg-muted text-foreground group-hover:bg-muted/80',
          )}>
            <DownloadIcon size={11} />{dl.downloadBtn} {meta.ext}
          </span>
        </div>
        {meta.sha && (
          <p className="font-mono text-[9px] text-muted-foreground/50 leading-tight break-all">
            {dl.sha256label}: {meta.sha.slice(0, 32)}…
          </p>
        )}
      </a>
    );
  };

  return (
    <section id="download" className="border-y border-border/60 bg-muted/5">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <Reveal>
          <div className="mb-14 text-center">
            <Badge variant="secondary" className="mb-4">{dl.badge}</Badge>
            <h2 className="font-heading text-3xl tracking-tight md:text-5xl">
              {dl.heading1}{' '}
              <span className="bg-linear-to-r from-primary to-[#9E7AFF] bg-clip-text text-transparent">
                {dl.heading2}
              </span>
            </h2>
            <p className="mx-auto mt-3 max-w-md text-base text-muted-foreground">
              {dl.body}
            </p>
            <Badge variant="outline" className="mt-4 font-mono text-xs text-muted-foreground">
              {dl.version}
            </Badge>
          </div>
        </Reveal>

        {recommendedKeys.length > 0 && (
          <Reveal delay={80}>
            <div className={cn(
              'mb-6 grid gap-4',
              recommendedKeys.length === 1 ? 'md:grid-cols-1 max-w-sm mx-auto' : 'md:grid-cols-2 max-w-2xl mx-auto',
            )}>
              {recommendedKeys.map((k) => renderCard(k, true))}
            </div>
          </Reveal>
        )}

        {os === 'ios' && (
          <Reveal delay={80}>
            <div className="mb-6 flex max-w-sm mx-auto items-center justify-center rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">{dl.iosSoon}</p>
            </div>
          </Reveal>
        )}

        {otherKeys.length > 0 && (
          <Reveal delay={160}>
            {recommendedKeys.length > 0 && (
              <p className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {dl.allPlatforms}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {otherKeys.map((k) => renderCard(k, false))}
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}

const STAT_VALUES = [70, 2, 320, 99.97];
const STAT_DECIMALS = [0, 1, 0, 2];

const MESSAGE_COLORS = [
  'bg-primary/20 text-primary',
  'bg-primary/20 text-primary',
  'bg-warning/20 text-warning',
];
const MESSAGE_INITIALS = ['AL', 'MO', 'RX'];

function ChatMockup() {
  const { t } = useTranslation();
  const m = t.landing.preview.mockup;

  return (
    <div className="flex h-[460px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-surface px-4 py-3">
        <HashIcon size={14} className="text-muted-foreground" />
        <span className="font-heading text-sm">{m.channel}</span>
        <Separator orientation="vertical" className="mx-1 h-4" />
        <Badge variant="outline" className="border-success/30 bg-success/10 text-[10px] text-success">
          <LockIcon size={9} />{m.e2e}
        </Badge>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon-sm"><SearchIcon size={13} /></Button>
          <Button variant="ghost" size="icon-sm"><BellIcon size={13} /></Button>
          <Button variant="ghost" size="icon-sm"><UsersIcon size={13} /></Button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-hidden px-4 py-4">
        {m.messages.map((msg, i) => {
          const self = i === 1;
          return (
            <div key={i} className={cn('flex gap-2.5', self && 'flex-row-reverse')}>
              <Avatar size="sm" className="mt-0.5 shrink-0">
                <AvatarFallback className={cn('text-[10px] font-bold', MESSAGE_COLORS[i])}>
                  {MESSAGE_INITIALS[i]}
                </AvatarFallback>
              </Avatar>
              <div className={cn('flex max-w-[80%] flex-col gap-0.5', self && 'items-end')}>
                <div className="flex items-center gap-1.5">
                  {!self && <span className="text-xs font-semibold">{msg.user}</span>}
                  <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                </div>
                <div className={cn(
                  'rounded-xl px-3 py-1.5 text-sm',
                  self ? 'rounded-tr-sm bg-primary text-primary-foreground' : 'rounded-tl-sm bg-surface-secondary',
                )}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="h-px flex-1 bg-border/50" />
          <span className="whitespace-nowrap text-[10px] text-muted-foreground">{m.joinSystem}</span>
          <div className="h-px flex-1 bg-border/50" />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-border bg-surface px-3 py-2.5">
        <Button variant="ghost" size="icon-sm"><PlusIcon size={14} /></Button>
        <div className="h-8 flex-1 rounded-lg bg-surface-secondary px-3 text-sm leading-8 text-muted-foreground">
          {m.inputPlaceholder}
        </div>
        <Button variant="ghost" size="icon-sm"><SmileIcon size={14} /></Button>
        <Button size="icon-sm"><SendIcon size={12} /></Button>
      </div>
    </div>
  );
}

export function HomeClient() {
  const { t } = useTranslation();
  const L = t.landing;

  const navLinks = [
    { label: L.nav.features,     href: '#features' },
    { label: L.nav.architecture, href: '#architecture' },
    { label: L.nav.security,     href: '#security' },
    { label: L.nav.developers,   href: '/developers' },
  ];

  const stack = [
    { icon: ServerIcon,   label: L.stack.microservices },
    { icon: DatabaseIcon, label: L.stack.storage },
    { icon: ZapIcon,      label: L.stack.realtime },
    { icon: PhoneIcon,    label: L.stack.webrtc },
    { icon: ShieldIcon,   label: L.stack.crypto },
    { icon: CodeIcon,     label: L.stack.oss },
    { icon: ServerIcon,   label: L.stack.node },
    { icon: DatabaseIcon, label: L.stack.typescript },
    { icon: GlobeIcon,    label: L.stack.next },
    { icon: ZapIcon,      label: L.stack.bun },
  ];

  const stats = L.stats.map((s, i) => ({
    value: STAT_VALUES[i],
    decimals: STAT_DECIMALS[i],
    suffix: s.suffix,
    label: s.label,
  }));

  const bento = [
    {
      Icon: ShieldIcon as React.ElementType,
      name: L.features.cards.e2ee.name,
      description: L.features.cards.e2ee.description,
      href: '#security',
      cta: L.features.cards.e2ee.cta,
      className: 'col-span-3 lg:col-span-1',
      background: (
        <div className="absolute inset-0 flex items-center justify-center opacity-15">
          <LockIcon size={160} className="text-primary" />
        </div>
      ),
    },
    {
      Icon: GlobeIcon as React.ElementType,
      name: L.features.cards.global.name,
      description: L.features.cards.global.description,
      href: '/register',
      cta: L.features.cards.global.cta,
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
      name: L.features.cards.gateway.name,
      description: L.features.cards.gateway.description,
      href: '/developers',
      cta: L.features.cards.gateway.cta,
      className: 'col-span-3 lg:col-span-2',
      background: (
        <GatewayBeam className="absolute top-4 right-2 h-[300px] border-none [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] transition-all duration-300 ease-out group-hover:scale-105" />
      ),
    },
    {
      Icon: BotIcon as React.ElementType,
      name: L.features.cards.bots.name,
      description: L.features.cards.bots.description,
      href: '/developers',
      cta: L.features.cards.bots.cta,
      className: 'col-span-3 lg:col-span-1',
      background: (
        <div className="absolute inset-0 flex items-center justify-center opacity-15">
          <BotIcon size={160} className="text-primary" />
        </div>
      ),
    },
  ];

  const securityBullets = [
    { icon: KeyIcon,    ...L.security.bullets.ecdh },
    { icon: LockIcon,   ...L.security.bullets.aes },
    { icon: ShieldIcon, ...L.security.bullets.ephemeral },
    { icon: ServerIcon, ...L.security.bullets.zeroKnowledge },
    { icon: PhoneIcon,  ...L.security.bullets.dtls },
  ];

  const associationFeatures = [
    { icon: CodeIcon,   ...L.association.features.code },
    { icon: ShieldIcon, ...L.association.features.privacy },
    { icon: HeartIcon,  ...L.association.features.nonprofit },
    { icon: ServerIcon, ...L.association.features.selfhost },
  ];

  const selfHostingSteps = [
    L.selfHosting.steps.install,
    L.selfHosting.steps.link,
    L.selfHosting.steps.start,
  ];

  const previewBullets = [
    { icon: MessageCircleIcon, text: L.preview.bullets.dm },
    { icon: HashIcon,          text: L.preview.bullets.server },
    { icon: MicIcon,           text: L.preview.bullets.voice },
    { icon: BotIcon,           text: L.preview.bullets.bots },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground font-(family-name:--font-geist-sans)">

      {/* ── Nav ── */}
      <SiteNavbar links={navLinks} />

      {/* ───────────── HERO ───────────── */}
      <section className="relative overflow-hidden px-6 pb-32 pt-24 md:pt-32">
        
        <div className="pointer-events-none absolute -top-40 left-1/2 size-[700px] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]" />
        <div className="pointer-events-none absolute top-60 right-0 size-[400px] rounded-full bg-primary/10 blur-[120px]" />

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
          <Reveal>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-4 py-1.5 text-sm backdrop-blur-md">
              <span className="size-1.5 animate-pulse rounded-full bg-success" />
              <AnimatedGradientText colorFrom="#7c3aed" colorTo="#9E7AFF" speed={0.6} className="text-xs font-medium">
                {L.hero.badge}
              </AnimatedGradientText>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="font-heading text-5xl leading-[1.05] tracking-tight md:text-7xl">
              {L.hero.titleLine1}<br />
              <span className="bg-linear-to-br from-primary via-[#7c3aed] to-[#9E7AFF] bg-clip-text text-transparent">
                {L.hero.titleLine2}
              </span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <div className="mt-6 flex items-center justify-center gap-2 text-base text-muted-foreground md:text-lg">
              <span>{L.hero.tagline}</span>
              <WordRotate
                words={[...L.hero.rotatingWords]}
                duration={2800}
                className="font-semibold text-foreground"
              />
            </div>
          </Reveal>

          <Reveal delay={220}>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              {L.hero.subtitle}
            </p>
          </Reveal>

          <Reveal delay={300}>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link href="/register">
                <ShimmerButton
                  background="oklch(0.457 0.24 277.023)"
                  borderRadius="14px"
                  className="gap-2 px-8 py-3 text-base font-medium"
                >
                  {L.hero.ctaPrimary}
                  <ArrowRightIcon size={16} />
                </ShimmerButton>
              </Link>
              <Link href="/login">
                <InteractiveHoverButton className="h-12 rounded-2xl border border-border bg-background/60 px-8 text-base backdrop-blur-md">
                  {L.hero.ctaSecondary}
                </InteractiveHoverButton>
              </Link>
            </div>
          </Reveal>

          <Reveal delay={360}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {[L.hero.badges.crypto, <GeoHostingBadge key="g" />, L.hero.badges.gdpr, L.hero.badges.free].map((item, i) => (
                <span key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckIcon size={11} className="text-success" />
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={420} className="relative z-10 mx-auto mt-20 max-w-5xl px-2 md:px-0">
          <div className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 rounded-[40px] bg-primary/10 blur-3xl" />
          <Safari
            url="alfychat.app"
            imageSrc="/screenshots/app-preview.png"
            className="relative w-full drop-shadow-2xl"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-background via-background/80 to-transparent" />
        </Reveal>
      </section>

      {/* ───────────── STATS ───────────── */}
      <section className="border-y border-border/60 bg-muted/10">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden bg-border/40 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-background p-8 text-center md:p-10">
              <p className="font-heading text-4xl tracking-tight text-foreground md:text-4xl">
                <NumberTicker value={s.value} decimalPlaces={s.decimals} />
                <span className="text-primary">{s.suffix}</span>
              </p>
              <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────── STACK MARQUEE ───────────── */}
      <section className="border-b border-border/60 py-8">
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-linear-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-linear-to-l from-background to-transparent" />
          <Marquee pauseOnHover className="[--duration:25s] [--gap:1.5rem]">
            {stack.map((s, i) => (
              <div key={`${s.label}-${i}`} className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-2.5">
                <s.icon size={14} className="shrink-0 text-primary" />
                <span className="whitespace-nowrap text-sm font-medium">{s.label}</span>
              </div>
            ))}
          </Marquee>
        </div>
      </section>

      {/* ───────────── BENTO FEATURES ───────────── */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24 md:py-32">
        <Reveal>
          <div className="mb-14 text-center">
            <Badge variant="secondary" className="mb-4">{L.features.badge}</Badge>
            <h2 className="font-heading text-3xl tracking-tight md:text-5xl">
              {L.features.heading}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-base text-muted-foreground">
              {L.features.subtitle}
            </p>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <BentoGrid>
            {bento.map((f, i) => <BentoCard key={i} {...f} />)}
          </BentoGrid>
        </Reveal>
      </section>

      {/* ───────────── PROMISE BANNER ───────────── */}
      <section className="relative overflow-hidden border-y border-border/60 bg-muted/5">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <DottedMap
            markers={[]}
            dotColor="oklch(0.457 0.24 277.023 / 0.4)"
            markerColor="oklch(0.457 0.24 277.023)"
          />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center md:py-32">
          <Reveal>
            <h3 className="font-heading text-3xl leading-tight tracking-tight md:text-5xl">
              {L.promise.line1}<br />
              {L.promise.line2}{' '}
              <span className="bg-linear-to-r from-primary to-[#9E7AFF] bg-clip-text text-transparent">
                {L.promise.highlight}
              </span>
            </h3>
            <p className="mx-auto mt-6 max-w-lg text-base text-muted-foreground">
              {L.promise.body}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ───────────── ARCHITECTURE ───────────── */}
      <section id="architecture" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="grid items-center gap-16 md:grid-cols-2">
            <Reveal>
              <Badge variant="secondary" className="mb-4">{L.architecture.badge}</Badge>
              <h2 className="font-heading text-3xl tracking-tight md:text-5xl">
                {L.architecture.heading1}<br />{L.architecture.heading2}
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                {L.architecture.body}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/developers/docs">
                  <Button variant="outline" className="gap-2">
                    <BookOpenIcon size={14} />{L.architecture.docsCta}
                  </Button>
                </Link>
                <Link href="/developers">
                  <Button variant="ghost" className="gap-2">
                    <CodeIcon size={14} />{L.architecture.sdkCta}
                  </Button>
                </Link>
              </div>
            </Reveal>
            <Reveal direction="left" delay={120}>
              <div className="relative flex h-[460px] w-full items-center justify-center">
                <div className="pointer-events-none absolute inset-0 rounded-full bg-primary/10 blur-3xl" />
                <OrbitingCircles iconSize={42} radius={170} speed={0.7}>
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-card shadow-md">
                    <ShieldIcon size={20} className="text-primary" />
                  </div>
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-card shadow-md">
                    <ZapIcon size={20} className="text-primary" />
                  </div>
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-card shadow-md">
                    <DatabaseIcon size={20} className="text-primary" />
                  </div>
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-card shadow-md">
                    <PhoneIcon size={20} className="text-primary" />
                  </div>
                </OrbitingCircles>
                <OrbitingCircles iconSize={32} radius={90} reverse speed={1.4}>
                  <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
                    <ServerIcon size={16} className="text-muted-foreground" />
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
                    <CodeIcon size={16} className="text-muted-foreground" />
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
                    <BotIcon size={16} className="text-muted-foreground" />
                  </div>
                </OrbitingCircles>
                <div className="relative z-10 flex size-20 items-center justify-center rounded-3xl bg-linear-to-br from-primary to-[#7c3aed] p-4 shadow-xl shadow-primary/30">
                  <img src="/logo/Alfychat.svg" alt="A" className="size-full" />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───────────── LIVE PREVIEW ───────────── */}
      <section className="border-y border-border/60 bg-muted/10">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="grid items-center gap-16 md:grid-cols-5">
            <Reveal className="md:col-span-2">
              <Badge variant="secondary" className="mb-4">{L.preview.badge}</Badge>
              <h2 className="font-heading text-3xl tracking-tight md:text-5xl">
                {L.preview.heading1}<br />{L.preview.heading2}
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                {L.preview.body}
              </p>
              <div className="mt-8 grid gap-3.5">
                {previewBullets.map(({ icon: I, text }) => (
                  <div key={text} className="flex items-center gap-3 text-sm">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <I size={14} className="text-primary" />
                    </div>
                    <span className="text-foreground/80">{text}</span>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal direction="left" delay={120} className="md:col-span-3">
              <div className="relative">
                <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-primary/10 blur-3xl" />
                <ChatMockup />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───────────── SÉCURITÉ ───────────── */}
      <section id="security" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <Reveal>
            <div className="mb-14 max-w-2xl">
              <Badge variant="secondary" className="mb-4">{L.security.badge}</Badge>
              <h2 className="font-heading text-3xl tracking-tight md:text-5xl">
                {L.security.heading1}{' '}
                <span className="bg-linear-to-r from-primary to-[#9E7AFF] bg-clip-text text-transparent">
                  {L.security.headingMark}
                </span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                {L.security.body}
              </p>
            </div>
          </Reveal>
          <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5" step={70}>
            {securityBullets.map((item) => (
              <MagicCard
                key={item.title}
                className="rounded-2xl border border-border bg-card"
                gradientFrom="#9E7AFF"
                gradientTo="#7c3aed"
                gradientColor="rgba(124,58,237,0.12)"
                gradientOpacity={0.8}
              >
                <div className="p-5">
                  <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <item.icon size={18} className="text-primary" />
                  </div>
                  <p className="font-heading text-sm">{item.title}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </MagicCard>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ───────────── SELF-HOSTING ───────────── */}
      <section className="border-y border-border/60 bg-muted/10">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="grid items-start gap-16 md:grid-cols-2">
            <Reveal>
              <Badge variant="secondary" className="mb-4">{L.selfHosting.badge}</Badge>
              <h2 className="font-heading text-3xl tracking-tight md:text-5xl">
                {L.selfHosting.heading1}<br />{L.selfHosting.heading2}
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                {L.selfHosting.body}
              </p>
              <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-2 border-b border-border bg-surface-secondary/40 px-4 py-2.5">
                  <span className="size-2.5 rounded-full bg-destructive/60" />
                  <span className="size-2.5 rounded-full bg-warning/60" />
                  <span className="size-2.5 rounded-full bg-success/60" />
                  <TerminalIcon size={12} className="ml-2 text-muted-foreground" />
                  <span className="font-mono text-xs text-muted-foreground">{L.selfHosting.terminalLabel}</span>
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-foreground/85">
{`$ npm install -g @alfychat/server-node
$ alfychat-server start \\
    --server-id=YOUR_ID \\
    --token=YOUR_TOKEN

✓ Connected to gateway
✓ Storing messages locally`}
                </pre>
              </div>
            </Reveal>
            <Stagger className="space-y-4" step={100}>
              {selfHostingSteps.map((s) => (
                <div key={s.num} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                  <div className="flex items-start gap-5">
                    <span className="font-heading bg-linear-to-br from-primary to-[#9E7AFF] bg-clip-text text-3xl text-transparent">
                      {s.num}
                    </span>
                    <div>
                      <p className="font-heading text-base">{s.title}</p>
                      <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </Stagger>
          </div>
        </div>
      </section>

      {/* ───────────── DOWNLOAD ───────────── */}
      <DownloadSection L={L} />

      {/* ───────────── ASSOCIATION ───────────── */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="grid items-start gap-16 md:grid-cols-2">
          <Reveal>
            <Badge variant="secondary" className="mb-4">{L.association.badge}</Badge>
            <h2 className="font-heading text-3xl tracking-tight md:text-5xl">
              {L.association.heading1}<br />{L.association.heading2}
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              {L.association.body}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="https://alfycore.pro" target="_blank">
                <Button variant="outline" className="gap-2">
                  <GlobeIcon size={14} />alfycore.pro
                </Button>
              </Link>
              <Link href="mailto:contact@alfycore.org">
                <Button variant="ghost">contact@alfycore.org</Button>
              </Link>
            </div>
          </Reveal>
          <Reveal direction="left" delay={120}>
            <div className="grid grid-cols-2 gap-4">
              {associationFeatures.map((f) => (
                <MagicCard
                  key={f.title}
                  className="rounded-2xl border border-border bg-card"
                  gradientFrom="#9E7AFF"
                  gradientTo="#7c3aed"
                  gradientColor="rgba(109,40,217,0.1)"
                  gradientOpacity={0.8}
                >
                  <div className="p-5">
                    <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10">
                      <f.icon size={16} className="text-primary" />
                    </div>
                    <p className="font-heading text-sm">{f.title}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                </MagicCard>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────── FINAL CTA ───────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24 md:pb-32">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card">
            <BorderBeam colorFrom="#7c3aed" colorTo="#9E7AFF" duration={8} size={160} />
            <InteractiveGridPattern
              className="[mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)] absolute inset-0 size-full"
              squaresClassName="fill-transparent stroke-border/60 hover:fill-primary/15"
              width={40}
              height={40}
              squares={[40, 12]}
            />
            <div className="relative flex flex-col items-center gap-6 px-8 py-20 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs backdrop-blur-md">
                <span className="size-1.5 animate-pulse rounded-full bg-success" />
                {L.finalCta.badge}
              </div>
              <h2 className="font-heading text-3xl tracking-tight md:text-5xl">
                {L.finalCta.heading1}<br />
                <span className="bg-linear-to-r from-primary to-[#9E7AFF] bg-clip-text text-transparent">
                  {L.finalCta.highlight}
                </span>
              </h2>
              <p className="max-w-md text-base text-muted-foreground">
                {L.finalCta.body}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[L.finalCta.badges.oss, L.finalCta.badges.france, L.finalCta.badges.gdpr, L.finalCta.badges.free].map((label) => (
                  <Badge key={label} variant="outline" className="bg-background/60 backdrop-blur">
                    <CheckIcon size={9} className="text-success" />{label}
                  </Badge>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                <Link href="/register">
                  <ShimmerButton
                    background="oklch(0.457 0.24 277.023)"
                    borderRadius="14px"
                    className="gap-2 px-8 py-3 text-base font-medium"
                  >
                    {L.finalCta.primary} <ArrowRightIcon size={16} />
                  </ShimmerButton>
                </Link>
                <Link href="/login">
                  <InteractiveHoverButton className="h-12 rounded-2xl border border-border bg-background/60 px-8 text-base backdrop-blur-md">
                    {L.finalCta.secondary}
                  </InteractiveHoverButton>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ───────────── FOOTER ───────────── */}
      <SiteFooter />
    </div>
  );
}
