'use client';

import { useState, useRef, useEffect } from 'react';
import { MicIcon, MicOffIcon, HeadphonesIcon, SettingsIcon, CheckIcon, PencilIcon, SunIcon, MoonIcon, MonitorIcon } from '@/components/icons';
import { SettingsDialog } from '@/components/chat/settings-dialog';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/components/locale-provider';
import { useTheme } from 'next-themes';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { socketService } from '@/lib/socket';
import { resolveMediaUrl } from '@/lib/api';
import { useLayoutPrefs, densityCls } from '@/hooks/use-layout-prefs';
import { useUIStyle } from '@/hooks/use-ui-style';
import { statusColor, statusLabel, SELECTABLE_STATUSES, type UserStatus } from '@/lib/status';
import { useCallContext } from '@/hooks/use-call-context';
import { useVoice } from '@/hooks/use-voice';
import { NetworkQualityIndicator } from '@/components/chat/network-quality-indicator';

interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: UserStatus;
  customStatus?: string | null;
}

interface UserPanelProps {
  user: User;
}

export function UserPanel({ user }: UserPanelProps) {
  const { updateUser } = useAuth();
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { prefs } = useLayoutPrefs();
  const d = densityCls(prefs.density);
  const ui = useUIStyle();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingCustomStatus, setEditingCustomStatus] = useState(false);
  const [customStatusDraft, setCustomStatusDraft] = useState(user.customStatus ?? '');
  const customStatusInputRef = useRef<HTMLInputElement>(null);

  // ── Hooks voix/appel ─────────────────────────────────────────────────────
  // useCallContext est toujours disponible (CallProvider enveloppe tous les layouts)
  const { isMuted: callMuted, toggleMute: callToggleMute, callStatus } = useCallContext();
  // useVoice retourne null si hors VoiceProvider (layouts DM / friends)
  const voiceCtx = useVoice();

  // L'état effectif de mute/sourdine : serveur vocal > appel DM > aucun
  const inVoiceChannel = !!voiceCtx?.currentChannelId;
  const inCall = callStatus !== 'idle';
  const isMuted = inVoiceChannel ? voiceCtx!.isMuted : inCall ? callMuted : false;
  const isDeafened = inVoiceChannel ? voiceCtx!.isDeafened : false;

  const handleToggleMute = () => {
    if (inVoiceChannel) {
      voiceCtx!.toggleMute();
    } else if (inCall) {
      callToggleMute();
    }
    // Hors appel : pas d'effet (pas de stream actif)
  };

  const handleToggleDeafen = () => {
    if (inVoiceChannel) {
      voiceCtx!.toggleDeafen();
    }
    // Le déafening n'existe que dans les salons vocaux serveur
  };

  useEffect(() => {
    setCustomStatusDraft(user.customStatus ?? '');
  }, [user.customStatus]);

  useEffect(() => {
    if (editingCustomStatus) customStatusInputRef.current?.focus();
  }, [editingCustomStatus]);

  const dotColor = statusColor(user.status);

  const handleStatusChange = (s: typeof SELECTABLE_STATUSES[number]) => {
    socketService.updatePresence(s, user.customStatus ?? null);
    updateUser({ status: s });
  };

  const saveCustomStatus = () => {
    const trimmed = customStatusDraft.trim().slice(0, 100);
    const activeStatus = user.status === 'offline' ? 'online' : user.status as typeof SELECTABLE_STATUSES[number];
    socketService.updatePresence(activeStatus, trimmed || null);
    updateUser({ customStatus: trimmed || null });
    setEditingCustomStatus(false);
  };

  return (
    <div data-tour="user-panel" className={`flex ${d.panelH} shrink-0 items-center gap-1 overflow-hidden border-t px-1.5 md:gap-1 md:px-2 ${ui.isGlass ? 'border-white/15 bg-white/20 backdrop-blur-2xl dark:border-white/8 dark:bg-black/20' : 'border-border/40 bg-sidebar/80 backdrop-blur-md'}`}>
      {/* Avatar + user info */}
      <div className="min-w-0 flex-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl px-1.5 py-1 transition-all duration-150 hover:bg-foreground/6">
            <div className="relative shrink-0">
              <Avatar className={d.panelAvatar}>
                <AvatarImage src={resolveMediaUrl(user.avatarUrl)} alt={user.displayName} />
                <AvatarFallback className="bg-primary/12 text-primary text-[11px] font-semibold">
                  {user.displayName?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-[1.5px] ring-sidebar ${dotColor}`}>
                {user.status === 'dnd' && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="block h-[2px] w-[5px] rounded-full bg-white" />
                  </span>
                )}
              </span>
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className={`truncate ${d.panelName} font-heading tracking-tight leading-tight text-foreground`}>{user.displayName}</p>
              <p className={`truncate ${d.panelSub} text-muted-foreground/70`}>
                {user.customStatus ? user.customStatus : statusLabel(user.status)}
              </p>
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-52">
            <DropdownMenuItem disabled className="pointer-events-none">
              <div>
                <p className="text-[13px] font-semibold">{user.displayName}</p>
                <p className="text-[11px] text-muted-foreground">@{user.username}</p>
              </div>
            </DropdownMenuItem>

            {/* Statut personnalisé */}
            <DropdownMenuItem onSelect={() => setTimeout(() => setEditingCustomStatus(true), 0)}>
              <div className="flex w-full items-center gap-2">
                <PencilIcon size={13} className="shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-[13px] text-muted-foreground">
                  {user.customStatus || 'Définir un statut...'}
                </span>
              </div>
            </DropdownMenuItem>

            {/* Effacer le statut personnalisé */}
            {user.customStatus && (
              <DropdownMenuItem onSelect={() => {
                const activeStatus = user.status === 'offline' ? 'online' : user.status as typeof SELECTABLE_STATUSES[number];
                socketService.updatePresence(activeStatus, null);
                updateUser({ customStatus: null });
                setCustomStatusDraft('');
              }}>
                <span className="text-[13px] text-destructive">Effacer le statut</span>
              </DropdownMenuItem>
            )}

            {/* Statuts disponibles */}
            {SELECTABLE_STATUSES.map((s) => {
              const isActive = user.status === s;
              return (
                <DropdownMenuItem key={s} onSelect={() => handleStatusChange(s)}>
                  <div className={`relative size-2.5 rounded-full ${statusColor(s)}`}>
                    {s === 'dnd' && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="block h-[2px] w-[5px] rounded-full bg-white" />
                      </span>
                    )}
                  </div>
                  <span className="flex-1 text-[13px]">{statusLabel(s)}</span>
                  {isActive && <CheckIcon size={14} className="text-primary" />}
                </DropdownMenuItem>
              );
            })}
        </DropdownMenuContent>
      </DropdownMenu>
      </div>

      {/* Modal statut personnalisé — ouvert séparément pour ne pas fermer le dropdown avant validation */}
      <Dialog open={editingCustomStatus} onOpenChange={(open) => { if (!open) setEditingCustomStatus(false); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Définir un statut personnalisé</DialogTitle></DialogHeader>
          <Input
            ref={customStatusInputRef}
            value={customStatusDraft}
            onChange={(e) => setCustomStatusDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveCustomStatus();
              if (e.key === 'Escape') setEditingCustomStatus(false);
            }}
            maxLength={100}
            placeholder="Définir un statut..."
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingCustomStatus(false)}>Annuler</Button>
            <Button onClick={saveCustomStatus}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audio controls + settings */}
      <div className="flex shrink-0 items-center gap-0.5">
        <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm" variant="ghost"
              className={`size-7 rounded-lg transition-all ${isMuted ? 'bg-destructive/10 text-destructive hover:bg-destructive/15' : 'text-muted-foreground/70 hover:bg-foreground/6 hover:text-foreground'}`}
              onClick={handleToggleMute}
              disabled={!inVoiceChannel && !inCall}
            >
              {isMuted ? <MicOffIcon size={14} /> : <MicIcon size={14} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{isMuted ? 'Réactiver le micro' : 'Couper le micro'}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm" variant="ghost"
              className={`size-7 rounded-lg transition-all ${isDeafened ? 'bg-destructive/10 text-destructive hover:bg-destructive/15' : 'text-muted-foreground/70 hover:bg-foreground/6 hover:text-foreground'}`}
              onClick={handleToggleDeafen}
              disabled={!inVoiceChannel}
            >
              <HeadphonesIcon size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{isDeafened ? 'Réactiver le son' : 'Se mettre en sourdine'}</TooltipContent>
        </Tooltip>
        {inVoiceChannel && voiceCtx && (
          <NetworkQualityIndicator stats={voiceCtx.networkStats} />
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm" variant="ghost"
              className="size-7 rounded-lg text-muted-foreground/70 hover:bg-foreground/6 hover:text-foreground"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <SunIcon size={15} /> : <MoonIcon size={15} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm" variant="ghost"
              className="size-7 rounded-lg text-muted-foreground/70 hover:bg-foreground/6 hover:text-foreground"
              onClick={() => setSettingsOpen(true)}
            >
              <SettingsIcon size={15} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Paramètres</TooltipContent>
        </Tooltip>
        </TooltipProvider>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
