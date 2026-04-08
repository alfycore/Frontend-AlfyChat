# Contribuer à AlfyChat — Frontend

Merci de l'intérêt que vous portez à ce projet ! Voici les règles à suivre.

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
# Renseigner NEXT_PUBLIC_GATEWAY_URL et NEXT_PUBLIC_LIVEKIT_URL
bun run dev
```

L'app est accessible sur [http://localhost:4000](http://localhost:4000).

## Workflow

1. **Forker** le dépôt
2. Créer une branche descriptive : `feat/nom-feature` ou `fix/nom-bug`
3. Faire des commits atomiques avec des messages clairs (voir ci-dessous)
4. Ouvrir une **Pull Request** vers `main` avec une description détaillée

## Convention de commits

Utiliser le format [Conventional Commits](https://www.conventionalcommits.org/) :

```
feat: ajouter le composant de sélection de langue
fix: corriger l'affichage des messages groupés
refactor: simplifier le hook useMessages
style: harmoniser les espacements dans ChatArea
docs: mettre à jour la liste des composants UI
```

## Règles de code

- TypeScript strict — pas de `any` sans justification
- Composants React fonctionnels uniquement (pas de classes)
- Utiliser les composants HeroUI/shadcn/ui existants avant d'en créer de nouveaux
- Nommer les fichiers de composants en PascalCase
- Les traductions vont dans `src/i18n/` — toute chaîne visible en UI doit être traduite
- Pas de secrets dans le code (utiliser `.env.local`)

## Ajouter une traduction

Le projet supporte 12 langues. Pour toute nouvelle chaîne de texte :

1. Ajouter la clé dans `src/i18n/fr.ts` (français = référence)
2. Ajouter la traduction anglaise dans `src/i18n/en.ts`
3. Les autres langues peuvent rester identiques à l'anglais temporairement

## Signaler un bug

Ouvrir une issue avec :
- La version (navigateur, OS)
- Les étapes pour reproduire
- Le comportement attendu vs observé
- Une capture d'écran si pertinent

## Licence

En contribuant, vous acceptez que vos modifications soient soumises à la [licence AlfyChat](./LICENSE).
