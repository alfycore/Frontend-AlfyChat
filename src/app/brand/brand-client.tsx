'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  Alert,
  Button,
  Card,
  Chip,
  Input,
  Label,
  Switch,
  Tabs,
  TextField,
} from '@heroui/react';
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  HashIcon,
  ImageIcon,
  MoreHorizontalIcon,
  PaletteIcon,
  PaperclipIcon,
  PhoneIcon,
  SearchIcon,
  SendIcon,
  ShieldCheckIcon,
  SmileIcon,
  SparklesIcon,
  UsersIcon,
  VideoIcon,
} from '@/components/icons';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';

/* ── Données statiques ──────────────────────────────────────────────────── */

const brandColors = [
  { name: 'Violet AlfyChat', hex: '#7627FF', role: 'Couleur primaire — actions, accents, identité', light: false },
  { name: 'Violet Profond',  hex: '#5B22D6', role: 'Ombres, dégradés, états pressés',               light: false },
  { name: 'Gris Nuage',      hex: '#E3E3E3', role: 'Détails du logo, surfaces neutres',              light: true  },
  { name: 'Encre',           hex: '#111111', role: 'Texte principal, contraste maximal',              light: false },
  { name: 'Blanc',           hex: '#FFFFFF', role: 'Fond clair, texte sur violet',                   light: true  },
];

const semanticColors = [
  { name: 'Succès',       hex: '#16A34A', token: '--success' },
  { name: 'Avertissement',hex: '#F59E0B', token: '--warning' },
  { name: 'Danger',       hex: '#DC2626', token: '--danger'  },
];

const logos = [
  { label: 'Icône — couleur',    file: '/logo/Alfychat.svg',                 dark: false },
  { label: 'Icône — noir',       file: '/logo/Alfychatlogoblack.svg',         dark: false },
  { label: 'Icône — blanc',      file: '/logo/Alfychatlogowihte.svg',         dark: true  },
  { label: 'Logo + nom — noir',  file: '/logo/Alfychatlogotitleblack.svg',    dark: false },
  { label: 'Logo + nom — blanc', file: '/logo/Alfychatlogotitlewihte.svg',    dark: true  },
  { label: 'Vertical — noir',    file: '/logo/Alfychatlogotitleupblack.svg',  dark: false },
];

const dos = [
  'Conservez une marge de protection autour du logo, au minimum égale à la hauteur du « A ».',
  "Utilisez le violet #7627FF comme couleur d'accent principale.",
  'Privilégiez la version monochrome sur les fonds chargés ou photographiques.',
];
const donts = [
  "Ne déformez, n'étirez ni ne pivotez le logo.",
  "N'appliquez pas d'ombres, de contours ou d'effets au logo.",
  'Ne recolorisez pas le logo en dehors de la palette officielle.',
];

/* ── Données exemples interface ─────────────────────────────────────────── */

const mockConvos = [
  { id: 1, name: 'Alice Martin',   msg: 'Tu as vu la nouvelle update ?',     time: '14:23', unread: 3, online: true,  initials: 'AM', bg: '#7627FF' },
  { id: 2, name: 'Bob Dupont',     msg: 'Merci pour le partage !',            time: '12:01', unread: 0, online: false, initials: 'BD', bg: '#5B22D6' },
  { id: 3, name: 'Équipe Design',  msg: 'Réunion à 16h confirmée 📅',        time: '11:45', unread: 1, online: true,  initials: 'ÉD', bg: '#16A34A' },
  { id: 4, name: 'Clara Leblanc',  msg: 'Ok parfait 👍',                      time: 'Hier',  unread: 0, online: false, initials: 'CL', bg: '#F59E0B' },
];

const mockMessages = [
  { id: 1, text: 'Salut ! Tu as regardé la charte de marque ?',        sent: false, time: '14:20' },
  { id: 2, text: 'Oui, les couleurs sont vraiment bien choisies 🎨',   sent: true,  time: '14:21' },
  { id: 3, text: "Le violet AlfyChat est parfait pour l'identité !",   sent: false, time: '14:22' },
  { id: 4, text: "Totalement d'accord, on envoie pour validation ?",  sent: true,  time: '14:23' },
];

const mockChannels = [
  { id: 1, name: 'général',       unread: 0, active: true  },
  { id: 2, name: 'annonces',      unread: 2, active: false },
  { id: 3, name: 'design',        unread: 0, active: false },
  { id: 4, name: 'dev-frontend',  unread: 5, active: false },
  { id: 5, name: 'random',        unread: 0, active: false },
];

const mockServerMessages = [
  { id: 1, author: 'Alice Martin',  initials: 'AM', bg: '#7627FF', time: "Aujourd'hui à 10:12", text: 'Bienvenue sur le serveur AlfyChat ! 🎉' },
  { id: 2, author: 'Bob Dupont',    initials: 'BD', bg: '#5B22D6', time: "Aujourd'hui à 10:15", text: 'Super, hâte de tester les nouvelles fonctionnalités.' },
  { id: 3, author: 'Clara Leblanc', initials: 'CL', bg: '#F59E0B', time: "Aujourd'hui à 10:18", text: "La charte est vraiment propre, bravo à l'équipe design 💜" },
];

/* ── Sous-composants ────────────────────────────────────────────────────── */

function ColorSwatch({ name, hex, role, light }: { name: string; hex: string; role?: string; light?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      toast.success(`${hex} copié`);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error('Copie impossible');
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="group flex flex-col overflow-hidden rounded-2xl border border-separator bg-surface text-left transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="relative flex h-28 items-end justify-end p-3" style={{ backgroundColor: hex }}>
        <span
          className={`flex size-7 items-center justify-center rounded-full transition-opacity ${
            light ? 'bg-black/5 text-black/70' : 'bg-white/15 text-white'
          } opacity-0 group-hover:opacity-100`}
        >
          {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
        </span>
      </div>
      <div className="space-y-1 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <code className="font-mono text-xs uppercase text-muted">{hex}</code>
        </div>
        {role && <p className="text-xs leading-relaxed text-muted">{role}</p>}
      </div>
    </button>
  );
}

function Avatar({
  initials,
  bg,
  online,
  size = 40,
  ringColor = 'var(--surface)',
}: {
  initials: string;
  bg: string;
  online?: boolean;
  size?: number;
  ringColor?: string;
}) {
  return (
    <div className="relative shrink-0">
      <div
        className="flex items-center justify-center rounded-full font-semibold text-white"
        style={{ width: size, height: size, backgroundColor: bg, fontSize: Math.round(size * 0.3) }}
      >
        {initials}
      </div>
      {online && (
        <span
          className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-success"
          style={{ boxShadow: `0 0 0 2px ${ringColor}` }}
        />
      )}
    </div>
  );
}

/* ── BrandClient ────────────────────────────────────────────────────────── */

export function BrandClient() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20 sm:py-24">

      {/* Hero */}
      <MotionFade direction="down" distance={14} duration={0.6} className="space-y-6">
        <Chip color="accent" variant="soft" size="sm">
          <SparklesIcon size={13} />
          <Chip.Label>Charte de marque</Chip.Label>
        </Chip>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-accent/10">
            <Image src="/logo/Alfychat.svg" alt="Logo AlfyChat" width={48} height={48} priority />
          </div>
          <div className="space-y-3">
            <h1 className="font-heading text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl">
              La marque <span className="text-accent">AlfyChat</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Nos logos, couleurs et règles d'usage. Tout ce qu'il faut pour représenter AlfyChat
              avec cohérence — partout, à 100 %.
            </p>
          </div>
        </div>
      </MotionFade>

      <div className="my-16 border-t border-separator" />

      {/* Logos */}
      <section className="space-y-6">
        <div className="flex items-center gap-2.5">
          <ImageIcon size={18} className="text-accent" />
          <h2 className="font-heading text-2xl tracking-tight text-foreground">Logos</h2>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Téléchargez le format adapté à votre support. Tous les fichiers sont vectoriels (SVG) et
          se redimensionnent sans perte.
        </p>
        <MotionStagger stagger={0.06} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {logos.map((logo) => (
            <MotionStaggerItem key={logo.file}>
              <Card className="h-full">
                <Card.Content
                  className={`flex h-36 items-center justify-center rounded-2xl ${
                    logo.dark ? 'bg-zinc-900' : 'bg-surface-secondary'
                  }`}
                >
                  <Image
                    src={logo.file}
                    alt={`AlfyChat — ${logo.label}`}
                    width={150}
                    height={70}
                    className="max-h-20 w-auto object-contain"
                  />
                </Card.Content>
                <Card.Footer className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{logo.label}</span>
                  <Button
                    size="sm"
                    variant="tertiary"
                    isIconOnly
                    aria-label={`Télécharger ${logo.label}`}
                    render={(props) => (
                      <a
                        {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
                        href={logo.file}
                        download
                      />
                    )}
                  >
                    <DownloadIcon size={16} />
                  </Button>
                </Card.Footer>
              </Card>
            </MotionStaggerItem>
          ))}
        </MotionStagger>
      </section>

      <div className="my-16 border-t border-separator" />

      {/* Couleurs */}
      <section className="space-y-6">
        <div className="flex items-center gap-2.5">
          <PaletteIcon size={18} className="text-accent" />
          <h2 className="font-heading text-2xl tracking-tight text-foreground">Couleurs</h2>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Cliquez sur une couleur pour copier sa valeur hexadécimale.
        </p>

        <h3 className="pt-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
          Palette principale
        </h3>
        <MotionStagger stagger={0.05} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {brandColors.map((c) => (
            <MotionStaggerItem key={c.hex}>
              <ColorSwatch {...c} />
            </MotionStaggerItem>
          ))}
        </MotionStagger>

        <h3 className="pt-4 text-xs font-semibold uppercase tracking-[0.15em] text-muted">
          Couleurs sémantiques
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {semanticColors.map((c) => (
            <ColorSwatch key={c.hex} name={c.name} hex={c.hex} role={`Jeton ${c.token}`} />
          ))}
        </div>
      </section>

      <div className="my-16 border-t border-separator" />

      {/* Typographie */}
      <section className="space-y-6">
        <div className="flex items-center gap-2.5">
          <span className="font-heading text-lg text-accent">Aa</span>
          <h2 className="font-heading text-2xl tracking-tight text-foreground">Typographie</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <Card.Header>
              <Card.Title className="font-heading text-3xl tracking-tight">Krona One</Card.Title>
              <Card.Description>
                Titres &amp; identité — classe{' '}
                <code className="font-mono text-xs">font-heading</code>
              </Card.Description>
            </Card.Header>
            <Card.Content className="space-y-2">
              <p className="font-heading text-2xl text-foreground">AaBbCc 0123456789</p>
              <p className="font-heading text-sm text-muted">
                La police signature de la marque AlfyChat.
              </p>
            </Card.Content>
          </Card>
          <Card>
            <Card.Header>
              <Card.Title className="text-3xl">Geist Sans</Card.Title>
              <Card.Description>
                Texte courant &amp; interface — classe{' '}
                <code className="font-mono text-xs">font-sans</code>
              </Card.Description>
            </Card.Header>
            <Card.Content className="space-y-2">
              <p className="text-2xl text-foreground">AaBbCc 0123456789</p>
              <p className="text-sm text-muted">
                Lisible et neutre pour les paragraphes et l'interface.
              </p>
            </Card.Content>
          </Card>
        </div>
      </section>

      <div className="my-16 border-t border-separator" />

      {/* Composants */}
      <section className="space-y-6">
        <div className="flex items-center gap-2.5">
          <SparklesIcon size={18} className="text-accent" />
          <h2 className="font-heading text-2xl tracking-tight text-foreground">Composants</h2>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Aperçu en direct des composants HeroUI v3, habillés de l'identité AlfyChat.
        </p>

        <Tabs defaultSelectedKey="actions" className="w-full">
          <Tabs.ListContainer>
            <Tabs.List aria-label="Démonstration des composants">
              <Tabs.Tab id="actions">Actions<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="saisie">Saisie<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="retour">Retour<Tabs.Indicator /></Tabs.Tab>
              <Tabs.Tab id="interface">Interface<Tabs.Indicator /></Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          {/* Onglet Actions */}
          <Tabs.Panel id="actions" className="pt-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <Card.Header>
                  <Card.Title>Boutons</Card.Title>
                  <Card.Description>Variantes &amp; tailles</Card.Description>
                </Card.Header>
                <Card.Content className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button>Primaire</Button>
                    <Button variant="secondary">Secondaire</Button>
                    <Button variant="tertiary">Tertiaire</Button>
                    <Button variant="outline">Contour</Button>
                    <Button variant="ghost">Fantôme</Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm">Petit</Button>
                    <Button size="md">Moyen</Button>
                    <Button size="lg">Grand</Button>
                    <Button variant="danger">Supprimer</Button>
                  </div>
                </Card.Content>
              </Card>

              <Card>
                <Card.Header>
                  <Card.Title>Étiquettes &amp; bascules</Card.Title>
                  <Card.Description>Chips et switches</Card.Description>
                </Card.Header>
                <Card.Content className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    <Chip color="accent" variant="soft">Nouveau</Chip>
                    <Chip color="success" variant="soft">Actif</Chip>
                    <Chip color="warning" variant="soft">Bêta</Chip>
                    <Chip color="danger" variant="soft">Obsolète</Chip>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Switch defaultSelected>
                      <Switch.Control><Switch.Thumb /></Switch.Control>
                      <Switch.Content>
                        <Label className="text-sm">Notifications</Label>
                      </Switch.Content>
                    </Switch>
                    <Switch>
                      <Switch.Control><Switch.Thumb /></Switch.Control>
                      <Switch.Content>
                        <Label className="text-sm">Mode privé</Label>
                      </Switch.Content>
                    </Switch>
                  </div>
                </Card.Content>
              </Card>
            </div>
          </Tabs.Panel>

          {/* Onglet Saisie */}
          <Tabs.Panel id="saisie" className="pt-6">
            <Card className="max-w-md">
              <Card.Header>
                <Card.Title>Champ de saisie</Card.Title>
                <Card.Description>TextField + Input</Card.Description>
              </Card.Header>
              <Card.Content className="flex flex-col gap-4">
                <TextField name="pseudo">
                  <Label>Nom d'utilisateur</Label>
                  <Input placeholder="ex. alfy_user" variant="secondary" />
                </TextField>
                <TextField name="email" type="email">
                  <Label>Adresse e-mail</Label>
                  <Input placeholder="vous@exemple.com" variant="secondary" />
                </TextField>
                <Button className="mt-1">Enregistrer</Button>
              </Card.Content>
            </Card>
          </Tabs.Panel>

          {/* Onglet Retour */}
          <Tabs.Panel id="retour" className="pt-6">
            <div className="grid w-full max-w-2xl gap-3">
              <Alert status="accent">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Mise à jour disponible</Alert.Title>
                  <Alert.Description>
                    Une nouvelle version d'AlfyChat est prête.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
              <Alert status="success">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Profil mis à jour</Alert.Title>
                </Alert.Content>
              </Alert>
              <Alert status="warning">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Maintenance planifiée</Alert.Title>
                  <Alert.Description>
                    Services indisponibles dimanche de 2 h à 6 h UTC.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Connexion impossible</Alert.Title>
                  <Alert.Description>
                    Vérifiez votre connexion internet puis réessayez.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            </div>
          </Tabs.Panel>

          {/* Onglet Interface */}
          <Tabs.Panel id="interface" className="pt-6">
            <div className="space-y-8">

              {/* ── Messagerie directe ── */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
                  Messagerie directe
                </p>
                <Card className="overflow-hidden p-0">
                  <div className="flex h-[400px]">

                    {/* Sidebar conversations */}
                    <div className="flex w-64 shrink-0 flex-col border-r border-separator bg-surface-secondary">
                      <div className="flex items-center justify-between px-4 py-3.5">
                        <p className="text-sm font-semibold text-foreground">Messages</p>
                        <Button size="sm" variant="ghost" isIconOnly aria-label="Nouveau DM">
                          <UsersIcon size={14} />
                        </Button>
                      </div>
                      <div className="mx-3 mb-3 flex items-center gap-2 rounded-xl bg-surface px-3 py-2 ring-1 ring-separator">
                        <SearchIcon size={13} className="shrink-0 text-muted" />
                        <span className="text-xs text-muted">Rechercher…</span>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        {mockConvos.map((c, i) => (
                          <div
                            key={c.id}
                            className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors ${
                              i === 0 ? 'bg-accent/10' : 'hover:bg-surface'
                            }`}
                          >
                            <Avatar
                              initials={c.initials}
                              bg={c.bg}
                              online={c.online}
                              size={38}
                              ringColor="var(--surface-secondary)"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`truncate text-xs font-semibold ${i === 0 ? 'text-accent' : 'text-foreground'}`}>
                                  {c.name}
                                </span>
                                <span className="shrink-0 text-[10px] text-muted">{c.time}</span>
                              </div>
                              <p className="truncate text-[11px] text-muted">{c.msg}</p>
                            </div>
                            {c.unread > 0 && (
                              <div className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                                {c.unread}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Fenêtre de chat */}
                    <div className="flex min-w-0 flex-1 flex-col bg-surface">
                      {/* En-tête */}
                      <div className="flex items-center justify-between border-b border-separator px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar initials="AM" bg="#7627FF" online size={32} />
                          <div>
                            <p className="text-sm font-semibold text-foreground">Alice Martin</p>
                            <p className="text-[11px] text-success">En ligne</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Button size="sm" variant="ghost" isIconOnly aria-label="Appel vidéo">
                            <VideoIcon size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" isIconOnly aria-label="Appel vocal">
                            <PhoneIcon size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" isIconOnly aria-label="Options">
                            <MoreHorizontalIcon size={14} />
                          </Button>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="flex flex-1 flex-col justify-end gap-2 overflow-y-auto px-5 py-4">
                        {mockMessages.map((m) => (
                          <div
                            key={m.id}
                            className={`flex items-end gap-2 ${m.sent ? 'flex-row-reverse' : 'flex-row'}`}
                          >
                            {!m.sent && <Avatar initials="AM" bg="#7627FF" size={26} />}
                            <div
                              className={`max-w-[72%] rounded-2xl px-3.5 py-2 text-sm ${
                                m.sent
                                  ? 'bg-accent text-white'
                                  : 'bg-surface-secondary text-foreground'
                              }`}
                            >
                              <p className="leading-snug">{m.text}</p>
                              <p className={`mt-0.5 text-[10px] ${m.sent ? 'text-right text-white/50' : 'text-muted'}`}>
                                {m.time}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Saisie */}
                      <div className="border-t border-separator p-3">
                        <div className="flex items-center gap-1.5 rounded-xl bg-surface-secondary px-2 py-1.5">
                          <Button size="sm" variant="ghost" isIconOnly aria-label="Fichier">
                            <PaperclipIcon size={13} />
                          </Button>
                          <span className="flex-1 px-1 text-sm text-muted">Message à Alice…</span>
                          <Button size="sm" variant="ghost" isIconOnly aria-label="Emoji">
                            <SmileIcon size={13} />
                          </Button>
                          <Button size="sm" isIconOnly aria-label="Envoyer">
                            <SendIcon size={13} />
                          </Button>
                        </div>
                      </div>
                    </div>

                  </div>
                </Card>
              </div>

              {/* ── Interface serveur ── */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
                  Interface serveur
                </p>
                <Card className="overflow-hidden p-0">
                  <div className="flex h-[380px]">

                    {/* Sidebar canaux */}
                    <div className="flex w-56 shrink-0 flex-col border-r border-separator bg-surface-secondary">
                      <div className="flex items-center justify-between border-b border-separator px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Image src="/logo/Alfychat.svg" alt="AlfyChat" width={18} height={18} />
                          <span className="text-sm font-semibold text-foreground">AlfyChat</span>
                        </div>
                        <Button size="sm" variant="ghost" isIconOnly aria-label="Menu serveur">
                          <MoreHorizontalIcon size={13} />
                        </Button>
                      </div>
                      <div className="flex-1 overflow-hidden px-2 py-3">
                        <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted">
                          Canaux texte
                        </p>
                        {mockChannels.map((ch) => (
                          <div
                            key={ch.id}
                            className={`flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 transition-colors ${
                              ch.active
                                ? 'bg-accent/10 text-accent'
                                : 'text-muted hover:bg-surface hover:text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <HashIcon size={12} className="shrink-0 opacity-60" />
                              <span className="text-xs">{ch.name}</span>
                            </div>
                            {ch.unread > 0 && (
                              <div className="flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                                {ch.unread}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Zone de messages */}
                    <div className="flex min-w-0 flex-1 flex-col bg-surface">
                      <div className="flex items-center justify-between border-b border-separator px-5 py-3">
                        <div className="flex items-center gap-2">
                          <HashIcon size={15} className="text-muted" />
                          <span className="text-sm font-semibold text-foreground">général</span>
                          <span className="hidden text-xs text-muted sm:block">
                            — Canal principal du serveur
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Button size="sm" variant="ghost" isIconOnly aria-label="Membres">
                            <UsersIcon size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" isIconOnly aria-label="Rechercher">
                            <SearchIcon size={14} />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
                        {mockServerMessages.map((m) => (
                          <div key={m.id} className="flex gap-3">
                            <Avatar initials={m.initials} bg={m.bg} size={36} />
                            <div className="min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="text-sm font-semibold text-foreground">
                                  {m.author}
                                </span>
                                <span className="text-[11px] text-muted">{m.time}</span>
                              </div>
                              <p className="text-sm leading-snug text-foreground/80">{m.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-separator p-3">
                        <div className="flex items-center gap-1.5 rounded-xl bg-surface-secondary px-2 py-1.5">
                          <Button size="sm" variant="ghost" isIconOnly aria-label="Fichier">
                            <PaperclipIcon size={13} />
                          </Button>
                          <span className="flex-1 px-1 text-sm text-muted">
                            Message dans #général
                          </span>
                          <Button size="sm" variant="ghost" isIconOnly aria-label="Emoji">
                            <SmileIcon size={13} />
                          </Button>
                          <Button size="sm" isIconOnly aria-label="Envoyer">
                            <SendIcon size={13} />
                          </Button>
                        </div>
                      </div>
                    </div>

                  </div>
                </Card>
              </div>

            </div>
          </Tabs.Panel>
        </Tabs>
      </section>

      <div className="my-16 border-t border-separator" />

      {/* Règles d'usage */}
      <section className="space-y-6">
        <div className="flex items-center gap-2.5">
          <ShieldCheckIcon size={18} className="text-accent" />
          <h2 className="font-heading text-2xl tracking-tight text-foreground">Règles d'usage</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card variant="secondary">
            <Card.Header>
              <Card.Title className="flex items-center gap-2 text-success">
                <CheckIcon size={18} /> À faire
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <ul className="space-y-3">
                {dos.map((d) => (
                  <li key={d} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                    <CheckIcon size={16} className="mt-0.5 shrink-0 text-success" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </Card.Content>
          </Card>
          <Card variant="secondary">
            <Card.Header>
              <Card.Title className="flex items-center gap-2 text-danger">
                <span className="text-lg leading-none">×</span> À éviter
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <ul className="space-y-3">
                {donts.map((d) => (
                  <li key={d} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                    <span className="mt-0.5 shrink-0 text-base leading-none text-danger">×</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </Card.Content>
          </Card>
        </div>
      </section>

      <div className="my-16 border-t border-separator" />

      {/* Contact */}
      <MotionFade direction="up" distance={12} duration={0.6}>
        <Card variant="tertiary" className="items-start gap-3 p-8">
          <Card.Title className="font-heading text-xl tracking-tight">
            Une question sur la marque ?
          </Card.Title>
          <Card.Description className="text-sm leading-relaxed">
            Pour toute demande relative à l'utilisation de la marque AlfyChat, écrivez-nous à{' '}
            <a
              href="mailto:contact@alfycore.org"
              className="font-medium text-accent underline underline-offset-2 hover:opacity-80"
            >
              contact@alfycore.org
            </a>
            .
          </Card.Description>
          <Button
            className="mt-2"
            render={(props) => (
              <a
                {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
                href="mailto:contact@alfycore.org"
              />
            )}
          >
            Nous contacter
          </Button>
        </Card>
      </MotionFade>
    </main>
  );
}
