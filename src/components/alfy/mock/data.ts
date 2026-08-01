/**
 * Alfy — jeux de données mock (français, réalistes) pour /uitest.
 * Uniquement importé par les pages /uitest ; jetable au rebranchage.
 */

import type {
  AlfyApiKey,
  AlfyAuditEntry,
  AlfyBadge,
  AlfyBadgeId,
  AlfyBan,
  AlfyBot,
  AlfyCallParticipant,
  AlfyDeviceKey,
  AlfyDM,
  AlfyGroupDM,
  AlfyInvite,
  AlfyMessage,
  AlfyNodeLog,
  AlfyNodeStatus,
  AlfyServer,
  AlfySession,
  AlfySlashCommand,
  AlfyUser,
  AlfyWebhook,
} from './types';
import { PERMISSIONS } from './types';

const avatar = (n: number) => `https://i.pravatar.cc/160?img=${n}`;
const banner = (seed: string) => `https://picsum.photos/seed/${seed}/480/160`;

/** Défs de badges mock — le vrai shape backend est libre (id/nom/icône/couleur). */
const MOCK_BADGE_DEFS: Record<AlfyBadgeId, AlfyBadge> = {
  staff: { id: 'staff', name: 'Équipe AlfyChat', icon: '🛡️', color: '#8b5cf6' },
  developer: { id: 'developer', name: 'Développeur·se', icon: '💻', color: '#0ea5e9' },
  'self-host': { id: 'self-host', name: 'Auto-hébergé·e', icon: '🖥️', color: '#10b981' },
  verified: { id: 'verified', name: 'Vérifié·e', icon: '✅', color: '#22c55e' },
  early: { id: 'early', name: 'Pionnier·ère', icon: '✨', color: '#f59e0b' },
  'bug-hunter': { id: 'bug-hunter', name: 'Chasseur·se de bugs', icon: '🐛', color: '#ef4444' },
};
const badge = (id: AlfyBadgeId): AlfyBadge => MOCK_BADGE_DEFS[id];

/* ── Utilisateurs ───────────────────────────────────────────────────────── */

export const CURRENT_USER: AlfyUser = {
  id: 'u-me',
  username: 'karlo',
  displayName: 'Karlo',
  avatarUrl: avatar(12),
  bannerUrl: banner('alfy-karlo'),
  bio: '🛠️ Je construis AlfyChat\n🧀 Souveraineté numérique & fromages de garde\n🔐 Le chiffrement, c’est pas une option',
  status: 'online',
  customStatus: 'ship /uitest',
  statusEmoji: '🚀',
  interests: ['souveraineté', 'self-hosting', 'fromage', 'HeroUI'],
  badges: [badge('staff'), badge('developer'), badge('self-host'), badge('early')],
  createdAt: '2024-03-02T10:00:00.000Z',
};

export const USERS: AlfyUser[] = [
  CURRENT_USER,
  {
    id: 'u-lea',
    username: 'lea.dsgn',
    displayName: 'Léa',
    avatarUrl: avatar(47),
    bannerColor: '#ec4899',
    bio: '🎨 Designer produit\n💜 Je défends les utilisateurs, pas les KPI\n✏️ Figma, prototypes & micro-interactions',
    status: 'online',
    customStatus: 'Figma ouvert depuis 6 h',
    statusEmoji: '🎨',
    interests: ['design produit', 'typographie', 'accessibilité'],
    badges: [badge('early'), badge('verified')],
    createdAt: '2024-05-14T09:00:00.000Z',
  },
  {
    id: 'u-marc',
    username: 'marcopolo',
    displayName: 'Marc',
    avatarUrl: avatar(53),
    bannerUrl: banner('alfy-marc'),
    bio: 'Backend & infra. Mon homelab chauffe le salon.',
    status: 'idle',
    badges: [badge('self-host'), badge('bug-hunter')],
    createdAt: '2024-06-01T18:30:00.000Z',
  },
  {
    id: 'u-nadia',
    username: 'nadia_sec',
    displayName: 'Nadia',
    avatarUrl: avatar(32),
    bannerColor: '#0f766e',
    bio: 'Sécurité offensive le jour, tricot le soir.',
    status: 'dnd',
    customStatus: 'audit en cours',
    badges: [badge('verified'), badge('bug-hunter')],
    createdAt: '2024-08-19T14:00:00.000Z',
  },
  {
    id: 'u-theo',
    username: 'theo.dev',
    displayName: 'Théo',
    avatarUrl: avatar(15),
    bannerColor: '#4f46e5',
    bio: 'Étudiant en info, mainteneur du bot Alfybot.',
    status: 'online',
    badges: [badge('developer')],
    createdAt: '2025-01-10T11:00:00.000Z',
  },
  {
    id: 'u-ines',
    username: 'ines.g',
    displayName: 'Inès',
    avatarUrl: avatar(44),
    bannerColor: '#d97706',
    status: 'online',
    badges: [badge('early')],
    bio: 'Modératrice bénévole. Douce mais ferme.',
    createdAt: '2024-09-30T20:15:00.000Z',
  },
  {
    id: 'u-sam',
    username: 'sam_ovh',
    displayName: 'Sam',
    avatarUrl: avatar(68),
    status: 'idle',
    badges: [badge('self-host')],
    createdAt: '2025-02-22T08:45:00.000Z',
  },
  {
    id: 'u-julie',
    username: 'juliette',
    displayName: 'Julie',
    avatarUrl: avatar(25),
    status: 'offline',
    lastSeenAt: '2026-07-16T21:30:00.000Z',
    interests: ['jeux de société', 'rando'],
    badges: [],
    createdAt: '2025-03-05T16:00:00.000Z',
  },
  {
    id: 'u-antoine',
    username: 'antoine.b',
    displayName: 'Antoine',
    avatarUrl: avatar(59),
    status: 'offline',
    lastSeenAt: '2026-07-14T08:10:00.000Z',
    badges: [badge('early')],
    createdAt: '2024-11-11T12:00:00.000Z',
  },
  {
    id: 'u-chloe',
    username: 'chloe.dev',
    displayName: 'Chloé',
    avatarUrl: avatar(38),
    bannerUrl: banner('alfy-chloe'),
    status: 'online',
    badges: [badge('developer'), badge('verified')],
    bio: 'Front-end, accessibilité, café.',
    createdAt: '2025-04-01T09:30:00.000Z',
  },
  {
    id: 'u-yanis',
    username: 'yanis75',
    displayName: 'Yanis',
    avatarUrl: avatar(61),
    status: 'invisible',
    badges: [],
    createdAt: '2025-05-17T19:00:00.000Z',
  },
  {
    id: 'u-alfybot',
    username: 'alfybot',
    displayName: 'Alfybot',
    avatarUrl: avatar(65),
    bannerColor: '#7c3aed',
    status: 'online',
    badges: [badge('verified')],
    bio: 'Bot officiel de modération et de bienvenue.',
    isBot: true,
    isVerifiedBot: true,
    createdAt: '2024-04-01T00:00:00.000Z',
  },
];

export const userById = (id: string): AlfyUser =>
  USERS.find((u) => u.id === id) ?? {
    id,
    username: 'inconnu',
    displayName: 'Utilisateur inconnu',
    status: 'offline',
    badges: [],
    createdAt: '2024-01-01T00:00:00.000Z',
  };

/** Demandes d'amis en attente (mock, partagé popover ↔ vue Amis). */
export const PENDING_FRIENDS: { userId: string; direction: 'incoming' | 'outgoing' }[] = [
  { userId: 'u-yanis', direction: 'incoming' },
  { userId: 'u-antoine', direction: 'outgoing' },
];

/** État de relation initial d'un utilisateur (dérivé des DMs + demandes). */
export const friendStateOf = (userId: string): import('./types').AlfyFriendState => {
  const pending = PENDING_FRIENDS.find((p) => p.userId === userId);
  if (pending) return pending.direction === 'incoming' ? 'pending_received' : 'pending_sent';
  if (DMS.some((d) => d.recipientId === userId)) return 'friends';
  return 'none';
};

/** Serveurs en commun entre l'utilisateur courant et un autre (réel, depuis les données). */
export const mutualServersOf = (userId: string): AlfyServer[] =>
  SERVERS.filter(
    (s) => s.members.some((m) => m.userId === 'u-me') && s.members.some((m) => m.userId === userId),
  );

/** Amis en commun (mock : proxy sur les DMs, hors la personne visée). */
export const mutualFriendsOf = (userId: string): AlfyUser[] =>
  DMS.map((d) => d.recipientId)
    .filter((id) => id !== userId)
    .map(userById)
    .slice(0, 4);

/** Bitmask cumulé de tous les rôles d'un membre sur un serveur donné. */
export const getMemberPermissions = (server: AlfyServer, userId: string): number => {
  const member = server.members.find((m) => m.userId === userId);
  if (!member) return 0;
  return server.roles
    .filter((r) => member.roleIds.includes(r.id))
    .reduce((acc, r) => acc | r.permissions, 0);
};

/* ── Serveurs ───────────────────────────────────────────────────────────── */

const communRoles = [
  {
    id: 'r-owner',
    name: 'Fondation',
    color: '#a78bfa',
    emoji: '🛡️',
    permissions: PERMISSIONS.ADMIN,
    hoisted: true,
    position: 0,
  },
  {
    id: 'r-mod',
    name: 'Modération',
    color: '#38bdf8',
    emoji: '🔧',
    permissions:
      PERMISSIONS.READ |
      PERMISSIONS.SEND |
      PERMISSIONS.REACT |
      PERMISSIONS.MANAGE_MESSAGES |
      PERMISSIONS.KICK_MEMBERS,
    hoisted: true,
    position: 1,
  },
  {
    id: 'r-dev',
    name: 'Contributeurs',
    color: '#4ade80',
    emoji: '💻',
    permissions: PERMISSIONS.READ | PERMISSIONS.SEND | PERMISSIONS.REACT,
    hoisted: true,
    position: 2,
  },
  {
    id: 'r-member',
    name: 'Membres',
    color: '#94a3b8',
    permissions: PERMISSIONS.READ | PERMISSIONS.SEND | PERMISSIONS.REACT,
    hoisted: false,
    position: 3,
  },
];

export const SERVERS: AlfyServer[] = [
  {
    id: 's-alfy',
    name: 'AlfyChat · Communauté',
    iconUrl: undefined,
    isPublic: true,
    ownerId: 'u-me',
    nodeOnline: true,
    selfHosted: true,
    mentionCount: 3,
    unread: true,
    categories: [
      { id: 'c-accueil', name: 'Accueil' },
      { id: 'c-general', name: 'Discussions' },
      { id: 'c-dev', name: 'Développement' },
      { id: 'c-special', name: 'Salons spéciaux' },
      { id: 'c-support', name: 'Entraide' },
      { id: 'c-vocal', name: 'Salons vocaux' },
    ],
    channels: [
      { id: 'ch-annonces', serverId: 's-alfy', name: 'annonces', type: 'announcement', topic: 'Nouveautés officielles d’AlfyChat', categoryId: 'c-accueil', unreadCount: 1, mentionCount: 0 },
      { id: 'ch-regles', serverId: 's-alfy', name: 'règles', type: 'text', topic: 'À lire avant de participer', categoryId: 'c-accueil', unreadCount: 0, mentionCount: 0 },
      { id: 'ch-general', serverId: 's-alfy', name: 'général', type: 'text', topic: 'Discussions libres — restez courtois·es', categoryId: 'c-general', unreadCount: 4, mentionCount: 2 },
      { id: 'ch-detente', serverId: 's-alfy', name: 'détente', type: 'text', topic: 'Memes, photos de chats, recettes', categoryId: 'c-general', unreadCount: 0, mentionCount: 0 },
      { id: 'ch-frontend', serverId: 's-alfy', name: 'frontend', type: 'text', topic: 'HeroUI v3, Next.js, accessibilité', categoryId: 'c-dev', unreadCount: 7, mentionCount: 1 },
      { id: 'ch-backend', serverId: 's-alfy', name: 'backend', type: 'text', topic: 'Gateway, microservices, Socket.IO', categoryId: 'c-dev', unreadCount: 0, mentionCount: 0 },
      { id: 'ch-forum', serverId: 's-alfy', name: 'forum', type: 'forum', topic: 'Sujets de discussion approfondis', categoryId: 'c-special', unreadCount: 0, mentionCount: 0 },
      { id: 'ch-galerie', serverId: 's-alfy', name: 'galerie', type: 'gallery', topic: 'Partagez vos captures et créations', categoryId: 'c-special', unreadCount: 0, mentionCount: 0 },
      { id: 'ch-media', serverId: 's-alfy', name: 'médiathèque', type: 'media', topic: 'Vidéos, streams, tutos', categoryId: 'c-special', unreadCount: 0, mentionCount: 0 },
      { id: 'ch-charte', serverId: 's-alfy', name: 'charte', type: 'doc', topic: 'Document collaboratif de la communauté', categoryId: 'c-special', unreadCount: 0, mentionCount: 0 },
      { id: 'ch-sondages', serverId: 's-alfy', name: 'sondages', type: 'poll', topic: 'Votez pour orienter le projet', categoryId: 'c-special', unreadCount: 0, mentionCount: 0 },
      { id: 'ch-suggestions', serverId: 's-alfy', name: 'suggestions', type: 'suggestion', topic: 'Proposez et votez des idées', categoryId: 'c-special', unreadCount: 0, mentionCount: 0 },
      { id: 'ch-comptage', serverId: 's-alfy', name: 'comptage', type: 'counting', topic: 'Comptez ensemble sans vous tromper', categoryId: 'c-special', unreadCount: 0, mentionCount: 0 },
      { id: 'ch-jeux', serverId: 's-alfy', name: 'jeux', type: 'minigame', topic: 'Mini-jeux entre membres', categoryId: 'c-special', unreadCount: 0, mentionCount: 0 },
      { id: 'ch-trivia', serverId: 's-alfy', name: 'trivia', type: 'trivia', topic: 'Quiz communautaire', categoryId: 'c-special', unreadCount: 0, mentionCount: 0 },
      { id: 'ch-vent', serverId: 's-alfy', name: 'vent', type: 'vent', topic: 'Espace d’écoute bienveillant', categoryId: 'c-special', unreadCount: 0, mentionCount: 0 },
      { id: 'ch-selfhost', serverId: 's-alfy', name: 'auto-hébergement', type: 'text', topic: 'Docker, server-node, domaines', categoryId: 'c-support', unreadCount: 2, mentionCount: 0 },
      { id: 'ch-aide', serverId: 's-alfy', name: 'aide', type: 'text', topic: 'Posez vos questions ici', categoryId: 'c-support', unreadCount: 0, mentionCount: 0 },
      { id: 'ch-salon', serverId: 's-alfy', name: 'Salon principal', type: 'voice', categoryId: 'c-vocal', unreadCount: 0, mentionCount: 0 },
      { id: 'ch-focus', serverId: 's-alfy', name: 'Focus · coworking', type: 'voice', categoryId: 'c-vocal', unreadCount: 0, mentionCount: 0 },
    ],
    roles: communRoles,
    members: [
      { userId: 'u-me', roleIds: ['r-owner'], joinedAt: '2024-03-02T10:00:00.000Z' },
      { userId: 'u-ines', roleIds: ['r-mod'], joinedAt: '2024-09-30T20:20:00.000Z' },
      { userId: 'u-nadia', roleIds: ['r-mod'], joinedAt: '2024-08-19T14:10:00.000Z' },
      { userId: 'u-lea', roleIds: ['r-dev'], joinedAt: '2024-05-14T09:05:00.000Z' },
      { userId: 'u-theo', roleIds: ['r-dev'], joinedAt: '2025-01-10T11:05:00.000Z' },
      { userId: 'u-chloe', roleIds: ['r-dev'], joinedAt: '2025-04-01T09:35:00.000Z' },
      { userId: 'u-marc', roleIds: ['r-dev'], joinedAt: '2024-06-01T18:35:00.000Z' },
      { userId: 'u-sam', roleIds: ['r-member'], joinedAt: '2025-02-22T08:50:00.000Z' },
      { userId: 'u-julie', roleIds: ['r-member'], joinedAt: '2025-03-05T16:05:00.000Z' },
      { userId: 'u-antoine', roleIds: ['r-member'], joinedAt: '2024-11-11T12:05:00.000Z' },
      { userId: 'u-yanis', roleIds: ['r-member'], joinedAt: '2025-05-17T19:05:00.000Z' },
      { userId: 'u-alfybot', roleIds: ['r-member'], joinedAt: '2024-04-01T00:05:00.000Z' },
    ],
  },
  {
    id: 's-homelab',
    name: 'Homelab FR',
    isPublic: true,
    ownerId: 'u-marc',
    nodeOnline: true,
    selfHosted: true,
    mentionCount: 0,
    unread: true,
    categories: [{ id: 'c-hl', name: 'Général' }],
    channels: [
      { id: 'ch-hl-gen', serverId: 's-homelab', name: 'général', type: 'text', categoryId: 'c-hl', unreadCount: 12, mentionCount: 0 },
      { id: 'ch-hl-proxmox', serverId: 's-homelab', name: 'proxmox', type: 'text', categoryId: 'c-hl', unreadCount: 0, mentionCount: 0 },
    ],
    roles: communRoles.slice(2),
    members: [
      { userId: 'u-marc', roleIds: ['r-dev'], joinedAt: '2024-06-02T10:00:00.000Z' },
      { userId: 'u-me', roleIds: ['r-member'], joinedAt: '2024-06-03T10:00:00.000Z' },
      { userId: 'u-sam', roleIds: ['r-member'], joinedAt: '2025-02-23T10:00:00.000Z' },
    ],
  },
  {
    id: 's-jeux',
    name: 'Soirées jeux 🎲',
    isPublic: false,
    ownerId: 'u-lea',
    nodeOnline: false,
    selfHosted: false,
    mentionCount: 1,
    unread: true,
    categories: [{ id: 'c-jx', name: 'Général' }],
    channels: [
      { id: 'ch-jx-gen', serverId: 's-jeux', name: 'général', type: 'text', categoryId: 'c-jx', unreadCount: 2, mentionCount: 1 },
      { id: 'ch-jx-vocal', serverId: 's-jeux', name: 'Table de jeu', type: 'voice', categoryId: 'c-jx', unreadCount: 0, mentionCount: 0 },
    ],
    roles: communRoles.slice(3),
    members: [
      { userId: 'u-lea', roleIds: ['r-member'], joinedAt: '2025-01-01T10:00:00.000Z' },
      { userId: 'u-me', roleIds: ['r-member'], joinedAt: '2025-01-02T10:00:00.000Z' },
      { userId: 'u-julie', roleIds: ['r-member'], joinedAt: '2025-01-03T10:00:00.000Z' },
    ],
  },
  {
    id: 's-asso',
    name: 'Asso Libre & Ouvert',
    isPublic: true,
    ownerId: 'u-nadia',
    nodeOnline: true,
    selfHosted: true,
    mentionCount: 0,
    unread: false,
    categories: [{ id: 'c-as', name: 'Général' }],
    channels: [
      { id: 'ch-as-gen', serverId: 's-asso', name: 'général', type: 'text', categoryId: 'c-as', unreadCount: 0, mentionCount: 0 },
    ],
    roles: communRoles.slice(3),
    members: [
      { userId: 'u-nadia', roleIds: ['r-member'], joinedAt: '2024-10-01T10:00:00.000Z' },
      { userId: 'u-me', roleIds: ['r-member'], joinedAt: '2024-10-02T10:00:00.000Z' },
    ],
  },
];

/* ── Messages (salon #frontend du serveur AlfyChat) ─────────────────────── */

export const MESSAGES: AlfyMessage[] = [
  {
    id: 'm-1',
    channelId: 'ch-frontend',
    authorId: 'u-lea',
    content:
      'Bonjour tout le monde ! Je viens de pousser les nouvelles maquettes du **panneau de paramètres**. Les retours sont bienvenus avant vendredi 🙏',
    createdAt: '2026-07-16T09:12:00.000Z',
    encrypted: true,
    reactions: [
      { emoji: '👍', count: 4, me: true },
      { emoji: '🔥', count: 2, me: false },
    ],
    attachments: [],
    mentions: [],
  },
  {
    id: 'm-2',
    channelId: 'ch-frontend',
    authorId: 'u-lea',
    content: 'Le lien du prototype est ici : https://heroui.com',
    createdAt: '2026-07-16T09:13:10.000Z',
    encrypted: true,
    reactions: [],
    attachments: [],
    linkPreview: {
      url: 'https://heroui.com',
      siteName: 'heroui.com',
      title: 'HeroUI v3 — Beautiful, fast, modern React UI',
      description:
        'Composants accessibles construits sur Tailwind CSS v4 et React Aria, avec un système de thème OKLCH.',
    },
    mentions: [],
  },
  {
    id: 'm-3',
    channelId: 'ch-frontend',
    authorId: 'u-chloe',
    content:
      'Superbe travail ! Petite remarque : le contraste du texte secondaire passe sous 4.5:1 en mode clair, il faudra ajuster `--muted`.',
    createdAt: '2026-07-16T09:20:45.000Z',
    encrypted: true,
    reactions: [{ emoji: '👀', count: 1, me: false }],
    attachments: [],
    replyToId: 'm-1',
    mentions: [],
  },
  {
    id: 'm-4',
    channelId: 'ch-frontend',
    authorId: 'u-theo',
    content:
      '@Karlo est-ce qu’on garde `motion` pour les transitions de panneau ou on passe tout en CSS ? J’ai un POC des deux côtés.',
    createdAt: '2026-07-16T10:02:00.000Z',
    encrypted: true,
    reactions: [],
    attachments: [],
    mentions: ['u-me'],
    threadId: 't-anim',
    threadCount: 8,
  },
  {
    id: 'm-5',
    channelId: 'ch-frontend',
    authorId: 'u-me',
    content:
      'CSS d’abord, `motion` seulement quand on a besoin d’orchestration. Les micro-transitions de 150–200 ms suffisent presque partout.',
    createdAt: '2026-07-16T10:05:30.000Z',
    encrypted: true,
    reactions: [{ emoji: '💯', count: 3, me: false }],
    attachments: [],
    replyToId: 'm-4',
    mentions: [],
  },
  {
    id: 'm-6',
    channelId: 'ch-frontend',
    authorId: 'u-marc',
    content: 'Capture du dashboard node avec le nouveau thème sombre :',
    createdAt: '2026-07-16T14:41:00.000Z',
    encrypted: true,
    reactions: [{ emoji: '🤩', count: 2, me: true }],
    attachments: [
      {
        id: 'a-1',
        name: 'node-dashboard-sombre.png',
        size: 482_133,
        mimeType: 'image/png',
        url: 'https://picsum.photos/seed/alfynode/640/360',
        width: 640,
        height: 360,
      },
    ],
    mentions: [],
  },
  {
    id: 'm-7',
    channelId: 'ch-frontend',
    authorId: 'u-nadia',
    content:
      'Rappel sécurité : tout ce qui touche aux clés doit rester côté client. Le badge E2E ne doit s’afficher *que* si le message a réellement été chiffré, pas par défaut.',
    createdAt: '2026-07-16T15:12:00.000Z',
    encrypted: true,
    reactions: [{ emoji: '🔐', count: 5, me: true }],
    attachments: [],
    pinned: true,
    mentions: [],
  },
  {
    id: 'm-inv',
    channelId: 'ch-frontend',
    authorId: 'u-theo',
    content: 'Venez tester le bot sur le serveur de dev 👇',
    createdAt: '2026-07-17T08:00:00.000Z',
    encrypted: true,
    reactions: [],
    attachments: [],
    invite: { code: 'homelab-fr', serverId: 's-homelab' },
    mentions: [],
  },
  {
    id: 'm-8',
    channelId: 'ch-frontend',
    authorId: 'u-alfybot',
    content:
      'Bienvenue @Sam sur le serveur ! Passe lire le salon `règles` et présente-toi quand tu veux 👋',
    createdAt: '2026-07-17T08:30:00.000Z',
    encrypted: false,
    reactions: [{ emoji: '👋', count: 6, me: true }],
    attachments: [],
    mentions: ['u-sam'],
  },
  {
    id: 'm-9',
    channelId: 'ch-frontend',
    authorId: 'u-sam',
    content: 'Merci ! Content d’être là. J’héberge déjà mon node sur un vieux NUC, ça tourne nickel.',
    createdAt: '2026-07-17T08:34:20.000Z',
    encrypted: true,
    reactions: [],
    attachments: [],
    mentions: [],
  },
  {
    id: 'm-10',
    channelId: 'ch-frontend',
    authorId: 'u-me',
    content:
      'Point d’étape : la refonte `/uitest` avance bien. Composer, réactions et fils sont posés. Prochaine étape : les **paramètres serveur** avec l’éditeur de rôles.',
    createdAt: '2026-07-17T09:15:00.000Z',
    encrypted: true,
    reactions: [
      { emoji: '🚀', count: 4, me: false },
      { emoji: '🎉', count: 2, me: false },
    ],
    attachments: [],
    pinned: true,
    mentions: [],
  },
];

export const THREAD_MESSAGES: AlfyMessage[] = [
  {
    id: 'tm-1',
    channelId: 'ch-frontend',
    authorId: 'u-theo',
    content: 'POC CSS : 4 ko de styles, aucune dépendance, mais les interruptions de transition sont moins propres.',
    createdAt: '2026-07-16T10:10:00.000Z',
    encrypted: true,
    reactions: [],
    attachments: [],
    mentions: [],
    threadId: 't-anim',
  },
  {
    id: 'tm-2',
    channelId: 'ch-frontend',
    authorId: 'u-chloe',
    content: 'Pense à `prefers-reduced-motion` dans les deux cas — c’est non négociable pour l’accessibilité.',
    createdAt: '2026-07-16T10:12:30.000Z',
    encrypted: true,
    reactions: [{ emoji: '✅', count: 2, me: true }],
    attachments: [],
    mentions: [],
    threadId: 't-anim',
  },
  {
    id: 'tm-3',
    channelId: 'ch-frontend',
    authorId: 'u-me',
    content: 'Validé. CSS par défaut + fallback immédiat si reduced-motion. On documente ça dans le guide de contrib.',
    createdAt: '2026-07-16T10:20:00.000Z',
    encrypted: true,
    reactions: [],
    attachments: [],
    mentions: [],
    threadId: 't-anim',
  },
];

/* ── DMs ────────────────────────────────────────────────────────────────── */

export const DMS: AlfyDM[] = [
  { id: 'dm-1', recipientId: 'u-lea', lastMessage: 'Je t’envoie la maquette ce soir', lastMessageAt: '2026-07-17T08:55:00.000Z', unreadCount: 2 },
  { id: 'dm-2', recipientId: 'u-marc', lastMessage: 'Le node a redémarré tout seul 👀', lastMessageAt: '2026-07-16T22:10:00.000Z', unreadCount: 0 },
  { id: 'dm-3', recipientId: 'u-nadia', lastMessage: 'Rapport d’audit envoyé', lastMessageAt: '2026-07-15T17:40:00.000Z', unreadCount: 0 },
];

export const GROUP_DMS: AlfyGroupDM[] = [
  {
    id: 'g-1',
    name: 'Équipe design',
    memberIds: ['u-me', 'u-lea', 'u-chloe'],
    lastMessage: 'Léa : on valide la V2 ?',
    lastMessageAt: '2026-07-17T09:02:00.000Z',
    unreadCount: 3,
  },
  {
    id: 'g-2',
    memberIds: ['u-me', 'u-marc', 'u-sam', 'u-theo'],
    lastMessage: 'Sam : mon node tourne enfin 🎉',
    lastMessageAt: '2026-07-16T20:15:00.000Z',
    unreadCount: 0,
  },
];

/** Utilisateurs bloqués (mock). */
export const BLOCKED_USER_IDS = ['u-yanis'];

export const NOTIFICATIONS: import('./types').AlfyNotification[] = [
  { id: 'n-1', type: 'mention', actorId: 'u-theo', text: 't’a mentionné dans', context: '#frontend', createdAt: '2026-07-17T10:02:00.000Z', read: false },
  { id: 'n-2', type: 'reply', actorId: 'u-chloe', text: 'a répondu à ton message', context: '#frontend', createdAt: '2026-07-17T09:20:00.000Z', read: false },
  { id: 'n-3', type: 'friend', actorId: 'u-yanis', text: 't’a envoyé une demande d’ami', createdAt: '2026-07-16T18:00:00.000Z', read: false },
  { id: 'n-4', type: 'mention', actorId: 'u-nadia', text: 't’a mentionné dans', context: '#backend', createdAt: '2026-07-16T15:12:00.000Z', read: true },
  { id: 'n-5', type: 'system', text: 'Ton nœud auto-hébergé est de nouveau en ligne', createdAt: '2026-07-16T12:00:00.000Z', read: true },
];

/* ── Appels ─────────────────────────────────────────────────────────────── */

export const CALL_PARTICIPANTS: AlfyCallParticipant[] = [
  { userId: 'u-me', speaking: false, muted: false, videoOn: true, screenSharing: false, network: { latencyMs: 23, lossPct: 0.1, bitrateKbps: 2480 } },
  { userId: 'u-lea', speaking: true, muted: false, videoOn: true, screenSharing: false, network: { latencyMs: 41, lossPct: 0.4, bitrateKbps: 1920 } },
];

export const VOICE_ROOM_PARTICIPANTS: AlfyCallParticipant[] = [
  { userId: 'u-me', speaking: false, muted: false, videoOn: false, screenSharing: false, network: { latencyMs: 23, lossPct: 0.1, bitrateKbps: 96 } },
  { userId: 'u-theo', speaking: true, muted: false, videoOn: false, screenSharing: true, network: { latencyMs: 38, lossPct: 0.2, bitrateKbps: 1650 } },
  { userId: 'u-chloe', speaking: false, muted: false, videoOn: true, screenSharing: false, network: { latencyMs: 52, lossPct: 0.8, bitrateKbps: 1280 } },
  { userId: 'u-ines', speaking: false, muted: true, videoOn: false, screenSharing: false, network: { latencyMs: 29, lossPct: 0.1, bitrateKbps: 64 } },
  { userId: 'u-marc', speaking: false, muted: false, videoOn: false, screenSharing: false, network: { latencyMs: 120, lossPct: 3.2, bitrateKbps: 48 } },
  { userId: 'u-sam', speaking: false, muted: true, videoOn: false, screenSharing: false, network: { latencyMs: 66, lossPct: 1.1, bitrateKbps: 56 } },
];

/* ── Settings serveur ───────────────────────────────────────────────────── */

export const INVITES: AlfyInvite[] = [
  { code: 'alfy-bienvenue', createdBy: 'u-me', uses: 148, maxUses: null, expiresAt: null },
  { code: 'x7Kd2p', createdBy: 'u-ines', uses: 12, maxUses: 50, expiresAt: '2026-08-01T00:00:00.000Z' },
  { code: 'meetup-juillet', createdBy: 'u-lea', uses: 34, maxUses: 100, expiresAt: '2026-07-31T23:59:00.000Z' },
];

export const BANS: AlfyBan[] = [
  { userId: 'u-yanis', reason: 'Spam répété après trois avertissements', bannedBy: 'u-ines', bannedAt: '2026-06-12T21:04:00.000Z' },
];

export const AUDIT_LOG: AlfyAuditEntry[] = [
  { id: 'al-1', actorId: 'u-ines', action: 'A supprimé un message', target: '#général', createdAt: '2026-07-17T07:58:00.000Z' },
  { id: 'al-2', actorId: 'u-me', action: 'A créé le rôle', target: 'Contributeurs', createdAt: '2026-07-16T18:20:00.000Z' },
  { id: 'al-3', actorId: 'u-nadia', action: 'A expulsé', target: '@troll_2000', createdAt: '2026-07-15T22:41:00.000Z' },
  { id: 'al-4', actorId: 'u-me', action: 'A vérifié le domaine', target: 'chat.alfy.fr', createdAt: '2026-07-14T10:12:00.000Z' },
];

/* ── Settings utilisateur ───────────────────────────────────────────────── */

export const SESSIONS: AlfySession[] = [
  { id: 'sess-1', device: 'Firefox · Windows 11', location: 'Lyon, France', lastActiveAt: '2026-07-17T09:20:00.000Z', current: true },
  { id: 'sess-2', device: 'Application mobile · Android', location: 'Lyon, France', lastActiveAt: '2026-07-16T23:05:00.000Z', current: false },
  { id: 'sess-3', device: 'Safari · macOS', location: 'Paris, France', lastActiveAt: '2026-07-10T14:30:00.000Z', current: false },
];

export const DEVICE_KEYS: AlfyDeviceKey[] = [
  { deviceId: 'dev-1', deviceName: 'PC principal', fingerprint: '5A2F 91C3 0B7E 44D8 A1F0 62E9 3C5B 88A7', verified: true, createdAt: '2024-03-02T10:05:00.000Z' },
  { deviceId: 'dev-2', deviceName: 'Pixel 9', fingerprint: 'E83D 07AA 6F21 B94C 55D2 1E8F 74A0 C36B', verified: true, createdAt: '2025-02-14T12:00:00.000Z' },
  { deviceId: 'dev-3', deviceName: 'MacBook (bureau)', fingerprint: '9C41 D5E8 22B7 F06A 8834 A9D1 5E7C 40F2', verified: false, createdAt: '2026-07-10T14:28:00.000Z' },
];

/* ── Node auto-hébergé ──────────────────────────────────────────────────── */

export const NODE_STATUS: AlfyNodeStatus = {
  online: true,
  version: '1.4.2',
  uptimeSec: 1_123_432,
  messagesStored: 184_302,
  diskUsedMb: 2_140,
  diskTotalMb: 10_240,
  domain: 'chat.alfy.fr',
  domainVerified: true,
};

export const NODE_LOGS: AlfyNodeLog[] = [
  { id: 'l-1', ts: '2026-07-17T09:21:44.000Z', level: 'info', message: 'MSG_BROADCAST ch-frontend → gateway (12 destinataires)' },
  { id: 'l-2', ts: '2026-07-17T09:21:43.000Z', level: 'info', message: 'MSG_FORWARD reçu, stocké en SQLite (id=m-10)' },
  { id: 'l-3', ts: '2026-07-17T09:18:02.000Z', level: 'debug', message: 'Heartbeat gateway OK (23 ms)' },
  { id: 'l-4', ts: '2026-07-17T08:52:10.000Z', level: 'warn', message: 'Espace disque à 21 % — pensez à la rotation des médias' },
  { id: 'l-5', ts: '2026-07-17T08:30:01.000Z', level: 'info', message: 'Membre u-sam rejoint via invitation alfy-bienvenue' },
  { id: 'l-6', ts: '2026-07-17T06:00:00.000Z', level: 'info', message: 'Sauvegarde quotidienne terminée (2.1 Go, 34 s)' },
  { id: 'l-7', ts: '2026-07-16T23:41:19.000Z', level: 'error', message: 'Reconnexion Socket.IO après coupure réseau (tentative 2/5)' },
  { id: 'l-8', ts: '2026-07-16T23:41:12.000Z', level: 'warn', message: 'Connexion gateway perdue — bascule en file d’attente locale' },
  { id: 'l-9', ts: '2026-07-16T18:20:33.000Z', level: 'info', message: 'ROLE_CREATE « Contributeurs » synchronisé' },
  { id: 'l-10', ts: '2026-07-16T12:00:00.000Z', level: 'info', message: 'server-node v1.4.2 démarré (Docker, node 22)' },
];

/* ── Portail développeur ────────────────────────────────────────────────── */

export const BOTS: AlfyBot[] = [
  {
    id: 'b-1',
    name: 'Alfybot',
    avatarUrl: avatar(65),
    description: 'Modération automatique, messages de bienvenue et anti-spam.',
    public: true,
    serverCount: 42,
    createdAt: '2024-04-01T00:00:00.000Z',
  },
  {
    id: 'b-2',
    name: 'Sondage Express',
    description: 'Crée des sondages en une commande, résultats en temps réel.',
    public: false,
    serverCount: 3,
    createdAt: '2025-11-20T15:00:00.000Z',
  },
];

export const API_KEYS: AlfyApiKey[] = [
  { id: 'k-1', name: 'CI de production', prefix: 'alfy_live_9f2c…', createdAt: '2025-06-01T10:00:00.000Z', lastUsedAt: '2026-07-17T08:00:00.000Z' },
  { id: 'k-2', name: 'Tests locaux', prefix: 'alfy_test_e81a…', createdAt: '2026-02-10T09:00:00.000Z', lastUsedAt: null },
];

export const WEBHOOKS: AlfyWebhook[] = [
  { id: 'w-1', url: 'https://ci.alfy.fr/hooks/deploy', events: ['MESSAGE_CREATE', 'MEMBER_JOIN'], active: true },
  { id: 'w-2', url: 'https://example.fr/webhook-test', events: ['MEMBER_BAN'], active: false },
];

/* ── Slash commands (composer) ──────────────────────────────────────────── */

export const SLASH_COMMANDS: AlfySlashCommand[] = [
  { name: 'giphy', description: 'Chercher un GIF', args: '[termes]' },
  { name: 'sondage', description: 'Créer un sondage rapide', args: '[question] [options…]' },
  { name: 'chuchote', description: 'Message visible par vous seul·e', args: '[texte]' },
  { name: 'des', description: 'Lancer des dés', args: '[NdF, ex. 2d6]' },
  { name: 'rappel', description: 'Programmer un rappel', args: '[durée] [texte]' },
];

/* ── Emojis du picker ───────────────────────────────────────────────────── */

export const EMOJI_SET: { category: string; emojis: string[] }[] = [
  { category: 'Fréquents', emojis: ['👍', '❤️', '😂', '🔥', '🎉', '👀', '💯', '🚀', '🙏', '😅', '🔐', '👋'] },
  { category: 'Visages', emojis: ['😀', '😃', '😄', '😁', '😆', '🥹', '😊', '😇', '🙂', '😉', '😌', '😍', '🤩', '😘', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '🤯', '😳', '🥶', '😱', '🤗', '🤔', '🫡', '🤫', '🫠', '🙄', '😴', '🤤'] },
  { category: 'Gestes', emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👏', '🙌', '🤝', '💪', '🫶', '☝️', '👆', '👇', '👈', '👉', '✋', '🤚', '🖐️'] },
  { category: 'Objets', emojis: ['💻', '🖥️', '⌨️', '🖱️', '📱', '🔋', '💾', '📷', '🎧', '🎮', '🔧', '🔨', '⚙️', '🔒', '🔓', '🔑', '🛡️', '📦', '📚', '☕'] },
  { category: 'Nature', emojis: ['🌱', '🌿', '🍀', '🌸', '🌻', '🌙', '⭐', '⚡', '🔥', '🌈', '☀️', '☁️', '❄️', '🌊', '🐱', '🐶', '🦊', '🐢', '🦉', '🐝'] },
];

/* ── GIFs du picker (mock) ───────────────────────────────────────────────── */

export interface AlfyGif {
  id: string;
  label: string;
  url: string;
  width: number;
  height: number;
}

const gif = (id: string, label: string, seed: string, w = 220, h = 160): AlfyGif => ({
  id,
  label,
  url: `https://picsum.photos/seed/${seed}/${w}/${h}`,
  width: w,
  height: h,
});

export const GIF_CATEGORIES: { category: string; gifs: AlfyGif[] }[] = [
  {
    category: 'Tendances',
    gifs: [
      gif('g-1', 'Applaudissements', 'alfy-clap', 220, 180),
      gif('g-2', 'Ça va exploser', 'alfy-mindblown', 220, 140),
      gif('g-3', 'Bien joué', 'alfy-thumbsup', 220, 200),
      gif('g-4', 'On y va', 'alfy-letsgo', 220, 160),
    ],
  },
  {
    category: 'Réactions',
    gifs: [
      gif('g-5', 'Rire aux éclats', 'alfy-lol', 220, 180),
      gif('g-6', 'Facepalm', 'alfy-facepalm', 220, 150),
      gif('g-7', 'Popcorn', 'alfy-popcorn', 220, 190),
      gif('g-8', 'Panique', 'alfy-panic', 220, 160),
    ],
  },
  {
    category: 'Salutations',
    gifs: [
      gif('g-9', 'Coucou', 'alfy-wave', 220, 170),
      gif('g-10', 'Bienvenue', 'alfy-welcome', 220, 200),
      gif('g-11', 'À plus', 'alfy-bye', 220, 150),
    ],
  },
];
