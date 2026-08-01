'use client';

import { Button, toast } from '@heroui/react';
import { Check } from 'lucide-react';
import { useState } from 'react';

import { SERVERS, userById } from '@/components/alfy/mock/data';
import type { AlfyInviteEmbed } from '@/components/alfy/mock/types';

const initials = (name: string) =>
  name.split(/\s+/).filter((p) => /\w/.test(p)).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

/** Carte d'invitation riche affichée dans un message. */
export function InviteEmbed({ invite }: { invite: AlfyInviteEmbed }) {
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
        Tu as été invité·e à rejoindre un serveur
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
              <span className="size-1.5 rounded-full bg-success" /> {online} en ligne
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-muted" /> {server.members.length} membres
            </span>
          </p>
        </div>
        <Button
          size="sm"
          variant={joined ? 'secondary' : 'primary'}
          isDisabled={joined}
          onPress={() => {
            setJoined(true);
            toast('Serveur rejoint', { description: server.name });
          }}
        >
          {joined ? (
            <>
              <Check className="size-3.5" /> Rejoint
            </>
          ) : (
            'Rejoindre'
          )}
        </Button>
      </div>
    </div>
  );
}
