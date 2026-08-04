'use client';

import { type ReactNode } from 'react';

/**
 * Layout /channels/me — délègue la sidebar au parent channels/layout.tsx.
 *
 * Ne rien intercepter ici : `/channels/me/g/[groupId]` n'existe que pour
 * rediriger vers `/channels/groups/[groupId]` (voir `me/g/[groupId]/page.tsx`).
 * Un ancien branchement spécial rendait `GroupChatArea` (composant mort,
 * `components/chat/`) dès que `params.groupId` était présent — un layout
 * hérite des params de ses segments enfants — court-circuitant la page de
 * redirection avant même que son `useEffect` ne s'exécute. Quiconque suivait
 * un vieux lien `/channels/me/g/:id` atterrissait donc sur l'ancienne UI au
 * lieu d'être renvoyé vers la vraie page de groupe.
 */
export default function MeLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
