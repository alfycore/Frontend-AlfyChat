'use client';

/**
 * Panneaux de droite :
 *  - MP     : carte de profil du contact + section chiffrement (empreinte, vérification) ;
 *  - groupe : membres en ligne / hors ligne, propriétaire, ajout de membres.
 */

import { Button, ScrollShadow, Separator, Tooltip } from '@heroui/react';
import { Crown, KeyRound, ShieldAlert, ShieldCheck, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { AlfyMarkdown } from '@/components/alfy/chat/markdown';
import { UserPopover } from '@/components/alfy/members/user-popover';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import type { AlfyUser } from '@/components/alfy/mock/types';
import { getPublicKey, keyFingerprint } from '@/lib/e2ee/public-keys';
import { vault } from '@/lib/e2ee/vault';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import type { GroupMeta } from '@/components/alfy/conversation/types';

/* ── MP : profil ───────────────────────────────────────────────────────────── */

function useKeyState(userId: string) {
  const [state, setState] = useState<{ fingerprint: string | null; verified: boolean } | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const key = await getPublicKey(userId);
      const [fingerprint, trust] = await Promise.all([key ? keyFingerprint(key) : Promise.resolve(null), vault.trustGet(userId)]);
      if (alive) setState({ fingerprint, verified: Boolean(key && trust?.ecdhKey === key && trust.verifiedAt) });
    })();
    return () => {
      alive = false;
    };
  }, [userId]);
  return state;
}

export function UserPanel({ user, onVerify }: { user: AlfyUser; onVerify: () => void }) {
  const { t, intlLocale } = useTranslation();
  const key = useKeyState(user.id);
  const since = user.createdAt ? new Date(user.createdAt) : null;

  return (
    <ScrollShadow className="alfy-thin-scroll h-full overflow-y-auto">
      <div className="relative">
        <div
          className="h-28 w-full bg-cover bg-center"
          style={user.bannerUrl ? { backgroundImage: `url(${user.bannerUrl})` } : { background: user.bannerColor || 'color-mix(in oklab, var(--accent) 45%, var(--surface))' }}
        />
        <div className="absolute -bottom-10 left-4 rounded-full ring-6 ring-(--alfy-sidebar)">
          <AlfyAvatar name={user.displayName} avatarUrl={user.avatarUrl} size="lg" status={user.status} statusRingClass="ring-(--alfy-sidebar)" className="size-20" />
        </div>
      </div>

      <div className="px-4 pt-12 pb-4">
        <h2 className="truncate text-xl font-bold text-foreground">{user.displayName}</h2>
        <p className="truncate text-sm text-muted">@{user.username}</p>
        {user.customStatus && <p className="mt-2 text-sm text-foreground/90">{user.customStatus}</p>}

        <div className="mt-4 flex flex-col gap-4 rounded-xl border border-border bg-surface p-3">
          {user.bio && (
            <section>
              <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{t.conv.panel.aboutMe}</h3>
              <div className="text-sm text-foreground/90">
                <AlfyMarkdown content={user.bio} mentions={[]} />
              </div>
            </section>
          )}
          {since && !Number.isNaN(since.getTime()) && (
            <section>
              <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{t.conv.panel.memberSince}</h3>
              <p className="text-sm text-foreground/90">{since.toLocaleDateString(intlLocale, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </section>
          )}
          <Separator />
          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{t.conv.panel.encryption}</h3>
            <div className="flex items-center gap-2 text-sm">
              {key?.verified ? <ShieldCheck className="size-4 text-success" aria-hidden /> : <ShieldAlert className="size-4 text-muted" aria-hidden />}
              <span className={key?.verified ? 'text-success' : 'text-muted'}>{key?.verified ? t.conv.e2ee.verified : t.conv.e2ee.unverified}</span>
            </div>
            {key?.fingerprint && (
              <p className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                <KeyRound className="size-3.5" aria-hidden />
                {t.conv.panel.keyFingerprint}
                <span className="font-mono text-foreground">{key.fingerprint}</span>
              </p>
            )}
            <Button size="sm" variant="secondary" className="mt-3 w-full" onPress={onVerify}>
              <ShieldCheck className="size-4" aria-hidden />
              {t.conv.e2ee.verify}
            </Button>
          </section>
        </div>
      </div>
    </ScrollShadow>
  );
}

/* ── Groupe : membres ──────────────────────────────────────────────────────── */

export function MembersPanel({
  group,
  people,
  me,
  onAddMembers,
}: {
  group: GroupMeta | undefined;
  people: (id: string) => AlfyUser;
  me: string;
  onAddMembers?: () => void;
}) {
  const { t, tx } = useTranslation();
  const users = useMemo(() => (group?.memberIds ?? []).map(people), [group, people]);
  const byName = (a: AlfyUser, b: AlfyUser) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' });
  const online = users.filter((u) => u.status !== 'offline' && u.status !== 'invisible').sort(byName);
  const offline = users.filter((u) => u.status === 'offline' || u.status === 'invisible').sort(byName);

  const row = (u: AlfyUser, dim: boolean) => (
    <UserPopover
      key={u.id}
      user={u}
      isSelf={u.id === me}
      placement="left"
      triggerClassName={cn(
        'flex h-11 w-full cursor-pointer items-center gap-3 rounded-md px-2 text-left outline-none transition-[background-color,opacity] duration-(--dur-1)',
        'hover:bg-foreground/6 focus-visible:ring-2 focus-visible:ring-focus',
        dim && 'opacity-40 hover:opacity-100',
      )}
    >
      <AlfyAvatar name={u.displayName} avatarUrl={u.avatarUrl} size="sm" status={dim ? undefined : u.status} statusRingClass="ring-(--alfy-sidebar)" />
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate text-[15px] font-medium text-foreground/90">{u.displayName}</span>
          {u.id === me && <span className="shrink-0 text-xs text-muted">({t.conv.panel.you})</span>}
          {group?.ownerId === u.id && (
            <Tooltip delay={200} closeDelay={0}>
              <Crown className="size-3.5 shrink-0 text-warning" aria-label={t.conv.panel.owner} />
              <Tooltip.Content>
                <p>{t.conv.panel.owner}</p>
              </Tooltip.Content>
            </Tooltip>
          )}
        </span>
        {u.customStatus && !dim && <span className="truncate text-xs text-muted">{u.customStatus}</span>}
      </span>
    </UserPopover>
  );

  return (
    <ScrollShadow className="alfy-thin-scroll h-full overflow-y-auto px-2 pb-4">
      {onAddMembers && (
        <Button size="sm" variant="secondary" className="mt-3 w-full" onPress={onAddMembers}>
          <UserPlus className="size-4" aria-hidden />
          {t.conv.header.addMembers}
        </Button>
      )}
      {online.length > 0 && (
        <>
          <h3 className="flex h-10 items-end px-2 pb-1 text-[11px] font-semibold tracking-[0.04em] text-muted uppercase">{tx(t.conv.panel.online, { n: online.length })}</h3>
          {online.map((u) => row(u, false))}
        </>
      )}
      {offline.length > 0 && (
        <>
          <h3 className="flex h-10 items-end px-2 pb-1 text-[11px] font-semibold tracking-[0.04em] text-muted uppercase">{tx(t.conv.panel.offline, { n: offline.length })}</h3>
          {offline.map((u) => row(u, true))}
        </>
      )}
    </ScrollShadow>
  );
}
