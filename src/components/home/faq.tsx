'use client';

import NextLink from 'next/link';
import { motion } from 'motion/react';
import { Accordion, Chip, Typography, buttonVariants } from '@heroui/react';
import { PlusIcon, ArrowRightIcon } from '@/components/icons';

const KRONA = { fontFamily: 'var(--font-krona), sans-serif' } as const;

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
    a: "Vous pouvez déployer votre propre nœud AlfyChat sur votre serveur ou votre PC. Vos données restent chez vous. La configuration prend quelques minutes via notre CLI : alfychat-server start --server-id=X --token=Y.",
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
    <section className="bg-background py-28">
      <div className="mx-auto max-w-6xl px-6 lg:px-12">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_1.6fr] lg:items-start">

          {/* Left — sticky intro */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col gap-4 lg:sticky lg:top-24"
          >
            <Chip color="accent" variant="soft" size="sm" className="w-fit">
              <Chip.Label>Questions fréquentes</Chip.Label>
            </Chip>
            <Typography
              type="h2"
              weight="bold"
              className="text-foreground"
              style={{ ...KRONA, fontSize: 'clamp(1.9rem, 3vw, 2.6rem)', lineHeight: 1.1, letterSpacing: '-0.025em' }}
            >
              Des réponses directes.
            </Typography>
            <Typography type="body" color="muted" className="max-w-sm">
              Vous avez d'autres questions ? Notre documentation est disponible en ligne ou contactez-nous directement.
            </Typography>
            <NextLink
              href="/developers/docs"
              className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'mt-2 w-fit' })}
            >
              Lire la documentation
              <ArrowRightIcon size={13} />
            </NextLink>
          </motion.div>

          {/* Right — HeroUI Accordion */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <Accordion className="w-full">
              {ITEMS.map((item) => (
                <Accordion.Item key={item.q}>
                  <Accordion.Heading>
                    <Accordion.Trigger>
                      <span style={KRONA} className="text-[15px] font-medium">{item.q}</span>
                      <Accordion.Indicator>
                        <PlusIcon size={14} />
                      </Accordion.Indicator>
                    </Accordion.Trigger>
                  </Accordion.Heading>
                  <Accordion.Panel>
                    <Accordion.Body>
                      <Typography type="body-sm" color="muted">{item.a}</Typography>
                    </Accordion.Body>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
