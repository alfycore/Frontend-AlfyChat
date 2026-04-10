# Contribuer à AlfyChat — Frontend

Merci de l'intérêt que vous portez à ce projet ! Voici les règles à suivre pour garantir une base de code propre et cohérente.

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
