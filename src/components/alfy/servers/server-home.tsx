'use client';

import { Avatar, Button, Chip } from '@heroui/react';
import { ArrowRight, Globe, Hash, Lock, Rocket, Server, Users } from 'lucide-react';
import type { CSSProperties } from 'react';

import type { AlfyMember, AlfyServer, AlfyUser } from '@/components/alfy/mock/types';
import { CHANNEL_TYPE_ICONS } from '@/components/alfy/servers/channel-item';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { cn } from '@/lib/utils';

const HOSTING_LABEL: Record<'standard' | 'community', string> = { standard: 'Standard', community: 'Communautaire' };

const initiales = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

interface ServerHomeProps {
  server: AlfyServer;
  members: AlfyMember[];
  users: Map<string, AlfyUser>;
  onOpenChannel: (channelId: string) => void;
  onCreateChannel?: () => void;
}

/** Page d'accueil d'un serveur — affichée tant qu'aucun salon n'est sélectionné. */
export function ServerHome({ server, members, users, onOpenChannel, onCreateChannel }: ServerHomeProps) {
  const isPlatform = !server.selfHosted && server.hostingType !== 'certified_host';
  const textChannels = server.channels.filter((c) => c.type === 'text' || c.type === 'announcement');
  const voiceChannels = server.channels.filter((c) => c.type === 'voice');
  const firstTextChannel = textChannels[0] ?? server.channels.find((c) => c.type !== 'voice');

  const onlineMembers = members
    .map((m) => users.get(m.userId))
    .filter((u): u is AlfyUser => !!u && u.status !== 'offline' && u.status !== 'invisible');
  const otherMembers = members
    .map((m) => users.get(m.userId))
    .filter((u): u is AlfyUser => !!u && (u.status === 'offline' || u.status === 'invisible'));
  const sortedMembers = [...onlineMembers, ...otherMembers];

  const fondBanniere = server.bannerUrl
    ? { backgroundImage: `url(${server.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {
        background:
          'linear-gradient(135deg, var(--accent) 0%, color-mix(in oklch, var(--accent) 40%, var(--surface)) 55%, var(--surface-2) 100%)',
      };

  return (
    <div className="h-full min-w-0 flex-1 overflow-y-auto bg-surface">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
        {/* ── Bannière / identité ─────────────────────────────────────── */}
        <div className="at-fade-up overflow-hidden rounded-3xl bg-surface-2" style={{ animationDelay: '20ms' } as CSSProperties}>
          <div className="h-36 w-full sm:h-44" style={fondBanniere as CSSProperties} />
          <div className="px-6 pb-6 sm:px-8">
            <div className="-mt-10 mb-3 flex items-end gap-4 sm:-mt-12">
              <span className="block rounded-3xl bg-surface p-1.5">
                <Avatar className="size-20 sm:size-24">
                  {server.iconUrl && <Avatar.Image src={server.iconUrl} alt="" />}
                  <Avatar.Fallback className="text-2xl">{initiales(server.name)}</Avatar.Fallback>
                </Avatar>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{server.name}</h1>
              <Chip size="sm" variant="soft" className="cursor-default">
                {server.isPublic ? <Globe className="size-2.5" aria-hidden /> : <Lock className="size-2.5" aria-hidden />}
                <Chip.Label>{server.isPublic ? 'Public' : 'Privé'}</Chip.Label>
              </Chip>
              {isPlatform && (
                <Chip size="sm" variant="soft" className="cursor-default">
                  <Chip.Label>{HOSTING_LABEL[server.hostingCategory ?? 'standard']}</Chip.Label>
                </Chip>
              )}
              {server.selfHosted && (
                <Chip size="sm" color={server.nodeOnline ? 'success' : 'warning'} variant="soft" className="cursor-default">
                  <Server className="size-2.5" aria-hidden />
                  <Chip.Label>{server.nodeOnline ? 'Auto-hébergé' : 'Nœud hors ligne'}</Chip.Label>
                </Chip>
              )}
            </div>

            {server.description && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{server.description}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Chip size="sm" variant="soft" className="cursor-default">
                <Users className="size-3" aria-hidden />
                <Chip.Label>{members.length} membre{members.length > 1 ? 's' : ''}</Chip.Label>
              </Chip>
              <Chip size="sm" variant="soft" className="cursor-default">
                <span className="size-1.5 rounded-full bg-success" aria-hidden />
                <Chip.Label>{onlineMembers.length} en ligne</Chip.Label>
              </Chip>
              <Chip size="sm" variant="soft" className="cursor-default">
                <Hash className="size-3" aria-hidden />
                <Chip.Label>{textChannels.length} salon{textChannels.length > 1 ? 's' : ''} texte</Chip.Label>
              </Chip>
              {voiceChannels.length > 0 && (
                <Chip size="sm" variant="soft" className="cursor-default">
                  <Chip.Label>{voiceChannels.length} vocal{voiceChannels.length > 1 ? 'aux' : ''}</Chip.Label>
                </Chip>
              )}
            </div>
          </div>
        </div>

        {/* ── Corps ────────────────────────────────────────────────────── */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          {/* Salons */}
          <section className="at-fade-up rounded-2xl bg-surface-2 p-4 sm:p-5" style={{ animationDelay: '60ms' } as CSSProperties}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">Salons</p>
                <h2 className="mt-0.5 text-lg font-bold tracking-tight">Explorer le serveur</h2>
              </div>
              {firstTextChannel && (
                <Button size="sm" onPress={() => onOpenChannel(firstTextChannel.id)}>
                  <Rocket className="size-3.5" aria-hidden />
                  Ouvrir le salon principal
                </Button>
              )}
            </div>

            {server.channels.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-10 text-center">
                <p className="text-sm text-muted">Aucun salon pour l&apos;instant.</p>
                {onCreateChannel && (
                  <Button size="sm" variant="secondary" onPress={onCreateChannel}>
                    Créer le premier salon
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {server.channels
                  .slice(0, 16)
                  .map((ch) => {
                    const Icon = CHANNEL_TYPE_ICONS[ch.type];
                    const isVoice = ch.type === 'voice';
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        disabled={isVoice}
                        onClick={() => !isVoice && onOpenChannel(ch.id)}
                        className={cn(
                          'group/ch flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors',
                          'focus-visible:ring-2 focus-visible:ring-focus',
                          isVoice ? 'cursor-default opacity-70' : 'cursor-pointer hover:bg-surface-3',
                        )}
                      >
                        <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{ch.name}</span>
                            {ch.type === 'announcement' && (
                              <Chip size="sm" variant="soft" className="cursor-default text-[10px]">
                                <Chip.Label>Annonce</Chip.Label>
                              </Chip>
                            )}
                            {isVoice && (
                              <Chip size="sm" variant="soft" className="cursor-default text-[10px]">
                                <Chip.Label>Vocal</Chip.Label>
                              </Chip>
                            )}
                          </span>
                          {ch.topic && <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{ch.topic}</span>}
                        </span>
                        {!isVoice && (
                          <ArrowRight
                            className="mt-0.5 size-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover/ch:opacity-100"
                            aria-hidden
                          />
                        )}
                      </button>
                    );
                  })}
                {server.channels.length > 16 && (
                  <p className="px-3 pt-1 text-xs text-muted">+{server.channels.length - 16} autres salons</p>
                )}
              </div>
            )}
          </section>

          {/* Membres */}
          <section className="at-fade-up rounded-2xl bg-surface-2 p-4 sm:p-5" style={{ animationDelay: '100ms' } as CSSProperties}>
            <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">Membres</p>
            <h2 className="mt-0.5 mb-4 text-lg font-bold tracking-tight">Sur ce serveur</h2>

            {sortedMembers.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted">
                Aucun membre à afficher.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {sortedMembers.slice(0, 10).map((u) => (
                  <div key={u.id} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-surface-3">
                    <AlfyAvatar name={u.displayName} avatarUrl={u.avatarUrl} size="sm" status={u.status} statusRingClass="ring-surface-2" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{u.displayName}</span>
                      <span className="block truncate text-xs text-muted">@{u.username}</span>
                    </span>
                  </div>
                ))}
                {sortedMembers.length > 10 && (
                  <p className="px-2 pt-1 text-xs text-muted">+{sortedMembers.length - 10} autres membres</p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
