'use client';

import { NavbarIsland } from '@/components/home/landing-navbar';

/**
 * Navbar des pages statiques (status, legal, changelogs, brand…).
 * Même île que la home, mais positionnée en `fixed` au-dessus du contenu.
 */
export function LandingNavbar() {
  return <NavbarIsland variant="fixed" />;
}
