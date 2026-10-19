'use client';

/**
 * Page d'invitation (/invite/[code]) — ce que voit quelqu'un qui clique un
 * lien d'invitation, connecté ou non.
 *
 * Au gabarit Discord : qui t'invite, le serveur, combien de monde est là, un
 * seul bouton. Le bouton s'adapte (se connecter, accepter, ouvrir si l'on est
 * déjà membre) et les impasses — banni, serveur plein, lien expiré ou épuisé —
 * sont dites AVANT le clic, d'après l'aperçu, au lieu d'un échec au moment de
 * rejoindre. Une fois accepté : coche, « Bienvenue », puis le serveur s'ouvre.
 */

import { Alert, Avatar, Button, Card, Chip, Separator, Skeleton, Spinner } from '@heroui/react';
import { Clock, Link2Off, LogIn, RotateCw, TimerOff, UserPlus, Users, WifiOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ComponentType } from 'react';

import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { serverListStore } from '@/lib/server-list-store';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/components/locale-provider';
import { GuildIconFace } from '@/components/alfy/guild/rail/guild-icon';

/* ── Données ──────────────────────────────────────────────────────────────── */

export interface InvitePreview {
  server: {
    id: string;
    name: string;
    description?: string | null;
    iconUrl?: string | null;
    bannerUrl?: string | null;
    ownerId?: string;
    memberCount: number;
    /** `null` : présence indisponible (on n'affiche pas un faux « 0 en ligne »). */
    onlineCount?: number | null;
    isFull?: boolean;
  };
  invite: {
    code: string;
    customSlug?: string | null;
    maxUses: number | null;
    uses: number;
    expiresAt: string | null;
    isPermanent: boolean;
  };
  inviter?: { id: string; username: string; displayName: string; avatarUrl: string | null } | null;
  /** Visiteur connecté uniquement. */
  viewer?: { isMember: boolean; isBanned: boolean } | null;
}

type DeadEnd = 'expired' | 'exhausted' | 'notFound' | 'network';
type Load = { kind: 'loading' } | { kind: 'ready'; data: InvitePreview } | { kind: 'dead'; reason: DeadEnd };
type Phase = 'idle' | 'joining' | 'joined';

/** Motif d'échec, d'après le code machine du service (ou, à défaut, le statut HTTP). */
function deadEndOf(res: { status?: number; data?: unknown }): DeadEnd {
  const code = (res.data as { code?: string } | undefined)?.code;
  if (code === 'INVITE_EXPIRED') return 'expired';
  if (code === 'INVITE_EXHAUSTED') return 'exhausted';
  if (code === 'INVITE_NOT_FOUND' || code === 'SERVER_NOT_FOUND' || res.status === 404) return 'notFound';
  if (res.status === 410) return 'expired';
  return 'network';
}

/** « dans 3 jours » — lit l'horloge, donc hors du rendu pur. */
function relativeFromNow(iso: string, locale: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute');
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), 'hour');
  return rtf.format(Math.round(diff / 86_400_000), 'day');
}

/** Gabarit « {name} t'invite… » rendu avec le nom en gras. */
function WithName({ template, name }: { template: string; name: string }) {
  const [before, after = ''] = template.split('{name}');
  return (
    <>
      {before}
      <span className="font-semibold text-foreground">{name}</span>
      {after}
    </>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export function InviteView({ code }: { code: string }) {
  const { t, intlLocale } = useTranslation();
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [joinError, setJoinError] = useState<string | null>(null);

  // Rechargé quand l'identité est connue : l'aperçu dit alors « déjà membre »
  // ou « banni ». Les données déjà affichées restent pendant ce rafraîchissement.
  const viewerKey = authLoading ? 'pending' : (user?.id ?? 'anon');
  useEffect(() => {
    let alive = true;
    void api.resolveInvite(code).then((res) => {
      if (!alive) return;
      const data = res.data as InvitePreview | undefined;
      setLoad(res.success && data?.server ? { kind: 'ready', data } : { kind: 'dead', reason: deadEndOf(res) });
    });
    return () => {
      alive = false;
    };
  }, [code, attempt, viewerKey]);

  // Le serveur s'ouvrira sans attente après l'acceptation.
  const serverId = load.kind === 'ready' ? load.data.server.id : null;
  useEffect(() => {
    if (serverId && isAuthenticated) router.prefetch(`/channels/server/${serverId}`);
  }, [serverId, isAuthenticated, router]);

  const back = `/invite/${encodeURIComponent(code)}`;
  const goLogin = () => router.push(`/login?next=${encodeURIComponent(back)}`);
  const goRegister = () => router.push(`/register?next=${encodeURIComponent(back)}`);
  const goHome = () => router.push(isAuthenticated ? '/channels/me' : '/');
  const retry = () => {
    setLoad({ kind: 'loading' });
    setAttempt((n) => n + 1);
  };

  const accept = async () => {
    if (load.kind !== 'ready' || phase !== 'idle') return;
    const data = load.data;
    if (!isAuthenticated) return goLogin();
    if (data.viewer?.isMember) return router.push(`/channels/server/${data.server.id}`);

    setPhase('joining');
    setJoinError(null);
    const res = await api.joinServer(code);
    if (!res.success) {
      setPhase('idle');
      const errCode = (res.data as { code?: string } | undefined)?.code;
      if (errCode === 'INVITE_EXPIRED' || errCode === 'INVITE_EXHAUSTED' || errCode === 'INVITE_NOT_FOUND') {
        setLoad({ kind: 'dead', reason: deadEndOf(res) });
      } else if (errCode === 'BANNED') {
        setLoad({ kind: 'ready', data: { ...data, viewer: { isMember: false, isBanned: true } } });
      } else if (errCode === 'SERVER_FULL') {
        setLoad({ kind: 'ready', data: { ...data, server: { ...data.server, isFull: true } } });
      } else {
        setJoinError(res.error || t.invite.cannotJoin);
      }
      return;
    }

    const joined = res.data as { serverId: string; name: string; iconUrl?: string | null; ownerId?: string };
    // Rail à jour tout de suite ; la passerelle rejoint les rooms (tous les
    // onglets) et annonce le nouveau membre au serveur.
    serverListStore.add({
      id: joined.serverId,
      name: joined.name,
      iconUrl: resolveMediaUrl(joined.iconUrl),
      ownerId: joined.ownerId,
    });
    socketService.emit('SERVER_SELF_JOIN', { serverId: joined.serverId, name: joined.name, iconUrl: joined.iconUrl });
    setPhase('joined');
    window.setTimeout(() => router.replace(`/channels/server/${joined.serverId}`), 1100);
  };

  const banner = load.kind === 'ready' ? resolveMediaUrl(load.data.server.bannerUrl) : undefined;

  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <Backdrop bannerUrl={banner} />
      <div className="relative z-10 flex w-full max-w-[440px] flex-col items-center gap-5">
        {load.kind === 'loading' && <InviteSkeleton />}
        {load.kind === 'dead' && (
          <DeadEndCard reason={load.reason} loggedIn={isAuthenticated} onRetry={retry} onHome={goHome} />
        )}
        {load.kind === 'ready' && (
          <InviteCard
            data={load.data}
            locale={intlLocale}
            phase={phase}
            joinError={joinError}
            authPending={authLoading}
            loggedIn={isAuthenticated}
            onAccept={() => void accept()}
            onLogin={goLogin}
            onRegister={goRegister}
            onHome={goHome}
          />
        )}
        <p className="text-xs text-muted">{t.invite.footer}</p>
      </div>
    </main>
  );
}

/* ── Fond ─────────────────────────────────────────────────────────────────── */

function Backdrop({ bannerUrl }: { bannerUrl?: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {bannerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bannerUrl}
          alt=""
          className="at-fade absolute inset-0 size-full scale-125 object-cover opacity-40 blur-3xl saturate-150"
        />
      ) : (
        <>
          <div
            className="inv-halo absolute -top-1/4 -left-1/4 size-[70vmax] rounded-full"
            style={{ background: 'radial-gradient(closest-side, color-mix(in oklab, var(--accent) 34%, transparent), transparent)' }}
          />
          <div
            className="inv-halo inv-halo-b absolute -right-1/4 -bottom-1/3 size-[60vmax] rounded-full"
            style={{ background: 'radial-gradient(closest-side, color-mix(in oklab, var(--accent) 18%, transparent), transparent)' }}
          />
        </>
      )}
      {/* Vignette : la carte reste lisible quelle que soit la bannière. */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, color-mix(in oklab, var(--background) 25%, transparent) 0%, var(--background) 80%)' }}
      />
    </div>
  );
}

/* ── Carte d'invitation ───────────────────────────────────────────────────── */

function InviteCard({
  data,
  locale,
  phase,
  joinError,
  authPending,
  loggedIn,
  onAccept,
  onLogin,
  onRegister,
  onHome,
}: {
  data: InvitePreview;
  locale: string;
  phase: Phase;
  joinError: string | null;
  authPending: boolean;
  loggedIn: boolean;
  onAccept: () => void;
  onLogin: () => void;
  onRegister: () => void;
  onHome: () => void;
}) {
  const { t, tx } = useTranslation();
  const { server, invite, inviter, viewer } = data;
  const nf = new Intl.NumberFormat(locale);
  const icon = resolveMediaUrl(server.iconUrl);
  const banner = resolveMediaUrl(server.bannerUrl);

  const spotsLeft = invite.maxUses ? Math.max(0, invite.maxUses - invite.uses) : null;
  const expiry = invite.isPermanent || !invite.expiresAt ? t.invite.neverExpires : tx(t.invite.expiresIn, { when: relativeFromNow(invite.expiresAt, locale) });

  return (
    <Card className="inv-card w-full overflow-hidden p-0" aria-label={tx(t.invite.aria, { name: server.name })}>
      {banner && (
        <div
          aria-hidden
          className="h-24 w-full bg-cover bg-center"
          style={{
            backgroundImage: `url(${banner})`,
            maskImage: 'linear-gradient(to bottom, black 40%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent)',
          }}
        />
      )}

      <Card.Content className={banner ? 'flex flex-col items-center px-6 pb-6 text-center' : 'flex flex-col items-center px-6 pt-8 pb-6 text-center'}>
        <div className={banner ? 'inv-icon -mt-12' : 'inv-icon'}>
          <GuildIconFace
            name={server.name}
            iconUrl={icon}
            className="size-20 rounded-[26px] text-2xl shadow-lg ring-4 ring-(--surface)"
          />
        </div>

        <div className="inv-stagger mt-4 flex w-full flex-col items-center gap-1.5">
          <p className="flex items-center justify-center gap-2 text-sm text-muted">
            {inviter ? (
              <>
                <Avatar className="size-5 shrink-0">
                  {inviter.avatarUrl && <Avatar.Image src={resolveMediaUrl(inviter.avatarUrl)} alt="" />}
                  <Avatar.Fallback className="text-[9px]">{inviter.displayName.slice(0, 1).toUpperCase()}</Avatar.Fallback>
                </Avatar>
                <span>
                  <WithName template={t.invite.invitedBy} name={inviter.displayName} />
                </span>
              </>
            ) : (
              t.invite.invitedGeneric
            )}
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-balance text-foreground">{server.name}</h1>

          {server.description && <p className="line-clamp-2 max-w-sm text-sm text-pretty text-muted">{server.description}</p>}

          <div className="mt-1 flex items-center justify-center gap-4 text-sm text-muted">
            {typeof server.onlineCount === 'number' && (
              <span className="flex items-center gap-1.5">
                <span className="inv-live-dot size-2 rounded-full bg-success" />
                {tx(t.invite.online, { n: nf.format(server.onlineCount) })}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-muted/60" />
              {server.memberCount === 1 ? t.invite.membersOne : tx(t.invite.membersMany, { n: nf.format(server.memberCount) })}
            </span>
          </div>
        </div>
      </Card.Content>

      <Separator />

      <Card.Footer className="flex flex-col gap-3 px-6 py-5">
        {phase === 'joined' ? (
          <JoinedState name={server.name} />
        ) : viewer?.isBanned ? (
          <>
            <Notice status="danger" text={t.invite.banned} />
            <Button fullWidth variant="secondary" onPress={onHome}>
              {t.invite.openApp}
            </Button>
          </>
        ) : server.isFull && !viewer?.isMember ? (
          <>
            <Notice status="warning" text={t.invite.full} />
            <Button fullWidth variant="secondary" onPress={onHome}>
              {loggedIn ? t.invite.openApp : t.invite.backHome}
            </Button>
          </>
        ) : !authPending && !loggedIn ? (
          <>
            <Button fullWidth size="lg" variant="primary" onPress={onLogin}>
              <LogIn className="size-4" />
              {t.invite.loginToJoin}
            </Button>
            <Button fullWidth variant="secondary" onPress={onRegister}>
              <UserPlus className="size-4" />
              {t.invite.createAccount}
            </Button>
            <p className="text-center text-xs text-muted">{t.invite.loginHint}</p>
          </>
        ) : viewer?.isMember ? (
          <>
            <Notice status="accent" text={t.invite.alreadyMember} />
            <Button fullWidth size="lg" variant="primary" onPress={onAccept}>
              {t.invite.openServer}
            </Button>
          </>
        ) : (
          <>
            {joinError && <Notice status="danger" text={joinError} />}
            <Button fullWidth size="lg" variant="primary" isPending={phase === 'joining'} isDisabled={authPending} onPress={onAccept}>
              {({ isPending }) => (
                <>
                  {isPending && <Spinner color="current" size="sm" />}
                  {t.invite.accept}
                </>
              )}
            </Button>
            <Button fullWidth variant="ghost" onPress={onHome}>
              {t.invite.notNow}
            </Button>
          </>
        )}

        {phase !== 'joined' && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Chip size="sm" variant="soft">
              <Clock className="size-3" />
              <Chip.Label>{expiry}</Chip.Label>
            </Chip>
            {spotsLeft !== null && (
              <Chip size="sm" variant="soft" color={spotsLeft <= 3 ? 'warning' : 'default'}>
                <Users className="size-3" />
                <Chip.Label>{spotsLeft === 1 ? t.invite.usesLeftOne : tx(t.invite.usesLeftMany, { n: nf.format(spotsLeft) })}</Chip.Label>
              </Chip>
            )}
          </div>
        )}
      </Card.Footer>
    </Card>
  );
}

function Notice({ status, text }: { status: 'accent' | 'warning' | 'danger'; text: string }) {
  return (
    <Alert status={status} className="at-fade-up">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{text}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

/** Coche tracée + onde : le serveur s'ouvre juste après. */
function JoinedState({ name }: { name: string }) {
  const { t, tx } = useTranslation();
  return (
    <div role="status" className="at-fade flex flex-col items-center gap-2 py-1 text-center">
      <span className="relative flex size-11 items-center justify-center rounded-full bg-success text-success-foreground">
        <span aria-hidden className="inv-success-ring absolute inset-0 rounded-full bg-success" />
        <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="inv-check relative size-5">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <p className="font-semibold text-foreground">{tx(t.invite.welcome, { name })}</p>
      <p className="flex items-center gap-2 text-sm text-muted">
        <Spinner color="current" size="sm" />
        {t.invite.opening}
      </p>
    </div>
  );
}

/* ── Impasses ─────────────────────────────────────────────────────────────── */

function DeadEndCard({
  reason,
  loggedIn,
  onRetry,
  onHome,
}: {
  reason: DeadEnd;
  loggedIn: boolean;
  onRetry: () => void;
  onHome: () => void;
}) {
  const { t } = useTranslation();
  const copy: Record<DeadEnd, { icon: ComponentType<{ className?: string }>; title: string; text: string; tone: string }> = {
    expired: { icon: TimerOff, title: t.invite.expiredTitle, text: t.invite.expiredText, tone: 'bg-warning/12 text-warning' },
    exhausted: { icon: Users, title: t.invite.exhaustedTitle, text: t.invite.exhaustedText, tone: 'bg-warning/12 text-warning' },
    notFound: { icon: Link2Off, title: t.invite.notFoundTitle, text: t.invite.notFoundText, tone: 'bg-danger/12 text-danger' },
    network: { icon: WifiOff, title: t.invite.networkTitle, text: t.invite.networkText, tone: 'bg-surface-secondary text-muted' },
  };
  const { icon: Icon, title, text, tone } = copy[reason];

  return (
    <Card className="inv-card w-full p-0">
      <Card.Content className="flex flex-col items-center px-6 pt-8 pb-6 text-center">
        <span className={`inv-icon flex size-14 items-center justify-center rounded-2xl ${tone}`}>
          <Icon className="size-6" />
        </span>
        <div className="inv-stagger mt-4 flex flex-col items-center gap-1.5">
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="max-w-xs text-sm text-pretty text-muted">{text}</p>
        </div>
      </Card.Content>
      <Card.Footer className="flex flex-col gap-2 px-6 pb-6">
        {reason === 'network' && (
          <Button fullWidth variant="primary" onPress={onRetry}>
            <RotateCw className="size-4" />
            {t.invite.retry}
          </Button>
        )}
        <Button fullWidth variant={reason === 'network' ? 'secondary' : 'primary'} onPress={onHome}>
          {loggedIn ? t.invite.openApp : t.invite.backHome}
        </Button>
      </Card.Footer>
    </Card>
  );
}

/* ── Chargement ───────────────────────────────────────────────────────────── */

function InviteSkeleton() {
  return (
    <Card className="w-full p-0" aria-busy>
      <Card.Content className="flex flex-col items-center gap-3 px-6 pt-8 pb-6">
        <Skeleton className="size-20 rounded-[26px]" />
        <Skeleton className="mt-1 h-3.5 w-44 rounded-sm" />
        <Skeleton className="h-6 w-56 rounded-sm" />
        <Skeleton className="h-3.5 w-36 rounded-sm" />
      </Card.Content>
      <Separator />
      <Card.Footer className="flex flex-col gap-3 px-6 py-5">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="mx-auto h-5 w-32 rounded-full" />
      </Card.Footer>
    </Card>
  );
}
