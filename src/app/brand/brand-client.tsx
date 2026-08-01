'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Avatar, Badge, Button, Chip, Surface, Tabs } from '@heroui/react';
import {
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  CrownIcon,
  DownloadIcon,
  HashIcon,
  MicIcon,
  MicOffIcon,
  MonitorUpIcon,
  MoreHorizontalIcon,
  PhoneIcon,
  PhoneOffIcon,
  PinIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  ShieldCheckIcon,
  SmileIcon,
  UsersIcon,
  VideoIcon,
  Volume2Icon,
  XIcon,
} from '@/components/icons';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';

/* ── Données de marque ──────────────────────────────────────────────────── */

const brandColors = [
  { name: 'Violet AlfyChat', hex: '#7627FF', role: 'Couleur primaire — actions, accents, identité', light: false },
  { name: 'Violet Profond',  hex: '#5B22D6', role: 'Ombres, dégradés, états pressés',               light: false },
  { name: 'Gris Nuage',      hex: '#E3E3E3', role: 'Détails du logo, surfaces neutres',             light: true  },
  { name: 'Encre',           hex: '#111111', role: 'Texte principal, contraste maximal',            light: false },
  { name: 'Blanc',           hex: '#FFFFFF', role: 'Fond clair, texte sur violet',                  light: true  },
];

const semanticColors = [
  { name: 'Succès',        hex: '#16A34A', role: 'Jeton --success', light: false },
  { name: 'Avertissement', hex: '#F59E0B', role: 'Jeton --warning', light: true  },
  { name: 'Danger',        hex: '#DC2626', role: 'Jeton --danger',  light: false },
];

const logos = [
  { label: 'Icône — couleur',    file: '/logo/Alfychat.svg',                 onAccent: false },
  { label: 'Icône — noir',       file: '/logo/Alfychatlogoblack.svg',        onAccent: false },
  { label: 'Icône — blanc',      file: '/logo/Alfychatlogowihte.svg',        onAccent: true  },
  { label: 'Logo + nom — noir',  file: '/logo/Alfychatlogotitleblack.svg',   onAccent: false },
  { label: 'Logo + nom — blanc', file: '/logo/Alfychatlogotitlewihte.svg',   onAccent: true  },
  { label: 'Vertical — noir',    file: '/logo/Alfychatlogotitleupblack.svg', onAccent: false },
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

/* ── Données des maquettes d'interface ──────────────────────────────────── */

const mockConvos = [
  { id: 1, name: 'Alice Martin',  msg: 'Tu as vu la nouvelle update ?',  time: '14:23', unread: 3, online: true,  initials: 'AM', bg: '#7627FF' },
  { id: 2, name: 'Bob Dupont',    msg: 'Merci pour le partage !',        time: '12:01', unread: 0, online: false, initials: 'BD', bg: '#5B22D6' },
  { id: 3, name: 'Équipe Design', msg: 'Réunion à 16 h confirmée',       time: '11:45', unread: 1, online: true,  initials: 'ÉD', bg: '#16A34A' },
  { id: 4, name: 'Clara Leblanc', msg: 'Parfait, je regarde ça ce soir', time: 'Hier',  unread: 0, online: false, initials: 'CL', bg: '#F59E0B' },
];

const mockMessages = [
  { id: 1, text: 'Salut ! Tu as regardé la nouvelle charte ?',        sent: false, time: '14:20' },
  { id: 2, text: 'Oui, le violet rend vraiment bien en sombre.',      sent: true,  time: '14:21' },
  { id: 3, text: "C'est la couleur signature, elle ne bouge jamais.", sent: false, time: '14:22' },
  { id: 4, text: 'Parfait, on envoie pour validation alors ?',        sent: true,  time: '14:23' },
];

const mockChannels = [
  { id: 1, name: 'général',      unread: 0, active: true  },
  { id: 2, name: 'annonces',     unread: 2, active: false },
  { id: 3, name: 'design',       unread: 0, active: false },
  { id: 4, name: 'dev-frontend', unread: 5, active: false },
];

const mockServerMessages = [
  { id: 1, author: 'Alice Martin', initials: 'AM', bg: '#7627FF', admin: true,  time: "Aujourd'hui à 10:12", text: 'Bienvenue sur le serveur AlfyChat. Le nœud auto-hébergé est en ligne.' },
  { id: 2, author: 'Bob Dupont',   initials: 'BD', bg: '#5B22D6', admin: false, time: "Aujourd'hui à 10:15", text: 'Impressionnant, les messages restent chez nous du coup ?' },
  { id: 3, author: 'Alice Martin', initials: 'AM', bg: '#7627FF', admin: true,  time: "Aujourd'hui à 10:16", text: 'Exactement — tout est stocké sur notre propre machine.' },
];

/* ── Copie presse-papiers ───────────────────────────────────────────────── */

function useCopyHex() {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const copy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      toast.success(`${hex} copié`);
      setTimeout(() => setCopiedHex(null), 1400);
    } catch {
      toast.error('Copie impossible');
    }
  };

  return { copiedHex, copy };
}

/* ── Bande de palette interactive ───────────────────────────────────────── */

function PaletteBand({
  colors,
  tall = true,
}: {
  colors: { name: string; hex: string; role: string; light: boolean }[];
  tall?: boolean;
}) {
  const { copiedHex, copy } = useCopyHex();

  return (
    <div className={`flex w-full flex-col overflow-hidden rounded-3xl sm:flex-row ${tall ? 'sm:h-48' : 'sm:h-32'}`}>
      {colors.map((c) => {
        const fg = c.light ? 'text-black/80' : 'text-white';
        const fgMuted = c.light ? 'text-black/50' : 'text-white/60';
        return (
          <button
            key={c.hex}
            type="button"
            onClick={() => copy(c.hex)}
            aria-label={`Copier ${c.name} ${c.hex}`}
            className="group relative h-24 flex-1 cursor-pointer text-left transition-all duration-500 ease-out hover:flex-[1.7] focus:outline-none focus-visible:flex-[1.7] sm:h-auto"
            style={{ backgroundColor: c.hex }}
          >
            <span className={`absolute right-3 top-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${fgMuted}`}>
              {copiedHex === c.hex ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
            </span>
            <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-4">
              <span className={`text-sm font-semibold ${fg}`}>{c.name}</span>
              <span className={`font-mono text-xs uppercase ${fgMuted}`}>{c.hex}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Avatar de maquette (initiales colorées + statut) ───────────────────── */

function MockAvatar({
  initials,
  bg,
  online,
  size = 'md',
}: {
  initials: string;
  bg: string;
  online?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const avatar = (
    <Avatar size={size}>
      <Avatar.Fallback className="font-semibold text-white" style={{ backgroundColor: bg }}>
        {initials}
      </Avatar.Fallback>
    </Avatar>
  );

  if (!online) return avatar;

  return (
    <Badge.Anchor>
      {avatar}
      <Badge aria-label="En ligne" color="success" placement="bottom-right" size="sm" />
    </Badge.Anchor>
  );
}

/* ── Maquette : messagerie directe ──────────────────────────────────────── */

function MockDirectMessages() {
  return (
    <Surface className="flex h-115 overflow-hidden rounded-3xl">
      {/* Conversations */}
      <div className="hidden w-72 shrink-0 flex-col bg-surface-secondary p-3 sm:flex">
        <div className="flex items-center justify-between px-2 py-2">
          <p className="text-sm font-semibold text-foreground">Messages</p>
          <Button size="sm" variant="ghost" isIconOnly aria-label="Nouvelle conversation">
            <PlusIcon size={15} />
          </Button>
        </div>
        <div className="mx-1 mb-3 flex items-center gap-2 rounded-full bg-surface px-3.5 py-2">
          <SearchIcon size={13} className="shrink-0 text-muted" />
          <span className="text-xs text-muted">Rechercher</span>
        </div>
        <div className="flex flex-col gap-0.5">
          {mockConvos.map((c, i) => (
            <div
              key={c.id}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl px-2.5 py-2.5 transition-colors duration-200 ${
                i === 0 ? 'bg-surface' : 'hover:bg-surface/60'
              }`}
            >
              <MockAvatar initials={c.initials} bg={c.bg} online={c.online} size="sm" />
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
                <span className="flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[9px] font-bold text-accent-foreground">
                  {c.unread}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Fenêtre de discussion */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <MockAvatar initials="AM" bg="#7627FF" online size="sm" />
            <div>
              <p className="text-sm font-semibold text-foreground">Alice Martin</p>
              <p className="text-[11px] text-success">En ligne</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <Button size="sm" variant="ghost" isIconOnly aria-label="Appel vocal">
              <PhoneIcon size={14} />
            </Button>
            <Button size="sm" variant="ghost" isIconOnly aria-label="Appel vidéo">
              <VideoIcon size={14} />
            </Button>
            <Button size="sm" variant="ghost" isIconOnly aria-label="Options">
              <MoreHorizontalIcon size={14} />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-end gap-2 overflow-hidden px-5 py-4">
          {mockMessages.map((m) => (
            <div key={m.id} className={`flex items-end gap-2 ${m.sent ? 'flex-row-reverse' : 'flex-row'}`}>
              {!m.sent && <MockAvatar initials="AM" bg="#7627FF" size="sm" />}
              <div
                className={`max-w-[72%] rounded-3xl px-4 py-2.5 text-sm ${
                  m.sent ? 'bg-accent text-accent-foreground' : 'bg-surface-secondary text-foreground'
                }`}
              >
                <p className="leading-snug">{m.text}</p>
                <p className={`mt-0.5 text-[10px] ${m.sent ? 'text-right text-accent-foreground/55' : 'text-muted'}`}>
                  {m.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3">
          <div className="flex items-center gap-1.5 rounded-full bg-surface-secondary py-1.5 pl-2 pr-1.5">
            <Button size="sm" variant="ghost" isIconOnly aria-label="Joindre un fichier">
              <PlusIcon size={14} />
            </Button>
            <span className="flex-1 px-1 text-sm text-muted">Message à Alice</span>
            <Button size="sm" variant="ghost" isIconOnly aria-label="Emoji">
              <SmileIcon size={14} />
            </Button>
            <Button size="sm" isIconOnly aria-label="Envoyer">
              <SendIcon size={14} />
            </Button>
          </div>
        </div>
      </div>
    </Surface>
  );
}

/* ── Maquette : serveur communautaire ───────────────────────────────────── */

function MockServer() {
  return (
    <Surface className="flex h-115 overflow-hidden rounded-3xl">
      {/* Canaux */}
      <div className="hidden w-64 shrink-0 flex-col bg-surface-secondary p-3 sm:flex">
        <div className="flex items-center justify-between rounded-2xl bg-surface px-3.5 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Image src="/logo/Alfychat.svg" alt="AlfyChat" width={20} height={20} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">AlfyChat HQ</p>
              <p className="flex items-center gap-1.5 text-[10px] text-muted">
                <span className="size-1.5 rounded-full bg-success" />
                Nœud auto-hébergé en ligne
              </p>
            </div>
          </div>
          <Button size="sm" variant="ghost" isIconOnly aria-label="Paramètres du serveur">
            <MoreHorizontalIcon size={13} />
          </Button>
        </div>

        <p className="mb-1.5 mt-4 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted">
          Canaux texte
        </p>
        <div className="flex flex-col gap-0.5">
          {mockChannels.map((ch) => (
            <div
              key={ch.id}
              className={`flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors duration-200 ${
                ch.active ? 'bg-surface text-accent' : 'text-muted hover:bg-surface/60 hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <HashIcon size={12} className="shrink-0 opacity-60" />
                <span className="text-xs font-medium">{ch.name}</span>
              </div>
              {ch.unread > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground">
                  {ch.unread}
                </span>
              )}
            </div>
          ))}
        </div>

        <p className="mb-1.5 mt-4 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted">
          Canaux vocaux
        </p>
        <div className="flex cursor-pointer items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-muted transition-colors duration-200 hover:bg-surface/60 hover:text-foreground">
          <Volume2Icon size={12} className="shrink-0 opacity-60" />
          <span className="text-xs font-medium">salon-vocal</span>
        </div>
        <div className="ml-7 mt-1 flex items-center gap-2">
          <MockAvatar initials="BD" bg="#5B22D6" size="sm" />
          <span className="text-[11px] text-muted">Bob Dupont</span>
        </div>
      </div>

      {/* Fil du canal */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <HashIcon size={15} className="shrink-0 text-muted" />
            <span className="text-sm font-semibold text-foreground">général</span>
            <span className="hidden truncate text-xs text-muted md:block">— Canal principal du serveur</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button size="sm" variant="ghost" isIconOnly aria-label="Messages épinglés">
              <PinIcon size={14} />
            </Button>
            <Button size="sm" variant="ghost" isIconOnly aria-label="Membres">
              <UsersIcon size={14} />
            </Button>
            <Button size="sm" variant="ghost" isIconOnly aria-label="Rechercher">
              <SearchIcon size={14} />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-end gap-4 overflow-hidden px-5 py-4">
          {mockServerMessages.map((m) => (
            <div key={m.id} className="flex gap-3">
              <MockAvatar initials={m.initials} bg={m.bg} size="sm" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{m.author}</span>
                  {m.admin && (
                    <Chip color="accent" variant="soft" size="sm">
                      <CrownIcon size={11} />
                      <Chip.Label>Admin</Chip.Label>
                    </Chip>
                  )}
                  <span className="text-[11px] text-muted">{m.time}</span>
                </div>
                <p className="mt-0.5 text-sm leading-snug text-foreground/80">{m.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3">
          <div className="flex items-center gap-1.5 rounded-full bg-surface-secondary py-1.5 pl-2 pr-1.5">
            <Button size="sm" variant="ghost" isIconOnly aria-label="Joindre un fichier">
              <PlusIcon size={14} />
            </Button>
            <span className="flex-1 px-1 text-sm text-muted">Message dans #général</span>
            <Button size="sm" variant="ghost" isIconOnly aria-label="Emoji">
              <SmileIcon size={14} />
            </Button>
            <Button size="sm" isIconOnly aria-label="Envoyer">
              <SendIcon size={14} />
            </Button>
          </div>
        </div>
      </div>
    </Surface>
  );
}

/* ── Maquette : appel vidéo ─────────────────────────────────────────────── */

function MockCall() {
  return (
    <Surface className="flex h-115 flex-col overflow-hidden rounded-3xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-4">
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-foreground">Appel avec Alice Martin</p>
          <Chip color="success" variant="soft" size="sm">
            <ShieldCheckIcon size={11} />
            <Chip.Label>Chiffré de bout en bout</Chip.Label>
          </Chip>
        </div>
        <Chip variant="soft" size="sm">12:42</Chip>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          { name: 'Alice Martin', initials: 'AM', bg: '#7627FF', muted: false, speaking: true },
          { name: 'Vous',         initials: 'KH', bg: '#5B22D6', muted: true,  speaking: false },
        ].map((p) => (
          <div key={p.name} className="relative flex items-center justify-center rounded-2xl bg-surface-secondary">
            <MockAvatar initials={p.initials} bg={p.bg} size="lg" />
            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-surface px-3 py-1.5">
              <span className="text-xs font-medium text-foreground">{p.name}</span>
              {p.speaking && <span className="size-1.5 animate-pulse rounded-full bg-success" />}
            </div>
            {p.muted && (
              <span className="absolute bottom-3 right-3 flex size-7 items-center justify-center rounded-full bg-surface text-danger">
                <MicOffIcon size={13} />
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 pt-4">
        <Button variant="secondary" isIconOnly aria-label="Micro">
          <MicIcon size={16} />
        </Button>
        <Button variant="secondary" isIconOnly aria-label="Caméra">
          <VideoIcon size={16} />
        </Button>
        <Button variant="secondary" isIconOnly aria-label="Partager l'écran">
          <MonitorUpIcon size={16} />
        </Button>
        <Button variant="danger" isIconOnly aria-label="Raccrocher">
          <PhoneOffIcon size={16} />
        </Button>
      </div>
    </Surface>
  );
}

/* ── En-tête de section ─────────────────────────────────────────────────── */

function SectionHeader({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <MotionFade className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">{eyebrow}</p>
      <h2 className="font-heading text-3xl tracking-tight text-foreground sm:text-4xl">{title}</h2>
      {lead && <p className="max-w-2xl text-base leading-relaxed text-muted">{lead}</p>}
    </MotionFade>
  );
}

/* ── BrandClient ────────────────────────────────────────────────────────── */

export function BrandClient() {
  return (
    <main className="mx-auto max-w-6xl space-y-28 px-6 py-20 sm:py-28">

      {/* Hero — texte à gauche, bloc identité à droite */}
      <section className="grid items-center gap-12 lg:grid-cols-2">
        <MotionFade direction="right" distance={16} duration={0.7} className="space-y-7">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            Charte de marque
          </p>
          <h1 className="font-heading text-4xl leading-[1.06] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            La marque
            <br />
            <span className="text-accent">AlfyChat</span>
          </h1>
          <p className="max-w-md text-base leading-relaxed text-muted sm:text-lg">
            Un violet, une typographie, des règles simples. Tout ce qu'il faut pour
            représenter AlfyChat avec cohérence, sur tous les supports.
          </p>
          <div className="flex flex-wrap items-center gap-6 pt-1">
            <Button
              size="lg"
              render={(props) => (
                <a {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)} href="#logos" />
              )}
            >
              Télécharger les logos
            </Button>
            <a
              href="#couleurs"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-accent"
            >
              Explorer la palette
              <ArrowRightIcon size={15} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </a>
          </div>
        </MotionFade>

        <MotionFade direction="left" distance={16} duration={0.7} delay={0.1}>
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto flex aspect-square w-full max-w-md items-center justify-center rounded-[3rem] bg-accent lg:ml-auto"
          >
            <Image
              src="/logo/Alfychatlogowihte.svg"
              alt="Logo AlfyChat"
              width={150}
              height={150}
              priority
              className="w-2/5"
            />
          </motion.div>
        </MotionFade>
      </section>

      {/* Logos */}
      <section id="logos" className="scroll-mt-24 space-y-8">
        <SectionHeader
          eyebrow="Ressources"
          title="Logos"
          lead="Tous les fichiers sont vectoriels (SVG) et se redimensionnent sans perte. Les versions blanches s'utilisent sur fonds sombres ou colorés."
        />
        <MotionStagger stagger={0.06} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {logos.map((logo) => (
            <MotionStaggerItem key={logo.file}>
              <div
                className={`group relative flex h-44 items-center justify-center overflow-hidden rounded-3xl transition-transform duration-300 ease-out hover:scale-[1.015] ${
                  logo.onAccent ? 'bg-accent' : 'bg-surface'
                }`}
              >
                <Image
                  src={logo.file}
                  alt={`AlfyChat — ${logo.label}`}
                  width={150}
                  height={70}
                  className="max-h-16 w-auto object-contain"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-3 pl-5">
                  <span className={`text-xs font-medium ${logo.onAccent ? 'text-accent-foreground/80' : 'text-muted'}`}>
                    {logo.label}
                  </span>
                  <span className="opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <Button
                      size="sm"
                      variant={logo.onAccent ? 'primary' : 'secondary'}
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
                      <DownloadIcon size={15} />
                    </Button>
                  </span>
                </div>
              </div>
            </MotionStaggerItem>
          ))}
        </MotionStagger>
      </section>

      {/* Couleurs */}
      <section id="couleurs" className="scroll-mt-24 space-y-8">
        <SectionHeader
          eyebrow="Palette"
          title="Couleurs"
          lead="Survolez pour agrandir, cliquez pour copier la valeur hexadécimale."
        />

        <MotionFade>
          <PaletteBand colors={brandColors} />
        </MotionFade>

        <MotionStagger stagger={0.05} className="grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
          {brandColors.map((c) => (
            <MotionStaggerItem key={c.hex} className="flex items-center gap-3">
              <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: c.hex }} />
              <p className="text-sm text-muted">
                <span className="font-semibold text-foreground">{c.name}</span> — {c.role}
              </p>
            </MotionStaggerItem>
          ))}
        </MotionStagger>

        <div className="space-y-4 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
            Couleurs sémantiques
          </p>
          <MotionFade>
            <PaletteBand colors={semanticColors} tall={false} />
          </MotionFade>
        </div>
      </section>

      {/* Typographie */}
      <section className="space-y-8">
        <SectionHeader
          eyebrow="Caractères"
          title="Typographie"
          lead="Deux polices, deux rôles : Krona One signe l'identité, Geist Sans porte le contenu."
        />
        <MotionStagger stagger={0.08} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MotionStaggerItem>
            <Surface variant="secondary" className="flex h-full flex-col gap-6 rounded-3xl p-8 sm:p-10">
              <p className="font-heading text-7xl tracking-tight text-foreground">Aa</p>
              <p className="font-heading text-sm leading-relaxed text-muted">
                ABCDEFGHIJKLMNOPQRSTUVWXYZ
                <br />
                abcdefghijklmnopqrstuvwxyz 0123456789
              </p>
              <div className="mt-auto space-y-1">
                <p className="font-heading text-xl tracking-tight text-foreground">Krona One</p>
                <p className="text-sm text-muted">
                  Titres &amp; identité — classe <code className="font-mono text-xs">font-heading</code>
                </p>
              </div>
            </Surface>
          </MotionStaggerItem>
          <MotionStaggerItem>
            <Surface variant="secondary" className="flex h-full flex-col gap-6 rounded-3xl p-8 sm:p-10">
              <p className="text-7xl font-semibold tracking-tight text-foreground">Aa</p>
              <p className="text-sm leading-relaxed text-muted">
                ABCDEFGHIJKLMNOPQRSTUVWXYZ
                <br />
                abcdefghijklmnopqrstuvwxyz 0123456789
              </p>
              <div className="mt-auto space-y-1">
                <p className="text-xl font-semibold tracking-tight text-foreground">Geist Sans</p>
                <p className="text-sm text-muted">
                  Texte courant &amp; interface — classe <code className="font-mono text-xs">font-sans</code>
                </p>
              </div>
            </Surface>
          </MotionStaggerItem>
        </MotionStagger>
      </section>

      {/* La marque en situation */}
      <section className="space-y-8">
        <SectionHeader
          eyebrow="En situation"
          title="L'interface AlfyChat"
          lead="La marque appliquée au produit réel : messagerie directe, serveurs auto-hébergés et appels chiffrés — construits avec HeroUI."
        />
        <MotionFade>
          <Tabs defaultSelectedKey="dm" className="w-full">
            <Tabs.ListContainer>
              <Tabs.List aria-label="Exemples d'interface AlfyChat">
                <Tabs.Tab id="dm">Messagerie<Tabs.Indicator /></Tabs.Tab>
                <Tabs.Tab id="serveur">Serveur<Tabs.Indicator /></Tabs.Tab>
                <Tabs.Tab id="appel">Appel vidéo<Tabs.Indicator /></Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            <Tabs.Panel id="dm" className="pt-6">
              <MockDirectMessages />
            </Tabs.Panel>
            <Tabs.Panel id="serveur" className="pt-6">
              <MockServer />
            </Tabs.Panel>
            <Tabs.Panel id="appel" className="pt-6">
              <MockCall />
            </Tabs.Panel>
          </Tabs>
        </MotionFade>
      </section>

      {/* Règles d'usage */}
      <section className="space-y-8">
        <SectionHeader eyebrow="Bonnes pratiques" title="Règles d'usage" />
        <MotionStagger stagger={0.08} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MotionStaggerItem>
            <Surface variant="secondary" className="h-full space-y-5 rounded-3xl p-8">
              <p className="flex items-center gap-2.5 text-base font-semibold text-success">
                <CheckIcon size={18} /> À faire
              </p>
              <ul className="space-y-3.5">
                {dos.map((d) => (
                  <li key={d} className="flex gap-3 text-sm leading-relaxed text-muted">
                    <CheckIcon size={16} className="mt-0.5 shrink-0 text-success" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </Surface>
          </MotionStaggerItem>
          <MotionStaggerItem>
            <Surface variant="secondary" className="h-full space-y-5 rounded-3xl p-8">
              <p className="flex items-center gap-2.5 text-base font-semibold text-danger">
                <XIcon size={18} /> À éviter
              </p>
              <ul className="space-y-3.5">
                {donts.map((d) => (
                  <li key={d} className="flex gap-3 text-sm leading-relaxed text-muted">
                    <XIcon size={16} className="mt-0.5 shrink-0 text-danger" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </Surface>
          </MotionStaggerItem>
        </MotionStagger>
      </section>

      {/* Contact */}
      <MotionFade>
        <Surface
          variant="secondary"
          className="flex flex-col items-start justify-between gap-6 rounded-3xl p-8 sm:flex-row sm:items-center sm:p-12"
        >
          <div className="space-y-2">
            <p className="font-heading text-2xl tracking-tight text-foreground">
              Une question sur la marque ?
            </p>
            <p className="max-w-md text-sm leading-relaxed text-muted">
              Pour toute demande relative à l'utilisation de la marque AlfyChat,
              écrivez-nous à{' '}
              <a
                href="mailto:contact@alfycore.org"
                className="font-medium text-accent transition-opacity hover:opacity-80"
              >
                contact@alfycore.org
              </a>
              .
            </p>
          </div>
          <Button
            size="lg"
            className="shrink-0"
            render={(props) => (
              <a
                {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
                href="mailto:contact@alfycore.org"
              />
            )}
          >
            Nous contacter
          </Button>
        </Surface>
      </MotionFade>
    </main>
  );
}
