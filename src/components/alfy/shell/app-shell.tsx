'use client';

import { Drawer } from '@heroui/react';

/**
 * Shell responsive de l'application — bord à bord, comme un vrai client
 * lourd (Discord/Slack/Signal Desktop), pas une carte flottante sur un
 * fond vide : la profondeur vient de la superposition de fonds (rail sur
 * `bg-background`, colonnes sur leurs propres nuances de surface) et de
 * séparateurs 1px, jamais d'un panneau arrondi + ombre portée.
 * < lg : rail + sidebar en Drawer gauche (toujours vertical), membres en
 * Drawer droit.
 */

interface AppShellProps {
  /** Rail vertical — utilisé en colonne desktop (si topRail absent) et toujours dans le tiroir mobile. */
  rail: React.ReactNode;
  /** Rail horizontal — remplace la colonne desktop par une barre en haut. */
  topRail?: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
  members?: React.ReactNode;
  /** Bandeau plein largeur au-dessus du contenu (barre d'appel persistante…). */
  banner?: React.ReactNode;
  /** Panneau de fil affiché à droite du chat (≥ lg). */
  rightPanel?: React.ReactNode;
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  membersOpen: boolean;
  onMembersOpenChange: (open: boolean) => void;
}

export function AppShell({
  rail,
  topRail,
  sidebar,
  children,
  members,
  banner,
  rightPanel,
  navOpen,
  onNavOpenChange,
  membersOpen,
  onMembersOpenChange,
}: AppShellProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Rail horizontal — desktop uniquement, remplace la colonne */}
      {topRail && <div className="hidden shrink-0 border-b border-separator lg:block">{topRail}</div>}

      <div className="flex min-h-0 flex-1">
        {/* Rail vertical — desktop uniquement, seulement si pas de rail horizontal */}
        {!topRail && (
          <div className="hidden shrink-0 border-r border-separator lg:flex">{rail}</div>
        )}

        {/* Panneau principal — bord à bord, aucune marge ni arrondi */}
        <div className="flex min-w-0 flex-1 flex-col bg-surface">
          {banner}
          <div className="flex min-h-0 flex-1">
            <div className="hidden w-66 shrink-0 border-r border-separator lg:block">{sidebar}</div>

            <main className="flex h-full min-w-0 flex-1">
              {children}
              {rightPanel && (
                <div className="hidden w-90 shrink-0 border-l border-separator lg:block">
                  {rightPanel}
                </div>
              )}
            </main>

            {members && membersOpen && (
              <div className="hidden w-62 shrink-0 border-l border-separator xl:block">{members}</div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile : tiroir gauche rail (toujours vertical) + sidebar */}
      <Drawer isOpen={navOpen} onOpenChange={onNavOpenChange}>
        <Drawer.Backdrop className="lg:hidden">
          <Drawer.Content placement="left" className="w-84 max-w-[85vw] p-0">
            <Drawer.Dialog aria-label="Navigation" className="h-full p-0">
              <div className="flex h-full bg-background">
                {rail}
                <div className="min-w-0 flex-1 bg-surface">{sidebar}</div>
              </div>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>

      {/* Mobile / tablette : tiroir droit membres */}
      {members && (
        <Drawer isOpen={membersOpen} onOpenChange={onMembersOpenChange}>
          <Drawer.Backdrop className="xl:hidden">
            <Drawer.Content placement="right" className="w-70 max-w-[85vw] p-0">
              <Drawer.Dialog aria-label="Membres" className="h-full bg-surface p-0">
                {members}
              </Drawer.Dialog>
            </Drawer.Content>
          </Drawer.Backdrop>
        </Drawer>
      )}
    </div>
  );
}
