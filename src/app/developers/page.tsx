'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BotIcon, BookOpenIcon, ZapIcon, CodeIcon,
  PlusIcon, ArrowRightIcon, LockIcon, WifiIcon,
} from '@/components/icons';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    number: '01',
    icon: PlusIcon,
    title: 'Créer une application',
    description: 'Enregistrez votre bot depuis le portail développeur. Vous recevrez un token et un client secret.',
  },
  {
    number: '02',
    icon: LockIcon,
    title: 'Configurer OAuth2',
    description: 'Ajoutez vos URIs de redirection et générez un lien d\'invitation pour votre bot.',
  },
  {
    number: '03',
    icon: ZapIcon,
    title: 'Connecter et coder',
    description: 'Utilisez votre token Bot pour vous connecter à la Gateway et commencer à recevoir des événements.',
  },
];

const QUICK_LINKS = [
  {
    href: '/developers/docs/bots-introduction',
    icon: BotIcon,
    label: 'Guide des bots',
    description: 'Introduction complète au système de bots AlfyChat',
    color: 'text-accent',
    bg: 'bg-accent/8',
    border: 'border-accent/15',
  },
  {
    href: '/developers/docs/oauth2-introduction',
    icon: LockIcon,
    label: 'OAuth2',
    description: 'Flows d\'autorisation, scopes et échange de tokens',
    color: 'text-blue-400',
    bg: 'bg-blue-500/8',
    border: 'border-blue-500/15',
  },
  {
    href: '/developers/docs/gateway-websocket',
    icon: WifiIcon,
    label: 'WebSocket Gateway',
    description: 'Connexion temps-réel, événements et heartbeat',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/8',
    border: 'border-emerald-500/15',
  },
  {
    href: '/developers/docs/gateway-rest',
    icon: CodeIcon,
    label: 'API REST',
    description: 'Référence complète des endpoints HTTP',
    color: 'text-violet-400',
    bg: 'bg-violet-500/8',
    border: 'border-violet-500/15',
  },
];

export default function DevelopersPage() {
  const { user } = useAuth();
  const [botCount, setBotCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    api.getMyBots().then(res => {
      if (res.success && res.data) {
        setBotCount(((res.data as any).bots || []).length);
      }
    });
  }, [user]);

  return (
    <div className="min-h-full px-6 py-10 md:px-10 lg:px-14">
      <div className="mx-auto max-w-4xl space-y-12">

        {/* Hero */}
        <MotionFade direction="down" distance={10} duration={0.4}>
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/8 px-3 py-1">
              <span className="size-1.5 rounded-full bg-accent" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-accent">Portail développeur</span>
            </div>
            <h1 className="font-(family-name:--font-krona) text-3xl font-bold text-foreground leading-tight">
              Construisez sur<br />AlfyChat
            </h1>
            <p className="max-w-xl text-[14px] leading-relaxed text-muted-foreground">
              Créez des bots puissants, intégrez OAuth2 et connectez-vous à la Gateway en temps réel.
              Toute l&apos;infrastructure dont vous avez besoin pour enrichir l&apos;expérience de vos utilisateurs.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild size="sm">
                <Link href="/developers/bots/new">
                  <PlusIcon size={14} />
                  Nouveau bot
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/developers/docs/bots-introduction">
                  <BookOpenIcon size={14} />
                  Documentation
                </Link>
              </Button>
            </div>
          </div>
        </MotionFade>

        {/* Stats */}
        <MotionStagger className="grid grid-cols-3 gap-3">
          {[
            { icon: BotIcon, value: botCount !== null ? String(botCount) : '–', label: 'Mes bots', href: '/developers/bots', color: 'text-accent', bg: 'bg-accent/8' },
            { icon: BookOpenIcon, value: '50+', label: 'Pages de docs', href: '/developers/docs/gateway-rest', color: 'text-blue-400', bg: 'bg-blue-500/8' },
            { icon: ZapIcon, value: '80+', label: 'Événements WS', href: '/developers/docs/gateway-events', color: 'text-emerald-400', bg: 'bg-emerald-500/8' },
          ].map(stat => (
            <MotionStaggerItem key={stat.label}>
              <Link
                href={stat.href}
                className="group flex flex-col items-start gap-2 rounded-2xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm transition-colors hover:border-border no-underline"
              >
                <div className={cn('flex size-8 items-center justify-center rounded-xl', stat.bg)}>
                  <stat.icon size={15} className={stat.color} />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              </Link>
            </MotionStaggerItem>
          ))}
        </MotionStagger>

        {/* Démarrer en 3 étapes */}
        <MotionFade direction="up" distance={8} duration={0.4}>
          <div className="rounded-2xl border border-border/40 bg-card/60 p-6 backdrop-blur-sm">
            <p className="mb-5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
              Démarrer en 3 étapes
            </p>
            <div className="space-y-5">
              {STEPS.map(step => (
                <div key={step.number} className="flex items-start gap-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background">
                    <step.icon size={15} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground/40">{step.number}</span>
                      <p className="text-[13px] font-semibold text-foreground">{step.title}</p>
                    </div>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </MotionFade>

        {/* Quick links */}
        <div className="space-y-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">Accès rapides</p>
          <MotionStagger className="grid gap-3 sm:grid-cols-2">
            {QUICK_LINKS.map(link => (
              <MotionStaggerItem key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-2xl border p-4 transition-colors no-underline',
                    link.bg, link.border
                  )}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background/60">
                    <link.icon size={16} className={link.color} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-foreground">{link.label}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{link.description}</p>
                  </div>
                  <ArrowRightIcon size={13} className="shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </MotionStaggerItem>
            ))}
          </MotionStagger>
        </div>

      </div>
    </div>
  );
}
