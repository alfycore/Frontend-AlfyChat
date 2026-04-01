'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SearchIcon,
  UsersIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  HandshakeIcon,
  Loader2Icon,
  CompassIcon,
  ArrowRightIcon,
} from '@/components/icons';
import { api, resolveMediaUrl } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import {
  Avatar,
  Button,
  Card,
  Chip,
  InputGroup,
  ScrollShadow,
  Skeleton,
  Tooltip,
} from '@heroui/react';

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

export default function DiscoverServerPage() {
  const router = useRouter();
  useAuth();
  const [servers, setServers] = useState<DiscoverServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    loadDiscoverServers();
  }, []);

  const loadDiscoverServers = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDiscoverServers();
      if (res.success && res.data) {
        setServers((res.data as any).servers || []);
      }
    } catch (e) {
      console.error('Erreur chargement serveurs:', e);
    }
    setIsLoading(false);
  };

  const filteredServers = servers.filter((s) =>
    !searchQuery ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJoin = async (serverId: string) => {
    setJoiningId(serverId);
    try {
      // Rejoindre via l'API (nécessite un invite ou public)
      // Pour les serveurs découverts, on utilise SERVER_JOIN via socket
      const { socketService } = await import('@/lib/socket');
      socketService.joinServer(serverId);
      // Attendre un peu puis rediriger
      setTimeout(() => {
        router.push(`/channels/server/${serverId}`);
      }, 500);
    } catch (e) {
      console.error('Erreur join:', e);
    }
    setJoiningId(null);
  };

  return (
    <div className="flex h-dvh flex-col bg-[var(--background)]">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--border)]/40 bg-[var(--background)]/60 px-4">
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          className="rounded-lg"
          onPress={() => router.push('/channels/me')}
        >
          <ArrowLeftIcon size={16} />
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--accent)]/10">
            <CompassIcon size={14} className="text-[var(--accent)]" />
          </div>
          <h1 className="text-sm font-bold">Découvrir des serveurs</h1>
        </div>
      </header>

      {/* ── Hero banner ─────────────────────────────────────── */}
      <div className="relative shrink-0 overflow-hidden border-b border-[var(--border)]/40 px-8 py-10">
        {/* Background gradients */}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/15 via-violet-500/8 to-blue-500/8" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0_280/3%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_280/3%)_1px,transparent_1px)] bg-size-[48px_48px]" />
        {/* Glow blobs */}
        <div className="pointer-events-none absolute -left-12 -top-12 size-48 rounded-full bg-[var(--accent)]/10 " />
        <div className="pointer-events-none absolute -right-8 bottom-0 size-40 rounded-full bg-violet-500/10 " />

        <div className="relative z-10 max-w-2xl">
          <div className="mb-1.5 flex items-center gap-2">
            <CompassIcon size={18} className="text-[var(--accent)]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--accent)]">Exploration</span>
          </div>
          <h2 className="mb-2 text-2xl font-bold tracking-tight">Trouvez votre communauté</h2>
          <p className="mb-5 max-w-lg text-[13px] text-muted">
            Explorez les serveurs référencés par AlfyChat — des communautés certifiées et partenaires vous attendent.
          </p>

          {/* Search */}
          <div className="max-w-sm">
            <InputGroup className="rounded-xl" variant="secondary">
              <InputGroup.Prefix className="pl-3 pr-0">
                <SearchIcon size={15} className="text-muted/50" />
              </InputGroup.Prefix>
              <InputGroup.Input
                placeholder="Rechercher un serveur…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <InputGroup.Suffix className="pr-2">
                  <Button
                    variant="ghost"
                    isIconOnly
                    size="sm"
                    className="size-5 min-w-0 rounded-md p-0 text-muted"
                    onPress={() => setSearchQuery('')}
                  >
                    ✕
                  </Button>
                </InputGroup.Suffix>
              )}
            </InputGroup>
          </div>
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────── */}
      <ScrollShadow className="flex-1">
        <div className="p-5">
          {isLoading ? (
            /* Skeleton grid */
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="overflow-hidden border border-[var(--border)]/40">
                  <Skeleton className="h-28 w-full" animationType="shimmer" />
                  <Card.Content className="space-y-3 p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-10 rounded-xl" animationType="shimmer" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-28" animationType="shimmer" />
                        <Skeleton className="h-3 w-16" animationType="shimmer" />
                      </div>
                    </div>
                    <Skeleton className="h-3 w-full" animationType="shimmer" />
                    <Skeleton className="h-3 w-3/4" animationType="shimmer" />
                    <Skeleton className="h-8 w-full rounded-xl" animationType="shimmer" />
                  </Card.Content>
                </Card>
              ))}
            </div>
          ) : filteredServers.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-full max-w-xs overflow-hidden rounded-2xl border border-[var(--border)]/40 bg-surface-secondary px-8 py-8 text-center">
                <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/8 via-transparent to-transparent" />
                <div className="relative flex flex-col items-center gap-3">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--accent)]/10">
                    <CompassIcon size={26} className="text-[var(--accent)]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold">Aucun serveur trouvé</p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {searchQuery
                        ? "Essayez avec d'autres mots-clés."
                        : "Aucun serveur n'est référencé pour le moment."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Server cards */
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredServers.map((server) => (
                <Card
                  key={server.id}
                  className="group overflow-hidden border border-[var(--border)]/40 transition-all duration-200 hover:border-[var(--border)]/70 hover:shadow-lg"
                >
                  {/* Banner */}
                  <div className="relative h-28 overflow-hidden bg-linear-to-br from-primary/20 to-violet-500/20">
                    {server.banner_url ? (
                      <img
                        src={resolveMediaUrl(server.banner_url)}
                        alt=""
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="size-full bg-linear-to-br from-primary/25 via-violet-500/15 to-blue-500/20" />
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />

                    {/* Badges */}
                    <div className="absolute right-2 top-2 flex gap-1">
                      {server.is_certified && (
                        <Tooltip delay={0}>
                          <Chip
                            size="sm"
                            className="gap-1 bg-blue-500/85 text-white"
                          >
                            <CheckCircle2Icon size={11} />
                            Certifié
                          </Chip>
                          <Tooltip.Content>Serveur certifié par AlfyChat</Tooltip.Content>
                        </Tooltip>
                      )}
                      {server.is_partnered && (
                        <Tooltip delay={0}>
                          <Chip
                            size="sm"
                            className="gap-1 bg-violet-500/85 text-white"
                          >
                            <HandshakeIcon size={11} />
                            Partenaire
                          </Chip>
                          <Tooltip.Content>Serveur partenaire AlfyChat</Tooltip.Content>
                        </Tooltip>
                      )}
                    </div>

                    {/* Icon overlap */}
                    <div className="absolute -bottom-5 left-4">
                      <Avatar className="size-11 rounded-xl ring-2 ring-background shadow-md">
                        <Avatar.Image
                          src={resolveMediaUrl(server.icon_url)}
                          className="object-cover"
                        />
                        <Avatar.Fallback className="rounded-xl text-xs font-bold">
                          {server.name.substring(0, 2).toUpperCase()}
                        </Avatar.Fallback>
                      </Avatar>
                    </div>
                  </div>

                  {/* Info */}
                  <Card.Content className="flex flex-1 flex-col px-4 pb-4 pt-7">
                    <div className="mb-1">
                      <h3 className="truncate text-[14px] font-bold">{server.name}</h3>
                      <div className="flex items-center gap-1 text-[11px] text-muted">
                        <UsersIcon size={11} />
                        {(server.member_count || 0).toLocaleString('fr-FR')} membres
                      </div>
                    </div>

                    {server.description && (
                      <p className="mb-3 mt-2 line-clamp-2 text-[12px] leading-relaxed text-muted/80">
                        {server.description}
                      </p>
                    )}

                    <div className="mt-auto pt-3">
                      <Button
                        size="sm"
                        variant="primary"
                        className="w-full gap-2 rounded-xl font-semibold"
                        isDisabled={joiningId === server.id}
                        onPress={() => handleJoin(server.id)}
                      >
                        {joiningId === server.id ? (
                          <>
                            <Loader2Icon size={13} className="animate-spin" />
                            Rejoindre…
                          </>
                        ) : (
                          <>
                            <ArrowRightIcon size={13} />
                            Rejoindre
                          </>
                        )}
                      </Button>
                    </div>
                  </Card.Content>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollShadow>
    </div>
  );
}
