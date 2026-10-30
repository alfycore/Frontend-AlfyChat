'use client';

/**
 * Autorisation OAuth2 / ajout d'un bot à un serveur (alfychat.app/oauth2/authorize).
 * Reste sur l'app : c'est ici que l'utilisateur est connecté. Le portail
 * développeur, lui, vit sur le site (alfychat.com/developers/bots).
 */

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BadgeCheck, Check, ShieldCheck } from 'lucide-react';
import { Button, Label, ListBox, Select, Skeleton, Spinner, buttonVariants } from '@heroui/react';
import Link from 'next/link';

import { useAuth } from '@/hooks/use-auth';
import { api, resolveMediaUrl } from '@/lib/api';
import { useTranslation } from '@/components/locale-provider';
import { AlfyAuthBanner, AlfyAuthHeading, AlfyAuthShell } from '@/components/alfy/auth/alfy-auth-shell';

interface PublicApp {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  isVerified: boolean;
  redirectUris: string[];
}

interface ServerItem {
  id: string;
  name: string;
  iconUrl?: string;
  ownerId?: string;
  role?: string;
}

function AppAvatar({ app }: { app: PublicApp }) {
  return app.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolveMediaUrl(app.avatarUrl)} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
  ) : (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent/12 font-heading text-base text-accent" aria-hidden>
      {app.name[0]?.toUpperCase()}
    </span>
  );
}

function AuthorizeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const o = t.pages.oauth2;
  const SCOPE_LABELS: Record<string, { label: string; desc: string }> = {
    identify: { label: o.scopeIdentifyLabel, desc: o.scopeIdentifyDesc },
    guilds: { label: o.scopeGuildsLabel, desc: o.scopeGuildsDesc },
  };

  const clientId = searchParams.get('client_id') || '';
  const scope = searchParams.get('scope') || 'bot';
  const permissions = parseInt(searchParams.get('permissions') || '0', 10) || 0;
  const redirectUri = searchParams.get('redirect_uri') || '';
  const state = searchParams.get('state') || '';

  const scopes = scope.split(' ').filter(Boolean);
  const hasBotScope = scopes.includes('bot');

  const [app, setApp] = useState<PublicApp | null>(null);
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [selectedServer, setSelectedServer] = useState('');
  const [loadingApp, setLoadingApp] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push(`/login?next=${encodeURIComponent(window.location.href)}`);
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || authLoading) return;
    if (!clientId) {
      setError(o.clientIdMissing);
      setLoadingApp(false);
      return;
    }
    Promise.all([
      api.getOAuth2Application(clientId),
      hasBotScope ? api.getServers() : Promise.resolve({ success: true, data: { servers: [] } } as never),
    ])
      .then(async ([appRes, serversRes]) => {
        if (!appRes.success) {
          setError(o.appNotFound);
          return;
        }
        setApp((appRes.data as { app: PublicApp }).app);
        if (hasBotScope && serversRes.success) {
          // /api/servers renvoie le tableau brut (anciennement lu dans `.servers`, toujours vide).
          const raw = serversRes.data as ServerItem[] | { servers?: ServerItem[] };
          const all: ServerItem[] = Array.isArray(raw) ? raw : raw?.servers ?? [];
          // Seuls le propriétaire et les administrateurs (bit ADMIN 0x40) peuvent installer un bot :
          // la liste ne porte pas les droits, on les lit pour les serveurs dont on n'est pas propriétaire.
          const allowed = await Promise.all(
            all.map(async (s) => {
              if (s.ownerId === user.id) return true;
              const res = await api.get<{ isOwner?: boolean; permissions?: number }>(
                `/api/servers/${encodeURIComponent(s.id)}/members/${encodeURIComponent(user.id)}/permissions`,
              );
              return !!res.success && (!!res.data?.isOwner || ((res.data?.permissions ?? 0) & 0x40) !== 0);
            }),
          );
          setServers(all.filter((_, i) => allowed[i]));
        }
      })
      .catch(() => setError(o.loadError))
      .finally(() => setLoadingApp(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, hasBotScope, user, authLoading]);

  const authorize = async () => {
    if (!app || (hasBotScope && !selectedServer)) return;
    setAuthorizing(true);
    setError('');
    try {
      const res = await api.oauth2Authorize({
        clientId: app.id,
        serverId: hasBotScope ? selectedServer : undefined,
        redirectUri,
        scopes,
        permissions,
        state: state || undefined,
      });
      if (res.success && res.data) {
        const { redirectUri: callbackUrl, installed } = res.data as { redirectUri?: string; installed?: boolean };
        if (callbackUrl) {
          window.location.href = callbackUrl;
          return;
        }
        if (installed && selectedServer) {
          router.push(`/channels/server/${selectedServer}`);
          return;
        }
      } else {
        setError(res.error || o.authDenied);
      }
    } catch {
      setError(o.genericError);
    }
    setAuthorizing(false);
  };

  const cancel = () => {
    if (!redirectUri) return router.push('/');
    try {
      const url = new URL(redirectUri);
      url.searchParams.set('error', 'access_denied');
      if (state) url.searchParams.set('state', state);
      window.location.href = url.toString();
    } catch {
      router.push('/');
    }
  };

  const permList = t.pages.developers.permissions.filter((p: { bit: number }) => (permissions & p.bit) !== 0);
  const extraScopes = scopes.filter((s) => s !== 'bot' && SCOPE_LABELS[s]);
  let redirectDomain = '';
  try {
    redirectDomain = redirectUri ? new URL(redirectUri).hostname : '';
  } catch {
    /* URI invalide : le serveur la refusera */
  }

  if (authLoading || (!user && !error)) {
    return <div className="flex min-h-dvh items-center justify-center bg-background"><Spinner /></div>;
  }

  return (
    <AlfyAuthShell>
      {loadingApp ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-md" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
      ) : !app ? (
        <div className="flex flex-col gap-5">
          <AlfyAuthHeading title={o.appNotFoundTitle} subtitle={error} />
          <Link href="/" className={buttonVariants({ variant: 'secondary', fullWidth: true })}>{o.backHome}</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <AlfyAuthHeading title={o.title} subtitle={o.subtitle} />

          <div className="flex items-start gap-3 rounded-2xl bg-surface p-4">
            <AppAvatar app={app} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <span className="truncate">{app.name}</span>
                {app.isVerified && <BadgeCheck className="size-4 shrink-0 text-accent" aria-label={o.verifiedBadge} />}
              </p>
              <p className="mt-0.5 text-[13px] text-muted">{hasBotScope ? o.wantsBotAccess : o.wantsAccountAccess}</p>
              {app.description && <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted">{app.description}</p>}
            </div>
          </div>

          {hasBotScope && (
            servers.length === 0 ? (
              <AlfyAuthBanner variant="warning" message={o.noAdminServer} />
            ) : (
              <Select
                selectedKey={selectedServer || null}
                onSelectionChange={(k) => setSelectedServer(k ? String(k) : '')}
                placeholder={o.chooseServerOption}
              >
                <Label>{o.addToServerLabel}</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {servers.map((s) => (
                      <ListBox.Item key={s.id} id={s.id} textValue={s.name}>
                        <Label>{s.name}</Label>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            )
          )}

          {(permList.length > 0 || extraScopes.length > 0) && (
            <div className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
              {permList.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{o.permissionsLabel}</p>
                  <ul className="flex flex-col gap-1.5">
                    {permList.map((p: { label: string; desc: string }) => (
                      <li key={p.label} className="flex items-start gap-2 text-[13px]">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
                        <span><span className="font-medium text-foreground">{p.label}</span> <span className="text-muted">{p.desc}</span></span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {extraScopes.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{o.requestedAccessLabel}</p>
                  <ul className="flex flex-col gap-1.5">
                    {extraScopes.map((s) => (
                      <li key={s} className="flex items-start gap-2 text-[13px]">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
                        <span><span className="font-medium text-foreground">{SCOPE_LABELS[s].label}</span> <span className="text-muted">{SCOPE_LABELS[s].desc}</span></span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {redirectDomain && (
            <p className="text-xs text-muted">
              {o.redirectNoticeBefore} <span className="font-mono text-foreground">{redirectDomain}</span> {o.redirectNoticeAfter}
            </p>
          )}

          {error && <AlfyAuthBanner message={error} />}

          <div className="flex gap-2">
            <Button variant="tertiary" className="flex-1" onPress={cancel} isDisabled={authorizing}>{o.cancelBtn}</Button>
            <Button
              className="flex-1"
              onPress={authorize}
              isPending={authorizing}
              isDisabled={hasBotScope && (!selectedServer || servers.length === 0)}
            >
              {authorizing ? o.authorizingBtn : o.authorizeBtn}
            </Button>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-muted">
            <ShieldCheck className="size-3.5" aria-hidden /> {o.securityNote}
          </p>
        </div>
      )}
    </AlfyAuthShell>
  );
}

export default function OAuth2AuthorizePage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-background"><Spinner /></div>}>
      <AuthorizeContent />
    </Suspense>
  );
}
