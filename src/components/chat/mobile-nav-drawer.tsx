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
  return (
    <>
      {/* ── Fond assombri ─────────────────────────────────────────────────── */}
      {/* opacity & pointer-events pilotés par useSwipeDrawer */}
      <div
        ref={backdropRef as React.RefObject<HTMLDivElement>}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black will-change-[opacity] md:hidden"
        style={{ opacity: 0, pointerEvents: 'none' }}
      />

      {/* ── Tiroir principal ──────────────────────────────────────────────── */}
      <div
        ref={sidebarRef as React.RefObject<HTMLDivElement>}
        className="fixed left-0 top-0 z-50 flex shadow-[4px_0_32px_rgba(0,0,0,0.25)] will-change-transform md:hidden"
        style={{ width, bottom: 'calc(3.5rem + env(safe-area-inset-bottom))', transform: `translateX(-${width}px)` }}>
        {/* ── Rail serveurs ──────────────────────────────────────────────── */}
        {/* Le composant ServerList gère lui-même sa largeur via la densité */}
        <div className="flex h-full shrink-0 flex-col">
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
        <div className="w-px shrink-0 bg-border/40" />

        {/* ── Panneau channels ───────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-sidebar">
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
