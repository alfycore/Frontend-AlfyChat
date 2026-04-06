import { LockIcon } from '@/components/icons';
import { LegalPage } from '../legal-page';

export default function CookiesPage() {
  return (
    <LegalPage
      icon={LockIcon}
      title="Politique des cookies"
      subtitle="Utilisation des cookies et technologies de stockage local par la plateforme AlfyChat"
      updatedAt="14 mars 2026"
      sections={[
        {
          heading: "Définition et fonctionnement des cookies",
          body: (
            <>
              <p>
                Un cookie (ou « témoin de connexion ») est un petit fichier texte déposé par un serveur
                web sur votre terminal (ordinateur, smartphone, tablette) lorsque vous visitez un site
                web ou utilisez une application. Il est ensuite renvoyé automatiquement au serveur lors
                de chaque visite ou requête ultérieure, permettant au service de mémoriser des informations
                entre deux sessions et d'assurer certaines fonctions techniques essentielles.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">1.1 Catégories de cookies selon leur durée de vie</h3>
              <ul>
                <li>
                  <strong>Cookies de session :</strong> temporaires, ils sont automatiquement supprimés
                  à la fermeture de votre navigateur ou à l'expiration de la session authentifiée.
                  Ils ne persistent pas entre deux visites.
                </li>
                <li>
                  <strong>Cookies persistants :</strong> ils demeurent sur votre terminal jusqu'à leur
                  date d'expiration définie ou jusqu'à ce que vous les supprimiez manuellement via les
                  paramètres de votre navigateur.
                </li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">1.2 Catégories de cookies selon leur origine</h3>
              <ul>
                <li>
                  <strong>Cookies first-party (propriétaires) :</strong> déposés directement par le
                  service que vous utilisez (ici, alfychat.app). Ce sont les seuls cookies utilisés
                  par AlfyChat.
                </li>
                <li>
                  <strong>Cookies third-party (tiers) :</strong> déposés par des services externes
                  intégrés dans une page (réseaux publicitaires, traceurs analytiques, réseaux sociaux).
                  AlfyChat n'utilise aucun cookie tiers directement.
                </li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">1.3 Technologies complémentaires au stockage côté client</h3>
              <p>
                Les applications web modernes disposent de plusieurs mécanismes de stockage côté client
                au-delà des cookies HTTP traditionnels :
              </p>
              <ul>
                <li><strong>localStorage :</strong> espace de stockage persistant dans le navigateur, non transmis automatiquement au serveur contrairement aux cookies HTTP. Les données persistent jusqu'à effacement manuel.</li>
                <li><strong>sessionStorage :</strong> espace de stockage limité à la durée de vie de l'onglet du navigateur. Effacé automatiquement à la fermeture de l'onglet.</li>
                <li><strong>IndexedDB :</strong> base de données côté navigateur pour des données plus volumineuses ou structurées. Non utilisée par AlfyChat dans sa version actuelle.</li>
              </ul>
            </>
          ),
        },
        {
          heading: "Philosophie privacy-first d'AlfyCore",
          body: (
            <>
              <p>
                AlfyCore a adopté dès la conception d'AlfyChat une approche volontairement restrictive,
                transparente et éthique vis-à-vis des cookies et des technologies de stockage local.
                Cette approche repose sur deux principes fondamentaux indissociables de la mission
                de l'association :
              </p>
              <ul>
                <li>
                  <strong>Minimisation technique :</strong> nous ne déposons que les cookies et données
                  de stockage local strictement indispensables au fonctionnement opérationnel du service.
                  Aucun cookie « de confort » ou « d'optimisation » n'est ajouté sans nécessité technique
                  démontrée et documentée.
                </li>
                <li>
                  <strong>Zéro suivi commercial :</strong> AlfyCore ne fait aucune publicité ciblée,
                  ne profile pas ses utilisateurs et ne vend aucune donnée. Il n'existe donc aucune
                  justification économique, technique ou légale à l'utilisation de cookies de suivi,
                  de ciblage publicitaire ou de retargeting sur la plateforme AlfyChat.
                </li>
              </ul>
              <p>
                En pratique, AlfyChat ne dépose aucun cookie appartenant aux catégories suivantes :
                cookies publicitaires, cookies de retargeting, cookies de réseaux sociaux (Facebook
                Pixel, Twitter/X tracking tag, LinkedIn Insight, etc.), cookies d'analytics tiers
                (Google Analytics, Matomo, Mixpanel, Amplitude, Segment, Hotjar, FullStory, etc.),
                cookies de heatmapping ou de session recording, ni aucun traceur tiers à des fins
                de profilage comportemental ou démographique.
              </p>
              <p>
                Cette absence totale de cookies de suivi n'est pas une promesse marketing : c'est une
                réalité architecturale. L'infrastructure d'AlfyChat ne contient aucun SDK ni aucun
                script provenant de services publicitaires ou analytiques tiers.
              </p>
            </>
          ),
        },
        {
          heading: "Cookies techniques essentiels au fonctionnement",
          body: (
            <>
              <p>
                AlfyChat utilise uniquement les cookies techniques suivants, strictement nécessaires
                au bon fonctionnement du service. Ces cookies relèvent de l'exemption de consentement
                prévue par l'article 5.3 de la Directive 2002/58/CE (Directive ePrivacy) et confirmée
                par les délibérations de la CNIL sur les cookies, car ils sont indispensables à la
                prestation du service expressément demandée par l'utilisateur.
              </p>
              <ul>
                <li>
                  <strong>session_token</strong><br />
                  <em>Type :</em> Cookie HTTP — Secure, HttpOnly, SameSite=Strict<br />
                  <em>Durée :</em> Session ou 7 jours d'inactivité maximum<br />
                  <em>Finalité :</em> Maintient votre session authentifiée entre les requêtes successives.
                  Contient un jeton opaque cryptographiquement sécurisé (token aléatoire de 256 bits),
                  signé et vérifié côté serveur à chaque requête. Sans ce cookie, vous seriez déconnecté
                  à chaque changement de page ou requête. Ce cookie ne contient aucune information
                  personnelle identifiable en clair.<br />
                  <em>Partage tiers :</em> Aucun
                </li>
                <li>
                  <strong>csrf_token</strong><br />
                  <em>Type :</em> Cookie HTTP — Secure, SameSite=Strict<br />
                  <em>Durée :</em> Durée de la session<br />
                  <em>Finalité :</em> Protection contre les attaques Cross-Site Request Forgery (CSRF).
                  Ce token est généré aléatoirement à chaque session et vérifié à chaque opération
                  sensible (modification de profil, envoi de messages, changement de paramètres) pour
                  garantir que la requête provient de votre navigateur et non d'un site malveillant.<br />
                  <em>Partage tiers :</em> Aucun
                </li>
                <li>
                  <strong>theme_pref</strong><br />
                  <em>Type :</em> Cookie HTTP ou localStorage selon le contexte<br />
                  <em>Durée :</em> 13 mois (conformément aux recommandations CNIL)<br />
                  <em>Finalité :</em> Mémorise votre préférence de thème visuel (mode clair ou mode
                  sombre) pour l'appliquer instantanément dès le chargement de la page, évitant
                  tout flash visuel indésirable. Sans ce cookie, AlfyChat appliquerait son thème
                  par défaut à chaque visite.<br />
                  <em>Partage tiers :</em> Aucun
                </li>
                <li>
                  <strong>lang</strong><br />
                  <em>Type :</em> Cookie HTTP ou localStorage selon le contexte<br />
                  <em>Durée :</em> 13 mois<br />
                  <em>Finalité :</em> Mémorise votre préférence de langue d'interface pour afficher
                  AlfyChat dans la langue que vous avez sélectionnée, indépendamment de la langue
                  configurée dans les paramètres de votre navigateur. Sans ce cookie, la langue par
                  défaut serait appliquée à chaque chargement.<br />
                  <em>Partage tiers :</em> Aucun
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "Absence totale de cookies publicitaires et de tracking",
          body: (
            <>
              <p>
                AlfyCore prend l'engagement formel, public et sans réserve de n'utiliser aucun des
                types de cookies, traceurs ou technologies de suivi suivants sur la plateforme AlfyChat,
                aujourd'hui et pour toute version future du service :
              </p>
              <ul>
                <li><strong>Cookies publicitaires (advertising cookies) :</strong> aucun ciblage publicitaire, aucun réseau RTB (Real Time Bidding), aucun achat programmatique d'espace publicitaire</li>
                <li><strong>Cookies de retargeting :</strong> aucune technique de reciblage publicitaire des utilisateurs ayant visité AlfyChat</li>
                <li><strong>Pixels de suivi :</strong> aucun pixel Facebook/Meta, Google Ads, Twitter/X, LinkedIn ou de tout autre réseau publicitaire ou social</li>
                <li><strong>Cookies d'analytics tiers :</strong> aucun Google Analytics (Universal Analytics ou GA4), Adobe Analytics, Matomo hébergé chez tiers, Mixpanel, Amplitude, Segment ou équivalent</li>
                <li><strong>Cookies de session recording :</strong> aucun Hotjar, FullStory, LogRocket, Microsoft Clarity ou équivalent enregistrant les interactions des utilisateurs</li>
                <li><strong>Identifiants publicitaires mobiles :</strong> aucun IDFA (Apple), GAID (Google/Android) ni aucun identifiant similaire collecté sur les applications mobiles</li>
                <li><strong>Fingerprinting :</strong> aucune technique de fingerprinting du navigateur (canvas fingerprinting, AudioContext fingerprinting, WebGL fingerprinting, etc.) ni de l'appareil</li>
                <li><strong>Tracking cross-site :</strong> aucune technique permettant de suivre votre navigation sur d'autres sites web en dehors d'AlfyChat</li>
              </ul>
              <p>
                Cette politique de zéro cookie publicitaire ou de suivi résulte directement et
                structurellement du modèle associatif à but non lucratif d'AlfyCore. Sans publicité
                à diffuser et sans données à valoriser commercialement, l'utilisation de tels
                cookies serait non seulement inutile, mais contraire à la mission fondatrice
                de l'association.
              </p>
            </>
          ),
        },
        {
          heading: "Stockage local : localStorage et sessionStorage",
          body: (
            <>
              <p>
                En complément des cookies HTTP, AlfyChat utilise les API de stockage local HTML5
                du navigateur pour mémoriser certaines données de fonctionnement d'interface.
                Contrairement aux cookies HTTP, ces données ne sont jamais transmises automatiquement
                à nos serveurs — elles restent sur votre appareil uniquement. Elles n'ont donc aucun
                impact sur votre vie privée au sens du suivi côté serveur.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">5.1 Données stockées en localStorage (persistant)</h3>
              <ul>
                <li>
                  <strong>density_pref :</strong> votre préférence d'affichage (compact, normal, spacieux)
                  pour la liste des messages et des serveurs. Conservé jusqu'à effacement manuel.
                </li>
                <li>
                  <strong>sidebar_state :</strong> état d'ouverture, de fermeture et largeur préférée
                  de la barre latérale (liste des serveurs, des amis). Conservé jusqu'à effacement manuel.
                </li>
                <li>
                  <strong>notif_dismissed :</strong> liste des identifiants de bannières d'information
                  système (mises à jour, annonces) que vous avez déjà lues et fermées, pour éviter
                  qu'elles ne réapparaissent à chaque connexion.
                </li>
                <li>
                  <strong>e2ee_public_keys_cache :</strong> cache local des clés publiques de vos
                  contacts pour le chiffrement E2EE. Ces clés publiques ne sont pas confidentielles
                  par nature (elles sont destinées à être partagées) mais sont mises en cache localement
                  pour accélérer le chiffrement des messages sans interroger le serveur à chaque message.
                  Ce cache est invalidé et régénéré automatiquement lors des mises à jour de clés.
                </li>
                <li>
                  <strong>draft_[identifiant_salon] :</strong> brouillon de message en cours de
                  rédaction pour chaque salon, pour préserver votre texte en cas de navigation
                  entre deux salons sans envoyer le message. Supprimé automatiquement lors de
                  l'envoi ou de l'effacement manuel.
                </li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">5.2 Données stockées en sessionStorage (durée de l'onglet uniquement)</h3>
              <ul>
                <li>
                  <strong>nav_state :</strong> état de navigation interne (dernier salon visité,
                  onglet actif, position de défilement) pour maintenir le contexte en cas de
                  rechargement accidentel de la page. Effacé automatiquement à la fermeture
                  de l'onglet du navigateur.
                </li>
                <li>
                  <strong>upload_progress :</strong> données de progression des téléchargements
                  de fichiers en cours, pour afficher la barre de progression correctement.
                  Effacé à la fermeture de l'onglet.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "Durées de conservation détaillées",
          body: (
            <>
              <p>
                Le tableau ci-dessous récapitule les durées de conservation de l'ensemble des
                cookies et données de stockage local utilisés par AlfyChat :
              </p>
              <ul>
                <li>
                  <strong>session_token :</strong> expire automatiquement à la déconnexion explicite
                  ou après 7 jours consécutifs d'inactivité (aucune requête authentifiée). Un token
                  de session ne peut pas être utilisé indéfiniment — il est régénéré à chaque
                  connexion pour des raisons de sécurité.
                </li>
                <li>
                  <strong>csrf_token :</strong> supprimé à la fermeture du navigateur ou à la
                  déconnexion. Jamais persistant au-delà de la session.
                </li>
                <li>
                  <strong>theme_pref et lang :</strong> conservés au maximum 13 mois à compter
                  du dernier accès au service, conformément aux recommandations de la délibération
                  de la CNIL du 17 septembre 2020. Cette durée est réinitialisée à chaque visite.
                </li>
                <li>
                  <strong>localStorage (density_pref, sidebar_state, notif_dismissed, e2ee_public_keys_cache, drafts) :</strong>
                  conservés indéfiniment jusqu'à effacement manuel via les paramètres de votre
                  navigateur ou la fonctionnalité « Effacer les données du site ». Ces données
                  ne quittent pas votre appareil et ne sont pas sensibles.
                </li>
                <li>
                  <strong>sessionStorage (nav_state, upload_progress) :</strong> effacés
                  automatiquement et systématiquement à la fermeture de l'onglet ou du navigateur.
                  Non persistants entre deux sessions.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "Gestion, contrôle et suppression de vos cookies",
          body: (
            <>
              <h3 className="text-[12px] font-semibold text-foreground">7.1 Paramètres de votre navigateur</h3>
              <p>
                Vous disposez d'un contrôle total sur les cookies et données de stockage local via
                les paramètres de votre navigateur. Voici comment accéder à ces réglages dans les
                principaux navigateurs :
              </p>
              <ul>
                <li><strong>Google Chrome :</strong> Menu (⋮) → Paramètres → Confidentialité et sécurité → Cookies et autres données des sites → Voir toutes les données et autorisations des sites</li>
                <li><strong>Mozilla Firefox :</strong> Menu (☰) → Paramètres → Vie privée et sécurité → section « Cookies et données des sites » → Gérer les données</li>
                <li><strong>Apple Safari :</strong> Préférences (⌘+,) → Confidentialité → Gérer les données des sites web</li>
                <li><strong>Microsoft Edge :</strong> Menu (...) → Paramètres → Cookies et autorisations de site → Cookies et données stockées → Voir toutes les données et autorisations des sites</li>
                <li><strong>Opera :</strong> Menu → Paramètres → Avancé → Confidentialité et sécurité → Paramètres du site → Cookies et données des sites</li>
              </ul>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">7.2 Effacement ciblé des données AlfyChat</h3>
              <p>
                Pour supprimer uniquement les données stockées par AlfyChat sans affecter les cookies
                d'autres sites, accédez aux paramètres de votre navigateur et recherchez la gestion
                par site. Filtrez par « alfychat.app » pour voir et effacer toutes les données
                associées (cookies, localStorage, sessionStorage) de manière ciblée.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">7.3 Conséquences du blocage des cookies techniques</h3>
              <p>
                Si vous choisissez de bloquer ou supprimer certains cookies techniques d'AlfyChat,
                voici les impacts fonctionnels prévisibles :
              </p>
              <ul>
                <li><strong>Blocage ou suppression de session_token :</strong> vous ne pourrez pas rester connecté. Chaque page chargée nécessitera une nouvelle authentification. Le service sera inutilisable en mode connecté.</li>
                <li><strong>Blocage ou suppression de csrf_token :</strong> les opérations sensibles (envoi de messages, modifications de compte, gestion des serveurs) seront bloquées par les mécanismes de sécurité anti-CSRF du service.</li>
                <li><strong>Suppression de theme_pref et lang :</strong> votre thème visuel et votre langue reviendront aux valeurs par défaut du service à chaque visite. Aucun impact sur les fonctionnalités core.</li>
                <li><strong>Effacement du localStorage :</strong> vos brouillons de messages non envoyés seront perdus, vos préférences d'affichage seront réinitialisées et le cache des clés publiques E2EE sera régénéré (provoquant un délai lors des premiers messages E2EE).</li>
              </ul>
            </>
          ),
        },
        {
          heading: "Cookies tiers potentiels issus d'interactions",
          body: (
            <>
              <p>
                Bien qu'AlfyCore ne dépose directement aucun cookie tiers sur la plateforme AlfyChat,
                certaines interactions spécifiques avec des contenus ou services externes pourraient
                théoriquement introduire des cookies tiers dans votre navigateur. Voici les cas
                identifiés et les mesures prises :
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">8.1 Prévisualisation d'URL (embeds)</h3>
              <p>
                Lorsqu'un utilisateur partage un lien dans une conversation, AlfyChat peut générer
                une prévisualisation (titre, description, image de vignette). Ce traitement est
                réalisé côté serveur par AlfyCore : c'est notre serveur qui interroge l'URL externe,
                et non votre navigateur directement. Les images et ressources d'aperçu sont servies
                via notre CDN après récupération, évitant de charger des ressources tierces
                directement dans votre navigateur et prévenant ainsi tout dépôt de cookies tiers.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">8.2 Bots et intégrations tierces</h3>
              <p>
                Si un administrateur de serveur communautaire a activé un bot tiers qui envoie des
                messages contenant des liens ou des boutons pointant vers des services externes,
                cliquer sur ces éléments vous amènera sur des sites tiers qui appliquent leurs
                propres politiques de cookies. AlfyCore n'est pas responsable des pratiques de
                ces services tiers. Consultez leurs politiques de confidentialité respectives
                avant d'interagir avec des contenus issus de bots.
              </p>
              <h3 className="mt-3 text-[12px] font-semibold text-foreground">8.3 Recommandation pour une protection maximale</h3>
              <p>
                Pour une protection optimale contre les cookies tiers non désirés lors de votre
                navigation sur Internet en général, nous recommandons l'utilisation d'un bloqueur
                de contenu réputé tel que uBlock Origin (extension open source), ou l'utilisation
                d'un navigateur axé sur la confidentialité. Ces outils n'affecteront pas le
                fonctionnement des cookies essentiels propres à AlfyChat décrits dans la présente politique.
              </p>
            </>
          ),
        },
        {
          heading: "Base légale et conformité réglementaire",
          body: (
            <>
              <p>
                La présente politique de cookies est établie en conformité avec l'ensemble des
                textes réglementaires applicables :
              </p>
              <ul>
                <li>
                  <strong>Directive 2002/58/CE (ePrivacy) :</strong> transposée en droit français
                  à l'article L.32-3-1 du Code des postes et des communications électroniques (CPCE),
                  elle régit l'utilisation des cookies et traceurs sur les services de communications
                  électroniques. Elle prévoit l'exemption de consentement pour les cookies
                  « strictement nécessaires ».
                </li>
                <li>
                  <strong>RGPD — Règlement (UE) 2016/679 :</strong> applicable dans ses dispositions
                  générales sur le traitement des données personnelles, notamment les principes de
                  minimisation et de transparence.
                </li>
                <li>
                  <strong>Lignes directrices de la CNIL sur les cookies et traceurs :</strong>
                  délibérations n° 2020-091 du 17 septembre 2020 et n° 2023-095 du 5 octobre 2023,
                  définissant les critères d'exemption de consentement et les durées maximales de
                  conservation des cookies.
                </li>
              </ul>
              <p>
                Conformément à ces textes, les cookies strictement nécessaires au fonctionnement
                technique d'un service sont exemptés du recueil préalable du consentement. AlfyChat
                n'utilisant exclusivement que de tels cookies essentiels, aucune bannière de
                consentement aux cookies (communément appelée « bandeau cookies ») n'est légalement
                requise. Cette absence n'est pas une omission ou un manquement : elle est la
                conséquence directe d'une conception privacy-first qui ne dépose aucun cookie
                nécessitant un consentement.
              </p>
            </>
          ),
        },
        {
          heading: "Modifications de la politique de cookies",
          body: (
            <>
              <p>
                AlfyCore se réserve le droit de modifier la présente politique de cookies à tout
                moment, notamment pour :
              </p>
              <ul>
                <li>Refléter l'introduction de nouvelles fonctionnalités techniques dans AlfyChat nécessitant de nouveaux cookies ou données de stockage local</li>
                <li>Intégrer les évolutions de la réglementation applicable (refonte de la Directive ePrivacy, nouvelles délibérations CNIL)</li>
                <li>Corriger des inexactitudes ou améliorer la clarté des descriptions</li>
                <li>Refléter des changements dans nos prestataires d'infrastructure</li>
              </ul>
              <p>
                En cas d'introduction de nouveaux cookies ou technologies de stockage local, la
                présente page sera mise à jour préalablement à leur déploiement. Si les modifications
                portent sur des cookies nécessitant un consentement (ajout hypothétique de cookies
                non essentiels), vous en serez informé et le recueil de votre consentement sera
                effectué conformément à la réglementation applicable.
              </p>
              <p>
                La date de dernière mise à jour de la présente politique est indiquée en haut de
                cette page. Pour toute question relative à l'utilisation des cookies et des
                technologies de stockage par AlfyChat, vous pouvez contacter AlfyCore à
                l'adresse <strong>contact@alfycore.org</strong>.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}


