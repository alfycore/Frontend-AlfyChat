'use client';

import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { socketService } from '@/lib/socket';

/**
 * Hook global de notifications.
 * Écoute les événements socket (messages, amis, appels) et affiche des toasts.
 * Joue un son de notification configurable.
 */
export function useNotification() {
  const currentPathRef = useRef('');
  const notifSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialiser le son de notification
  useEffect(() => {
    // Créer un son de notification simple via AudioContext
    notifSoundRef.current = null; // On utilisera AudioContext à la place
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 600;
      gain.gain.value = 0.08;
      oscillator.type = 'sine';
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      oscillator.stop(ctx.currentTime + 0.3);
      setTimeout(() => ctx.close(), 500);
    } catch {
      // AudioContext not available
    }
  }, []);

  // Mettre à jour le chemin actuel
  useEffect(() => {
    const updatePath = () => {
      currentPathRef.current = window.location.pathname;
    };
    updatePath();
    // Écouter les changements de navigation
    const observer = new MutationObserver(updatePath);
    observer.observe(document.querySelector('head title') || document.head, {
      childList: true, subtree: true, characterData: true,
    });
    window.addEventListener('popstate', updatePath);
    return () => {
      observer.disconnect();
      window.removeEventListener('popstate', updatePath);
    };
  }, []);

  useEffect(() => {
    // ── Nouveau message ──
    const handleNewMessage = (data: any) => {
      const payload = data?.payload || data;
      if (!payload) return;

      const senderId = payload.senderId || payload.authorId;
      const myId = (window as any).__alfychat_user_id;
      // Ne pas notifier pour nos propres messages
      if (senderId === myId) return;

      // Ne pas notifier si on est déjà dans cette conversation
      const currentPath = currentPathRef.current;
      if (payload.recipientId && currentPath.includes(payload.recipientId)) return;
      if (payload.conversationId && currentPath.includes(payload.conversationId)) return;

      const senderName = payload.authorName || payload.senderName || 'Quelqu\'un';
      const content = payload.content || 'Nouveau message';
      const truncated = content.length > 80 ? content.substring(0, 80) + '…' : content;

      toast.message(senderName, {
        description: truncated,
        duration: 4000,
      });
      playNotificationSound();
    };

    // ── Demande d'ami ──
    const handleFriendRequest = (data: any) => {
      const payload = data?.payload || data;
      const name = payload?.fromUsername || payload?.username || 'Quelqu\'un';
      toast.info('Demande d\'ami', {
        description: `${name} vous a envoyé une demande d'ami`,
        duration: 5000,
      });
      playNotificationSound();
    };

    // ── Ami accepté ──
    const handleFriendAccepted = (data: any) => {
      const payload = data?.payload || data;
      const name = payload?.username || payload?.displayName || 'Un utilisateur';
      toast.success('Ami ajouté', {
        description: `${name} a accepté votre demande`,
        duration: 4000,
      });
    };

    // ── Erreur de connexion ──
    const handleDisconnect = () => {
      toast.error('Déconnecté', {
        description: 'Connexion au serveur perdue. Reconnexion...',
        duration: 5000,
      });
    };

    const handleReconnect = () => {
      toast.success('Reconnecté', {
        description: 'Connexion rétablie',
        duration: 3000,
      });
    };

    socketService.on('message:new', handleNewMessage);
    socketService.on('FRIEND_REQUEST', handleFriendRequest);
    socketService.on('FRIEND_ACCEPT', handleFriendAccepted);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('connect', handleReconnect);

    return () => {
      socketService.off('message:new', handleNewMessage);
      socketService.off('FRIEND_REQUEST', handleFriendRequest);
      socketService.off('FRIEND_ACCEPT', handleFriendAccepted);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('connect', handleReconnect);
    };
  }, [playNotificationSound]);
}

/** Fonctions utilitaires pour déclencher des toasts manuellement */
export const notify = {
  success: (title: string, description?: string) => 
    toast.success(title, { description, duration: 3000 }),
  error: (title: string, description?: string) => 
    toast.error(title, { description, duration: 5000 }),
  info: (title: string, description?: string) => 
    toast.info(title, { description, duration: 4000 }),
  warning: (title: string, description?: string) => 
    toast.warning(title, { description, duration: 4000 }),
  message: (title: string, description?: string) => 
    toast.message(title, { description, duration: 4000 }),
};
