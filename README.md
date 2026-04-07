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
