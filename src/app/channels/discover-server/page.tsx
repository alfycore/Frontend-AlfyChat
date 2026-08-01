'use client';

import { Avatar, Button, Chip, EmptyState, ScrollShadow, SearchField, Skeleton, Spinner, Tooltip } from '@heroui/react';
import { ArrowLeft, ArrowRight, BadgeCheck, Compass, Handshake, Menu, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import { useTranslation } from '@/components/locale-provider';
import { useAuth } from '@/hooks/use-auth';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { api, resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

interface DiscoverServer {
  id: string;
  name: string;
  description?: string;
  icon_url?: string;
  banner_url?: string;
  is_certified?: boolean;
  is_partnered?: boolean;
  member_count?: number;
}

/** Dégradé de repli quand un serveur n'a pas de bannière — dérivé de l'accent. */
const BANNIERE_DEFAUT =
  'linear-gradient(135deg, var(--accent) 0%, color-mix(in oklch, var(--accent) 40%, var(--surface)) 55%, var(--surface-2) 100%)';

export default function DiscoverServerPage() {
  const router = useRouter();
  useAuth();
  const { isMobile, openSidebar } = useMobileNav();
  const { locale } = useTranslation();

  const [servers, setServers] = useState<DiscoverServer[]>([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [rejointId, setRejointId] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    api
      .getDiscoverServers()
      .then((res) => {
        if (annule) return;
        if (res.success && res.data) {
          setServers(((res.data as { servers?: DiscoverServer[] }).servers) ?? []);
        }
      })
      .catch(() => {
        if (!annule) setServers([]);
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });
    return () => {
      annule = true;
    };
  }, []);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return servers;
    return servers.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q),
    );
  }, [servers, recherche]);

  /** Rejoint le serveur : API, store local, rooms socket, puis navigation. */
  const rejoindre = async (serverId: string) => {
    setRejointId(serverId);
    try {
      const res = await api.joinServerById(serverId);
      if (!res.success) {
        setRejointId(null);
        return;
      }
      const serveur = servers.find((s) => s.id === serverId);
      const { serverListStore } = await import('@/lib/server-list-store');
      serverListStore.add({
        id: serverId,
        name: serveur?.name ?? '',
        iconUrl: serveur?.icon_url ?? undefined,
      });
      const { socketService } = await import('@/lib/socket');
      socketService.joinServer(serverId);
      router.push(`/channels/server/${serverId}`);
    } catch {
      /* l'utilisateur peut réessayer */
    }
    setRejointId(null);
  };

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background">
      {/* ── Barre de navigation — séparée par le fond, pas par un trait ── */}
      <header className="flex h-14 shrink-0 items-center gap-2 bg-surface px-3">
        {isMobile && (
          <Button isIconOnly variant="ghost" aria-label="Ouvrir la navigation" onPress={openSidebar}>
            <Menu className="size-4.5" />
          </Button>
        )}
        <Button isIconOnly variant="ghost" aria-label="Retour" onPress={() => router.push('/channels/me')}>
          <ArrowLeft className="size-4.5" />
        </Button>
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <Compass className="size-4 shrink-0 text-muted" aria-hidden />
          <span className="truncate text-sm font-semibold">Découvrir</span>
        </span>
      </header>

      <ScrollShadow className="min-h-0 flex-1 overflow-y-auto" orientation="vertical">
        <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
          {/* ── Titre éditorial ─────────────────────────────────────── */}
          <div className="at-fade-up mb-8 flex flex-wrap items-end justify-between gap-6">
            <div className="min-w-0">
              <h1 className="font-heading text-3xl leading-tight tracking-tighter sm:text-4xl">
                Découvrir des serveurs
              </h1>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                Les communautés publiques d&apos;AlfyChat. Rejoignez-en une en un clic.
              </p>
            </div>

            <SearchField
              value={recherche}
              onChange={setRecherche}
              aria-label="Rechercher un serveur"
              className="w-full sm:w-72"
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Rechercher un serveur…" />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          </div>

          {/* ── Compteur ────────────────────────────────────────────── */}
          <p
            className="at-fade-up mb-5 text-[11px] font-semibold tracking-widest text-muted uppercase"
            style={{ animationDelay: '40ms' } as CSSProperties}
          >
            {chargement
              ? 'Chargement…'
              : `${filtres.length} serveur${filtres.length !== 1 ? 's' : ''}`}
          </p>

          {/* ── Chargement ──────────────────────────────────────────── */}
          {chargement ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-3xl bg-surface">
                  <Skeleton className="h-28 w-full" />
                  <div className="px-5 pb-5">
                    <Skeleton className="-mt-7 mb-4 size-14 rounded-3xl" />
                    <Skeleton className="h-4 w-32 rounded-lg" />
                    <Skeleton className="mt-2 h-3 w-24 rounded-lg" />
                    <Skeleton className="mt-3 h-3 w-full rounded-lg" />
                    <Skeleton className="mt-1.5 h-3 w-3/4 rounded-lg" />
                    <Skeleton className="mt-5 h-9 w-full rounded-2xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtres.length === 0 ? (
            /* ── Vide ──────────────────────────────────────────────── */
            <EmptyState className="flex flex-col items-center gap-4 rounded-3xl bg-surface px-6 py-20 text-center">
              <span className="flex size-16 items-center justify-center rounded-3xl bg-surface-2">
                <Compass className="size-7 text-muted" aria-hidden />
              </span>
              <span>
                <span className="block text-base font-semibold">Aucun serveur trouvé</span>
                <span className="mt-1 block text-sm text-muted">
                  {recherche
                    ? 'Essayez avec d’autres mots-clés.'
                    : 'Aucun serveur public pour l’instant.'}
                </span>
              </span>
              {recherche && (
                <Button variant="secondary" onPress={() => setRecherche('')}>
                  Effacer la recherche
                </Button>
              )}
            </EmptyState>
          ) : (
            /* ── Grille ────────────────────────────────────────────── */
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtres.map((server, i) => {
                const banniere = server.banner_url ? resolveMediaUrl(server.banner_url) : null;
                const enCours = rejointId === server.id;

                return (
                  <article
                    key={server.id}
                    className={cn(
                      'at-fade-up group/carte flex flex-col overflow-hidden rounded-3xl bg-surface',
                      'transition-transform duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl',
                    )}
                    style={{ animationDelay: `${Math.min(i, 8) * 40 + 60}ms` } as CSSProperties}
                  >
                    {/* Bannière */}
                    <div className="relative h-28 shrink-0 overflow-hidden">
                      {banniere ? (
                        <img
                          src={banniere}
                          alt=""
                          className="size-full object-cover transition-transform duration-500 ease-out group-hover/carte:scale-105"
                        />
                      ) : (
                        <div className="size-full" style={{ background: BANNIERE_DEFAUT }} />
                      )}

                      {(server.is_certified || server.is_partnered) && (
                        <div className="absolute top-3 right-3 flex gap-1.5">
                          {server.is_certified && (
                            <Tooltip delay={300}>
                              <Chip size="sm" color="accent" variant="soft" className="backdrop-blur-md">
                                <BadgeCheck className="size-3" aria-hidden />
                                <Chip.Label>Certifié</Chip.Label>
                              </Chip>
                              <Tooltip.Content>
                                <p>Serveur certifié par AlfyChat</p>
                              </Tooltip.Content>
                            </Tooltip>
                          )}
                          {server.is_partnered && (
                            <Tooltip delay={300}>
                              <Chip size="sm" color="success" variant="soft" className="backdrop-blur-md">
                                <Handshake className="size-3" aria-hidden />
                                <Chip.Label>Partenaire</Chip.Label>
                              </Chip>
                              <Tooltip.Content>
                                <p>Serveur partenaire AlfyChat</p>
                              </Tooltip.Content>
                            </Tooltip>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Corps */}
                    <div className="flex flex-1 flex-col px-5 pb-5">
                      <span className="-mt-7 mb-4 block w-fit rounded-3xl bg-surface p-1">
                        <Avatar className="size-14">
                          {server.icon_url && (
                            <Avatar.Image src={resolveMediaUrl(server.icon_url)} alt="" />
                          )}
                          <Avatar.Fallback className="text-sm font-bold">
                            {server.name.substring(0, 2).toUpperCase()}
                          </Avatar.Fallback>
                        </Avatar>
                      </span>

                      <h2 className="truncate text-base leading-tight font-bold tracking-tight">
                        {server.name}
                      </h2>

                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                        <Users className="size-3 shrink-0" aria-hidden />
                        {(server.member_count ?? 0).toLocaleString(locale)} membres
                      </p>

                      <p className="mt-3 line-clamp-2 min-h-8 flex-1 text-xs leading-relaxed text-muted">
                        {server.description || 'Ce serveur n’a pas encore de description.'}
                      </p>

                      <Button
                        fullWidth
                        className="mt-5"
                        isDisabled={enCours}
                        onPress={() => void rejoindre(server.id)}
                      >
                        {enCours ? <Spinner size="sm" /> : null}
                        Rejoindre
                        {!enCours && (
                          <ArrowRight
                            className="size-4 transition-transform duration-300 group-hover/carte:translate-x-1"
                            aria-hidden
                          />
                        )}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </ScrollShadow>
    </div>
  );
}
