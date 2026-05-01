'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { socketService } from '@/lib/socket';

/**
 * Layout /channels/server/[serverId] — délègue la sidebar au parent channels/layout.tsx.
 * Gère uniquement la vérification d'appartenance + kick/ban.
 * VoiceProvider est dans channels/layout.tsx.
 */
export default function ServerLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const serverId = params?.serverId as string;

  // Verify membership
  useEffect(() => {
    if (!serverId || !user) return;
    socketService.requestServerInfo(serverId, (data: any) => {
      if (data?.error === 'NOT_MEMBER') {
        setTimeout(() => {
          socketService.requestServerInfo(serverId, (retry: any) => {
            if (retry?.error === 'NOT_MEMBER') router.replace('/channels/me');
          });
        }, 1500);
      }
    });
  }, [serverId, user, router]);

  // Kick / ban
  useEffect(() => {
    const handle = (d: any) => {
      const id = d?.payload?.serverId ?? d?.serverId;
      if (id === serverId) router.push('/channels/me');
    };
    socketService.on('SERVER_KICKED', handle);
    socketService.on('SERVER_BANNED', handle);
    return () => {
      socketService.off('SERVER_KICKED', handle);
      socketService.off('SERVER_BANNED', handle);
    };
  }, [serverId, router]);

  return <>{children}</>;
}
