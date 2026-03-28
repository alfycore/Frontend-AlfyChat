import Image from 'next/image';
import { Separator, Link } from '@heroui/react';

export const metadata = {
  title: 'Politique de Confidentialité — AlfyChat',
  description: "Politique de confidentialité de la plateforme AlfyChat, portée par l'association AlfyCore (loi 1901). RGPD, données personnelles, droits des utilisateurs.",
};

const TOC = [
  { n: '1',  title: 'Qui sommes-nous ? — Responsable de traitement' },
  { n: '2',  title: 'Données collectées' },
  { n: '3',  title: 'Finalités et bases légales du traitement' },
  { n: '4',  title: 'Durées de conservation' },
  { n: '5',  title: 'Chiffrement de bout en bout et confidentialité technique' },
  { n: '6',  title: 'Hébergement et transferts de données' },
  { n: '7',  title: 'Partage de données avec des tiers' },
  { n: '8',  title: 'Cookies et technologies de traçage' },
  { n: '9',  title: 'Sécurité des données' },
  { n: '10', title: 'Données des mineurs' },
  { n: '11', title: 'Vos droits (RGPD)' },
  { n: '12', title: 'Droit à la portabilité et export' },
  { n: '13', title: "Droit d'opposition et de limitation" },
  { n: '14', title: "Réclamation auprès d'une autorité de contrôle" },
  { n: '15', title: 'Modifications de la présente politique' },
  { n: '16', title: 'Contact — Délégué à la Protection des Données' },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[var(--background)]/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <Image src="/logo/Alfychat.svg" alt="AlfyChat" width={24} height={24} />
            <span className="font-[family-name:var(--font-krona)] text-sm text-[var(--foreground)]">AlfyChat</span>
          </Link>
          <Link href="/" className="text-[12px] text-muted transition-colors hover:text-[var(--foreground)]">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-[11px] font-medium text-muted">
          Dernière mise à jour : 14 mars 2026
        </div>

        <h1 className="mb-3 font-[family-name:var(--font-krona)] text-2xl tracking-tight md:text-3xl">
          Politique de Confidentialité
        </h1>
        <p className="mb-12 text-[15px] leading-relaxed text-muted">
          AlfyCore s&apos;engage à protéger votre vie privée. Cette politique décrit comment
          nous collectons, utilisons et protégeons vos données.
        </p>

        <div className="space-y-10 text-[14px] leading-relaxed text-muted/80">
          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">1. Responsable du traitement</h2>
            <p>
              Le responsable du traitement des données est l&apos;association AlfyCore
              (loi 1901), dont le siège est en France.
              Contact :{' '}
              <Link href="mailto:contact@alfycore.org" className="text-accent">
                contact@alfycore.org
              </Link>.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">2. Données collectées</h2>
            <p className="mb-3">Nous collectons uniquement les données nécessaires au fonctionnement du service :</p>
            <div className="space-y-3">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
                <h3 className="mb-1 text-[13px] font-bold text-[var(--foreground)]">Données de compte</h3>
                <p className="text-[13px]">Nom d&apos;utilisateur, adresse e-mail, mot de passe (haché avec bcrypt), avatar optionnel.</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
                <h3 className="mb-1 text-[13px] font-bold text-[var(--foreground)]">Données de communication</h3>
                <p className="text-[13px]">Messages, fichiers partagés, métadonnées de conversation. Les messages E2EE sont chiffrés et illisibles par AlfyCore.</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
                <h3 className="mb-1 text-[13px] font-bold text-[var(--foreground)]">Données techniques</h3>
                <p className="text-[13px]">Adresse IP (non conservée au-delà de la session), type de navigateur, horodatages de connexion.</p>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">3. Finalités du traitement</h2>
            <ul className="ml-4 list-disc space-y-1.5 pl-2">
              <li>Fournir et maintenir le service de messagerie</li>
              <li>Gérer votre compte et authentifier l&apos;accès</li>
              <li>Assurer la sécurité et prévenir les abus</li>
              <li>Améliorer le service (statistiques agrégées anonymisées)</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">4. Base légale</h2>
            <p>
              Le traitement est fondé sur l&apos;exécution du contrat (fourniture du service)
              et l&apos;intérêt légitime (sécurité). Aucun traitement n&apos;est fondé sur
              le consentement marketing — nous ne faisons aucune publicité.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">5. Hébergement et transferts de données</h2>
            <p className="mb-4">
              L&apos;infrastructure AlfyChat est répartie entre deux prestataires d&apos;hébergement selon la nature du service :
            </p>
            <div className="space-y-3">
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.03] p-4">
                <h3 className="mb-2 text-[13px] font-bold text-[var(--foreground)] flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-violet-400" />
                  Hostinger — Site web, Gateway, Utilisateurs, Messages, Appels
                </h3>
                <p className="text-[13px]">
                  Le site <strong className="text-[var(--foreground)]">alfychat.app</strong>, l&apos;API gateway (<strong className="text-[var(--foreground)]">gateway.alfychat.app</strong>), les services d&apos;authentification, de messagerie et d&apos;appels sont hébergés chez <strong className="text-[var(--foreground)]">Hostinger</strong>, avec CDN intégré pour la distribution des contenus statiques et médias (<strong className="text-[var(--foreground)]">media.alfychat.app</strong>).
                  Hostinger est un prestataire lituanien opérant des datacenters en Europe.
                </p>
              </div>
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.03] p-4">
                <h3 className="mb-2 text-[13px] font-bold text-[var(--foreground)] flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-sky-400" />
                  AlfyCore — Amis, Serveurs, Bots, Médias, Base de données, Cache
                </h3>
                <p className="text-[13px]">
                  Les services secondaires (amis, serveurs communautaires, bots, médias backend) ainsi que la base de données MySQL (<strong className="text-[var(--foreground)]">51.254.243.250</strong>) et le cache Redis sont hébergés sur les serveurs propres de l&apos;association <strong className="text-[var(--foreground)]">AlfyCore</strong>, situés en Europe.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-[13px]">
                Le chiffrement en transit (TLS 1.3) est systématique sur tous les services. Le chiffrement au repos (AES-256) protège les données stockées. Le chiffrement de bout en bout (E2EE) est disponible pour les conversations privées. Les mots de passe sont hachés avec bcrypt et ne sont jamais stockés en clair.
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">6. Partage des données</h2>
            <p className="mb-2">
              <span className="font-bold text-[var(--foreground)]">Aucune vente de données.</span>{' '}
              AlfyCore ne vend, ne loue et ne transmet aucune donnée personnelle à des tiers
              à des fins commerciales.
            </p>
            <p>
              Vos données peuvent être communiquées uniquement dans le cadre d&apos;une obligation
              légale (réquisition judiciaire) — et uniquement les données non chiffrées E2EE.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">7. Conservation des données</h2>
            <ul className="ml-4 list-disc space-y-1.5 pl-2">
              <li>Données de compte : conservées tant que le compte est actif</li>
              <li>Messages : conservés jusqu&apos;à suppression par l&apos;utilisateur ou le propriétaire du salon</li>
              <li>Données techniques : supprimées à la fin de la session</li>
              <li>En cas de suppression du compte : toutes les données sont effacées sous 30 jours</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">8. Vos droits (RGPD)</h2>
            <p className="mb-3">
              Conformément au Règlement Général sur la Protection des Données, vous disposez des droits suivants :
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { right: 'Accès', desc: 'Obtenir une copie de vos données' },
                { right: 'Rectification', desc: 'Corriger des données inexactes' },
                { right: 'Effacement', desc: 'Supprimer vos données' },
                { right: 'Portabilité', desc: 'Exporter vos données' },
                { right: 'Opposition', desc: 'Refuser un traitement' },
                { right: 'Limitation', desc: 'Restreindre le traitement' },
              ].map((r) => (
                <div key={r.right} className="rounded-lg border border-white/[0.06] bg-white/[0.015] px-4 py-2.5">
                  <span className="font-bold text-[var(--foreground)]">{r.right}</span>
                  <span className="text-muted/50"> — {r.desc}</span>
                </div>
              ))}
            </div>
            <p className="mt-3">
              Pour exercer vos droits, contactez{' '}
              <Link href="mailto:contact@alfycore.org" className="text-accent">
                contact@alfycore.org
              </Link>{' '}
              ou utilisez les paramètres de votre compte (export et suppression).
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">9. Cookies</h2>
            <p>
              AlfyChat utilise uniquement des cookies techniques nécessaires au fonctionnement
              du service (authentification, préférences de thème). Aucun cookie publicitaire
              ou de suivi n&apos;est utilisé.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">10. Modifications</h2>
            <p>
              Cette politique peut être mise à jour. Les modifications significatives seront
              notifiées aux utilisateurs. La date de dernière mise à jour est indiquée en haut
              de cette page.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">11. Réclamation</h2>
            <p>
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire
              une réclamation auprès de la{' '}
              <Link href="https://www.cnil.fr" target="_blank" className="text-accent">
                CNIL
              </Link>{' '}
              (Commission Nationale de l&apos;Informatique et des Libertés).
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-2 px-6 py-6 text-[10px] text-muted/30 md:flex-row">
          <p>© 2026 AlfyChat · AlfyCore</p>
          <div className="flex gap-4">
            <Link href="/terms" className="text-[10px] text-muted/30 hover:text-[var(--foreground)]">CGU</Link>
            <Link href="/privacy" className="text-[10px] text-muted/30 hover:text-[var(--foreground)]">Confidentialité</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
