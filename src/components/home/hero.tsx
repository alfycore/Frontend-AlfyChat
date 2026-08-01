'use client';

import NextLink from 'next/link';
import { Fragment } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRightIcon } from '@/components/icons';
import { Button, Card, Chip, Separator, Typography, buttonVariants } from '@heroui/react';

const TRUST_TAGS = ['Auto-hébergeable', 'Open source', 'Sans numéro de tél.'];

const DISPLAY = {
  fontFamily: 'var(--font-krona), sans-serif',
  fontSize: 'clamp(2.6rem, 4.5vw, 5.5rem)',
  lineHeight: 1.04,
  letterSpacing: '-0.035em',
} as const;

export function HomeHero() {
  const reduce = useReducedMotion();

  const f = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] as const },
  });

  return (
    <section className="relative min-h-dvh bg-background">
      <div className="mx-auto grid min-h-dvh max-w-screen-2xl grid-cols-1 items-center gap-0 md:grid-cols-2">

        {/* ── Left — text (bord gauche aligné sur la navbar : px-6 lg:px-12) ── */}
        <div className="flex flex-col gap-7 px-6 py-28 lg:px-12">

          <motion.div {...f(0)}>
            <Chip color="accent" variant="soft" size="sm">
              <Chip.Label>Messagerie privée</Chip.Label>
            </Chip>
          </motion.div>

          <div className="flex flex-col">
            <motion.div {...f(0.08)}>
              <Typography type="h1" weight="bold" style={DISPLAY} className="text-foreground">
                La messagerie
              </Typography>
            </motion.div>
            <motion.div {...f(0.15)}>
              <Typography type="h1" weight="bold" style={{ ...DISPLAY, color: 'var(--accent)' }}>
                qui vous protège.
              </Typography>
            </motion.div>
          </div>

          <motion.div {...f(0.23)} className="max-w-sm">
            <Typography type="body" color="muted">
              Chiffrement de bout en bout, aucun suivi, serveurs en France.
              Vos conversations n'appartiennent qu'à vous.
            </Typography>
          </motion.div>

          <motion.div {...f(0.3)} className="flex flex-wrap items-center gap-4">
            <NextLink href="/register" className={buttonVariants({ size: 'lg' })}>
              Commencer gratuitement
            </NextLink>
            <NextLink
              href="#features"
              className={buttonVariants({ variant: 'ghost', size: 'lg' })}
            >
              En savoir plus
              <ArrowRightIcon size={13} />
            </NextLink>
          </motion.div>

          <motion.div {...f(0.37)} className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {TRUST_TAGS.map((tag, i) => (
              <Fragment key={tag}>
                <Typography type="body-xs" color="muted">{tag}</Typography>
                {i < TRUST_TAGS.length - 1 && (
                  <Separator orientation="vertical" className="h-3" />
                )}
              </Fragment>
            ))}
          </motion.div>
        </div>

        {/* ── Right — image inside HeroUI Card ── */}
        <motion.div
          initial={reduce ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex items-center justify-center px-8 py-16 lg:px-12"
        >
          <Card
            className="overflow-hidden p-0"
            style={{
              maxWidth: 720,
              boxShadow: '0 40px 100px color-mix(in oklch, black 22%, transparent)',
            }}
          >
            <img
              src="/heroimg.png"
              alt="Interface AlfyChat"
              className="w-full select-none"
              draggable={false}
            />
          </Card>
        </motion.div>

      </div>
    </section>
  );
}
