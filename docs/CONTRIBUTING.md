# Contribution à AlfyChat

Merci de votre intérêt pour contribuer à AlfyChat !

> **Note :** Ce projet est sous licence **AlfyChat Source Available License**. En contribuant, vous acceptez que vos contributions soient soumises aux mêmes termes. Voir [LICENSE](../LICENSE).

## Prérequis

- [Bun](https://bun.sh/) ≥ 1.2
- [Docker](https://www.docker.com/) et Docker Compose
- [Git](https://git-scm.com/)

## Mise en place de l'environnement

```bash
# Cloner le repo concerné (ex: frontend)
git clone https://github.com/wiltark/WEB-frontend-AlfyChat.git
cd WEB-frontend-AlfyChat

# Installer les dépendances
bun install

# Copier la config d'environnement
cp .env.example .env

# Lancer en développement
bun run dev
```

### Lancer toute la stack

```bash
# Depuis la racine du projet
docker compose up
```

## Comment contribuer

### Signaler un bug

1. Vérifiez que le bug n'a pas déjà été signalé dans les issues
2. Créez une issue avec un titre clair
3. Incluez : étapes de reproduction, comportement attendu vs observé, screenshots si pertinent

### Proposer une fonctionnalité

1. Ouvrez une issue pour discuter de l'idée
2. Attendez la validation d'un mainteneur avant de commencer
3. Créez une pull request

### Soumettre du code

1. Fork le repository
2. Créez une branche depuis `main` :
   ```bash
   git checkout -b feature/ma-fonctionnalite
   ```
3. Développez et testez vos changements
4. Commitez en suivant les conventions ci-dessous :
   ```bash
   git commit -m "feat: ajout de ma fonctionnalité"
   ```
5. Push et ouvrez une Pull Request :
   ```bash
   git push origin feature/ma-fonctionnalite
   ```

## Convention de commits

Nous utilisons [Conventional Commits](https://www.conventionalcommits.org/) :

| Préfixe      | Usage                                 |
|-------------|---------------------------------------|
| `feat:`     | Nouvelle fonctionnalité               |
| `fix:`      | Correction de bug                     |
| `docs:`     | Documentation                         |
| `style:`    | Formatage (pas de changement de code) |
| `refactor:` | Refactoring                           |
| `perf:`     | Amélioration de performance           |
| `test:`     | Ajout ou correction de tests          |
| `chore:`    | Maintenance, dépendances, CI          |

## Structure des microservices

| Service      | Port | Description                          |
|-------------|------|--------------------------------------|
| frontend    | 4000 | Interface web (Next.js)              |
| gateway     | 3000 | API Gateway, authentification JWT    |
| users       | 3001 | Gestion des utilisateurs et profils  |
| messages    | 3002 | Messages et notifications            |
| friends     | 3003 | Relations et blocages                |
| calls       | 3004 | Appels audio/vidéo (LiveKit)         |
| servers     | 3005 | Serveurs, canaux, rôles              |
| bots        | 3006 | Intégration de bots                  |
| media       | 3007 | Upload de fichiers et médias         |

## Règles de code

- **TypeScript** obligatoire — pas de `any` sauf cas justifié
- **Pas de secrets** dans le code — utiliser les variables d'environnement
- **Fichiers `.env`** : ne jamais les commiter, utiliser `.env.example`
- **Nommage** : camelCase pour les variables/fonctions, PascalCase pour les composants

## Sécurité

Si vous découvrez une vulnérabilité de sécurité, **ne créez pas d'issue publique**. Contactez-nous en privé à l'adresse indiquée dans le profil du mainteneur.

## Code de conduite

- Soyez respectueux et inclusif
- Acceptez les critiques constructives
- Concentrez-vous sur ce qui est le mieux pour le projet et la communauté

Merci de faire partie de la communauté AlfyChat !
