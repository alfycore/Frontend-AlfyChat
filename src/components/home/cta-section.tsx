'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRightIcon, ShieldCheckIcon } from '@/components/icons';

export function HomeCta() {
  const reduce = useReducedMotion();

  return (
    <section id="download" className="py-28 bg-[#F7F6F3] dark:bg-[#0a0a0a] border-t border-[#EAEAEA] dark:border-[#27272a]">
      <div className="mx-auto max-w-4xl px-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[12px] border border-[#EAEAEA] dark:border-[#27272a] bg-white dark:bg-[#18181b] px-10 py-20 text-center"
          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex size-14 items-center justify-center rounded-[12px] border border-[#EAEAEA] dark:border-[#27272a] bg-[#F7F6F3] dark:bg-[#27272a]">
              <Image src="/logo/Alfychat.svg" alt="AlfyChat" width={32} height={32} />
            </div>
          </div>

          <h2
            className="text-[2rem] md:text-[2.4rem] leading-[1.1] tracking-[-0.02em] text-[#111111] dark:text-[#fafafa] font-bold mb-4"
            style={{ fontFamily: 'var(--font-krona), sans-serif' }}
          >
            Prêt à reprendre le contrôle ?
          </h2>

          <p className="text-[15px] text-[#787774] dark:text-[#71717a] leading-relaxed max-w-sm mx-auto mb-10">
            Rejoignez AlfyChat dès aujourd'hui. Gratuit, sans engagement, sans numéro de téléphone.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/register">
              <button
                className="inline-flex items-center gap-2 rounded-[6px] bg-[#7627FF] hover:bg-[#6020dd] px-7 py-3 text-[14px] font-medium text-white transition-all duration-200 active:scale-[0.98]"
              >
                Créer un compte gratuit
                <ArrowRightIcon size={13} />
              </button>
            </Link>
            <Link href="/about">
              <button
                className="inline-flex items-center gap-2 rounded-[6px] border border-[#EAEAEA] dark:border-[#27272a] bg-white dark:bg-transparent px-6 py-3 text-[14px] font-medium text-[#111111] dark:text-[#fafafa] transition-all duration-200 hover:bg-[#F7F6F3] dark:hover:bg-[#27272a] active:scale-[0.98]">
                En savoir plus
              </button>
            </Link>
          </div>

          <div className="flex justify-center mt-8">
            <div className="flex items-center gap-2 text-[11.5px] text-[#787774]">
              <ShieldCheckIcon size={11} className="text-[#346538]" />
              Sans carte bancaire, sans engagement
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
