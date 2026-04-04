'use client';

import { useState } from 'react';
import {
  Accordion,
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  InputGroup,
  Label,
  ListBox,
  Modal,
  Popover,
  ScrollShadow,
  Select,
  Separator,
  Skeleton,
  Slider,
  Spinner,
  Surface,
  Switch,
  Table,
  Tabs,
  Tag,
  TagGroup,
  TextArea,
  Tooltip,
  toast,
  Toast,
} from '@heroui/react';
import {
  Search, Pin, Users, Smile, Reply, Ellipsis, Paperclip, SmilePlus,
  ImageIcon, SendHorizonal, Hash, Volume2, MessageSquare, Settings,
  Palette, Bell, Lock, Sun, Moon, Monitor, ShieldCheck, Shield,
  Smartphone, Pencil, Trash2, UserPlus, Globe, User, BarChart3,
  Clock, Puzzle, Rocket, Gamepad2, Music, Camera, Code2, Plus,
  KeyRound,
} from 'lucide-react';

// ─── Fake Data ───────────────────────────────────────────────────────────────

const FAKE_USERS = [
  { id: '1', name: 'Alice Martin', username: 'alice', avatar: 'https://i.pravatar.cc/150?u=alice', status: 'online', role: 'Admin', email: 'alice@alfychat.app' },
  { id: '2', name: 'Bob Dupont', username: 'bob_d', avatar: 'https://i.pravatar.cc/150?u=bob', status: 'idle', role: 'Modérateur', email: 'bob@alfychat.app' },
  { id: '3', name: 'Clara Petit', username: 'clara_p', avatar: 'https://i.pravatar.cc/150?u=clara', status: 'dnd', role: 'Membre', email: 'clara@alfychat.app' },
  { id: '4', name: 'David Moreau', username: 'david.m', avatar: 'https://i.pravatar.cc/150?u=david', status: 'offline', role: 'Membre', email: 'david@alfychat.app' },
  { id: '5', name: 'Emma Leroy', username: 'emma_l', avatar: 'https://i.pravatar.cc/150?u=emma', status: 'online', role: 'Admin', email: 'emma@alfychat.app' },
  { id: '6', name: 'François Roux', username: 'franky', avatar: 'https://i.pravatar.cc/150?u=francois', status: 'online', role: 'Membre', email: 'francois@alfychat.app' },
];

const FAKE_MESSAGES = [
  { id: 'm1', user: FAKE_USERS[0], content: 'Salut tout le monde ! 🎉 Le nouveau design est incroyable.', time: '14:32', reactions: ['👍', '🎉'] },
  { id: 'm2', user: FAKE_USERS[1], content: 'Je suis d\'accord, les composants HeroUI v3 sont vraiment propres.', time: '14:33', reactions: ['💯'] },
  { id: 'm3', user: FAKE_USERS[2], content: 'Qui est dispo pour la réunion de demain à 10h ?', time: '14:35', reactions: ['✋', '✋', '✋'] },
  { id: 'm4', user: FAKE_USERS[4], content: 'Je serai là ! On peut aussi discuter du nouveau système de rôles.', time: '14:36', reactions: [] },
  { id: 'm5', user: FAKE_USERS[0], content: 'Parfait, j\'ai préparé une démo avec les nouveaux composants.', time: '14:38', reactions: ['🚀'] },
];

const FAKE_SERVERS = [
  { id: 's1', name: 'AlfyChat Dev', icon: '🚀', members: 42, channels: 12, description: 'Serveur officiel de développement' },
  { id: 's2', name: 'Gaming FR', icon: '🎮', members: 1284, channels: 25, description: 'La communauté gaming francophone' },
  { id: 's3', name: 'Design System', icon: '🎨', members: 89, channels: 8, description: 'UI/UX et design tokens' },
  { id: 's4', name: 'Music Lounge', icon: '🎵', members: 567, channels: 15, description: 'Partagez vos découvertes musicales' },
];

const FAKE_CHANNELS = [
  { id: 'c1', name: 'général', type: 'text', unread: 3 },
  { id: 'c2', name: 'annonces', type: 'announcement', unread: 0 },
  { id: 'c3', name: 'dev-frontend', type: 'text', unread: 12 },
  { id: 'c4', name: 'vocal-général', type: 'voice', users: 4 },
  { id: 'c5', name: 'design', type: 'text', unread: 0 },
  { id: 'c6', name: 'off-topic', type: 'text', unread: 1 },
];

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  online: { color: 'bg-green-500', label: 'En ligne' },
  idle: { color: 'bg-yellow-500', label: 'Absent' },
  dnd: { color: 'bg-red-500', label: 'Ne pas déranger' },
  offline: { color: 'bg-gray-400', label: 'Hors ligne' },
};

// ─── Demo Sections ───────────────────────────────────────────────────────────

function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold tracking-tight text-foreground">{children}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

// ─── 1. Chat Interface Proposal ─────────────────────────────────────────────

function ChatInterfaceDemo() {
  const [message, setMessage] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('c1');

  return (
    <Card>
      <div className="flex h-130">
        {/* Sidebar channels */}
        <div className="flex w-56 shrink-0 flex-col border-r border-border/40 bg-background/60">
          <div className="flex items-center gap-2 border-b border-border/30 px-4 py-3">
            <Rocket className="size-5 text-accent" />
            <div>
              <p className="text-sm font-bold">AlfyChat Dev</p>
              <p className="text-[10px] text-muted">42 membres</p>
            </div>
          </div>
          <ScrollShadow className="flex-1 p-2">
            <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-muted/50">Salons textuels</p>
            {FAKE_CHANNELS.filter(c => c.type !== 'voice').map(ch => (
              <Button
                key={ch.id}
                fullWidth
                variant={selectedChannel === ch.id ? 'secondary' : 'ghost'}
                size="sm"
                onPress={() => setSelectedChannel(ch.id)}
              >
                <Hash className="size-4" />
                <span className="flex-1 text-left">{ch.name}</span>
                {(ch.unread ?? 0) > 0 && <Chip size="sm" color="danger">{ch.unread}</Chip>}
              </Button>
            ))}
            <Separator className="my-2" />
            <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-muted/50">Salons vocaux</p>
            {FAKE_CHANNELS.filter(c => c.type === 'voice').map(ch => (
              <Button
                key={ch.id}
                fullWidth
                variant="ghost"
                size="sm"
              >
                <Volume2 className="size-4" />
                <span className="flex-1 text-left">{ch.name}</span>
                {'users' in ch && <Chip size="sm" variant="soft">{ch.users}</Chip>}
              </Button>
            ))}
          </ScrollShadow>
        </div>

        {/* Chat area */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border/30 px-4 py-2.5">
            <Hash className="size-5 text-accent" />
            <span className="text-lg font-bold text-foreground">général</span>
            <Separator orientation="vertical" className="h-5" />
            <span className="text-xs text-muted">Discussion libre pour l&apos;équipe</span>
            <div className="ml-auto flex items-center gap-1">
              <Tooltip delay={0}>
                <Button isIconOnly size="sm" variant="ghost"><Search className="size-4" /></Button>
                <Tooltip.Content>Rechercher</Tooltip.Content>
              </Tooltip>
              <Tooltip delay={0}>
                <Button isIconOnly size="sm" variant="ghost"><Pin className="size-4" /></Button>
                <Tooltip.Content>Messages épinglés</Tooltip.Content>
              </Tooltip>
              <Tooltip delay={0}>
                <Button isIconOnly size="sm" variant="ghost"><Users className="size-4" /></Button>
                <Tooltip.Content>Liste des membres</Tooltip.Content>
              </Tooltip>
            </div>
          </div>

          {/* Messages */}
          <ScrollShadow className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {FAKE_MESSAGES.map(msg => (
                <div key={msg.id} className="group flex gap-3">
                  <Badge.Anchor>
                    <Avatar>
                      <Avatar.Image src={msg.user.avatar} />
                      <Avatar.Fallback>{msg.user.name[0]}</Avatar.Fallback>
                    </Avatar>
                    <Badge size="sm" placement="bottom-right" className={STATUS_MAP[msg.user.status].color} />
                  </Badge.Anchor>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] font-semibold text-foreground">{msg.user.name}</span>
                      <span className="text-[10px] text-muted/50">{msg.time}</span>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-foreground/90">{msg.content}</p>
                    {msg.reactions.length > 0 && (
                      <div className="mt-1.5 flex gap-1">
                        {msg.reactions.map((r, i) => (
                          <Button key={i} size="sm" variant="outline">
                            {r} 1
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Hover actions */}
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button isIconOnly size="sm" variant="ghost"><Smile className="size-4" /></Button>
                    <Button isIconOnly size="sm" variant="ghost"><Reply className="size-4" /></Button>
                    <Button isIconOnly size="sm" variant="ghost"><Ellipsis className="size-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollShadow>

          {/* Input */}
          <div className="border-t border-border/30 p-3">
            <div className="flex items-end gap-2 rounded-xl border border-border/50 bg-surface-secondary/30 px-3 py-2">
              <Button isIconOnly size="sm" variant="ghost"><Paperclip className="size-4" /></Button>
              <TextArea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Écrire un message dans #général..."
                rows={1}
                variant="secondary"
              />
              <Button isIconOnly size="sm" variant="ghost"><SmilePlus className="size-4" /></Button>
              <Button isIconOnly size="sm" variant="ghost"><ImageIcon className="size-4" /></Button>
              <Button isIconOnly size="sm" isDisabled={!message.trim()}><SendHorizonal className="size-4" /></Button>
            </div>
          </div>
        </div>

        {/* Members sidebar */}
        <div className="w-52 shrink-0 border-l border-border/30 bg-background/40">
          <ScrollShadow className="p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted/50">En ligne — 4</p>
            <div className="space-y-1">
              {FAKE_USERS.filter(u => u.status === 'online').map(user => (
                <Popover key={user.id}>
                  <Button fullWidth variant="ghost" size="sm">
                    <div className="relative">
                      <Avatar size="sm">
                        <Avatar.Image src={user.avatar} />
                        <Avatar.Fallback>{user.name[0]}</Avatar.Fallback>
                      </Avatar>
                      <span className={`absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-[1.5px] ring-background ${STATUS_MAP[user.status].color}`} />
                    </div>
                    <span className="flex-1 truncate text-left text-xs font-medium">{user.name}</span>
                  </Button>
                  <Popover.Content className="w-72">
                    <Popover.Dialog>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Avatar size="lg">
                            <Avatar.Image src={user.avatar} />
                            <Avatar.Fallback>{user.name[0]}</Avatar.Fallback>
                          </Avatar>
                          <div>
                            <p className="font-bold">{user.name}</p>
                            <p className="text-xs text-muted">@{user.username}</p>
                          </div>
                        </div>
                        <Separator />
                        <div className="flex gap-2">
                          <Chip size="sm" variant="soft">{user.role}</Chip>
                          <Chip size="sm" variant="soft" color={user.status === 'online' ? 'success' : 'default'}>{STATUS_MAP[user.status].label}</Chip>
                        </div>
                        <Button fullWidth size="sm">Envoyer un message</Button>
                      </div>
                    </Popover.Dialog>
                  </Popover.Content>
                </Popover>
              ))}
            </div>
            <Separator className="my-3" />
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted/50">Hors ligne — 2</p>
            <div className="space-y-1 opacity-50">
              {FAKE_USERS.filter(u => u.status === 'offline' || u.status === 'idle' || u.status === 'dnd').map(user => (
                <div key={user.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px]">
                  <div className="relative">
                    <Avatar size="sm">
                      <Avatar.Image src={user.avatar} />
                      <Avatar.Fallback>{user.name[0]}</Avatar.Fallback>
                    </Avatar>
                    <span className={`absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-[1.5px] ring-background ${STATUS_MAP[user.status].color}`} />
                  </div>
                  <span className="truncate font-medium">{user.name}</span>
                </div>
              ))}
            </div>
          </ScrollShadow>
        </div>
      </div>
    </Card>
  );
}

// ─── 2. Server Discovery / Cards ────────────────────────────────────────────

function ServerCardsDemo() {
  const serverIcons: Record<string, React.ReactNode> = {
    s1: <Rocket className="size-6" />,
    s2: <Gamepad2 className="size-6" />,
    s3: <Palette className="size-6" />,
    s4: <Music className="size-6" />,
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {FAKE_SERVERS.map(server => (
        <Card key={server.id} variant="secondary">
          <Card.Header>
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-accent-soft-hover to-accent/5 text-accent shadow-inner">
                {serverIcons[server.id]}
              </div>
              <div>
                <Card.Title className="text-sm font-bold">{server.name}</Card.Title>
                <Card.Description className="text-[11px]">{server.description}</Card.Description>
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted">
                <span className="size-2 rounded-full bg-green-500" />
                {server.members} membres
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted">
                <MessageSquare className="size-3" /> {server.channels} salons
              </div>
            </div>
          </Card.Content>
          <Card.Footer>
            <Button fullWidth size="sm" variant="secondary">
              Rejoindre
            </Button>
          </Card.Footer>
        </Card>
      ))}
    </div>
  );
}

// ─── 3. User Profile Card ───────────────────────────────────────────────────

function UserProfileDemo() {
  const user = FAKE_USERS[0];
  return (
    <Card className="w-80">
      {/* Banner */}
      <div className="h-24 rounded-t-xl bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500" />
      <div className="relative px-4 pb-4">
        {/* Avatar */}
        <div className="-mt-10 mb-3">
          <Badge.Anchor>
            <Avatar size="lg" className="ring-4 ring-surface">
              <Avatar.Image src={user.avatar} />
              <Avatar.Fallback>{user.name[0]}</Avatar.Fallback>
            </Avatar>
            <Badge size="md" placement="bottom-right" className={STATUS_MAP[user.status].color} />
          </Badge.Anchor>
        </div>

        <h3 className="text-lg font-bold">{user.name}</h3>
        <p className="text-xs text-muted">@{user.username}</p>

        <div className="mt-3 flex gap-1.5">
          <Chip size="sm" variant="soft" color="accent">Admin</Chip>
          <Chip size="sm" variant="soft" color="success">En ligne</Chip>
          <Chip size="sm" variant="soft">Développeur</Chip>
        </div>

        <Surface variant="secondary" className="mt-4 rounded-xl p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted/60">À propos</p>
          <p className="mt-1 text-xs leading-relaxed text-foreground/80">
            Passionné de dev web et design system. Je travaille sur AlfyChat depuis 2024. Fan de TypeScript et Tailwind CSS.
          </p>
        </Surface>

        <Surface variant="secondary" className="mt-2 rounded-xl p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted/60">Membre depuis</p>
          <p className="mt-0.5 text-xs text-foreground/80">15 mars 2024</p>
        </Surface>

        <div className="mt-4 flex gap-2">
          <Button fullWidth size="sm">Envoyer un message</Button>
          <Button size="sm" variant="secondary" isIconOnly><Ellipsis className="size-4" /></Button>
        </div>
      </div>
    </Card>
  );
}

// ─── 4. Settings Panel ──────────────────────────────────────────────────────

function SettingsDemo() {
  const [notifs, setNotifs] = useState(true);
  const [sounds, setSounds] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [theme, setTheme] = useState<string | null>('dark');

  return (
    <Card className="w-full max-w-2xl">
      <Tabs defaultSelectedKey="general">
        <Card.Header>
          <Tabs.ListContainer>
            <Tabs.List aria-label="Paramètres">
              <Tabs.Tab id="general"><Settings className="size-4" /> Général<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="apparence"><Palette className="size-4" /> Apparence<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="notifications"><Bell className="size-4" /> Notifications<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="securite"><Lock className="size-4" /> Sécurité<Tabs.Indicator /></Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Card.Header>

        <Card.Content className="p-0">
          <Tabs.Panel id="general" className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold">Profil</h3>
                <p className="text-xs text-muted">Gérez votre profil public</p>
              </div>
              <div className="grid gap-4">
                <InputGroup>
                  <InputGroup.Prefix className="text-xs text-muted">@</InputGroup.Prefix>
                  <InputGroup.Input placeholder="Nom d'utilisateur" defaultValue="alice" />
                </InputGroup>
                <InputGroup>
                  <InputGroup.Input placeholder="Nom d'affichage" defaultValue="Alice Martin" />
                </InputGroup>
                <TextArea
                  placeholder="Décrivez-vous en quelques mots..."
                  defaultValue="Passionné de dev web et design system."
                  rows={3}
                  variant="secondary"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm">Annuler</Button>
                <Button size="sm">Sauvegarder</Button>
              </div>
            </div>
          </Tabs.Panel>

          <Tabs.Panel id="apparence" className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold">Thème</h3>
                <p className="text-xs text-muted">Personnalisez l&apos;apparence de l&apos;application</p>
              </div>

              <Select className="w-full" placeholder="Choisir un thème" defaultSelectedKey="dark">
                <Label className="text-xs font-medium">Mode</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="light" textValue="Clair"><Sun className="size-4" /> Clair<ListBox.ItemIndicator /></ListBox.Item>
                    <ListBox.Item id="dark" textValue="Sombre"><Moon className="size-4" /> Sombre<ListBox.ItemIndicator /></ListBox.Item>
                    <ListBox.Item id="system" textValue="Système"><Monitor className="size-4" /> Système<ListBox.ItemIndicator /></ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>

              <div>
                <Slider defaultValue={14} minValue={10} maxValue={20} step={1} className="w-full" onChange={(v) => setFontSize(v as number)}>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Taille de police</Label>
                    <Slider.Output className="text-xs text-muted" />
                  </div>
                  <Slider.Track>
                    <Slider.Fill />
                    <Slider.Thumb />
                  </Slider.Track>
                </Slider>
              </div>

              <TagGroup aria-label="Couleur d'accent" selectionMode="single" defaultSelectedKeys={['violet']}>
                <Label className="text-xs font-medium">Couleur d&apos;accent</Label>
                <TagGroup.List className="mt-1.5">
                  <Tag id="violet" className="bg-violet-500 text-white">Violet</Tag>
                  <Tag id="blue" className="bg-blue-500 text-white">Bleu</Tag>
                  <Tag id="green" className="bg-green-500 text-white">Vert</Tag>
                  <Tag id="rose" className="bg-rose-500 text-white">Rose</Tag>
                  <Tag id="orange" className="bg-orange-500 text-white">Orange</Tag>
                </TagGroup.List>
              </TagGroup>
            </div>
          </Tabs.Panel>

          <Tabs.Panel id="notifications" className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Notifications</h3>
                <p className="text-xs text-muted">Configurez vos préférences de notification</p>
              </div>

              <Surface variant="secondary" className="space-y-4 rounded-xl p-4">
                <Switch isSelected={notifs} onChange={setNotifs}>
                  <Switch.Control><Switch.Thumb /></Switch.Control>
                  <Switch.Content>
                    <Label className="text-sm">Notifications push</Label>
                    <p className="text-[11px] text-muted">Recevez des notifications en temps réel</p>
                  </Switch.Content>
                </Switch>

                <Separator />

                <Switch isSelected={sounds} onChange={setSounds}>
                  <Switch.Control><Switch.Thumb /></Switch.Control>
                  <Switch.Content>
                    <Label className="text-sm">Sons de notification</Label>
                    <p className="text-[11px] text-muted">Jouer un son lors de la réception d&apos;un message</p>
                  </Switch.Content>
                </Switch>

                <Separator />

                <Switch defaultSelected>
                  <Switch.Control><Switch.Thumb /></Switch.Control>
                  <Switch.Content>
                    <Label className="text-sm">Badge de l&apos;application</Label>
                    <p className="text-[11px] text-muted">Afficher le nombre de messages non lus</p>
                  </Switch.Content>
                </Switch>
              </Surface>
            </div>
          </Tabs.Panel>

          <Tabs.Panel id="securite" className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Sécurité & Confidentialité</h3>
                <p className="text-xs text-muted">Protégez votre compte</p>
              </div>

              <Accordion className="w-full" variant="surface">
                <Accordion.Item>
                  <Accordion.Heading>
                    <Accordion.Trigger className="text-sm">
                      <KeyRound className="size-4" /> Chiffrement de bout en bout
                      <Accordion.Indicator />
                    </Accordion.Trigger>
                  </Accordion.Heading>
                  <Accordion.Panel>
                    <Accordion.Body className="text-xs text-muted">
                      Tous vos messages sont chiffrés de bout en bout avec le protocole Signal. Personne, pas même AlfyChat, ne peut lire vos messages.
                    </Accordion.Body>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item>
                  <Accordion.Heading>
                    <Accordion.Trigger className="text-sm">
                      <Shield className="size-4" /> Authentification à deux facteurs
                      <Accordion.Indicator />
                    </Accordion.Trigger>
                  </Accordion.Heading>
                  <Accordion.Panel>
                    <Accordion.Body>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted">Ajoutez une couche de sécurité supplémentaire.</p>
                        <Button size="sm" variant="secondary">Activer</Button>
                      </div>
                    </Accordion.Body>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item>
                  <Accordion.Heading>
                    <Accordion.Trigger className="text-sm">
                      <Smartphone className="size-4" /> Sessions actives
                      <Accordion.Indicator />
                    </Accordion.Trigger>
                  </Accordion.Heading>
                  <Accordion.Panel>
                    <Accordion.Body className="space-y-2 text-xs text-muted">
                      <div className="flex items-center justify-between rounded-lg bg-surface-secondary/30 p-2">
                        <div>
                          <p className="font-medium text-foreground">Windows — Chrome</p>
                          <p>Paris, France · Maintenant</p>
                        </div>
                        <Chip size="sm" color="success" variant="soft">Actuelle</Chip>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-surface-secondary/30 p-2">
                        <div>
                          <p className="font-medium text-foreground">iPhone 15 — Safari</p>
                          <p>Paris, France · Il y a 2h</p>
                        </div>
                        <Button size="sm" variant="danger">Révoquer</Button>
                      </div>
                    </Accordion.Body>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </div>
          </Tabs.Panel>
        </Card.Content>
      </Tabs>
    </Card>
  );
}

// ─── 5. Table / Admin Panel ─────────────────────────────────────────────────

function AdminTableDemo() {
  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <div>
            <Card.Title>Gestion des utilisateurs</Card.Title>
            <Card.Description>Administration du serveur AlfyChat Dev</Card.Description>
          </div>
          <div className="flex gap-2">
            <InputGroup variant="secondary" className="w-64">
              <InputGroup.Prefix><Search className="size-4 text-muted" /></InputGroup.Prefix>
              <InputGroup.Input placeholder="Rechercher un membre..." />
            </InputGroup>
            <Button size="sm"><UserPlus className="size-4" /> Inviter</Button>
          </div>
        </div>
      </Card.Header>
      <Card.Content className="p-0">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="Membres du serveur">
              <Table.Header>
                <Table.Column isRowHeader>Utilisateur</Table.Column>
                <Table.Column>Rôle</Table.Column>
                <Table.Column>Statut</Table.Column>
                <Table.Column>Email</Table.Column>
                <Table.Column>Actions</Table.Column>
              </Table.Header>
              <Table.Body>
                {FAKE_USERS.map(user => (
                  <Table.Row key={user.id}>
                    <Table.Cell>
                      <div className="flex items-center gap-2.5">
                        <Avatar size="sm">
                          <Avatar.Image src={user.avatar} />
                          <Avatar.Fallback>{user.name[0]}</Avatar.Fallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-[11px] text-muted">@{user.username}</p>
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Chip size="sm" variant="soft" color={user.role === 'Admin' ? 'accent' : user.role === 'Modérateur' ? 'warning' : 'default'}>
                        {user.role}
                      </Chip>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-1.5">
                        <span className={`size-2 rounded-full ${STATUS_MAP[user.status].color}`} />
                        <span className="text-xs">{STATUS_MAP[user.status].label}</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-xs text-muted">{user.email}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex gap-1">
                        <Button isIconOnly size="sm" variant="ghost"><Pencil className="size-4" /></Button>
                        <Button isIconOnly size="sm" variant="danger-soft"><Trash2 className="size-4" /></Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </Card.Content>
    </Card>
  );
}

// ─── 6. Loading States / Skeletons ──────────────────────────────────────────

function SkeletonDemo() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Chat skeleton */}
      <Card>
        <Card.Header>
          <Card.Title className="text-sm">Chat — Chargement</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Skeleton className="h-3 w-24 rounded-md" />
                  <Skeleton className="h-3 w-12 rounded-md" />
                </div>
                <Skeleton className={`h-3 rounded-md ${i === 2 ? 'w-full' : 'w-3/4'}`} />
                {i === 1 && <Skeleton className="h-3 w-1/2 rounded-md" />}
              </div>
            </div>
          ))}
        </Card.Content>
      </Card>

      {/* Server card skeleton */}
      <Card>
        <Card.Header>
          <Card.Title className="text-sm">Serveur — Chargement</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-surface-secondary/20 p-3">
              <Skeleton className="size-12 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-3 w-48 rounded-md" />
                <div className="flex gap-3">
                  <Skeleton className="h-3 w-16 rounded-md" />
                  <Skeleton className="h-3 w-16 rounded-md" />
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-center pt-2">
            <Spinner size="md" />
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}

// ─── 7. Buttons & Interactive Showcase ──────────────────────────────────────

function ButtonShowcase() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Buttons */}
        <Surface variant="secondary" className="space-y-4 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted/60">Boutons — Variantes</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="tertiary">Tertiary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="danger-soft">Danger Soft</Button>
          </div>
          <Separator />
          <p className="text-xs font-bold uppercase tracking-widest text-muted/60">Boutons — Tailles</p>
          <div className="flex items-end gap-2">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <Separator />
          <p className="text-xs font-bold uppercase tracking-widest text-muted/60">Boutons — États</p>
          <div className="flex flex-wrap gap-2">
            <Button isDisabled>Désactivé</Button>
            <Button isPending>Chargement...</Button>
            <Button isIconOnly><Bell className="size-4" /></Button>
            <Button isIconOnly size="lg" variant="secondary"><Settings className="size-5" /></Button>
          </div>
        </Surface>

        {/* Chips & Tags */}
        <Surface variant="secondary" className="space-y-4 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted/60">Chips</p>
          <div className="flex flex-wrap gap-2">
            <Chip size="sm">Défaut</Chip>
            <Chip size="sm" color="accent">Accent</Chip>
            <Chip size="sm" color="success">Succès</Chip>
            <Chip size="sm" color="warning">Attention</Chip>
            <Chip size="sm" color="danger">Danger</Chip>
            <Chip size="sm" variant="soft">Soft</Chip>
            <Chip size="sm" variant="soft" color="accent">Soft Accent</Chip>
          </div>
          <Separator />
          <p className="text-xs font-bold uppercase tracking-widest text-muted/60">Tags sélectionnables</p>
          <TagGroup aria-label="Intérêts" selectionMode="multiple" defaultSelectedKeys={['dev', 'design']}>
            <TagGroup.List>
              <Tag id="dev"><Code2 className="size-3" /> Développement</Tag>
              <Tag id="design"><Palette className="size-3" /> Design</Tag>
              <Tag id="gaming"><Gamepad2 className="size-3" /> Gaming</Tag>
              <Tag id="music"><Music className="size-3" /> Musique</Tag>
              <Tag id="photo"><Camera className="size-3" /> Photo</Tag>
            </TagGroup.List>
          </TagGroup>
          <Separator />
          <p className="text-xs font-bold uppercase tracking-widest text-muted/60">Modal</p>
          <Button onPress={() => setModalOpen(true)} variant="outline" size="sm">Ouvrir un modal</Button>
          <Button onPress={() => toast.success('Action réussie !', { description: 'Votre message a bien été envoyé.' })} variant="outline" size="sm">
            Toast succès
          </Button>
          <Button onPress={() => toast.danger('Erreur !', { description: 'Impossible de se connecter au serveur.' })} variant="outline" size="sm">
            Toast erreur
          </Button>
        </Surface>
      </div>

      {/* Modal */}
      <Modal.Backdrop isOpen={modalOpen} onOpenChange={setModalOpen} variant="blur">
        <Modal.Container size="sm">
          <Modal.Dialog>
            <h2 className="text-lg font-bold">Créer un salon</h2>
            <p className="mt-1 text-sm text-muted">Ajoutez un nouveau salon à votre serveur.</p>
            <div className="mt-4 space-y-3">
              <InputGroup>
                <InputGroup.Prefix>#</InputGroup.Prefix>
                <InputGroup.Input placeholder="nom-du-salon" />
              </InputGroup>
              <TextArea placeholder="Description du salon (optionnel)" rows={2} variant="secondary" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onPress={() => setModalOpen(false)}>Annuler</Button>
              <Button onPress={() => { setModalOpen(false); toast.success('Salon créé !'); }}>Créer le salon</Button>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function TestPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-16 px-6 py-10">

        {/* 1. Chat Interface */}
        <section>
          <SectionTitle subtitle="Interface complète avec sidebar, chat scrollable, input et liste de membres">
            <span className="inline-flex items-center gap-2"><MessageSquare className="size-6" /> Interface Chat</span>
          </SectionTitle>
          <ChatInterfaceDemo />
        </section>

        {/* 2. Server Discovery */}
        <section>
          <SectionTitle subtitle="Cards de serveurs publics avec hover effects et CTA">
            <span className="inline-flex items-center gap-2"><Globe className="size-6" /> Découverte de serveurs</span>
          </SectionTitle>
          <ServerCardsDemo />
        </section>

        {/* 3. Profile + Settings side by side */}
        <section>
          <SectionTitle subtitle="Carte de profil utilisateur avec banner, avatar, statut et infos">
            <span className="inline-flex items-center gap-2"><User className="size-6" /> Profil utilisateur</span>
          </SectionTitle>
          <div className="flex flex-col gap-6 lg:flex-row">
            <UserProfileDemo />
            <div className="flex-1">
              <SettingsDemo />
            </div>
          </div>
        </section>

        {/* 4. Admin Table */}
        <section>
          <SectionTitle subtitle="Tableau de gestion avec recherche, tri et actions inline">
            <span className="inline-flex items-center gap-2"><BarChart3 className="size-6" /> Panneau d&apos;administration</span>
          </SectionTitle>
          <AdminTableDemo />
        </section>

        {/* 5. Loading States */}
        <section>
          <SectionTitle subtitle="Skeletons et spinners pour les états de chargement">
            <span className="inline-flex items-center gap-2"><Clock className="size-6" /> États de chargement</span>
          </SectionTitle>
          <SkeletonDemo />
        </section>

        {/* 6. Buttons & Interactive */}
        <section>
          <SectionTitle subtitle="Showcase de tous les boutons, chips, tags, modal et toasts">
            <span className="inline-flex items-center gap-2"><Puzzle className="size-6" /> Composants interactifs</span>
          </SectionTitle>
          <ButtonShowcase />
        </section>

      </div>
  );
}
