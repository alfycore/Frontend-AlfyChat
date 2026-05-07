'use client';

/**
 * MobileNavDrawer — tiroir de navigation mobile façon Discord.
 *
 * Structure :
 *   ┌──────────────────────────────┐
 *   │ [Rail serveurs] │ [Channels] │
 *   │    ~68 px       │   fill     │
 *   └──────────────────────────────┘
 *
 * L'animation (swipe + snap) est pilotée par le hook `useSwipeDrawer`
 * dans layout.tsx. Ce composant reçoit les deux refs directement.
 */

import { ServerList } from '@/components/chat/server-list';
import { ChannelList } from '@/components/chat/channel-list';
import { VoiceControlBar } from '@/components/chat/voice-control-bar';
import { useUIStyle } from '@/hooks/use-ui-style';
import { cn } from '@/lib/utils';

interface MobileNavDrawerProps {
  /** Ref DOM attachée à la div principale du tiroir (utilisée par useSwipeDrawer). */
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  /** Ref DOM attachée au fond assombri (utilisée par useSwipeDrawer). */
  backdropRef: React.RefObject<HTMLDivElement | null>;
  /** Largeur totale du tiroir en px. */
  width: number;
  /** Ferme le tiroir (utilisé après sélection d'un channel). */
  onClose: () => void;
  activeServerId: string | null;
  selectedChannel: string | null;
  onSelectServer: (id: string | null) => void;
  onSelectChannel: (ch: string | null) => void;
  onOpenSettings: () => void;
}

export function MobileNavDrawer({
  sidebarRef,
  backdropRef,
  width,
  onClose,
  activeServerId,
  selectedChannel,
  onSelectServer,
  onSelectChannel,
  onOpenSettings,
}: MobileNavDrawerProps) {
  const ui = useUIStyle();

  return (
    <>
      {/* ── Fond assombri ─────────────────────────────────────────────────── */}
      {/* opacity & pointer-events pilotés par useSwipeDrawer */}
      <div
        ref={backdropRef as React.RefObject<HTMLDivElement>}
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 will-change-[opacity] md:hidden',
          ui.isGlass ? 'bg-black/40 backdrop-blur-[2px]' : 'bg-black',
        )}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />

      {/* ── Tiroir principal ──────────────────────────────────────────────── */}
      <div
        ref={sidebarRef as React.RefObject<HTMLDivElement>}
        className={cn(
          'fixed left-0 top-0 z-50 flex will-change-transform md:hidden',
          ui.isGlass
            ? 'overflow-hidden rounded-r-[1.4rem] border border-black/[0.08] bg-white/[0.45] shadow-[8px_0_40px_rgba(0,0,0,0.20),inset_0_0.5px_0_rgba(255,255,255,0.90)] backdrop-blur-3xl dark:border-white/[0.10] dark:bg-[oklch(0.20_0.006_286/0.68)] dark:shadow-[8px_0_40px_rgba(0,0,0,0.45)]'
            : 'shadow-[4px_0_32px_rgba(0,0,0,0.25)]',
        )}
        style={{ width, bottom: 'calc(3.5rem + env(safe-area-inset-bottom))', transform: `translateX(-${width}px)` }}>
        {ui.isGlass && (
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_12%_10%,rgba(255,255,255,0.55),transparent_34%),radial-gradient(circle_at_95%_85%,rgba(255,255,255,0.20),transparent_38%)] dark:bg-[radial-gradient(circle_at_12%_10%,rgba(255,255,255,0.12),transparent_34%),radial-gradient(circle_at_95%_85%,rgba(255,255,255,0.07),transparent_38%)]" />
        )}

        {/* ── Rail serveurs ──────────────────────────────────────────────── */}
        {/* Le composant ServerList gère lui-même sa largeur via la densité */}
        <div className="relative z-10 flex h-full shrink-0 flex-col">
          <ServerList
            selectedServer={activeServerId}
            onSelectServer={(id) => {
              onSelectServer(id);
              // Fermer le tiroir seulement si l'user navigue vers les DMs
              // (sélection d'un serveur → il faut afficher les channels côté droit)
              if (id === null) onClose();
            }}
          />
        </div>

        {/* ── Séparateur ─────────────────────────────────────────────────── */}
        <div className={cn('relative z-10 w-px shrink-0', ui.isGlass ? 'bg-black/[0.09] dark:bg-white/[0.10]' : 'bg-border/40')} />

        {/* ── Panneau channels ───────────────────────────────────────────── */}
        <div className={cn('relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden', !ui.isGlass && 'bg-sidebar')}>
          <ChannelList
            serverId={activeServerId}
            selectedChannel={selectedChannel}
            onSelectChannel={(ch) => {
              onSelectChannel(ch);
              onClose();
            }}
            onOpenSettings={() => {
              onOpenSettings();
              onClose();
            }}
          />
          <VoiceControlBar />
        </div>
      </div>
    </>
  );
}
