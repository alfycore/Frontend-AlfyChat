'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  PlusIcon,
  Trash2Icon,
  Edit2Icon,
  CopyIcon,
  RefreshCwIcon,
  EyeIcon,
  EyeOffIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  BotIcon,
  TerminalIcon,
  KeyIcon,
  XIcon,
  ShieldCheckIcon,
} from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { api, resolveMediaUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/* ── Types ─────────────────────────────────────────────── */

interface BotData {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  token: string;
  prefix: string;
  status: 'online' | 'offline' | 'maintenance';
  isPublic: boolean;
  isVerified: boolean;
  certificationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  certificationNote?: string;
  inviteCount: number;
  serverCount: number;
  tags: string[];
  websiteUrl?: string;
  supportServerUrl?: string;
  privacyPolicyUrl?: string;
  servers: string[];
  commands: BotCommand[];
  createdAt: string;
  updatedAt: string;
}

interface BotCommand {
  id: string;
  name: string;
  description: string;
  usage: string;
  isEnabled: boolean;
  cooldown: number;
}

/* ── Tags disponibles ────────────────────────────────────── */
const AVAILABLE_TAGS = [
  'Moderation', 'Musique', 'Jeux', 'Utilitaire', 'Fun',
  'Social', 'Economie', 'Niveaux', 'Logs', 'Sondages',
  'Notifications', 'Traduction', 'IA', 'Statistiques', 'Roles',
];

/* ── Statut config ─────────────────────────────────────── */
const statusConfig = {
  online: { color: 'bg-green-500', text: 'text-green-400', label: 'En ligne' },
  offline: { color: 'bg-gray-500', text: 'text-gray-400', label: 'Hors ligne' },
  maintenance: { color: 'bg-yellow-500', text: 'text-yellow-400', label: 'Maintenance' },
};

const certifConfig: Record<string, { icon: typeof XCircleIcon; color: string; label: string }> = {
  none: { icon: XCircleIcon, color: 'text-gray-400', label: 'Non certifie' },
  pending: { icon: ClockIcon, color: 'text-yellow-400', label: 'En attente' },
  approved: { icon: CheckCircle2Icon, color: 'text-green-400', label: 'Certifie' },
  rejected: { icon: XCircleIcon, color: 'text-red-400', label: 'Refuse' },
};

/* ══════════════════════════════════════════════════════════ */

export default function BotsPage() {
  const { user } = useAuth();
  const [bots, setBots] = useState<BotData[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit bot modal
  const [showBotModal, setShowBotModal] = useState(false);
  const [editingBot, setEditingBot] = useState<BotData | null>(null);
  const [botForm, setBotForm] = useState({
    name: '', description: '', prefix: '!',
    isPublic: false, tags: [] as string[],
    websiteUrl: '', supportServerUrl: '', privacyPolicyUrl: '',
  });

  // Token modal
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenBot, setTokenBot] = useState<BotData | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Certification modal
  const [showCertifModal, setShowCertifModal] = useState(false);
  const [certifBot, setCertifBot] = useState<BotData | null>(null);
  const [certifReason, setCertifReason] = useState('');

  // Command modal
  const [showCmdModal, setShowCmdModal] = useState(false);
  const [cmdBot, setCmdBot] = useState<BotData | null>(null);
  const [cmdForm, setCmdForm] = useState({ name: '', description: '', usage: '', cooldown: 0 });

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  /* ── Load bots ── */
  const loadBots = useCallback(async () => {
    setLoading(true);
    const res = await api.getMyBots();
    if (res.success && res.data) {
      setBots((res.data as any).bots || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) loadBots();
  }, [user, loadBots]);

  /* ── Create/Update bot ── */
  const handleSaveBot = async () => {
    if (!botForm.name.trim()) return;
    if (editingBot) {
      const res = await api.updateBot(editingBot.id, botForm);
      if (res.success) { await loadBots(); setShowBotModal(false); }
    } else {
      const res = await api.createBot(botForm);
      if (res.success) { await loadBots(); setShowBotModal(false); }
    }
  };

  /* ── Delete bot ── */
  const handleDeleteBot = async (botId: string) => {
    const res = await api.deleteBot(botId);
    if (res.success) { setConfirmDelete(null); await loadBots(); }
  };

  /* ── Regenerate token ── */
  const handleRegenToken = async () => {
    if (!tokenBot) return;
    const res = await api.regenerateBotToken(tokenBot.id);
    if (res.success && res.data) {
      const newToken = (res.data as any).token;
      setTokenBot({ ...tokenBot, token: newToken });
      setBots(prev => prev.map(b => b.id === tokenBot.id ? { ...b, token: newToken } : b));
    }
  };

  /* ── Copy token ── */
  const copyToken = () => {
    if (!tokenBot) return;
    navigator.clipboard.writeText(tokenBot.token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  /* ── Request certification ── */
  const handleRequestCertification = async () => {
    if (!certifBot || certifReason.length < 10) return;
    const res = await api.requestBotCertification(certifBot.id, certifReason);
    if (res.success) {
      setShowCertifModal(false);
      setCertifReason('');
      await loadBots();
    }
  };

  /* ── Create command ── */
  const handleCreateCommand = async () => {
    if (!cmdBot || !cmdForm.name || !cmdForm.description) return;
    const res = await api.createBotCommand(cmdBot.id, cmdForm);
    if (res.success) {
      setShowCmdModal(false);
      setCmdForm({ name: '', description: '', usage: '', cooldown: 0 });
      await loadBots();
    }
  };

  /* ── Delete command ── */
  const handleDeleteCommand = async (botId: string, commandId: string) => {
    const res = await api.deleteBotCommand(botId, commandId);
    if (res.success) await loadBots();
  };

  /* ── Open modals ── */
  const openCreate = () => {
    setEditingBot(null);
    setBotForm({ name: '', description: '', prefix: '!', isPublic: false, tags: [], websiteUrl: '', supportServerUrl: '', privacyPolicyUrl: '' });
    setShowBotModal(true);
  };

  const openEdit = (bot: BotData) => {
    setEditingBot(bot);
    setBotForm({
      name: bot.name,
      description: bot.description || '',
      prefix: bot.prefix,
      isPublic: bot.isPublic,
      tags: bot.tags || [],
      websiteUrl: bot.websiteUrl || '',
      supportServerUrl: bot.supportServerUrl || '',
      privacyPolicyUrl: bot.privacyPolicyUrl || '',
    });
    setShowBotModal(true);
  };

  const openToken = async (bot: BotData) => {
    const res = await api.getBotById(bot.id);
    if (res.success && res.data) {
      setTokenBot((res.data as any).bot);
      setShowToken(false);
      setShowTokenModal(true);
    }
  };

  const toggleTag = (tag: string) => {
    setBotForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : prev.tags.length < 5 ? [...prev.tags, tag] : prev.tags,
    }));
  };

  /* ══════════════════════════════════════════════════════ */
  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mes Bots</h1>
            <p className="text-sm text-muted-foreground">Gerez vos bots, tokens et commandes</p>
          </div>
          <Button onClick={openCreate} className="bg-accent text-white">
            <PlusIcon size={16} />
            Creer un bot
          </Button>
        </div>

        {/* Liste des bots */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map(i => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-surface" />
            ))}
          </div>
        ) : bots.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-border/60 bg-card/50">
            <BotIcon size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Aucun bot</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Creez votre premier bot pour commencer a developper sur AlfyChat
            </p>
            <Button className="mx-auto bg-accent text-white" onClick={openCreate}>
              <PlusIcon size={16} />
              Creer mon premier bot
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {bots.map(bot => {
              const st = statusConfig[bot.status];
              const cert = certifConfig[bot.certificationStatus] || certifConfig.none;
              return (
                <Card key={bot.id} className="overflow-hidden rounded-2xl border border-black/6 bg-card">
                  {/* Bot header */}
                  <div className="flex items-start gap-3 p-4 pb-0">
                    <div
                      className="flex size-12 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}
                    >
                      {bot.avatarUrl ? (
                        <img src={resolveMediaUrl(bot.avatarUrl)} alt={bot.name} className="size-12 rounded-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-accent">{bot.name[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-bold">{bot.name}</h3>
                        {bot.isVerified && (
                          <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[9px] h-5 px-1.5">
                            VERIFIE
                          </Badge>
                        )}
                        <Badge className="bg-(--muted)/10 text-muted-foreground text-[9px] h-5 px-1.5">
                          BOT
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className={cn('flex items-center gap-1 text-xs', st.text)}>
                          <span className={cn('size-1.5 rounded-full', st.color)} />
                          {st.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">&bull;</span>
                        <span className="text-xs text-muted-foreground">{bot.serverCount} serveur{bot.serverCount !== 1 ? 's' : ''}</span>
                        <span className="text-[10px] text-muted-foreground">&bull;</span>
                        <span className="text-xs text-muted-foreground">Prefixe: {bot.prefix}</span>
                      </div>
                      {bot.description && (
                        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{bot.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {bot.tags && bot.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 px-4 pt-2">
                      {bot.tags.map(tag => (
                        <Badge key={tag} className="bg-accent/10 text-accent text-[10px] h-5 px-1.5">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Certification status */}
                  <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-background/50 px-3 py-2">
                    <cert.icon size={14} className={cert.color} />
                    <span className={cn('text-xs font-medium', cert.color)}>{cert.label}</span>
                    {bot.certificationNote && (
                      <span className="ml-auto text-[10px] text-muted-foreground italic">{bot.certificationNote}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 border-t border-border/60 p-3 mt-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(bot)}>
                          <Edit2Icon size={14} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Modifier</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openToken(bot)}>
                          <KeyIcon size={14} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Token</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon" variant="ghost" className="h-8 w-8"
                          onClick={() => { setCmdBot(bot); setCmdForm({ name: '', description: '', usage: '', cooldown: 0 }); setShowCmdModal(true); }}
                        >
                          <TerminalIcon size={14} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Commandes</TooltipContent>
                    </Tooltip>
                    {(bot.certificationStatus === 'none' || bot.certificationStatus === 'rejected') && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon" variant="ghost" className="h-8 w-8"
                            onClick={() => { setCertifBot(bot); setCertifReason(''); setShowCertifModal(true); }}
                          >
                            <ShieldCheckIcon size={14} className="text-blue-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Demander la certification</TooltipContent>
                      </Tooltip>
                    )}
                    <div className="flex-1" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-red-500/10"
                          onClick={() => setConfirmDelete(bot.id)}
                        >
                          <Trash2Icon size={14} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Supprimer</TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Commands list */}
                  {bot.commands && bot.commands.length > 0 && (
                    <div className="border-t border-border/60 px-4 py-3">
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">Commandes ({bot.commands.length})</p>
                      <div className="space-y-1">
                        {bot.commands.slice(0, 5).map(cmd => (
                          <div key={cmd.id} className="flex items-center justify-between rounded-xl bg-background/50 px-2.5 py-1.5">
                            <div>
                              <span className="text-xs font-mono font-semibold text-accent">{bot.prefix}{cmd.name}</span>
                              <span className="ml-2 text-[10px] text-muted-foreground">{cmd.description}</span>
                            </div>
                            <Button
                              size="icon" variant="ghost"
                              className="text-red-400 h-6 w-6"
                              onClick={() => handleDeleteCommand(bot.id, cmd.id)}
                            >
                              <XIcon size={12} />
                            </Button>
                          </div>
                        ))}
                        {bot.commands.length > 5 && (
                          <p className="text-[10px] text-muted-foreground text-center">+{bot.commands.length - 5} commandes supplementaires</p>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════════════ MODALS ══════════════ */}

      {/* ── Create/Edit Bot Modal ── */}
      <Dialog open={showBotModal} onOpenChange={setShowBotModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBot ? 'Modifier le bot' : 'Creer un nouveau bot'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Nom du bot *</label>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                value={botForm.name} onChange={e => setBotForm(f => ({ ...f, name: e.target.value }))}
                placeholder="MonSuperBot" maxLength={32}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Description</label>
              <textarea
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground resize-none focus:border-accent focus:outline-none"
                value={botForm.description} onChange={e => setBotForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Un bot qui fait des trucs geniaux..." maxLength={500} rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Prefixe</label>
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  value={botForm.prefix} onChange={e => setBotForm(f => ({ ...f, prefix: e.target.value }))}
                  placeholder="!" maxLength={5}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <Switch checked={botForm.isPublic} onCheckedChange={(v: boolean) => setBotForm(f => ({ ...f, isPublic: v }))} />
                  Bot public
                </label>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Tags (max 5)</label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TAGS.map(tag => (
                  <button
                    key={tag}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-medium transition-all border',
                      botForm.tags.includes(tag)
                        ? 'bg-accent/15 text-accent border-accent/30'
                        : 'bg-background text-muted-foreground border-border hover:border-accent/30'
                    )}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* URLs */}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Site web</label>
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  value={botForm.websiteUrl} onChange={e => setBotForm(f => ({ ...f, websiteUrl: e.target.value }))}
                  placeholder="https://monbot.fr"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Serveur support</label>
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  value={botForm.supportServerUrl} onChange={e => setBotForm(f => ({ ...f, supportServerUrl: e.target.value }))}
                  placeholder="https://alfychat.app/invite/abc123"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Politique de confidentialite</label>
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  value={botForm.privacyPolicyUrl} onChange={e => setBotForm(f => ({ ...f, privacyPolicyUrl: e.target.value }))}
                  placeholder="https://monbot.fr/privacy"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowBotModal(false)}>Annuler</Button>
            <Button className="bg-accent text-white" onClick={handleSaveBot} disabled={!botForm.name.trim()}>
              {editingBot ? 'Enregistrer' : 'Creer le bot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Token Modal ── */}
      <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Token du bot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-xs text-red-400 font-semibold">Ne partagez jamais votre token !</p>
              <p className="text-[10px] text-red-400/70 mt-0.5">
                Le token donne un acces complet a votre bot. Si compromis, regenerez-le immediatement.
              </p>
            </div>
            {tokenBot && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-muted-foreground">Token</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-xl bg-background border border-border px-3 py-2 font-mono text-xs break-all text-foreground">
                    {showToken ? tokenBot.token : '\u2022'.repeat(48)}
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowToken(!showToken)}>
                    {showToken ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={copyToken}>
                    {copiedToken ? <CheckCircle2Icon size={14} className="text-green-400" /> : <CopyIcon size={14} />}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowTokenModal(false)}>Fermer</Button>
            <Button variant="destructive" onClick={handleRegenToken}>
              <RefreshCwIcon size={14} />
              Regenerer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Certification Modal ── */}
      <Dialog open={showCertifModal} onOpenChange={setShowCertifModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Demande de certification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 space-y-1">
              <p className="text-xs text-blue-400 font-semibold">Certification {certifBot?.name}</p>
              <p className="text-[10px] text-blue-400/70">
                Un bot certifie obtient le badge de verification, une meilleure visibilite
                dans les listes publiques et inspire confiance aux utilisateurs.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Pourquoi votre bot devrait etre certifie ? *
              </label>
              <textarea
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground resize-none focus:border-accent focus:outline-none"
                value={certifReason} onChange={e => setCertifReason(e.target.value)}
                placeholder="Expliquez le but de votre bot, le nombre de serveurs, les fonctionnalites uniques..."
                rows={5} maxLength={1000}
              />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">{certifReason.length}/1000</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCertifModal(false)}>Annuler</Button>
            <Button
              className="bg-blue-500 text-white"
              onClick={handleRequestCertification}
              disabled={certifReason.length < 10}
            >
              <ShieldCheckIcon size={14} />
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Command Modal ── */}
      <Dialog open={showCmdModal} onOpenChange={setShowCmdModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter une commande &mdash; {cmdBot?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Nom de la commande *</label>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                value={cmdForm.name} onChange={e => setCmdForm(f => ({ ...f, name: e.target.value }))}
                placeholder="help" maxLength={32}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Description *</label>
              <input
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                value={cmdForm.description} onChange={e => setCmdForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Affiche la liste des commandes" maxLength={200}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Usage</label>
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  value={cmdForm.usage} onChange={e => setCmdForm(f => ({ ...f, usage: e.target.value }))}
                  placeholder="!help [commande]" maxLength={200}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Cooldown (sec)</label>
                <input
                  type="number" min={0}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
                  value={cmdForm.cooldown} onChange={e => setCmdForm(f => ({ ...f, cooldown: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCmdModal(false)}>Annuler</Button>
            <Button
              className="bg-accent text-white"
              onClick={handleCreateCommand}
              disabled={!cmdForm.name.trim() || !cmdForm.description.trim()}
            >
              Ajouter la commande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <div>
            <p className="text-sm text-muted-foreground">
              Cette action est irreversible. Le bot sera supprime de tous les serveurs et toutes les donnees associees seront perdues.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => confirmDelete && handleDeleteBot(confirmDelete)}>
              Supprimer definitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
