'use client';

import NextLink from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { Card, Typography, buttonVariants } from '@heroui/react';
import { ArrowRightIcon, ShieldCheckIcon } from '@/components/icons';

const KRONA = { fontFamily: 'var(--font-krona), sans-serif' } as const;

export function HomeCta() {
  const reduce = useReducedMotion();

  return (
    <section id="download" className="bg-surface py-28">
      <div className="mx-auto max-w-4xl px-6 lg:px-12">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Card className="flex flex-col items-center gap-6 px-10 py-20 text-center">
            {/* Logo tile */}
            <div
              className="flex size-14 items-center justify-center rounded-2xl"
              style={{ background: 'var(--surface-secondary)' }}
            >
              <Image src="/logo/Alfychat.svg" alt="AlfyChat" width={30} height={30} className="dark:hidden" />
              <Image src="/logo/Alfychatlogowihte.svg" alt="AlfyChat" width={30} height={30} className="hidden dark:block" />
            </div>

            <Typography
              type="h2"
              weight="bold"
              className="text-foreground"
              style={{ ...KRONA, fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', lineHeight: 1.1, letterSpacing: '-0.025em' }}
            >
              Prêt à reprendre le contrôle ?
            </Typography>

            <Typography type="body" color="muted" className="max-w-sm">
              Rejoignez AlfyChat dès aujourd'hui. Gratuit, sans engagement, sans numéro de téléphone.
            </Typography>

            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <NextLink href="/register" className={buttonVariants({ size: 'lg' })}>
                Créer un compte gratuit
                <ArrowRightIcon size={13} />
              </NextLink>
              <NextLink
                href="/about"
                className={buttonVariants({ variant: 'tertiary', size: 'lg' })}
              >
                En savoir plus
              </NextLink>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <ShieldCheckIcon size={12} style={{ color: 'var(--success)' }} />
              <Typography type="body-xs" color="muted">Sans carte bancaire, sans engagement</Typography>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
