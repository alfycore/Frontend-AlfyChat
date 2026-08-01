'use client';

/**
 * Layout /channels — pile de providers (appels, nav mobile, voix)
 * autour du shell alfy. Toute l'UI vit dans AlfyChannelsShell.
 */

import type { ReactNode } from 'react';
import { CallProvider } from '@/hooks/use-call-context';
import { GlobalCallAudio } from '@/components/chat/global-call-audio';
import { MobileNavProvider } from '@/hooks/use-mobile-nav';
import { VoiceProvider } from '@/hooks/use-voice';
import { AlfyChannelsShell } from '@/components/alfy/live/alfy-channels-shell';

export default function ChannelsLayout({ children }: { children: ReactNode }) {
  return (
    <CallProvider>
      <GlobalCallAudio />
      <MobileNavProvider>
        <VoiceProvider>
          <AlfyChannelsShell>{children}</AlfyChannelsShell>
        </VoiceProvider>
      </MobileNavProvider>
    </CallProvider>
  );
}
