'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { FriendsPanel } from '@/components/chat/friends-panel';

export default function ChannelMePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const handleOpenDM = (recipientId: string, _recipientName: string) => {
    router.push(`/channels/me/${recipientId}`);
  };

  // Ne pas rendre null — le layout gère le redirect vers /login
  // Retourner un fragment vide pendant le chargement (jamais null qui peut déclencher un 404 Next.js)
  if (isLoading || !user) return <></>;

  return <FriendsPanel onOpenDM={handleOpenDM} />;
}

