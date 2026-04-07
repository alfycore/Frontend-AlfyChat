import Image from 'next/image';
import { Separator, Link } from '@heroui/react';

export const metadata = {
  title: 'Conditions Générales d\'Utilisation — AlfyChat',
};

export default function TermsPage() {
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
          Conditions Générales d&apos;Utilisation
        </h1>
        <p className="mb-12 text-[15px] leading-relaxed text-muted">
          En utilisant AlfyChat, vous acceptez les présentes conditions.
        </p>

        <div className="space-y-10 text-[14px] leading-relaxed text-muted/80">
          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">1. Présentation du service</h2>
            <p>
              AlfyChat est une plateforme de messagerie instantanée sécurisée, développée et maintenue par
              l&apos;association AlfyCore (loi 1901), dont le siège est en France. Le service est fourni
              gratuitement et en open source.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">2. Inscription et compte</h2>
            <p className="mb-2">
              L&apos;inscription est ouverte à toute personne physique âgée d&apos;au moins 13 ans.
              Vous êtes responsable de la confidentialité de vos identifiants de connexion.
            </p>
            <p>
              Un système d&apos;invitation peut être requis pour créer un compte.
              Chaque compte est personnel et ne peut pas être cédé ou partagé.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">3. Utilisation du service</h2>
            <p className="mb-2">Vous vous engagez à ne pas :</p>
            <ul className="ml-4 list-disc space-y-1.5 pl-2">
              <li>Utiliser le service à des fins illicites ou frauduleuses</li>
              <li>Harceler, menacer ou intimider d&apos;autres utilisateurs</li>
              <li>Diffuser du contenu illicite, haineux ou discriminatoire</li>
              <li>Tenter de compromettre la sécurité du service</li>
              <li>Créer plusieurs comptes dans le but de contourner une sanction</li>
              <li>Automatiser l&apos;accès au service sans utiliser l&apos;API officielle</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">4. Contenu utilisateur</h2>
            <p className="mb-2">
              Vous restez propriétaire du contenu que vous publiez sur AlfyChat. En utilisant le
              service, vous nous accordez une licence limitée au fonctionnement technique du service
              (transmission, stockage chiffré, mise en cache).
            </p>
            <p>
              AlfyCore se réserve le droit de supprimer tout contenu manifestement illicite
              signalé par un utilisateur ou une autorité compétente.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">5. Sécurité et chiffrement</h2>
            <p>
              AlfyChat propose plusieurs niveaux de chiffrement, incluant le chiffrement de bout en bout
              (E2EE). Lorsque le E2EE est activé, AlfyCore n&apos;a techniquement pas accès au contenu
              de vos messages. Le chiffrement en transit (TLS) est toujours actif.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">6. Suspension et résiliation</h2>
            <p className="mb-2">
              AlfyCore peut suspendre ou supprimer votre compte en cas de violation des présentes
              conditions, après notification lorsque possible.
            </p>
            <p>
              Vous pouvez supprimer votre compte à tout moment depuis les paramètres.
              La suppression entraîne l&apos;effacement irréversible de vos données.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">7. Limitation de responsabilité</h2>
            <p>
              Le service est fourni « en l&apos;état ». AlfyCore ne garantit pas une disponibilité
              continue et ne peut être tenue responsable des dommages indirects liés à l&apos;utilisation
              ou à l&apos;indisponibilité du service.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">8. Modifications</h2>
            <p>
              AlfyCore se réserve le droit de modifier les présentes conditions. Les utilisateurs seront
              informés de tout changement significatif. La poursuite de l&apos;utilisation du service
              vaut acceptation des nouvelles conditions.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">9. Droit applicable</h2>
            <p>
              Les présentes conditions sont régies par le droit français. Tout litige sera soumis
              aux juridictions compétentes de France.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--foreground)]">10. Contact</h2>
            <p>
              Pour toute question, contactez-nous à{' '}
              <Link href="mailto:contact@alfycore.org" className="text-accent">
                contact@alfycore.org
              </Link>.
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
