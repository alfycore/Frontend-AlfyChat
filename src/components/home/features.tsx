'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotionConfig } from 'motion/react';
import { Avatar, Button, Chip, Meter, Tabs } from '@heroui/react';
import {
  FileImage, Hash, Heart, Lock, MessageCircle, Mic, PhoneOff, Server, Users, Video, Bot,
  type LucideIcon,
} from 'lucide-react';

import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import { CONTAINER, Display, EASE, Eyebrow, Reveal } from './shared';

type Key = 'dm' | 'servers' | 'voice' | 'bots';

const ICONS: Record<Key, LucideIcon> = { dm: MessageCircle, servers: Server, voice: Users, bots: Bot };
const PREVIEWS: Record<Key, () => ReactNode> = {
  dm: () => <DmPreview />,
  servers: () => <ServerPreview />,
  voice: () => <VoicePreview />,
  bots: () => <BotPreview />,
};

/** Liste verticale dès lg, rangée défilante en dessous. */
function useWide() {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return wide;
}

export function HomeFeatures() {
  const f = useTranslation().t.landing.home.features;
  const wide = useWide();
  const keys: Key[] = ['dm', 'servers', 'voice', 'bots'];

  return (
    <section id="features" className="scroll-mt-16 bg-background">
      <div className={cn(CONTAINER, 'py-28 lg:py-40')}>
        <div className="mb-16 flex flex-col gap-6 lg:mb-24">
          <Reveal>
            <Eyebrow>{f.eyebrow}</Eyebrow>
          </Reveal>
          <Display lines={[f.title1, f.title2]} tones={{ 1: 'text-muted' }} />
        </div>

        <Reveal delay={0.1}>
          <Tabs
            orientation={wide ? 'vertical' : 'horizontal'}
            defaultSelectedKey="dm"
            className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16"
          >
            <Tabs.ListContainer className="self-start bg-transparent">
              <Tabs.List aria-label={f.tabsLabel} className="gap-1 p-0">
                {keys.map((k) => {
                  const Icon = ICONS[k];
                  return (
                    <Tabs.Tab
                      key={k}
                      id={k}
                      className="h-auto justify-start px-4 py-3 text-left lg:px-5 lg:py-5"
                    >
                      <span className="flex items-start gap-4">
                        <Icon className="mt-0.5 size-5 shrink-0" strokeWidth={1.7} aria-hidden />
                        <span className="flex flex-col gap-1.5">
                          <span className="text-[15px] font-semibold text-foreground">{f[k].title}</span>
                          <span className="hidden text-sm leading-relaxed font-normal text-muted lg:block">
                            {f[k].desc}
                          </span>
                        </span>
                      </span>
                      <Tabs.Indicator className="bg-surface shadow-none" />
                    </Tabs.Tab>
                  );
                })}
              </Tabs.List>
            </Tabs.ListContainer>

            {keys.map((k) => (
              <Tabs.Panel key={k} id={k} className="m-0 p-0">
                <PreviewFrame>{PREVIEWS[k]()}</PreviewFrame>
                <p className="mt-4 text-sm text-muted lg:hidden">{f[k].desc}</p>
              </Tabs.Panel>
            ))}
          </Tabs>
        </Reveal>
      </div>
    </section>
  );
}

function PreviewFrame({ children }: { children: ReactNode }) {
  const reduce = useReducedMotionConfig();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex min-h-[420px] flex-col overflow-hidden rounded-3xl bg-surface"
    >
      {children}
    </motion.div>
  );
}

function PreviewHeader({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 bg-surface-secondary/60 px-5 py-3.5 text-sm">
      {icon}
      {children}
    </div>
  );
}

/* ── Messages privés ─────────────────────────────────────────────────── */
function DmPreview() {
  const m = useTranslation().t.landing.home.features.mock;
  return (
    <>
      <PreviewHeader
        icon={
          <Avatar size="sm" color="success" variant="soft">
            <Avatar.Fallback>{m.dmContact.slice(0, 1)}</Avatar.Fallback>
          </Avatar>
        }
      >
        <span className="flex-1 font-semibold text-foreground">{m.dmContact}</span>
        <Lock className="size-3.5 text-muted" aria-hidden />
      </PreviewHeader>
      <div className="flex flex-1 flex-col justify-end gap-3 p-5">
        {m.dm.map((text, i) => {
          const mine = i % 2 === 1;
          return (
            <div key={text} className={cn('flex flex-col gap-1.5', mine ? 'items-end' : 'items-start')}>
              <p
                className={cn(
                  'max-w-[78%] rounded-2xl px-4 py-2.5 text-[15px]',
                  mine ? 'rounded-br-md bg-accent text-accent-foreground' : 'rounded-bl-md bg-surface-secondary',
                )}
              >
                {text}
              </p>
              {i === 1 && (
                <Chip size="sm" variant="soft">
                  <Heart className="size-3 text-danger" aria-hidden />
                  <Chip.Label>2</Chip.Label>
                </Chip>
              )}
            </div>
          );
        })}
        <div className="flex items-center gap-3 self-start rounded-2xl bg-surface-secondary px-4 py-3">
          <FileImage className="size-5 text-accent" strokeWidth={1.6} aria-hidden />
          <span className="text-sm">
            <span className="block font-medium text-foreground">IMG_2041.jpg</span>
            <span className="text-xs text-muted">2,4 Mo</span>
          </span>
        </div>
      </div>
    </>
  );
}

/* ── Serveurs ────────────────────────────────────────────────────────── */
const ROLE_TONES = ['bg-accent', 'bg-warning', 'bg-success'];

function ServerPreview() {
  const m = useTranslation().t.landing.home.features.mock;
  return (
    <div className="grid flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col gap-5 bg-surface-secondary/60 p-5">
        <div>
          <p className="font-semibold text-foreground">{m.serverName}</p>
          <p className="text-xs text-muted">{m.serverMembers}</p>
        </div>
        {m.categories.map((cat, ci) => (
          <div key={cat} className="flex flex-col gap-1">
            <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">{cat}</p>
            {(m.channels[ci] ?? []).map((ch, i) => (
              <p
                key={ch}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm',
                  ci === 1 && i === 0 ? 'bg-surface text-foreground' : 'text-muted',
                )}
              >
                <Hash className="size-3.5" aria-hidden />
                {ch}
              </p>
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-5 p-5">
        {m.roles.map((role, i) => (
          <div key={role} className="flex flex-col gap-2.5">
            <p className="flex items-center gap-2 text-xs font-semibold text-muted">
              <span className={cn('size-2 rounded-full', ROLE_TONES[i])} aria-hidden />
              {role}
            </p>
            <div className="flex -space-x-1.5">
              {Array.from({ length: i === 2 ? 5 : i + 1 }, (_, j) => (
                <Avatar key={j} size="sm" variant="soft" color={(['accent', 'warning', 'default'] as const)[i]}>
                  <Avatar.Fallback>{String.fromCharCode(65 + ((i * 3 + j * 5) % 26))}</Avatar.Fallback>
                </Avatar>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Vocal ───────────────────────────────────────────────────────────── */
const PEOPLE = ['Léa', 'Hugo', 'Inès', 'Sam'];

function VoicePreview() {
  const m = useTranslation().t.landing.home.features.mock;
  return (
    <>
      <PreviewHeader icon={<Mic className="size-4 text-success" aria-hidden />}>
        <span className="flex-1 font-semibold text-foreground">{m.voiceChannel}</span>
        <span className="text-xs text-muted">{m.voiceState}</span>
      </PreviewHeader>
      <div className="grid flex-1 grid-cols-2 gap-3 p-5">
        {PEOPLE.map((name, i) => (
          <div
            key={name}
            className={cn(
              'relative flex aspect-[4/3] items-center justify-center rounded-2xl bg-surface-secondary',
              'transition-colors duration-(--dur-4)',
              i === 1 && 'bg-accent/10',
            )}
          >
            <Avatar size="lg" color={i === 1 ? 'accent' : 'default'} variant="soft">
              <Avatar.Fallback>{name.slice(0, 1)}</Avatar.Fallback>
            </Avatar>
            <span className="absolute bottom-2.5 left-3 flex items-center gap-2 text-xs font-medium text-foreground">
              {name}
              {i === 1 && (
                <span className="home-bars" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 pb-5">
        <Button isIconOnly variant="secondary" aria-label={m.mute}>
          <Mic className="size-4" aria-hidden />
        </Button>
        <Button isIconOnly variant="secondary" aria-label={m.camera}>
          <Video className="size-4" aria-hidden />
        </Button>
        <Button isIconOnly variant="danger" aria-label={m.leave}>
          <PhoneOff className="size-4" aria-hidden />
        </Button>
      </div>
    </>
  );
}

/* ── Bots ────────────────────────────────────────────────────────────── */
const VOTES = [58, 29, 13];

function BotPreview() {
  const m = useTranslation().t.landing.home.features.mock;
  return (
    <>
      <PreviewHeader icon={<Hash className="size-4 text-muted" aria-hidden />}>
        <span className="font-semibold text-foreground">{m.channels[1]?.[0]}</span>
      </PreviewHeader>
      <div className="flex flex-1 flex-col justify-end gap-5 p-5">
        <div className="flex items-start gap-3">
          <Avatar size="sm" variant="soft" color="warning">
            <Avatar.Fallback>I</Avatar.Fallback>
          </Avatar>
          <p className="rounded-lg bg-surface-secondary px-2.5 py-1 font-mono text-[13px] text-foreground">
            {m.botCommand}
          </p>
        </div>
        <div className="flex items-start gap-3">
          <Avatar size="sm" color="accent">
            <Avatar.Fallback>
              <Bot className="size-4" aria-hidden />
            </Avatar.Fallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {m.botName}
              <Chip size="sm" color="accent" variant="soft">
                <Chip.Label className="text-[10px] font-bold">{m.botTag}</Chip.Label>
              </Chip>
            </p>
            <div className="flex flex-col gap-4 rounded-2xl bg-surface-secondary p-4">
              <p className="font-semibold text-foreground">{m.botQuestion}</p>
              {m.botOptions.map((opt, i) => (
                <Meter key={opt} value={VOTES[i] ?? 0} size="sm" color={i === 0 ? 'accent' : 'default'} aria-label={opt}>
                  <div className="flex w-full justify-between text-sm">
                    <span className="text-foreground">{opt}</span>
                    <Meter.Output className="text-muted" />
                  </div>
                  <Meter.Track>
                    <Meter.Fill />
                  </Meter.Track>
                </Meter>
              ))}
              <p className="text-xs text-muted">{m.botVotes}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
