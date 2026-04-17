'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  MessageCircleIcon, SendIcon, SmileIcon, ShieldIcon, LockIcon, UserIcon,
  UserPlusIcon, UsersIcon, SearchIcon, BellIcon, SettingsIcon, HashIcon,
  MicIcon, HeadphonesIcon, PlusIcon, Trash2Icon, PencilIcon, CheckIcon,
  GlobeIcon, ZapIcon, StarIcon, ServerIcon, HomeIcon, ChevronRightIcon, XIcon,
  PhoneIcon, PhoneOffIcon, VideoIcon, MicOffIcon, HeadphoneOffIcon, Volume2Icon,
  PaperclipIcon, ReplyIcon, PinIcon, MoreHorizontalIcon, ClockIcon,
  ForumIcon, GalleryIcon, MegaphoneIcon,
} from '@/components/icons';
import { cn } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────

type PreviewId = 'chat' | 'layout' | null;

// ─── Helpers ───────────────────────────────────────────────────────────────

function Section({
  id, title, number, description, children, previewId, onPreview,
}: {
  id?: string;
  title: string;
  number?: string;
  description?: string;
  previewId?: 'chat' | 'layout';
  onPreview?: (id: 'chat' | 'layout') => void;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="group/section space-y-5 scroll-mt-20">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-baseline gap-3">
          {number && (
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
              {number}
            </span>
          )}
          <div className="space-y-1">
            <h2 className="font-heading text-2xl tracking-tight text-foreground">{title}</h2>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {previewId && onPreview && (
          <button
            onClick={() => onPreview(previewId)}
            className="flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground opacity-0 transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary group-hover/section:opacity-100"
          >
            <i className="fi fi-br-expand" style={{ fontSize: 10 }} />
            Plein écran
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function ColorSwatch({ label, cssVar }: { label: string; cssVar: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(cssVar);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="group/swatch flex flex-col gap-1.5 text-left transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
      aria-label={`Copier ${cssVar}`}
    >
      <div
        className="relative h-16 w-full overflow-hidden rounded-xl border border-border ring-1 ring-inset ring-foreground/5 transition-shadow group-hover/swatch:shadow-lg group-hover/swatch:ring-primary/30"
        style={{ background: `var(${cssVar})` }}
      >
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center rounded-xl bg-background/85 text-[10px] font-semibold text-primary backdrop-blur-sm transition-opacity',
            copied ? 'opacity-100' : 'opacity-0',
          )}
        >
          <CheckIcon size={12} className="mr-1" />Copié
        </span>
      </div>
      <p className="text-xs font-medium text-foreground">{label}</p>
      <p className="font-mono text-[10px] text-muted-foreground transition-colors group-hover/swatch:text-primary">{cssVar}</p>
    </button>
  );
}

function FontCard({
  variable, family, google, tag, children,
}: {
  variable: string; family: string; google: string; tag?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono text-[10px]">{variable}</Badge>
        {tag && (
          <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]" variant="outline">
            {tag}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">{family}</span>
      </div>
      <div className="border-b border-border pb-4">{children}</div>
      <div className="space-y-0.5">
        <p className="font-mono text-[10px] text-muted-foreground">font-family-name: {variable}</p>
        <p className="font-mono text-[10px] text-muted-foreground">Google Fonts: {google}</p>
      </div>
    </div>
  );
}

// ─── Mock data ──────────────────────────────────────────────────────────────

const mockMsgs = [
  { id: 1, user: 'Alice', initials: 'AL', content: "Salut ! T'as vu la nouvelle fonctionnalité ? 🎉", time: '10:24', self: false },
  { id: 2, user: 'Moi', initials: 'MO', content: 'Oui ! Le chiffrement de bout en bout est vraiment top.', time: '10:25', self: true },
  { id: 3, user: 'Alice', initials: 'AL', content: "Et la qualité d'appel est incroyable 🔥", time: '10:26', self: false },
  { id: 4, user: 'Moi', initials: 'MO', content: "J'envoie le lien là 🔗", time: '10:27', self: true },
];

// ─── Chat preview ──────────────────────────────────────────────────────────

function ChatPreview({ fullscreen = false }: { fullscreen?: boolean }) {
  const [msg, setMsg] = useState('');
  const [msgs, setMsgs] = useState(mockMsgs);

  const send = () => {
    if (!msg.trim()) return;
    setMsgs(prev => [
      ...prev,
      {
        id: Date.now(), user: 'Moi', initials: 'MO', content: msg,
        time: new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' }),
        self: true,
      },
    ]);
    setMsg('');
  };

  return (
    <div className={cn('flex flex-col rounded-xl border border-border overflow-hidden bg-background', fullscreen && 'h-full')}>
      {/* Channel header */}
      <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2 shrink-0">
        <HashIcon size={16} className="text-muted-foreground" />
        <span className="font-heading text-sm">général</span>
        <Separator orientation="vertical" className="mx-1 h-4" />
        <span className="text-xs text-muted-foreground">Bienvenue sur AlfyZone !</span>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon-sm"><SearchIcon size={14} /></Button>
          <Button variant="ghost" size="icon-sm"><BellIcon size={14} /></Button>
          <Button variant="ghost" size="icon-sm"><UsersIcon size={14} /></Button>
        </div>
      </div>
      {/* Messages */}
      <div className={cn('flex-1 space-y-3 overflow-y-auto px-4 py-4', fullscreen ? 'min-h-0' : 'max-h-56')}>
        {msgs.map((m) => (
          <div key={m.id} className={cn('flex gap-2.5', m.self && 'flex-row-reverse')}>
            <Avatar size="sm">
              <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">{m.initials}</AvatarFallback>
            </Avatar>
            <div className={cn('flex flex-col gap-0.5', m.self && 'items-end')}>
              <div className="flex items-center gap-1.5">
                {!m.self && <span className="text-xs font-semibold">{m.user}</span>}
                <span className="text-[10px] text-muted-foreground">{m.time}</span>
              </div>
              <div className={cn(
                'rounded-xl px-3 py-1.5 text-sm max-w-xs',
                m.self ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-surface-secondary rounded-tl-sm',
              )}>
                {m.content}
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Input */}
      <div className="flex items-center gap-2 border-t border-border bg-surface px-3 py-2.5 shrink-0">
        <Button variant="ghost" size="icon-sm"><PlusIcon size={14} /></Button>
        <input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Message #général (Entrée pour envoyer)"
          className="h-8 flex-1 rounded-lg bg-surface-secondary px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/50"
        />
        <Button variant="ghost" size="icon-sm"><SmileIcon size={14} /></Button>
        <Button size="icon-sm" onClick={send} disabled={!msg.trim()}><SendIcon size={12} /></Button>
      </div>
    </div>
  );
}

// ─── Full app layout preview ────────────────────────────────────────────────

function AppLayoutPreview({ fullscreen = false }: { fullscreen?: boolean }) {
  return (
    <div className={cn('flex rounded-xl border border-border overflow-hidden bg-background', fullscreen ? 'h-full' : 'h-72')}>
      {/* Server sidebar */}
      <div className="flex w-14 shrink-0 flex-col items-center gap-2 bg-sidebar py-3">
        <button className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <HomeIcon size={16} />
        </button>
        <Separator className="w-6" />
        {['AZ', 'F1', 'GC'].map(s => (
          <button
            key={s}
            className="flex size-9 items-center justify-center rounded-2xl bg-surface-secondary text-[10px] font-bold hover:rounded-full hover:bg-primary hover:text-primary-foreground transition-all"
          >
            {s}
          </button>
        ))}
        <button className="flex size-9 items-center justify-center rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-success hover:text-success transition-colors">
          <PlusIcon size={12} />
        </button>
      </div>
      {/* Channel list */}
      <div className="flex w-44 shrink-0 flex-col border-x border-border bg-sidebar">
        <div className="flex items-center justify-between px-3 py-2.5 font-heading text-sm">
          AlfyZone <ChevronRightIcon size={12} className="text-muted-foreground" />
        </div>
        <Separator />
        <div className="flex-1 overflow-hidden px-2 py-1 text-sm">
          <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Texte</p>
          {['général', 'aide', 'annonces'].map((ch, i) => (
            <div key={ch} className={cn('flex items-center gap-1 rounded-md px-2 py-1 text-xs', i === 0 ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground')}>
              <HashIcon size={11} />{ch}
              {i === 2 && <Badge className="ml-auto" variant="destructive" style={{ fontSize: 9, padding: '0 4px', height: 14 }}>3</Badge>}
            </div>
          ))}
          <p className="mt-1 px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Vocal</p>
          {['Général', 'Gaming'].map(ch => (
            <div key={ch} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground">
              <MicIcon size={11} />{ch}
            </div>
          ))}
        </div>
        {/* User panel */}
        <div className="flex items-center gap-1.5 border-t border-border bg-background/60 px-2 py-2 shrink-0">
          <div className="relative">
            <Avatar size="sm"><AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">JD</AvatarFallback></Avatar>
            <span className="absolute bottom-0 right-0 block size-2 rounded-full border-2 border-card bg-success" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-semibold">JohnDoe</p>
            <p className="truncate text-[9px] text-muted-foreground">En ligne</p>
          </div>
          <Button variant="ghost" size="icon-sm" className="size-5"><SettingsIcon size={10} /></Button>
        </div>
      </div>
      {/* Chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-2 shrink-0">
          <HashIcon size={14} className="text-muted-foreground" />
          <span className="font-heading text-xs">général</span>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" className="size-6"><SearchIcon size={11} /></Button>
            <Button variant="ghost" size="icon-sm" className="size-6"><UsersIcon size={11} /></Button>
          </div>
        </div>
        <div className="flex-1 space-y-2 overflow-hidden px-3 py-3 min-h-0">
          {mockMsgs.slice(0, 3).map(m => (
            <div key={m.id} className={cn('flex gap-1.5', m.self && 'flex-row-reverse')}>
              <Avatar size="sm" className="size-5 shrink-0">
                <AvatarFallback className="bg-primary/20 text-primary text-[8px] font-bold">{m.initials}</AvatarFallback>
              </Avatar>
              <div className={cn('rounded-lg px-2 py-1 text-[10px] max-w-37.5', m.self ? 'bg-primary text-primary-foreground' : 'bg-surface-secondary')}>
                {m.content.slice(0, 35)}{m.content.length > 35 ? '…' : ''}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 border-t border-border bg-surface px-2 py-1.5 shrink-0">
          <div className="flex-1 rounded-md bg-surface-secondary px-2 py-1 text-[10px] text-muted-foreground">Message #général…</div>
          <Button size="icon-sm" className="size-6"><SendIcon size={10} /></Button>
        </div>
      </div>
      {/* Member list */}
      <div className="hidden w-36 shrink-0 flex-col border-l border-border bg-sidebar px-2 py-2 lg:flex">
        <p className="px-1 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">En ligne — 3</p>
        {[
          { i: 'JD', n: 'JohnDoe', c: 'bg-success' },
          { i: 'AL', n: 'Alice', c: 'bg-success' },
          { i: 'RX', n: 'Rex42', c: 'bg-warning' },
        ].map(u => (
          <div key={u.n} className="flex items-center gap-1.5 rounded-md px-1 py-1 hover:bg-muted/30">
            <div className="relative shrink-0">
              <Avatar size="sm" className="size-6">
                <AvatarFallback className="bg-primary/20 text-primary text-[8px] font-bold">{u.i}</AvatarFallback>
              </Avatar>
              <span className={cn('absolute bottom-0 right-0 block size-1.5 rounded-full border border-card', u.c)} />
            </div>
            <span className="truncate text-[10px]">{u.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Scroll progress bar ────────────────────────────────────────────────────

function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      setProgress(total > 0 ? (h.scrollTop / total) * 100 : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);
  return (
    <div className="absolute inset-x-0 bottom-0 h-px bg-border/40">
      <div
        className="h-full bg-linear-to-r from-primary via-[#7c3aed] to-[#9E7AFF] transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────

const HERO_STATS = [
  { value: '06', label: 'Sections' },
  { value: '40+', label: 'Composants' },
  { value: '12', label: 'Couleurs clés' },
  { value: 'v2.0', label: 'Guidelines' },
];

function BrandHero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-card">
      {/* Halos */}
      <div className="pointer-events-none absolute -top-32 left-1/2 size-[500px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-24 right-0 size-[320px] rounded-full bg-primary/10 blur-[100px]" />
      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        style={{
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative px-8 py-14 md:px-12 md:py-20">
        <div className="flex flex-col items-start gap-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] backdrop-blur">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            <span className="font-mono tracking-wider text-muted-foreground">BRAND&nbsp;·&nbsp;GUIDELINES&nbsp;·&nbsp;v2.0</span>
          </div>

          <h1 className="font-heading text-4xl leading-[1.05] tracking-tight md:text-6xl">
            Le langage visuel<br />
            <span className="bg-linear-to-br from-primary via-[#7c3aed] to-[#9E7AFF] bg-clip-text text-transparent">
              d&apos;AlfyChat.
            </span>
          </h1>

          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Le système de design complet : logo, typographies, palette de couleurs, composants et
            aperçus d&apos;interface. Une référence unique pour garder une marque cohérente, partout.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { href: '#logo',         label: 'Logo' },
              { href: '#typographie',  label: 'Typographie' },
              { href: '#couleurs',     label: 'Couleurs' },
              { href: '#composants',   label: 'Composants' },
              { href: '#chat',         label: 'Chat' },
              { href: '#contextes',    label: 'Contextes' },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-lg border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-md transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border/50 sm:grid-cols-4">
          {HERO_STATS.map((s) => (
            <div key={s.label} className="bg-card/80 px-5 py-4 text-center backdrop-blur">
              <p className="font-heading text-2xl tracking-tight text-foreground">{s.value}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Fullscreen overlay ─────────────────────────────────────────────────────

function FullscreenOverlay({ id, onClose }: { id: PreviewId; onClose: () => void }) {
  if (!id) return null;
  const labels: Record<NonNullable<PreviewId>, string> = {
    chat: 'Barre de message — Chat',
    layout: 'Interface complète — Layout',
  };
  return (
    <div className="fixed inset-0 z-200 flex flex-col bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Image src="/logo/Alfychatlogotitleupblack.svg" alt="AlfyChat" width={100} height={24} className="dark:hidden" />
          <Image src="/logo/Alfychatlogotitleupwihte.svg" alt="AlfyChat" width={100} height={24} className="hidden dark:block" />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm text-muted-foreground">Aperçu — {labels[id]}</span>
          <Badge className="bg-success/10 text-success border-success/30 text-[10px]" variant="outline">
            Condition réelle
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          <XIcon size={14} />Fermer
        </Button>
      </div>
      <div className="flex-1 min-h-0 p-6">
        {id === 'chat' && <ChatPreview fullscreen />}
        {id === 'layout' && <AppLayoutPreview fullscreen />}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function BrandPage() {
  const [switchOn, setSwitchOn] = useState(true);
  const [previewId, setPreviewId] = useState<PreviewId>(null);

  return (
    <TooltipProvider>
      <FullscreenOverlay id={previewId} onClose={() => setPreviewId(null)} />

      <div className="min-h-screen bg-background text-foreground">

        {/* Header */}
        <header className="sticky top-0 z-50 flex items-center gap-3 border-b border-border/50 bg-background/80 px-8 py-3 backdrop-blur">
          <ScrollProgress />
          <Image src="/logo/Alfychatlogotitleupblack.svg" alt="AlfyChat" width={120} height={28} className="dark:hidden" />
          <Image src="/logo/Alfychatlogotitleupwihte.svg" alt="AlfyChat" width={120} height={28} className="hidden dark:block" />
          <Badge variant="secondary" className="text-[10px]">Brand Guidelines</Badge>
          <nav className="ml-6 hidden items-center gap-0.5 md:flex">
            {[
              { label: 'Logo', href: '#logo' },
              { label: 'Typographie', href: '#typographie' },
              { label: 'Couleurs', href: '#couleurs' },
              { label: 'Composants', href: '#composants' },
              { label: 'Chat', href: '#chat' },
              { label: 'Contextes', href: '#contextes' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">v2.0</span>
            <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]" variant="outline">Interne</Badge>
          </div>
        </header>

        <main className="mx-auto max-w-5xl space-y-16 px-8 py-12">

          <BrandHero />

          {/* ── LOGO ──────────────────────────────────────────────────────── */}
          <Section
            id="logo"
            title="Logo"
            number="01 / 06"
            description="Marque, icône et règles d'usage sur tous les supports."
          >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="flex flex-col items-center gap-3 rounded-xl bg-[oklch(0.141_0.005_285.823)] p-6">
                <Image src="/logo/Alfychat.svg" alt="Logo icône" width={48} height={48} />
                <span className="text-xs text-white/60">Icône — fond sombre</span>
              </div>
              <div className="flex flex-col items-center gap-3 rounded-xl bg-[oklch(0.141_0.005_285.823)] p-6">
                <Image src="/logo/Alfychatlogowihte.svg" alt="Logo blanc" width={100} height={40} />
                <span className="text-xs text-white/60">Logo — fond sombre</span>
              </div>
              <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-white p-6">
                <Image src="/logo/Alfychatlogoblack.svg" alt="Logo noir" width={100} height={40} />
                <span className="text-xs text-black/50">Logo — fond clair</span>
              </div>
              <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-white p-6">
                <Image src="/logo/Alfychatlogotitleupblack.svg" alt="Logo avec titre" width={120} height={40} />
                <span className="text-xs text-black/50">Avec titre — fond clair</span>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Règles d&apos;usage</p>
              <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                {[
                  { ok: true, text: 'Utiliser sur fond uni contrasté' },
                  { ok: true, text: 'Respecter les proportions d\'origine' },
                  { ok: true, text: 'Espace de protection = hauteur logo ÷ 4' },
                  { ok: false, text: 'Ne pas déformer ni étirer' },
                  { ok: false, text: 'Ne pas modifier la couleur de la marque' },
                  { ok: false, text: 'Ne pas ajouter d\'effets, ombres ou filtres' },
                ].map(({ ok, text }) => (
                  <div key={text} className="flex items-start gap-2">
                    {ok
                      ? <CheckIcon size={14} className="text-success mt-0.5 shrink-0" />
                      : <XIcon size={14} className="text-destructive mt-0.5 shrink-0" />}
                    <span className="text-muted-foreground">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Separator />

          {/* ── TYPOGRAPHIE ───────────────────────────────────────────────── */}
          <Section
            id="typographie"
            title="Typographie"
            number="02 / 06"
            description="Les familles qui portent la voix d'AlfyChat."
          >
            <div className="space-y-5">

              {/* Krona One */}
              <FontCard variable="--font-krona" family="Krona One" google="Krona One" tag="Titres & marque">
                <div className="font-heading space-y-3">
                  <div className="border-b border-border/40 pb-3">
                    <p className="text-4xl leading-tight">Krona One</p>
                  </div>
                  <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
                    ABCDEFGHIJKLMNOPQRSTUVWXYZ
                  </p>
                  <p className="font-mono text-[10px] tracking-widest text-muted-foreground">0123456789</p>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-baseline gap-4">
                      <span className="w-24 shrink-0 text-[10px] text-muted-foreground">H1 · 3xl bold</span>
                      <p className="text-3xl leading-tight">Messagerie</p>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <span className="w-24 shrink-0 text-[10px] text-muted-foreground">H2 · 2xl bold</span>
                      <p className="text-2xl leading-tight">Sécurisée</p>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <span className="w-24 shrink-0 text-[10px] text-muted-foreground">H3 · xl bold</span>
                      <p className="text-xl leading-tight">AlfyChat</p>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <span className="w-24 shrink-0 text-[10px] text-muted-foreground">Base · base</span>
                      <p className="text-base leading-tight">La communication privée</p>
                    </div>
                  </div>
                </div>
              </FontCard>

              {/* Geist Sans */}
              <FontCard variable="--font-geist-sans" family="Geist Sans" google="Geist" tag="Corps du texte">
                <div className="space-y-2">
                  {[
                    { weight: 'Regular 400', cls: 'font-normal', text: 'Corps de texte standard — 16px / 1rem' },
                    { weight: 'Medium 500', cls: 'font-medium', text: 'Labels et libellés — 14px / 0.875rem' },
                    { weight: 'Semi-Bold 600', cls: 'font-semibold', text: 'Noms d\'utilisateur, titres UI' },
                    { weight: 'Muted · sm', cls: 'font-normal text-muted-foreground text-sm', text: 'Texte secondaire — métadonnées, timestamps' },
                  ].map(({ weight, cls, text }) => (
                    <div key={weight} className="flex items-baseline gap-4">
                      <span className="w-28 shrink-0 text-[10px] text-muted-foreground">{weight}</span>
                      <p className={cn('text-base', cls)}>{text}</p>
                    </div>
                  ))}
                </div>
              </FontCard>

              {/* Geist Mono */}
              <FontCard variable="--font-geist-mono" family="Geist Mono" google="Geist Mono" tag="Code & tokens">
                <div className="space-y-2">
                  <p className="font-mono text-sm">
                    <span className="text-primary">const</span>{' '}message{' '}
                    <span className="text-muted-foreground">=</span>{' '}
                    <span className="text-success">&quot;AlfyChat 🔐&quot;</span>;
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    token · timestamp · hash · version · id
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <Badge variant="outline" className="font-mono text-[10px]">v2.0.1</Badge>
                    <Badge variant="outline" className="font-mono text-[10px]">a3f9b2c</Badge>
                    <Badge variant="outline" className="font-mono text-[10px]">E2E-256</Badge>
                    <Badge variant="outline" className="font-mono text-[10px]">SHA-512</Badge>
                  </div>
                </div>
              </FontCard>
            </div>
          </Section>

          <Separator />

          {/* ── COULEURS ──────────────────────────────────────────────────── */}
          <Section
            id="couleurs"
            title="Couleurs"
            number="03 / 06"
            description="Cliquez sur une couleur pour copier sa variable CSS."
          >
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Palette principale</p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  <ColorSwatch label="Primary" cssVar="--primary" />
                  <ColorSwatch label="Background" cssVar="--background" />
                  <ColorSwatch label="Surface" cssVar="--surface" />
                  <ColorSwatch label="Surface Sec." cssVar="--surface-secondary" />
                  <ColorSwatch label="Foreground" cssVar="--foreground" />
                  <ColorSwatch label="Muted" cssVar="--muted" />
                  <ColorSwatch label="Border" cssVar="--border" />
                  <ColorSwatch label="Destructive" cssVar="--destructive" />
                  <ColorSwatch label="Success" cssVar="--success" />
                  <ColorSwatch label="Warning" cssVar="--warning" />
                  <ColorSwatch label="Sidebar" cssVar="--sidebar" />
                  <ColorSwatch label="Ring / Focus" cssVar="--ring" />
                </div>
              </div>
              <div>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Couleurs graphiques</p>
                <div className="grid grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map(i => <ColorSwatch key={i} label={`Chart ${i}`} cssVar={`--chart-${i}`} />)}
                </div>
              </div>
            </div>
          </Section>

          <Separator />

          {/* ── COMPOSANTS ────────────────────────────────────────────────── */}
          <Section
            id="composants"
            title="Composants"
            number="04 / 06"
            description="Boutons, formulaires, cartes, et tous les primitives shadcn/ui."
          >
            <div className="space-y-6">

              {/* Boutons */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-5">
                <p className="font-heading text-sm">Boutons</p>
                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Variantes</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="default">Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="link">Link</Button>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Tailles</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="xs">XS</Button>
                    <Button size="sm">SM</Button>
                    <Button size="default">Default</Button>
                    <Button size="lg">LG</Button>
                    <Button size="icon"><SendIcon size={14} /></Button>
                    <Button size="icon-sm"><PlusIcon size={12} /></Button>
                    <Button size="icon-lg"><HeadphonesIcon size={16} /></Button>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Avec icône</p>
                  <div className="flex flex-wrap gap-2">
                    <Button><SendIcon size={14} />Envoyer</Button>
                    <Button variant="secondary"><UserPlusIcon size={14} />Ajouter un ami</Button>
                    <Button variant="outline"><SearchIcon size={14} />Rechercher</Button>
                    <Button variant="destructive"><Trash2Icon size={14} />Supprimer</Button>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">États</p>
                  <div className="flex flex-wrap gap-2">
                    <Button disabled>Désactivé</Button>
                    <Button className="opacity-60 pointer-events-none">
                      <i className="fi fi-br-spinner animate-spin" style={{ fontSize: 14 }} />
                      Chargement…
                    </Button>
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <p className="font-heading text-sm">Badges</p>
                <div className="flex flex-wrap gap-2">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                  <Badge><ShieldIcon size={10} />Admin</Badge>
                  <Badge variant="secondary"><StarIcon size={10} />Premium</Badge>
                  <Badge variant="outline" className="text-success border-success/30"><CheckIcon size={10} />En ligne</Badge>
                  <Badge variant="destructive"><ZapIcon size={10} />Urgent</Badge>
                  <Badge className="bg-primary/10 text-primary border-primary/30" variant="outline">
                    <LockIcon size={10} />E2E activé
                  </Badge>
                  <Badge className="bg-warning/10 text-warning border-warning/30" variant="outline">
                    <i className="fi fi-br-clock" style={{ fontSize: 10 }} />En attente
                  </Badge>
                </div>
              </div>

              {/* Avatars */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <p className="font-heading text-sm">Avatars & Présence</p>
                <div className="flex flex-wrap items-center gap-5">
                  {(['sm', 'default', 'lg'] as const).map(s => (
                    <div key={s} className="flex flex-col items-center gap-1">
                      <Avatar size={s}>
                        <AvatarFallback className="bg-primary/20 text-primary font-bold">{s[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-muted-foreground">{s}</span>
                    </div>
                  ))}
                  <Separator orientation="vertical" className="h-10" />
                  {[
                    { color: 'bg-success', label: 'En ligne' },
                    { color: 'bg-warning', label: 'Absent' },
                    { color: 'bg-destructive', label: 'Ne pas déranger' },
                    { color: 'bg-muted-foreground', label: 'Hors-ligne' },
                  ].map(({ color, label }) => (
                    <Tooltip key={label}>
                      <TooltipTrigger asChild>
                        <div className="relative flex flex-col items-center gap-1 cursor-default">
                          <Avatar>
                            <AvatarFallback className="bg-surface-secondary text-foreground text-xs font-bold">??</AvatarFallback>
                          </Avatar>
                          <span className={cn('absolute bottom-0 right-0 block size-2.5 rounded-full border-2 border-card translate-y-0.5 translate-x-0.5', color)} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{label}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>

              {/* Inputs */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <p className="font-heading text-sm">Champs de saisie</p>
                <div className="grid gap-3 md:grid-cols-2 max-w-2xl">
                  <Input placeholder="Adresse e-mail" type="email" />
                  <Input placeholder="Mot de passe" type="password" defaultValue="••••••••" />
                  <Input placeholder="Rechercher un utilisateur…" />
                  <Input placeholder="Désactivé" disabled />
                  <Input placeholder="Champ invalide" aria-invalid="true" />
                  <Textarea placeholder="Écrivez votre message…" rows={2} />
                </div>
              </div>

              {/* Switch */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <p className="font-heading text-sm">Switch & Toggle</p>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
                    <span className="text-sm">Notifications {switchOn ? 'activées' : 'désactivées'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={false} size="sm" />
                    <span className="text-sm text-muted-foreground">Mode silencieux (sm)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={true} disabled />
                    <span className="text-sm text-muted-foreground">Désactivé</span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <p className="font-heading text-sm">Tabs</p>
                <Tabs defaultValue="messages">
                  <TabsList>
                    <TabsTrigger value="messages">Messages</TabsTrigger>
                    <TabsTrigger value="amis">Amis</TabsTrigger>
                    <TabsTrigger value="appels">Appels</TabsTrigger>
                  </TabsList>
                  <TabsContent value="messages" className="pt-3 text-sm text-muted-foreground">
                    Liste de vos conversations directes et serveurs.
                  </TabsContent>
                  <TabsContent value="amis" className="pt-3 text-sm text-muted-foreground">
                    Gérez vos amis, demandes en attente et bloqués.
                  </TabsContent>
                  <TabsContent value="appels" className="pt-3 text-sm text-muted-foreground">
                    Historique de vos appels vocaux et vidéo.
                  </TabsContent>
                </Tabs>
                <Tabs defaultValue="all">
                  <TabsList variant="line">
                    <TabsTrigger value="all">Tous</TabsTrigger>
                    <TabsTrigger value="online">En ligne</TabsTrigger>
                    <TabsTrigger value="pending">En attente</TabsTrigger>
                    <TabsTrigger value="blocked">Bloqués</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                <p className="font-heading text-sm">Cards</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Serveur AlfyZone</CardTitle>
                      <CardDescription>452 membres · 12 en ligne</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Communauté tech francophone autour des nouvelles technologies.
                    </CardContent>
                    <CardFooter className="pb-4 px-4 pt-0">
                      <Button size="sm" variant="secondary" className="w-full">Rejoindre</Button>
                    </CardFooter>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Sécurité E2E</CardTitle>
                      <CardDescription>Chiffrement activé</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center gap-2 text-sm">
                      <ShieldIcon size={16} className="text-success" />
                      <span>Tous les messages sont chiffrés</span>
                    </CardContent>
                    <CardFooter className="pb-4 px-4 pt-0">
                      <Button size="sm" variant="outline" className="w-full">En savoir plus</Button>
                    </CardFooter>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>AlfyChat Premium</CardTitle>
                      <CardDescription>Toutes les fonctionnalités</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      {['Qualité vidéo 4K', 'Stockage illimité', 'Émojis personnalisés'].map(f => (
                        <div key={f} className="flex items-center gap-1.5 text-muted-foreground">
                          <CheckIcon size={12} className="text-success" />{f}
                        </div>
                      ))}
                    </CardContent>
                    <CardFooter className="pb-4 px-4 pt-0">
                      <Button size="sm" className="w-full">S&apos;abonner</Button>
                    </CardFooter>
                  </Card>
                </div>
              </div>

              {/* Alertes */}
              <div className="space-y-2">
                <p className="font-heading text-sm">Alertes</p>
                <Alert>
                  <ShieldIcon size={14} />
                  <AlertTitle>Vérification en deux étapes activée</AlertTitle>
                  <AlertDescription>Votre compte est protégé par 2FA.</AlertDescription>
                </Alert>
                <Alert variant="destructive">
                  <ZapIcon size={14} />
                  <AlertTitle>Connexion suspecte détectée</AlertTitle>
                  <AlertDescription>Tentative bloquée depuis un appareil inconnu.</AlertDescription>
                </Alert>
              </div>

              {/* Progress & Skeleton */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <p className="font-heading text-sm">Progress & Skeleton</p>
                <div className="max-w-md space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Téléchargement — 72%</p>
                    <Progress value={72} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Upload — 38%</p>
                    <Progress value={38} className="[&>div]:bg-success" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tooltips */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <p className="font-heading text-sm">Tooltips</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { icon: <MicIcon size={16} />, tip: 'Couper le micro' },
                    { icon: <HeadphonesIcon size={16} />, tip: 'Sourdine' },
                    { icon: <SettingsIcon size={16} />, tip: 'Paramètres utilisateur' },
                    { icon: <BellIcon size={16} />, tip: 'Notifications' },
                    { icon: <SearchIcon size={16} />, tip: 'Recherche (Ctrl+K)' },
                    { icon: <ShieldIcon size={16} />, tip: 'Sécurité & vie privée' },
                    { icon: <GlobeIcon size={16} />, tip: 'Public · 12 membres en ligne' },
                  ].map(({ icon, tip }) => (
                    <Tooltip key={tip}>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon">{icon}</Button>
                      </TooltipTrigger>
                      <TooltipContent>{tip}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>

              {/* Icônes */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <p className="font-heading text-sm">Icônes</p>
                  <span className="text-xs text-muted-foreground">Flaticon UIcons — bold-rounded (fi-br-*)</span>
                </div>
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-12">
                  {[
                    { Icon: MessageCircleIcon, name: 'Message' },
                    { Icon: SendIcon, name: 'Envoyer' },
                    { Icon: SmileIcon, name: 'Emoji' },
                    { Icon: ShieldIcon, name: 'Shield' },
                    { Icon: LockIcon, name: 'Verrou' },
                    { Icon: UserIcon, name: 'User' },
                    { Icon: UserPlusIcon, name: 'Ajouter' },
                    { Icon: UsersIcon, name: 'Groupe' },
                    { Icon: SearchIcon, name: 'Chercher' },
                    { Icon: BellIcon, name: 'Notif' },
                    { Icon: SettingsIcon, name: 'Réglages' },
                    { Icon: HashIcon, name: 'Canal' },
                    { Icon: MicIcon, name: 'Micro' },
                    { Icon: HeadphonesIcon, name: 'Audio' },
                    { Icon: PlusIcon, name: 'Ajouter' },
                    { Icon: Trash2Icon, name: 'Suppr.' },
                    { Icon: PencilIcon, name: 'Éditer' },
                    { Icon: CheckIcon, name: 'Valider' },
                    { Icon: GlobeIcon, name: 'Globe' },
                    { Icon: ZapIcon, name: 'Urgent' },
                    { Icon: StarIcon, name: 'Étoile' },
                    { Icon: ServerIcon, name: 'Serveur' },
                    { Icon: HomeIcon, name: 'Accueil' },
                    { Icon: ChevronRightIcon, name: 'Suivant' },
                  ].map(({ Icon, name }) => (
                    <div
                      key={name}
                      className="flex flex-col items-center gap-1 rounded-lg p-2 hover:bg-muted/50 transition-colors cursor-default"
                    >
                      <Icon size={18} className="text-foreground" />
                      <span className="text-[9px] text-muted-foreground text-center">{name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Border Radius */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <p className="font-heading text-sm">Border Radius</p>
                <div className="flex flex-wrap items-end gap-5">
                  {[
                    { label: 'sm', cls: 'rounded-sm' },
                    { label: 'md', cls: 'rounded-md' },
                    { label: 'lg', cls: 'rounded-lg' },
                    { label: 'xl', cls: 'rounded-xl' },
                    { label: '2xl', cls: 'rounded-2xl' },
                    { label: '3xl', cls: 'rounded-3xl' },
                    { label: 'full', cls: 'rounded-full' },
                  ].map(({ label, cls }) => (
                    <div key={label} className="flex flex-col items-center gap-1.5">
                      <div className={cn('size-12 bg-primary/20 border-2 border-primary/50', cls)} />
                      <span className="text-[10px] text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </Section>

          <Separator />

          {/* ── COMPOSANTS CHAT ───────────────────────────────────────────── */}
          <Section
            id="chat"
            title="Composants Chat"
            number="05 / 06"
            description="Briques spécifiques à la messagerie : messages, entrées, listes."
          >
            <div className="space-y-6">

              {/* Messages */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <p className="font-heading text-sm">Items de message</p>
                  <span className="text-xs text-muted-foreground">message-item.tsx</span>
                </div>
                <div className="space-y-0 rounded-xl bg-background border border-border overflow-hidden px-1 py-2">
                  {/* Standard message with hover toolbar */}
                  <div className="group flex gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/30 transition-colors">
                    <Avatar size="sm" className="mt-0.5 shrink-0">
                      <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">AL</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold">Alice</span>
                        <span className="text-[10px] text-muted-foreground">Aujourd&apos;hui à 10:24</span>
                      </div>
                      <p className="text-sm text-foreground/90">Salut ! T&apos;as vu la nouvelle fonctionnalité ? 🎉</p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon-sm"><SmileIcon size={13} /></Button>
                      <Button variant="ghost" size="icon-sm"><ReplyIcon size={13} /></Button>
                      <Button variant="ghost" size="icon-sm"><PencilIcon size={13} /></Button>
                      <Button variant="ghost" size="icon-sm"><PinIcon size={13} /></Button>
                      <Button variant="ghost" size="icon-sm"><MoreHorizontalIcon size={13} /></Button>
                    </div>
                  </div>
                  {/* Grouped message (no avatar) */}
                  <div className="group flex gap-3 rounded-lg px-2 py-0.5 hover:bg-muted/30 transition-colors">
                    <div className="w-8 shrink-0 flex items-center justify-center">
                      <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">10:25</span>
                    </div>
                    <p className="text-sm text-foreground/90">Oui c&apos;est vraiment bien fait ! 👌</p>
                  </div>
                  {/* Message with reactions */}
                  <div className="flex gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/30 transition-colors">
                    <Avatar size="sm" className="mt-0.5 shrink-0">
                      <AvatarFallback className="bg-warning/20 text-warning text-[10px] font-bold">RX</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold" style={{ color: 'oklch(0.7 0.15 80)' }}>Rex42</span>
                        <span className="text-[10px] text-muted-foreground">10:26</span>
                      </div>
                      <p className="text-sm text-foreground/90">Le chiffrement E2E est enfin stable 🔐</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {[
                          { emoji: '🎉', count: 5, active: true },
                          { emoji: '🔥', count: 3, active: false },
                          { emoji: '❤️', count: 2, active: false },
                        ].map(({ emoji, count, active }) => (
                          <button key={emoji} className={cn(
                            'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
                            active ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border bg-muted/50 text-muted-foreground hover:border-primary/30',
                          )}>
                            {emoji} <span>{count}</span>
                          </button>
                        ))}
                        <button className="flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors">
                          <SmileIcon size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Reply message */}
                  <div className="flex gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/30 transition-colors">
                    <Avatar size="sm" className="mt-0.5 shrink-0">
                      <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">AL</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-0.5 text-[10px] text-muted-foreground">
                        <ReplyIcon size={10} />
                        <span>Alice répondait à</span>
                        <span className="font-semibold text-foreground/70">Rex42</span>
                        <span className="truncate italic text-muted-foreground/60 ml-1">Le chiffrement E2E est enfin stable…</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold">Alice</span>
                        <span className="text-[10px] text-muted-foreground">10:27</span>
                      </div>
                      <p className="text-sm text-foreground/90">Exactement ! Les clés éphémères c&apos;est bluffant 🚀</p>
                    </div>
                  </div>
                  {/* Message with image attachment */}
                  <div className="flex gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/30 transition-colors">
                    <div className="w-8 shrink-0" />
                    <div className="space-y-1.5">
                      <div className="inline-flex h-24 w-40 items-center justify-center rounded-xl border border-border bg-muted/60 cursor-zoom-in hover:opacity-90 transition-opacity">
                        <GalleryIcon size={24} className="text-muted-foreground/30" />
                      </div>
                    </div>
                  </div>
                  {/* File attachment */}
                  <div className="flex gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/30 transition-colors">
                    <div className="w-8 shrink-0" />
                    <div className="inline-flex max-w-[240px] items-center gap-2.5 overflow-hidden rounded-xl border border-border bg-surface-secondary/40 px-3 py-2.5">
                      <span className="text-lg leading-none">📄</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">rapport-audit-2026.pdf</p>
                        <p className="text-[10px] text-muted-foreground">2.4 MB · PDF</p>
                      </div>
                    </div>
                  </div>
                  {/* System message */}
                  <div className="flex items-center gap-3 py-1 px-2">
                    <div className="flex-1 h-px bg-border/50" />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">Rex42 a rejoint le serveur</span>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>
                </div>
              </div>

              {/* Markdown */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <p className="font-heading text-sm">Rendu Markdown</p>
                  <span className="text-xs text-muted-foreground">markdown-renderer.tsx</span>
                </div>
                <div className="rounded-xl border border-border bg-background p-4 space-y-2.5 text-sm text-foreground/90">
                  <p><strong>Gras</strong>, <em>italique</em>, <u>souligné</u>, <s>barré</s></p>
                  <p>Code : <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-primary">const msg = &quot;AlfyChat&quot;</code></p>
                  <div className="rounded-lg bg-muted/60 border border-border px-4 py-3 font-mono text-xs text-foreground/80">
                    <p className="text-[10px] text-muted-foreground mb-1">typescript</p>
                    <p><span className="text-primary">const</span>{' '}encrypt = <span className="text-success">&quot;E2EE-256&quot;</span>;</p>
                  </div>
                  <div className="border-l-2 border-primary/50 bg-primary/5 pl-3 py-1 rounded-r-lg text-muted-foreground italic">
                    La vie privée est un droit fondamental.
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>Spoiler :</span>
                    <span className="rounded bg-muted-foreground/20 px-1.5 py-0.5 text-muted-foreground/20 select-none cursor-pointer hover:text-foreground hover:bg-muted/50 transition-all text-xs">
                      contenu masqué
                    </span>
                  </div>
                </div>
              </div>

              {/* Input bar */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <p className="font-heading text-sm">Barre de saisie</p>
                <div className="space-y-1.5 max-w-xl">
                  {/* Reply preview */}
                  <div className="flex items-center gap-2 rounded-t-xl border border-b-0 border-border bg-muted/40 px-3 py-1.5">
                    <ReplyIcon size={12} className="text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground flex-1 truncate">Réponse à <span className="font-semibold text-foreground/70">Rex42</span> — Le chiffrement E2E…</span>
                    <Button variant="ghost" size="icon-sm" className="size-5"><XIcon size={10} /></Button>
                  </div>
                  {/* Input */}
                  <div className="flex items-center gap-1 rounded-b-xl border border-border bg-surface-secondary/40 px-3 py-2">
                    <Button variant="ghost" size="icon-sm"><PlusIcon size={15} /></Button>
                    <input
                      readOnly
                      placeholder="Message #général"
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon-sm"><PaperclipIcon size={14} /></Button>
                      <Button variant="ghost" size="icon-sm"><SmileIcon size={14} /></Button>
                      <Button variant="ghost" size="icon-sm">
                        <span className="font-mono text-[10px] font-semibold text-muted-foreground">GIF</span>
                      </Button>
                      <Button size="icon-sm"><SendIcon size={12} /></Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mention popover */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <p className="font-heading text-sm">Popover de mention (@mention)</p>
                <div className="relative w-72">
                  <div className="flex items-center rounded-xl border border-border bg-surface-secondary/50 px-3 py-1.5 text-sm">
                    <span className="text-foreground/90">Bravo </span>
                    <span className="text-primary">@Al</span>
                    <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-foreground/70" />
                  </div>
                  <div className="absolute bottom-full mb-1.5 left-0 w-56 rounded-xl border border-border bg-popover shadow-xl p-1 z-10">
                    {[
                      { i: 'AL', n: 'Alice', u: 'alice42', active: true },
                      { i: 'AX', n: 'Alex', u: 'alexdev', active: false },
                    ].map(({ i, n, u, active }) => (
                      <div key={u} className={cn(
                        'flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer',
                        active ? 'bg-primary/10' : 'hover:bg-muted/40',
                      )}>
                        <Avatar size="sm" className="size-6 shrink-0">
                          <AvatarFallback className="bg-primary/20 text-primary text-[9px] font-bold">{i}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-semibold">{n}</p>
                          <p className="text-[10px] text-muted-foreground">{u}</p>
                        </div>
                        {active && <CheckIcon size={12} className="ml-auto text-primary" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Invite embed */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <p className="font-heading text-sm">Invitation serveur embed (invite-embed.tsx)</p>
                <div className="max-w-sm rounded-xl border border-border bg-surface-secondary/40 overflow-hidden">
                  <div className="p-4">
                    <p className="text-[10px] text-muted-foreground mb-3 uppercase tracking-wider font-semibold">Invitation à un serveur AlfyChat</p>
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/20 shrink-0">
                        <ServerIcon size={18} className="text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-heading text-sm">AlfyZone</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-success inline-block" />42 en ligne</span>
                          <span>·</span>
                          <span>452 membres</span>
                        </div>
                      </div>
                      <Button size="sm" className="shrink-0">Rejoindre</Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Call bar */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <p className="font-heading text-sm">Barre d&apos;appel (call-bar.tsx)</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 max-w-xl">
                  {/* Calling state */}
                  <div className="rounded-xl border border-border/40 bg-background px-2 py-2 space-y-1.5">
                    <p className="px-1 text-[10px] text-muted-foreground font-mono">État : appel en cours</p>
                    <div className="flex items-center gap-2 rounded-lg px-1.5 py-1">
                      <span className="relative flex size-2 shrink-0">
                        <span className="relative inline-flex size-2 rounded-full bg-muted-foreground" />
                      </span>
                      <span className="flex-1 truncate text-[11px] font-semibold text-muted-foreground">Appel en cours…</span>
                    </div>
                    <div className="flex items-center gap-1 px-1">
                      <div className="mr-1 flex size-6 items-center justify-center rounded-md bg-muted/40">
                        <PhoneIcon size={12} className="text-muted-foreground/60" />
                      </div>
                      <span className="flex-1 truncate text-[11px] font-medium text-foreground/70">Alice</span>
                      <Button variant="ghost" size="icon-sm" className="size-7 bg-destructive/15 text-destructive hover:bg-destructive/25"><PhoneOffIcon size={13} /></Button>
                    </div>
                  </div>
                  {/* Connected state */}
                  <div className="rounded-xl border border-success/20 bg-success/6 px-2 py-2 space-y-1.5">
                    <p className="px-1 text-[10px] text-success/60 font-mono">État : connecté</p>
                    <div className="flex items-center gap-2 rounded-lg px-1.5 py-1">
                      <span className="relative flex size-2 shrink-0">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/40" />
                        <span className="relative inline-flex size-2 rounded-full bg-success" />
                      </span>
                      <span className="flex-1 truncate text-[11px] font-semibold text-success">Vocal connecté</span>
                      <span className="font-mono text-[10px] text-success/70 shrink-0">02:47</span>
                    </div>
                    <div className="flex items-center gap-1 px-1">
                      <div className="mr-1 flex size-6 items-center justify-center rounded-md bg-success/15">
                        <PhoneIcon size={12} className="text-success" />
                      </div>
                      <span className="flex-1 truncate text-[11px] font-medium text-foreground/70">Alice</span>
                      <Button variant="ghost" size="icon-sm" className="size-7"><MicIcon size={12} /></Button>
                      <Button variant="ghost" size="icon-sm" className="size-7 bg-destructive/15 text-destructive hover:bg-destructive/25"><PhoneOffIcon size={13} /></Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Voice control bar */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <p className="font-heading text-sm">Barre vocale (voice-control-bar.tsx)</p>
                <div className="max-w-xs rounded-xl border border-border bg-background overflow-hidden">
                  <div className="border-t border-border/30 bg-surface/60 px-3 py-2.5">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex size-5 items-center justify-center rounded-xl bg-success/15">
                        <Volume2Icon size={12} className="text-success" />
                      </div>
                      <span className="text-[11px] font-semibold text-success">Vocal actif</span>
                      <span className="ml-auto rounded-xl bg-surface-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">3 membres</span>
                    </div>
                    <div className="flex items-center gap-1 rounded-xl bg-surface-secondary/30 p-1">
                      <Button size="icon-sm" variant="ghost" className="size-8 flex-1 rounded-xl text-muted-foreground/70">
                        <MicIcon size={15} />
                      </Button>
                      <Button size="icon-sm" variant="ghost" className="size-8 flex-1 rounded-xl bg-destructive/20 text-destructive hover:bg-destructive/30">
                        <HeadphoneOffIcon size={15} />
                      </Button>
                      <div className="mx-1 h-5 w-px rounded-full bg-border/30" />
                      <Button size="icon-sm" variant="ghost" className="size-8 flex-1 rounded-xl bg-destructive/15 text-destructive hover:bg-destructive/25">
                        <PhoneOffIcon size={15} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Incoming call dialog */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <p className="font-heading text-sm">Appel entrant (incoming-call-dialog.tsx)</p>
                <div className="max-w-xs">
                  <div className="relative rounded-2xl border border-border bg-card/95 p-6 shadow-2xl">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="relative">
                        <Avatar className="size-16 shadow-lg ring-4 ring-muted">
                          <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">AL</AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-success text-white">
                          <PhoneIcon size={10} />
                        </span>
                      </div>
                      <div>
                        <p className="font-heading text-base">Alice</p>
                        <p className="text-sm text-muted-foreground">Appel vocal entrant…</p>
                      </div>
                      <div className="flex justify-center gap-6 mt-1">
                        <div className="flex flex-col items-center gap-1.5">
                          <button className="flex size-12 items-center justify-center rounded-full bg-destructive/90 text-white hover:bg-destructive transition-colors">
                            <PhoneOffIcon size={20} />
                          </button>
                          <span className="text-[10px] text-muted-foreground">Refuser</span>
                        </div>
                        <div className="flex flex-col items-center gap-1.5">
                          <button className="flex size-12 items-center justify-center rounded-full bg-success/90 text-white hover:bg-success transition-colors">
                            <PhoneIcon size={20} />
                          </button>
                          <span className="text-[10px] text-muted-foreground">Accepter</span>
                        </div>
                        <div className="flex flex-col items-center gap-1.5">
                          <button className="flex size-12 items-center justify-center rounded-full bg-primary/90 text-white hover:bg-primary transition-colors">
                            <VideoIcon size={20} />
                          </button>
                          <span className="text-[10px] text-muted-foreground">Vidéo</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Channel list */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <p className="font-heading text-sm">Liste des canaux</p>
                  <span className="text-xs text-muted-foreground">channel-list.tsx</span>
                </div>
                <div className="w-52 rounded-xl border border-border bg-sidebar overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2 font-heading text-sm">
                    AlfyZone
                    <ChevronRightIcon size={12} className="text-muted-foreground rotate-90" />
                  </div>
                  <div className="px-2 py-1.5 text-sm space-y-0.5">
                    <button className="flex w-full items-center gap-1 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
                      <ChevronRightIcon size={10} />TEXTE
                    </button>
                    {(['général', 'aide', 'off-topic'] as const).map((ch, i) => (
                      <div key={ch} className={cn('flex items-center gap-1.5 rounded-md px-2 py-1 text-xs cursor-pointer transition-colors', i === 0 ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground')}>
                        <HashIcon size={11} className="shrink-0" />
                        <span className="flex-1 truncate">{ch}</span>
                        {i === 1 && <Badge variant="destructive" className="h-3.5 px-1" style={{ fontSize: 9 }}>2</Badge>}
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/30 cursor-pointer">
                      <MegaphoneIcon size={11} className="shrink-0" />
                      <span className="flex-1 truncate">annonces</span>
                    </div>
                    <button className="mt-1 flex w-full items-center gap-1 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
                      <ChevronRightIcon size={10} />VOCAL
                    </button>
                    <div className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/30 cursor-pointer">
                      <Volume2Icon size={11} className="shrink-0" />
                      <span className="flex-1 truncate">Général</span>
                    </div>
                    {/* Voice channel with active participants */}
                    <div>
                      <div className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-success hover:bg-muted/30 cursor-pointer">
                        <Volume2Icon size={11} className="shrink-0" />
                        <span className="flex-1 truncate">Gaming</span>
                        <span className="text-[9px] text-success/70">2</span>
                      </div>
                      {['Alice', 'Rex42'].map((u) => (
                        <div key={u} className="flex items-center gap-1.5 rounded-md py-0.5 pl-6 pr-2 text-[10px] text-muted-foreground/70 hover:bg-muted/30 cursor-pointer">
                          <Avatar className="size-4 shrink-0">
                            <AvatarFallback className="text-[8px] bg-muted">{u[0]}</AvatarFallback>
                          </Avatar>
                          {u}
                          {u === 'Rex42' && <MicOffIcon size={9} className="ml-auto text-destructive/60" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Member list */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <p className="font-heading text-sm">Liste des membres</p>
                  <span className="text-xs text-muted-foreground">member-list.tsx</span>
                </div>
                <div className="w-48 rounded-xl border border-border bg-sidebar overflow-hidden">
                  <div className="px-2 py-2 space-y-2">
                    {/* Admin role */}
                    <div>
                      <p className="px-1 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-amber-400">Admin — 1</p>
                      <div className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-surface-secondary/40 cursor-pointer">
                        <div className="relative shrink-0">
                          <Avatar className="size-7 shadow-sm">
                            <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-semibold">JD</AvatarFallback>
                          </Avatar>
                          <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-[1.5px] border-background bg-success" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium" style={{ color: '#a855f7' }}>JohnDoe</p>
                          <p className="truncate text-[9px] text-muted-foreground">🎮 En train de jouer…</p>
                        </div>
                      </div>
                    </div>
                    {/* Online */}
                    <div>
                      <p className="px-1 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">En ligne — 2</p>
                      {[
                        { i: 'AL', n: 'Alice', dot: 'bg-success', role: '#22c55e' },
                        { i: 'RX', n: 'Rex42', dot: 'bg-warning', role: undefined },
                      ].map((u) => (
                        <div key={u.n} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-surface-secondary/40 cursor-pointer">
                          <div className="relative shrink-0">
                            <Avatar className="size-7">
                              <AvatarFallback className="bg-muted text-foreground/60 text-[10px] font-semibold">{u.i}</AvatarFallback>
                            </Avatar>
                            <span className={cn('absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-[1.5px] border-background', u.dot)} />
                          </div>
                          <p className="truncate text-xs font-medium" style={{ color: u.role }}>{u.n}</p>
                        </div>
                      ))}
                    </div>
                    {/* Offline */}
                    <div>
                      <p className="px-1 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Hors ligne — 1</p>
                      <div className="flex items-center gap-2 rounded-xl px-2 py-1.5 opacity-35 cursor-pointer">
                        <div className="relative shrink-0">
                          <Avatar className="size-7">
                            <AvatarFallback className="bg-muted text-foreground/60 text-[10px] font-semibold">BX</AvatarFallback>
                          </Avatar>
                          <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-[1.5px] border-background bg-muted-foreground" />
                        </div>
                        <p className="truncate text-xs font-medium">Bob</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* User profile popover */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <p className="font-heading text-sm">Profil utilisateur</p>
                  <span className="text-xs text-muted-foreground">user-profile-popover.tsx</span>
                </div>
                <div className="max-w-xs rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                  <div className="h-20 bg-gradient-to-r from-violet-600 to-indigo-600 relative">
                    <div className="absolute -bottom-7 left-3">
                      <div className="relative">
                        <Avatar className="size-14 ring-4 ring-card">
                          <AvatarFallback className="bg-primary/20 text-primary text-base font-bold">JD</AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0.5 right-0.5 block size-3.5 rounded-full border-2 border-card bg-success" />
                      </div>
                    </div>
                  </div>
                  <div className="px-3 pt-10 pb-3 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-heading text-sm">JohnDoe</p>
                        <p className="text-xs text-muted-foreground">@johndoe</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                          <MessageCircleIcon size={12} />Message
                        </Button>
                        <Button variant="outline" size="icon-sm" className="h-7 w-7">
                          <MoreHorizontalIcon size={12} />
                        </Button>
                      </div>
                    </div>
                    <Separator />
                    <p className="text-xs text-muted-foreground">🛡️ Dev full-stack passionné de sécurité et vie privée. AlfyCore contributor.</p>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { emoji: '🛡️', label: 'Admin', color: '#a855f7' },
                        { emoji: '⭐', label: 'Premium', color: '#f59e0b' },
                        { emoji: '🐛', label: 'Bug Hunter', color: '#22c55e' },
                      ].map(({ emoji, label, color }) => (
                        <Tooltip key={label}>
                          <TooltipTrigger asChild>
                            <span
                              style={{ border: `1px solid ${color}40`, background: `${color}15`, color }}
                              className="rounded-md px-1.5 py-0.5 text-[10px] cursor-default"
                            >
                              {emoji} {label}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{label}</TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <ClockIcon size={10} />
                      <span>Actif · Rejoint il y a 2 ans</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Friends panel */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <p className="font-heading text-sm">Panneau amis</p>
                  <span className="text-xs text-muted-foreground">friends-panel.tsx</span>
                </div>
                <div className="max-w-md rounded-xl border border-border bg-background overflow-hidden">
                  <Tabs defaultValue="online">
                    <div className="flex items-center gap-2 border-b border-border px-4 py-2">
                      <UsersIcon size={14} className="text-muted-foreground shrink-0" />
                      <TabsList variant="line" className="gap-0">
                        <TabsTrigger value="all">Tous</TabsTrigger>
                        <TabsTrigger value="online">En ligne</TabsTrigger>
                        <TabsTrigger value="pending">
                          En attente <Badge variant="destructive" className="ml-1" style={{ fontSize: 9, padding: '0 4px', height: 14 }}>2</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="blocked">Bloqués</TabsTrigger>
                      </TabsList>
                      <Button size="sm" className="ml-auto h-7 text-xs">
                        <UserPlusIcon size={12} />Ajouter
                      </Button>
                    </div>
                    <TabsContent value="online" className="p-2">
                      {[
                        { i: 'AL', n: 'Alice', dot: 'bg-success', label: 'En ligne', custom: '🎵 Musique' },
                        { i: 'RX', n: 'Rex42', dot: 'bg-warning', label: 'Absent', custom: 'AFK' },
                      ].map((u) => (
                        <div key={u.n} className="group flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-muted/30 transition-colors">
                          <div className="relative shrink-0">
                            <Avatar>
                              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{u.i}</AvatarFallback>
                            </Avatar>
                            <span className={cn('absolute bottom-0 right-0 block size-2.5 rounded-full border-2 border-background', u.dot)} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{u.n}</p>
                            <p className="truncate text-xs text-muted-foreground">{u.custom}</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon-sm"><MessageCircleIcon size={15} /></Button>
                              </TooltipTrigger>
                              <TooltipContent>Message</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon-sm"><VideoIcon size={15} /></Button>
                              </TooltipTrigger>
                              <TooltipContent>Appel vidéo</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                    <TabsContent value="all" className="p-4 text-sm text-center text-muted-foreground">Tous vos amis</TabsContent>
                    <TabsContent value="pending" className="p-4 text-sm text-center text-muted-foreground">Demandes en attente</TabsContent>
                    <TabsContent value="blocked" className="p-4 text-sm text-center text-muted-foreground">Utilisateurs bloqués</TabsContent>
                  </Tabs>
                </div>
              </div>

              {/* Search panel */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <p className="font-heading text-sm">Panneau de recherche</p>
                  <span className="text-xs text-muted-foreground">search-panel.tsx</span>
                </div>
                <div className="max-w-sm rounded-xl border border-border bg-background overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                    <SearchIcon size={14} className="text-muted-foreground shrink-0" />
                    <input
                      readOnly
                      defaultValue="chiffrement"
                      className="flex-1 bg-transparent text-sm outline-none"
                    />
                    <Button variant="ghost" size="icon-sm"><XIcon size={12} /></Button>
                  </div>
                  <p className="border-b border-border px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">2 résultats</p>
                  <div className="space-y-0 p-1.5">
                    {[
                      { user: 'Rex42', time: "Aujourd'hui à 10:26", query: 'chiffrement', text: 'Le {chiffrement} E2E est enfin stable 🔐' },
                      { user: 'Moi', time: 'Hier à 18:12', query: 'chiffrement', text: 'Le niveau 3 de {chiffrement} est en clés éphémères.' },
                    ].map((r, idx) => (
                      <div key={idx} className="flex gap-2 rounded-lg p-2 hover:bg-muted/30 cursor-pointer transition-colors">
                        <Avatar size="sm" className="mt-0.5 shrink-0">
                          <AvatarFallback className="bg-muted text-foreground/60 text-[9px]">{r.user[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs font-semibold">{r.user}</span>
                            <span className="text-[9px] text-muted-foreground">{r.time}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {r.text.split(/\{([^}]+)\}/).map((part, j) =>
                              j % 2 === 1
                                ? <mark key={j} className="rounded-sm bg-primary/25 px-0.5 text-foreground not-italic">{part}</mark>
                                : part,
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Forum view */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <p className="font-heading text-sm">Vue Forum</p>
                  <span className="text-xs text-muted-foreground">forum-view.tsx</span>
                </div>
                <div className="space-y-2 max-w-lg">
                  {[
                    { title: 'Suggestions pour le chiffrement niveau 4 ?', author: 'Rex42', replies: 12, tag: 'Discussion', pinned: true },
                    { title: 'Bug : notification doublée parfois', author: 'Alice', replies: 5, tag: 'Bug', pinned: false },
                    { title: 'Ajout du thème clair sur mobile', author: 'JohnDoe', replies: 8, tag: 'Idée', pinned: false },
                  ].map(({ title, author, replies, tag, pinned }) => (
                    <div key={title} className="rounded-xl border border-border bg-surface-secondary/30 px-4 py-3 hover:bg-surface-secondary/50 cursor-pointer transition-colors">
                      <div className="flex items-start gap-3">
                        <ForumIcon size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {pinned && <PinIcon size={11} className="text-primary shrink-0" />}
                            <p className="text-sm font-semibold truncate">{title}</p>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                            <Badge variant="outline" className="text-[9px] px-1 h-4">{tag}</Badge>
                            <span>par {author}</span>
                            <span>·</span>
                            <span>{replies} réponses</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gallery view */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <p className="font-heading text-sm">Vue Galerie</p>
                  <span className="text-xs text-muted-foreground">gallery-view.tsx</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 max-w-xs">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'aspect-square rounded-lg bg-muted/60 flex items-center justify-center border border-border cursor-zoom-in hover:brightness-95 transition-all',
                        i === 0 && 'col-span-2 row-span-2',
                      )}
                    >
                      <GalleryIcon size={i === 0 ? 28 : 14} className="text-muted-foreground/40" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile bottom nav */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <p className="font-heading text-sm">Navigation mobile</p>
                  <span className="text-xs text-muted-foreground">mobile-bottom-nav.tsx</span>
                </div>
                <div className="max-w-xs overflow-hidden rounded-xl border border-border bg-background/95">
                  <nav className="flex h-16 items-stretch">
                    {[
                      { Icon: MessageCircleIcon, label: 'Messages', active: true },
                      { Icon: UsersIcon, label: 'Amis', active: false },
                      { Icon: SettingsIcon, label: 'Paramètres', active: false },
                    ].map(({ Icon, label, active }) => (
                      <button key={label} className={cn(
                        'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-none h-full transition-colors',
                        active ? 'text-primary' : 'text-muted-foreground',
                      )}>
                        <div className={cn(
                          'flex size-9 items-center justify-center rounded-xl transition-all',
                          active ? 'bg-primary/10 scale-105' : 'scale-100',
                        )}>
                          <Icon size={20} />
                        </div>
                        <span className="text-[10px] font-medium">{label}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Server page skeleton */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <p className="font-heading text-sm">Squelette de chargement</p>
                  <span className="text-xs text-muted-foreground">server-page-skeleton.tsx</span>
                </div>
                <div className="max-w-lg rounded-xl border border-border overflow-hidden">
                  <div className="h-24 border-b border-border bg-muted/30 px-4 pb-4 pt-10">
                    <div className="flex items-end gap-3">
                      <Skeleton className="size-12 rounded-2xl shrink-0" />
                      <div className="space-y-2 pb-0.5">
                        <Skeleton className="h-3 w-20 rounded-full" />
                        <Skeleton className="h-5 w-40 rounded-xl" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 p-4">
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-7 w-24 rounded-full" />
                      <Skeleton className="h-7 w-20 rounded-full" />
                      <Skeleton className="h-7 w-28 rounded-full" />
                    </div>
                    <Skeleton className="h-16 w-full rounded-2xl" />
                    <div className="grid grid-cols-2 gap-3">
                      <Skeleton className="h-32 w-full rounded-2xl" />
                      <Skeleton className="h-32 w-full rounded-2xl" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </Section>

          <Separator />

          {/* ── CONTEXTES ─────────────────────────────────────────────────── */}
          <Section
            id="contextes"
            title="Contextes — Aperçus réels"
            number="06 / 06"
            description="Les composants assemblés dans leurs vraies conditions d'usage."
          >
            <div className="space-y-6">

              {/* Chat */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Barre de message (Chat interactif)</p>
                  <button
                    onClick={() => setPreviewId('chat')}
                    className="flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                  >
                    <i className="fi fi-br-expand" style={{ fontSize: 10 }} />
                    Plein écran
                  </button>
                </div>
                <ChatPreview />
              </div>

              {/* Full layout */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Interface complète (Layout)</p>
                  <button
                    onClick={() => setPreviewId('layout')}
                    className="flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                  >
                    <i className="fi fi-br-expand" style={{ fontSize: 10 }} />
                    Plein écran
                  </button>
                </div>
                <AppLayoutPreview />
              </div>

              {/* User panel */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Panneau utilisateur (User Panel)</p>
                <div className="w-72 rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center gap-1.5 border-t border-border/30 bg-background/80 px-2 py-2">
                    <div className="relative shrink-0">
                      <Avatar size="sm">
                        <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">JD</AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 block size-2 rounded-full border-2 border-card bg-success" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">JohnDoe</p>
                      <p className="truncate text-[10px] text-muted-foreground">🎮 En train de jouer…</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon-sm"><MicIcon size={12} /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Micro</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon-sm"><HeadphonesIcon size={12} /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Casque</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon-sm"><SettingsIcon size={12} /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Paramètres</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </Section>

        </main>

        <footer className="mt-8 border-t border-border/40 px-8 py-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <Image src="/logo/Alfychat.svg" alt="AlfyChat" width={28} height={28} className="opacity-40" />
            <p className="text-xs text-muted-foreground">
              AlfyChat — Brand Guidelines &nbsp;·&nbsp; Interne uniquement &nbsp;·&nbsp; 2026
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <a href="/about" className="hover:text-foreground transition-colors">À propos</a>
              <a href="/jobs" className="hover:text-foreground transition-colors">Emplois</a>
              <a href="/brand" className="hover:text-foreground transition-colors">Marque</a>
              <a href="/newsroom" className="hover:text-foreground transition-colors">Espace actualités</a>
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
