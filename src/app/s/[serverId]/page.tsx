'use client';

/**
 * Aperçu d'un serveur public — cible des liens courts alfy.chat/s/ID.
 * Pas de code d'invitation : seul un serveur public peut être rejoint ainsi.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, Button, Spinner } from '@heroui/react';
import { Users } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { api, resolveMediaUrl } from '@/lib/api';
import { serverListStore } from '@/lib/server-list-store';
import { socketService } from '@/lib/socket';
import { AlfyAuthShell, AlfyAuthBanner } from '@/components/alfy/auth/alfy-auth-shell';

interface PublicServer {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  memberCount: number;
}

export default function PublicServerPage() {
  const params = useParams();
  const router = useRouter();
  const serverId = String(params.serverId ?? '');
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [server, setServer] = useState<PublicServer | null>(null);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    api.getPublicServer(serverId).then((res) => {
      if (res.success && res.data) setServer(res.data);
      else setError('Ce serveur est introuvable ou n’est pas public.');
    });
  }, [serverId]);

  const rejoindre = async () => {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(`/s/${serverId}`)}`);
      return;
    }
    if (!server) return;
    setJoining(true);
    const res = await api.joinServerById(server.id);
    setJoining(false);
    // Déjà membre : on ouvre simplement le serveur.
    if (!res.success && !/déjà|already/i.test(res.error ?? '')) {
      setError(res.error || 'Impossible de rejoindre ce serveur.');
      return;
    }
    const entry = { id: server.id, name: server.name, iconUrl: server.iconUrl ?? undefined };
    serverListStore.add(entry);
    socketService.getSocket()?.emit('SERVER_SELF_JOIN', entry);
    router.push(`/channels/server/${server.id}`);
  };

  const icon = resolveMediaUrl(server?.iconUrl);

  return (
    <AlfyAuthShell>
      {error ? (
        <AlfyAuthBanner message={error} />
      ) : !server || authLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-center">
          <Avatar className="size-20 rounded-2xl text-xl">
            {icon && <Avatar.Image src={icon} alt="" />}
            <Avatar.Fallback>{server.name.slice(0, 2).toUpperCase()}</Avatar.Fallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold">{server.name}</h1>
            <p className="mt-1 flex items-center justify-center gap-1 text-sm text-muted">
              <Users className="size-3.5" aria-hidden /> {server.memberCount} membre{server.memberCount > 1 ? 's' : ''}
            </p>
          </div>
          {server.description && <p className="max-w-sm whitespace-pre-line text-sm">{server.description}</p>}
          <Button onPress={rejoindre} isPending={joining}>Rejoindre le serveur</Button>
        </div>
      )}
    </AlfyAuthShell>
  );
}
