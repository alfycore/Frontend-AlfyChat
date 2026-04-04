'use client';

import { useState, useMemo } from 'react';
import {
  Avatar, Badge, Button, Card, Chip, InputGroup, ScrollShadow,
  Separator, Surface, Tabs, Tooltip,
} from '@heroui/react';
import {
  Search, Users, Hash, Flame, Compass, Crown, Star, Globe,
  Lock, Gamepad2, Music, Code2, Palette, BookOpen, Mic2,
  TrendingUp, ChevronRight, Plus, Check, Sparkles,
} from 'lucide-react';

// ─── Fake Data ───────────────────────────────────────────────────────────────

type Category = 'all' | 'gaming' | 'dev' | 'music' | 'design' | 'education' | 'community';

interface FakeServer {
  id: string;
  name: string;
  description: string;
  icon?: string;
  initial: string;
  color: string;
  members: number;
  online: number;
  category: Exclude<Category, 'all'>;
  tags: string[];
  isPublic: boolean;
  featured?: boolean;
  joined?: boolean;
  verified?: boolean;
  banner?: string;
}

const SERVERS: FakeServer[] = [
  {
    id: 's1', name: 'AlfyChat Dev', initial: 'AD',
    color: 'from-violet-500 to-indigo-600',
    description: 'Communauté officielle de développement AlfyChat. Discussions, PR, démos et previews.',
    members: 4280, online: 312, category: 'dev',
    tags: ['TypeScript', 'React', 'Node.js'],
    isPublic: true, featured: true, verified: true,
    banner: 'https://picsum.photos/seed/alfydev/600/200',
  },
  {
    id: 's2', name: 'Gaming FR 🎮', initial: 'GF',
    color: 'from-green-500 to-emerald-600',
    description: 'La plus grande communauté gaming francophone. FPS, RPG, stratégie… tout est là !',
    members: 28450, online: 1842, category: 'gaming',
    tags: ['FPS', 'RPG', 'eSport', 'Casual'],
    isPublic: true, featured: true,
    banner: 'https://picsum.photos/seed/gamingfr/600/200',
  },
  {
    id: 's3', name: 'Design System', initial: 'DS',
    color: 'from-pink-500 to-rose-600',
    description: 'UI/UX, design tokens, accessibilité et bonnes pratiques pour les produits modernes.',
    members: 1192, online: 87, category: 'design',
    tags: ['Figma', 'UI/UX', 'Tokens', 'A11y'],
    isPublic: true,
    banner: 'https://picsum.photos/seed/design/600/200',
  },
  {
    id: 's4', name: 'Music Lounge 🎵', initial: 'ML',
    color: 'from-amber-500 to-orange-600',
    description: 'Découverte musicale, playlists collectives, discussions et lives acoustiques chaque vendredi.',
    members: 9830, online: 630, category: 'music',
    tags: ['Électro', 'Jazz', 'Indie', 'Playlist'],
    isPublic: true,
    banner: 'https://picsum.photos/seed/music/600/200',
  },
  {
    id: 's5', name: 'Open Source FR', initial: 'OS',
    color: 'from-sky-500 to-blue-600',
    description: 'Contribuer à l\'open source en français. Projets, code reviews et entraide.',
    members: 3415, online: 210, category: 'dev',
    tags: ['GitHub', 'Linux', 'Rust', 'Go'],
    isPublic: true,
    banner: 'https://picsum.photos/seed/opensource/600/200',
  },
  {
    id: 's6', name: 'Pixel & Art 🎨', initial: 'PA',
    color: 'from-fuchsia-500 to-purple-600',
    description: 'Pixel art, illustration numérique, partage de créations et défis hebdomadaires.',
    members: 2100, online: 143, category: 'design',
    tags: ['Pixel Art', 'Procreate', 'Illustration'],
    isPublic: true,
    banner: 'https://picsum.photos/seed/pixelart/600/200',
  },
  {
    id: 's7', name: 'League Hub', initial: 'LH',
    color: 'from-teal-500 to-cyan-600',
    description: 'Coaches, équipes, scrims et tournois amateurs pour League of Legends.',
    members: 12780, online: 945, category: 'gaming',
    tags: ['LoL', 'MOBA', 'Tournois', 'Coaching'],
    isPublic: true,
    banner: 'https://picsum.photos/seed/league/600/200',
  },
  {
    id: 's8', name: 'Cours de Code 📚', initial: 'CC',
    color: 'from-lime-500 to-green-600',
    description: 'Apprenez à coder de zéro ou progressez avec la communauté. Tutos, exercices, mentorat.',
    members: 6700, online: 420, category: 'education',
    tags: ['Débutants', 'Python', 'JavaScript', 'Algo'],
    isPublic: true, featured: true,
    banner: 'https://picsum.photos/seed/cours/600/200',
  },
  {
    id: 's9', name: 'Podcast Corner 🎙️', initial: 'PC',
    color: 'from-red-500 to-rose-600',
    description: 'Créateurs de podcasts, listeners et invités. Enregistrements live et retours.',
    members: 1540, online: 68, category: 'music',
    tags: ['Podcast', 'Audio', 'Storytelling'],
    isPublic: true,
    banner: 'https://picsum.photos/seed/podcast/600/200',
  },
  {
    id: 's10', name: 'Geek Culture', initial: 'GC',
    color: 'from-orange-500 to-amber-600',
    description: 'Manga, séries, films, jeux de société... La culture geek dans toute sa diversité.',
    members: 7250, online: 512, category: 'community',
    tags: ['Manga', 'Séries', 'Jeux de société', 'Films'],
    isPublic: true,
    banner: 'https://picsum.photos/seed/geek/600/200',
  },
];

const CATEGORIES: { key: Category; label: string; icon: React.ReactNode }[] = [
  { key: 'all',       label: 'Tout',        icon: <Compass className="size-3.5" /> },
  { key: 'gaming',    label: 'Gaming',      icon: <Gamepad2 className="size-3.5" /> },
  { key: 'dev',       label: 'Dev',         icon: <Code2 className="size-3.5" /> },
  { key: 'music',     label: 'Musique',     icon: <Music className="size-3.5" /> },
  { key: 'design',    label: 'Design',      icon: <Palette className="size-3.5" /> },
  { key: 'education', label: 'Éducation',   icon: <BookOpen className="size-3.5" /> },
  { key: 'community', label: 'Communauté',  icon: <Globe className="size-3.5" /> },
];

function formatCount(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// ─── Server Card ─────────────────────────────────────────────────────────────

function ServerCard({ server, onJoin }: { server: FakeServer; onJoin: (id: string) => void }) {
  return (
    <Card className="group overflow-hidden rounded-2xl border border-border/40 bg-surface/60 transition-all duration-200 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5">
      {/* Banner */}
      <div className="relative h-24 overflow-hidden">
        {server.banner ? (
          <img src={server.banner} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${server.color} opacity-60`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Badges top-right */}
        <div className="absolute right-2 top-2 flex gap-1">
          {server.featured && (
            <Chip size="xs" className="bg-amber-500/90 text-white">
              <Flame className="size-3" /> Populaire
            </Chip>
          )}
          {server.verified && (
            <Chip size="xs" className="bg-blue-500/90 text-white">
              <Check className="size-3" /> Vérifié
            </Chip>
          )}
        </div>

        {/* Avatar overlap */}
        <div className="absolute -bottom-5 left-4">
          <div className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${server.color} text-white font-bold text-sm ring-2 ring-background shadow-md`}>
            {server.initial}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-4 pt-7">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{server.name}</h3>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
              <span className="flex items-center gap-1">
                <span className="inline-block size-1.5 rounded-full bg-green-500" />
                {formatCount(server.online)} en ligne
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Users className="size-3" /> {formatCount(server.members)}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant={server.joined ? 'secondary' : 'solid'}
            color={server.joined ? 'default' : 'accent'}
            isDisabled={server.joined}
            onPress={() => onJoin(server.id)}
            className="shrink-0"
          >
            {server.joined ? <><Check className="size-3.5" /> Rejoint</> : <><Plus className="size-3.5" /> Rejoindre</>}
          </Button>
        </div>

        <p className="mt-2 text-xs text-muted line-clamp-2 leading-relaxed">{server.description}</p>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-1">
          {server.tags.slice(0, 3).map(tag => (
            <Chip key={tag} size="xs" variant="soft" color="default">{tag}</Chip>
          ))}
          {server.tags.length > 3 && (
            <Chip size="xs" variant="soft" color="default">+{server.tags.length - 3}</Chip>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Featured Banner ─────────────────────────────────────────────────────────

function FeaturedBanner({ server, onJoin }: { server: FakeServer; onJoin: (id: string) => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {server.banner && (
        <img src={server.banner} alt="" className="h-44 w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
      <div className="absolute inset-0 flex items-center px-6">
        <div className="max-w-md">
          <Chip size="sm" className="mb-2 bg-amber-500/90 text-white">
            <Sparkles className="size-3" /> En vedette
          </Chip>
          <h2 className="text-xl font-bold text-white">{server.name}</h2>
          <p className="mt-1 text-sm text-white/75 line-clamp-2">{server.description}</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-white/60">
              <span className="inline-block size-2 rounded-full bg-green-400" />
              {formatCount(server.online)} en ligne
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/60">
              <Users className="size-3" /> {formatCount(server.members)} membres
            </div>
          </div>
        </div>
        <div className="ml-auto">
          <Button
            color="accent"
            variant={server.joined ? 'secondary' : 'solid'}
            isDisabled={server.joined}
            onPress={() => onJoin(server.id)}
          >
            {server.joined ? <><Check className="size-4" /> Rejoint</> : <><Plus className="size-4" /> Rejoindre</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const [servers, setServers] = useState<FakeServer[]>(SERVERS);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'active' | 'new'>('popular');

  const featuredServer = servers.find(s => s.featured && s.id === 's2');

  const filtered = useMemo(() => {
    let list = servers;
    if (category !== 'all') list = list.filter(s => s.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (sortBy === 'popular') list = [...list].sort((a, b) => b.members - a.members);
    if (sortBy === 'active')  list = [...list].sort((a, b) => b.online - a.online);
    return list;
  }, [servers, category, search, sortBy]);

  const handleJoin = (id: string) => {
    setServers(prev => prev.map(s => s.id === id ? { ...s, joined: true, members: s.members + 1 } : s));
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-accent/15">
            <Compass className="size-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Découvrir</h1>
            <p className="text-xs text-muted">Rejoignez des communautés qui vous ressemblent</p>
          </div>
        </div>
      </div>

      {/* Featured */}
      {featuredServer && (
        <div className="mb-8">
          <FeaturedBanner server={featuredServer} onJoin={handleJoin} />
        </div>
      )}

      {/* Search + Sort */}
      <div className="mb-5 flex gap-3">
        <InputGroup fullWidth className="bg-surface-secondary border-border/40">
          <InputGroup.Prefix>
            <Search className="size-4 text-muted" />
          </InputGroup.Prefix>
          <InputGroup.Input
            placeholder="Rechercher un serveur, un tag…"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </InputGroup>
        <div className="flex gap-1 rounded-xl border border-border/40 bg-surface-secondary p-1">
          {([
            { key: 'popular', icon: <TrendingUp className="size-3.5" />, label: 'Populaire' },
            { key: 'active',  icon: <Users className="size-3.5" />,      label: 'Actif' },
          ] as const).map(opt => (
            <Tooltip key={opt.key} content={opt.label}>
              <Button
                isIconOnly size="sm"
                variant={sortBy === opt.key ? 'secondary' : 'ghost'}
                onPress={() => setSortBy(opt.key)}
              >
                {opt.icon}
              </Button>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Category tabs */}
      <ScrollShadow orientation="horizontal" className="mb-6">
        <div className="flex gap-2 pb-1">
          {CATEGORIES.map(cat => (
            <Button
              key={cat.key}
              size="sm"
              variant={category === cat.key ? 'secondary' : 'ghost'}
              onPress={() => setCategory(cat.key)}
              className="shrink-0"
            >
              {cat.icon} {cat.label}
            </Button>
          ))}
        </div>
      </ScrollShadow>

      {/* Stats bar */}
      <div className="mb-5 flex items-center gap-1 text-xs text-muted">
        <span className="font-medium text-foreground">{filtered.length}</span>
        <span>serveur{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}</span>
        {search && <><span>pour</span><span className="font-medium text-foreground">"{search}"</span></>}
        {category !== 'all' && (
          <Chip size="xs" variant="soft" color="accent" className="ml-1">
            {CATEGORIES.find(c => c.key === category)?.label}
          </Chip>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-surface-secondary text-3xl">🔍</div>
          <p className="font-medium text-foreground">Aucun serveur trouvé</p>
          <p className="text-sm text-muted">Essayez un autre terme ou une autre catégorie.</p>
          <Button variant="ghost" size="sm" onPress={() => { setSearch(''); setCategory('all'); }}>
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(server => (
            <ServerCard key={server.id} server={server} onJoin={handleJoin} />
          ))}
        </div>
      )}
    </div>
  );
}
