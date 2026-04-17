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
import { useTranslation } from '@/components/locale-provider';
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
  const { locale } = useTranslation();

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
      // 1. Enregistrer le membre via HTTP (authentifié avec le JWT)
      const res = await api.joinServerById(serverId);
      if (!res.success) {
        console.error('Erreur join serveur:', (res as any).error);
        setJoiningId(null);
        return;
      }
      // 2. Rejoindre les rooms socket du serveur
      const { socketService } = await import('@/lib/socket');
      socketService.joinServer(serverId);
      // 3. Naviguer vers le serveur
      router.push(`/channels/server/${serverId}`);
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
                    <Skeleton className="h-24 w-full rounded-none" />
                    <div className="px-4 pb-4">
                      <Skeleton className="-mt-6 mb-3 size-12 rounded-2xl ring-[3px] ring-card" />
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="mt-1.5 h-3 w-20" />
                      <Skeleton className="mt-2 h-3 w-full" />
                      <Skeleton className="mt-1 h-3 w-3/4" />
                      <Skeleton className="mt-3 h-8 w-full rounded-xl" />
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredServers.map((server) => (
                  <div
                    key={server.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md"
                  >
                    {/* Banner */}
                    <div className="relative h-24 shrink-0 overflow-hidden">
                      {server.banner_url ? (
                        <img
                          src={resolveMediaUrl(server.banner_url)}
                          alt=""
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="size-full bg-linear-to-br from-primary/30 via-purple-500/20 to-blue-500/25" />
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-card via-card/10 to-transparent" />

                      {/* Badges */}
                      <div className="absolute right-2.5 top-2.5 flex gap-1">
                        {server.is_certified && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-1 rounded-full bg-blue-500/85 px-2 py-0.5 text-[10px] font-bold text-white shadow backdrop-blur-sm">
                                <CheckCircle2Icon size={9} />
                                Certifié
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Serveur certifié par AlfyChat</TooltipContent>
                          </Tooltip>
                        )}
                        {server.is_partnered && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-1 rounded-full bg-violet-500/85 px-2 py-0.5 text-[10px] font-bold text-white shadow backdrop-blur-sm">
                                <HandshakeIcon size={9} />
                                Partenaire
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Serveur partenaire AlfyChat</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>

                    {/* Avatar + info */}
                    <div className="flex flex-1 flex-col px-4 pb-4">
                      {/* Avatar overlapping banner */}
                      <div className="-mt-6 mb-3">
                        <Avatar className="size-12 rounded-2xl ring-[3px] ring-card shadow-md">
                          <AvatarImage src={resolveMediaUrl(server.icon_url)} className="object-cover" />
                          <AvatarFallback className="rounded-2xl bg-muted text-[12px] font-extrabold tracking-tight">
                            {server.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <p className="truncate text-[13px] font-bold leading-tight tracking-tight">{server.name}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                        <span className="inline-block size-1.5 rounded-full bg-green-400" />
                        <UsersIcon size={9} />
                        {(server.member_count || 0).toLocaleString(locale)} membres
                      </div>

                      {server.description ? (
                        <p className="mt-2 line-clamp-2 flex-1 text-[11px] leading-relaxed text-muted-foreground/60">
                          {server.description}
                        </p>
                      ) : (
                        <div className="flex-1" />
                      )}

                      <Button
                        size="sm"
                        className="mt-3 h-8 w-full gap-1.5 rounded-xl text-[12px] font-semibold transition-all duration-150"
                        disabled={joiningId === server.id}
                        onClick={() => handleJoin(server.id)}
                      >
                        {joiningId === server.id ? (
                          <Loader2Icon size={12} className="animate-spin" />
                        ) : (
                          <ArrowRightIcon size={12} className="transition-transform duration-150 group-hover:translate-x-0.5" />
                        )}
                        Rejoindre
                      </Button>
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
