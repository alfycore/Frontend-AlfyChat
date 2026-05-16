'use client';

import { ServerList } from '@/components/chat/server-list';
import { ChannelList } from '@/components/chat/channel-list';
import { MobileDMSidebar } from '@/components/chat/mobile-dm-sidebar';
import { MobileBottomNav } from '@/components/chat/mobile-bottom-nav';
import { VoiceControlBar } from '@/components/chat/voice-control-bar';
import { useUIStyle } from '@/hooks/use-ui-style';
import { cn } from '@/lib/utils';

interface MobileNavDrawerProps {
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  backdropRef: React.RefObject<HTMLDivElement | null>;
  width: number;
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
      {/* Backdrop suppressed — sidebar is full-screen width */}
      <div ref={backdropRef as React.RefObject<HTMLDivElement>} style={{ display: 'none' }} />

      {/* ── Tiroir principal — full height, flex-col ───────────────────── */}
      <div
        ref={sidebarRef as React.RefObject<HTMLDivElement>}
        className={cn(
          'fixed left-0 top-0 z-50 flex flex-col will-change-transform md:hidden',
          ui.isGlass
            ? 'overflow-hidden border-r border-black/8 bg-white/45 shadow-[8px_0_40px_rgba(0,0,0,0.20),inset_0_0.5px_0_rgba(255,255,255,0.90)] backdrop-blur-3xl dark:border-white/10 dark:bg-[oklch(0.20_0.006_286/0.68)] dark:shadow-[8px_0_40px_rgba(0,0,0,0.45)]'
            : 'shadow-[4px_0_32px_rgba(0,0,0,0.25)]',
        )}
        style={{ width, top: 0, bottom: 0, transform: `translateX(-${width}px)` }}
      >
        {ui.isGlass && (
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_12%_10%,rgba(255,255,255,0.55),transparent_34%),radial-gradient(circle_at_95%_85%,rgba(255,255,255,0.20),transparent_38%)] dark:bg-[radial-gradient(circle_at_12%_10%,rgba(255,255,255,0.12),transparent_34%),radial-gradient(circle_at_95%_85%,rgba(255,255,255,0.07),transparent_38%)]" />
        )}

        {/* ── Main area (server rail + content) ─────────────────────── */}
        <div className="relative z-10 flex min-h-0 flex-1 overflow-hidden">

          {/* Server rail — always visible */}
          <div className="flex h-full shrink-0 flex-col">
            <ServerList
              selectedServer={activeServerId}
              onSelectServer={(id) => {
                onSelectServer(id);
                if (id === null) onClose();
              }}
            />
          </div>

          {/* Separator */}
          <div className={cn('w-px shrink-0', ui.isGlass ? 'bg-black/9 dark:bg-white/10' : 'bg-border/40')} />

          {/* Content — DM list or channel list */}
          <div className={cn('flex min-w-0 flex-1 flex-col overflow-hidden', !ui.isGlass && 'bg-sidebar')}>
            {!activeServerId ? (
              <MobileDMSidebar
                selectedChannel={selectedChannel}
                onSelectChannel={onSelectChannel}
                onClose={onClose}
              />
            ) : (
              <>
                <ChannelList
                  serverId={activeServerId}
                  selectedChannel={selectedChannel}
                  onSelectChannel={(ch) => { onSelectChannel(ch); onClose(); }}
                  onOpenSettings={() => { onOpenSettings(); onClose(); }}
                />
                <VoiceControlBar />
              </>
            )}
          </div>
        </div>

        {/* ── Bottom nav — embedded inside the drawer ───────────────── */}
        <div className="relative z-10">
          <MobileBottomNav embedded />
        </div>
      </div>
    </>
  );
}
