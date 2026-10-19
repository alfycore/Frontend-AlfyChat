'use client';

/** Réglages du serveur — Invitations (créateur, code, utilisations, expiration, révocation). */

import { Avatar, Button, Spinner, Tooltip, toast } from '@heroui/react';
import { Copy, Link2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { inviteLink } from '@/lib/domains';
import { socketService } from '@/lib/socket';
import { useTranslation } from '@/components/locale-provider';
import { PageTitle } from '@/components/alfy/guild/kit';
import { copyText } from '@/components/alfy/guild/actions';
import { guildUi } from '@/components/alfy/guild/ui';
import { memberName, useGuildMembers } from '@/components/alfy/guild/hooks';

interface InviteRow {
  id: string;
  code: string;
  creatorId: string;
  uses: number;
  maxUses: number | null;
  expiresAt: string | null;
}

function normalize(raw: Record<string, unknown>): InviteRow {
  return {
    id: String(raw.id ?? raw.code ?? ''),
    code: String(raw.customSlug ?? raw.custom_slug ?? raw.code ?? ''),
    creatorId: String(raw.creatorId ?? raw.creator_id ?? raw.createdBy ?? ''),
    uses: Number(raw.uses ?? 0),
    maxUses: raw.maxUses != null || raw.max_uses != null ? Number(raw.maxUses ?? raw.max_uses) : null,
    expiresAt: (raw.expiresAt ?? raw.expires_at ?? null) as string | null,
  };
}

export function InvitesPage({ serverId }: { serverId: string }) {
  const { t, tx, intlLocale } = useTranslation();
  const members = useGuildMembers(serverId);
  const [rows, setRows] = useState<InviteRow[] | null>(null);
  const [now] = useState(() => Date.now());

  const load = useCallback(
    () =>
      socketService
        .request<{ invites?: Record<string, unknown>[] } | Record<string, unknown>[]>('INVITE_LIST', { serverId })
        .catch(() => null)
        .then((res) => {
          const list = Array.isArray(res) ? res : (res?.invites ?? []);
          setRows(list.map(normalize).filter((r) => r.code));
        }),
    [serverId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = async (row: InviteRow) => {
    setRows((r) => r?.filter((x) => x.id !== row.id) ?? r);
    const res = await socketService.request<{ error?: string }>('INVITE_DELETE', { serverId, inviteId: row.id }).catch((e: Error) => ({ error: e.message }));
    if (res?.error) {
      toast.danger(t.guild.invitesPage.revokeFailed, { description: res.error });
      void load();
    }
  };

  const remaining = useMemo(
    () => (iso: string | null) => {
      if (!iso) return t.guild.invite.never;
      const ms = new Date(iso).getTime() - now;
      if (ms <= 0) return t.guild.invitesPage.expired;
      const h = Math.floor(ms / 3_600_000);
      const d = Math.floor(h / 24);
      return d > 0 ? tx(t.guild.invitesPage.inDays, { n: d }) : h > 0 ? tx(t.guild.invitesPage.inHours, { n: h }) : tx(t.guild.invitesPage.inMinutes, { n: Math.max(1, Math.floor(ms / 60_000)) });
    },
    [now, t, tx],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageTitle description={t.guild.invitesPage.description}>{t.guild.invitesPage.title}</PageTitle>
      <Button variant="primary" className="w-fit" onPress={() => guildUi.invite(serverId)}>
        <Link2 className="size-4" aria-hidden />
        {t.guild.invitesPage.create}
      </Button>

      <div className="overflow-hidden rounded-lg border border-separator">
        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_80px_minmax(0,0.9fr)_72px] items-center gap-3 border-b border-separator bg-surface-secondary px-4 py-2 text-xs font-bold tracking-[0.02em] text-muted uppercase">
          <span>{t.guild.invitesPage.colInviter}</span>
          <span>{t.guild.invitesPage.colCode}</span>
          <span>{t.guild.invitesPage.colUses}</span>
          <span>{t.guild.invitesPage.colExpires}</span>
          <span />
        </div>
        {rows === null ? (
          <div className="flex justify-center py-10">
            <Spinner size="sm" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">{t.guild.invitesPage.none}</p>
        ) : (
          <ul className="divide-y divide-separator">
            {rows.map((row) => {
              const m = members[row.creatorId];
              return (
                <li key={row.id} className="group/inv grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_80px_minmax(0,0.9fr)_72px] items-center gap-3 px-4 py-2.5 hover:bg-foreground/4">
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar className="size-6 shrink-0">
                      {m?.user.avatarUrl && <Avatar.Image src={m.user.avatarUrl} alt="" />}
                      <Avatar.Fallback>{memberName(m, '?').slice(0, 1)}</Avatar.Fallback>
                    </Avatar>
                    <span className="truncate text-sm font-medium">{memberName(m, t.guild.chat.unknownUser)}</span>
                  </span>
                  <span className="truncate font-mono text-sm">{row.code}</span>
                  <span className="text-sm text-muted tabular-nums">
                    {row.uses}
                    {row.maxUses ? `/${row.maxUses}` : ''}
                  </span>
                  <Tooltip delay={300} closeDelay={0}>
                    <span className="truncate text-sm text-muted">{remaining(row.expiresAt)}</span>
                    {row.expiresAt && (
                      <Tooltip.Content>
                        <p>{new Intl.DateTimeFormat(intlLocale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(row.expiresAt))}</p>
                      </Tooltip.Content>
                    )}
                  </Tooltip>
                  <span className="flex justify-end gap-0.5 opacity-0 transition-opacity duration-(--dur-1) group-hover/inv:opacity-100 focus-within:opacity-100">
                    <Button isIconOnly size="sm" variant="ghost" aria-label={t.guild.invite.copy} onPress={() => void copyText(inviteLink(row.code), t.guild.menu.linkCopied)} className="text-muted">
                      <Copy className="size-4" aria-hidden />
                    </Button>
                    <Button isIconOnly size="sm" variant="ghost" aria-label={t.guild.invitesPage.revoke} onPress={() => void revoke(row)} className="text-muted hover:text-danger">
                      <X className="size-4" aria-hidden />
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
