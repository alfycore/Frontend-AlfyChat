'use client';

import { useParams } from 'next/navigation';

import { GuildIndex } from '@/components/alfy/guild/routes';

/** Pas de page d'accueil vide : on rouvre le dernier salon (ou le premier salon textuel). */
export default function ServerIndexPage() {
  const params = useParams();
  return <GuildIndex serverId={params?.serverId as string} />;
}
