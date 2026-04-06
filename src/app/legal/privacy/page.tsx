import { ShieldIcon } from '@/components/icons';
import { LegalPage } from '../legal-page';

export default function PrivacyPage() {
  return (
    <LegalPage
      icon={ShieldIcon}
      title="Politique de confidentialité"
      subtitle="Comment AlfyCore collecte, utilise, protège et supprime vos données personnelles"
      updatedAt="14 mars 2026"
      sections={[
        {
          heading: "Responsable du traitement et cadre légal",
          body: (
            <>
              <p>
                Au sens du Règlement (UE) 2016/679 du Parlement européen et du Conseil du 27 avril 2016 relatif
                à la protection des personnes physiques à l'égard du traitement des données à caractère personnel
                et à la libre circulation de ces données (ci-après « RGPD »), le responsable du traitement des
                données personnelles collectées via la plateforme AlfyChat est :
              </p>
              <ul>
                <li><strong>Dénomination :</strong> AlfyCore</li>
                <li><strong>Forme juridique :</strong> Association à but non lucratif, constituée conformément à la loi du 1er juillet 1901 relative au contrat d'association</li>
                <li><strong>Pays d'établissement :</strong> France</li>
                <li><strong>Contact :</strong> contact@alfycore.org</li>
                <li><strong>Site de l'association :</strong> alfycore.pro</li>
                <li><strong>Plateforme gérée :</strong> alfychat.app</li>
              </ul>
              <p>
                AlfyCore est une association à but non lucratif qui n'a ni actionnaire, ni investisseur, ni intérêt
                commercial à valoriser vos données. Notre mission exclusive est de fournir des outils numériques
                souverains, libres et respectueux de la vie privée. La présente politique de confidentialité est
                le reflet direct et intégral de cet engagement fondateur.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">1.1 Délégué à la protection des données (DPO)</h3>
              <p>
                Compte tenu de la nature associative et non lucrative d'AlfyCore, ainsi que de l'absence de
                traitements à grande échelle de données sensibles au sens de l'article 9 du RGPD, la désignation
                formelle d'un délégué à la protection des données (DPO) n'est pas obligatoire au titre de l'article
                37 du RGPD. Néanmoins, AlfyCore traite l'ensemble des questions relatives à la protection des
                données avec la plus grande rigueur. Toute demande ou signalement peut être adressé à
                contact@alfycore.org en précisant l'objet « Protection des données — [nature de votre demande] ».
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">1.2 Périmètre d'application</h3>
              <p>
                La présente politique s'applique à l'ensemble des traitements de données à caractère personnel
                effectués par AlfyCore dans le cadre de l'exploitation de la plateforme AlfyChat, accessible via
                l'application web alfychat.app, les applications mobiles officielles pour iOS et Android, les
                clients de bureau et tout autre point d'accès officiel au service. Elle ne couvre pas les pratiques
                des plateformes tierces, sites web externes ou bots développés par des tiers qui pourraient
                interagir avec AlfyChat.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">1.3 Références réglementaires</h3>
              <p>
                La présente politique est établie en conformité avec le RGPD (Règlement UE 2016/679), la loi
                française n° 78-17 du 6 janvier 1978 relative à l'informatique, aux fichiers et aux libertés
                (dite « Loi Informatique et Libertés ») dans sa version modifiée, la loi n° 2004-575 du 21 juin
                2004 pour la Confiance dans l'Économie Numérique (LCEN), et le Règlement (UE) 2022/2065 sur les
                services numériques (Digital Services Act — DSA).
              </p>
            </>
          ),
        },
        {
          heading: "Principes fondamentaux régissant nos traitements",
          body: (
            <>
              <p>
                AlfyCore s'engage à respecter scrupuleusement les principes fondamentaux définis à l'article 5
                du RGPD dans l'intégralité de ses traitements de données à caractère personnel :
              </p>
              <ul>
                <li>
                  <strong>Licéité, loyauté et transparence :</strong> chaque traitement repose sur une base légale
                  valide (article 6 RGPD). La présente politique constitue l'expression principale de notre
                  transparence vis-à-vis des personnes dont nous traitons les données.
                </li>
                <li>
                  <strong>Limitation des finalités :</strong> les données collectées ne sont utilisées qu'aux fins
                  explicitement déclarées dans la présente politique. Elles ne sont jamais réutilisées pour des
                  finalités incompatibles avec celles pour lesquelles elles ont été recueillies.
                </li>
                <li>
                  <strong>Minimisation des données :</strong> seules les données strictement nécessaires à la
                  finalité poursuivie sont collectées. AlfyCore ne collecte pas de données « au cas où » ni à
                  des fins de valorisation future.
                </li>
                <li>
                  <strong>Exactitude :</strong> nous mettons à disposition des mécanismes permettant aux
                  utilisateurs de vérifier, corriger et mettre à jour leurs données directement depuis les
                  paramètres de leur compte.
                </li>
                <li>
                  <strong>Limitation de la conservation :</strong> les données ne sont conservées que le temps
                  strictement nécessaire à la réalisation des finalités pour lesquelles elles ont été collectées,
                  conformément aux durées définies à l'article 10 de la présente politique.
                </li>
                <li>
                  <strong>Intégrité et confidentialité :</strong> des mesures techniques et organisationnelles
                  appropriées sont mises en œuvre pour protéger les données contre tout accès non autorisé,
                  perte accidentelle, altération ou destruction, détaillées à l'article 11.
                </li>
                <li>
                  <strong>Responsabilité (accountability) :</strong> AlfyCore est en mesure de démontrer le
                  respect de ces principes à tout moment et dans le cadre de tout contrôle réglementaire.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "Données que nous ne collectons pas",
          body: (
            <>
              <p>
                Par principe de minimisation et dans le respect intégral de nos valeurs, AlfyCore s'engage
                formellement et sans exception à ne jamais collecter les catégories de données suivantes :
              </p>
              <ul>
                <li>Données de catégorie spéciale au sens de l'article 9 du RGPD : origine raciale ou ethnique, opinions politiques, convictions religieuses ou philosophiques, appartenance syndicale, données génétiques, données biométriques aux fins d'identification unique, données concernant la santé, données concernant l'orientation sexuelle ou la vie sexuelle</li>
                <li>Identifiants publicitaires mobiles (IDFA d'Apple, GAID de Google ou tout équivalent)</li>
                <li>Données biométriques à des fins de reconnaissance faciale ou d'identification comportementale</li>
                <li>Localisation géographique précise (GPS) ou continue dans le temps</li>
                <li>Liste de contacts téléphoniques, d'amis sur d'autres réseaux ou d'adresses e-mail de tiers</li>
                <li>Données issues de réseaux sociaux tiers sans votre consentement explicite et documenté</li>
                <li>Toute donnée à des fins de profilage commercial, comportemental ou psychographique</li>
                <li>Données de navigation sur des sites web tiers (cross-site tracking)</li>
              </ul>
              <p>
                AlfyCore n'intègre aucun SDK de réseau social, aucun outil d'analytics tiers (Google Analytics,
                Mixpanel, Amplitude, Hotjar, Segment ou similaires), et aucun partenaire publicitaire ou de données.
                L'architecture technique d'AlfyChat a été conçue dès son origine pour rendre ces collectes
                structurellement impossibles.
              </p>
            </>
          ),
        },
        {
          heading: "Données de compte et de profil collectées",
          body: (
            <>
              <p>
                Lors de la création et de l'utilisation de votre compte AlfyChat, les données suivantes peuvent
                être collectées et traitées par AlfyCore :
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">4.1 Données d'identification obligatoires</h3>
              <ul>
                <li>
                  <strong>Adresse e-mail :</strong> utilisée pour l'authentification, la récupération de compte
                  et les communications de service essentielles (notifications de sécurité, changements importants
                  des CGU). Elle n'est pas visible publiquement sauf choix explicite de votre part.
                </li>
                <li>
                  <strong>Nom d'utilisateur (pseudo) :</strong> identifiant public unique sur la plateforme,
                  visible par les autres utilisateurs. Il est modifiable depuis vos paramètres de compte.
                </li>
                <li>
                  <strong>Identifiant unique interne (UUID) :</strong> identifiant technique généré aléatoirement
                  lors de la création du compte, utilisé pour les opérations système internes. Non exposé
                  publiquement ni transmis à des tiers.
                </li>
                <li>
                  <strong>Mot de passe :</strong> jamais stocké en clair ni transmis en clair sur le réseau.
                  Il est haché de manière irréversible avec l'algorithme bcrypt (facteur de coût adaptatif
                  minimum 12, avec sel unique par mot de passe) avant toute persistance en base de données.
                  AlfyCore ne peut techniquement pas retrouver votre mot de passe en clair.
                </li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">4.2 Données de profil optionnelles</h3>
              <p>
                Ces données enrichissent votre profil public mais ne sont jamais obligatoires. Vous pouvez
                les modifier ou les supprimer à tout moment depuis vos paramètres :
              </p>
              <ul>
                <li><strong>Avatar :</strong> image de profil téléchargée, stockée sur nos serveurs et visible par les utilisateurs avec lesquels vous interagissez</li>
                <li><strong>Bannière de profil :</strong> image de bannière affichée sur votre page de profil</li>
                <li><strong>Biographie :</strong> texte libre optionnel visible sur le profil public</li>
                <li><strong>Statut personnalisé :</strong> message court affiché sous votre nom</li>
                <li><strong>Statut de présence :</strong> En ligne, Absent, Ne pas déranger, Invisible — modifiable à tout moment et configurable automatiquement</li>
                <li><strong>Liens optionnels :</strong> site web personnel, profils sur d'autres plateformes, si vous choisissez de les renseigner</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">4.3 Données de paramètres et préférences</h3>
              <ul>
                <li>Préférences de notifications (quels événements génèrent une notification, sur quels appareils)</li>
                <li>Préférences d'affichage (thème clair/sombre, densité d'affichage, langue)</li>
                <li>Paramètres de confidentialité avancés (qui peut vous envoyer des messages, voir votre statut, vous rechercher)</li>
                <li>Blocages et restrictions appliqués à d'autres utilisateurs</li>
              </ul>
            </>
          ),
        },
        {
          heading: "Données de communication",
          body: (
            <>
              <h3 className="text-[12px] font-semibold text-foreground">5.1 Messages textuels et médias partagés</h3>
              <p>
                Les messages que vous rédigez et les fichiers que vous partagez constituent vos données de
                communication. Leur niveau de confidentialité dépend directement du mode de chiffrement activé
                pour la conversation ou le salon concerné :
              </p>
              <ul>
                <li>
                  <strong>Mode standard (salons de serveurs communautaires) :</strong> les messages sont chiffrés
                  en transit via TLS 1.3 et chiffrés au repos avec AES-256 sur nos serveurs. AlfyCore peut
                  techniquement accéder à ces messages dans le cadre de ses obligations légales d'hébergeur
                  (signalement de contenus illicites, réquisition judiciaire valide). Un administrateur de
                  serveur peut également les modérer selon les règles de son serveur.
                </li>
                <li>
                  <strong>Mode E2EE — chiffrement de bout en bout (messages directs privés) :</strong> les
                  messages sont chiffrés côté client via ECDH P-256 (échange de clés Diffie-Hellman sur courbe
                  elliptique P-256) suivi d'un chiffrement AES-256-GCM avant toute transmission. Les serveurs
                  d'AlfyCore ne stockent et ne transfèrent que du texte chiffré impossible à déchiffrer sans
                  les clés privées des participants. AlfyCore ne détient aucune clé E2EE et ne peut
                  techniquement pas déchiffrer ces communications, même sur réquisition.
                </li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">5.2 Métadonnées indispensables au routage</h3>
              <p>
                Même en mode E2EE, un minimum de métadonnées est traité pour assurer l'acheminement technique
                des communications. Ces métadonnées ne révèlent pas le contenu des échanges mais sont
                structurellement nécessaires au fonctionnement du service :
              </p>
              <ul>
                <li>Identifiants techniques (non nominatifs) des participants au niveau du routage</li>
                <li>Horodatages d'envoi et de livraison des messages</li>
                <li>Taille approximative du bloc chiffré (sans révéler le contenu)</li>
                <li>Indicateur du type de contenu (texte, fichier, réaction) à des fins de rendu d'interface</li>
              </ul>
              <p>
                Ces métadonnées constituent le minimum technique indispensable. AlfyCore ne les utilise à
                aucune fin d'analyse comportementale, commerciale ou de profilage.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">5.3 Appels vocaux et vidéo</h3>
              <p>
                Les flux audio et vidéo des appels AlfyChat transitent via la technologie WebRTC avec
                chiffrement DTLS-SRTP de bout en bout sur chaque flux média. AlfyCore n'enregistre aucun
                appel vocal ou vidéo, quelles que soient les circonstances. En cas d'utilisation d'un
                serveur relais TURN pour faciliter la connexion entre participants derrière un pare-feu,
                les flux restent chiffrés de bout en bout et le serveur TURN ne peut pas les déchiffrer.
                Seules des données de signalisation minimales (établissement et terminaison d'appel) sont
                traitées par nos serveurs.
              </p>
            </>
          ),
        },
        {
          heading: "Données techniques de fonctionnement",
          body: (
            <>
              <p>
                Pour assurer la sécurité, la stabilité, la disponibilité et la protection anti-abus du
                service AlfyChat, certaines données techniques sont collectées et traitées automatiquement
                lors de votre utilisation du service :
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">6.1 Données de connexion</h3>
              <ul>
                <li>
                  <strong>Adresse IP :</strong> collectée à des fins de sécurité uniquement (détection
                  de connexions anormales, protection contre les attaques par force brute, conformité aux
                  obligations LCEN). Elle est pseudonymisée et n'est pas conservée au-delà de la session
                  active pour les connexions normales. Les tentatives de connexion échouées répétées depuis
                  une même adresse IP peuvent être journalisées temporairement (maximum 90 jours) à des fins
                  de protection contre les attaques.
                </li>
                <li>
                  <strong>User-Agent du client :</strong> type de navigateur, version, système d'exploitation,
                  collecté à des fins de compatibilité technique et de détection d'accès automatisés abusifs.
                </li>
                <li>
                  <strong>Horodatages de connexion et de déconnexion :</strong> utilisés pour la gestion des
                  sessions actives et la détection de comportements suspects.
                </li>
                <li>
                  <strong>Localisation approximative :</strong> pays ou région estimés à partir de l'adresse IP,
                  utilisés uniquement pour la détection d'anomalies de sécurité (connexion depuis un pays
                  géographiquement incohérent avec votre historique habituel). Non stockée de façon permanente
                  ni transmise à des tiers, à l'exception des obligations légales applicables.
                </li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">6.2 Journaux techniques (logs système)</h3>
              <p>
                Des journaux d'activité système sont générés automatiquement lors des appels à l'API pour
                assurer la disponibilité du service, diagnostiquer les erreurs et détecter les abus. Ces
                journaux contiennent des informations purement techniques : code de statut HTTP, latence de
                réponse, identifiant de requête pseudonymisé, endpoint appelé. Ils ne contiennent pas le
                contenu de vos messages ni vos données personnelles identifiantes au-delà de l'identifiant
                de session pseudonymisé. Ils sont conservés pour une durée maximale de 90 jours, puis
                supprimés automatiquement par des procédures d'archivage programmées.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">6.3 Absence totale de statistiques comportementales</h3>
              <p>
                AlfyCore ne collecte aucune donnée de comportement utilisateur à des fins analytiques :
                pages visitées au sein de l'application, flux de navigation, clics, positions du curseur,
                profondeur de défilement, heatmaps de l'interface, durées de session détaillées, ou tout
                autre indicateur d'engagement comportemental. L'absence de tout outil d'analytics tiers
                ou propriétaire est une décision architecturale et éthique délibérée, conforme à notre
                politique stricte de minimisation des données.
              </p>
            </>
          ),
        },
        {
          heading: "Finalités du traitement et base légale (RGPD)",
          body: (
            <>
              <p>
                Conformément à l'article 13 du RGPD, chaque traitement de données personnelles effectué
                par AlfyCore repose sur une base légale précise, définie à l'article 6 du RGPD. Le tableau
                ci-dessous détaille les finalités de traitement et leur base légale respective :
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">7.1 Exécution du contrat — Art. 6.1.b RGPD</h3>
              <p>
                Ces traitements sont nécessaires à l'exécution du contrat d'utilisation d'AlfyChat que vous
                avez accepté lors de votre inscription. Sans ces traitements, le service ne peut pas être fourni :
              </p>
              <ul>
                <li>Création, gestion et authentification de votre compte utilisateur</li>
                <li>Transmission, routage et stockage des messages, fichiers et médias partagés</li>
                <li>Fourniture des fonctionnalités de messagerie directe, salons de serveur, appels vocaux et vidéo</li>
                <li>Gestion de votre liste d'amis, des invitations et des blocages</li>
                <li>Délivrance et gestion des notifications</li>
                <li>Traitement des demandes de support technique</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">7.2 Intérêt légitime — Art. 6.1.f RGPD</h3>
              <p>
                Ces traitements servent les intérêts légitimes d'AlfyCore (sécurité, disponibilité, qualité
                du service) sans préjudice de vos droits et libertés fondamentaux :
              </p>
              <ul>
                <li>Sécurité du service : détection et prévention des abus, spam, fraudes, tentatives d'intrusion</li>
                <li>Protection contre les attaques informatiques (DDoS, force brute, injection)</li>
                <li>Journalisation technique pour assurer la disponibilité et diagnostiquer les erreurs</li>
                <li>Amélioration du service via des statistiques agrégées, anonymisées et non réidentifiables</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">7.3 Obligation légale — Art. 6.1.c RGPD</h3>
              <p>
                Certains traitements sont imposés par la loi applicable aux hébergeurs et opérateurs de plateformes :
              </p>
              <ul>
                <li>Conservation des données d'identification requises par la LCEN pendant 1 an pour permettre l'identification des auteurs de contenus illicites sur réquisition judiciaire</li>
                <li>Réponse aux réquisitions judiciaires, aux ordonnances de tribunaux et aux demandes d'autorités compétentes</li>
                <li>Signalement aux autorités compétentes de certaines catégories de contenus illicites graves (CSAM notamment)</li>
                <li>Respect des obligations fiscales et comptables de l'association</li>
              </ul>
              <p>
                AlfyCore ne traite aucune donnée personnelle sur la base du consentement marketing (Art. 6.1.a
                RGPD) puisque nous ne pratiquons aucune publicité, aucune prospection commerciale et ne cédons
                aucune donnée à des fins commerciales, quelles qu'elles soient.
              </p>
            </>
          ),
        },
        {
          heading: "Hébergement, localisation et transferts de données",
          body: (
            <>
              <p>
                La totalité des données personnelles traitées par AlfyCore dans le cadre d'AlfyChat est hébergée
                et traitée au sein de l'Union européenne. AlfyCore s'engage formellement à n'effectuer aucun
                transfert de données vers des pays tiers situés en dehors de l'Union européenne ou de l'Espace
                Économique Européen, à l'exception des cas où vous-même initieriez une telle interaction (par
                exemple, en interagissant avec un bot tiers hébergé hors UE).
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">8.1 Infrastructure Hostinger (hébergeur sous-traitant)</h3>
              <p>
                Une part de l'infrastructure AlfyChat est hébergée chez Hostinger, fournisseur d'hébergement
                opérant des datacenters en Europe. Hostinger agit en qualité de sous-traitant au sens de
                l'article 28 du RGPD. Un contrat de traitement des données (DPA — Data Processing Agreement)
                encadre cette relation. Les services hébergés chez Hostinger comprennent :
              </p>
              <ul>
                <li>Serveur web front-end (alfychat.app)</li>
                <li>API Gateway centralisé (gateway.alfychat.app)</li>
                <li>Microservice Utilisateurs : gestion des comptes, authentification, profils</li>
                <li>Microservice Messages : stockage et transmission des messages (chiffrés au repos AES-256)</li>
                <li>Microservice Appels : signalisation WebRTC, serveurs TURN/STUN</li>
                <li>CDN intégré pour la distribution des médias (media.alfychat.app)</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">8.2 Infrastructure propre AlfyCore (France)</h3>
              <p>
                Les services suivants sont opérés directement sur des serveurs physiquement détenus et
                administrés par les membres d'AlfyCore, localisés en France :
              </p>
              <ul>
                <li>Microservice Amis : liste d'amis, invitations, blocages, présence sociale</li>
                <li>Microservice Serveurs communautaires : serveurs, salons, rôles, permissions, membres</li>
                <li>Microservice Bots : enregistrement, gestion et webhooks des bots</li>
                <li>Microservice Médias backend : traitement et stockage des fichiers et images</li>
                <li>Base de données MySQL principale : persistance de l'ensemble des données structurées</li>
                <li>Cache Redis : gestion des sessions, présence en ligne, données volatiles et files d'attente</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">8.3 Mesures de chiffrement de l'infrastructure</h3>
              <ul>
                <li><strong>Transit :</strong> TLS 1.3 (minimum TLS 1.2) avec Perfect Forward Secrecy (PFS) activé sur tous les points de terminaison exposés</li>
                <li><strong>Repos :</strong> AES-256-GCM pour les données stockées en base de données et sur le stockage objet</li>
                <li><strong>Communications E2EE :</strong> ECDH P-256 + AES-256-GCM — les serveurs ne peuvent techniquement pas déchiffrer ces données</li>
                <li><strong>Authentification :</strong> bcrypt avec facteur de coût adaptatif et sel unique, MFA disponible</li>
              </ul>
            </>
          ),
        },
        {
          heading: "Sous-traitants, partage et non-cession des données",
          body: (
            <>
              <h3 className="text-[12px] font-semibold text-foreground">9.1 Principe absolu de non-cession</h3>
              <p>
                AlfyCore ne vend, ne loue, ne cède, ne licence et ne commercialise aucune donnée personnelle
                à quelque tiers que ce soit, sans aucune exception. Ce principe est absolu, inscrit dans la
                mission statutaire de l'association, et constitue l'un des piliers fondateurs d'AlfyCore.
                Il s'applique que ces données soient identifiantes, pseudonymisées ou agrégées.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">9.2 Sous-traitants techniques autorisés</h3>
              <p>
                AlfyCore fait appel à un nombre strictement limité de sous-traitants techniques, uniquement
                pour les besoins indispensables à la fourniture du service. Chaque sous-traitant est lié par
                un contrat de traitement des données conforme à l'article 28 du RGPD, qui lui interdit
                formellement d'utiliser vos données à ses propres fins commerciales :
              </p>
              <ul>
                <li>
                  <strong>Hostinger International Ltd :</strong> hébergement d'une partie de l'infrastructure
                  technique (voir article 8.1). Hostinger ne dispose d'aucun accès aux données de contenu
                  des messages E2EE.
                </li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">9.3 Communication aux autorités judiciaires</h3>
              <p>
                Vos données ne peuvent être communiquées à des autorités judiciaires, administratives ou
                policières que dans les cas strictement suivants, et uniquement concernant les données
                techniquement accessibles (hors communications E2EE) :
              </p>
              <ul>
                <li>Sur réquisition judiciaire valide émise par une juridiction française compétente ou sur ordonnance d'une autorité compétente en vertu du droit applicable</li>
                <li>En cas d'urgence absolue caractérisée pour prévenir un danger grave, imminent et identifié pour une personne physique</li>
                <li>Dans le cadre des obligations légales imposées aux hébergeurs de contenu au titre de la LCEN et du DSA, notamment pour les contenus illicites graves</li>
              </ul>
              <p>
                Il est rappelé que les données couvertes par le chiffrement de bout en bout E2EE (messages
                directs privés) sont techniquement inaccessibles à AlfyCore, y compris dans ce cadre légal.
                AlfyCore ne dispose d'aucune « porte dérobée » permettant de contourner le chiffrement E2EE.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">9.4 Bots et intégrations tierces activés par des administrateurs</h3>
              <p>
                Si un administrateur de serveur communautaire active un bot ou une intégration tierce, les
                messages visibles par ce bot dans les salons où il est présent peuvent être transmis au
                service du développeur de ce bot, selon ses propres politiques de confidentialité. AlfyCore
                ne contrôle pas et n'est pas responsable des pratiques des développeurs de bots tiers.
                Nous vous recommandons de vérifier les politiques de confidentialité de chaque bot avant
                son activation.
              </p>
            </>
          ),
        },
        {
          heading: "Durées de conservation des données",
          body: (
            <>
              <p>
                AlfyCore applique des durées de conservation strictement proportionnées et limitées à ce
                qui est nécessaire pour chaque finalité de traitement. Les données sont supprimées ou
                anonymisées dès que la durée de conservation applicable est atteinte, par des procédures
                automatiques ou manuelles :
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">10.1 Données de compte et de profil</h3>
              <ul>
                <li><strong>Compte actif :</strong> conservé et maintenu actif tant que le compte est actif et non supprimé par l'utilisateur ou par AlfyCore</li>
                <li><strong>À la suppression volontaire du compte :</strong> toutes les données personnelles identifiables directement liées au compte (e-mail, pseudo, avatar, biographie, paramètres) sont supprimées dans un délai maximum de 30 jours calendaires suivant la demande de suppression</li>
                <li><strong>Compte inactif :</strong> AlfyCore se réserve le droit de notifier puis de clore les comptes sans aucune activité pendant plus de 3 années consécutives, après information préalable par e-mail</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">10.2 Messages et contenus de communication</h3>
              <ul>
                <li><strong>Messages dans les salons de serveur :</strong> conservés jusqu'à leur suppression manuelle par l'auteur ou par un administrateur du salon habilité</li>
                <li><strong>Messages directs :</strong> conservés jusqu'à suppression par l'un ou l'autre des participants à la conversation</li>
                <li><strong>Fichiers et médias partagés :</strong> conservés aussi longtemps que le message associé existe ; supprimés simultanément avec la suppression du message</li>
                <li><strong>Suppression du compte :</strong> tous les messages et médias publiés par le compte supprimé sont effacés dans un délai de 30 jours</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">10.3 Données techniques</h3>
              <ul>
                <li><strong>Journaux techniques (logs) :</strong> 90 jours maximum, puis suppression automatique par rotation des journaux</li>
                <li><strong>Données de session (Redis) :</strong> supprimées dès la déconnexion explicite ou à l'expiration automatique de la session (7 jours d'inactivité)</li>
                <li><strong>Adresses IP (connexions normales) :</strong> non conservées au-delà de la session active</li>
                <li><strong>Adresses IP (tentatives suspectes) :</strong> journalisées temporairement à des fins de sécurité, maximum 90 jours</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">10.4 Obligations légales de conservation prolongée</h3>
              <p>
                Certaines données peuvent exceptionnellement être conservées au-delà des durées standard
                lorsqu'une obligation légale impérative l'impose. En particulier, les données permettant
                l'identification de l'auteur d'un contenu illicite (données de connexion techniques
                pseudonymisées) doivent être conservées pendant 1 an en vertu de l'article 6 II de la
                LCEN et de l'article 18 du DSA. Ces données sont strictement isolées, conservées sous
                accès restreint, et ne sont communiquées qu'en réponse à une réquisition judiciaire valide.
              </p>
            </>
          ),
        },
        {
          heading: "Sécurité et protection technique des données",
          body: (
            <>
              <p>
                AlfyCore met en œuvre un ensemble complet et cohérent de mesures techniques et
                organisationnelles pour protéger vos données contre tout accès non autorisé, toute
                divulgation, altération, destruction accidentelle ou illicite :
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">11.1 Mesures techniques de sécurité</h3>
              <ul>
                <li><strong>Chiffrement en transit :</strong> TLS 1.3 avec Perfect Forward Secrecy activé sur tous les services et API exposés, rendant vos données illisibles sur le réseau</li>
                <li><strong>Chiffrement au repos :</strong> AES-256-GCM pour les données persistées en base de données MySQL et sur le stockage objet</li>
                <li><strong>Chiffrement de bout en bout (E2EE) :</strong> ECDH P-256 pour l'échange de clés + AES-256-GCM pour le chiffrement des messages privés — les clés cryptographiques sont générées et gérées exclusivement côté client, les serveurs ne pouvant pas déchiffrer</li>
                <li><strong>Hachage des mots de passe :</strong> bcrypt avec facteur de coût adaptatif (minimum 12) et sel cryptographiquement aléatoire unique par utilisateur</li>
                <li><strong>Protection CSRF :</strong> tokens CSRF sur toutes les opérations sensibles et modifiantes</li>
                <li><strong>Rate Limiting :</strong> limitation du taux de requêtes par IP et par compte sur toutes les API, prévenant les attaques par force brute et les abus automatisés</li>
                <li><strong>Segmentation réseau :</strong> isolation des microservices par containerisation Docker avec règles de pare-feu inter-services strictes ; les services ne communiquent qu'à travers des interfaces définies et contrôlées</li>
                <li><strong>Accès distant sécurisé :</strong> administration des serveurs uniquement via SSH avec authentification par clé cryptographique, authentification multi-facteurs (MFA) requise</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">11.2 Mesures organisationnelles</h3>
              <ul>
                <li>Accès aux données de production strictement limité aux membres d'AlfyCore ayant une nécessité opérationnelle démontrée (principe du moindre privilège)</li>
                <li>Revue régulière des accès et des permissions accordées</li>
                <li>Politique de divulgation responsable des vulnérabilités : si vous découvrez une faille de sécurité, signalez-la à contact@alfycore.org avant toute divulgation publique</li>
                <li>Veille active sur les vulnérabilités des dépendances logicielles</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">11.3 Procédure en cas de violation de données (data breach)</h3>
              <p>
                En cas de violation de données personnelles susceptible d'engendrer un risque pour les droits
                et libertés des personnes concernées, AlfyCore s'engage à respecter les obligations suivantes,
                conformément aux articles 33 et 34 du RGPD :
              </p>
              <ul>
                <li><strong>Notification à la CNIL :</strong> dans un délai de 72 heures après avoir eu connaissance de la violation (article 33 RGPD), avec description de sa nature, ses conséquences probables et les mesures prises ou envisagées</li>
                <li><strong>Notification aux personnes concernées :</strong> dans les meilleurs délais, lorsque la violation est susceptible d'engendrer un risque élevé pour les droits et libertés des individus (article 34 RGPD), avec recommandations pour limiter les préjudices potentiels</li>
              </ul>
            </>
          ),
        },
        {
          heading: "Vos droits sur vos données personnelles",
          body: (
            <>
              <p>
                Conformément aux articles 15 à 22 du RGPD et à la Loi Informatique et Libertés, vous
                disposez des droits suivants concernant le traitement de vos données personnelles par
                AlfyCore. Ces droits peuvent être exercés à tout moment, gratuitement et sans justification
                de votre part pour la plupart d'entre eux.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">12.1 Droit d'accès (Art. 15 RGPD)</h3>
              <p>
                Vous avez le droit d'obtenir de notre part la confirmation que des données vous concernant
                font l'objet d'un traitement, et d'en obtenir une copie. Vous avez également le droit
                d'être informé des finalités du traitement, des catégories de données traitées, des
                destinataires auxquels les données ont été ou seront communiquées, de la durée de
                conservation envisagée, et de l'existence de vos autres droits.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">12.2 Droit de rectification (Art. 16 RGPD)</h3>
              <p>
                Vous pouvez demander la correction de données inexactes ou incomplètes vous concernant.
                La majorité de vos données de profil sont modifiables directement en temps réel depuis
                les paramètres de votre compte, sans nécessiter de demande formelle à AlfyCore.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">12.3 Droit à l'effacement — « droit à l'oubli » (Art. 17 RGPD)</h3>
              <p>
                Vous pouvez demander la suppression définitive de vos données personnelles lorsque celles-ci
                ne sont plus nécessaires aux finalités pour lesquelles elles ont été collectées, ou en cas de
                retrait de votre consentement, d'opposition légitime ou de traitement illicite. Ce droit peut
                être exercé directement depuis les paramètres de votre compte (suppression de compte) ou par
                demande adressée à contact@alfycore.org. Les données seront supprimées dans un délai maximum
                de 30 jours, sous réserve des obligations légales de conservation décrites à l'article 10.4.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">12.4 Droit à la portabilité (Art. 20 RGPD)</h3>
              <p>
                Vous pouvez recevoir vos données dans un format structuré, couramment utilisé et lisible
                par machine (JSON), et les transmettre à un autre responsable de traitement. Ce droit
                s'applique aux données que vous nous avez fournies directement et dont le traitement est
                fondé sur votre contrat d'utilisation. Une fonctionnalité d'export de données est
                disponible dans les paramètres de votre compte ou sur demande à contact@alfycore.org.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">12.5 Droit d'opposition (Art. 21 RGPD)</h3>
              <p>
                Vous pouvez vous opposer à un traitement de vos données fondé sur notre intérêt légitime
                (Art. 6.1.f), pour des raisons tenant à votre situation particulière. AlfyCore cessera le
                traitement sauf s'il peut démontrer des motifs légitimes impérieux prévalant sur vos
                intérêts, droits et libertés.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">12.6 Droit à la limitation du traitement (Art. 18 RGPD)</h3>
              <p>
                Dans certaines circonstances (contestation de l'exactitude des données, traitement illicite
                que vous ne souhaitez pas effacer, données devenues inutiles mais dont vous avez besoin pour
                la constatation d'un droit en justice), vous pouvez demander la limitation du traitement, qui
                permet de « geler » l'utilisation de vos données sans les supprimer.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">12.7 Modalités d'exercice et délais</h3>
              <p>
                Pour exercer l'un de vos droits, envoyez une demande écrite à <strong>contact@alfycore.org</strong>
                avec l'objet « Exercice de droits RGPD — [nature du droit] » et en précisant votre nom
                d'utilisateur AlfyChat pour permettre l'identification de votre compte. AlfyCore s'engage à
                accuser réception de votre demande sous 72 heures et à y répondre complètement dans un délai
                d'un mois à compter de la réception, délai pouvant être prolongé de deux mois supplémentaires
                en cas de demandes complexes ou nombreuses (avec notification explicite de ce report).
              </p>
            </>
          ),
        },
        {
          heading: "Décisions automatisées et profilage",
          body: (
            <>
              <p>
                AlfyCore n'effectue aucune prise de décision entièrement automatisée produisant des effets
                juridiques ou vous affectant de manière significative au sens de l'article 22 du RGPD.
                En d'autres termes, aucun algorithme ne prend seul des décisions déterminantes pour vous
                concernant l'accès au service, les restrictions de compte ou toute autre mesure ayant
                un impact substantiel sur vos droits.
              </p>
              <p>
                Aucun profilage automatisé, comportemental, commercial ou psychographique n'est réalisé
                sur vos données. Nous ne construisons aucun profil d'utilisateur à des fins de ciblage
                publicitaire, de recommandations algorithmiques, d'évaluation de votre solvabilité,
                de votre personnalité ou de tout autre attribut vous concernant.
              </p>
              <p>
                Les contrôles de sécurité automatisés (détection de comportements abusifs, de spam ou de
                connexions suspectes) reposent sur des règles techniques et des heuristiques qui peuvent
                générer des alertes ou des restrictions temporaires préventives. Ces mesures automatiques
                ne constituent pas des décisions finales : elles font systématiquement l'objet d'une
                vérification humaine préalablement à toute sanction définitive, et peuvent être contestées
                en contactant AlfyCore à contact@alfycore.org.
              </p>
            </>
          ),
        },
        {
          heading: "Cookies et technologies de stockage local",
          body: (
            <>
              <p>
                AlfyChat utilise exclusivement des cookies et technologies de stockage local à caractère
                purement technique et fonctionnel, strictement nécessaires au bon fonctionnement du service.
                Aucun cookie publicitaire, cookie de suivi comportemental, ou cookie de profilage n'est
                utilisé sur la plateforme AlfyChat.
              </p>
              <p>
                Conformément aux lignes directrices de la CNIL sur les cookies et à la Directive ePrivacy
                (2002/58/CE), les cookies strictement nécessaires au fonctionnement d'un service sont
                exemptés de consentement. AlfyChat n'utilisant que de tels cookies essentiels, aucune
                bannière de consentement aux cookies n'est requise. Cette absence de bannière résulte
                d'une conception délibérément privacy-first et non d'une omission.
              </p>
              <p>
                Pour une description complète et détaillée de chaque cookie, technologie de stockage local
                et mécanisme similaire utilisé par AlfyChat, leur finalité précise, leur durée de vie et
                vos options de gestion, consultez notre <strong>Politique de cookies</strong> accessible
                depuis le menu de navigation de cette section légale.
              </p>
            </>
          ),
        },
        {
          heading: "Modifications de la politique de confidentialité",
          body: (
            <>
              <p>
                AlfyCore se réserve le droit de mettre à jour et de modifier la présente politique de
                confidentialité à tout moment, notamment pour refléter les évolutions de la législation
                applicable, les décisions de la CNIL ou d'autres autorités de contrôle, les modifications
                techniques de l'infrastructure AlfyChat, ou les nouvelles fonctionnalités introduites dans
                le service.
              </p>
              <p>
                En cas de modification substantielle affectant vos droits, la manière dont nous collectons
                ou utilisons vos données, ou toute autre disposition importante de la présente politique,
                vous serez informé de façon proactive par notification dans l'application AlfyChat et/ou
                par e-mail à l'adresse associée à votre compte, au moins 30 jours avant l'entrée en vigueur
                des nouvelles dispositions. Ce délai vous permet de prendre connaissance des modifications
                et, si vous le souhaitez, de supprimer votre compte avant leur application.
              </p>
              <p>
                En continuant à utiliser le service après l'entrée en vigueur d'une version mise à jour
                de cette politique, vous êtes réputé avoir pris connaissance des nouvelles dispositions.
                La version actuellement en vigueur est toujours accessible à l'adresse
                alfychat.app/legal/privacy. La date de dernière mise à jour est indiquée en haut de cette page.
              </p>
            </>
          ),
        },
        {
          heading: "Réclamation auprès de l'autorité de contrôle (CNIL)",
          body: (
            <>
              <p>
                Si, après avoir contacté AlfyCore à contact@alfycore.org et obtenu une réponse que vous
                estimez insatisfaisante, vous considérez que le traitement de vos données à caractère
                personnel par AlfyCore n'est pas conforme au RGPD ou à la Loi Informatique et Libertés,
                vous disposez du droit d'introduire une réclamation auprès de l'autorité de contrôle
                compétente, conformément à l'article 77 du RGPD.
              </p>
              <p>
                L'autorité de contrôle compétente pour la France est la Commission Nationale de
                l'Informatique et des Libertés (CNIL) :
              </p>
              <ul>
                <li><strong>Site web :</strong> cnil.fr (formulaire de plainte en ligne disponible)</li>
                <li><strong>Adresse postale :</strong> 3 Place de Fontenoy — TSA 80715 — 75334 Paris Cedex 07</li>
                <li><strong>Téléphone :</strong> +33 (0)1 53 73 22 22</li>
                <li><strong>Permanences téléphoniques :</strong> du lundi au vendredi de 9h à 18h30</li>
              </ul>
              <p>
                Si vous résidez dans un autre État membre de l'Union européenne, vous pouvez également
                vous adresser à l'autorité de protection des données compétente de votre pays de résidence.
                La liste des autorités européennes est disponible sur le site du Comité Européen de la
                Protection des Données (edpb.europa.eu).
              </p>
            </>
          ),
        },
      ]}
    />
  );
}


