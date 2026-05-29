'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

const ITEMS = [
  {
    q: 'AlfyChat est-il vraiment gratuit ?',
    a: "Oui, entièrement. Pas de version premium, pas de limite de messages, pas d'espace de stockage caché. AlfyChat est développé par une association à but non lucratif, financée par des dons volontaires.",
  },
  {
    q: 'Qui peut lire mes messages ?',
    a: "Personne d'autre que vous et votre interlocuteur. Le chiffrement de bout en bout (protocole Signal) garantit que les messages sont chiffrés sur votre appareil avant l'envoi. Nos serveurs ne voient que des données illisibles.",
  },
  {
    q: "Faut-il un numéro de téléphone pour s'inscrire ?",
    a: "Non. L'inscription se fait uniquement avec un nom d'utilisateur et un mot de passe. Aucun numéro de téléphone, aucune adresse e-mail obligatoire, aucune vérification d'identité.",
  },
  {
    q: "Comment fonctionne l'auto-hébergement ?",
    a: "Vous pouvez déployer votre propre noeud AlfyChat sur votre serveur ou votre PC. Vos données restent chez vous. La configuration prend quelques minutes via notre CLI : alfychat-server start --server-id=X --token=Y.",
  },
  {
    q: 'Le code source est-il vraiment ouvert ?',
    a: "Oui. L'intégralité du code — gateway, microservices, frontend — est disponible publiquement. Vous pouvez l'inspecter, le modifier et le redistribuer. Les contributions sont les bienvenues via notre portail développeurs.",
  },
  {
    q: 'Où sont hébergés les serveurs ?',
    a: "Sur le territoire français, soumis au droit européen (RGPD). Aucune donnée ne transite par des serveurs situés hors de l'Union européenne.",
  },
];

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <button
        className="w-full flex items-start justify-between gap-6 py-6 text-left group"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span
          className="text-[15px] font-medium text-[#111111] dark:text-[#fafafa] leading-snug group-hover:text-[#333333] dark:group-hover:text-white transition-colors duration-150"
          style={{ fontFamily: 'var(--font-krona), sans-serif' }}
        >
          {question}
        </span>

        {/* +/- toggle — protocol §5 Accordions */}
        <span
          className="shrink-0 mt-0.5 size-5 flex items-center justify-center text-[#787774] dark:text-[#71717a] text-[18px] leading-none font-light transition-transform duration-200"
          aria-hidden
          style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}
        >
          +
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <p className="pb-6 text-[14px] text-[#787774] dark:text-[#71717a] leading-relaxed max-w-2xl">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Divider — strips container boxes per protocol */}
      <div className="border-b border-[#EAEAEA] dark:border-[#27272a]" />
    </motion.div>
  );
}

export function HomeFaq() {
  return (
    <section className="py-28 bg-[#FBFBFA] dark:bg-[#09090b] border-t border-[#EAEAEA] dark:border-[#27272a]">
      <div className="mx-auto max-w-6xl px-8">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_1.6fr] lg:items-start">

          {/* Left: sticky label */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:sticky lg:top-24"
          >
            <span
              className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#787774] dark:text-[#71717a]"
              style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}
            >
              Questions fréquentes
            </span>
            <h2
              className="mt-3 text-[2.2rem] leading-[1.1] tracking-[-0.02em] text-[#111111] dark:text-[#fafafa] font-bold"
              style={{ fontFamily: 'var(--font-krona), sans-serif' }}
            >
              Des réponses
              <br />
              directes.
            </h2>
            <p className="mt-4 text-[14px] text-[#787774] dark:text-[#71717a] leading-relaxed">
              Vous avez d'autres questions ? Notre documentation est disponible en ligne ou contactez-nous directement.
            </p>
            <a
              href="/developers/docs"
              className="mt-6 inline-flex items-center gap-2 text-[13px] text-[#111111] dark:text-[#fafafa] font-medium border-b border-[#EAEAEA] dark:border-[#27272a] pb-0.5 hover:border-[#111111] dark:hover:border-white transition-colors duration-150"
            >
              Lire la documentation
            </a>
          </motion.div>

          {/* Right: accordion — no container boxes per protocol §5 */}
          <div>
            {/* Top divider */}
            <div className="border-t border-[#EAEAEA] dark:border-[#27272a]" />
            {ITEMS.map((item, i) => (
              <FAQItem
                key={item.q}
                question={item.q}
                answer={item.a}
                index={i}
              />
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
