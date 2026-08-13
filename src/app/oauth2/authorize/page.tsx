'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheckIcon, CheckCircleIcon, XCircleIcon, AlertTriangleIcon,
  ChevronDownIcon,
} from '@/components/icons';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { api, resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/components/locale-provider';

// ── Bitmask → labels ──────────────────────────────────────────────────────────

function decodedPermissions(bits: number, permissions: { bit: number; label: string; desc: string }[]) {
  return permissions.filter(p => (bits & p.bit) !== 0);
}

// ── Types ─────────────────────────────────────────────────────────────────────

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
  memberCount?: number;
  role?: string;
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ── Contenu principal ─────────────────────────────────────────────────────────

function AuthorizeContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const o = t.pages.oauth2;
  const SCOPE_LABELS: Record<string, { label: string; desc: string }> = {
    identify: { label: o.scopeIdentifyLabel, desc: o.scopeIdentifyDesc },
    guilds:   { label: o.scopeGuildsLabel,   desc: o.scopeGuildsDesc },
  };

  const clientId    = searchParams.get('client_id') || '';
  const scope       = searchParams.get('scope') || 'bot';
  const permissions = parseInt(searchParams.get('permissions') || '0');
  const redirectUri = searchParams.get('redirect_uri') || '';
  const state       = searchParams.get('state') || '';

  const scopes: string[] = scope.split(' ').filter(Boolean);
  const hasBotScope      = scopes.includes('bot');

  const [app, setApp]                       = useState<PublicApp | null>(null);
  const [servers, setServers]               = useState<ServerItem[]>([]);
  const [selectedServer, setSelectedServer] = useState('');
  const [loadingApp, setLoadingApp]         = useState(true);
  const [authorizing, setAuthorizing]       = useState(false);
  const [error, setError]                   = useState('');

  // Redirect si non authentifié
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?next=${encodeURIComponent(window.location.href)}`);
    }
  }, [user, authLoading, router]);

  // Charger app + serveurs
  useEffect(() => {
    if (!user || authLoading) return;
    if (!clientId) { setError(o.clientIdMissing); setLoadingApp(false); return; }

    Promise.all([
      api.getOAuth2Application(clientId),
      hasBotScope
        ? api.getServers()
        : Promise.resolve({ success: true, data: { servers: [] } } as any),
    ])
      .then(([appRes, serversRes]) => {
        if (!appRes.success) {
          setError(o.appNotFound);
          setLoadingApp(false);
          return;
        }
        const appData = (appRes.data as any).app as PublicApp;
        setApp(appData);

        if (hasBotScope && serversRes.success) {
          const all: ServerItem[] = (serversRes.data as any).servers || [];
          const admin = all.filter(
            s => s.ownerId === user?.id || s.role === 'admin' || s.role === 'owner',
          );
          setServers(admin.length > 0 ? admin : all);
        }
        setLoadingApp(false);
      })
      .catch(() => { setError(o.loadError); setLoadingApp(false); });
  }, [clientId, hasBotScope, user, authLoading]);

  const handleAuthorize = async () => {
    if (!app) return;
    if (hasBotScope && !selectedServer) return;

    setAuthorizing(true);
    setError('');
    try {
      const res = await api.oauth2Authorize({
        clientId: app.id,
        serverId: hasBotScope ? selectedServer : undefined,
        redirectUri: redirectUri || '',
        scopes,
        permissions,
        state: state || undefined,
      });
      if (res.success && res.data) {
        const { redirectUri: callbackUrl } = res.data as any;
        if (callbackUrl) {
          window.location.href = callbackUrl;
        } else {
          setAuthorizing(false);
        }
      } else {
        setError((res as any).error || o.authDenied);
        setAuthorizing(false);
      }
    } catch {
      setError(o.genericError);
      setAuthorizing(false);
    }
  };

  const handleCancel = () => {
    if (!redirectUri) { router.push('/'); return; }
    try {
      const url = new URL(redirectUri);
      url.searchParams.set('error', 'access_denied');
      if (state) url.searchParams.set('state', state);
      window.location.href = url.toString();
    } catch {
      router.push('/');
    }
  };

  const permList    = decodedPermissions(permissions, t.pages.developers.permissions);
  const extraScopes = scopes.filter(s => s !== 'bot');
  let redirectDomain = '';
  try { redirectDomain = new URL(redirectUri).hostname; } catch {}

  // ── Loading auth ────────────────────────────────────────────────────────────
  if (authLoading || (!user && !error)) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="grid min-h-svh lg:grid-cols-2">

      {/* ── Colonne gauche ── */}
      <div className="flex flex-col bg-background">

        {/* Logo */}
        <div className="p-8 pb-0">
          <MotionFade direction="down" distance={6} duration={0.3}>
            <Link href="/" className="inline-flex items-center gap-2.5 opacity-80 ui-smooth hover:opacity-100">
              <div className="flex size-8 items-center justify-center rounded-lg">
                <img src="/logo/Alfychat.svg" alt="" className="size-16 dark:hidden" />
                <img src="/logo/Alfychatlogowihte.svg" alt="" className="size-16 hidden dark:block" />
              </div>
              <span className="font-(family-name:--font-krona) text-sm font-medium tracking-wide text-foreground">
                ALFYCHAT
              </span>
            </Link>
          </MotionFade>
        </div>

        {/* Contenu centré */}
        <div className="flex flex-1 items-center justify-center px-8 py-12">
          <div className="w-full max-w-xs">

            {loadingApp ? (
              /* ── Skeleton ── */
              <MotionStagger className="flex flex-col gap-6">
                <MotionStaggerItem className="flex flex-col gap-1">
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-4 w-64 mt-1" />
                </MotionStaggerItem>
                <MotionStaggerItem className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-12 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-9 w-full rounded-lg" />
                </MotionStaggerItem>
              </MotionStagger>

            ) : error && !app ? (
              /* ── Erreur ── */
              <MotionStagger className="flex flex-col gap-6">
                <MotionStaggerItem className="flex flex-col items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10">
                    <XCircleIcon size={18} className="text-destructive" />
                  </div>
                  <div>
                    <h1 className="font-(family-name:--font-krona) text-xl font-bold text-foreground">
                      {o.appNotFoundTitle}
                    </h1>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                      {error}
                    </p>
                  </div>
                </MotionStaggerItem>
                <MotionStaggerItem>
                  <Button asChild variant="outline" className="w-full" size="lg">
                    <Link href="/">{o.backHome}</Link>
                  </Button>
                </MotionStaggerItem>
              </MotionStagger>

            ) : app ? (
              /* ── Formulaire d'autorisation ── */
              <MotionStagger className="flex flex-col gap-6">

                {/* Titre */}
                <MotionStaggerItem className="flex flex-col gap-1">
                  <h1 className="font-(family-name:--font-krona) text-2xl font-bold text-foreground">
                    {o.title}
                  </h1>
                  <p className="text-[13px] text-muted-foreground">
                    {o.subtitle}
                  </p>
                </MotionStaggerItem>

                <MotionStaggerItem className="flex flex-col gap-4">

                  {/* Bot info */}
                  <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/60 p-3 backdrop-blur-sm">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-background">
                      {app.avatarUrl ? (
                        <img
                          src={resolveMediaUrl(app.avatarUrl)}
                          alt={app.name}
                          className="size-11 rounded-xl object-cover"
                        />
                      ) : (
                        <span className="text-base font-bold text-primary">
                          {app.name[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[14px] font-bold text-foreground">{app.name}</span>
                        {app.isVerified && (
                          <Badge className="h-4 border border-blue-500/30 bg-blue-500/10 px-1.5 text-[9px] text-blue-400">
                            {o.verifiedBadge}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">
                        {hasBotScope ? o.wantsBotAccess : o.wantsAccountAccess}
                      </p>
                      {app.description && (
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/70">
                          {app.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Sélection serveur */}
                  {hasBotScope && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {o.addToServerLabel}
                      </label>
                      {servers.length === 0 ? (
                        <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                          <AlertTriangleIcon size={13} className="shrink-0 text-amber-400" />
                          <p className="text-[12px] text-muted-foreground">
                            {o.noAdminServer}
                          </p>
                        </div>
                      ) : (
                        <div className="relative">
                          <select
                            value={selectedServer}
                            onChange={e => setSelectedServer(e.target.value)}
                            className="h-9 w-full appearance-none rounded-lg border border-input bg-background px-3 pr-8 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/30"
                          >
                            <option value="">{o.chooseServerOption}</option>
                            {servers.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                          <ChevronDownIcon size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Permissions */}
                  {(permList.length > 0 || extraScopes.length > 0) && (
                    <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-card/40 p-3">
                      {permList.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                            {o.permissionsLabel}
                          </p>
                          <div className="flex flex-col gap-1">
                            {permList.map(perm => (
                              <div key={perm.label} className="flex items-start gap-2">
                                <CheckCircleIcon size={12} className="mt-0.5 shrink-0 text-primary" />
                                <div>
                                  <span className="text-[12px] font-medium text-foreground">{perm.label}</span>
                                  <span className="ml-1.5 text-[11px] text-muted-foreground">{perm.desc}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {permList.length > 0 && extraScopes.length > 0 && (
                        <Separator />
                      )}

                      {extraScopes.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                            {o.requestedAccessLabel}
                          </p>
                          <div className="flex flex-col gap-1">
                            {extraScopes.map(s => {
                              const info = SCOPE_LABELS[s];
                              if (!info) return null;
                              return (
                                <div key={s} className="flex items-start gap-2">
                                  <CheckCircleIcon size={12} className="mt-0.5 shrink-0 text-blue-400" />
                                  <div>
                                    <span className="text-[12px] font-medium text-foreground">{info.label}</span>
                                    <p className="text-[11px] text-muted-foreground">{info.desc}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {redirectDomain && (
                    <p className="text-[11px] text-muted-foreground/50">
                      {o.redirectNoticeBefore}{' '}
                      <span className="font-mono text-muted-foreground">{redirectDomain}</span>{' '}
                      {o.redirectNoticeAfter}
                    </p>
                  )}

                  {error && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-[12px] text-destructive">
                      {error}
                    </div>
                  )}

                  {/* Boutons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1"
                      onClick={handleCancel}
                      disabled={authorizing}
                    >
                      {o.cancelBtn}
                    </Button>
                    <Button
                      size="lg"
                      className="flex-1"
                      onClick={handleAuthorize}
                      disabled={
                        authorizing
                        || (hasBotScope && !selectedServer)
                        || (hasBotScope && servers.length === 0)
                      }
                    >
                      {authorizing && <Spinner className="size-4" />}
                      {authorizing ? o.authorizingBtn : o.authorizeBtn}
                    </Button>
                  </div>
                </MotionStaggerItem>

                {/* Note sécurité */}
                <MotionStaggerItem className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
                  <ShieldCheckIcon size={11} />
                  <span>{o.securityNote}</span>
                </MotionStaggerItem>

              </MotionStagger>
            ) : null}

          </div>
        </div>
      </div>

      {/* ── Colonne droite : image ── */}
      <div className="hidden bg-background p-4 lg:block">
        <div className="relative h-full overflow-hidden rounded-2xl">
          <img
            src="/backgrounds/2obg.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </div>

    </div>
  );
}

// ── Export avec Suspense ──────────────────────────────────────────────────────

export default function OAuth2AuthorizePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh items-center justify-center bg-background">
        <svg className="animate-spin size-6 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    }>
      <AuthorizeContent />
    </Suspense>
  );
}
