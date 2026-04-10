## Description

Décrivez les changements apportés et pourquoi.

## Type de changement

- [ ] Bug fix
- [ ] Nouvelle fonctionnalité
- [ ] Refactor
- [ ] Documentation
- [ ] Autre (préciser) :

## Zone concernée

- [ ] Messages (DM / groupes)
- [ ] Serveurs / Canaux
- [ ] Appels (WebRTC)
- [ ] Amis / Invitations
- [ ] Paramètres serveur (rôles, channels)
- [ ] Traductions / i18n
- [ ] UI / Composants
- [ ] Autre :

## Checklist

- [ ] TypeScript strict — aucun `any` sans justification
- [ ] Composants fonctionnels React uniquement (pas de classes)
- [ ] Toute chaîne UI ajoutée dans `src/i18n/fr.ts` **et** `src/i18n/en.ts`
- [ ] Les événements Socket.IO sont en UPPERCASE (ex: `FRIEND_REQUEST`, `PRESENCE_UPDATE`)
- [ ] Les listeners Socket.IO utilisent des fonctions nommées (pas de lambdas anonymes) pour le cleanup
- [ ] Aucun secret dans le code (utiliser `.env.local`)
- [ ] La PR est ciblée — pas de changements non liés
- [ ] Testé localement (`bun run dev`)

## Screenshots (si applicable)
