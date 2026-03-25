'use client';

import { useState, useRef } from 'react';
import { ChannelList } from '@/components/chat/channel-list';
import { ServerList } from '@/components/chat/server-list';
import { HugeiconsIcon } from '@hugeicons/react';
import { MessageCircleIcon, CompassIcon } from '@/components/icons';

export default function MobileMessagesPage() {
  const [panel, setPanel] = useState<0 | 1>(0); // 0 = DMs, 1 = Serveurs
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedServer,  setSelectedServer]  = useState<string | null>(null);

  /* ── Swipe ── */
  const touchStartX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 48) {
      setPanel(diff > 0 ? 1 : 0); // swipe gauche → serveurs, swipe droite → DMs
    }
  };

  return (
    <div className="flex h-dvh flex-col bg-[var(--background)]">
      {/* Tab bar */}
      <div className="flex h-11 shrink-0 items-center border-b border-[var(--border)]/40 bg-[var(--surface)]">
        <button
          onClick={() => setPanel(0)}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
            panel === 0
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <HugeiconsIcon icon={MessageCircleIcon} size={16} />
          Messages
        </button>
        <button
          onClick={() => setPanel(1)}
          className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
            panel === 1
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <HugeiconsIcon icon={CompassIcon} size={16} />
          Serveurs
        </button>
      </div>

      {/* Swipeable panels */}
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Container 200% wide, chaque panel prend 50% = 100% du viewport */}
        <div
          className="absolute inset-y-0 left-0 flex transition-transform duration-300 ease-in-out"
          style={{ width: '200%', transform: `translateX(${panel === 0 ? '0%' : '-50%'})` }}
        >
          {/* Panel 0 – DMs */}
          <div className="h-full overflow-y-auto" style={{ width: '50%' }}>
            <ChannelList
              serverId={null}
              selectedChannel={selectedChannel}
              onSelectChannel={setSelectedChannel}
            />
          </div>

          {/* Panel 1 – Serveurs */}
          <div className="flex h-full overflow-y-auto" style={{ width: '50%' }}>
            <ServerList
              selectedServer={selectedServer}
              onSelectServer={(id) => {
                setSelectedServer(id);
                // Si un serveur est sélectionné, on bascule vers le panel DMs
                // qui affichera les canaux via la navigation normale du layout
                if (id) {
                  // Stocker le serveur sélectionné pour que la sidebar principale le reprenne
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('alfychat_selected_server', id);
                  }
                  window.history.back();
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Indicateur de pagination */}
      <div className="flex h-8 shrink-0 items-center justify-center gap-2 border-t border-[var(--border)]/20">
        <button
          onClick={() => setPanel(0)}
          className={`h-1.5 rounded-full transition-all ${panel === 0 ? 'w-6 bg-[var(--accent)]' : 'w-1.5 bg-[var(--muted)]/40'}`}
          aria-label="DMs"
        />
        <button
          onClick={() => setPanel(1)}
          className={`h-1.5 rounded-full transition-all ${panel === 1 ? 'w-6 bg-[var(--accent)]' : 'w-1.5 bg-[var(--muted)]/40'}`}
          aria-label="Serveurs"
        />
      </div>
    </div>
  );
}
