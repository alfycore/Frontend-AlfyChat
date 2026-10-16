'use client';

/**
 * Profil public — cible des liens courts alfy.chat/u/PSEUDO.
 * Connecté : écrire ou demander en ami. Sinon : se connecter puis revenir ici.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, Button, Spinner, toast } from '@heroui/react';
import { MessageSquare, UserPlus } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { api, resolveMediaUrl } from '@/lib/api';
import { AlfyAuthShell, AlfyAuthBanner } from '@/components/alfy/auth/alfy-auth-shell';

interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = decodeURIComponent(String(params.username ?? '')).replace(/^@/, '');
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.getUserByUsername(username).then((res) => {
      if (res.success && res.data) setProfile(res.data);
      else setError('Cet utilisateur est introuvable.');
    });
  }, [username]);

  const requireLogin = () => router.push(`/login?next=${encodeURIComponent(`/u/${username}`)}`);

  const envoyerMessage = () => {
    if (!isAuthenticated) return requireLogin();
    if (profile) router.push(`/channels/me/${profile.id}`);
  };

  const ajouterAmi = async () => {
    if (!isAuthenticated) return requireLogin();
    if (!profile) return;
    setSending(true);
    const res = await api.sendFriendRequest(profile.id);
    setSending(false);
    if (res.success) toast('Demande d’ami envoyée', { description: profile.displayName || profile.username });
    else toast.danger(res.error || 'Impossible d’envoyer la demande.');
  };

  const isMe = Boolean(user && profile && user.id === profile.id);
  const avatar = resolveMediaUrl(profile?.avatarUrl);
  const initials = (profile?.displayName || profile?.username || '?').slice(0, 2).toUpperCase();

  return (
    <AlfyAuthShell>
      {error ? (
        <AlfyAuthBanner message={error} />
      ) : !profile || authLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-center">
          <Avatar className="size-20 text-xl">
            {avatar && <Avatar.Image src={avatar} alt="" />}
            <Avatar.Fallback>{initials}</Avatar.Fallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold">{profile.displayName || profile.username}</h1>
            <p className="text-sm text-muted">@{profile.username}</p>
          </div>
          {profile.bio && <p className="max-w-sm whitespace-pre-line text-sm">{profile.bio}</p>}
          {!isMe && (
            <div className="flex gap-2">
              <Button onPress={envoyerMessage}>
                <MessageSquare className="size-4" /> Envoyer un message
              </Button>
              <Button variant="secondary" onPress={ajouterAmi} isPending={sending}>
                <UserPlus className="size-4" /> Ajouter en ami
              </Button>
            </div>
          )}
        </div>
      )}
    </AlfyAuthShell>
  );
}
