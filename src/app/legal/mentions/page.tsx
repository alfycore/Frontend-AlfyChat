import { ScaleIcon } from '@/components/icons';
import { LegalPage } from '../legal-page';

export default function MentionsPage() {
  return (
    <LegalPage
      icon={ScaleIcon}
      title="Mentions légales"
      subtitle="Informations légales relatives à l'éditeur, l'hébergeur et l'exploitant du service AlfyChat"
      updatedAt="26 mars 2026"
      sections={[
        {
          heading: "Identité de l'éditeur et de l'exploitant",
          body: (
            <>
              <p>
                Conformément aux dispositions de l'article 6 III de la loi n° 2004-575 du 21 juin 2004 pour
                la Confiance dans l'Économie Numérique (LCEN), les présentes mentions légales identifient
                l'éditeur du site et de la plateforme AlfyChat :
              </p>
              <ul>
                <li><strong>Dénomination sociale :</strong> AlfyCore</li>
                <li><strong>Forme juridique :</strong> Association à but non lucratif, régie par la loi du 1er juillet 1901 relative au contrat d'association et le décret du 16 août 1901</li>
                <li><strong>Nature :</strong> Personne morale de droit privé à but non lucratif, sans capital social ni actionnaires</li>
                <li><strong>Pays d'établissement :</strong> France</li>
                <li><strong>Objet statutaire :</strong> Concevoir, distribuer, maintenir et promouvoir des outils numériques libres, souverains et respectueux de la vie privée des utilisateurs</li>
                <li><strong>Adresse e-mail de contact :</strong> contact@alfycore.org</li>
                <li><strong>Site institutionnel de l'association :</strong> alfycore.pro</li>
                <li><strong>Plateforme exploitée :</strong> alfychat.app</li>
              </ul>
              <p>
                AlfyCore est une association à but non lucratif au sens strict de la loi française du
                1er juillet 1901. Elle n'a ni capital social, ni actionnaire, ni investisseur externe,
                et ne distribue aucun bénéfice à ses membres. Elle ne dépend d'aucun groupe industriel
                ou commercial, et n'est soumise à aucune obligation de rentabilité ou de valorisation.
                Son financement est assuré exclusivement par les contributions volontaires de ses membres
                et les éventuels dons réalisés en soutien à sa mission d'intérêt général.
              </p>
            </>
          ),
        },
        {
          heading: "Directeur de la publication",
          body: (
            <>
              <p>
                Conformément à l'article 6 III de la LCEN, la direction de la publication du site
                alfychat.app et de la plateforme AlfyChat est assurée par un représentant mandaté de
                l'association AlfyCore. Pour toute question relative au contenu éditorial du service,
                vous pouvez adresser votre demande à <strong>contact@alfycore.org</strong>.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">2.1 Qualité d'hébergeur de contenu</h3>
              <p>
                AlfyCore n'opère pas un service de presse au sens de la loi du 29 juillet 1881 sur la
                liberté de la presse. AlfyChat est une infrastructure technique de messagerie instantanée
                dont les contenus sont intégralement générés par les utilisateurs. AlfyCore agit en
                qualité d'hébergeur de contenu au sens de l'article 6 de la LCEN et du Règlement (UE)
                2022/2065 du Parlement européen et du Conseil du 19 octobre 2022 relatif à un marché
                intérieur des services numériques (Digital Services Act — DSA). À ce titre, AlfyCore
                n'est pas responsable a priori des contenus publiés par ses utilisateurs mais agit
                promptement pour retirer les contenus manifestement illicites qui lui sont signalés.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">2.2 Absence d'obligation générale de surveillance</h3>
              <p>
                Conformément à l'article 15 de la Directive 2000/31/CE et à son équivalent dans la LCEN,
                AlfyCore n'est pas soumis à une obligation générale de surveiller les contenus transmis
                ou stockés par les utilisateurs, ni à une obligation générale de rechercher activement des
                faits ou des circonstances révélant des activités illicites.
              </p>
            </>
          ),
        },
        {
          heading: "Coordonnées de contact",
          body: (
            <>
              <h3 className="text-[12px] font-semibold text-foreground">3.1 Contact général</h3>
              <ul>
                <li><strong>Adresse e-mail générale :</strong> contact@alfycore.org</li>
                <li><strong>Site institutionnel :</strong> alfycore.pro</li>
                <li><strong>Accès à la plateforme :</strong> alfychat.app</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">3.2 Demandes relatives aux données personnelles (RGPD)</h3>
              <p>
                Pour toute demande d'exercice de vos droits sur vos données personnelles (accès,
                rectification, effacement, portabilité, opposition, limitation), adressez votre demande
                à contact@alfycore.org avec l'objet : « Droits RGPD — [nature de votre demande] »
                en précisant votre nom d'utilisateur AlfyChat pour faciliter le traitement.
                AlfyCore s'engage à accuser réception sous 72 heures et à répondre dans un délai
                maximum d'un mois.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">3.3 Signalement de contenus illicites</h3>
              <p>
                Pour le signalement urgent de contenus illicites (contenu à caractère pédopornographique —
                CSAM, apologie du terrorisme, contenu portant atteinte grave à la dignité, violation
                manifeste de vie privée), adressez votre signalement à contact@alfycore.org avec
                l'objet : « Signalement urgent — [nature du contenu] ». AlfyCore s'engage à traiter
                les signalements urgents en priorité et dans les meilleurs délais, conformément aux
                obligations prescrites par le DSA.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">3.4 Signalement de violations de droits de propriété intellectuelle</h3>
              <p>
                Pour toute réclamation relative à une atteinte alléguée à vos droits de propriété
                intellectuelle (contrefaçon, droits d'auteur, droits voisins), adressez une notification
                documentée à contact@alfycore.org avec l'objet « DPI — [nature du signalement] »,
                accompagnée des éléments permettant d'identifier le contenu litigieux et de justifier
                de votre qualité de titulaire des droits invoqués.
              </p>
            </>
          ),
        },
        {
          heading: "Hébergement et infrastructure technique",
          body: (
            <>
              <p>
                L'infrastructure technique de la plateforme AlfyChat est répartie entre deux environnements
                d'hébergement complémentaires. L'ensemble des serveurs et datacenters utilisés est localisé
                au sein de l'Union européenne, conformément aux exigences du RGPD en matière de transferts
                de données.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">4.1 Hostinger International Ltd (hébergeur partenaire)</h3>
              <ul>
                <li><strong>Raison sociale :</strong> Hostinger International Ltd</li>
                <li><strong>Siège social :</strong> 61 Lordou Vironos Street, 6023 Larnaca, République de Chypre</li>
                <li><strong>Localisation des datacenters utilisés :</strong> Europe (Union européenne)</li>
                <li><strong>Site web :</strong> hostinger.com</li>
              </ul>
              <p>Services hébergés chez Hostinger :</p>
              <ul>
                <li>Serveur web front-end (alfychat.app) — rendu de l'application Next.js</li>
                <li>API Gateway centralisé (gateway.alfychat.app) — routage des requêtes vers les microservices</li>
                <li>Microservice Utilisateurs — gestion des comptes, authentification, profils</li>
                <li>Microservice Messages — stockage et transmission des messages (chiffrés au repos AES-256)</li>
                <li>Microservice Appels — signalisation WebRTC, serveurs TURN et STUN pour appels audio/vidéo</li>
                <li>CDN intégré (media.alfychat.app) — distribution mondiale des médias et fichiers</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">4.2 Serveurs propres AlfyCore (France)</h3>
              <ul>
                <li><strong>Opérateur :</strong> AlfyCore — Association loi 1901</li>
                <li><strong>Localisation :</strong> France (Union européenne)</li>
              </ul>
              <p>Services hébergés sur l'infrastructure propre d'AlfyCore :</p>
              <ul>
                <li>Microservice Amis — gestion des relations sociales (liste d'amis, invitations, blocages)</li>
                <li>Microservice Serveurs communautaires — gestion des serveurs, salons, rôles et membres</li>
                <li>Microservice Bots — enregistrement, gestion et webhooks des bots et intégrations</li>
                <li>Microservice Médias backend — traitement, transformation et stockage des fichiers et images</li>
                <li>Base de données MySQL principale — persistance structurée de l'ensemble des données</li>
                <li>Cache Redis — sessions utilisateur, présence en ligne, files de messages</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">4.3 Sécurité de l'infrastructure</h3>
              <p>
                L'ensemble de l'infrastructure AlfyChat est sécurisé par les mesures suivantes :
              </p>
              <ul>
                <li><strong>Chiffrement en transit :</strong> TLS 1.3 avec Perfect Forward Secrecy sur tous les points de terminaison exposés</li>
                <li><strong>Chiffrement au repos :</strong> AES-256-GCM pour les données persistées</li>
                <li><strong>Chiffrement E2EE :</strong> ECDH P-256 + AES-256-GCM pour les conversations privées</li>
                <li><strong>Accès administratif :</strong> authentification par clé SSH, MFA obligatoire, aucun accès distant non chiffré autorisé</li>
              </ul>
            </>
          ),
        },
        {
          heading: "Propriété intellectuelle",
          body: (
            <>
              <h3 className="text-[12px] font-semibold text-foreground">5.1 Marques et identité visuelle d'AlfyCore</h3>
              <p>
                Les dénominations « AlfyChat » et « AlfyCore », ainsi que les logos, typographies, chartes
                graphiques, icônes, mises en page et éléments visuels associés constituent l'identité
                visuelle propriétaire d'AlfyCore. Ces éléments font l'objet d'une protection au titre du
                droit des marques et du droit d'auteur applicables en France et dans l'Union européenne.
                Toute reproduction, imitation, utilisation partielle ou totale, adaptation ou modification
                de ces éléments sans autorisation préalable, expresse et écrite d'AlfyCore est strictement
                interdite et expose son auteur à des poursuites civiles et pénales.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">5.2 Code source open source et ses limites</h3>
              <p>
                Le code source de la plateforme AlfyChat est publié sous licence open source dans les
                dépôts officiels d'AlfyCore. Cette ouverture permet à quiconque d'auditer indépendamment
                la sécurité du code, de contribuer à son développement, ou de déployer sa propre instance
                du logiciel. Cette licence ne confère cependant aucun droit sur :
              </p>
              <ul>
                <li>La marque « AlfyChat » et « AlfyCore » et leurs déclinaisons</li>
                <li>Les noms de domaine alfychat.app et alfycore.pro et leurs sous-domaines</li>
                <li>L'infrastructure technique opérée par AlfyCore pour le service officiel</li>
                <li>Les données personnelles des utilisateurs inscrits sur l'instance officielle</li>
                <li>Les contenus éditoriaux, documentations et supports de communication d'AlfyCore</li>
              </ul>
              <p>
                Tout fork ou déploiement d'une instance dérivée du code source doit obligatoirement
                utiliser un nom, une identité visuelle et des noms de domaine distincts pour éviter
                toute confusion avec le service officiel opéré par AlfyCore.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">5.3 Droits des utilisateurs sur leurs contenus</h3>
              <p>
                Les utilisateurs conservent l'intégralité de leurs droits de propriété intellectuelle
                sur tous les contenus (textes, images, fichiers, créations) qu'ils publient sur AlfyChat.
                En publiant du contenu, l'utilisateur accorde à AlfyCore une licence technique strictement
                limitée, non exclusive, gratuite et non transférable, uniquement dans la mesure nécessaire
                à la transmission, au routage, au stockage temporaire et à l'affichage du contenu aux
                destinataires désignés par l'utilisateur. Cette licence prend fin dès la suppression du
                contenu par l'utilisateur.
              </p>
            </>
          ),
        },
        {
          heading: "Statut d'hébergeur, DSA et obligations de modération",
          body: (
            <>
              <p>
                AlfyCore agit en qualité d'hébergeur de contenu au sens de l'article 6 de la loi n°
                2004-575 du 21 juin 2004 (LCEN) et du Règlement (UE) 2022/2065 sur les services numériques
                (Digital Services Act — DSA) entré en application le 17 février 2024. Ce statut d'hébergeur
                implique les droits et obligations suivants :
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">6.1 Responsabilité limitée pour les contenus tiers</h3>
              <p>
                En tant qu'hébergeur, AlfyCore n'est pas responsable des contenus publiés par les utilisateurs
                à condition de ne pas avoir eu effectivement connaissance de leur caractère illicite ou
                d'avoir agi promptement pour les retirer dès obtention de cette connaissance (article 6 I 2
                de la LCEN et article 6.1 du DSA).
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">6.2 Mécanisme de signalement (notice and action)</h3>
              <p>
                AlfyCore met à disposition un mécanisme de signalement accessible via l'interface de
                l'application (bouton « Signaler ») et par e-mail (contact@alfycore.org). Tout signalement
                valide d'un contenu illicite est traité dans les meilleurs délais. Pour être valide, un
                signalement doit préciser la localisation du contenu, sa nature illicite présumée, et
                l'identité du signalant.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">6.3 Signalement aux autorités pour contenus graves</h3>
              <p>
                Conformément à ses obligations légales, AlfyCore signale sans délai aux autorités
                compétentes (notamment l'OFMIN pour les contenus pédopornographiques) tout contenu
                illicite grave dont il aurait connaissance, conformément à l'article 6 I 7 de la
                LCEN et aux dispositions du DSA relatives aux contenus à risque systémique.
              </p>
            </>
          ),
        },
        {
          heading: "Accessibilité numérique",
          body: (
            <>
              <p>
                AlfyCore s'engage à rendre la plateforme AlfyChat aussi accessible que possible,
                dans l'esprit du Référentiel Général d'Amélioration de l'Accessibilité (RGAA), norme
                française transposant la Directive (UE) 2016/2102 relative à l'accessibilité des sites
                internet des organismes du secteur public. Bien qu'AlfyCore soit une association de
                droit privé non soumise directement à l'obligation légale de conformité RGAA, nous
                considérons l'accessibilité numérique comme un impératif éthique.
              </p>
              <p>
                Des efforts continus sont réalisés pour améliorer l'accessibilité de l'interface
                AlfyChat, notamment en matière de contrastes visuels, de navigation au clavier,
                de compatibilité avec les lecteurs d'écran, et de structure sémantique des pages.
              </p>
              <p>
                Si vous rencontrez des difficultés d'accessibilité sur la plateforme qui empêchent
                ou limitent votre utilisation du service, vous pouvez le signaler à contact@alfycore.org
                avec l'objet « Accessibilité — [description de la difficulté] ». AlfyCore s'engage
                à étudier chaque signalement et à proposer une solution alternative ou une correction
                dans les meilleurs délais raisonnables.
              </p>
            </>
          ),
        },
        {
          heading: "Liens hypertextes vers des sites tiers",
          body: (
            <>
              <p>
                La plateforme AlfyChat peut contenir des liens hypertextes vers des sites web ou
                services tiers, générés notamment lors de la prévisualisation d'URL partagées dans
                des messages, ou dans le cadre d'intégrations de bots. Ces liens sont fournis à
                titre informatif ou fonctionnel uniquement.
              </p>
              <p>
                AlfyCore n'exerce aucun contrôle sur le contenu, la disponibilité, la qualité, la
                légalité ou les pratiques en matière de données personnelles des sites web tiers
                vers lesquels ces liens renvoient. La présence d'un lien vers un site tiers ne
                constitue pas un partenariat, un accord commercial, une recommandation, une
                approbation ou une garantie de la part d'AlfyCore à l'égard de ce site, de son
                contenu, de ses services ou de son exploitant.
              </p>
              <p>
                AlfyCore ne peut en aucun cas être tenu responsable des préjudices directs ou
                indirects résultant de votre consultation de sites tiers accessibles via des liens
                présents sur AlfyChat. Nous vous invitons à consulter les conditions d'utilisation
                et les politiques de confidentialité de chaque site tiers que vous visitez.
              </p>
            </>
          ),
        },
        {
          heading: "Droit applicable et compétence juridictionnelle",
          body: (
            <>
              <p>
                Les présentes mentions légales et l'utilisation du service AlfyChat sont régies
                par le droit français. En cas de litige relatif à l'interprétation, à l'exécution
                ou à la validité des présentes mentions légales, et sous réserve des dispositions
                impératives de protection des consommateurs applicables selon le pays de résidence
                de l'utilisateur, les juridictions françaises territorialement compétentes seront
                seules habilitées à en connaître.
              </p>
              <p>
                Pour les utilisateurs résidant dans un État membre de l'Union européenne, les
                règles de compétence juridictionnelle prévues par le Règlement (UE) n° 1215/2012
                (dit « Bruxelles I bis ») s'appliquent. En matière de protection des consommateurs,
                les dispositions impératives du droit du pays de résidence habituelle du consommateur
                demeurent applicables, conformément à l'article 6 du Règlement (CE) n° 593/2008
                (dit « Rome I »).
              </p>
              <p>
                Il est précisé que la langue française fait foi dans l'interprétation des présentes
                mentions légales. Des traductions dans d'autres langues peuvent être proposées à
                titre informatif uniquement.
              </p>
            </>
          ),
        },
        {
          heading: "Médiation et règlement extrajudiciaire des litiges",
          body: (
            <>
              <p>
                En cas de litige non résolu à la suite d'une réclamation adressée directement à
                AlfyCore, et conformément aux dispositions des articles L.611-1 et suivants du Code
                de la consommation transposant la Directive 2013/11/UE relative au règlement
                extrajudiciaire des litiges de consommation (directive RELC), les utilisateurs ayant
                la qualité de consommateur peuvent avoir recours à un médiateur.
              </p>
              <p>
                Il est toutefois rappelé qu'AlfyCore est une association à but non lucratif proposant
                un service entièrement gratuit, sans relation commerciale au sens strict. Les
                dispositions relatives à la médiation de la consommation peuvent ne pas être
                directement applicables à ce contexte. Néanmoins, AlfyCore est toujours ouvert
                au dialogue amiable pour résoudre tout différend éventuel de manière équitable
                et dans l'intérêt de ses utilisateurs.
              </p>
              <p>
                La plateforme européenne de règlement en ligne des litiges (RLL), mise en place
                par la Commission européenne en application du Règlement (UE) n° 524/2013, est
                accessible à l'adresse <strong>ec.europa.eu/consumers/odr</strong>. Elle permet
                aux consommateurs de l'UE de soumettre leurs réclamations concernant des achats
                en ligne et des services numériques lors de litiges transfrontaliers au sein
                de l'Union européenne.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}


