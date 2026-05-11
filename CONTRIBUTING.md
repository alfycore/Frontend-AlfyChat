# Contribuer à AlfyChat — Frontend

Merci de l'intérêt que vous portez à ce projet ! Voici les règles à suivre pour garantir une base de code propre et cohérente.
# AlfyChat — Liste des fonctionnalités à tester en profondeur

> **Légende** : `[ ]` à tester · `[x]` validé · `[!]` bug trouvé · `[~]` partiel

---

## 1. Authentification & Gestion de compte

### Inscription
- [ ] Inscription avec email valide
- [ ] Inscription avec email déjà utilisé → message d'erreur clair
- [ ] Inscription avec email invalide → validation côté client et serveur
- [ ] Mot de passe trop court (< 8 caractères) → refus
- [ ] Mot de passe fort accepté
- [ ] CAPTCHA Cloudflare Turnstile → présent et fonctionnel
- [ ] Email de vérification envoyé après inscription
- [ ] Lien de vérification email → activation du compte
- [ ] Lien de vérification expiré → message d'erreur approprié
- [ ] Double inscription avec même username → refus

### Connexion
- [ ] Connexion avec identifiants valides
- [ ] Connexion avec mauvais mot de passe → message d'erreur sans révéler si l'email existe
- [ ] Connexion avec compte non vérifié → message d'erreur clair
- [ ] Connexion avec compte banni → message d'erreur clair
- [ ] Bruteforce → rate limiting activé après X tentatives
- [ ] Session JWT valide → accès aux ressources protégées
- [ ] Session JWT expirée → redirection vers login

### Authentification à deux facteurs (2FA)
- [ ] Activation du 2FA (QR code + code TOTP)
- [ ] Connexion avec 2FA activé → demande du code
- [ ] Code TOTP valide → accès accordé
- [ ] Code TOTP invalide → refus
- [ ] Code TOTP expiré → refus
- [ ] Désactivation du 2FA
- [ ] Codes de récupération générés et fonctionnels

### Réinitialisation de mot de passe
- [ ] Demande de reset → email envoyé
- [ ] Lien de reset valide → changement de mot de passe
- [ ] Lien de reset expiré → refus
- [ ] Nouveau mot de passe trop court → refus
- [ ] Ancien mot de passe plus valide après reset

### Déconnexion
- [ ] Déconnexion manuelle → session invalidée
- [ ] Token JWT supprimé côté client

---

## 2. Profil utilisateur

- [ ] Changement du nom d'affichage
- [ ] Changement de l'avatar → upload image valide (JPEG, PNG, GIF, WebP)
- [ ] Upload avatar trop lourd → refus avec message d'erreur
- [ ] Upload avatar format non supporté → refus
- [ ] Changement de la bannière de profil
- [ ] Ajout / modification de la bio
- [ ] Changement du statut (en ligne, absent, ne pas déranger, invisible, hors ligne)
- [ ] Message de statut personnalisé → visible par les autres
- [ ] Vérification du nom d'utilisateur disponible en temps réel
- [ ] Suppression du compte (RGPD) → confirmation + suppression effective

---

## 3. Messagerie directe (DM)

### Conversations
- [ ] Ouvrir une nouvelle conversation DM avec un utilisateur
- [ ] Envoyer un message texte → reçu en temps réel
- [ ] Historique des messages chargé au défilement (pagination)
- [ ] Marquage de messages non lus → compteur visible
- [ ] Compteur de non-lus remis à zéro à l'ouverture de la conversation
- [ ] Indicateur de frappe → visible quand l'autre tape
- [ ] Indicateur "lu" / accusé de réception

### Messages vocaux
- [ ] Enregistrement d'un message vocal (format OGG)
- [ ] Envoi du message vocal → reçu et lisible
- [ ] Durée affichée correctement

### Chiffrement de bout en bout (E2EE — Signal Protocol)
- [ ] Messages chiffrés en transit (vérification via outils réseau)
- [ ] Déchiffrement correct côté destinataire
- [ ] Clés publiques échangées correctement au premier message
- [ ] Session chiffrée rétablie après reconnexion

### Conversations de groupe
- [ ] Créer un groupe de conversation
- [ ] Ajouter des membres au groupe
- [ ] Envoyer un message dans un groupe → reçu par tous
- [ ] Retirer un membre du groupe
- [ ] Quitter un groupe

---

## 4. Amis & Relations sociales

- [ ] Envoyer une demande d'ami
- [ ] Recevoir une notification de demande d'ami
- [ ] Accepter une demande → ami ajouté des deux côtés
- [ ] Refuser une demande → aucun ami ajouté
- [ ] Supprimer un ami
- [ ] Liste d'amis correctement affichée
- [ ] Demandes en attente visibles
- [ ] Bloquer un utilisateur → plus de messages possibles
- [ ] Débloquer un utilisateur
- [ ] Utilisateur bloqué ne peut pas envoyer de demande d'ami

---

## 5. Appels voix & vidéo

### Appels vocaux
- [ ] Initier un appel vocal vers un ami
- [ ] Recevoir et accepter un appel vocal
- [ ] Refuser un appel
- [ ] Qualité audio satisfaisante
- [ ] Mettre le micro en sourdine (mute) et le réactiver
- [ ] Se désactiver (deafen) et se réactiver
- [ ] Raccrocher un appel

### Appels vidéo
- [ ] Initier un appel vidéo
- [ ] Activer / désactiver la caméra pendant l'appel
- [ ] Flux vidéo affiché correctement
- [ ] Appel vidéo à plusieurs participants

### Signalisation WebRTC / LiveKit
- [ ] Connexion WebRTC établie sans erreur
- [ ] Reconnexion automatique si perte de réseau
- [ ] Historique des appels enregistré

---

## 6. Serveurs (canaux communautaires)

### Gestion du serveur
- [ ] Créer un serveur (nom, icône)
- [ ] Modifier les informations du serveur
- [ ] Supprimer un serveur
- [ ] Générer un lien d'invitation
- [ ] Rejoindre un serveur via lien d'invitation
- [ ] Lien d'invitation expiré ou invalide → refus

### Canaux
- [ ] Créer un canal texte
- [ ] Créer un canal vocal
- [ ] Créer une catégorie de canaux
- [ ] Réorganiser les canaux (drag & drop)
- [ ] Renommer / supprimer un canal
- [ ] Envoyer un message dans un canal texte → reçu en temps réel
- [ ] Rejoindre un canal vocal → audio fonctionnel

### Rôles & permissions
- [ ] Créer un rôle personnalisé
- [ ] Assigner un rôle à un membre
- [ ] Retirer un rôle à un membre
- [ ] Définir des permissions par rôle (lire, écrire, administrer…)
- [ ] Overrides de permissions au niveau d'un canal spécifique
- [ ] Membre sans permission → accès refusé correctement
- [ ] Administrateur → accès complet

### Modération
- [ ] Expulser (kick) un membre
- [ ] Bannir un membre
- [ ] Débannir un membre
- [ ] Voir la liste des membres bannis

---

## 7. Bots

- [ ] Créer un bot (nom, description, tags)
- [ ] Régénérer le token du bot
- [ ] Changer le statut du bot (en ligne, hors ligne, maintenance)
- [ ] Bot visible dans le répertoire public
- [ ] Ajouter un bot à un serveur
- [ ] Retirer un bot d'un serveur
- [ ] Bot répond aux commandes avec son préfixe configuré

---

## 8. Médias & Uploads

- [ ] Upload d'image dans un message (JPEG, PNG, GIF, WebP)
- [ ] Image affichée dans la conversation
- [ ] Upload d'un fichier non supporté → refus clair
- [ ] Upload dépassant la taille limite → refus avec message d'erreur
- [ ] Validation magic bytes (pas de fichier malveillant déguisé en image)
- [ ] Avatar optimisé (compression Sharp)
- [ ] Bannière optimisée

---

## 9. Notifications

- [ ] Notification en temps réel à la réception d'un message DM
- [ ] Notification de demande d'ami
- [ ] Notification d'appel entrant
- [ ] Compteur de non-lus mis à jour en temps réel
- [ ] Notification browser (si permission accordée)
- [ ] Silence des notifications (DND)

---

## 10. Interface & UX

### Navigation
- [ ] Navigation entre DMs, amis, serveurs sans rechargement complet
- [ ] Panneau latéral redimensionnable (drag)
- [ ] Mode mobile responsive (< 768px)
- [ ] Navigation mobile (onglets bas)
- [ ] Commande palette (Cmd+K / Ctrl+K) fonctionnelle

### Thèmes
- [ ] Thème sombre activé par défaut ou selon préférence système
- [ ] Thème clair disponible et lisible
- [ ] Changement de fond d'écran (background customization)

### Accessibilité
- [ ] Navigation clavier dans les menus principaux
- [ ] Tooltips présents sur les icônes sans label
- [ ] Messages d'erreur clairs et visibles

---

## 11. Administration

- [ ] Accès au dashboard admin réservé aux admins
- [ ] Statistiques d'utilisateurs affichées correctement
- [ ] Gestion des badges : créer, modifier, supprimer
- [ ] Assigner un badge à un utilisateur
- [ ] Bannir une IP
- [ ] Lever un ban IP
- [ ] Voir et gérer les tickets de support
- [ ] Publier un changelog
- [ ] Monitoring de santé des services (uptime)
- [ ] Statistiques de rate limiting

---

## 12. Sécurité

- [ ] Headers HTTP sécurisés présents (Helmet) → vérifier via curl ou DevTools
- [ ] CORS configuré correctement → requêtes cross-origin non autorisées refusées
- [ ] Rate limiting global → requêtes en rafale bloquées
- [ ] Rate limiting auth → bruteforce bloqué
- [ ] Tokens JWT non exposés dans les URLs
- [ ] Pas d'injection SQL possible (tester avec inputs malveillants)
- [ ] Pas de XSS possible dans les messages (DOMPurify actif)
- [ ] Upload de fichier → magic bytes validés (pas de script déguisé)
- [ ] Communication inter-services → secret interne requis

---

## 13. Performance & Stabilité

- [ ] Chargement initial de l'app < 3s (réseau normal)
- [ ] Reconnexion WebSocket automatique après perte réseau
- [ ] Cache Redis actif pour les messages (TTL 4s)
- [ ] Pagination infinie des messages sans blocage UI
- [ ] Pas de fuite mémoire après navigation prolongée (DevTools Memory)
- [ ] Aucune requête inutile en boucle (vérifier via Network tab)

---

## 14. Clients (Multi-plateforme)

### Web (Next.js)
- [ ] Fonctionne sur Chrome, Firefox, Edge, Safari
- [ ] PWA installable (si configurée)

### Desktop (Electron)
- [ ] Installation sur Windows (NSIS installer)
- [ ] Installation sur macOS (DMG)
- [ ] Installation sur Linux (AppImage / DEB)
- [ ] Auto-update fonctionnel
- [ ] Données locales persistées (Electron Store)

### Mobile (Expo / React Native)
- [ ] Build iOS fonctionnel
- [ ] Build Android fonctionnel
- [ ] Barre de statut et splash screen corrects
- [ ] Notifications push reçues

---

## 15. Pages statiques & informatives

- [ ] Landing page s'affiche sans erreur
- [ ] Page changelog accessible et à jour
- [ ] Pages légales (CGU, Politique de confidentialité) disponibles
- [ ] Page de statut des services accessible
- [ ] Page FAQ complète
- [ ] Page développeurs / documentation accessible
- [ ] Page invitations (liens serveurs) fonctionne correctement

---

## Notes de test

| Environnement | URL / Port | Statut |
|---|---|---|
| Gateway | `localhost:3000` | |
| Users service | `localhost:3001` | |
| Messages service | `localhost:3002` | |
| Friends service | `localhost:3003` | |
| Calls service | `localhost:3004` | |
| Servers service | `localhost:3005` | |
| Bots service | `localhost:3006` | |
| Media service | `localhost:3007` | |
| Frontend web | `localhost:3000` (ou autre) | |

---

*Dernière mise à jour : 2026-05-11*

## Prérequis

- [Bun](https://bun.sh/) ≥ 1.2
- Node.js ≥ 20 (optionnel, Bun suffit)
- Connaissances en TypeScript / React / Next.js

## Mise en place de l'environnement

```bash
git clone https://github.com/alfycore/WEB-frontend-AlfyChat.git
cd WEB-frontend-AlfyChat
bun install
cp .env.example .env.local
# Configurer NEXT_PUBLIC_GATEWAY_URL et NEXT_PUBLIC_LIVEKIT_URL
bun run dev
```

Application accessible sur [http://localhost:4000](http://localhost:4000).

## Workflow

1. **Forker** le dépôt
2. Créer une branche :
   - `feat/nom-feature`
   - `fix/nom-bug`
3. Faire des commits propres (voir convention ci-dessous)
4. Ouvrir une **Pull Request** vers `main` avec une description détaillée

## Convention de commits

Format [Conventional Commits](https://www.conventionalcommits.org/) :

```
feat: ajouter un sélecteur de thème
fix: corriger le scroll des messages
refactor: améliorer la gestion des sockets
style: harmoniser les espacements dans ChatArea
docs: mettre à jour la documentation API
```

## Règles de code

### ✅ Autorisé

- TypeScript strict
- Composants fonctionnels React uniquement (pas de classes)
- Réutilisation des composants UI existants (HeroUI / shadcn/ui)
- Code clair, factorisé et lisible
- Traductions obligatoires pour toute chaîne visible en UI

### ❌ Interdit

- Utilisation de `any` sans justification explicite
- Code dupliqué
- Ajout de librairies sans discussion préalable
- Secrets dans le code (utiliser `.env.local`)
- UI non traduite
- Composants "hardcodés" non réutilisables

## Traductions

Le projet supporte 12 langues. Pour toute nouvelle chaîne de texte :

1. Ajouter la clé dans `src/i18n/fr.ts` (français = référence)
2. Ajouter la traduction anglaise dans `src/i18n/en.ts`
3. Les autres langues peuvent rester en fallback anglais temporairement

## Issues

Avant d'ouvrir une issue, vérifiez qu'elle n'existe pas déjà.

### ✅ Une bonne issue doit contenir

- **Titre clair** (ex : `Bug: message dupliqué lors du reconnect`)
- Description détaillée du problème
- Étapes pour reproduire
- Comportement attendu vs comportement actuel
- Screenshots si pertinent
- Environnement (OS, navigateur, version)

### ❌ Issues refusées

- "ça marche pas" sans détails
- Demandes vagues ou non reproductibles
- Questions de support → utiliser Discord
- Suggestions hors scope ou irréalistes

## Pull Requests

### ✅ Accepté

- Code testé et fonctionnel
- Respect des conventions de code et de commits
- PR ciblée avec une description claire
- Petites PR plutôt qu'un mega refactor

### ❌ Refusé

- PR trop grosse sans discussion préalable
- Code cassant sans explication
- Aucune description
- Non respect du style du projet

## Licence

En contribuant, vous acceptez que vos modifications soient soumises à la [licence AlfyChat](./LICENSE).
