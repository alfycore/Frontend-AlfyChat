'use client';

import { useEffect, useState, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
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
import { Button, Card, Modal, Switch, Tooltip, Input, TextArea, Chip } from '@heroui/react';
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
            <p className="text-sm text-[var(--muted)]">Gerez vos bots, tokens et commandes</p>
          </div>
          <Button onPress={openCreate} className="bg-[var(--accent)] text-white">
            <HugeiconsIcon icon={PlusIcon} size={16} />
            Creer un bot
          </Button>
        </div>

        {/* Liste des bots */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map(i => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-[var(--surface)]" />
            ))}
          </div>
        ) : bots.length === 0 ? (
          <Card className="border border-dashed border-[var(--border)] bg-[var(--surface)]/50 p-12 text-center">
            <HugeiconsIcon icon={BotIcon} size={48} className="mx-auto mb-4 text-[var(--muted)]" />
            <h3 className="mb-2 text-lg font-semibold">Aucun bot</h3>
            <p className="mb-6 text-sm text-[var(--muted)]">
              Creez votre premier bot pour commencer a developper sur AlfyChat
            </p>
            <Button className="mx-auto bg-[var(--accent)] text-white" onPress={openCreate}>
              <HugeiconsIcon icon={PlusIcon} size={16} />
              Creer mon premier bot
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {bots.map(bot => {
              const st = statusConfig[bot.status];
              const cert = certifConfig[bot.certificationStatus] || certifConfig.none;
              return (
                <Card key={bot.id} className="overflow-hidden border border-[var(--border)] bg-[var(--surface)] p-0">
                  {/* Bot header */}
                  <div className="flex items-start gap-3 p-4 pb-0">
                    <div
                      className="flex size-12 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}
                    >
                      {bot.avatarUrl ? (
                        <img src={resolveMediaUrl(bot.avatarUrl)} alt={bot.name} className="size-12 rounded-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-[var(--accent)]">{bot.name[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-bold">{bot.name}</h3>
                        {bot.isVerified && (
                          <Chip size="sm" className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[9px] h-5">
                            VERIFIE
                          </Chip>
                        )}
                        <Chip size="sm" className="bg-[var(--muted)]/10 text-[var(--muted)] text-[9px] h-5">
                          BOT
                        </Chip>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className={cn('flex items-center gap-1 text-xs', st.text)}>
                          <span className={cn('size-1.5 rounded-full', st.color)} />
                          {st.label}
                        </span>
                        <span className="text-[10px] text-[var(--muted)]">&bull;</span>
                        <span className="text-xs text-[var(--muted)]">{bot.serverCount} serveur{bot.serverCount !== 1 ? 's' : ''}</span>
                        <span className="text-[10px] text-[var(--muted)]">&bull;</span>
                        <span className="text-xs text-[var(--muted)]">Prefixe: {bot.prefix}</span>
                      </div>
                      {bot.description && (
                        <p className="mt-1.5 line-clamp-2 text-xs text-[var(--muted)]">{bot.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {bot.tags && bot.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 px-4 pt-2">
                      {bot.tags.map(tag => (
                        <Chip key={tag} size="sm" className="bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] h-5">
                          {tag}
                        </Chip>
                      ))}
                    </div>
                  )}

                  {/* Certification status */}
                  <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-[var(--background)]/50 px-3 py-2">
                    <HugeiconsIcon icon={cert.icon} size={14} className={cert.color} />
                    <span className={cn('text-xs font-medium', cert.color)}>{cert.label}</span>
                    {bot.certificationNote && (
                      <span className="ml-auto text-[10px] text-[var(--muted)] italic">{bot.certificationNote}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 border-t border-[var(--border)]/60 p-3 mt-3">
                    <Tooltip delay={0}>
                      <Button size="sm" variant="ghost" isIconOnly onPress={() => openEdit(bot)}>
                        <HugeiconsIcon icon={Edit2Icon} size={14} />
                      </Button>
                      <Tooltip.Content>Modifier</Tooltip.Content>
                    </Tooltip>
                    <Tooltip delay={0}>
                      <Button size="sm" variant="ghost" isIconOnly onPress={() => openToken(bot)}>
                        <HugeiconsIcon icon={KeyIcon} size={14} />
                      </Button>
                      <Tooltip.Content>Token</Tooltip.Content>
                    </Tooltip>
                    <Tooltip delay={0}>
                      <Button
                        size="sm" variant="ghost" isIconOnly
                        onPress={() => { setCmdBot(bot); setCmdForm({ name: '', description: '', usage: '', cooldown: 0 }); setShowCmdModal(true); }}
                      >
                        <HugeiconsIcon icon={TerminalIcon} size={14} />
                      </Button>
                      <Tooltip.Content>Commandes</Tooltip.Content>
                    </Tooltip>
                    {(bot.certificationStatus === 'none' || bot.certificationStatus === 'rejected') && (
                      <Tooltip delay={0}>
                        <Button
                          size="sm" variant="ghost" isIconOnly
                          onPress={() => { setCertifBot(bot); setCertifReason(''); setShowCertifModal(true); }}
                        >
                          <HugeiconsIcon icon={ShieldCheckIcon} size={14} className="text-blue-400" />
                        </Button>
                        <Tooltip.Content>Demander la certification</Tooltip.Content>
                      </Tooltip>
                    )}
                    <div className="flex-1" />
                    <Tooltip delay={0}>
                      <Button
                        size="sm" variant="ghost" isIconOnly
                        className="text-red-400 hover:bg-red-500/10"
                        onPress={() => setConfirmDelete(bot.id)}
                      >
                        <HugeiconsIcon icon={Trash2Icon} size={14} />
                      </Button>
                      <Tooltip.Content>Supprimer</Tooltip.Content>
                    </Tooltip>
                  </div>

                  {/* Commands list */}
                  {bot.commands && bot.commands.length > 0 && (
                    <div className="border-t border-[var(--border)]/60 px-4 py-3">
                      <p className="mb-2 text-xs font-semibold text-[var(--muted)]">Commandes ({bot.commands.length})</p>
                      <div className="space-y-1">
                        {bot.commands.slice(0, 5).map(cmd => (
                          <div key={cmd.id} className="flex items-center justify-between rounded-lg bg-[var(--background)]/50 px-2.5 py-1.5">
                            <div>
                              <span className="text-xs font-mono font-semibold text-[var(--accent)]">{bot.prefix}{cmd.name}</span>
                              <span className="ml-2 text-[10px] text-[var(--muted)]">{cmd.description}</span>
                            </div>
                            <Button
                              size="sm" variant="ghost" isIconOnly
                              className="text-red-400 size-6 min-w-0"
                              onPress={() => handleDeleteCommand(bot.id, cmd.id)}
                            >
                              <HugeiconsIcon icon={XIcon} size={12} />
                            </Button>
                          </div>
                        ))}
                        {bot.commands.length > 5 && (
                          <p className="text-[10px] text-[var(--muted)] text-center">+{bot.commands.length - 5} commandes supplementaires</p>
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
      <Modal.Backdrop isOpen={showBotModal} onOpenChange={setShowBotModal}>
        <Modal.Container>
        <Modal.Dialog className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)] shadow-2xl">
          <Modal.Header>
            <Modal.Heading>{editingBot ? 'Modifier le bot' : 'Creer un nouveau bot'}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">Nom du bot *</label>
              <input
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                value={botForm.name} onChange={e => setBotForm(f => ({ ...f, name: e.target.value }))}
                placeholder="MonSuperBot" maxLength={32}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">Description</label>
              <textarea
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] resize-none focus:border-[var(--accent)] focus:outline-none"
                value={botForm.description} onChange={e => setBotForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Un bot qui fait des trucs geniaux..." maxLength={500} rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">Prefixe</label>
                <input
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                  value={botForm.prefix} onChange={e => setBotForm(f => ({ ...f, prefix: e.target.value }))}
                  placeholder="!" maxLength={5}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                  <Switch isSelected={botForm.isPublic} onChange={(v: boolean) => setBotForm(f => ({ ...f, isPublic: v }))}>
                    <Switch.Control><Switch.Thumb /></Switch.Control>
                  </Switch>
                  Bot public
                </label>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[var(--muted)]">Tags (max 5)</label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_TAGS.map(tag => (
                  <button
                    key={tag}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-medium transition-all border',
                      botForm.tags.includes(tag)
                        ? 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30'
                        : 'bg-[var(--background)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--accent)]/30'
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
                <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">Site web</label>
                <input
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                  value={botForm.websiteUrl} onChange={e => setBotForm(f => ({ ...f, websiteUrl: e.target.value }))}
                  placeholder="https://monbot.fr"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">Serveur support</label>
                <input
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                  value={botForm.supportServerUrl} onChange={e => setBotForm(f => ({ ...f, supportServerUrl: e.target.value }))}
                  placeholder="https://alfychat.app/invite/abc123"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">Politique de confidentialite</label>
                <input
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                  value={botForm.privacyPolicyUrl} onChange={e => setBotForm(f => ({ ...f, privacyPolicyUrl: e.target.value }))}
                  placeholder="https://monbot.fr/privacy"
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="gap-2">
            <Button variant="outline" onPress={() => setShowBotModal(false)}>Annuler</Button>
            <Button className="bg-[var(--accent)] text-white" onPress={handleSaveBot} isDisabled={!botForm.name.trim()}>
              {editingBot ? 'Enregistrer' : 'Creer le bot'}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* ── Token Modal ── */}
      <Modal.Backdrop isOpen={showTokenModal} onOpenChange={setShowTokenModal}>
        <Modal.Container>
        <Modal.Dialog className="max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)] shadow-2xl">
          <Modal.Header>
            <Modal.Heading>Token du bot</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-xs text-red-400 font-semibold">Ne partagez jamais votre token !</p>
              <p className="text-[10px] text-red-400/70 mt-0.5">
                Le token donne un acces complet a votre bot. Si compromis, regenerez-le immediatement.
              </p>
            </div>
            {tokenBot && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-[var(--muted)]">Token</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg bg-[var(--background)] border border-[var(--border)] px-3 py-2 font-mono text-xs break-all text-[var(--foreground)]">
                    {showToken ? tokenBot.token : '\u2022'.repeat(48)}
                  </div>
                  <Button size="sm" variant="ghost" isIconOnly onPress={() => setShowToken(!showToken)}>
                    <HugeiconsIcon icon={showToken ? EyeOffIcon : EyeIcon} size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" isIconOnly onPress={copyToken}>
                    <HugeiconsIcon icon={copiedToken ? CheckCircle2Icon : CopyIcon} size={14} className={copiedToken ? 'text-green-400' : ''} />
                  </Button>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer className="gap-2">
            <Button variant="outline" onPress={() => setShowTokenModal(false)}>Fermer</Button>
            <Button variant="danger" onPress={handleRegenToken}>
              <HugeiconsIcon icon={RefreshCwIcon} size={14} />
              Regenerer
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* ── Certification Modal ── */}
      <Modal.Backdrop isOpen={showCertifModal} onOpenChange={setShowCertifModal}>
        <Modal.Container>
        <Modal.Dialog className="max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)] shadow-2xl">
          <Modal.Header>
            <Modal.Heading>Demande de certification</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 space-y-1">
              <p className="text-xs text-blue-400 font-semibold">Certification {certifBot?.name}</p>
              <p className="text-[10px] text-blue-400/70">
                Un bot certifie obtient le badge de verification, une meilleure visibilite
                dans les listes publiques et inspire confiance aux utilisateurs.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">
                Pourquoi votre bot devrait etre certifie ? *
              </label>
              <textarea
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] resize-none focus:border-[var(--accent)] focus:outline-none"
                value={certifReason} onChange={e => setCertifReason(e.target.value)}
                placeholder="Expliquez le but de votre bot, le nombre de serveurs, les fonctionnalites uniques..."
                rows={5} maxLength={1000}
              />
              <p className="mt-1 text-right text-[10px] text-[var(--muted)]">{certifReason.length}/1000</p>
            </div>
          </Modal.Body>
          <Modal.Footer className="gap-2">
            <Button variant="outline" onPress={() => setShowCertifModal(false)}>Annuler</Button>
            <Button
              className="bg-blue-500 text-white"
              onPress={handleRequestCertification}
              isDisabled={certifReason.length < 10}
            >
              <HugeiconsIcon icon={ShieldCheckIcon} size={14} />
              Envoyer la demande
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* ── Command Modal ── */}
      <Modal.Backdrop isOpen={showCmdModal} onOpenChange={setShowCmdModal}>
        <Modal.Container>
        <Modal.Dialog className="max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)] shadow-2xl">
          <Modal.Header>
            <Modal.Heading>Ajouter une commande &mdash; {cmdBot?.name}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">Nom de la commande *</label>
              <input
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                value={cmdForm.name} onChange={e => setCmdForm(f => ({ ...f, name: e.target.value }))}
                placeholder="help" maxLength={32}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">Description *</label>
              <input
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                value={cmdForm.description} onChange={e => setCmdForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Affiche la liste des commandes" maxLength={200}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">Usage</label>
                <input
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                  value={cmdForm.usage} onChange={e => setCmdForm(f => ({ ...f, usage: e.target.value }))}
                  placeholder="!help [commande]" maxLength={200}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">Cooldown (sec)</label>
                <input
                  type="number" min={0}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
                  value={cmdForm.cooldown} onChange={e => setCmdForm(f => ({ ...f, cooldown: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="gap-2">
            <Button variant="outline" onPress={() => setShowCmdModal(false)}>Annuler</Button>
            <Button
              className="bg-[var(--accent)] text-white"
              onPress={handleCreateCommand}
              isDisabled={!cmdForm.name.trim() || !cmdForm.description.trim()}
            >
              Ajouter la commande
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* ── Delete Confirmation ── */}
      <Modal.Backdrop isOpen={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <Modal.Container>
        <Modal.Dialog className="max-w-sm rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)] shadow-2xl">
          <Modal.Header>
            <Modal.Heading>Confirmer la suppression</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <p className="text-sm text-[var(--muted)]">
              Cette action est irreversible. Le bot sera supprime de tous les serveurs et toutes les donnees associees seront perdues.
            </p>
          </Modal.Body>
          <Modal.Footer className="gap-2">
            <Button variant="outline" onPress={() => setConfirmDelete(null)}>Annuler</Button>
            <Button variant="danger" onPress={() => confirmDelete && handleDeleteBot(confirmDelete)}>
              Supprimer definitivement
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
