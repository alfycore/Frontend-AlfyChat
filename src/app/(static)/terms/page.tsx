import Image from 'next/image';
import { Separator, Link } from '@heroui/react';

export const metadata = {
  title: "Conditions Générales d'Utilisation — AlfyChat",
  description: "Conditions générales d'utilisation de la plateforme AlfyChat, portée par l'association AlfyCore (loi 1901).",
};

const TOC = [
  { n: '1',  title: 'Présentation d\'AlfyChat et d\'AlfyCore' },
  { n: '2',  title: 'Acceptation des présentes conditions' },
  { n: '3',  title: 'Accès au service et inscription' },
  { n: '4',  title: 'Compte utilisateur' },
  { n: '5',  title: 'Utilisation acceptable du service' },
  { n: '6',  title: 'Contenu généré par les utilisateurs' },
  { n: '7',  title: 'Chiffrement et confidentialité des communications' },
  { n: '8',  title: 'Bots, API et intégrations tierces' },
  { n: '9',  title: 'Serveurs communautaires' },
  { n: '10', title: 'Appels vocaux et vidéo' },
  { n: '11', title: 'Propriété intellectuelle' },
  { n: '12', title: 'Signalement et modération' },
  { n: '13', title: 'Suspension et résiliation du compte' },
  { n: '14', title: 'Disponibilité du service' },
  { n: '15', title: 'Limitation de responsabilité' },
  { n: '16', title: 'Modification des présentes CGU' },
  { n: '17', title: 'Droit applicable et juridiction compétente' },
  { n: '18', title: 'Contact et réclamations' },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen text-[var(--foreground)]">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/70 backdrop-blur-2xl dark:border-white/[0.06] dark:bg-black/30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <Image src="/logo/Alfychat.svg" alt="AlfyChat" width={24} height={24} />
            <span className="font-[family-name:var(--font-krona)] text-sm text-[var(--foreground)]">AlfyChat</span>
          </Link>
          <Link href="/" className="text-[12px] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-6 py-16 md:py-24 lg:flex lg:gap-16">

        {/* ── Table des matières (sticky sidebar) ── */}
        <aside className="hidden shrink-0 lg:block lg:w-60">
          <div className="sticky top-28">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Table des matières</p>
            <nav className="space-y-1">
              {TOC.map((item) => (
                <a
                  key={item.n}
                  href={`#section-${item.n}`}
                  className="flex items-start gap-2 rounded-xl px-2 py-1.5 text-[11px] leading-snug text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                >
                  <span className="mt-px shrink-0 font-mono text-[10px] text-[var(--muted)]/50">{item.n}.</span>
                  {item.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* ── Contenu principal ── */}
        <main className="min-w-0 flex-1">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-black/[0.03] px-4 py-1.5 text-[11px] font-medium text-[var(--muted)] dark:border-white/[0.08] dark:bg-white/[0.04]">
            Dernière mise à jour : 26 mars 2026
          </div>

          <h1 className="mb-3 font-[family-name:var(--font-krona)] text-2xl tracking-tight md:text-3xl">
            Conditions Générales d&apos;Utilisation
          </h1>
          <p className="mb-2 text-[13px] leading-relaxed text-[var(--muted)]">
            Plateforme AlfyChat — alfychat.app
          </p>
          <p className="mb-12 text-[15px] leading-relaxed text-[var(--muted)]">
            En accédant ou en utilisant AlfyChat, vous acceptez sans réserve les présentes Conditions Générales
            d&apos;Utilisation (&laquo;&nbsp;CGU&nbsp;&raquo;). Lisez-les attentivement avant d&apos;utiliser le service.
          </p>

          <div className="space-y-12 text-[14px] leading-relaxed text-[var(--muted)]/80">

            {/* ── SECTION 1 ── */}
            <section id="section-1">
              <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">1. Présentation d&apos;AlfyChat et d&apos;AlfyCore</h2>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">1.1 L&apos;association AlfyCore</h3>
              <p className="mb-4">
                AlfyChat est une plateforme de messagerie instantanée développée, maintenue et exploitée par
                <strong className="text-[var(--foreground)]"> AlfyCore</strong>, association à but non lucratif
                constituée conformément à la loi du 1er juillet 1901 relative au contrat d&apos;association, dont
                le siège social est établi en France. AlfyCore n&apos;a aucun actionnaire et ne distribue aucun
                bénéfice à ses membres. Son objet social est de concevoir, distribuer et maintenir des outils
                numériques libres, souverains et respectueux de la vie privée.
              </p>
              <ul className="ml-4 list-disc space-y-1.5 pl-2">
                <li>Site de l&apos;association : <strong className="text-[var(--foreground)]">alfycore.pro</strong></li>
                <li>Plateforme AlfyChat : <strong className="text-[var(--foreground)]">alfychat.app</strong></li>
                <li>Contact : <strong className="text-[var(--foreground)]">contact@alfycore.org</strong></li>
              </ul>

              <h3 className="mb-2 mt-6 text-[13px] font-semibold text-[var(--foreground)]">1.2 Description du service</h3>
              <p className="mb-4">
                AlfyChat est une application de messagerie instantanée proposant notamment :
              </p>
              <ul className="ml-4 list-disc space-y-1.5 pl-2">
                <li>La messagerie directe (DM) entre utilisateurs avec chiffrement de bout en bout (E2EE) ECDH P-256 + AES-256-GCM ;</li>
                <li>La création de serveurs communautaires avec salons textuels et vocaux ;</li>
                <li>Les appels audio et vidéo peer-to-peer via WebRTC avec chiffrement DTLS-SRTP ;</li>
                <li>Le partage de fichiers, images et médias ;</li>
                <li>Une API ouverte permettant la création de bots et d&apos;intégrations tierces ;</li>
                <li>Un système de rôles et permissions granulaires au sein des serveurs communautaires.</li>
              </ul>

              <h3 className="mb-2 mt-6 text-[13px] font-semibold text-[var(--foreground)]">1.3 Caractère gratuit et open source</h3>
              <p>
                AlfyChat est et restera gratuit pour les utilisateurs finaux. Le code source de la plateforme est
                publié sous licence open source, permettant à quiconque d&apos;auditer, de contribuer ou de déployer
                sa propre instance. AlfyCore ne recourt à aucune publicité, aucun traçage commercial et ne vend
                aucune donnée personnelle.
              </p>
            </section>

            <Separator />

            {/* ── SECTION 2 ── */}
            <section id="section-2">
              <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">2. Acceptation des présentes conditions</h2>

              <p className="mb-4">
                L&apos;accès ou l&apos;utilisation d&apos;AlfyChat suppose l&apos;acceptation pleine et entière des présentes CGU.
                Si vous n&apos;acceptez pas ces conditions, vous devez cesser immédiatement d&apos;utiliser le service.
              </p>
              <p className="mb-4">
                Les présentes CGU constituent un contrat juridiquement contraignant entre vous
                (&laquo;&nbsp;l&apos;Utilisateur&nbsp;&raquo;) et AlfyCore. Elles s&apos;appliquent à toutes les formes
                d&apos;accès au service, y compris via l&apos;application web (alfychat.app), les applications mobiles,
                les clients de bureau ou toute API officielle.
              </p>
              <p>
                En cliquant sur &laquo;&nbsp;Créer un compte&nbsp;&raquo; ou en commençant à utiliser le service, vous
                déclarez avoir lu, compris et accepté les présentes CGU ainsi que la Politique de confidentialité
                d&apos;AlfyChat.
              </p>
            </section>

            <Separator />

            {/* ── SECTION 3 ── */}
            <section id="section-3">
              <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">3. Accès au service et inscription</h2>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">3.1 Conditions d&apos;âge</h3>
              <p className="mb-4">
                L&apos;utilisation d&apos;AlfyChat est réservée aux personnes âgées d&apos;au moins <strong className="text-[var(--foreground)]">13 ans</strong>.
                Si vous avez entre 13 et 16 ans, vous devez avoir obtenu le consentement de votre représentant légal
                conformément aux dispositions du RGPD (article 8 du règlement UE 2016/679).
              </p>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">3.2 Système d&apos;invitation</h3>
              <p className="mb-4">
                L&apos;inscription peut être soumise à un système d&apos;invitation selon les périodes et la politique en vigueur.
                AlfyCore se réserve le droit de limiter les inscriptions afin de garantir la qualité et la sécurité du service.
              </p>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">3.3 Informations requises à l&apos;inscription</h3>
              <p className="mb-2">Lors de l&apos;inscription, vous devez fournir :</p>
              <ul className="ml-4 list-disc space-y-1.5 pl-2">
                <li>Une adresse e-mail valide et accessible ;</li>
                <li>Un nom d&apos;utilisateur unique (pseudonyme) ;</li>
                <li>Un mot de passe suffisamment robuste.</li>
              </ul>
              <p className="mt-4">
                Vous vous engagez à fournir des informations exactes, complètes et à jour. AlfyCore se réserve le droit
                de refuser l&apos;inscription ou de supprimer tout compte dont les informations seraient manifestement
                fausses ou usurpées.
              </p>
            </section>

            <Separator />

            {/* ── SECTION 4 ── */}
            <section id="section-4">
              <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">4. Compte utilisateur</h2>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">4.1 Responsabilité du compte</h3>
              <p className="mb-4">
                Chaque compte est strictement personnel et nominatif. Vous êtes seul responsable de toutes les
                activités réalisées depuis votre compte, qu&apos;elles soient effectuées par vous-même ou par un tiers
                ayant accès à vos identifiants.
              </p>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">4.2 Sécurité des identifiants</h3>
              <p className="mb-4">
                Vous vous engagez à maintenir la confidentialité de votre mot de passe et à ne pas le communiquer
                à des tiers. En cas de compromission suspectée de votre compte, vous devez le signaler immédiatement
                à AlfyCore via contact@alfycore.org et changer votre mot de passe sans délai.
              </p>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">4.3 Interdiction de cession</h3>
              <p className="mb-4">
                Votre compte ne peut en aucun cas être cédé, vendu, loué ou transféré à un tiers. Toute tentative
                de cession de compte est prohibée et peut entraîner la résiliation immédiate du compte concerné.
              </p>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">4.4 Unicité du compte</h3>
              <p>
                Chaque utilisateur est limité à un seul compte actif. La création de comptes multiples, notamment
                dans le but de contourner une sanction, est strictement interdite et peut entraîner la résiliation
                de l&apos;ensemble des comptes concernés.
              </p>
            </section>

            <Separator />

            {/* ── SECTION 5 ── */}
            <section id="section-5">
              <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">5. Utilisation acceptable du service</h2>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">5.1 Comportements interdits</h3>
              <p className="mb-3">En utilisant AlfyChat, vous vous engagez formellement à ne pas :</p>
              <ul className="ml-4 list-disc space-y-2 pl-2">
                <li>Utiliser le service à des fins illicites, frauduleuses ou contraires à l&apos;ordre public ;</li>
                <li>Harceler, menacer, intimider, diffamer ou discriminer d&apos;autres utilisateurs sur la base de leur origine, sexe, religion, orientation sexuelle, handicap ou toute autre caractéristique protégée ;</li>
                <li>Diffuser du contenu illicite, haineux, raciste, à caractère pornographique impliquant des mineurs (CSAM), ou faisant l&apos;apologie du terrorisme ou de la violence ;</li>
                <li>Usurper l&apos;identité d&apos;un tiers, d&apos;un membre de l&apos;équipe AlfyCore ou d&apos;une autorité ;</li>
                <li>Tenter de compromettre la sécurité, l&apos;intégrité ou la disponibilité de l&apos;infrastructure AlfyChat (attaques DDoS, injections, exploitation de vulnérabilités sans déclaration responsable) ;</li>
                <li>Automatiser l&apos;accès au service sans utiliser l&apos;API officielle et dans le respect de ses conditions ;</li>
                <li>Collecter, scraper ou extraire des données personnelles d&apos;autres utilisateurs sans leur consentement explicite ;</li>
                <li>Diffuser des programmes malveillants, virus, ransomwares, logiciels espions ou tout autre code nuisible ;</li>
                <li>Effectuer des opérations de phishing, d&apos;hameçonnage ou toute tentative de fraude visant d&apos;autres utilisateurs ;</li>
                <li>Utiliser le service pour des activités de spam massif, de chaînes de lettres ou de communications non sollicitées.</li>
              </ul>

              <h3 className="mb-2 mt-6 text-[13px] font-semibold text-[var(--foreground)]">5.2 Signalement de vulnérabilités</h3>
              <p>
                Si vous découvrez une vulnérabilité de sécurité dans AlfyChat, nous vous invitons à la signaler
                de manière responsable à contact@alfycore.org avant toute divulgation publique. AlfyCore s&apos;engage
                à étudier tout signalement sérieux dans les meilleurs délais et à reconnaître publiquement les
                contributions légitimes à la sécurité du service.
              </p>
            </section>

            <Separator />

            {/* ── SECTION 6 ── */}
            <section id="section-6">
              <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">6. Contenu généré par les utilisateurs</h2>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">6.1 Propriété du contenu</h3>
              <p className="mb-4">
                Vous conservez l&apos;intégralité de vos droits de propriété intellectuelle sur les contenus que vous
                publiez sur AlfyChat (messages, fichiers, médias). En les publiant, vous accordez à AlfyCore une
                licence non exclusive, mondiale, gratuite et limitée au strict nécessaire pour fournir le service
                (distribution, stockage, transmission), sans que cela ne constitue une cession de droits.
              </p>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">6.2 Contenu protégé par E2EE</h3>
              <p className="mb-4">
                Lorsque le chiffrement de bout en bout (E2EE) est activé, les messages sont chiffrés côté client
                avant transmission. AlfyCore ne dispose techniquement d&apos;aucune clé permettant de déchiffrer ces
                communications. La responsabilité du contenu E2EE incombe exclusivement à l&apos;utilisateur.
              </p>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">6.3 Responsabilité éditoriale</h3>
              <p>
                AlfyCore agit en qualité d&apos;hébergeur au sens de la loi n° 2004-575 du 21 juin 2004 pour la
                confiance dans l&apos;économie numérique (LCEN) et du règlement européen sur les services numériques
                (Digital Services Act — DSA). À ce titre, AlfyCore n&apos;est pas responsable du contenu publié par
                les utilisateurs mais agit promptement dès réception d&apos;une notification valide pour supprimer
                les contenus manifestement illicites.
              </p>
            </section>

            <Separator />

            {/* ── SECTION 7 ── */}
            <section id="section-7">
              <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">7. Chiffrement et confidentialité des communications</h2>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">7.1 Niveaux de chiffrement</h3>
              <p className="mb-3">AlfyChat propose trois niveaux de protection des communications :</p>
              <ul className="ml-4 list-disc space-y-2 pl-2">
                <li><strong className="text-[var(--foreground)]">Niveau 1 — Standard (TLS 1.3) :</strong> chiffrement en transit. Les données sont protégées sur le réseau mais accessibles côté serveur.</li>
                <li><strong className="text-[var(--foreground)]">Niveau 2 — Amélioré (AES-256) :</strong> chiffrement au repos avec clé dérivée par compte. Réduit l&apos;accès aux données côté serveur.</li>
                <li><strong className="text-[var(--foreground)]">Niveau 3 — Maximum (E2EE ECDH P-256 + AES-256-GCM) :</strong> chiffrement de bout en bout. Les clés sont générées uniquement côté client et ne transitent jamais par les serveurs d&apos;AlfyCore. Personne, y compris AlfyCore, ne peut lire le contenu de ces messages.</li>
              </ul>

              <h3 className="mb-2 mt-6 text-[13px] font-semibold text-[var(--foreground)]">7.2 Gestion des clés</h3>
              <p className="mb-4">
                En mode E2EE, les clés cryptographiques sont générées localement sur votre appareil et ne quittent
                jamais votre environnement sous forme non chiffrée. La perte de vos clés peut entraîner une
                impossibilité d&apos;accéder aux anciens messages chiffrés. AlfyCore ne peut pas récupérer les clés
                perdues.
              </p>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">7.3 Limites du chiffrement</h3>
              <p>
                Même avec le chiffrement E2EE activé, certaines métadonnées (identifiants de participants, horodatages,
                taille approximative des messages) peuvent être traitées par AlfyCore pour assurer le routage
                des communications. Ces métadonnées sont conservées conformément à notre Politique de confidentialité.
              </p>
            </section>

            <Separator />

            {/* ── SECTION 8 ── */}
            <section id="section-8">
              <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">8. Bots, API et intégrations tierces</h2>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">8.1 Utilisation de l&apos;API</h3>
              <p className="mb-4">
                AlfyChat met à disposition une API ouverte permettant la création de bots et d&apos;intégrations.
                L&apos;utilisation de l&apos;API est soumise aux présentes CGU et aux conditions spécifiques de l&apos;API,
                disponibles dans la documentation développeur. Tout dépassement abusif des limites de taux (rate
                limiting) peut entraîner une suspension temporaire ou définitive de l&apos;accès à l&apos;API.
              </p>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">8.2 Responsabilité des bots</h3>
              <p className="mb-4">
                Toute personne déployant un bot sur AlfyChat est responsable de son comportement. Les bots doivent
                respecter les présentes CGU, identifier clairement leur nature automatisée, et ne pas simuler
                un comportement humain de manière trompeuse.
              </p>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">8.3 Services tiers</h3>
              <p>
                AlfyCore n&apos;est pas responsable du contenu, des pratiques de confidentialité ou des services
                proposés par des tiers intégrés via des bots ou des webhooks. Nous vous encourageons à vérifier
                les conditions d&apos;utilisation et politiques de confidentialité de chaque service tiers avant
                de l&apos;intégrer à AlfyChat.
              </p>
            </section>

            <Separator />

            {/* ── SECTION 9 ── */}
            <section id="section-9">
              <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">9. Serveurs communautaires</h2>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">9.1 Création et administration</h3>
              <p className="mb-4">
                Tout utilisateur peut créer un serveur communautaire sur AlfyChat. Le créateur devient
                automatiquement propriétaire du serveur et assume la responsabilité éditoriale de l&apos;ensemble des
                contenus publiés dans son serveur, y compris ceux produits par ses membres.
              </p>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">9.2 Obligations des administrateurs</h3>
              <p className="mb-3">Les propriétaires et administrateurs de serveurs communautaires sont tenus de :</p>
              <ul className="ml-4 list-disc space-y-1.5 pl-2">
                <li>Mettre en place des règles de modération claires et visibles pour leurs membres ;</li>
                <li>Agir promptement face aux signalements de contenus illicites ;</li>
                <li>Ne pas utiliser leur serveur pour organiser des activités illicites ;</li>
                <li>Respecter et faire respecter les présentes CGU au sein de leur communauté.</li>
              </ul>

              <h3 className="mb-2 mt-6 text-[13px] font-semibold text-[var(--foreground)]">9.3 Droits d&apos;AlfyCore sur les serveurs</h3>
              <p>
                AlfyCore se réserve le droit de fermer, suspendre ou supprimer tout serveur communautaire
                ne respectant pas les présentes CGU, et ce sans préavis ni indemnisation dans les cas de
                violations graves.
              </p>
            </section>

            <Separator />

            {/* ── SECTION 10 ── */}
            <section id="section-10">
              <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">10. Appels vocaux et vidéo</h2>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">10.1 Technologie WebRTC</h3>
              <p className="mb-4">
                Les appels audio et vidéo sur AlfyChat utilisent la technologie WebRTC avec chiffrement DTLS-SRTP
                de bout en bout sur chaque flux média. Les communications pair-à-pair ne transitent pas par les
                serveurs d&apos;AlfyCore sauf en cas d&apos;utilisation d&apos;un relais TURN (nécessaire dans certaines
                configurations réseau restreintes), auquel cas elles restent chiffrées.
              </p>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">10.2 Consentement à l&apos;activation audio/vidéo</h3>
              <p className="mb-4">
                L&apos;activation de votre microphone et/ou caméra lors d&apos;un appel requiert votre autorisation explicite
                via les mécanismes de permission de votre navigateur ou système d&apos;exploitation. Vous consentez
                au traitement de vos flux audio/vidéo à des fins exclusives de transmission aux participants
                de l&apos;appel.
              </p>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">10.3 Enregistrement des appels</h3>
              <p>
                AlfyCore n&apos;enregistre pas les appels vocaux et vidéo. Tout enregistrement réalisé par un
                participant doit être fait avec le consentement explicite de l&apos;ensemble des participants,
                conformément aux lois applicables en matière de protection de la vie privée.
              </p>
            </section>

            <Separator />

            {/* ── SECTION 11 ── */}
            <section id="section-11">
              <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">11. Propriété intellectuelle</h2>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">11.1 Marque et identité visuelle</h3>
              <p className="mb-4">
                &laquo;&nbsp;AlfyChat&nbsp;&raquo;, &laquo;&nbsp;AlfyCore&nbsp;&raquo;, les logos associés et l&apos;identité
                visuelle de la plateforme sont la propriété d&apos;AlfyCore. Toute reproduction, imitation ou utilisation
                non autorisée de ces éléments est strictement interdite.
              </p>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">11.2 Code source open source</h3>
              <p className="mb-4">
                Le code source d&apos;AlfyChat est publié sous licence open source (précisée dans les dépôts officiels).
                Vous êtes libre d&apos;utiliser, modifier et distribuer ce code dans le respect des termes de la licence
                applicable. Cette liberté ne s&apos;étend pas à la marque, aux noms de domaine ou à l&apos;infrastructure
                opérée par AlfyCore.
              </p>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">11.3 Contenus tiers</h3>
              <p>
                Les contenus partagés par les utilisateurs peuvent être soumis à des droits de propriété
                intellectuelle appartenant à leurs auteurs respectifs. AlfyCore ne surveille pas et n&apos;approuve
                pas ces contenus. Toute réclamation relative à un contenu portant atteinte à des droits de
                propriété intellectuelle peut être adressée à contact@alfycore.org.
              </p>
            </section>

            <Separator />

            {/* ── SECTION 12 ── */}
            <section id="section-12">
              <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">12. Signalement et modération</h2>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">12.1 Mécanisme de signalement</h3>
              <p className="mb-4">
                AlfyChat met à disposition un mécanisme de signalement accessible depuis l&apos;interface du service.
                Tout utilisateur peut signaler un contenu ou un comportement qu&apos;il estime contraire aux présentes CGU.
              </p>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">12.2 Traitement des signalements</h3>
              <p className="mb-4">
                AlfyCore s&apos;engage à examiner les signalements reçus dans un délai raisonnable et à prendre les
                mesures appropriées. Les décisions de modération s&apos;appuient sur les présentes CGU et sur
                l&apos;appréciation des équipes d&apos;AlfyCore.
              </p>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">12.3 Signalement aux autorités</h3>
              <p>
                Conformément aux obligations légales applicables en France (notamment la loi Aviovi et le DSA),
                AlfyCore est tenu de signaler aux autorités compétentes (PHAROS, Parquet numérique) tout contenu
                illicite grave dont il aurait connaissance, en particulier les contenus pédopornographiques (CSAM)
                et les appels à la commission d&apos;actes terroristes.
              </p>
            </section>

            <Separator />

            {/* ── SECTION 13 ── */}
            <section id="section-13">
              <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">13. Suspension et résiliation du compte</h2>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">13.1 Résiliation à l&apos;initiative de l&apos;utilisateur</h3>
              <p className="mb-4">
                Vous pouvez fermer votre compte à tout moment depuis les paramètres de votre profil. La suppression
                du compte entraîne la suppression définitive de vos données personnelles dans les délais prévus par
                notre Politique de confidentialité, à l&apos;exception des données requises par des obligations légales
                de conservation.
              </p>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">13.2 Résiliation à l&apos;initiative d&apos;AlfyCore</h3>
              <p className="mb-4">
                AlfyCore se réserve le droit de suspendre ou de résilier tout compte, avec ou sans préavis selon la
                gravité des faits, en cas de :
              </p>
              <ul className="ml-4 list-disc space-y-1.5 pl-2">
                <li>Violation des présentes CGU ;</li>
                <li>Activité frauduleuse ou illicite avérée ;</li>
                <li>Atteinte à la sécurité, la disponibilité ou l&apos;intégrité du service ;</li>
                <li>Décision judiciaire ou administrative l&apos;imposant.</li>
              </ul>

              <h3 className="mb-2 mt-6 text-[13px] font-semibold text-[var(--foreground)]">13.3 Contestation d&apos;une sanction</h3>
              <p>
                En cas de désaccord avec une décision de suspension ou de résiliation, vous pouvez exercer un
                recours en contactant AlfyCore à contact@alfycore.org dans un délai de 30 jours suivant
                la notification de la sanction.
              </p>
            </section>

            <Separator />

            {/* ── SECTION 14 ── */}
            <section id="section-14">
              <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">14. Disponibilité du service et hébergement</h2>

              <p className="mb-4">
                AlfyCore s&apos;efforce de maintenir AlfyChat disponible 24h/24 et 7j/7, mais ne peut garantir une
                disponibilité ininterrompue. Des interruptions peuvent survenir pour raisons de maintenance,
                de mises à jour, de pannes techniques ou de force majeure.
              </p>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">14.1 Infrastructure d&apos;hébergement</h3>
              <p className="mb-3">L&apos;infrastructure AlfyChat est répartie entre deux prestataires :</p>
              <div className="space-y-3 mb-4">
                <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.03] p-4">
                  <p className="mb-1 text-[13px] font-bold text-[var(--foreground)]">
                    <span className="inline-block h-2 w-2 rounded-full bg-violet-400 mr-2 align-middle" />
                    Hostinger
                  </p>
                  <p className="text-[12px] text-[var(--muted)]">
                    Site web (<strong className="text-[var(--foreground)]">alfychat.app</strong>), API Gateway (<strong className="text-[var(--foreground)]">gateway.alfychat.app</strong>), services Utilisateurs, Messages et Appels, CDN de distribution (<strong className="text-[var(--foreground)]">media.alfychat.app</strong>). Hébergeur lituanien, datacenters européens.
                  </p>
                </div>
                <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.03] p-4">
                  <p className="mb-1 text-[13px] font-bold text-[var(--foreground)]">
                    <span className="inline-block h-2 w-2 rounded-full bg-sky-400 mr-2 align-middle" />
                    AlfyCore (serveurs propres)
                  </p>
                  <p className="text-[12px] text-[var(--muted)]">
                    Services Amis, Serveurs communautaires, Bots, Médias (backend), base de données MySQL et cache Redis. Serveurs opérés directement par l&apos;association AlfyCore.
                  </p>
                </div>
              </div>

              <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">14.2 Responsabilité en cas d&apos;indisponibilité</h3>
              <p className="mb-4">
                AlfyCore ne saurait être tenu responsable des préjudices résultant d&apos;une indisponibilité du
                service, d&apos;une perte de données ou de toute autre défaillance technique, dans les limites
                permises par le droit applicable, y compris les interruptions liées aux prestataires tiers (Hostinger).
              </p>
              <p>
                AlfyCore se réserve le droit de modifier, d&apos;interrompre temporairement ou définitivement tout ou
                partie du service, notamment pour des raisons techniques, légales ou liées à la politique associative.
                L&apos;état en temps réel des services est consultable sur <strong className="text-[var(--foreground)]">alfychat.app/status</strong>.
              </p>
            </section>

            <Separator />

            {/* ── SECTION 15 ── */}
            <section id="section-15">
              <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">15. Limitation de responsabilité</h2>

              <p className="mb-4">
                Dans toute la mesure permise par la législation applicable, AlfyCore — en sa qualité d&apos;association
                à but non lucratif fournissant un service gratuit — exclut toute responsabilité pour :
              </p>
              <ul className="ml-4 list-disc space-y-2 pl-2">
                <li>Les dommages indirects, consécutifs ou immatériels résultant de l&apos;utilisation ou de l&apos;impossibilité d&apos;utiliser le service ;</li>
                <li>La perte de données, notamment en cas de suppression de compte ou de défaillance technique ;</li>
                <li>Les contenus publiés par des utilisateurs tiers ;</li>
                <li>Les comportements d&apos;utilisateurs tiers à votre égard ;</li>
                <li>Les défaillances de services tiers intégrés via des bots ou webhooks ;</li>
                <li>Les pertes liées à une compromission de vos identifiants résultant de votre propre négligence.</li>
              </ul>
            </section>

            <Separator />

            {/* ── SECTION 16 ── */}
            <section id="section-16">
              <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">16. Modification des présentes CGU</h2>

              <p className="mb-4">
                AlfyCore se réserve le droit de modifier les présentes CGU à tout moment. En cas de modification
                substantielle, vous serez informé par notification dans l&apos;application et/ou par e-mail au moins
                30 jours avant l&apos;entrée en vigueur des nouvelles conditions.
              </p>
              <p className="mb-4">
                En continuant à utiliser le service après l&apos;entrée en vigueur des nouvelles CGU, vous acceptez
                les modifications apportées. Si vous refusez les nouvelles conditions, vous devez cesser
                d&apos;utiliser le service et pouvez demander la suppression de votre compte.
              </p>
              <p>
                La version en vigueur des CGU est toujours accessible à l&apos;adresse suivante :
                <strong className="text-[var(--foreground)]"> alfychat.app/terms</strong>. La date de dernière mise
                à jour figure en tête de ce document.
              </p>
            </section>

            <Separator />

            {/* ── SECTION 17 ── */}
            <section id="section-17">
              <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">17. Droit applicable et juridiction compétente</h2>

              <p className="mb-4">
                Les présentes CGU sont régies par le droit français. Tout litige relatif à leur interprétation,
                leur exécution ou leur résiliation relève de la compétence exclusive des juridictions françaises
                compétentes, sous réserve des règles impératives de protection applicables dans votre pays de résidence
                lorsque vous êtes un consommateur.
              </p>
              <p className="mb-4">
                Conformément aux articles L.611-1 et suivants du Code de la consommation, vous pouvez recourir à
                un médiateur de la consommation agréé en cas de litige non résolu. Vous pouvez également utiliser
                la plateforme de règlement en ligne des litiges (RLL) de la Commission européenne accessible à
                l&apos;adresse : <strong className="text-[var(--foreground)]">ec.europa.eu/consumers/odr</strong>.
              </p>
              <p>
                AlfyCore étant une association à but non lucratif, ces dispositifs de médiation s&apos;appliquent
                dans les limites définies par la législation relative aux services non payants.
              </p>
            </section>

            <Separator />

            {/* ── SECTION 18 ── */}
            <section id="section-18">
              <h2 className="mb-4 text-lg font-bold text-[var(--foreground)]">18. Contact et réclamations</h2>

              <p className="mb-4">
                Pour toute question, réclamation ou demande relative aux présentes CGU, vous pouvez contacter
                AlfyCore aux coordonnées suivantes :
              </p>
              <div className="rounded-xl border border-[var(--separator)] bg-[var(--surface)] p-5">
                <p className="mb-1 font-semibold text-[var(--foreground)]">AlfyCore</p>
                <p className="mb-1">Association loi 1901 — France</p>
                <p className="mb-1">Site : <strong className="text-[var(--foreground)]">alfycore.pro</strong></p>
                <p className="mb-1">E-mail : <strong className="text-[var(--foreground)]">contact@alfycore.org</strong></p>
                <p>Plateforme : <strong className="text-[var(--foreground)]">alfychat.app</strong></p>
              </div>
              <p className="mt-4">
                Nous nous engageons à répondre à toute demande dans un délai raisonnable et, en tout état de
                cause, dans les délais imposés par la réglementation applicable.
              </p>
            </section>

            <Separator />

            {/* ── Footer légal ── */}
            <div className="rounded-xl border border-[var(--separator)] bg-[var(--surface)] p-5 text-[12px]">
              <p className="mb-2 font-semibold text-[var(--foreground)]">Note légale</p>
              <p className="leading-relaxed">
                Ces Conditions Générales d&apos;Utilisation ont été rédigées pour la plateforme AlfyChat
                (alfychat.app), opérée par AlfyCore, association loi 1901 domiciliée en France.
                Elles sont rédigées en langue française, qui fait foi en cas de litige. Une traduction
                dans d&apos;autres langues peut être fournie à titre informatif, sans valeur contractuelle.
                Version en vigueur au 26 mars 2026.
              </p>
            </div>

          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--separator)] mt-16">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-2 text-[11px] text-[var(--muted)] md:flex-row">
            <div className="flex items-center gap-2">
              <Image src="/logo/Alfychat.svg" alt="" width={16} height={16} className="opacity-50" />
              <span>© 2026 AlfyChat · AlfyCore · Association loi 1901</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-[var(--foreground)]">Politique de confidentialité</Link>
              <Link href="/rgpd" className="hover:text-[var(--foreground)]">RGPD</Link>
              <Link href="/" className="hover:text-[var(--foreground)]">Accueil</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

    