'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { ArrowRightIcon } from '@/components/icons';
import { Eyebrow, SectionTitle, EASE } from './section';

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
    a: 'Vous pouvez déployer votre propre nœud AlfyChat sur votre serveur ou votre PC. Vos données restent chez vous. La configuration prend quelques minutes via notre CLI : alfychat-server start --server-id=X --token=Y.',
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

export function HomeFaq() {
  return (
    <section className="border-t border-border bg-muted/30 py-28">
      <div className="mx-auto max-w-6xl px-8">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_1.6fr] lg:items-start">

          {/* Colonne gauche — sticky */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="lg:sticky lg:top-24"
          >
            <Eyebrow>Questions fréquentes</Eyebrow>
            <SectionTitle>
              Des réponses
              <br />
              directes.
            </SectionTitle>
            <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
              Vous avez d&apos;autres questions ? Notre documentation est disponible en ligne ou contactez-nous directement.
            </p>
            <Link
              href="/developers/docs"
              className="group mt-6 inline-flex items-center gap-1.5 border-b border-border pb-0.5 text-[13px] font-medium text-foreground transition-colors duration-150 hover:border-foreground"
            >
              Lire la documentation
              <ArrowRightIcon size={12} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          {/* Colonne droite — accordéon shadcn */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.6, delay: 0.05, ease: EASE }}
          >
            <Accordion type="single" collapsible className="border-t border-border">
              {ITEMS.map((item, i) => (
                <AccordionItem key={item.q} value={`item-${i}`} className="border-border">
                  <AccordionTrigger className="gap-6 py-6 font-heading text-[15px] font-medium text-foreground no-underline hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="max-w-2xl pb-6 text-[14px] leading-relaxed text-muted-foreground">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
