'use client';

import Link from 'next/link';
import {
  BotIcon, KeyIcon, ZapIcon, CodeIcon, ServerIcon, TerminalIcon,
  ShieldCheckIcon, TagIcon, GlobeIcon, WifiIcon, AlertTriangleIcon,
  LockIcon, MessageCircleIcon, PlusIcon, ArrowRightIcon,
} from '@/components/icons';
import { Card, Chip } from '@heroui/react';

/* ─────────────────────────────────────────────────────────── */

interface DocCard {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  badge?: string;
}

const BOT_DOCS: DocCard[] = [
  { href: '/developers/docs/bots-introduction',  icon: BotIcon,          title: 'Introduction',          description: 'Architecture, concepts clés et flux de démarrage rapide pour créer votre premier bot AlfyChat.' },
  { href: '/developers/docs/bots-creation',      icon: PlusIcon,         title: 'Créer un Bot',           description: 'Enregistrement d\'un bot, gestion du token et mise à jour des métadonnées via l\'API REST.' },
  { href: '/developers/docs/bots-auth',          icon: KeyIcon,          title: 'Authentification',       description: 'Header Authorization: Bot, validation du token et gestion des erreurs d\'accès.' },
  { href: '/developers/docs/bots-messages',      icon: MessageCircleIcon,title: 'Envoyer des messages',   description: 'Envoyer des messages en DM, dans un salon ou en réponse via l\'API REST du gateway.' },
  { href: '/developers/docs/bots-commands',      icon: TerminalIcon,     title: 'Commandes',              description: 'Définir, créer et gérer les commandes de votre bot avec cooldown et matching de prefix.' },
  { href: '/developers/docs/bots-permissions',   icon: ShieldCheckIcon,  title: 'Permissions',            description: 'Système de permissions en bitmask — définir et vérifier les droits d\'un bot par serveur.' },
  { href: '/developers/docs/bots-certification', icon: TagIcon,          title: 'Certification',          description: 'Obtenir le badge officiel vérifié : prérequis, processus de review et bonnes pratiques.', badge: 'Officiel' },
];

const GATEWAY_DOCS: DocCard[] = [
  { href: '/developers/docs/gateway-overview',   icon: GlobeIcon,        title: 'Vue d\'ensemble',        description: 'URL de base, architecture microservices, protocoles HTTP + WebSocket et CORS.' },
  { href: '/developers/docs/gateway-auth',       icon: LockIcon,         title: 'Authentification',       description: 'JWT Bearer token, refresh, sessions WebSocket et extraction du userId.' },
  { href: '/developers/docs/gateway-rest',       icon: CodeIcon,         title: 'Référence REST',         description: 'Tous les endpoints REST du gateway — auth, users, messages, friends, servers, bots, media.', badge: 'Complet' },
  { href: '/developers/docs/gateway-websocket',  icon: WifiIcon,         title: 'WebSocket',              description: 'Connexion Socket.IO, rooms, heartbeat, READY event et gestion des déconnexions.' },
  { href: '/developers/docs/gateway-events',     icon: ZapIcon,          title: 'Événements',             description: 'Référence exhaustive de tous les events Socket.IO — direction, payload, exemples.', badge: 'Complet' },
  { href: '/developers/docs/gateway-limits',     icon: AlertTriangleIcon,title: 'Limites & Erreurs',      description: 'Rate limiting HTTP + WebSocket, codes d\'erreur, format des réponses d\'erreur.' },
];

function DocCardItem({ card }: { card: DocCard }) {
  const { icon: Icon } = card;
  return (
    <Link href={card.href} className="no-underline group">
      <Card className="h-full border border-border/50 bg-card/40 p-4 transition-all duration-200 hover:border-accent/40 hover:bg-card/80 hover:shadow-lg hover:shadow-accent/5">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20 transition-colors group-hover:bg-accent/20">
            <Icon size={16} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-foreground">{card.title}</span>
              {card.badge && (
                <Chip size="sm" color="success" variant="soft">
                  <Chip.Label className="text-[9px] font-bold">{card.badge}</Chip.Label>
                </Chip>
              )}
            </div>
            <p className="text-xs text-muted leading-relaxed">{card.description}</p>
          </div>
          <ArrowRightIcon size={14} className="shrink-0 text-muted/40 mt-0.5 transition-transform group-hover:translate-x-0.5 group-hover:text-accent/60" />
        </div>
      </Card>
    </Link>
  );
}

export default function DocsIndexPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">

      {/* Hero */}
      <div className="mb-12">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-semibold text-accent">
            <ZapIcon size={10} />
            Documentation officielle
          </span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          AlfyChat Developer Hub
        </h1>
        <p className="text-muted text-base max-w-2xl leading-relaxed">
          Tout ce dont vous avez besoin pour construire des bots et intégrer l&apos;API AlfyChat dans vos applications.
          Documentation complète avec exemples en JavaScript, TypeScript, Python et cURL.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/developers/docs/bots-introduction">
            <button className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 transition-colors">
              <BotIcon size={15} />
              Créer mon premier bot
            </button>
          </Link>
          <Link href="/developers/docs/gateway-overview">
            <button className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface/80 transition-colors">
              <GlobeIcon size={15} />
              Explorer l&apos;API Gateway
            </button>
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
        {[
          { label: 'Endpoints REST', value: '40+' },
          { label: 'Events WebSocket', value: '30+' },
          { label: 'Langages d\'exemples', value: '4' },
          { label: 'Microservices', value: '8' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border/50 bg-card/30 p-4 text-center">
            <div className="text-2xl font-bold text-accent tabular-nums">{value}</div>
            <div className="text-xs text-muted mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Bots section */}
      <section className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/15 ring-1 ring-violet-500/30">
            <BotIcon size={15} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-bold">Bots AlfyChat</h2>
            <p className="text-xs text-muted">Créer et gérer des bots automatisés sur la plateforme</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BOT_DOCS.map((card) => <DocCardItem key={card.href} card={card} />)}
        </div>
      </section>

      {/* Gateway section */}
      <section className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/15 ring-1 ring-blue-500/30">
            <GlobeIcon size={15} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold">Gateway API</h2>
            <p className="text-xs text-muted">API REST + WebSocket pour intégrer AlfyChat dans vos apps</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GATEWAY_DOCS.map((card) => <DocCardItem key={card.href} card={card} />)}
        </div>
      </section>

      {/* Footer note */}
      <div className="rounded-xl border border-border/40 bg-card/20 px-5 py-4 text-xs text-muted">
        <strong className="text-foreground">Base URL du Gateway :</strong>{' '}
        <code className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-accent">
          {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}
        </code>
        {' '}— toutes les routes REST commencent par{' '}
        <code className="rounded bg-surface px-1.5 py-0.5 font-mono">/api</code>
      </div>
    </div>
  );
}
