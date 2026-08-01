'use client';

/**
 * Annuaire d'utilisateurs injectable.
 *
 * Les composants alfy sont présentationnels mais ont besoin de résoudre un
 * `userId` en profil. Plutôt que d'importer le mock, ils passent par ce
 * contexte : le mock reste la valeur par défaut (donc `/uitest` fonctionne
 * sans provider), et les vraies pages injectent l'annuaire réel.
 */

import { createContext, useContext } from 'react';

import { userById as mockUserById } from '@/components/alfy/mock/data';
import type { AlfyUser } from '@/components/alfy/mock/types';

export type UserResolver = (id: string) => AlfyUser;

const UserDirectoryContext = createContext<UserResolver>(mockUserById);

export const UserDirectoryProvider = UserDirectoryContext.Provider;

/** Résout un utilisateur par id (mock par défaut, réel si un provider est monté). */
export function useUserById(): UserResolver {
  return useContext(UserDirectoryContext);
}

/** Fabrique un résolveur à partir d'une table, avec repli lisible. */
export function makeResolver(table: Map<string, AlfyUser>): UserResolver {
  return (id: string) =>
    table.get(id) ?? {
      id,
      username: 'inconnu',
      displayName: 'Utilisateur inconnu',
      status: 'offline',
      badges: [],
      createdAt: new Date().toISOString(),
    };
}
