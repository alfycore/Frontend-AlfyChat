'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { getMemberPermissions } from '@/components/alfy/mock/data';
import type { AlfyMessage, AlfyRole, AlfyServer } from '@/components/alfy/mock/types';
import { MessageItem } from '@/components/alfy/chat/message-item';
import { fadeUp } from '@/components/alfy/motion';

const dayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** Groupé si même auteur et < 5 min d'écart, sans réponse intercalée. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

interface MessageListProps {
  messages: AlfyMessage[];
  server?: AlfyServer;
  currentUserId: string;
  onOpenThread?: (threadId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  /** Appelé quand l'utilisateur atteint le haut (chargement d'historique). */
  onReachTop?: () => void;
}

export function MessageList({
  messages,
  server,
  currentUserId,
  onOpenThread,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
}: MessageListProps) {
  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  // Couleur du rôle hoisted le plus haut de chaque auteur + rôles complets pour le popover profil.
  const colorByAuthor = useMemo(() => {
    const map = new Map<string, string>();
    if (!server) return map;
    for (const member of server.members) {
      const role = server.roles
        .filter((r) => member.roleIds.includes(r.id))
        .sort((a, b) => a.position - b.position)[0];
      if (role) map.set(member.userId, role.color);
    }
    return map;
  }, [server]);

  const rolesByAuthor = useMemo(() => {
    const map = new Map<string, AlfyRole[]>();
    if (!server) return map;
    for (const member of server.members) {
      map.set(member.userId, server.roles.filter((r) => member.roleIds.includes(r.id)));
    }
    return map;
  }, [server]);

  const moderatorPermissions = useMemo(
    () => (server ? getMemberPermissions(server, currentUserId) : 0),
    [server, currentUserId],
  );

  // Pré-calcul du groupage et des séparateurs de jour.
  const rows = useMemo(() => {
    const out: { message: AlfyMessage; showHeader: boolean; daySeparator?: string }[] = [];
    let prev: AlfyMessage | undefined;
    for (const m of messages) {
      const prevDay = prev && new Date(prev.createdAt).toDateString();
      const day = new Date(m.createdAt).toDateString();
      const daySeparator = day !== prevDay ? dayFmt.format(new Date(m.createdAt)) : undefined;
      const grouped =
        !daySeparator &&
        prev !== undefined &&
        prev.authorId === m.authorId &&
        !m.replyToId &&
        new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS;
      out.push({ message: m, showHeader: !grouped, daySeparator });
      prev = m;
    }
    return out;
  }, [messages]);

  return (
    <div className="flex flex-col pb-4">
      <AnimatePresence initial={false}>
        {rows.map(({ message, showHeader, daySeparator }) => (
          <motion.div key={message.id} layout="position" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
            {daySeparator && (
              <div className="my-4 flex items-center gap-3 px-4" role="separator" aria-label={daySeparator}>
                <span className="h-px flex-1 bg-separator" />
                <span className="rounded-full border border-separator bg-surface-secondary px-3 py-0.5 text-[11px] font-medium text-muted capitalize select-none">
                  {daySeparator}
                </span>
                <span className="h-px flex-1 bg-separator" />
              </div>
            )}
            <MessageItem
              message={message}
              showHeader={showHeader}
              authorColor={colorByAuthor.get(message.authorId)}
              authorRoles={rolesByAuthor.get(message.authorId)}
              allServerRoles={server?.roles}
              moderatorPermissions={moderatorPermissions}
              replyTo={message.replyToId ? byId.get(message.replyToId) : undefined}
              currentUserId={currentUserId}
              onOpenThread={onOpenThread}
              onToggleReaction={onToggleReaction}
              onEditMessage={onEditMessage}
              onDeleteMessage={onDeleteMessage}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
