'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Card, Chip, Separator, Typography } from '@heroui/react';
import { LockIcon, ZapIcon, UsersIcon, ServerIcon, BotIcon } from '@/components/icons';

const MONO = { fontFamily: 'var(--font-geist-mono, monospace)' } as const;
const KRONA = { fontFamily: 'var(--font-krona), sans-serif' } as const;

function IconTile({ icon: Icon, accent }: { icon: typeof LockIcon; accent?: boolean }) {
  return (
    <div
      className="flex size-11 items-center justify-center rounded-xl"
      style={{
        background: accent
          ? 'color-mix(in oklch, var(--accent) 13%, transparent)'
          : 'color-mix(in oklch, var(--foreground) 6%, transparent)',
      }}
    >
      <Icon size={19} style={{ color: accent ? 'var(--accent)' : 'var(--foreground)' }} />
    </div>
  );
}

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

/* Bottom meta row: label → value, separated, mono */
function Spec({ items }: { items: [string, string][] }) {
  return (
    <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-6">
      {items.map(([label, value], i) => (
        <span key={label} className="flex items-center gap-3">
          <span className="flex items-baseline gap-1.5">
            <Typography type="body-xs" color="muted" style={MONO} className="uppercase tracking-wide">
              {label}
            </Typography>
            <Typography type="body-xs" className="text-foreground" style={MONO}>
              {value}
            </Typography>
          </span>
          {i < items.length - 1 && <Separator orientation="vertical" className="h-3" />}
        </span>
      ))}
    </div>
  );
}

type Feature = {
  icon: typeof LockIcon;
  title: string;
  desc: string;
  specs: [string, string][];
  span?: boolean;
  accent?: boolean;
};

const FEATURES: Feature[] = [
  {
    icon: LockIcon,
    title: 'Chiffrement de bout en bout',
    desc: "Chaque message, fichier et appel est chiffré sur votre appareil avant l'envoi. Nos serveurs ne voient que des données illisibles.",
    specs: [['Protocole', 'Signal'], ['Chiffrement', 'AES-256'], ['Audit', 'Public']],
    span: true,
    accent: true,
  },
  {
    icon: ZapIcon,
    title: 'Appels HD instantanés',
    desc: 'Voix et vidéo haute qualité, chiffrés de bout en bout, en pair-à-pair.',
    specs: [['Vidéo', '1080p'], ['Latence', '< 50ms']],
  },
  {
    icon: UsersIcon,
    title: 'Serveurs communautaires',
    desc: 'Salons, rôles et permissions configurables à volonté pour vos communautés.',
    specs: [['Rôles', 'Illimités'], ['Salons', 'Texte · Voix']],
  },
  {
    icon: ServerIcon,
    title: 'Auto-hébergement',
    desc: 'Déployez votre propre nœud en une commande. Vos données restent chez vous.',
    specs: [['Déploiement', 'Docker'], ['Contrôle', 'Total']],
  },
  {
    icon: BotIcon,
    title: 'API ouverte',
    desc: 'Créez des bots et intégrations via notre API REST documentée.',
    specs: [['API', 'REST'], ['Webhooks', 'Natifs']],
  },
];

export function HomeFeatures() {
  return (
    <section id="features" className="bg-surface py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-12">

        {/* Header */}
        <Reveal className="mb-14 flex max-w-xl flex-col gap-4">
          <Chip color="accent" variant="soft" size="sm" className="w-fit">
            <Chip.Label>Fonctionnalités</Chip.Label>
          </Chip>
          <Typography
            type="h2"
            weight="bold"
            className="text-foreground"
            style={{ ...KRONA, fontSize: 'clamp(1.9rem, 3vw, 2.6rem)', lineHeight: 1.1, letterSpacing: '-0.025em' }}
          >
            Tout ce qu'il vous faut, rien de superflu.
          </Typography>
          <Typography type="body" color="muted">
            Messagerie privée, appels HD, communautés et auto-hébergement dans une seule application.
          </Typography>
        </Reveal>

        {/* Bento grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06} className={f.span ? 'sm:col-span-2' : undefined}>
              <Card className="flex h-full min-h-56 flex-col p-7 transition-shadow duration-300 hover:shadow-lg">
                <IconTile icon={f.icon} accent={f.accent} />
                <Card.Header className="mt-5">
                  <Card.Title style={KRONA}>{f.title}</Card.Title>
                  <Card.Description className="max-w-md">{f.desc}</Card.Description>
                </Card.Header>
                <Spec items={f.specs} />
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
