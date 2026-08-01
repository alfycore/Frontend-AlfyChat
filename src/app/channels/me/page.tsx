'use client';

import { useAuth } from '@/hooks/use-auth';
import { AlfyFriends } from '@/components/alfy/live/alfy-friends';

export default function ChannelMePage() {
  const { user, isLoading } = useAuth();

  // Ne pas rendre null — le layout gère le redirect vers /login
  if (isLoading || !user) return <></>;

  return <AlfyFriends />;
}
