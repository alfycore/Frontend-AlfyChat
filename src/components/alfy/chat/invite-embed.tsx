'use client';

import { Button, toast } from '@heroui/react';
import { Check } from 'lucide-react';
import { useState } from 'react';

import { SERVERS, userById } from '@/components/alfy/mock/data';
import type { AlfyInviteEmbed } from '@/components/alfy/mock/types';
import { useTranslation } from '@/components/locale-provider';

const initials = (name: string) =>
  name.split(/\s+/).filter((p) => /\w/.test(p)).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

/** Carte d'invitation riche affichée dans un message. */
export function InviteEmbed({ invite }: { invite: AlfyInviteEmbed }) {
  const { t, tx } = useTranslation();
  const server = SERVERS.find((s) => s.id === invite.serverId);
  const [joined, setJoined] = useState(false);
  if (!server) return null;

  const online = server.members.filter((m) => {
    const u = userById(m.userId);
    return u.status !== 'offline' && u.status !== 'invisible';
  }).length;

  return (
    <div className="mt-1.5 w-full max-w-md rounded-lg bg-surface-secondary p-3">
      <p className="mb-2 text-[10px] font-semibold tracking-wider text-muted uppercase">
        {t.chat.inviteBannerTitle}
      </p>
      <div className="flex items-center gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
          style={{ backgroundColor: server.selfHosted ? 'var(--alfy-node)' : 'var(--accent)' }}
        >
          {initials(server.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{server.name}</p>
          <p className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-success" /> {tx(t.chat.onlineCount, { n: online })}
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-muted" /> {tx(t.chat.membersCount, { n: server.members.length })}
            </span>
          </p>
        </div>
        <Button
          size="sm"
          variant={joined ? 'secondary' : 'primary'}
          isDisabled={joined}
          onPress={() => {
            setJoined(true);
            toast(t.chat.inviteJoinedToast, { description: server.name });
          }}
        >
          {joined ? (
            <>
              <Check className="size-3.5" /> {t.chat.inviteJoined}
            </>
          ) : (
            t.chat.inviteJoin
          )}
        </Button>
      </div>
    </div>
  );
}
