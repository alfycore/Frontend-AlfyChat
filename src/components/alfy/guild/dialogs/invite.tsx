'use client';

/**
 * « Inviter des amis sur … » (gabarit Discord) : recherche d'amis avec bouton
 * « Inviter » (envoie le lien en MP), lien prêt à copier, et réglages du lien
 * (expiration, utilisations max) qui en génèrent un nouveau.
 */

import { Avatar, Button, Input, Label, ListBox, Modal, SearchField, Select, Spinner, toast } from '@heroui/react';
import { Check, Copy, Settings2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useTranslation } from '@/components/locale-provider';
import { inviteLink } from '@/lib/domains';
import { socketService } from '@/lib/socket';
import { cn } from '@/lib/utils';
import { useAlfyFriends } from '@/components/alfy/live/use-alfy-friends';
import { CHANNEL_ICONS } from '@/components/alfy/guild/channel-icons';
import { useGuildChannel, useGuildInfo } from '@/components/alfy/guild/hooks';
import { guildUi, useGuildUi } from '@/components/alfy/guild/ui';

const DAY = 86_400;
const EXPIRY = [1800, 3600, 6 * 3600, 12 * 3600, DAY, 7 * DAY, 0] as const;
const USES = [0, 1, 5, 10, 25, 50, 100] as const;

/** Lien réutilisé tant que l'on reste sur les mêmes réglages (comme Discord). */
const linkCache = new Map<string, { code: string; expiresAt: number | null }>();

function cachedCode(serverId: string): string | null {
  const cached = linkCache.get(serverId);
  return cached && (!cached.expiresAt || cached.expiresAt > Date.now()) ? cached.code : null;
}

async function requestInvite(serverId: string, exp: number, uses: number): Promise<string> {
  const res = await socketService.request<{ code?: string; inviteCode?: string; error?: string }>(
    'INVITE_CREATE',
    { serverId, ...(exp ? { expiresIn: exp } : { isPermanent: true }), ...(uses ? { maxUses: uses } : {}) },
    10_000,
  );
  const next = res?.inviteCode ?? res?.code;
  if (!next) throw new Error(res?.error ?? 'INVITE_FAILED');
  linkCache.set(serverId, { code: next, expiresAt: exp ? Date.now() + exp * 1000 : null });
  return next;
}

export function InviteDialog() {
  const req = useGuildUi((s) => s.invite);
  return (
    <Modal isOpen={!!req} onOpenChange={(open) => !open && guildUi.close('invite')}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[440px]">{req && <Content serverId={req.serverId} channelId={req.channelId ?? null} />}</Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function Content({ serverId, channelId }: { serverId: string; channelId: string | null }) {
  const { t, tx } = useTranslation();
  const info = useGuildInfo(serverId);
  const channel = useGuildChannel(serverId, channelId);
  const { friends, loading } = useAlfyFriends();
  const [query, setQuery] = useState('');
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [code, setCode] = useState<string | null>(() => cachedCode(serverId));
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [expiry, setExpiry] = useState<number>(7 * DAY);
  const [maxUses, setMaxUses] = useState<number>(0);
  // Pas de lien en cache : la génération démarre au montage (état initial « en cours »).
  const [generating, setGenerating] = useState(() => !cachedCode(serverId));

  const generate = async (exp = expiry, uses = maxUses) => {
    setGenerating(true);
    try {
      setCode(await requestInvite(serverId, exp, uses));
    } catch (e) {
      toast.danger(t.guild.invite.failed, { description: (e as Error).message });
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (cachedCode(serverId)) return;
    let cancelled = false;
    requestInvite(serverId, 7 * DAY, 0)
      .then((next) => !cancelled && setCode(next))
      .catch((e: Error) => !cancelled && toast.danger(t.guild.invite.failed, { description: e.message }))
      .finally(() => !cancelled && setGenerating(false));
    return () => {
      cancelled = true;
    };
  }, [serverId, t]);

  const link = code ? inviteLink(code) : '';
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return friends.filter((f) => !q || f.displayName.toLowerCase().includes(q) || f.username.toLowerCase().includes(q));
  }, [friends, query]);

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* refus du presse-papiers */
    }
  };

  const sendTo = (userId: string) => {
    if (!link) return;
    socketService.sendMessage({ recipientId: userId, content: link });
    setSent((s) => new Set(s).add(userId));
  };

  const ChannelIcon = channel ? (CHANNEL_ICONS[channel.type] ?? CHANNEL_ICONS.text) : null;
  const expiryLabel = (s: number) =>
    s === 0
      ? t.guild.invite.never
      : s < 3600
        ? tx(t.guild.invite.minutes, { n: s / 60 })
        : s < DAY
          ? tx(t.guild.invite.hours, { n: s / 3600 })
          : tx(s === DAY ? t.guild.invite.day : t.guild.invite.days, { n: s / DAY });

  return (
    <>
      <Modal.CloseTrigger />
      <Modal.Header className="flex-col items-start gap-1">
        <Modal.Heading className="text-base font-semibold">{tx(t.guild.invite.title, { name: info?.name ?? '' })}</Modal.Heading>
        {channel && ChannelIcon && (
          <p className="flex items-center gap-1 text-sm text-muted">
            {t.guild.invite.recipientsLand}
            <ChannelIcon className="size-3.5" aria-hidden />
            <span className="font-medium text-foreground">{channel.name}</span>
          </p>
        )}
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-4">
        <SearchField value={query} onChange={setQuery} aria-label={t.guild.invite.searchFriends}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder={t.guild.invite.searchFriends} />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        <div className="-mx-2 max-h-56 min-h-24 overflow-y-auto">
          {loading && friends.length === 0 ? (
            <div className="flex justify-center py-6">
              <Spinner size="sm" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{friends.length === 0 ? t.guild.invite.noFriends : t.guild.invite.noMatch}</p>
          ) : (
            <ul className="flex flex-col">
              {filtered.map((f) => {
                const done = sent.has(f.id);
                return (
                  <li key={f.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors duration-(--dur-1) hover:bg-foreground/5">
                    <Avatar className="size-8">
                      {f.avatarUrl && <Avatar.Image src={f.avatarUrl} alt="" />}
                      <Avatar.Fallback>{f.displayName.slice(0, 1)}</Avatar.Fallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{f.displayName}</span>
                      <span className="block truncate text-xs text-muted">{f.username}</span>
                    </span>
                    <Button
                      size="sm"
                      variant={done ? 'ghost' : 'secondary'}
                      isDisabled={done || !link}
                      onPress={() => sendTo(f.id)}
                      className={cn('min-w-20', done && 'text-success')}
                    >
                      {done ? (
                        <>
                          <Check className="size-3.5" aria-hidden />
                          {t.guild.invite.sent}
                        </>
                      ) : (
                        t.guild.invite.invite
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-separator pt-4">
          <p className="text-xs font-bold tracking-[0.02em] text-muted uppercase">{t.guild.invite.orSendLink}</p>
          <div className="flex items-center gap-2 rounded-md bg-field-background p-1 pl-3">
            <Input aria-label={t.guild.invite.link} value={generating && !link ? '…' : link} readOnly className="min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none" />
            <Button size="sm" variant={copied ? 'secondary' : 'primary'} onPress={() => void copy()} isDisabled={!link} className={cn('min-w-24', copied && 'bg-success text-(--success-foreground)')}>
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? t.guild.invite.copied : t.guild.invite.copy}
            </Button>
          </div>
          {!editing ? (
            <p className="text-xs text-muted">
              {tx(t.guild.invite.expiresIn, { when: expiryLabel(expiry) })}{' '}
              <button type="button" onClick={() => setEditing(true)} className="cursor-pointer font-medium text-accent hover:underline">
                {t.guild.invite.editLink}
              </button>
            </p>
          ) : (
            <div className="alfy-enter mt-1 flex flex-col gap-3 rounded-lg border border-separator p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Settings2 className="size-4 text-muted" aria-hidden />
                {t.guild.invite.linkSettings}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Select value={String(expiry)} onChange={(k) => setExpiry(Number(k))} aria-label={t.guild.invite.expireAfter}>
                  <Label className="text-xs text-muted">{t.guild.invite.expireAfter}</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {EXPIRY.map((s) => (
                        <ListBox.Item key={s} id={String(s)} textValue={expiryLabel(s)}>
                          {expiryLabel(s)}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                <Select value={String(maxUses)} onChange={(k) => setMaxUses(Number(k))} aria-label={t.guild.invite.maxUses}>
                  <Label className="text-xs text-muted">{t.guild.invite.maxUses}</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {USES.map((n) => (
                        <ListBox.Item key={n} id={String(n)} textValue={n === 0 ? t.guild.invite.noLimit : tx(t.guild.invite.uses, { n })}>
                          {n === 0 ? t.guild.invite.noLimit : tx(t.guild.invite.uses, { n })}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="tertiary" onPress={() => setEditing(false)}>
                  {t.common.cancel}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  isPending={generating}
                  onPress={async () => {
                    await generate(expiry, maxUses);
                    setEditing(false);
                  }}
                >
                  {t.guild.invite.generate}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal.Body>
    </>
  );
}
