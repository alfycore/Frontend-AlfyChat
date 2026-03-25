'use client';

import { redirect } from 'next/navigation';
import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  BookOpenIcon,
  KeyIcon,
  ZapIcon,
  CodeIcon,
  ServerIcon,
  TerminalIcon,
  ShieldCheckIcon,
  TagIcon,
  CopyIcon,
  CheckIcon,
  GlobeIcon,
} from '@/components/icons';
import {
  Accordion,
  Card,
  Chip,
  ScrollShadow,
  Separator,
  Tabs,
  Tooltip,
  Button,
} from '@heroui/react';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────────────────── */
/* Primitives de mise en page                                  */
/* ─────────────────────────────────────────────────────────── */

function PageHeader({
  icon,
  title,
  description,
  badge,
}: {
  icon: any;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="mb-8 flex items-start gap-4">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent-soft-hover">
        <HugeiconsIcon icon={icon} size={22} className="text-accent" />
      </div>
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {badge && (
            <Chip size="sm" color="success" variant="soft">
              <Chip.Label className="text-[10px] font-bold">{badge}</Chip.Label>
            </Chip>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-accent/60">
      {children}
    </h2>
  );
}

function InfoCard({
  color,
  title,
  children,
}: {
  color: 'blue' | 'green' | 'violet' | 'amber' | 'red';
  title: string;
  children: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    blue: 'bg-blue-500/8 border-blue-500/20 text-blue-400',
    green: 'bg-green-500/8 border-green-500/20 text-green-400',
    violet: 'bg-violet-500/8 border-violet-500/20 text-violet-400',
    amber: 'bg-amber-500/8 border-amber-500/20 text-amber-400',
    red: 'bg-red-500/8 border-red-500/20 text-red-400',
  };
  return (
    <div className={cn('rounded-xl border p-4', styles[color])}>
      <p className="mb-1.5 text-xs font-bold">{title}</p>
      <div className="text-[11px] leading-relaxed opacity-80">{children}</div>
    </div>
  );
}

function HttpBadge({ method }: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT' }) {
  const styles: Record<string, string> = {
    GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    POST: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    PATCH: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    DELETE: 'bg-red-500/15 text-red-400 border-red-500/20',
    PUT: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  };
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
        styles[method],
      )}
    >
      {method}
    </span>
  );
}

function EndpointRow({
  method,
  path,
  desc,
}: {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  path: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-surface/40 px-3 py-2.5 transition-colors hover:bg-surface/70">
      <HttpBadge method={method} />
      <div className="min-w-0">
        <code className="text-xs font-semibold text-foreground">{path}</code>
        <p className="mt-0.5 text-[11px] text-muted">{desc}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* CodeBlock avec copie                                        */
/* ─────────────────────────────────────────────────────────── */

function CodeBlock({ title, lang = 'js', code }: { title?: string; lang?: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      {title && (
        <div className="flex items-center justify-between border-b border-border/60 bg-surface/80 px-4 py-2">
          <span className="font-mono text-[11px] text-muted">{title}</span>
          <div className="flex items-center gap-2">
            <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[9px] text-muted/60">
              {lang}
            </span>
            <Tooltip delay={0}>
              <Button size="sm" variant="ghost" isIconOnly className="size-6 min-w-0" onPress={copy}>
                <HugeiconsIcon
                  icon={copied ? CheckIcon : CopyIcon}
                  size={12}
                  className={copied ? 'text-green-400' : ''}
                />
              </Button>
              <Tooltip.Content>{copied ? 'Copié !' : 'Copier'}</Tooltip.Content>
            </Tooltip>
          </div>
        </div>
      )}
      <ScrollShadow orientation="horizontal">
        <pre className="bg-[#0d1117] p-4 text-[12px] leading-relaxed">
          <code className="font-mono text-gray-300 whitespace-pre">{code}</code>
        </pre>
      </ScrollShadow>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Sections de la documentation                               */
/* ─────────────────────────────────────────────────────────── */

function IntroSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={BookOpenIcon}
        title="Documentation API Bot"
        description="Guide complet pour créer des bots sur AlfyChat via API REST et WebSocket."
        badge="v2"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoCard color="blue" title="API REST">
          Toutes les opérations CRUD via HTTP avec authentification par token.
        </InfoCard>
        <InfoCard color="green" title="WebSocket">
          Événements temps réel via Socket.io — messages, présence, membres.
        </InfoCard>
        <InfoCard color="violet" title="Redis Pub/Sub">
          Événements interne du système pour les actions de bot.
        </InfoCard>
      </div>

      <Card className="border border-border/60 bg-surface/40">
        <Card.Content className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-accent/10">
              <HugeiconsIcon icon={GlobeIcon} size={16} className="text-accent" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted">Base URL</p>
              <code className="text-sm font-mono font-bold text-accent">
                https://gateway.alfychat.app
              </code>
            </div>
            <Separator orientation="vertical" className="mx-2 h-8" />
            <div>
              <p className="text-xs font-semibold text-muted">Préfixe routes bot</p>
              <code className="text-sm font-mono font-bold text-foreground">/api/bots</code>
            </div>
          </div>
        </Card.Content>
      </Card>

      <div className="space-y-2">
        <SectionTitle>Capacités d&apos;un bot</SectionTitle>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            'Envoyer & modifier des messages',
            'Réagir aux commandes en temps réel',
            'Écouter les événements serveur',
            'Gérer un système de commandes',
            'Interagir avec les membres',
            'Demander la certification publique',
          ].map((cap) => (
            <div
              key={cap}
              className="flex items-center gap-2 rounded-lg border border-border/40 bg-surface/30 px-3 py-2.5 text-sm"
            >
              <span className="size-1.5 shrink-0 rounded-full bg-accent" />
              {cap}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={KeyIcon}
        title="Authentification"
        description="Chaque bot dispose d'un token unique pour s'authentifier à l'API."
      />

      <InfoCard color="red" title="⚠️ Sécurité du token">
        <ul className="space-y-0.5 list-disc pl-4">
          <li>Ne commitez jamais le token dans un repo public</li>
          <li>Stockez-le dans des variables d&apos;environnement</li>
          <li>En cas de compromission, régénérez-le immédiatement</li>
        </ul>
      </InfoCard>

      <CodeBlock
        title="Header d'authentification"
        lang="http"
        code={`Authorization: Bot VOTRE_TOKEN_ICI`}
      />

      <CodeBlock
        title="Exemple — Authentification avec fetch"
        lang="js"
        code={`const BOT_TOKEN = process.env.BOT_TOKEN;

const response = await fetch('https://gateway.alfychat.app/api/bots/authenticate', {
  method: 'POST',
  headers: {
    'Authorization': \`Bot \${BOT_TOKEN}\`,
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
console.log('Bot connecté :', data.bot.name);`}
      />

      <CodeBlock
        title="Réponse — /api/bots/authenticate"
        lang="json"
        code={`// 200 OK
{
  "success": true,
  "bot": {
    "id": "uuid-...",
    "name": "MonBot",
    "status": "offline",
    "isVerified": false,
    "prefix": "!",
    "serverCount": 0
  }
}

// 401 Unauthorized
{
  "error": "Token de bot invalide"
}`}
      />
    </div>
  );
}

function QuickstartSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={ZapIcon}
        title="Démarrage rapide"
        description="Créez votre premier bot fonctionnel en moins de 5 minutes."
      />

      <div className="space-y-4">
        {[
          {
            step: 1,
            title: 'Créer un bot',
            desc: 'Dans l\'onglet "Mes Bots", cliquez sur "Créer un bot". Renseignez au minimum un nom.',
          },
          {
            step: 2,
            title: 'Copier le token',
            desc: 'Cliquez sur l\'icône de clé pour révéler et copier votre token.',
          },
          {
            step: 3,
            title: 'Installer les dépendances',
            code: `npm init -y\nnpm install socket.io-client dotenv`,
            lang: 'bash',
          },
          {
            step: 4,
            title: 'Créer le fichier principal',
            code: `require('dotenv').config();
const { io } = require('socket.io-client');

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_BASE  = 'https://gateway.alfychat.app/api';

const socket = io('https://gateway.alfychat.app', {
  auth: { token: BOT_TOKEN, type: 'bot' },
});

socket.on('connect', () => console.log('🤖 Bot connecté !'));

// Répondre aux commandes
socket.on('NEW_MESSAGE', async ({ content, channelId }) => {
  if (content === '!ping') {
    await fetch(\`\${API_BASE}/messages\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bot \${BOT_TOKEN}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channelId, content: '🏓 Pong !' }),
    });
  }
});`,
            lang: 'js',
            filename: 'bot.js',
          },
          {
            step: 5,
            title: 'Lancer le bot',
            code: `echo "BOT_TOKEN=votre_token_ici" > .env\nnode bot.js`,
            lang: 'bash',
          },
        ].map((s) => (
          <div key={s.step} className="flex gap-4">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
              {s.step}
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="font-semibold text-sm">{s.title}</h4>
              {s.desc && <p className="text-xs text-muted">{s.desc}</p>}
              {s.code && (
                <CodeBlock title={s.filename} lang={s.lang} code={s.code} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EndpointsSection() {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={CodeIcon}
        title="Référence API"
        description="Liste complète de tous les endpoints disponibles pour les bots."
      />

      {[
        {
          title: 'Gestion du bot',
          color: 'text-blue-400',
          routes: [
            { method: 'POST' as const, path: '/api/bots', desc: 'Créer un bot' },
            { method: 'GET' as const, path: '/api/bots/me', desc: 'Lister vos bots' },
            { method: 'GET' as const, path: '/api/bots/public', desc: 'Lister les bots publics (?search=&tag=)' },
            { method: 'GET' as const, path: '/api/bots/:id', desc: "Détails d'un bot" },
            { method: 'PATCH' as const, path: '/api/bots/:id', desc: "Mettre à jour un bot" },
            { method: 'DELETE' as const, path: '/api/bots/:id', desc: "Supprimer un bot" },
            { method: 'POST' as const, path: '/api/bots/:id/regenerate-token', desc: "Régénérer le token" },
            { method: 'PATCH' as const, path: '/api/bots/:id/status', desc: "Changer le statut (online/offline/maintenance)" },
            { method: 'POST' as const, path: '/api/bots/authenticate', desc: "Vérifier un token (Authorization: Bot TOKEN)" },
          ],
        },
        {
          title: 'Commandes',
          color: 'text-violet-400',
          routes: [
            { method: 'GET' as const, path: '/api/bots/:id/commands', desc: "Lister les commandes" },
            { method: 'POST' as const, path: '/api/bots/:id/commands', desc: "Créer une commande" },
            { method: 'PATCH' as const, path: '/api/bots/:id/commands/:cmdId', desc: "Modifier une commande" },
            { method: 'DELETE' as const, path: '/api/bots/:id/commands/:cmdId', desc: "Supprimer une commande" },
          ],
        },
        {
          title: 'Serveurs',
          color: 'text-emerald-400',
          routes: [
            { method: 'POST' as const, path: '/api/bots/:id/servers', desc: "Ajouter le bot à un serveur" },
            { method: 'DELETE' as const, path: '/api/bots/:id/servers/:serverId', desc: "Retirer le bot d'un serveur" },
            { method: 'GET' as const, path: '/api/bots/servers/:serverId', desc: "Bots d'un serveur" },
          ],
        },
        {
          title: 'Certification',
          color: 'text-amber-400',
          routes: [
            { method: 'POST' as const, path: '/api/bots/:id/certification', desc: "Demander la certification" },
            { method: 'GET' as const, path: '/api/bots/certification/pending', desc: "Demandes en attente (admin)" },
            { method: 'POST' as const, path: '/api/bots/certification/:requestId/review', desc: "Approuver/refuser (admin)" },
          ],
        },
      ].map((group) => (
        <div key={group.title}>
          <h3 className={cn('mb-3 text-sm font-bold', group.color)}>{group.title}</h3>
          <div className="space-y-1.5">
            {group.routes.map((r) => (
              <EndpointRow key={r.path + r.method} {...r} />
            ))}
          </div>
        </div>
      ))}

      <div className="space-y-4">
        <SectionTitle>Exemples de payload</SectionTitle>

        <Accordion>
          <Accordion.Item id="create-bot">
            <Accordion.Heading>
              <Accordion.Trigger>POST /api/bots — Créer un bot</Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="space-y-3">
                <CodeBlock
                  title="Requête"
                  lang="json"
                  code={`{
  "name": "MonBot",           // 2–32 caractères (obligatoire)
  "description": "Un bot génial",  // max 500 caractères
  "prefix": "!"               // 1–5 caractères (défaut: "!")
}`}
                />
                <CodeBlock
                  title="Réponse (201)"
                  lang="json"
                  code={`{
  "success": true,
  "bot": {
    "id": "a1b2c3d4-...",
    "name": "MonBot",
    "token": "abc123...",   // ⚠️ Affiché UNE seule fois
    "prefix": "!",
    "status": "offline",
    "isPublic": false,
    "isVerified": false,
    "certificationStatus": "none",
    "serverCount": 0,
    "tags": [],
    "commands": [],
    "createdAt": "2026-03-25T12:00:00.000Z"
  }
}`}
                />
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item id="update-bot">
            <Accordion.Heading>
              <Accordion.Trigger>PATCH /api/bots/:id — Modifier un bot</Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body>
                <CodeBlock
                  lang="json"
                  code={`{
  "name": "NouveauNom",
  "description": "Nouvelle description",
  "prefix": "!!",
  "isPublic": true,
  "tags": ["Modération", "Fun"],
  "websiteUrl": "https://monbot.fr",
  "supportServerUrl": "https://alfychat.app/invite/abc",
  "privacyPolicyUrl": "https://monbot.fr/privacy"
}`}
                />
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item id="create-cmd">
            <Accordion.Heading>
              <Accordion.Trigger>POST /api/bots/:id/commands — Créer une commande</Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="space-y-3">
                <CodeBlock
                  title="Requête"
                  lang="json"
                  code={`{
  "name": "help",
  "description": "Affiche la liste des commandes",
  "usage": "!help [commande]",
  "cooldown": 5
}`}
                />
                <CodeBlock
                  title="Réponse (201)"
                  lang="json"
                  code={`{
  "command": {
    "id": "cmd-uuid-...",
    "botId": "bot-uuid-...",
    "name": "help",
    "description": "Affiche la liste des commandes",
    "usage": "!help [commande]",
    "isEnabled": true,
    "cooldown": 5
  }
}`}
                />
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </div>
    </div>
  );
}

function WebSocketSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={ServerIcon}
        title="WebSocket & Temps réel"
        description="Connectez-vous au Gateway pour recevoir des événements en temps réel via Socket.io."
      />

      <CodeBlock
        title="Connexion au Gateway"
        lang="js"
        code={`const { io } = require('socket.io-client');

const socket = io('https://gateway.alfychat.app', {
  auth: {
    token: process.env.BOT_TOKEN,
    type: 'bot',  // Identifie la connexion comme un bot
  },
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

socket.on('connect', () => console.log('✅ Connecté'));
socket.on('disconnect', () => console.log('❌ Déconnecté'));`}
      />

      <div className="space-y-2">
        <SectionTitle>Événements disponibles</SectionTitle>
        <div className="overflow-hidden rounded-xl border border-border/60">
          <div className="grid grid-cols-3 gap-0 border-b border-border/60 bg-surface/60 px-4 py-2 text-[10px] font-bold uppercase text-muted/60">
            <span>Événement</span>
            <span>Description</span>
            <span>Payload clés</span>
          </div>
          {[
            { event: 'NEW_MESSAGE', desc: 'Nouveau message', payload: 'id, content, authorId, channelId, sender' },
            { event: 'MESSAGE_UPDATED', desc: 'Message modifié', payload: 'id, content, channelId' },
            { event: 'MESSAGE_DELETED', desc: 'Message supprimé', payload: 'id, channelId' },
            { event: 'TYPING_INDICATOR', desc: "L'utilisateur tape", payload: 'userId, channelId, isTyping' },
            { event: 'PRESENCE_UPDATE', desc: 'Changement de statut', payload: 'userId, status, isOnline' },
            { event: 'MEMBER_JOINED', desc: 'Nouveau membre', payload: 'serverId, userId, username' },
            { event: 'MEMBER_LEFT', desc: 'Membre parti', payload: 'serverId, userId' },
          ].map((e, i) => (
            <div
              key={e.event}
              className={cn(
                'grid grid-cols-3 gap-0 px-4 py-2.5',
                i % 2 === 0 ? 'bg-background/30' : 'bg-surface/20',
              )}
            >
              <code className="text-[11px] font-semibold text-emerald-400">{e.event}</code>
              <span className="text-[11px] text-muted">{e.desc}</span>
              <code className="text-[10px] text-muted/60">{e.payload}</code>
            </div>
          ))}
        </div>
      </div>

      <CodeBlock
        title="Écouter tous les événements"
        lang="js"
        code={`// Nouveaux messages → répondre aux commandes
socket.on('NEW_MESSAGE', async (msg) => {
  if (!msg.content.startsWith('!')) return;

  const [cmd, ...args] = msg.content.slice(1).split(' ');

  if (cmd === 'ping') {
    await fetch(\`\${API_BASE}/messages\`, {
      method: 'POST',
      headers: { 'Authorization': \`Bot \${BOT_TOKEN}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId: msg.channelId, content: '🏓 Pong !' }),
    });
  }
});

// Présence
socket.on('PRESENCE_UPDATE', ({ userId, status }) => {
  console.log(\`\${userId} → \${status}\`);
});

// Membres
socket.on('MEMBER_JOINED', ({ serverId, username }) => {
  console.log(\`\${username} a rejoint le serveur \${serverId}\`);
});`}
      />
    </div>
  );
}

function CommandsSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={TerminalIcon}
        title="Système de commandes"
        description="Enregistrez et gérez les commandes de votre bot de manière structurée."
      />

      <CodeBlock
        title="Handler de commandes — Pattern recommandé"
        lang="js"
        code={`class CommandHandler {
  constructor(prefix = '!') {
    this.prefix = prefix;
    this.commands = new Map();
  }

  register(name, handler, options = {}) {
    this.commands.set(name, {
      handler,
      cooldown: options.cooldown || 0,
      cooldowns: new Map(),
    });
  }

  async handle(message) {
    if (!message.content.startsWith(this.prefix)) return;

    const parts = message.content.slice(this.prefix.length).split(' ');
    const name  = parts.shift()?.toLowerCase();
    const args  = parts;
    const cmd   = this.commands.get(name);
    if (!cmd) return;

    // Vérifier le cooldown
    const now = Date.now();
    const last = cmd.cooldowns.get(message.authorId) || 0;
    if (now - last < cmd.cooldown * 1000) return;
    cmd.cooldowns.set(message.authorId, now);

    await cmd.handler(message, args);
  }
}

// Usage
const handler = new CommandHandler('!');

handler.register('ping', async (msg) => {
  await sendMessage(msg.channelId, '🏓 Pong !');
}, { cooldown: 5 });

handler.register('avatar', async (msg, [userId]) => {
  const target = userId || msg.authorId;
  const user   = await getUser(target);
  await sendMessage(msg.channelId, user.avatarUrl || 'Pas d\\'avatar');
});

socket.on('NEW_MESSAGE', (msg) => handler.handle(msg));`}
      />

      <CodeBlock
        title="Envoyer et manipuler des messages"
        lang="js"
        code={`const HEADERS = {
  'Authorization': \`Bot \${BOT_TOKEN}\`,
  'Content-Type': 'application/json',
};

// Envoyer un message
async function sendMessage(channelId, content, options = {}) {
  const res = await fetch(\`\${API_BASE}/messages\`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ channelId, content, ...options }),
  });
  return res.json();
}

// Message avec réponse
await sendMessage('channel-id', 'Réponse !', { replyToId: 'message-id' });

// Modifier
await fetch(\`\${API_BASE}/messages/\${msgId}\`, {
  method: 'PATCH',
  headers: HEADERS,
  body: JSON.stringify({ content: 'Modifié' }),
});

// Supprimer
await fetch(\`\${API_BASE}/messages/\${msgId}\`, {
  method: 'DELETE',
  headers: HEADERS,
});

// Auto-supprimé après 5s
async function sendTemp(channelId, content, delay = 5000) {
  const data = await sendMessage(channelId, content);
  setTimeout(() => deleteMessage(data.id), delay);
}`}
      />
    </div>
  );
}

function CertificationSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldCheckIcon}
        title="Certification"
        description="Obtenez le badge de vérification pour votre bot et bénéficiez d'une meilleure visibilité."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border border-border/60 bg-surface/40">
          <Card.Header>
            <Card.Title className="text-sm">Critères requis</Card.Title>
          </Card.Header>
          <Card.Content>
            <ul className="space-y-1.5 text-[12px] text-muted">
              {[
                'Bot fonctionnel et stable',
                'Description claire et complète',
                'Politique de confidentialité renseignée',
                'Contenu conforme aux CGU',
                'Au moins 1 serveur actif',
                'Commandes documentées',
              ].map((c) => (
                <li key={c} className="flex items-center gap-2">
                  <span className="size-1 shrink-0 rounded-full bg-emerald-400" />
                  {c}
                </li>
              ))}
            </ul>
          </Card.Content>
        </Card>
        <Card className="border border-accent-soft-hover bg-accent/5">
          <Card.Header>
            <Card.Title className="text-sm text-accent">Avantages</Card.Title>
          </Card.Header>
          <Card.Content>
            <ul className="space-y-1.5 text-[12px] text-muted">
              {[
                'Badge ✓ visible partout',
                'Classement prioritaire dans la recherche',
                'Badge "Verified Bot Developer" sur votre profil',
                'Accès aux fonctionnalités avancées',
                'Support prioritaire',
              ].map((a) => (
                <li key={a} className="flex items-center gap-2">
                  <span className="size-1 shrink-0 rounded-full bg-accent" />
                  {a}
                </li>
              ))}
            </ul>
          </Card.Content>
        </Card>
      </div>

      <CodeBlock
        title="POST /api/bots/:id/certification"
        lang="json"
        code={`// Requête
{
  "reason": "MonBot de modération est utilisé par 50+ serveurs.
             Il propose l'auto-mod, les logs et les avertissements.
             Politique de confidentialité : https://monbot.fr/privacy"
}

// Réponse (201 Created)
{
  "success": true,
  "requestId": "req-uuid-..."
}

// Le statut du bot passe à "pending". Un admin examinera votre demande.`}
      />
    </div>
  );
}

function ErrorsSection() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={TagIcon}
        title="Codes d'erreur"
        description="Référence des codes HTTP retournés par l'API et format des réponses d'erreur."
      />

      <div className="overflow-hidden rounded-xl border border-border/60">
        <div className="border-b border-border/60 bg-surface/60 px-4 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted/60">
            Codes HTTP
          </span>
        </div>
        {[
          { code: 200, label: 'OK', desc: 'Requête réussie', color: 'text-emerald-400' },
          { code: 201, label: 'Created', desc: 'Ressource créée avec succès', color: 'text-emerald-400' },
          { code: 400, label: 'Bad Request', desc: 'Données invalides ou manquantes', color: 'text-amber-400' },
          { code: 401, label: 'Unauthorized', desc: 'Token invalide ou manquant', color: 'text-red-400' },
          { code: 403, label: 'Forbidden', desc: 'Permissions insuffisantes', color: 'text-red-400' },
          { code: 404, label: 'Not Found', desc: 'Ressource introuvable', color: 'text-orange-400' },
          { code: 429, label: 'Too Many Requests', desc: 'Rate limit atteint', color: 'text-red-400' },
          { code: 500, label: 'Internal Server Error', desc: 'Erreur serveur interne', color: 'text-red-400' },
          { code: 502, label: 'Bad Gateway', desc: 'Microservice bot indisponible', color: 'text-red-400' },
        ].map((e, i) => (
          <div
            key={e.code}
            className={cn(
              'flex items-center gap-4 px-4 py-3',
              i % 2 === 0 ? 'bg-background/20' : 'bg-surface/20',
            )}
          >
            <code className={cn('w-9 shrink-0 font-mono text-sm font-bold', e.color)}>
              {e.code}
            </code>
            <span className="w-28 shrink-0 text-[11px] font-semibold text-foreground/70">
              {e.label}
            </span>
            <span className="text-[11px] text-muted">{e.desc}</span>
          </div>
        ))}
      </div>

      <CodeBlock
        title="Format des réponses d'erreur"
        lang="json"
        code={`// Erreur de validation (400)
{
  "error": "Données invalides",
  "details": [
    { "field": "name", "message": "Nom requis (2–32 caractères)" }
  ]
}

// Authentification (401)
{ "error": "Token de bot invalide" }

// Rate limit (429)
{
  "error": "Rate limit atteint",
  "retryAfter": 30   // secondes à attendre
}

// Erreur serveur (500)
{ "error": "Erreur lors de la création du bot" }`}
      />

      <div className="space-y-2">
        <SectionTitle>Rate limits</SectionTitle>
        <div className="overflow-hidden rounded-xl border border-border/60">
          {[
            { route: 'Global', limit: '100 req / 60s' },
            { route: 'POST /messages', limit: '5 msg / 5s par channel' },
            { route: 'PATCH /bots/:id', limit: '2 req / 10s' },
            { route: 'POST /bots/:id/regenerate-token', limit: '1 req / 60s' },
          ].map((r, i) => (
            <div
              key={r.route}
              className={cn(
                'flex items-center justify-between px-4 py-2.5',
                i % 2 === 0 ? 'bg-background/20' : 'bg-surface/20',
              )}
            >
              <code className="text-xs font-mono">{r.route}</code>
              <Chip size="sm" variant="soft" color="warning">
                <Chip.Label className="text-[10px]">{r.limit}</Chip.Label>
              </Chip>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DocsPage() {
  redirect('/developers/docs/introduction');
}
