'use client';

import Link from 'next/link';
import {
  BotIcon, KeyIcon, ZapIcon, CodeIcon, ServerIcon, TerminalIcon,
  ShieldCheckIcon, TagIcon, GlobeIcon, WifiIcon, AlertTriangleIcon,
  LockIcon, MessageCircleIcon, PlusIcon, ArrowRightIcon, BookOpenIcon,
  UserPlusIcon,
} from '@/components/icons';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/* ─────────────────────────────────────────────────────────── */

interface DocCard {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  badge?: string;
}

const BOT_DOCS: DocCard[] = [
  {
    href: '/developers/docs/bots-introduction',
    icon: BotIcon,
    title: 'Introduction',
    description: 'Architecture d\'un bot AlfyChat, cycle de vie, flux de démarrage, connexion Socket.IO et exemple de bot minimal en 4 langages.',
  },
  {
    href: '/developers/docs/bots-creation',
    icon: PlusIcon,
    title: 'Créer un Bot',
    description: 'Enregistrement via POST /api/bots, récupération du token (affiché une seule fois), modification des métadonnées et suppression.',
  },
  {
    href: '/developers/docs/bots-auth',
    icon: KeyIcon,
    title: 'Authentification',
    description: 'Header Authorization: Bot <token>, validation du token côté bot, gestion des 401/403 et bonnes pratiques de stockage sécurisé.',
  },
  {
    href: '/developers/docs/bots-messages',
    icon: MessageCircleIcon,
    title: 'Envoyer des messages',
    description: 'Envoi de messages en DM, dans un salon de serveur ou en réponse — REST et WebSocket, mentions et pièces jointes.',
  },
  {
    href: '/developers/docs/bots-commands',
    icon: TerminalIcon,
    title: 'Commandes',
    description: 'Déclaration de commandes par prefix, cooldown par utilisateur/serveur, parsing des arguments et aide automatique.',
  },
  {
    href: '/developers/docs/bots-permissions',
    icon: ShieldCheckIcon,
    title: 'Permissions',
    description: 'Système de permissions en bitmask — SEND_MESSAGES, MANAGE_MEMBERS, BAN_MEMBERS, ADMINISTRATOR — vérification runtime.',
  },
  {
    href: '/developers/docs/bots-certification',
    icon: TagIcon,
    title: 'Certification',
    description: 'Obtenir le badge officiel ✅ : prérequis (100+ serveurs, conformité RGPD), processus de review et avantages techniques.',
    badge: 'Officiel',
  },
];

const GATEWAY_MAIN: DocCard[] = [
  {
    href: '/developers/docs/gateway-overview',
    icon: GlobeIcon,
    title: 'Vue d\'ensemble',
    description: 'URL de base (https://gateway.alfychat.app), architecture 8 microservices, en-têtes communs, CORS et format des réponses JSON.',
  },
  {
    href: '/developers/docs/gateway-auth',
    icon: LockIcon,
    title: 'Authentification',
    description: 'JWT Bearer (15 min) + refresh token (1 an), sessions WebSocket, révocation de session et bonnes pratiques de sécurité.',
  },
  {
    href: '/developers/docs/gateway-rest',
    icon: CodeIcon,
    title: 'Référence REST',
    description: 'Vue d\'ensemble des 50+ endpoints REST — routes, auth requise, pagination par curseur et format général des erreurs.',
    badge: '50+',
  },
  {
    href: '/developers/docs/gateway-websocket',
    icon: WifiIcon,
    title: 'WebSocket',
    description: 'Connexion Socket.IO v4, rooms auto-jointes, heartbeat 30s, event READY, gestion des déconnexions et CALL_REJOIN.',
  },
  {
    href: '/developers/docs/gateway-events',
    icon: ZapIcon,
    title: 'Événements',
    description: 'Référence des 80+ events Socket.IO — appels WebRTC, messages DM/serveur, présence, archive P2P et groupes.',
    badge: '80+',
  },
  {
    href: '/developers/docs/gateway-limits',
    icon: AlertTriangleIcon,
    title: 'Limites & Erreurs',
    description: 'Rate limiting (100 req/min global, 5 msg/5s WebSocket), codes HTTP, format d\'erreur JSON et wrapper de retry avec backoff.',
  },
];

const REST_SUBSECTIONS: DocCard[] = [
  {
    href: '/developers/docs/gateway-rest-auth',
    icon: KeyIcon,
    title: 'Auth & RGPD',
    description: 'Inscription, connexion, refresh, révocation de session. Droits RGPD : export ZIP de données et suppression irréversible de compte.',
  },
  {
    href: '/developers/docs/gateway-rest-users',
    icon: BookOpenIcon,
    title: 'Utilisateurs',
    description: 'Profil complet, modification du displayName/bio/avatar, préférences (thème, langue, notifications), statut de présence et lastSeen.',
  },
  {
    href: '/developers/docs/gateway-rest-messages',
    icon: MessageCircleIcon,
    title: 'Messages & Conversations',
    description: 'CRUD messages DM/groupe, réactions, pagination par curseur UUID, notifications et système d\'archive P2P hybride client/serveur.',
  },
  {
    href: '/developers/docs/gateway-rest-friends',
    icon: UserPlusIcon,
    title: 'Amis & Appels',
    description: 'Demandes d\'ami, acceptation/refus, blocage/déblocage, side-effects WebSocket temps réel et historique des appels audio/vidéo.',
  },
  {
    href: '/developers/docs/gateway-rest-servers',
    icon: ServerIcon,
    title: 'Serveurs',
    description: 'CRUD serveurs, channels (text/voice/announcement), membres, rôles, invitations, upload de fichiers et routing vers server-nodes.',
  },
  {
    href: '/developers/docs/gateway-rest-bots',
    icon: BotIcon,
    title: 'Bots',
    description: 'Création, authentification, gestion des commandes, ajout dans les serveurs, annuaire public et soumission à la certification.',
  },
  {
    href: '/developers/docs/gateway-rest-media',
    icon: TerminalIcon,
    title: 'Médias',
    description: 'Upload multipart/form-data par type (avatars, banners, icons, attachments), CDN géo-distribué EU/US et conversion auto WebP.',
  },
  {
    href: '/developers/docs/gateway-rest-admin',
    icon: ShieldCheckIcon,
    title: 'Admin & Monitoring',
    description: 'Stats rate-limiting, ban/déban d\'IP, monitoring des microservices, gestion des incidents, status public et endpoints internes.',
  },
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
                <Badge variant="secondary" className="text-[9px] font-bold px-1.5 py-0">{card.badge}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{card.description}</p>
          </div>
          <ArrowRightIcon size={14} className="shrink-0 text-muted-foreground/40 mt-0.5 transition-transform group-hover:translate-x-0.5 group-hover:text-accent/60" />
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
        <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
          Construisez des bots et intégrez l&apos;API AlfyChat dans vos applications.
          Documentation complète avec exemples en JavaScript, TypeScript, Python et cURL.
          Développé par <strong className="text-foreground">AlfyCore</strong> (Association loi 1901, France).
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
          { label: 'Endpoints REST', value: '50+' },
          { label: 'Événements WebSocket', value: '80+' },
          { label: 'Langages d\'exemples', value: '4' },
          { label: 'Microservices', value: '8' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border/50 bg-card/30 p-4 text-center">
            <div className="text-2xl font-bold text-accent tabular-nums">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
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
            <p className="text-xs text-muted-foreground">Créer et gérer des bots automatisés sur la plateforme</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BOT_DOCS.map((card) => <DocCardItem key={card.href} card={card} />)}
        </div>
      </section>

      {/* Gateway section */}
      <section className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/15 ring-1 ring-blue-500/30">
            <GlobeIcon size={15} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold">Gateway API</h2>
            <p className="text-xs text-muted-foreground">API REST + WebSocket Socket.IO — point d&apos;entrée unique vers tous les microservices</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GATEWAY_MAIN.map((card) => <DocCardItem key={card.href} card={card} />)}
        </div>
      </section>

      {/* REST sub-sections */}
      <section className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30">
            <CodeIcon size={14} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold">Référence REST — par ressource</h2>
            <p className="text-xs text-muted-foreground">Documentation détaillée endpoint par endpoint avec exemples de code</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {REST_SUBSECTIONS.map((card) => <DocCardItem key={card.href} card={card} />)}
        </div>
      </section>

      {/* Compliance note */}
      <div className="mb-6 rounded-xl border border-border/40 bg-card/20 px-5 py-4">
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheckIcon size={14} className="text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-foreground">Sécurité & conformité RGPD</span>
        </div>
        <div className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
          <p>
            Les messages privés (DM) supportent le <strong className="text-foreground">chiffrement de bout en bout (E2EE)</strong> via
            le champ <code className="rounded bg-surface px-1 font-mono">senderContent</code> et le paramètre <code className="rounded bg-surface px-1 font-mono">e2eeType</code> sur les events WebSocket.
          </p>
          <p>
            Conformément au <strong className="text-foreground">Règlement (UE) 2016/679 (RGPD)</strong>, AlfyCore propose l&apos;export
            complet des données (<code className="rounded bg-surface px-1 font-mono">GET /api/rgpd/export</code>) et la suppression
            définitive de compte (<code className="rounded bg-surface px-1 font-mono">DELETE /api/rgpd/account</code>).
            Contact conformité : <code className="rounded bg-surface px-1 font-mono">contact@alfycore.org</code>.
          </p>
        </div>
      </div>

      {/* Footer note */}
      <div className="rounded-xl border border-border/40 bg-card/20 px-5 py-4 text-xs text-muted-foreground">
        <strong className="text-foreground">Base URL :</strong>{' '}
        <code className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-accent">https://gateway.alfychat.app</code>
        {' '}— préfixe REST :{' '}
        <code className="rounded bg-surface px-1.5 py-0.5 font-mono">/api</code>
        {' '}· Support :{' '}
        <code className="rounded bg-surface px-1.5 py-0.5 font-mono">contact@alfycore.org</code>
      </div>
    </div>
  );
}
