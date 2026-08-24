'use client';

/**
 * Bandeau de titre de l'application.
 *
 * Deux rôles, selon l'enveloppe :
 *
 *  - **Partout** : historique (précédent/suivant), identité du contexte courant
 *    au centre, boîte de notifications et aide à droite.
 *  - **Desktop uniquement** : les boutons de fenêtre. La fenêtre Electron est
 *    créée avec `titleBarStyle: 'hidden'`, donc sans barre système — jusqu'ici
 *    l'application desktop n'offrait aucun moyen de réduire, agrandir ou
 *    fermer sa propre fenêtre, ni même de la déplacer. Le préchargement
 *    exposait pourtant déjà tout le nécessaire.
 */

import { Button, Tooltip } from '@heroui/react';
import { ArrowLeft, ArrowRight, CircleHelp, Minus, Square, Copy, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { desktopBridge } from '@/lib/desktop';
import { serverListStore } from '@/lib/server-list-store';
import { AlfyMark } from '@/components/alfy/primitives/alfy-mark';
import { NotificationCenter } from '@/components/alfy/notifications/notification-center';
import { useTranslation } from '@/components/locale-provider';

interface AppTitleBarProps {
  /** Serveur affiché, ou `null` pour les messages privés. */
  serverId: string | null;
}

/** Boutons de fenêtre — rendus seulement dans l'enveloppe desktop. */
function WindowControls() {
  const { t } = useTranslation();
  const [maximized, setMaximized] = useState(false);
  const bridge = desktopBridge();

  useEffect(() => {
    const api = desktopBridge();
    if (!api) return;
    void api.isMaximized().then(setMaximized).catch(() => {});
    // Le processus principal pousse l'état : l'utilisateur peut aussi
    // maximiser au double-clic ou au raccourci système.
    api.onWinState(({ maximized: m }) => setMaximized(m));
  }, []);

  if (!bridge) return null;

  return (
    <div className="alfy-no-drag flex shrink-0 items-center">
      <button
        type="button"
        aria-label={t.titleBar.minimize}
        onClick={() => void bridge.minimize()}
        className="flex h-8 w-11 cursor-pointer items-center justify-center text-muted outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label={maximized ? t.titleBar.restore : t.titleBar.maximize}
        onClick={() => void bridge.maximize()}
        className="flex h-8 w-11 cursor-pointer items-center justify-center text-muted outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset"
      >
        {maximized ? <Copy className="size-3.5" aria-hidden /> : <Square className="size-3.5" aria-hidden />}
      </button>
      {/* Rouge au survol : c'est la convention Windows, et la seule action
          destructrice de la rangée. */}
      <button
        type="button"
        aria-label={t.titleBar.close}
        onClick={() => void bridge.close()}
        className="flex h-8 w-11 cursor-pointer items-center justify-center text-muted outline-none transition-colors hover:bg-danger hover:text-(--danger-foreground) focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

export function AppTitleBar({ serverId }: AppTitleBarProps) {
  const { t } = useTranslation();
  const router = useRouter();

  /* La liste des serveurs porte déjà nom et icône : s'appuyer dessus évite de
     rebrancher `useAlfyChannels` (et ses écouteurs socket) juste pour un titre. */
  const servers = useSyncExternalStore(
    serverListStore.subscribe,
    serverListStore.getSnapshot,
    serverListStore.getServerSnapshot,
  );
  const server = serverId ? servers.find((s) => s.id === serverId) : undefined;
  const titre = server?.name ?? t.serverRail.dms;

  /* Masqué en mobile : 32 px de hauteur en moins pour rien, le navigateur a
     déjà son propre historique. La fenêtre desktop impose minWidth 940, elle
     reste donc toujours au-dessus du seuil `md`. */
  return (
    <header
      className="alfy-drag-region relative hidden h-8 shrink-0 items-center border-b border-separator bg-background pl-1 select-none md:flex"
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
            onPress={() => router.push('/support')}
          >
            <CircleHelp className="size-4" aria-hidden />
          </Button>
          <Tooltip.Content placement="bottom">
            <p>{t.titleBar.help}</p>
          </Tooltip.Content>
        </Tooltip>
      </div>

      <WindowControls />
    </header>
  );
}
