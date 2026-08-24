'use client';

/**
 * Container de sidebar : salons d'un serveur ou liste des DM,
 * branchés sur les vraies données. Remplace atelier/chrome/Sidebar.tsx.
 *
 * Gestion des salons/catégories : passe par les événements socket
 * CHANNEL_CREATE/UPDATE/DELETE (le gateway vérifie MANAGE_CHANNELS, persiste
 * et rediffuse à `server:${serverId}` — `useAlfyChannels` est déjà abonné à
 * ces événements, donc la sidebar se met à jour toute seule après une
 * mutation, sans état local à gérer ici).
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertDialog, Button, toast } from '@heroui/react';

import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { ChannelSidebar } from '@/components/alfy/servers/channel-sidebar';
import { DmSidebar } from '@/components/alfy/servers/dm-sidebar';
import { CreateChannelDialog } from '@/components/alfy/servers/create-channel-dialog';
import { RenameDialog } from '@/components/alfy/servers/rename-dialog';
import { UserDirectoryProvider, makeResolver } from '@/components/alfy/user-directory';
import { useAlfyChannels } from '@/components/alfy/live/use-alfy-channels';
import { useAlfyDms } from '@/components/alfy/live/use-alfy-dms';
import { usePinnedConversations } from '@/components/alfy/live/use-pinned-conversations';
import { toAlfyUser } from '@/components/alfy/live/map';
import type { AlfyUser } from '@/components/alfy/mock/types';
import { useTranslation } from '@/components/locale-provider';

interface AlfySidebarProps {
  serverId: string | null;
  activeChannelId: string | null;
  activeDmId: string | null;
  friendsActive: boolean;
  /** `tab` permet d'entrer directement sur un onglet (ex. « invites »). */
  onOpenServerSettings: (tab?: string) => void;
  onOpenUserSettings: () => void;
}

export function AlfySidebar({
  serverId,
  activeChannelId,
  activeDmId,
  friendsActive,
  onOpenServerSettings,
  onOpenUserSettings,
}: AlfySidebarProps) {
  const { t, tx } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const server = useAlfyChannels(serverId);
  const { entries, groups } = useAlfyDms();
  const { pinnedIds, togglePin } = usePinnedConversations();

  const currentUser: AlfyUser = useMemo(
    () => toAlfyUser(user as Record<string, unknown> | null, 'me'),
    [user],
  );

  // Annuaire réel : destinataires des DM + soi-même.
  const resolver = useMemo(() => {
    const table = new Map<string, AlfyUser>();
    entries.forEach((e) => table.set(e.user.id, e.user));
    if (currentUser.id) table.set(currentUser.id, currentUser);
    return makeResolver(table);
  }, [entries, currentUser]);

  // Remonte les erreurs de gestion de salons (permission refusée côté
  // gateway…) — les mutations elles-mêmes sont fire-and-forget (même
  // convention que l'édition de rôles), la sidebar se met à jour via le
  // rebroadcast CHANNEL_*.
  useEffect(() => {
    const onError = (data: unknown) => {
      const d = data as { type?: string; payload?: { message?: string } };
      if (d?.type !== 'CHANNEL_ERROR') return;
      toast.danger(t.chatUI.sidebar.channelActionErrorTitle, { description: d.payload?.message ?? t.chatUI.sidebar.channelActionErrorDefaultDesc });
    };
    socketService.on('ERROR', onError);
    return () => socketService.off('ERROR', onError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Propriétaire uniquement pour l'instant : un membre avec MANAGE_CHANNELS
  // via un rôle (sans être owner) ne verra pas ces raccourcis dans la
  // sidebar, mais garde l'onglet Salons des réglages serveur (le gateway
  // vérifie la vraie permission de toute façon, cette variable ne pilote
  // que l'affichage des raccourcis).
  const canManage = !!server && !!currentUser.id && server.ownerId === currentUser.id;

  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'channel' | 'category'>('channel');
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; kind: 'channel' | 'category' } | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);

  /* « Quitter le serveur » figurait au menu sans aucun gestionnaire : le clic
     fermait simplement le menu. Le point de sortie existait pourtant déjà côté
     API, tout comme les libellés traduits. */
  const quitterServeur = async () => {
    if (!serverId) return;
    setLeaveOpen(false);
    const res = await api.leaveServer(serverId);
    if (res && (res as { success?: boolean }).success === false) {
      toast.danger(t.chatUI.sidebar.channelActionErrorTitle, {
        description: (res as { error?: string }).error ?? t.chatUI.sidebar.channelActionErrorDefaultDesc,
      });
      return;
    }
    toast(t.chatUI.sidebar.serverLeft);
    router.push('/channels/me');
  };

  if (serverId && server) {
    const categories = server.categories.filter((c) => c.id !== '__root__');

    return (
      <UserDirectoryProvider value={resolver}>
        <ChannelSidebar
          server={server}
          currentUser={currentUser}
          activeChannelId={activeChannelId}
          onSelectChannel={(id) => router.push(`/channels/server/${serverId}/${id}`)}
          onOpenServerSettings={() => onOpenServerSettings()}
          onInvite={() => onOpenServerSettings('invites')}
          onLeave={server.ownerId === currentUser.id ? undefined : () => setLeaveOpen(true)}
          onOpenUserSettings={onOpenUserSettings}
          connectedVoiceChannel={null}
          canManage={canManage}
          onCreateChannel={(parentId) => {
            setCreateMode('channel');
            setCreateParentId(parentId);
            setCreateOpen(true);
          }}
          onCreateCategory={() => {
            setCreateMode('category');
            setCreateParentId(null);
            setCreateOpen(true);
          }}
          onRenameChannel={(id) => {
            const ch = server.channels.find((c) => c.id === id);
            if (ch) setRenameTarget({ id, name: ch.name });
          }}
          onDeleteChannel={(id) => {
            const ch = server.channels.find((c) => c.id === id);
            setDeleteTarget({ id, name: ch?.name ?? t.chatUI.sidebar.defaultChannelName, kind: 'channel' });
          }}
          onMoveChannel={(id, direction) => {
            const list = server.channels.filter((c) => c.categoryId === server.channels.find((x) => x.id === id)?.categoryId);
            const i = list.findIndex((c) => c.id === id);
            const j = direction === 'up' ? i - 1 : i + 1;
            if (i < 0 || j < 0 || j >= list.length) return;
            socketService.updateChannel(serverId, list[i].id, { position: j });
            socketService.updateChannel(serverId, list[j].id, { position: i });
          }}
          onRenameCategory={(id) => {
            const cat = server.categories.find((c) => c.id === id);
            if (cat) setRenameTarget({ id, name: cat.name });
          }}
          onDeleteCategory={(id) => {
            const cat = server.categories.find((c) => c.id === id);
            setDeleteTarget({ id, name: cat?.name ?? t.chatUI.sidebar.defaultCategoryName, kind: 'category' });
          }}
          onMoveCategory={(id, direction) => {
            const i = categories.findIndex((c) => c.id === id);
            const j = direction === 'up' ? i - 1 : i + 1;
            if (i < 0 || j < 0 || j >= categories.length) return;
            socketService.updateChannel(serverId, categories[i].id, { position: j });
            socketService.updateChannel(serverId, categories[j].id, { position: i });
          }}
        />

        <CreateChannelDialog
          isOpen={createOpen}
          onOpenChange={setCreateOpen}
          mode={createMode}
          categories={categories}
          defaultCategoryId={createParentId}
          onCreate={({ name, type, parentId }) => {
            socketService.createChannel(serverId, {
              name,
              type,
              parentId: parentId ?? undefined,
            });
          }}
        />
        <RenameDialog
          isOpen={!!renameTarget}
          onOpenChange={(open) => !open && setRenameTarget(null)}
          title={t.chatUI.sidebar.renameChannelTitle}
          fieldLabel={t.chatUI.sidebar.renameFieldLabel}
          initialValue={renameTarget?.name ?? ''}
          onSave={(name) => {
            if (renameTarget) socketService.updateChannel(serverId, renameTarget.id, { name });
          }}
        />

        <AlertDialog isOpen={leaveOpen} onOpenChange={setLeaveOpen}>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-100">
                <AlertDialog.Header>
                  <AlertDialog.Icon status="danger" />
                  <AlertDialog.Heading>{t.chatUI.sidebar.leaveTitle}</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <p>{t.chatUI.sidebar.leaveDesc}</p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button slot="close" variant="tertiary">
                    {t.chatUI.sidebar.leaveCancel}
                  </Button>
                  <Button variant="danger" onPress={() => void quitterServeur()}>
                    {t.chatUI.sidebar.leaveConfirm}
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>

        <AlertDialog isOpen={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-100">
                <AlertDialog.Header>
                  <AlertDialog.Icon status="danger" />
                  <AlertDialog.Heading>
                    {tx(
                      deleteTarget?.kind === 'category'
                        ? t.chatUI.sidebar.deleteCategoryHeading
                        : t.chatUI.sidebar.deleteChannelHeading,
                      { name: deleteTarget?.name ?? '' },
                    )}
                  </AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <p>
                    {deleteTarget?.kind === 'category'
                      ? t.chatUI.sidebar.deleteCategoryBody
                      : t.chatUI.sidebar.deleteChannelBody}
                  </p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button slot="close" variant="tertiary">
                    {t.common.cancel}
                  </Button>
                  <Button
                    variant="danger"
                    onPress={() => {
                      if (deleteTarget) socketService.deleteChannel(serverId, deleteTarget.id);
                      setDeleteTarget(null);
                    }}
                  >
                    {t.chatUI.sidebar.deleteConfirm}
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      </UserDirectoryProvider>
    );
  }

  return (
    <UserDirectoryProvider value={resolver}>
      <DmSidebar
        dms={entries.map((e) => e.dm)}
        groups={groups}
        onSelectGroup={(id) => router.push(`/channels/groups/${id}`)}
        currentUser={currentUser}
        activeDmId={activeDmId}
        friendsActive={friendsActive}
        onSelectDm={(id) => {
          const entry = entries.find((e) => e.dm.id === id);
          if (entry) router.push(`/channels/me/${entry.dm.recipientId}`);
        }}
        onOpenFriends={() => router.push('/channels/me')}
        onOpenUserSettings={onOpenUserSettings}
        pinnedIds={pinnedIds}
        onTogglePin={togglePin}
      />
    </UserDirectoryProvider>
  );
}
