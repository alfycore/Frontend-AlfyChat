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
  XIcon,
  MenuIcon,
} from '@/components/icons';
import { api, resolveMediaUrl } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
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

export default function DiscoverServerPage() {
  const router = useRouter();
  useAuth();
  const ui = useUIStyle();
  const { isMobile, openSidebar } = useMobileNav();

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

  const filteredServers = servers.filter(
    (s) =>
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleJoin = async (serverId: string) => {
    setJoiningId(serverId);
    try {
      const { socketService } = await import('@/lib/socket');
      socketService.joinServer(serverId);
      setTimeout(() => {
        router.push(`/channels/server/${serverId}`);
      }, 500);
    } catch (e) {
      console.error('Erreur join:', e);
    }
    setJoiningId(null);
  };

  return (
    <TooltipProvider>
      <div className={cn('flex h-dvh flex-col', ui.sidebarBg)}>

        {/*  Header  */}
        <header className={cn('flex h-12 shrink-0 items-center gap-3 border-b border-border px-3', ui.header)}>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={openSidebar}
            >
              <MenuIcon size={16} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/channels/me')}
          >
            <ArrowLeftIcon size={15} />
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <CompassIcon size={14} className="shrink-0 text-muted-foreground" />
            <span className="truncate text-[13px] font-semibold">Découvrir des serveurs</span>
          </div>
          <div className="relative w-44 shrink-0">
            <SearchIcon
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50"
            />
            <Input
              placeholder="Rechercher"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 rounded-lg pl-7 pr-7 text-[12px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
              >
                <XIcon size={12} />
              </button>
            )}
          </div>
        </header>

        {/*  Content  */}
        <ScrollArea className="flex-1">
          <div className="p-4">

            <div className="mb-3 flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                {isLoading ? 'Chargement' : `${filteredServers.length} serveur${filteredServers.length !== 1 ? 's' : ''}`}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {isLoading ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
                    <Skeleton className="h-20 w-full rounded-none" />
                    <div className="space-y-2 px-3 pb-3 pt-6">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="mt-1 h-7 w-full rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredServers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                    <CompassIcon size={20} className="text-muted-foreground/40" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold">Aucun serveur trouvé</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/60">
                      {searchQuery
                        ? "Essayez avec d'autres mots-clés."
                        : "Aucun serveur publié pour l'instant."}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredServers.map((server) => (
                  <div
                    key={server.id}
                    className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors duration-150 hover:border-border/80 hover:bg-card/80"
                  >
                    {/* Banner */}
                    <div className="relative h-20 shrink-0 overflow-hidden bg-muted">
                      {server.banner_url ? (
                        <img
                          src={resolveMediaUrl(server.banner_url)}
                          alt=""
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="size-full bg-linear-to-br from-primary/20 via-purple-500/10 to-blue-500/15" />
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />

                      {/* Badges */}
                      <div className="absolute right-2 top-2 flex gap-1">
                        {server.is_certified && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-0.5 rounded-md bg-blue-500/80 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                                <CheckCircle2Icon size={10} />
                                Certifié
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Serveur certifié par AlfyChat</TooltipContent>
                          </Tooltip>
                        )}
                        {server.is_partnered && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-0.5 rounded-md bg-violet-500/80 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                                <HandshakeIcon size={10} />
                                Partenaire
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Serveur partenaire AlfyChat</TooltipContent>
                          </Tooltip>
                        )}
                      </div>

                      {/* Avatar overlay */}
                      <div className="absolute -bottom-4 left-3">
                        <Avatar className="size-9 rounded-xl ring-2 ring-card">
                          <AvatarImage src={resolveMediaUrl(server.icon_url)} className="object-cover" />
                          <AvatarFallback className="rounded-xl bg-muted text-[11px] font-bold">
                            {server.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex flex-1 flex-col px-3 pb-3 pt-6">
                      <p className="truncate text-[13px] font-semibold leading-tight">{server.name}</p>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground/60">
                        <UsersIcon size={10} />
                        {(server.member_count || 0).toLocaleString('fr-FR')} membres
                      </div>
                      {server.description && (
                        <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground/70">
                          {server.description}
                        </p>
                      )}
                      <div className="mt-auto pt-3">
                        <Button
                          size="sm"
                          className="h-7 w-full gap-1.5 rounded-lg text-[12px] font-semibold"
                          disabled={joiningId === server.id}
                          onClick={() => handleJoin(server.id)}
                        >
                          {joiningId === server.id ? (
                            <>
                              <Loader2Icon size={12} className="animate-spin" />
                              Rejoindre
                            </>
                          ) : (
                            <>
                              <ArrowRightIcon size={12} />
                              Rejoindre
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
