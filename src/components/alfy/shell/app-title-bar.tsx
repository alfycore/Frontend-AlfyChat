'use client';

/**
 * Bandeau de titre de l'application : historique (précédent/suivant),
 * identité du contexte courant au centre, notifications et aide à droite.
 *
 * Dans l'enveloppe desktop, c'est aussi la barre de la fenêtre : zone de
 * déplacement, et place réservée aux boutons de fenêtre que l'OS dessine
 * par-dessus (overlay Windows/Linux, feux tricolores macOS).
 */

import { Button, Tooltip } from '@heroui/react';
import { ArrowLeft, ArrowRight, CircleHelp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';

import { desktopBridge } from '@/lib/desktop';
import { siteLink } from '@/lib/domains';
import { serverListStore } from '@/lib/server-list-store';
import { AlfyMark } from '@/components/alfy/primitives/alfy-mark';
import { NotificationCenter } from '@/components/alfy/notifications/notification-center';
import { useTranslation } from '@/components/locale-provider';

interface AppTitleBarProps {
  /** Serveur affiché, ou `null` pour les messages privés. */
  serverId: string | null;
}

/** La plateforme ne change pas : rien à écouter. */
const noSubscribe = () => () => {};

export function AppTitleBar({ serverId }: AppTitleBarProps) {
  const { t } = useTranslation();
  const router = useRouter();

  /* Signale le bandeau à `desktop.css` : la bande de déplacement des pages
     qui n'en ont pas s'efface. */
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-app-titlebar', '');
    return () => root.removeAttribute('data-app-titlebar');
  }, []);

  /* La liste des serveurs porte déjà nom et icône : s'appuyer dessus évite de
     rebrancher `useAlfyChannels` (et ses écouteurs socket) juste pour un titre. */
  const servers = useSyncExternalStore(
    serverListStore.subscribe,
    serverListStore.getSnapshot,
    serverListStore.getServerSnapshot,
  );
  const server = serverId ? servers.find((s) => s.id === serverId) : undefined;
  const titre = server?.name ?? t.serverRail.dms;

  /* Les boutons natifs se posent PAR-DESSUS le bandeau : on leur réserve la
     place. À droite (Windows/Linux) la largeur vient de `titlebar-area-*`,
     qui vaut 100vw hors overlay — d'où un retrait nul dans un navigateur. À
     gauche (macOS) les feux tricolores occupent ~78 px. */
  const isMac = useSyncExternalStore(noSubscribe, () => desktopBridge()?.platform === 'darwin', () => false);

  /* Masqué en mobile : 32 px de hauteur en moins pour rien, le navigateur a
     déjà son propre historique. Toujours affiché dans l'app desktop : zoomée
     (Ctrl +), une petite fenêtre passe sous le seuil `md`, et sans bandeau
     elle ne serait plus déplaçable. */
  return (
    <header
      className="alfy-drag-region relative hidden h-8 shrink-0 items-center border-b border-separator bg-background pl-1 select-none md:flex [html[data-desktop]_&]:flex"
      style={{
        paddingLeft: isMac ? 78 : undefined,
        paddingRight: 'calc(100vw - env(titlebar-area-x, 0px) - env(titlebar-area-width, 100vw))',
      }}
      data-slot="app-title-bar"
    >
      {/* Historique. Ni `back()` ni `forward()` n'exposent s'il y a une
          destination : les griser demanderait de tenir notre propre index
          d'historique, pour un gain purement cosmétique. */}
      <div className="alfy-no-drag z-10 flex shrink-0 items-center gap-0.5">
        <Tooltip delay={600}>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={t.titleBar.back}
            className="size-7 text-muted"
            onPress={() => router.back()}
          >
            <ArrowLeft className="size-4" aria-hidden />
          </Button>
          <Tooltip.Content placement="bottom">
            <p>{t.titleBar.back}</p>
          </Tooltip.Content>
        </Tooltip>
        <Tooltip delay={600}>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={t.titleBar.forward}
            className="size-7 text-muted"
            onPress={() => router.forward()}
          >
            <ArrowRight className="size-4" aria-hidden />
          </Button>
          <Tooltip.Content placement="bottom">
            <p>{t.titleBar.forward}</p>
          </Tooltip.Content>
        </Tooltip>
      </div>

      {/* Titre : centré sur le bandeau, pas sur l'espace restant — sinon il se
          décale selon le nombre de boutons à droite (contrôles de fenêtre
          présents ou non). D'où le positionnement absolu. */}
      <div className="pointer-events-none absolute inset-x-0 flex justify-center">
        <span className="flex min-w-0 items-center gap-1.5 px-2">
          {server?.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={server.iconUrl} alt="" className="size-4 shrink-0 rounded-full object-cover" />
          ) : (
            <AlfyMark className="size-4 shrink-0" />
          )}
          <span className="truncate text-xs font-semibold text-foreground/90">{titre}</span>
        </span>
      </div>

      <div className="alfy-no-drag z-10 ml-auto flex shrink-0 items-center gap-0.5 pr-1">
        <NotificationCenter />
        <Tooltip delay={600}>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={t.titleBar.help}
            className="size-7 text-muted"
            /* Le support vit sur alfychat.com : `/support` n'est qu'une
               redirection, qui faisait quitter l'app (et couper un appel en
               cours). Nouvel onglet ici, navigateur système en desktop. */
            onPress={() => window.open(siteLink('/support'), '_blank', 'noopener,noreferrer')}
          >
            <CircleHelp className="size-4" aria-hidden />
          </Button>
          <Tooltip.Content placement="bottom">
            <p>{t.titleBar.help}</p>
          </Tooltip.Content>
        </Tooltip>
      </div>
    </header>
  );
}
