'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PlusIcon, Trash2Icon, BotIcon, ArrowRightIcon, CheckCircleIcon,
  ClockIcon, XCircleIcon, ShieldCheckIcon,
} from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { api, resolveMediaUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { cn } from '@/lib/utils';

interface BotData {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  status: 'online' | 'offline' | 'maintenance';
  isPublic: boolean;
  isVerified: boolean;
  certificationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  serverCount: number;
  tags: string[];
}

const STATUS_CONFIG = {
  online:      { dot: 'bg-green-500',  text: 'text-green-400',  label: 'En ligne' },
  offline:     { dot: 'bg-gray-400',   text: 'text-gray-400',   label: 'Hors ligne' },
  maintenance: { dot: 'bg-yellow-500', text: 'text-yellow-400', label: 'Maintenance' },
};

const CERTIF_CONFIG = {
  none:     { icon: null,             color: 'text-muted-foreground', label: null },
  pending:  { icon: ClockIcon,        color: 'text-yellow-400',       label: 'En attente de certification' },
  approved: { icon: ShieldCheckIcon,  color: 'text-blue-400',         label: 'Certifié' },
  rejected: { icon: XCircleIcon,      color: 'text-red-400',          label: 'Certification refusée' },
};

export default function BotsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [bots, setBots] = useState<BotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<BotData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadBots = useCallback(async () => {
    setLoading(true);
    const res = await api.getMyBots();
    if (res.success && res.data) setBots((res.data as any).bots || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (user) loadBots(); }, [user, loadBots]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    const res = await api.deleteBot(confirmDelete.id);
    if (res.success) { setConfirmDelete(null); await loadBots(); }
    setDeleting(false);
  };

  return (
    <>
      <div className="min-h-full px-6 py-10 md:px-10 lg:px-14">
        <div className="mx-auto max-w-4xl space-y-8">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-(family-name:--font-krona) text-2xl font-bold text-foreground">Mes Bots</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Gérez vos applications et bots AlfyChat
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/developers/bots/new">
                <PlusIcon size={14} />
                Nouveau bot
              </Link>
            </Button>
          </div>

          {/* Liste */}
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map(i => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          ) : bots.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/40 py-16 text-center">
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-border/40 bg-background">
                <BotIcon size={22} className="text-muted-foreground/40" />
              </div>
              <h3 className="text-[15px] font-semibold text-foreground">Aucun bot</h3>
              <p className="mt-1.5 max-w-xs text-[13px] text-muted-foreground">
                Créez votre premier bot pour commencer à développer sur AlfyChat
              </p>
              <Button asChild size="sm" className="mt-5">
                <Link href="/developers/bots/new">
                  <PlusIcon size={14} />
                  Créer mon premier bot
                </Link>
              </Button>
            </div>
          ) : (
            <MotionStagger className="grid gap-4 md:grid-cols-2">
              {bots.map(bot => {
                const st = STATUS_CONFIG[bot.status];
                const cert = CERTIF_CONFIG[bot.certificationStatus] || CERTIF_CONFIG.none;
                return (
                  <MotionStaggerItem key={bot.id}>
                    <div className="group flex flex-col rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden transition-colors hover:border-border/70">
                      {/* Header du bot */}
                      <div className="flex items-start gap-3 p-4">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-background">
                          {bot.avatarUrl ? (
                            <img
                              src={resolveMediaUrl(bot.avatarUrl)}
                              alt={bot.name}
                              className="size-11 rounded-xl object-cover"
                            />
                          ) : (
                            <span className="text-base font-bold text-accent">
                              {bot.name[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[14px] font-semibold text-foreground truncate">{bot.name}</span>
                            {bot.isVerified && (
                              <Badge className="h-4 border border-blue-500/30 bg-blue-500/10 px-1.5 text-[9px] text-blue-400">
                                VÉRIFIÉ
                              </Badge>
                            )}
                            <Badge className="h-4 border border-border/40 bg-background px-1.5 text-[9px] text-muted-foreground">
                              BOT
                            </Badge>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[11px]">
                            <span className={cn('flex items-center gap-1', st.text)}>
                              <span className={cn('size-1.5 rounded-full', st.dot)} />
                              {st.label}
                            </span>
                            <span className="text-muted-foreground/30">·</span>
                            <span className="text-muted-foreground">{bot.serverCount} serveur{bot.serverCount !== 1 ? 's' : ''}</span>
                          </div>
                          {bot.description && (
                            <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                              {bot.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Tags */}
                      {bot.tags && bot.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 px-4 pb-1">
                          {bot.tags.map(tag => (
                            <Badge key={tag} className="h-5 border border-accent/20 bg-accent/8 px-1.5 text-[10px] text-accent">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Certification */}
                      {cert.icon && cert.label && (
                        <div className="mx-4 mb-3 mt-2 flex items-center gap-2 rounded-xl border border-border/40 bg-background/50 px-3 py-1.5">
                          <cert.icon size={12} className={cert.color} />
                          <span className={cn('text-[11px] font-medium', cert.color)}>{cert.label}</span>
                        </div>
                      )}

                      {/* Footer actions */}
                      <div className="mt-auto flex items-center gap-1.5 border-t border-border/40 px-3 py-2.5">
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1.5 text-[12px]"
                        >
                          <Link href={`/developers/bots/${bot.id}`}>
                            Gérer
                            <ArrowRightIcon size={12} />
                          </Link>
                        </Button>
                        <div className="flex-1" />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setConfirmDelete(bot)}
                        >
                          <Trash2Icon size={13} />
                        </Button>
                      </div>
                    </div>
                  </MotionStaggerItem>
                );
              })}
            </MotionStagger>
          )}
        </div>
      </div>

      {/* Dialog suppression */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer {confirmDelete?.name} ?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground">
            Cette action est irréversible. Le bot sera retiré de tous les serveurs et toutes les données associées seront supprimées définitivement.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? 'Suppression...' : 'Supprimer définitivement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
