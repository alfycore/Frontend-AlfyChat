# AlfyChat — Frontend

Messagerie sécurisée française avec chiffrement de bout en bout.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![License](https://img.shields.io/badge/License-Source_Available-blue)

## Fonctionnalités

- **Chiffrement E2E** — Protocole Signal via `libsignal-protocol-typescript`
- **Messagerie temps réel** — Socket.io
- **Appels audio/vidéo** — LiveKit
- **Serveurs & salons** — Système de serveurs avec canaux, rôles et permissions
- **Bots** — Intégration de bots personnalisés
- **12 langues** — FR, EN, DE, ES, IT, PT, NL, PL, SV, DA, NO, JA
- **Thème clair/sombre**
- **Panel admin**

## Stack technique

| Catégorie | Technologies |
|-----------|-------------|
| Framework | Next.js 16 (App Router, standalone) |
| UI | HeroUI v3, Radix UI, shadcn/ui |
| Style | Tailwind CSS v4 |
| Temps réel | Socket.io, LiveKit |
| Sécurité | Signal Protocol, DOMPurify |
| i18n | Système custom (12 langues) |

## Architecture

Ce frontend s'intègre dans une architecture microservices :

```
Frontend (:4000)  →  Gateway (:3000)  →  Microservices
                                          ├── users    (:3001)
                                          ├── messages  (:3002)
                                          ├── friends   (:3003)
                                          ├── calls     (:3004)
                                          ├── servers   (:3005)
                                          ├── bots      (:3006)
                                          └── media     (:3007)
```

Base de données : **MySQL 8** — Cache : **Redis 7**

## Démarrage

### Prérequis

- [Bun](https://bun.sh/) ≥ 1.2

### Installation

```bash
bun install
```

### Développement

```bash
bun run dev
```

L'app est accessible sur [http://localhost:4000](http://localhost:4000).

### Build production

```bash
bun run build
bun run start
```

### Docker

```bash
docker compose up frontend
```

## Structure du projet

```
src/
├── app/                 # Routes (App Router)
│   ├── (auth)/          # Login, signup, reset password
│   ├── (static)/        # Pages statiques
│   ├── app/             # Dashboard principal
│   ├── admin/           # Panel admin
│   ├── channels/        # Navigation serveurs/salons
│   ├── invite/          # Système d'invitations
│   └── ...
├── components/          # Composants React
│   ├── ui/              # shadcn/ui (50+ composants)
│   ├── chat/            # Interface de chat
│   ├── landing/         # Page d'accueil
│   └── ...
├── hooks/               # Custom hooks
├── i18n/                # Traductions (12 langues)
└── lib/                 # Utilitaires
```

## Contribution

Voir [CONTRIBUTING.md](../docs/CONTRIBUTING.md).

# AlfyChat — Rapport technique complet du projet

> Rapport généré le : 2026-05-11

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture globale](#2-architecture-globale)
3. [Frontend Web](#3-frontend-web--web-frontend-alfychat)
4. [Gateway](#4-gateway--gateway-backend-alfychat)
5. [Service Users](#5-service-users--users-backend-alfychat)
6. [Service Messages](#6-service-messages--messages-backend-alfychat)
7. [Service Friends](#7-service-friends--friends-backend-alfychat)
8. [Service Calls](#8-service-calls--calls-backend-alfychat)
9. [Service Servers](#9-service-servers--servers-backend-alfychat)
10. [Service Bots](#10-service-bots--bots-backend-alfychat)
11. [Service Media](#11-service-media--media-backend-alfychat)
12. [Server Node (auto-hébergé)](#12-server-node--server-node-alfychat)
13. [Application Mobile](#13-application-mobile--mobile-alfychat)
14. [Application Desktop](#14-application-desktop--desktop-alfychat)
15. [Infrastructure & Déploiement](#15-infrastructure--déploiement)
16. [Sécurité](#16-sécurité)
17. [Communication inter-services](#17-communication-inter-services)
18. [Variables d'environnement critiques](#18-variables-denvironnement-critiques)
19. [Points techniques notables](#19-points-techniques-notables)

---

## 1. Vue d'ensemble

**AlfyChat** est une plateforme de messagerie sécurisée avec chiffrement de bout en bout, conçue selon une architecture microservices. Le projet supporte trois clients natifs (web, mobile, desktop) et permet aux utilisateurs d'auto-héberger leurs propres serveurs communautaires.

### Résumé en chiffres

| Élément | Détail |
|---|---|
| Nombre de sous-projets | 12 |
| Services backend | 8 (Gateway + 7 microservices) |
| Port principal | 3000 (Gateway) |
| Base de données principale | MySQL 8.0 |
| Cache | Redis 7 |
| Protocole temps réel | Socket.io 4 + WebRTC (LiveKit) |
| Chiffrement | Signal Protocol (E2EE) |
| Langues supportées | 12 (FR, EN, DE, ES, IT, PT, NL, PL, SV, DA, NO, JA) |
| Runtime | Bun 1.2 + Node.js |

---

## 2. Architecture globale

### Schéma d'architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     COUCHE CLIENT                            │
├──────────────────────────────────────────────────────────────┤
│  Web (Next.js :4000)   Mobile (Expo RN)   Desktop (Electron) │
└──────────────┬─────────────────┬────────────────────────────┘
               │                 │
         HTTP + WebSocket   HTTP + WebSocket
               │                 │
┌──────────────▼─────────────────▼────────────────────────────┐
│                  GATEWAY  :3000                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Express Router  │  Socket.io Server  │  Rate Limiter │    │
│  │ Circuit Breaker │  Service Registry  │  Monitoring   │    │
│  └─────────────────────────────────────────────────────┘    │
└──┬──────┬──────┬──────┬──────┬──────┬──────┬───────────────┘
   │      │      │      │      │      │      │
  3001   3002   3003   3004   3005   3006   3007
   │      │      │      │      │      │      │
┌──▼──┐ ┌─▼──┐ ┌─▼──┐ ┌─▼──┐ ┌─▼──┐ ┌─▼──┐ ┌─▼──┐
│Users│ │Msg │ │Frnd│ │Call│ │Srv │ │Bots│ │Med │
└──┬──┘ └─┬──┘ └─┬──┘ └─┬──┘ └─┬──┘ └─┬──┘ └─┬──┘
   └───────┴──────┴──────┴──────┴──────┴──────┴────┐
                                                    │
┌───────────────────────────────────────────────────▼──────────┐
│              MySQL 8.0  :3306   +   Redis 7  :6379           │
└──────────────────────────────────────────────────────────────┘

                     AUTO-HÉBERGEMENT
┌──────────────────────────────────────┐
│  Server Node  :4100                  │
│  SQLite / PostgreSQL / MySQL local   │
│  Socket.io client → Gateway          │
└──────────────────────────────────────┘
```

### Flux de données

```
Client → Gateway → Microservice → Base de données
                ↓
          Socket.io → Broadcast → Autres clients connectés
```

---

## 3. Frontend Web — `WEB-frontend-AlfyChat`

### Rôle
Interface utilisateur principale accessible via navigateur.

### Stack technique

| Élément | Version |
|---|---|
| Framework | Next.js 16.2.3 (App Router) |
| UI | HeroUI v3 + Radix UI + shadcn/ui |
| Styling | Tailwind CSS v4 |
| Runtime | Bun 1.2.0 |
| Temps réel | Socket.io-client 4.7.4 |
| Appels | LiveKit-client 2.18.0 |
| Chiffrement | libsignal-protocol-typescript |
| Rendu Markdown | react-markdown 10.1.0 |
| Sécurité XSS | DOMPurify 3.3.3 |
| Graphiques | Recharts 3.8.0 |
| Animations | Motion 12.38.0 |

### Port
`4000` (dev) — se connecte au Gateway sur `:3000`

### Structure des routes

```
src/app/
├── (auth)/              → Login, inscription, reset mot de passe
│   ├── login/
│   ├── register/
│   └── forgot-password/
├── (static)/            → Pages institutionnelles
│   ├── about/
│   ├── legal/
│   ├── faq/
│   └── jobs/
├── app/                 → Dashboard principal
├── channels/            → Navigation serveurs & canaux
├── admin/               → Panneau d'administration
├── developers/          → Documentation développeur
├── invite/              → Système d'invitation
├── hosting/             → Info hébergement
├── subscription/        → Abonnements
├── verify-email/        → Vérification email
└── api/                 → Routes API internes Next.js
```

### Composants clés

| Composant | Description |
|---|---|
| `chat-area.tsx` | Zone de messagerie DM |
| `server-chat-area.tsx` | Zone de messagerie serveur |
| `group-chat-area.tsx` | Zone de messagerie groupe |
| `message-item.tsx` | Rendu d'un message (avec déchiffrement) |
| `call-panel.tsx` | Interface appel vocal/vidéo |
| `settings-dialog.tsx` | Paramètres utilisateur (97 KB — très complet) |
| `role-manager.tsx` | Gestion des rôles serveur |
| `channel-manager.tsx` | Administration des canaux |
| `emoji-picker.tsx` | Sélecteur d'emoji |
| `friends-panel.tsx` | Gestion des amis |

### Internationalisation
12 langues : `fr`, `en`, `de`, `es`, `it`, `pt`, `nl`, `pl`, `sv`, `da`, `no`, `ja`

### Variables d'environnement

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

### Scripts

```bash
bun run dev     # Démarrage dev sur :4000
bun run build   # Build production (output: standalone)
bun run start   # Démarrage production
```

---

## 4. Gateway — `gateway-Backend-AlfyChat`

### Rôle
Point d'entrée unique pour tous les clients. Gère le routage HTTP, les WebSockets, la sécurité, le monitoring et la tolérance aux pannes.

### Stack technique

| Élément | Version |
|---|---|
| Framework | Express 4.21.2 |
| WebSocket | Socket.io 4.8.1 |
| Adapter Socket.io | @socket.io/redis-adapter 8.3.0 |
| Rate limiting | rate-limiter-flexible 10.0.1 |
| Circuit breaker | opossum 9.0.0 |
| Logs | pino 10.3.1 + winston |
| Cache | ioredis 5.4.0 |

### Port
`3000`

### Responsabilités

1. **Proxy HTTP** — Route les requêtes vers chaque microservice
2. **Serveur WebSocket** — Diffuse les événements temps réel
3. **Rate limiting** — 3 niveaux : anonyme / utilisateur / admin
4. **Registre de services** — Découverte dynamique des microservices
5. **Circuit breaker** — Isole les services défaillants
6. **Load balancing** — Distribution des requêtes
7. **Monitoring** — Métriques, health checks, détection d'anomalies
8. **Sécurité** — Validation JWT, ban IP, CORS

### Rate limiting

| Niveau | Limite |
|---|---|
| Anonyme | Configurable via `RATE_LIMIT_ANON` |
| Utilisateur authentifié | Configurable via `RATE_LIMIT_USER` |
| Admin | Configurable via `RATE_LIMIT_ADMIN` |
| Endpoints auth (login/register) | 10 tentatives / 15 min |

### Variables d'environnement

```env
PORT=3000
FRONTEND_URL=http://localhost:4000
JWT_SECRET=...
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=...
INTERNAL_SECRET=...
USERS_SERVICE_URL=http://localhost:3001
MESSAGES_SERVICE_URL=http://localhost:3002
FRIENDS_SERVICE_URL=http://localhost:3003
CALLS_SERVICE_URL=http://localhost:3004
SERVERS_SERVICE_URL=http://localhost:3005
BOTS_SERVICE_URL=http://localhost:3006
MEDIA_SERVICE_URL=http://localhost:3007
```

---

## 5. Service Users — `users-Backend-AlfyChat`

### Rôle
Authentification, gestion des profils, 2FA, RGPD, tickets support, changelogs.

### Stack technique
Express 4, MySQL 8, Redis, JWT, bcryptjs, otplib (TOTP), nodemailer, express-validator, helmet

### Port
`3001`

### Endpoints principaux

```
POST   /auth/register              Inscription
POST   /auth/login                 Connexion
POST   /auth/2fa/login             Vérification 2FA
POST   /auth/refresh               Renouvellement token
POST   /auth/logout                Déconnexion
GET    /auth/verify                Validation token
GET    /auth/verify-email          Activation compte (lien email)
POST   /auth/resend-verification   Renvoi email vérification
GET    /users                      Profils utilisateurs
POST   /users/preferences          Préférences (thème, langue, notifs)
GET    /rgpd                       Export données RGPD
POST   /rgpd/delete                Suppression compte
GET    /admin/*                    Routes admin
GET    /helpdesk/*                 Système de tickets
```

### Schéma de base de données

```sql
users
  id, username, email, password_hash, avatar_url, banner_url,
  bio, role, status, custom_status, email_verified,
  public_key, identity_key, created_at, updated_at

user_preferences
  user_id, theme, language, encryption_level,
  notification_settings (JSON), privacy_settings (JSON)

sessions
  id, user_id, refresh_token, expires_at, created_at

rgpd_consents
  user_id, consent_type, granted_at

rgpd_deletion_requests
  user_id, requested_at, scheduled_deletion_at, status

custom_badges
  id, user_id, name, icon, color, created_at
```

### Variables d'environnement

```env
PORT=3001
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
JWT_SECRET
GATEWAY_URL
TURNSTILE_SECRET_KEY        # Cloudflare CAPTCHA
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
INTERNAL_SECRET
SERVICE_ID, SERVICE_LOCATION, SERVICE_ENDPOINT, SERVICE_DOMAIN
```

---

## 6. Service Messages — `messages-Backend-AlfyChat`

### Rôle
Stockage et récupération des messages, gestion des conversations, archivage hybride, notifications.

### Port
`3002`

### Endpoints principaux

```
POST   /messages                        Envoyer un message
GET    /messages/:conversationId        Historique d'une conversation
DELETE /messages/:messageId             Supprimer un message
GET    /conversations                   Lister les conversations
POST   /conversations                   Créer une conversation
GET    /archive/:conversationId         Messages archivés
POST   /archive/cleanup                 Nettoyage des archives
GET    /notifications                   Notifications utilisateur
```

### Système d'archivage hybride

- **Quota** : 20 000 messages / 30 jours par conversation
- **Délai TTL** : Messages actifs conservés dans Redis (TTL 4s pour cache)
- **Archivage serveur** : Messages chiffrés en base après quota
- **Fallback P2P** : Si quota serveur dépassé, les clients échangent directement
- **Maintenance quotidienne** : Tâche planifiée de nettoyage toutes les 24h

### Schéma de base de données

```sql
messages
  id, conversation_id, sender_id, content (chiffré), type,
  attachment_url, created_at, deleted_at

conversations
  id, type (dm|group), created_at

message_attachments
  id, message_id, url, filename, size, mime_type

notifications
  id, user_id, type, data (JSON), read, created_at

dm_archive_metadata
  conversation_id, last_archived_at, total_archived_count
```

### Variables d'environnement

```env
PORT=3002
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
JWT_SECRET
ARCHIVE_DB_ENCRYPTION_KEY    # Chiffrement des archives
INTERNAL_SECRET
```

---

## 7. Service Friends — `friends-Backend-AlfyChat`

### Rôle
Gestion des amitiés, demandes d'ami, blocage d'utilisateurs.

### Port
`3003`

### Endpoints principaux

```
GET    /                       Liste d'amis
POST   /request                Envoyer une demande d'ami
GET    /requests               Demandes en attente reçues
POST   /requests/:id/accept    Accepter une demande
POST   /requests/:id/decline   Refuser une demande
DELETE /:friendId              Supprimer un ami
GET    /blocked                Utilisateurs bloqués
POST   /block/:userId          Bloquer un utilisateur
DELETE /block/:userId          Débloquer un utilisateur
```

### Schéma de base de données

```sql
friends
  user_id, friend_id, status (pending|accepted), created_at

blocked_users
  user_id, blocked_user_id, created_at
```

### Variables d'environnement

```env
PORT=3003
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
JWT_SECRET
USERS_SERVICE_URL    # Pour récupérer les profils utilisateurs
INTERNAL_SECRET
```

---

## 8. Service Calls — `calls-Backend-AlfyChat`

### Rôle
Gestion des appels vocaux et vidéo, coordination WebRTC via LiveKit.

### Port
`3004`

### Endpoints principaux

```
POST   /calls                    Initier un appel (voice|video)
GET    /calls/:callId            Détails d'un appel
POST   /calls/:callId/join       Rejoindre un appel
POST   /calls/:callId/leave      Quitter un appel
POST   /calls/:callId/end        Terminer un appel
GET    /calls/:callId/token      Obtenir un token LiveKit
```

### Schéma de base de données

```sql
calls
  id, type (voice|video), initiator_id, conversation_id,
  channel_id, status (active|ended), started_at, ended_at

call_participants
  call_id, user_id, joined_at, left_at
```

### Variables d'environnement

```env
PORT=3004
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
DB_POOL_SIZE=5
REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
INTERNAL_SECRET
```

---

## 9. Service Servers — `servers-Backend-AlfyChat`

### Rôle
Création et gestion des serveurs communautaires, canaux, rôles, permissions et modération.

### Port
`3005`

### Endpoints principaux

```
POST   /servers                          Créer un serveur
GET    /servers                          Lister les serveurs de l'utilisateur
GET    /servers/:id                      Détails d'un serveur
PUT    /servers/:id                      Modifier un serveur
DELETE /servers/:id                      Supprimer un serveur
POST   /servers/:id/channels             Créer un canal
GET    /servers/:id/channels             Lister les canaux
POST   /servers/:id/roles                Créer un rôle
GET    /servers/:id/members              Lister les membres
POST   /servers/:id/invites              Générer un lien d'invitation
POST   /servers/:id/bans                 Bannir un membre
DELETE /servers/:id/bans/:userId         Débannir
```

### Schéma de base de données

```sql
servers
  id, name, description, icon_url, owner_id, created_at

channels
  id, server_id, name, type (text|voice|category),
  parent_id, position, created_at

server_members
  server_id, user_id, joined_at

roles
  id, server_id, name, color, permissions (bitfield), position

member_roles
  server_id, user_id, role_id

channel_permission_overwrites
  channel_id, role_id, allow (bitfield), deny (bitfield)

invites
  code, server_id, creator_id, uses, max_uses, expires_at

bans
  server_id, user_id, reason, banned_by, created_at
```

### Variables d'environnement

```env
PORT=3005
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
REDIS_HOST, REDIS_PORT
JWT_SECRET
INTERNAL_SECRET
```

---

## 10. Service Bots — `bots-Backend-AlfyChat`

### Rôle
Création, gestion et répertoire public des bots.

### Port
`3006`

### Endpoints principaux

```
POST   /bots                    Créer un bot
GET    /bots                    Lister ses bots
GET    /bots/:id                Détails d'un bot
PUT    /bots/:id                Modifier un bot
DELETE /bots/:id                Supprimer un bot
GET    /bots/search             Recherche publique de bots
POST   /bots/:id/invite         Obtenir un lien d'invitation
POST   /bots/:id/permissions    Configurer les permissions
POST   /bots/:id/token          Régénérer le token
```

### Schéma de base de données

```sql
bots
  id, owner_id, name, description, avatar_url, token,
  prefix, status (online|offline|maintenance),
  verified (pending|approved|rejected), tags (JSON),
  website, support_server, privacy_policy_url, created_at

bot_permissions
  bot_id, server_id, permissions (bitfield)

bot_statistics
  bot_id, invite_count, server_count, updated_at
```

### Variables d'environnement

```env
PORT=3006
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
REDIS_HOST, REDIS_PORT
JWT_SECRET
INTERNAL_SECRET
```

---

## 11. Service Media — `media-Backend-AlfyChat`

### Rôle
Upload, traitement (redimensionnement Sharp) et diffusion des fichiers médias.

### Port
`3007`

### Endpoints principaux

```
POST   /media/upload         Upload d'un fichier (avatar, banner, attachment, icon, wallpaper)
GET    /media/:type/:filename Servir un média
DELETE /media/:filename      Supprimer un média
GET    /uploads/*            Fichiers statiques sécurisés
```

### Répertoires d'upload

```
/uploads/
├── avatars/       Avatars utilisateurs
├── banners/       Bannières utilisateurs/serveurs
├── attachments/   Pièces jointes de messages
├── icons/         Icônes de serveurs
└── wallpapers/    Fonds d'écran personnalisés
```

### Sécurité des fichiers

| Mesure | Détail |
|---|---|
| Formats acceptés | JPEG, PNG, GIF, WebP |
| Validation magic bytes | Vérifie le contenu réel du fichier (pas l'extension) |
| Content-Disposition | `attachment` — force le téléchargement, empêche XSS |
| X-Content-Type-Options | `nosniff` |
| Cache-Control | Configurable par type |
| Dotfiles | Refusés |
| Directory listing | Désactivé |

### Variables d'environnement

```env
PORT=3007
JWT_SECRET
GATEWAY_URL
INTERNAL_SECRET
UPLOAD_PATH=/app/uploads    # En production Docker
MAX_FILE_SIZE=...           # Taille max configurable
```

---

## 12. Server Node — `server-node-AlfyChat`

### Rôle
Application autonome permettant aux utilisateurs d'**héberger leur propre serveur communautaire** localement.

### Port
`4100` (par défaut, personnalisable)

### Stack technique

| Élément | Version |
|---|---|
| Framework | Express 4.18.2 |
| ORM | Prisma 6.5.0 |
| Bases de données | SQLite (défaut) / PostgreSQL / MySQL |
| CLI | Commander 12.0.0 |
| WebSocket client | socket.io-client 4.7.4 |
| Auth | JWT + bcrypt 5.1.1 |
| Cache | ioredis (optionnel) |

### Utilisation (CLI)

```bash
alfychat-server start \
  --server-id <id>       # ID serveur depuis AlfyChat
  --token <token>        # Token d'authentification du nœud
  --name <name>          # Nom du serveur
  --port <port>          # Port local (défaut: 4100)
  --gateway <url>        # URL du gateway (défaut: https://gateway.alfychat.app)
  --data-dir <dir>       # Répertoire des données (défaut: ./alfychat-data)
```

### Schéma de base de données (Prisma)

```prisma
ServerSelf          Métadonnées du serveur
ServerSelfConfig    Configuration (canal par défaut, membres max, token)
ServerSelfInvite    Codes d'invitation avec limites d'usage
Channel             Canaux (hiérarchique avec parent_id)
ChannelPermissionOverwrite  Permissions par canal
Role                Rôles avec bitfield de permissions
MemberRole          Assignation rôle ↔ membre
Message             Messages des canaux
```

### Structure des données locales

```
alfychat-data/
├── server.db          Base SQLite (par défaut)
├── uploads/
│   ├── avatars/
│   ├── banners/
│   └── attachments/
└── .env               Configuration locale
```

### Variables d'environnement

```env
SERVER_ID=...
NODE_TOKEN=...
GATEWAY_URL=https://gateway.alfychat.app
PORT=4100
DATA_DIR=./alfychat-data
DB_TYPE=sqlite              # sqlite | postgres | mysql
DATABASE_URL=file:./server.db
JWT_SECRET=...
REDIS_ENABLED=false         # Optionnel pour le scaling
```

---

## 13. Application Mobile — `mobile-AlfyChat`

### Rôle
Application native iOS et Android encapsulant l'interface web.

### Stack technique

| Élément | Version |
|---|---|
| Framework | Expo 52.0.0 |
| Runtime | React Native |
| WebView | react-native-webview 13.12.5 |
| Status Bar | expo-status-bar 2.0.1 |
| Splash Screen | expo-splash-screen 0.29.18 |

### Approche technique
L'application est un **wrapper WebView** qui charge l'interface web AlfyChat. Cette approche permet de maintenir un seul codebase frontend tout en offrant une distribution native (App Store / Play Store).

### Fonctionnalités natives

| Fonctionnalité | Implémentation |
|---|---|
| Deep linking | Routes vers `/login`, `/register`, `/channels` |
| Bouton retour Android | Gestion du geste natif |
| Whitelist d'URLs | Seul `alfychat.app` est autorisé |
| État de chargement | Indicateur pendant le chargement de la WebView |

### Scripts

```bash
expo start           # Serveur de développement
expo run:android     # Build et lancement Android
expo run:ios         # Build et lancement iOS
eas build            # Build cloud via EAS
```

### Connexion
Se connecte à `https://alfychat.app` (production)

---

## 14. Application Desktop — `desktop-AlfyChat`

### Rôle
Application de bureau cross-platform Windows / macOS / Linux.

### Stack technique

| Élément | Version |
|---|---|
| Framework | Electron 33.0.0 |
| Build | electron-builder 25.1.8 |
| Stockage local | electron-store 10.0.0 |

### Approche technique
Identique au mobile — **wrapper** qui charge `https://alfychat.app` dans une `BrowserWindow` Electron.

### Fenêtre principale
- Taille : 1280×800 (minimum : 900×600)
- Barre de menu : masquée (`menuBarVisible: false`)
- Sandbox : activé (`preload.js` sandboxé)
- Navigation externe bloquée (whitelist `alfychat.app`)

### Formats de distribution

| Plateforme | Format |
|---|---|
| Windows | NSIS installer + EXE portable |
| macOS | DMG + ZIP |
| Linux | AppImage + DEB |

### Scripts

```bash
npm start              # Lancement dev
npm run dev            # Mode développement (NODE_ENV=development)
npm run build:win      # Build Windows
npm run build:mac      # Build macOS
npm run build:linux    # Build Linux
npm run build:all      # Build toutes plateformes
```

### Configuration

```json
{
  "appId": "app.alfychat.desktop",
  "productName": "AlfyChat",
  "icon": "assets/icon.png"
}
```

---

## 15. Infrastructure & Déploiement

### Docker Compose

Le fichier `docker-compose.yml` à la racine orchestre l'ensemble des services :

```yaml
Services:
  mysql        → Port 3306   (persistance: mysql_data)
  redis        → Port 6379   (persistance: redis_data)
  gateway      → Port 3000
  users        → Port 3001
  messages     → Port 3002
  friends      → Port 3003
  calls        → Port 3004
  servers      → Port 3005
  bots         → Port 3006
  media        → Port 3007   (volume: media_uploads)
  server-node  → Port 4100   (volume: server_node_data)
  frontend     → Port 4000
```

### Volumes persistants

```
mysql_data       → Données MySQL
redis_data       → Cache Redis
media_uploads    → Fichiers uploadés (avatars, bannières, pièces jointes)
server_node_data → Données du nœud auto-hébergé
```

### Ordre de démarrage recommandé

```
1. MySQL + Redis (dépendances de tous les services)
2. Users, Messages, Friends, Calls, Servers, Bots, Media (microservices)
3. Gateway (une fois les microservices disponibles)
4. Frontend (une fois le Gateway disponible)
```

---

## 16. Sécurité

### Authentification

| Mécanisme | Implémentation |
|---|---|
| Tokens JWT | HS256, secret partagé `JWT_SECRET` |
| Hash mot de passe | bcryptjs / argon2 |
| 2FA | TOTP via otplib (RFC 6238) |
| CAPTCHA | Cloudflare Turnstile |
| Vérification email | Token UUID signé |

### Chiffrement des messages

- **Protocole** : Signal Protocol (libsignal)
- **Niveau** : Client-side (bout en bout)
- **Clés** : Clé publique stockée en base, clé privée jamais transmise
- **Archives** : Chiffrées côté serveur avec `ARCHIVE_DB_ENCRYPTION_KEY`

### Protection réseau

| Mesure | Outil |
|---|---|
| Headers sécurisés | Helmet 7 |
| CORS | Configuré par service |
| Rate limiting général | rate-limiter-flexible |
| Bruteforce auth | 10 tentatives / 15 min |
| Ban IP | Géré par le Gateway |
| Inter-services | Header `X-Internal-Secret` |

### Sécurité des uploads

| Vérification | Détail |
|---|---|
| Magic bytes | Contenu réel vérifié (pas l'extension) |
| Types autorisés | JPEG, PNG, GIF, WebP |
| Content-Disposition | `attachment` (empêche l'exécution) |
| X-Content-Type-Options | `nosniff` |
| Directory listing | Désactivé |
| Dotfiles | Refusés |

---

## 17. Communication inter-services

### Types de communication

```
Client → Gateway (HTTP / WebSocket)
Gateway → Microservices (HTTP proxy)
Services → Services (HTTP avec X-Internal-Secret)
Server-node → Gateway (WebSocket client, fédération)
```

### Header d'authentification inter-services

```http
X-Internal-Secret: <INTERNAL_SECRET>
```

Utilisé pour distinguer les appels inter-services des appels clients. Chaque microservice rejette les requêtes sans ce header sur les routes internes.

### Événements WebSocket (Socket.io)

| Événement | Sens | Description |
|---|---|---|
| `message:new` | Server → Client | Nouveau message reçu |
| `message:typing` | Bidirectionnel | Indicateur de frappe |
| `friend:request` | Server → Client | Demande d'ami reçue |
| `friend:accepted` | Server → Client | Demande acceptée |
| `call:incoming` | Server → Client | Appel entrant |
| `user:status` | Server → Client | Changement de statut |
| `server:update` | Server → Client | Mise à jour d'un serveur |

---

## 18. Variables d'environnement critiques

Variables **communes à tous les services** :

```env
# Base de données
DB_HOST=localhost
DB_PORT=3306
DB_USER=alfychat
DB_PASSWORD=...
DB_NAME=alfychat

# Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=...

# Sécurité — NE JAMAIS EXPOSER
JWT_SECRET=...                   # Minimum 32 caractères aléatoires
INTERNAL_SECRET=...              # Minimum 32 caractères aléatoires
ARCHIVE_DB_ENCRYPTION_KEY=...   # Clé 32 octets (AES-256)

# Email
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

# Cloudflare
TURNSTILE_SECRET_KEY=...

# LiveKit (service Calls)
LIVEKIT_URL=...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

---

## 19. Points techniques notables

### Architecture
- **Microservices** avec base de données MySQL partagée (schéma non isolé par service) — choix pragmatique mais implique un couplage entre services
- **Redis** sert à la fois de cache (TTL messages), d'adaptateur Socket.io (scaling horizontal du Gateway) et de stockage de rate limiting
- **Circuit breaker** (opossum) sur le Gateway protège contre les cascades de pannes

### Scalabilité
- Le Gateway peut être répliqué horizontalement grâce à l'adaptateur Redis Socket.io
- Chaque microservice peut être mis à l'échelle indépendamment (sauf couplage DB)
- Le Server-node offre une décentralisation partielle (fédération)

### Chiffrement E2EE
- Implémentation Signal Protocol côté client uniquement
- Le serveur est opaque : il transporte des messages chiffrés sans les lire
- Les clés d'identité et de session sont gérées par `libsignal-protocol-typescript`

### Multi-plateforme
- Mobile (Expo) et Desktop (Electron) sont des **wrappers WebView** — un seul codebase frontend à maintenir
- Avantage : déploiement et mises à jour centralisés
- Inconvénient : performances et fonctionnalités natives limitées

### Internationalisation
- 12 langues gérées côté frontend
- Fichiers de traduction dans `src/i18n/` (format TypeScript)

### Auto-hébergement
- Le Server-node permet une vraie décentralisation des communautés
- Support SQLite pour une installation simple, PostgreSQL/MySQL pour la production
- Connexion au Gateway central pour la fédération (découverte, signalisation)

---

*Rapport généré automatiquement le 2026-05-11 — Projet AlfyChat*

