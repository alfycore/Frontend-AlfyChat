'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Card, Chip, Separator, Typography } from '@heroui/react';
import { LockIcon, ShieldCheckIcon, GlobeIcon, CodeIcon } from '@/components/icons';

const KRONA = { fontFamily: 'var(--font-krona), sans-serif' } as const;

const POINTS: { icon: typeof LockIcon; label: string; desc: string }[] = [
  {
    icon: LockIcon,
    label: 'Protocole Signal',
    desc: 'Standard de référence pour la messagerie chiffrée, audité en indépendance.',
  },
  {
    icon: ShieldCheckIcon,
    label: 'Zéro tracking',
    desc: 'Aucune publicité, aucun suivi comportemental, aucune revente de données.',
  },
  {
    icon: GlobeIcon,
    label: 'Données en France',
    desc: 'Serveurs hébergés sur le territoire français, soumis au droit européen.',
  },
  {
    icon: CodeIcon,
    label: 'Code auditable',
    desc: 'Source ouverte, vérifiable et contribuable par toute la communauté.',
  },
];

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
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

export function HomeSecurity() {
  return (
    <section id="security" className="bg-background py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-12">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-2 md:items-center">

          {/* Left — image inside HeroUI Card */}
          <Reveal delay={0.04} className="order-2 md:order-1">
            <Card className="overflow-hidden p-0">
              <img
                src="https://picsum.photos/seed/alfychat-privacy-security/800/600"
                alt="Sécurité et confidentialité AlfyChat"
                className="w-full select-none object-cover"
                draggable={false}
              />
            </Card>
          </Reveal>

          {/* Right — content */}
          <div className="order-1 flex flex-col md:order-2">
            <Reveal className="flex flex-col gap-4">
              <Chip color="accent" variant="soft" size="sm" className="w-fit">
                <Chip.Label>Sécurité</Chip.Label>
              </Chip>
              <Typography
                type="h2"
                weight="bold"
                className="text-foreground"
                style={{ ...KRONA, fontSize: 'clamp(1.9rem, 3vw, 2.6rem)', lineHeight: 1.1, letterSpacing: '-0.025em' }}
              >
                La vie privée n'est pas une option.
              </Typography>
              <Typography type="body" color="muted" className="max-w-md">
                AlfyChat est construit autour d'une conviction : vos conversations vous appartiennent.
                Chaque choix technique garantit cette promesse.
              </Typography>
            </Reveal>

            <div className="mt-9 flex flex-col">
              {POINTS.map(({ icon: Icon, label, desc }, i) => (
                <Reveal key={label} delay={0.06 + i * 0.07}>
                  {i > 0 && <Separator />}
                  <div className="flex items-start gap-4 py-5">
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: 'color-mix(in oklch, var(--foreground) 6%, transparent)' }}
                    >
                      <Icon size={14} style={{ color: 'var(--foreground)' }} />
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Typography type="body-sm" weight="semibold" className="text-foreground">{label}</Typography>
                      <Typography type="body-xs" color="muted">{desc}</Typography>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
