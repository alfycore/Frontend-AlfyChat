import { FileTextIcon } from '@/components/icons';
import { LegalPage } from '../legal-page';

export default function CguPage() {
  return (
    <LegalPage
      icon={FileTextIcon}
      title="Conditions Générales d'Utilisation"
      subtitle="Plateforme AlfyChat — alfychat.app"
      updatedAt="26 mars 2026"
      sections={[
        {
          heading: "Présentation d'AlfyChat et d'AlfyCore",
          body: (
            <>
              <p>
                En accédant ou en utilisant AlfyChat, vous acceptez sans réserve les présentes Conditions
                Générales d'Utilisation (« CGU »). Lisez-les attentivement avant d'utiliser le service.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">1.1 L'association AlfyCore</h3>
              <p>
                AlfyChat est une plateforme de messagerie instantanée développée, maintenue et exploitée par
                <strong> AlfyCore</strong>, association à but non lucratif constituée conformément à la loi du 1er juillet
                1901 relative au contrat d'association, dont le siège social est établi en France. AlfyCore n'a aucun
                actionnaire et ne distribue aucun bénéfice à ses membres. Son objet social est de concevoir,
                distribuer et maintenir des outils numériques libres, souverains et respectueux de la vie privée.
              </p>
              <ul>
                <li>Site de l'association : <strong>alfycore.pro</strong></li>
                <li>Plateforme AlfyChat : <strong>alfychat.app</strong></li>
                <li>Contact : <strong>contact@alfycore.org</strong></li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">1.2 Description du service</h3>
              <p>AlfyChat est une application de messagerie instantanée proposant notamment :</p>
              <ul>
                <li>La messagerie directe entre utilisateurs avec chiffrement de bout en bout E2EE ECDH P-256 + AES-256-GCM</li>
                <li>La création de serveurs communautaires avec salons textuels et vocaux</li>
                <li>Les appels audio et vidéo peer-to-peer via WebRTC avec chiffrement DTLS-SRTP</li>
                <li>Le partage de fichiers, images et médias</li>
                <li>Une API ouverte permettant la création de bots et d'intégrations tierces</li>
                <li>Un système de rôles et permissions granulaires au sein des serveurs communautaires</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">1.3 Caractère gratuit et open source</h3>
              <p>
                AlfyChat est et restera gratuit pour les utilisateurs finaux. Le code source de la plateforme est publié
                sous licence open source, permettant à quiconque d'auditer, de contribuer ou de déployer sa propre
                instance. AlfyCore ne recourt à aucune publicité, aucun traçage commercial et ne vend aucune donnée
                personnelle.
              </p>
            </>
          ),
        },
        {
          heading: "Acceptation des présentes conditions",
          body: (
            <>
              <p>
                L'accès ou l'utilisation d'AlfyChat, sous quelque forme que ce soit, suppose et implique
                l'acceptation pleine, entière et sans réserve des présentes Conditions Générales d'Utilisation.
                Si vous n'acceptez pas l'intégralité de ces conditions, vous devez cesser immédiatement et
                définitivement toute utilisation du service.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">2.1 Nature contractuelle des CGU</h3>
              <p>
                Les présentes CGU constituent un contrat juridiquement contraignant et opposable entre vous
                (ci-après « l'Utilisateur ») et AlfyCore (ci-après « AlfyCore »). Elles régissent toutes
                les formes d'accès et d'utilisation du service, y compris via l'application web alfychat.app,
                les applications mobiles officielles iOS et Android, les clients de bureau, toute API officielle
                AlfyChat, ainsi que tout client tiers utilisant l'API officielle.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">2.2 Manifestation de l'acceptation</h3>
              <p>
                En cliquant sur « Créer un compte », en vous connectant à votre compte existant ou en commençant
                à utiliser le service de toute autre manière, vous déclarez et garantissez expressément avoir
                lu intégralement, compris et accepté les présentes CGU ainsi que la Politique de confidentialité
                d'AlfyChat, dans leur version en vigueur à la date de votre utilisation.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">2.3 Hiérarchie des documents contractuels</h3>
              <p>
                Les présentes CGU forment, avec la Politique de confidentialité et la Politique de cookies
                d'AlfyChat, l'intégralité de l'accord entre vous et AlfyCore concernant l'utilisation du service.
                Elles remplacent et annulent tous accords, déclarations ou engagements antérieurs, écrits ou oraux,
                relatifs à leur objet. En cas de contradiction entre les présentes CGU et tout autre document
                (communications marketing, FAQ, documentation technique), les présentes CGU prévalent.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">2.4 Capacité juridique</h3>
              <p>
                En acceptant les présentes CGU, vous déclarez disposer de la capacité juridique nécessaire
                pour conclure un contrat. Si vous agissez au nom d'une personne morale (association,
                entreprise), vous déclarez être dûment habilité à l'engager et à accepter ces conditions
                en son nom.
              </p>
            </>
          ),
        },
        {
          heading: "Accès au service et inscription",
          body: (
            <>
              <h3 className="text-[12px] font-semibold text-foreground">3.1 Conditions d'âge</h3>
              <p>
                L'utilisation d'AlfyChat est réservée aux personnes âgées d'au moins 13 ans. Si vous avez entre 13 et
                16 ans, vous devez avoir obtenu le consentement de votre représentant légal conformément aux dispositions
                du RGPD.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">3.2 Système d'invitation</h3>
              <p>
                L'inscription peut être soumise à un système d'invitation selon les périodes et la politique en vigueur.
                AlfyCore se réserve le droit de limiter les inscriptions afin de garantir la qualité et la sécurité du service.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">3.3 Informations requises à l'inscription</h3>
              <p>Lors de l'inscription, vous devez fournir :</p>
              <ul>
                <li>Une adresse e-mail valide et accessible</li>
                <li>Un nom d'utilisateur unique</li>
                <li>Un mot de passe suffisamment robuste</li>
              </ul>
              <p>
                Vous vous engagez à fournir des informations exactes, complètes et à jour. AlfyCore se réserve le droit
                de refuser l'inscription ou de supprimer tout compte dont les informations seraient manifestement fausses
                ou usurpées.
              </p>
            </>
          ),
        },
        {
          heading: "Compte utilisateur",
          body: (
            <>
              <h3 className="text-[12px] font-semibold text-foreground">4.1 Responsabilité du compte</h3>
              <p>
                Chaque compte est strictement personnel et nominatif. Vous êtes seul responsable de toutes les activités
                réalisées depuis votre compte, qu'elles soient effectuées par vous-même ou par un tiers ayant accès à vos identifiants.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">4.2 Sécurité des identifiants</h3>
              <p>
                Vous vous engagez à maintenir la confidentialité de votre mot de passe et à ne pas le communiquer à des tiers.
                En cas de compromission suspectée, vous devez le signaler immédiatement à AlfyCore via contact@alfycore.org
                et changer votre mot de passe sans délai.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">4.3 Interdiction de cession</h3>
              <p>
                Votre compte ne peut en aucun cas être cédé, vendu, loué ou transféré à un tiers.
                Toute tentative de cession de compte est prohibée et peut entraîner la résiliation immédiate du compte concerné.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">4.4 Unicité du compte</h3>
              <p>
                Chaque utilisateur est limité à un seul compte actif. La création de comptes multiples, notamment dans le but
                de contourner une sanction, est strictement interdite et peut entraîner la résiliation de l'ensemble des comptes concernés.
              </p>
            </>
          ),
        },
        {
          heading: "Utilisation acceptable du service",
          body: (
            <>
              <h3 className="text-[12px] font-semibold text-foreground">5.1 Comportements interdits</h3>
              <p>En utilisant AlfyChat, vous vous engagez formellement à ne pas :</p>
              <ul>
                <li>Utiliser le service à des fins illicites, frauduleuses ou contraires à l'ordre public</li>
                <li>Harceler, menacer, intimider, diffamer ou discriminer d'autres utilisateurs</li>
                <li>Diffuser du contenu illicite, haineux, raciste, CSAM, terroriste ou faisant l'apologie de la violence</li>
                <li>Usurper l'identité d'un tiers, d'un membre de l'équipe AlfyCore ou d'une autorité</li>
                <li>Tenter de compromettre la sécurité, l'intégrité ou la disponibilité de l'infrastructure AlfyChat</li>
                <li>Automatiser l'accès au service sans utiliser l'API officielle et dans le respect de ses conditions</li>
                <li>Collecter ou extraire des données personnelles d'autres utilisateurs sans consentement explicite</li>
                <li>Diffuser des programmes malveillants, virus, ransomwares ou tout autre code nuisible</li>
                <li>Effectuer des opérations de phishing ou toute tentative de fraude visant d'autres utilisateurs</li>
                <li>Utiliser le service pour des activités de spam massif ou de communications non sollicitées</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">5.2 Signalement de vulnérabilités</h3>
              <p>
                Si vous découvrez une vulnérabilité de sécurité dans AlfyChat, nous vous invitons à la signaler de manière
                responsable à contact@alfycore.org avant toute divulgation publique.
              </p>
            </>
          ),
        },
        {
          heading: "Contenu généré par les utilisateurs",
          body: (
            <>
              <h3 className="text-[12px] font-semibold text-foreground">6.1 Propriété du contenu</h3>
              <p>
                Vous conservez l'intégralité de vos droits de propriété intellectuelle sur les contenus que vous publiez
                sur AlfyChat. En les publiant, vous accordez à AlfyCore une licence non exclusive, mondiale, gratuite et
                limitée au strict nécessaire pour fournir le service.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">6.2 Contenu protégé par E2EE</h3>
              <p>
                Lorsque le chiffrement de bout en bout est activé, les messages sont chiffrés côté client avant transmission.
                AlfyCore ne dispose techniquement d'aucune clé permettant de déchiffrer ces communications.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">6.3 Responsabilité éditoriale</h3>
              <p>
                AlfyCore agit en qualité d'hébergeur au sens de la LCEN et du Digital Services Act. À ce titre,
                AlfyCore n'est pas responsable du contenu publié par les utilisateurs mais agit promptement dès réception
                d'une notification valide pour supprimer les contenus manifestement illicites.
              </p>
            </>
          ),
        },
        {
          heading: "Chiffrement et confidentialité des communications",
          body: (
            <>
              <h3 className="text-[12px] font-semibold text-foreground">7.1 Niveaux de chiffrement</h3>
              <p>AlfyChat propose trois niveaux de protection des communications :</p>
              <ul>
                <li><strong>Niveau 1 — Standard :</strong> chiffrement en transit TLS 1.3</li>
                <li><strong>Niveau 2 — Amélioré :</strong> chiffrement au repos AES-256 avec clé dérivée par compte</li>
                <li><strong>Niveau 3 — Maximum :</strong> chiffrement de bout en bout E2EE ECDH P-256 + AES-256-GCM</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">7.2 Gestion des clés</h3>
              <p>
                En mode E2EE, les clés cryptographiques sont générées localement sur votre appareil et ne quittent jamais
                votre environnement sous forme non chiffrée. AlfyCore ne peut pas récupérer les clés perdues.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">7.3 Limites du chiffrement</h3>
              <p>
                Même avec le chiffrement E2EE activé, certaines métadonnées comme les identifiants de participants,
                horodatages et taille approximative des messages peuvent être traitées pour assurer le routage des communications.
              </p>
            </>
          ),
        },
        {
          heading: "Bots, API et intégrations tierces",
          body: (
            <>
              <h3 className="text-[12px] font-semibold text-foreground">8.1 Utilisation de l'API</h3>
              <p>
                AlfyChat met à disposition une API ouverte permettant la création de bots et d'intégrations. Tout dépassement
                abusif des limites de taux peut entraîner une suspension temporaire ou définitive de l'accès à l'API.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">8.2 Responsabilité des bots</h3>
              <p>
                Toute personne déployant un bot sur AlfyChat est responsable de son comportement. Les bots doivent respecter
                les présentes CGU, identifier clairement leur nature automatisée, et ne pas simuler un comportement humain
                de manière trompeuse.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">8.3 Services tiers</h3>
              <p>
                AlfyCore n'est pas responsable du contenu, des pratiques de confidentialité ou des services proposés par des
                tiers intégrés via des bots ou des webhooks.
              </p>
            </>
          ),
        },
        {
          heading: "Serveurs communautaires",
          body: (
            <>
              <h3 className="text-[12px] font-semibold text-foreground">9.1 Création et administration</h3>
              <p>
                Tout utilisateur peut créer un serveur communautaire sur AlfyChat. Le créateur devient automatiquement
                propriétaire du serveur et assume la responsabilité éditoriale de l'ensemble des contenus publiés dans son serveur.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">9.2 Obligations des administrateurs</h3>
              <ul>
                <li>Mettre en place des règles de modération claires et visibles</li>
                <li>Agir promptement face aux signalements de contenus illicites</li>
                <li>Ne pas utiliser leur serveur pour organiser des activités illicites</li>
                <li>Respecter et faire respecter les présentes CGU</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">9.3 Droits d'AlfyCore sur les serveurs</h3>
              <p>
                AlfyCore se réserve le droit de fermer, suspendre ou supprimer tout serveur communautaire ne respectant pas
                les présentes CGU, sans préavis ni indemnisation dans les cas de violations graves.
              </p>
            </>
          ),
        },
        {
          heading: "Appels vocaux et vidéo",
          body: (
            <>
              <h3 className="text-[12px] font-semibold text-foreground">10.1 Technologie WebRTC</h3>
              <p>
                Les appels audio et vidéo utilisent la technologie WebRTC avec chiffrement DTLS-SRTP de bout en bout sur
                chaque flux média. Les communications pair-à-pair ne transitent pas par les serveurs d'AlfyCore sauf en cas
                d'utilisation d'un relais TURN, auquel cas elles restent chiffrées.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">10.2 Consentement à l'activation audio/vidéo</h3>
              <p>
                L'activation de votre microphone et ou caméra requiert votre autorisation explicite via les mécanismes de
                permission de votre navigateur ou système d'exploitation.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">10.3 Enregistrement des appels</h3>
              <p>
                AlfyCore n'enregistre pas les appels vocaux et vidéo. Tout enregistrement réalisé par un participant doit être
                fait avec le consentement explicite de l'ensemble des participants.
              </p>
            </>
          ),
        },
        {
          heading: "Propriété intellectuelle",
          body: (
            <>
              <h3 className="text-[12px] font-semibold text-foreground">11.1 Marque et identité visuelle</h3>
              <p>
                « AlfyChat », « AlfyCore », les logos associés et l'identité visuelle de la plateforme sont la propriété d'AlfyCore.
                Toute reproduction, imitation ou utilisation non autorisée de ces éléments est strictement interdite.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">11.2 Code source open source</h3>
              <p>
                Le code source d'AlfyChat est publié sous licence open source. Cette liberté ne s'étend pas à la marque,
                aux noms de domaine ou à l'infrastructure opérée par AlfyCore.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">11.3 Contenus tiers</h3>
              <p>
                Toute réclamation relative à un contenu portant atteinte à des droits de propriété intellectuelle peut être
                adressée à contact@alfycore.org.
              </p>
            </>
          ),
        },
        {
          heading: "Signalement et modération",
          body: (
            <>
              <h3 className="text-[12px] font-semibold text-foreground">12.1 Mécanisme de signalement</h3>
              <p>
                AlfyChat met à disposition un mécanisme de signalement accessible depuis l'interface du service.
                Tout utilisateur peut signaler un contenu ou un comportement contraire aux présentes CGU.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">12.2 Traitement des signalements</h3>
              <p>
                AlfyCore s'engage à examiner les signalements reçus dans un délai raisonnable et à prendre les mesures appropriées.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">12.3 Signalement aux autorités</h3>
              <p>
                Conformément aux obligations légales applicables, AlfyCore peut signaler aux autorités compétentes tout contenu
                illicite grave dont il aurait connaissance.
              </p>
            </>
          ),
        },
        {
          heading: "Suspension et résiliation du compte",
          body: (
            <>
              <h3 className="text-[12px] font-semibold text-foreground">13.1 Résiliation à l'initiative de l'utilisateur</h3>
              <p>
                Vous pouvez fermer votre compte à tout moment depuis les paramètres de votre profil. La suppression du compte
                entraîne la suppression définitive de vos données personnelles dans les délais prévus par notre Politique de confidentialité.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">13.2 Résiliation à l'initiative d'AlfyCore</h3>
              <p>AlfyCore se réserve le droit de suspendre ou de résilier tout compte en cas de :</p>
              <ul>
                <li>Violation des présentes CGU</li>
                <li>Activité frauduleuse ou illicite avérée</li>
                <li>Atteinte à la sécurité, la disponibilité ou l'intégrité du service</li>
                <li>Décision judiciaire ou administrative l'imposant</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">13.3 Contestation d'une sanction</h3>
              <p>
                En cas de désaccord avec une décision de suspension ou de résiliation, vous pouvez exercer un recours en contactant
                AlfyCore à contact@alfycore.org dans un délai de 30 jours suivant la notification de la sanction.
              </p>
            </>
          ),
        },
        {
          heading: "Disponibilité du service et hébergement",
          body: (
            <>
              <p>
                AlfyCore s'efforce de maintenir AlfyChat disponible 24h sur 24 et 7j sur 7, mais ne peut garantir une disponibilité
                ininterrompue. Des interruptions peuvent survenir pour raisons de maintenance, de mises à jour, de pannes techniques ou de force majeure.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">14.1 Infrastructure d'hébergement</h3>
              <p>L'infrastructure AlfyChat est répartie entre deux prestataires :</p>
              <ul>
                <li><strong>Hostinger :</strong> site web, API Gateway, services Utilisateurs, Messages et Appels, CDN media. Datacenters européens.</li>
                <li><strong>AlfyCore :</strong> services Amis, Serveurs communautaires, Bots, Médias backend, base MySQL et cache Redis.</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">14.2 Responsabilité en cas d'indisponibilité</h3>
              <p>
                AlfyCore ne saurait être tenu responsable des préjudices résultant d'une indisponibilité du service, d'une perte de données
                ou d'une autre défaillance technique, dans les limites permises par le droit applicable.
              </p>
              <p>
                L'état en temps réel des services est consultable sur <strong>alfychat.app/status</strong>.
              </p>
            </>
          ),
        },
        {
          heading: "Limitation de responsabilité",
          body: (
            <>
              <h3 className="text-[12px] font-semibold text-foreground">15.1 Étendue de la limitation</h3>
              <p>
                Dans toute la mesure permise par la législation applicable en France et dans l'Union européenne,
                AlfyCore exclut et décline toute responsabilité contractuelle, délictuelle ou quasi-délictuelle
                pour les catégories de dommages et situations suivantes :
              </p>
              <ul>
                <li>Les dommages indirects, consécutifs, accessoires ou immatériels, quel que soit leur nature</li>
                <li>Les pertes de données, de profits, de revenus, d'opportunités commerciales ou de clientèle</li>
                <li>Les pertes de réputation ou d'image, même si AlfyCore a été informé de la possibilité de tels dommages</li>
                <li>Les contenus publiés, diffusés ou partagés par des utilisateurs tiers sur la plateforme</li>
                <li>Les comportements, actes ou omissions d'utilisateurs tiers à votre égard</li>
                <li>Les défaillances, interruptions, bugs ou indisponibilités de services tiers intégrés via des bots ou webhooks développés par des tiers</li>
                <li>Les pertes résultant d'une compromission de vos identifiants de connexion consécutive à votre propre négligence ou à celle d'un tiers auquel vous auriez communiqué vos informations d'accès</li>
                <li>L'impossibilité de récupérer des clés cryptographiques E2EE perdues, dans la mesure où ces clés sont générées et gérées exclusivement côté client</li>
                <li>Les préjudices résultant d'une interruption du service pour maintenance planifiée, mise à jour ou force majeure</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">15.2 Limites impératives</h3>
              <p>
                Les limitations de responsabilité définies au présent article ne s'appliquent pas dans les cas
                où la loi applicable les interdit expressément, notamment en cas de dommage corporel, de faute
                lourde ou dolosive d'AlfyCore, ou pour toute responsabilité qui ne peut pas être exclue ou
                limitée en vertu des dispositions impératives du droit de la consommation applicable à l'utilisateur.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">15.3 Service fourni « en l'état »</h3>
              <p>
                Le service AlfyChat est fourni « en l'état » (« as is ») sans garantie d'aucune sorte, expresse
                ou implicite, y compris mais sans s'y limiter : les garanties implicites de qualité marchande,
                d'adéquation à un usage particulier, de non-violation de droits de tiers, ou d'absence d'erreurs.
                AlfyCore ne garantit pas que le service sera ininterrompu, sans erreur, sécurisé à 100 % ou
                exempt de tout composant nuisible.
              </p>
            </>
          ),
        },
        {
          heading: "Protection des données personnelles",
          body: (
            <>
              <p>
                La collecte et le traitement de vos données personnelles dans le cadre de l'utilisation d'AlfyChat
                sont régis par la Politique de confidentialité d'AlfyCore, document distinct mais indissociable
                des présentes CGU. La Politique de confidentialité est accessible à l'adresse
                <strong> alfychat.app/legal/privacy</strong>.
              </p>
              <p>
                La Politique de confidentialité décrit en détail les données collectées, les finalités et bases
                légales de leur traitement (conformément au RGPD), les mesures de sécurité mises en place,
                les sous-traitants éventuels, les durées de conservation, et l'ensemble de vos droits
                (accès, rectification, effacement, portabilité, opposition, limitation).
              </p>
              <p>
                AlfyCore s'engage formellement à ne jamais vendre, louer, céder ni commercialiser vos données
                personnelles à quelque tiers que ce soit, sans exception. AlfyCore ne fait aucune publicité
                ciblée et ne réalise aucun profilage commercial. Ces engagements sont structurels et découlant
                directement du statut d'association à but non lucratif d'AlfyCore.
              </p>
            </>
          ),
        },
        {
          heading: "Statut d'hébergeur, DSA et LCEN",
          body: (
            <>
              <p>
                AlfyCore agit en qualité d'hébergeur de contenu au sens de l'article 6 de la loi n° 2004-575
                du 21 juin 2004 (LCEN) et du Règlement (UE) 2022/2065 du 19 octobre 2022 sur les services
                numériques (Digital Services Act — DSA), entré pleinement en application le 17 février 2024.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">17.1 Responsabilité limitée de l'hébergeur</h3>
              <p>
                En tant qu'hébergeur, AlfyCore n'est pas responsable a priori des contenus publiés par les
                utilisateurs, dès lors qu'il n'a pas connaissance effective de leur caractère illicite ou
                qu'il agit promptement pour les retirer dès obtention de cette connaissance (article 6 I 2
                LCEN, article 6.1 DSA).
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">17.2 Obligation d'agir promptement (notice and action)</h3>
              <p>
                AlfyCore met à disposition un mécanisme de signalement accessible depuis l'interface de
                l'application et via contact@alfycore.org. Dès réception d'un signalement valide d'un
                contenu manifestement illicite, AlfyCore agit dans les meilleurs délais pour retirer ou
                désactiver l'accès audit contenu, conformément à ses obligations légales.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">17.3 Contenus illicites graves</h3>
              <p>
                Conformément à l'article 6 I 7 de la LCEN et aux dispositions du DSA, AlfyCore signale
                sans délai aux autorités compétentes les contenus dont il aurait connaissance et qui
                sont susceptibles de constituer des infractions pénales graves, notamment les contenus
                à caractère pédopornographique (CSAM), les contenus faisant l'apologie ou provoquant
                à la commission d'actes terroristes, ou les contenus incitant à la haine.
              </p>
            </>
          ),
        },
        {
          heading: "Modification des présentes CGU",
          body: (
            <>
              <p>
                AlfyCore se réserve le droit de modifier les présentes CGU à tout moment, notamment pour
                refléter les évolutions de la législation applicable, les décisions de justice ou des
                autorités réglementaires, l'introduction de nouvelles fonctionnalités ou services,
                ou des modifications dans nos pratiques opérationnelles.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">18.1 Notification des modifications substantielles</h3>
              <p>
                En cas de modification substantielle affectant vos droits ou obligations de manière
                significative, vous serez informé par notification dans l'application AlfyChat et/ou
                par e-mail à l'adresse associée à votre compte, au moins 30 jours avant l'entrée en
                vigueur des nouvelles dispositions. Ce délai vous permet de prendre connaissance des
                modifications et, si vous ne les acceptez pas, de supprimer votre compte avant leur
                application.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">18.2 Acceptation tacite des modifications</h3>
              <p>
                En continuant à utiliser le service après l'entrée en vigueur des CGU modifiées,
                vous êtes réputé avoir pris connaissance des nouvelles dispositions et les avoir
                acceptées. Si vous refusez les modifications, vous devez cesser d'utiliser le
                service et supprimer votre compte avant la date d'entrée en vigueur.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">18.3 Versionnement et archivage</h3>
              <p>
                La version actuellement en vigueur des CGU est toujours accessible à l'adresse
                <strong> alfychat.app/legal/cgu</strong>. La date de dernière mise à jour est
                indiquée en haut de cette page. AlfyCore maintient un historique des versions
                précédentes des CGU, accessible sur demande à contact@alfycore.org.
              </p>
            </>
          ),
        },
        {
          heading: "Droit applicable et juridiction compétente",
          body: (
            <>
              <h3 className="text-[12px] font-semibold text-foreground">19.1 Loi applicable</h3>
              <p>
                Les présentes CGU sont régies, interprétées et exécutées conformément au droit français,
                sans égard pour les règles de conflit de lois. L'application de la Convention des Nations
                Unies sur les contrats de vente internationale de marchandises est expressément exclue.
                Les présentes CGU sont rédigées en langue française, qui fait foi en cas de litige ou
                de contradiction avec une version traduite.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">19.2 Résolution amiable préalable</h3>
              <p>
                En cas de litige relatif à l'interprétation, l'exécution ou la résiliation des présentes
                CGU, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire.
                Vous pouvez adresser votre réclamation à contact@alfycore.org. AlfyCore s'engage à y
                répondre dans un délai raisonnable de 30 jours calendaires.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">19.3 Compétence juridictionnelle</h3>
              <p>
                À défaut de résolution amiable, tout litige relatif aux présentes CGU relève de la
                compétence exclusive des juridictions françaises territorialement compétentes, sous
                réserve des dispositions impératives de protection des consommateurs applicables selon
                le pays de résidence de l'utilisateur, notamment le Règlement (UE) n° 1215/2012 dit
                « Bruxelles I bis » pour les utilisateurs résidant dans l'Union européenne.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">19.4 Règlement en ligne des litiges (RLL)</h3>
              <p>
                Les utilisateurs résidant dans l'Union européenne peuvent également recourir à la
                plateforme de règlement en ligne des litiges (RLL) mise en place par la Commission
                européenne, accessible à l'adresse <strong>ec.europa.eu/consumers/odr</strong>.
                Cette plateforme permet de soumettre une réclamation et de trouver un organisme de
                règlement extrajudiciaire des litiges compétent.
              </p>
            </>
          ),
        },
        {
          heading: "Contact, réclamations et support",
          body: (
            <>
              <p>
                Pour toute question, demande de précision, réclamation relative aux présentes CGU ou à
                l'utilisation du service AlfyChat, vous pouvez contacter AlfyCore via les moyens suivants :
              </p>
              <ul>
                <li><strong>AlfyCore</strong> — Association loi 1901, France</li>
                <li><strong>E-mail général :</strong> contact@alfycore.org</li>
                <li><strong>Site institutionnel :</strong> alfycore.pro</li>
                <li><strong>Plateforme :</strong> alfychat.app</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">20.1 Délais de traitement</h3>
              <p>
                AlfyCore s'engage à accuser réception de toute demande ou réclamation dans un délai
                de 72 heures ouvrables et à y apporter une réponse complète dans un délai de 30 jours
                calendaires à compter de la réception. Pour les demandes complexes ou nécessitant une
                instruction approfondie, ce délai peut être prolongé de 30 jours supplémentaires,
                avec notification préalable de ce report.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">20.2 Objets de contact recommandés</h3>
              <ul>
                <li>Droits RGPD (accès, rectification, effacement...) : « Droits RGPD — [nature] »</li>
                <li>Signalement de contenu illicite urgent : « Signalement urgent — [nature] »</li>
                <li>Report de vulnérabilité de sécurité : « Security — Vulnerability Disclosure »</li>
                <li>Question relative aux CGU : « CGU — [nature de la question] »</li>
                <li>Demande de DPA (accord de traitement des données) : « DPA Request »</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">20.3 Dispositions finales</h3>
              <p>
                Les présentes Conditions Générales d'Utilisation ont été rédigées pour la plateforme
                AlfyChat, développée, exploitée et maintenue par AlfyCore, association à but non
                lucratif constituée conformément à la loi du 1er juillet 1901, domiciliée en France.
                Si une ou plusieurs clauses des présentes CGU venaient à être déclarées nulles ou non
                opposables par une décision de justice, les autres clauses demeureraient pleinement
                en vigueur. L'absence d'exercice par AlfyCore d'un droit ou d'une prérogative découlant
                des présentes CGU ne saurait être interprétée comme une renonciation à ce droit ou
                à cette prérogative. Les présentes CGU sont rédigées en langue française, qui fait
                foi en cas de litige.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}


