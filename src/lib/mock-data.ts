export type Status = "online" | "away" | "dnd" | "offline";

export interface MockUser {
  id: string;
  name: string;
  avatar?: string;
  status: Status;
  customStatus?: string;
  initials: string;
  pronouns?: string;
  bio?: string;
  roles?: { label: string; color: string }[];
  memberSince?: string;
}

export interface MockMessage {
  id: string;
  author: MockUser;
  content: string;
  timestamp: Date;
  edited?: boolean;
  reactions?: { emoji: string; count: number; reacted: boolean }[];
}

export interface MockChannel {
  id: string;
  name: string;
  type: "text" | "voice" | "forum" | "announce";
  unread: number;
  mention: boolean;
  locked?: boolean;
}

export interface MockServer {
  id: string;
  name: string;
  initials: string;
  color: string;
  members: number;
  unread: number;
  mention: boolean;
  channels: MockChannel[];
}

export interface MockDM {
  id: string;
  user: MockUser;
  lastMessage: string;
  unread: number;
  mention: boolean;
}

export const CURRENT_USER: MockUser = {
  id: "me",
  name: "Wil Tark",
  status: "online",
  customStatus: "En train de coder 🔥",
  initials: "WT",
  pronouns: "il/lui",
  bio: "Développeur full-stack · fan de design propre et de café ☕",
  memberSince: "12 janv. 2024",
  roles: [
    { label: "Fondateur", color: "oklch(60% 0.21 350)" },
    { label: "Dev", color: "oklch(58% 0.20 252)" },
  ],
};

export const MOCK_USERS: MockUser[] = [
  {
    id: "u1", name: "Alice Martin", status: "online", initials: "AM",
    customStatus: "Disponible", pronouns: "elle",
    bio: "Designer produit. J'adore les micro-interactions ✨",
    memberSince: "3 mars 2024",
    roles: [
      { label: "Designer", color: "oklch(62% 0.16 220)" },
      { label: "Modératrice", color: "oklch(58% 0.20 150)" },
    ],
  },
  {
    id: "u2", name: "Bob Dupont", status: "away", initials: "BD",
    bio: "Backend & infra. Toujours en train de débugger un truc.",
    memberSince: "21 mai 2024",
    roles: [{ label: "Dev", color: "oklch(58% 0.20 252)" }],
  },
  {
    id: "u3", name: "Clara Santos", status: "dnd", initials: "CS",
    customStatus: "Ne pas déranger", pronouns: "elle",
    memberSince: "8 févr. 2024",
    roles: [{ label: "Membre", color: "oklch(66% 0.16 85)" }],
  },
  { id: "u4", name: "David Lee", status: "online", initials: "DL", memberSince: "14 juin 2024" },
  { id: "u5", name: "Emma Wilson", status: "offline", initials: "EW", memberSince: "2 avr. 2024" },
  {
    id: "u6", name: "Félix Bernard", status: "online", initials: "FB",
    bio: "QA & tests. Si ça casse, c'est de ma faute (ou pas).",
    memberSince: "30 juil. 2024",
    roles: [{ label: "QA", color: "oklch(64% 0.19 55)" }],
  },
];

export const MOCK_SERVERS: MockServer[] = [
  {
    id: "s1",
    name: "AlfyChat Dev",
    initials: "AC",
    color: "oklch(55% 0.22 289)",
    members: 923,
    unread: 5,
    mention: true,
    channels: [
      { id: "c1", name: "général", type: "text", unread: 3, mention: true },
      { id: "c2", name: "annonces", type: "announce", unread: 0, mention: false, locked: true },
      { id: "c3", name: "design-feedback", type: "forum", unread: 1, mention: false },
      { id: "c4", name: "aide", type: "text", unread: 0, mention: false },
      { id: "c5", name: "vocal-général", type: "voice", unread: 0, mention: false },
      { id: "c6", name: "vocal-dev", type: "voice", unread: 0, mention: false },
    ],
  },
  {
    id: "s2",
    name: "Design Club",
    initials: "DC",
    color: "oklch(60% 0.22 20)",
    members: 102,
    unread: 2,
    mention: false,
    channels: [
      { id: "c7", name: "inspiration", type: "text", unread: 0, mention: false },
      { id: "c8", name: "critiques", type: "forum", unread: 0, mention: false },
      { id: "c9", name: "ressources", type: "text", unread: 0, mention: false },
      { id: "c10", name: "vocal-review", type: "voice", unread: 0, mention: false },
    ],
  },
  {
    id: "s3",
    name: "Gaming Night",
    initials: "GN",
    color: "oklch(62% 0.22 145)",
    members: 26,
    unread: 0,
    mention: false,
    channels: [
      { id: "c11", name: "lobby", type: "text", unread: 12, mention: false },
      { id: "c12", name: "lfg", type: "text", unread: 0, mention: false },
      { id: "c13", name: "vocal-game", type: "voice", unread: 0, mention: false },
    ],
  },
  {
    id: "s4",
    name: "Travail",
    initials: "TW",
    color: "oklch(58% 0.16 200)",
    members: 113,
    unread: 4,
    mention: false,
    channels: [
      { id: "c14", name: "général", type: "text", unread: 0, mention: false },
      { id: "c15", name: "projets", type: "forum", unread: 0, mention: false },
      { id: "c16", name: "standups", type: "voice", unread: 0, mention: false },
    ],
  },
];

export const MOCK_DMS: MockDM[] = [
  { id: "dm1", user: MOCK_USERS[0], lastMessage: "Tu as vu le nouveau design ?", unread: 2, mention: false },
  { id: "dm2", user: MOCK_USERS[1], lastMessage: "Ça marche, merci !", unread: 0, mention: false },
  { id: "dm3", user: MOCK_USERS[2], lastMessage: "Je regarde ça ce soir 🔥", unread: 0, mention: false },
  { id: "dm4", user: MOCK_USERS[3], lastMessage: "T'es dispo pour un call ?", unread: 1, mention: true },
  { id: "dm5", user: MOCK_USERS[4], lastMessage: "Parfait, à demain", unread: 0, mention: false },
];

const now = new Date();
const m = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000);

export const MOCK_MESSAGES: MockMessage[] = [
  {
    id: "msg1",
    author: MOCK_USERS[0],
    content: "Salut tout le monde ! 👋 Quelqu'un a regardé le nouveau prototype UI ?",
    timestamp: m(45),
  },
  {
    id: "msg2",
    author: MOCK_USERS[1],
    content: "Oui ! J'adore la direction glassmorphism. Le nav rail est super clean.",
    timestamp: m(43),
    reactions: [
      { emoji: "🔥", count: 4, reacted: false },
      { emoji: "👍", count: 2, reacted: true },
    ],
  },
  {
    id: "msg3",
    author: MOCK_USERS[2],
    content: "La palette oklch rend vraiment bien en dark mode. Beaucoup plus de profondeur qu'un simple #1a1a2e.",
    timestamp: m(40),
  },
  {
    id: "msg4",
    author: MOCK_USERS[3],
    content: "Le composer flottant avec le `rounded-2xl` c'est exactement ce qu'il manquait à l'ancienne UI. Discord a ce problème depuis des années.",
    timestamp: m(35),
    reactions: [{ emoji: "💯", count: 6, reacted: true }],
  },
  {
    id: "msg5",
    author: MOCK_USERS[0],
    content: "J'ai hâte de voir la page auth aussi. La card centrée sur fond animé va être 🔥",
    timestamp: m(30),
  },
  {
    id: "msg6",
    author: MOCK_USERS[4],
    content: "Petite question : est-ce qu'on garde le support mobile dès le prototype ou on se concentre d'abord sur desktop ?",
    timestamp: m(22),
  },
  {
    id: "msg7",
    author: MOCK_USERS[1],
    content: "Desktop first pour le prototype, mobile ensuite. Le nav rail sera remplacé par une bottom nav sur mobile.",
    timestamp: m(20),
    edited: true,
  },
  {
    id: "msg8",
    author: MOCK_USERS[5],
    content: "Super initiative. Le principal avantage c'est qu'on peut tester les composants HeroUI v3 dans un contexte réaliste avant de les intégrer dans le vrai frontend.",
    timestamp: m(15),
    reactions: [
      { emoji: "✅", count: 3, reacted: false },
      { emoji: "🎯", count: 2, reacted: false },
    ],
  },
  {
    id: "msg9",
    author: CURRENT_USER,
    content: "Exactement ! Et le fait d'avoir les tokens oklch en CSS variables nous donne une flexibilité totale pour les thèmes. On peut changer l'accent color dans un seul endroit.",
    timestamp: m(8),
  },
  {
    id: "msg10",
    author: MOCK_USERS[2],
    content: "Les `backdrop-blur` sur les panels glass donnent vraiment cet effet premium. Hâte de voir la version finale 🚀",
    timestamp: m(2),
  },
];

export const ONLINE_MEMBERS = MOCK_USERS.filter(u => u.status === "online" || u.status === "away");
export const OFFLINE_MEMBERS = MOCK_USERS.filter(u => u.status === "offline" || u.status === "dnd");
