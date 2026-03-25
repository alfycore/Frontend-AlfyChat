'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  CodeIcon,
  BookOpenIcon,
  ServerIcon,
  ShieldCheckIcon,
  ZapIcon,
  TagIcon,
  GlobeIcon,
  LinkIcon,
  TerminalIcon,
  KeyIcon,
  XIcon,
  CheckIcon,
} from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { api, resolveMediaUrl } from '@/lib/api';
import { Button, Card, Modal, Switch, Tooltip } from '@heroui/react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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

type Tab = 'my-bots' | 'documentation';

/* ── Tags disponibles ────────────────────────────────────── */
const AVAILABLE_TAGS = [
  'Modération', 'Musique', 'Jeux', 'Utilitaire', 'Fun',
  'Social', 'Économie', 'Niveaux', 'Logs', 'Sondages',
  'Notifications', 'Traduction', 'IA', 'Statistiques', 'Rôles',
];

/* ── Statut config ─────────────────────────────────────── */
const statusConfig = {
  online: { color: 'bg-green-500', text: 'text-green-400', label: 'En ligne' },
  offline: { color: 'bg-gray-500', text: 'text-gray-400', label: 'Hors ligne' },
  maintenance: { color: 'bg-yellow-500', text: 'text-yellow-400', label: 'Maintenance' },
};

const certifConfig: Record<string, { icon: typeof XCircleIcon; color: string; label: string }> = {
  none: { icon: XCircleIcon, color: 'text-gray-400', label: 'Non certifié' },
  pending: { icon: ClockIcon, color: 'text-yellow-400', label: 'En attente' },
  approved: { icon: CheckCircle2Icon, color: 'text-green-400', label: 'Certifié' },
  rejected: { icon: XCircleIcon, color: 'text-red-400', label: 'Refusé' },
};

/* ══════════════════════════════════════════════════════════ */

export default function DevelopersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('my-bots');
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
    if (!user) { router.push('/login'); return; }
    loadBots();
  }, [user, router, loadBots]);

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

  if (!user) return null;

  /* ══════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)]/60 bg-[var(--background)]/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-[var(--foreground)] no-underline">
              <img src="/logo/Alfychat.svg" alt="AlfyChat" width={28} height={28} />
              <span className="font-(family-name:--font-krona) text-sm font-medium">AlfyChat</span>
            </Link>
            <span className="text-[var(--muted)]">/</span>
            <span className="text-sm font-semibold text-[var(--accent)]">Portail Développeur</span>
          </div>
          <Button size="sm" variant="outline" onPress={() => router.push('/channels/me')}>
            Retour à l&apos;app
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* ── Tabs ── */}
        <div className="mb-8 flex gap-1 rounded-xl bg-[var(--surface)]/50 p-1">
          {([
            { key: 'my-bots' as const, icon: BotIcon, label: 'Mes Bots' },
            { key: 'documentation' as const, icon: BookOpenIcon, label: 'Documentation API' },
          ]).map(tab => (
            <button
              key={tab.key}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                activeTab === tab.key
                  ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)]'
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              <HugeiconsIcon icon={tab.icon} size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══ Tab: My Bots ══ */}
        {activeTab === 'my-bots' && (
          <div className="space-y-6">
            {/* Header avec bouton créer */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Mes Bots</h1>
                <p className="text-sm text-[var(--muted)]">Gérez vos bots, tokens et commandes</p>
              </div>
              <Button onPress={openCreate} className="bg-[var(--accent)] text-white">
                <HugeiconsIcon icon={PlusIcon} size={16} />
                Créer un bot
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
                  Créez votre premier bot pour commencer à développer sur AlfyChat
                </p>
                <Button className="mx-auto bg-[var(--accent)] text-white" onPress={openCreate}>
                  <HugeiconsIcon icon={PlusIcon} size={16} />
                  Créer mon premier bot
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
                              <span className="inline-flex items-center gap-0.5 rounded bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-bold text-blue-400 border border-blue-500/30">
                                <svg className="size-2.5" viewBox="0 0 16 16" fill="currentColor">
                                  <path d="M8 0l2.5 3.5L14.5 2l-1.5 4L16 8l-3.5 2.5L14.5 14l-4-1.5L8 16l-2.5-3.5L1.5 14l1.5-4L0 8l3.5-2.5L1.5 2l4 1.5L8 0z"/>
                                </svg>
                                VÉRIFIÉ
                              </span>
                            )}
                            <span className="inline-flex items-center gap-0.5 rounded bg-[var(--muted)]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--muted)]">
                              BOT
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className={cn('flex items-center gap-1 text-xs', st.text)}>
                              <span className={cn('size-1.5 rounded-full', st.color)} />
                              {st.label}
                            </span>
                            <span className="text-[10px] text-[var(--muted)]">•</span>
                            <span className="text-xs text-[var(--muted)]">{bot.serverCount} serveur{bot.serverCount !== 1 ? 's' : ''}</span>
                            <span className="text-[10px] text-[var(--muted)]">•</span>
                            <span className="text-xs text-[var(--muted)]">Préfixe: {bot.prefix}</span>
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
                            <span key={tag} className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                              {tag}
                            </span>
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
                              <p className="text-[10px] text-[var(--muted)] text-center">+{bot.commands.length - 5} commandes supplémentaires</p>
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
        )}

        {/* ══ Tab: Documentation ══ */}
        {activeTab === 'documentation' && <BotDocumentation />}
      </div>

      {/* ══════════════ MODALS ══════════════ */}

      {/* ── Create/Edit Bot Modal ── */}
      <Modal.Backdrop isOpen={showBotModal} onOpenChange={setShowBotModal}>
        <Modal.Container>
        <Modal.Dialog className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)] shadow-2xl">
          <Modal.Header>
            <Modal.Heading>{editingBot ? 'Modifier le bot' : 'Créer un nouveau bot'}</Modal.Heading>
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
                placeholder="Un bot qui fait des trucs géniaux..." maxLength={500} rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">Préfixe</label>
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
                  placeholder="https://alfychat.fr/invite/abc123"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">Politique de confidentialité</label>
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
              {editingBot ? 'Enregistrer' : 'Créer le bot'}
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
              <p className="text-xs text-red-400 font-semibold">⚠️ Ne partagez jamais votre token !</p>
              <p className="text-[10px] text-red-400/70 mt-0.5">
                Le token donne un accès complet à votre bot. Si compromis, régénérez-le immédiatement.
              </p>
            </div>
            {tokenBot && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-[var(--muted)]">Token</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg bg-[var(--background)] border border-[var(--border)] px-3 py-2 font-mono text-xs break-all text-[var(--foreground)]">
                    {showToken ? tokenBot.token : '•'.repeat(48)}
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
              Régénérer
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
                Un bot certifié obtient le badge de vérification, une meilleure visibilité
                dans les listes publiques et inspire confiance aux utilisateurs.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">
                Pourquoi votre bot devrait être certifié ? *
              </label>
              <textarea
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] resize-none focus:border-[var(--accent)] focus:outline-none"
                value={certifReason} onChange={e => setCertifReason(e.target.value)}
                placeholder="Expliquez le but de votre bot, le nombre de serveurs, les fonctionnalités uniques..."
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
            <Modal.Heading>Ajouter une commande — {cmdBot?.name}</Modal.Heading>
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
              Cette action est irréversible. Le bot sera supprimé de tous les serveurs et toutes les données associées seront perdues.
            </p>
          </Modal.Body>
          <Modal.Footer className="gap-2">
            <Button variant="outline" onPress={() => setConfirmDelete(null)}>Annuler</Button>
            <Button variant="danger" onPress={() => confirmDelete && handleDeleteBot(confirmDelete)}>
              Supprimer définitivement
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
 * COMPOSANT: Documentation API Bot ultra-complète
 * ══════════════════════════════════════════════════════════════════ */

function BotDocumentation() {
  const [openSection, setOpenSection] = useState<string | null>('intro');

  const toggleSection = (id: string) => {
    setOpenSection(prev => prev === id ? null : id);
  };

  const Section = ({ id, title, icon, children }: {
    id: string; title: string; icon: any; children: React.ReactNode;
  }) => (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[var(--surface)]/50 transition-colors"
        onClick={() => toggleSection(id)}
      >
        <HugeiconsIcon icon={icon} size={18} className="text-[var(--accent)]" />
        <span className="text-sm font-semibold flex-1">{title}</span>
        <svg
          className={cn('size-4 text-[var(--muted)] transition-transform', openSection === id && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {openSection === id && (
        <div className="border-t border-[var(--border)] bg-[var(--surface)]/30 px-5 py-5 space-y-4">
          {children}
        </div>
      )}
    </div>
  );

  const CodeBlock = ({ title, code }: { title?: string; code: string }) => (
    <div className="rounded-xl overflow-hidden border border-[var(--border)]">
      {title && (
        <div className="bg-[var(--surface)] px-4 py-2 border-b border-[var(--border)]">
          <span className="text-[11px] font-mono font-semibold text-[var(--muted)]">{title}</span>
        </div>
      )}
      <pre className="bg-[#0d1117] p-4 overflow-x-auto text-[12px] leading-relaxed">
        <code className="text-gray-300 font-mono whitespace-pre">{code}</code>
      </pre>
    </div>
  );

  const Endpoint = ({ method, path, desc }: { method: string; path: string; desc: string }) => (
    <div className="flex items-start gap-3 rounded-lg bg-[var(--background)]/50 px-3 py-2.5">
      <span className={cn(
        'shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase',
        method === 'GET' && 'bg-green-500/15 text-green-400',
        method === 'POST' && 'bg-blue-500/15 text-blue-400',
        method === 'PATCH' && 'bg-yellow-500/15 text-yellow-400',
        method === 'DELETE' && 'bg-red-500/15 text-red-400',
      )}>
        {method}
      </span>
      <div className="min-w-0">
        <code className="text-xs font-mono font-semibold text-[var(--foreground)]">{path}</code>
        <p className="text-[11px] text-[var(--muted)] mt-0.5">{desc}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Documentation API Bot</h1>
        <p className="text-sm text-[var(--muted)]">Guide complet pour développer des bots sur AlfyChat</p>
      </div>

      {/* ── Introduction ── */}
      <Section id="intro" title="Introduction & Concepts" icon={BookOpenIcon}>
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">
            L&apos;API Bot AlfyChat vous permet de créer des bots qui interagissent avec les serveurs, channels et utilisateurs.
            Les bots peuvent envoyer des messages, répondre aux commandes, gérer des rôles et bien plus.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
              <h4 className="text-sm font-semibold text-blue-400 mb-1">API REST</h4>
              <p className="text-[11px] text-blue-400/70">Toutes les opérations CRUD via HTTP</p>
            </div>
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4">
              <h4 className="text-sm font-semibold text-green-400 mb-1">WebSocket</h4>
              <p className="text-[11px] text-green-400/70">Événements temps réel via Socket.io</p>
            </div>
            <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4">
              <h4 className="text-sm font-semibold text-violet-400 mb-1">Redis Events</h4>
              <p className="text-[11px] text-violet-400/70">Pub/Sub pour les événements bot</p>
            </div>
          </div>
          <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4">
            <h4 className="text-sm font-semibold mb-2">Base URL</h4>
            <code className="text-xs font-mono text-[var(--accent)]">https://api.alfychat.fr</code>
            <p className="text-[11px] text-[var(--muted)] mt-1">Toutes les routes sont préfixées par <code className="text-[var(--accent)]">/api/bots</code></p>
          </div>
        </div>
      </Section>

      {/* ── Authentification ── */}
      <Section id="auth" title="Authentification" icon={KeyIcon}>
        <p className="text-sm text-[var(--muted)]">
          Chaque bot possède un token unique généré lors de sa création. Ce token sert d&apos;identifiant pour toutes les requêtes API.
        </p>
        <CodeBlock title="Header d'authentification" code={`// Toutes les requêtes bot doivent inclure ce header
Authorization: Bot VOTRE_TOKEN_ICI

// Exemple avec fetch
const response = await fetch('https://api.alfychat.fr/api/bots/authenticate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bot abc123def456...',
    'Content-Type': 'application/json'
  }
});`} />
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3">
          <p className="text-xs text-red-400 font-semibold">⚠️ Sécurité du token</p>
          <ul className="text-[11px] text-red-400/70 mt-1 space-y-0.5 list-disc pl-4">
            <li>Ne commitez jamais votre token dans un repo public</li>
            <li>Utilisez des variables d&apos;environnement</li>
            <li>Si compromis, régénérez-le immédiatement depuis le portail développeur</li>
            <li>Le token donne un accès complet aux fonctionnalités du bot</li>
          </ul>
        </div>
        <CodeBlock title="Exemple complet: Authentification Bot" code={`// bot.js — Connexion de base
const BOT_TOKEN = process.env.BOT_TOKEN;
const API_BASE = 'https://api.alfychat.fr/api';

// 1. Vérifier que le token est valide
async function authenticate() {
  const res = await fetch(\`\${API_BASE}/bots/authenticate\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bot \${BOT_TOKEN}\`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error('Token invalide');
  }

  const data = await res.json();
  console.log('Bot connecté:', data.bot.name);
  return data.bot;
}

authenticate();`} />
      </Section>

      {/* ── Démarrage rapide ── */}
      <Section id="quickstart" title="Démarrage rapide (5 min)" icon={ZapIcon}>
        <p className="text-sm text-[var(--muted)]">
          Créez votre premier bot en 5 étapes simples.
        </p>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">1</span>
            <div>
              <h4 className="text-sm font-semibold">Créer un bot</h4>
              <p className="text-xs text-[var(--muted)]">Allez dans l&apos;onglet &quot;Mes Bots&quot; et cliquez sur &quot;Créer un bot&quot;</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">2</span>
            <div>
              <h4 className="text-sm font-semibold">Copier le token</h4>
              <p className="text-xs text-[var(--muted)]">Cliquez sur l&apos;icône clé pour voir et copier votre token</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">3</span>
            <div>
              <h4 className="text-sm font-semibold">Installer les dépendances</h4>
              <CodeBlock code={`npm init -y
npm install node-fetch socket.io-client dotenv`} />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">4</span>
            <div>
              <h4 className="text-sm font-semibold">Créer le fichier bot</h4>
              <CodeBlock title="bot.js" code={`require('dotenv').config();
const { io } = require('socket.io-client');

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_BASE = 'https://api.alfychat.fr/api';

// Connexion WebSocket
const socket = io('https://api.alfychat.fr', {
  auth: { token: BOT_TOKEN, type: 'bot' }
});

socket.on('connect', () => {
  console.log('🤖 Bot connecté au Gateway !');
});

// Écouter les nouveaux messages
socket.on('NEW_MESSAGE', async (message) => {
  console.log(\`Message reçu: \${message.content}\`);
  
  // Répondre aux commandes
  if (message.content === '!ping') {
    await fetch(\`\${API_BASE}/messages\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bot \${BOT_TOKEN}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channelId: message.channelId,
        content: '🏓 Pong !'
      })
    });
  }
});

socket.on('disconnect', () => {
  console.log('Bot déconnecté');
});`} />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">5</span>
            <div>
              <h4 className="text-sm font-semibold">Lancer le bot</h4>
              <CodeBlock code={`# Créer le .env
echo "BOT_TOKEN=votre_token_ici" > .env

# Lancer
node bot.js`} />
            </div>
          </div>
        </div>
      </Section>

      {/* ── Endpoints API ── */}
      <Section id="endpoints" title="Référence complète des endpoints" icon={GlobeIcon}>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-[var(--accent)]">Gestion du bot</h4>
          <div className="space-y-1.5">
            <Endpoint method="POST" path="/api/bots" desc="Créer un nouveau bot" />
            <Endpoint method="GET" path="/api/bots/me" desc="Lister vos bots" />
            <Endpoint method="GET" path="/api/bots/public" desc="Lister les bots publics (?search=&tag=)" />
            <Endpoint method="GET" path="/api/bots/:id" desc="Obtenir les détails d'un bot" />
            <Endpoint method="PATCH" path="/api/bots/:id" desc="Mettre à jour un bot" />
            <Endpoint method="DELETE" path="/api/bots/:id" desc="Supprimer un bot" />
            <Endpoint method="POST" path="/api/bots/:id/regenerate-token" desc="Régénérer le token" />
            <Endpoint method="PATCH" path="/api/bots/:id/status" desc="Mettre à jour le statut (online/offline/maintenance)" />
            <Endpoint method="POST" path="/api/bots/authenticate" desc="Vérifier un token bot (Header: Authorization: Bot TOKEN)" />
          </div>

          <h4 className="text-sm font-semibold text-[var(--accent)] mt-6">Commandes</h4>
          <div className="space-y-1.5">
            <Endpoint method="GET" path="/api/bots/:id/commands" desc="Lister les commandes d'un bot" />
            <Endpoint method="POST" path="/api/bots/:id/commands" desc="Créer une commande" />
            <Endpoint method="PATCH" path="/api/bots/:id/commands/:cmdId" desc="Modifier une commande" />
            <Endpoint method="DELETE" path="/api/bots/:id/commands/:cmdId" desc="Supprimer une commande" />
          </div>

          <h4 className="text-sm font-semibold text-[var(--accent)] mt-6">Serveurs</h4>
          <div className="space-y-1.5">
            <Endpoint method="POST" path="/api/bots/:id/servers" desc="Ajouter le bot à un serveur" />
            <Endpoint method="DELETE" path="/api/bots/:id/servers/:serverId" desc="Retirer le bot d'un serveur" />
            <Endpoint method="GET" path="/api/bots/servers/:serverId" desc="Lister les bots d'un serveur" />
          </div>

          <h4 className="text-sm font-semibold text-[var(--accent)] mt-6">Certification</h4>
          <div className="space-y-1.5">
            <Endpoint method="POST" path="/api/bots/:id/certification" desc="Demander la certification" />
            <Endpoint method="GET" path="/api/bots/certification/pending" desc="Lister les demandes en attente (admin)" />
            <Endpoint method="POST" path="/api/bots/certification/:requestId/review" desc="Approuver/refuser une demande (admin)" />
          </div>
        </div>
      </Section>

      {/* ── Créer un bot ── */}
      <Section id="create-bot" title="Créer et configurer un bot" icon={BotIcon}>
        <CodeBlock title="POST /api/bots — Créer un bot" code={`// Requête
{
  "name": "MonBot",           // 2-32 caractères (obligatoire)
  "description": "Un super bot",  // max 500 caractères
  "prefix": "!"              // 1-5 caractères (défaut: "!")
}

// Réponse (201 Created)
{
  "success": true,
  "bot": {
    "id": "a1b2c3d4-...",
    "name": "MonBot",
    "description": "Un super bot",
    "token": "abc123def456...",   // ⚠️ Affiché UNE seule fois
    "prefix": "!",
    "status": "offline",
    "isPublic": false,
    "isVerified": false,
    "certificationStatus": "none",
    "inviteCount": 0,
    "serverCount": 0,
    "tags": [],
    "servers": [],
    "commands": [],
    "createdAt": "2025-03-25T...",
    "updatedAt": "2025-03-25T..."
  }
}`} />

        <CodeBlock title="PATCH /api/bots/:id — Mettre à jour" code={`// Champs modifiables
{
  "name": "NouveauNom",
  "description": "Nouvelle description",
  "prefix": "!!",
  "isPublic": true,
  "tags": ["Modération", "Fun"],
  "websiteUrl": "https://monbot.fr",
  "supportServerUrl": "https://alfychat.fr/invite/abc",
  "privacyPolicyUrl": "https://monbot.fr/privacy"
}

// Réponse (200 OK)
{
  "bot": { ... }  // Bot mis à jour
}`} />

        <CodeBlock title="PATCH /api/bots/:id/status — Changer le statut" code={`// Valeurs possibles: "online", "offline", "maintenance"
{
  "status": "online"
}

// Un événement Redis est publié sur le channel "bot:status"
// Format: { "botId": "...", "status": "online" }`} />
      </Section>

      {/* ── Commandes ── */}
      <Section id="commands" title="Système de commandes" icon={TerminalIcon}>
        <p className="text-sm text-[var(--muted)]">
          Enregistrez les commandes de votre bot pour les documenter et les rendre visibles aux utilisateurs.
        </p>
        <CodeBlock title="POST /api/bots/:id/commands — Créer une commande" code={`{
  "name": "help",              // 1-32 caractères
  "description": "Affiche la liste des commandes",  // 1-200 car.
  "usage": "!help [commande]", // Format d'utilisation
  "cooldown": 5,               // Secondes entre chaque utilisation
  "permissions": 0             // Bitfield de permissions requises
}

// Réponse
{
  "command": {
    "id": "cmd-uuid-...",
    "botId": "bot-uuid-...",
    "name": "help",
    "description": "Affiche la liste des commandes",
    "usage": "!help [commande]",
    "isEnabled": true,
    "cooldown": 5,
    "permissions": 0
  }
}`} />
        <CodeBlock title="Exemple: Bot avec handler de commandes" code={`class CommandHandler {
  constructor(prefix = '!') {
    this.prefix = prefix;
    this.commands = new Map();
  }

  register(name, handler, options = {}) {
    this.commands.set(name, {
      handler,
      description: options.description || '',
      usage: options.usage || \`\${this.prefix}\${name}\`,
      cooldown: options.cooldown || 0,
      cooldowns: new Map(),
    });
  }

  async handle(message) {
    if (!message.content.startsWith(this.prefix)) return;
    
    const args = message.content.slice(this.prefix.length).split(' ');
    const commandName = args.shift().toLowerCase();
    const command = this.commands.get(commandName);
    
    if (!command) return;

    // Vérifier le cooldown
    const now = Date.now();
    const userCooldown = command.cooldowns.get(message.authorId);
    if (userCooldown && now - userCooldown < command.cooldown * 1000) {
      return; // Encore en cooldown
    }
    command.cooldowns.set(message.authorId, now);

    // Exécuter la commande
    await command.handler(message, args);
  }
}

// Utilisation
const handler = new CommandHandler('!');

handler.register('ping', async (msg) => {
  await sendMessage(msg.channelId, '🏓 Pong !');
}, { description: 'Vérifie la latence', cooldown: 5 });

handler.register('avatar', async (msg, args) => {
  const userId = args[0] || msg.authorId;
  const user = await getUser(userId);
  await sendMessage(msg.channelId, \`Avatar: \${user.avatarUrl}\`);
}, {
  description: "Affiche l'avatar d'un utilisateur",
  usage: '!avatar [@utilisateur]',
  cooldown: 3
});

// Dans le handler de messages
socket.on('NEW_MESSAGE', (msg) => handler.handle(msg));`} />
      </Section>

      {/* ── Serveurs ── */}
      <Section id="servers" title="Gestion des serveurs" icon={ServerIcon}>
        <p className="text-sm text-[var(--muted)]">
          Ajoutez votre bot à des serveurs et gérez ses permissions.
        </p>
        <CodeBlock title="POST /api/bots/:id/servers — Ajouter à un serveur" code={`{
  "serverId": "server-uuid-...",
  "permissions": 0    // Bitfield de permissions
}

// Événement Redis publié: "bot:joined"
// { "botId": "...", "serverId": "..." }

// ⚠️ Le compteur invite_count du bot est incrémenté`} />
        <CodeBlock title="GET /api/bots/servers/:serverId — Bots d'un serveur" code={`// Réponse
{
  "bots": [
    {
      "id": "bot-1-uuid-...",
      "name": "ModBot",
      "status": "online",
      "isVerified": true,
      "prefix": "!",
      "commands": [...]
    },
    {
      "id": "bot-2-uuid-...",
      "name": "MusicBot",
      "status": "offline",
      "isVerified": false,
      "prefix": "~",
      "commands": [...]
    }
  ]
}`} />
      </Section>

      {/* ── WebSocket ── */}
      <Section id="websocket" title="WebSocket & événements temps réel" icon={ZapIcon}>
        <p className="text-sm text-[var(--muted)]">
          Connectez-vous au Gateway WebSocket pour recevoir des événements en temps réel.
        </p>
        <CodeBlock title="Connexion au Gateway" code={`const { io } = require('socket.io-client');

const socket = io('https://api.alfychat.fr', {
  auth: {
    token: process.env.BOT_TOKEN,
    type: 'bot'
  },
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

socket.on('connect', async () => {
  console.log('✅ Connecté au Gateway');
  
  // Mettre le bot en ligne
  fetch(\`\${API_BASE}/bots/\${BOT_ID}/status\`, {
    method: 'PATCH',
    headers: {
      'Authorization': \`Bot \${BOT_TOKEN}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: 'online' })
  });
});

socket.on('disconnect', () => {
  console.log('❌ Déconnecté du Gateway');
});`} />

        <h4 className="text-sm font-semibold mt-4">Événements disponibles</h4>
        <div className="space-y-2 mt-2">
          {[
            { event: 'NEW_MESSAGE', desc: 'Nouveau message dans un channel/DM', payload: '{ id, content, authorId, channelId, conversationId, createdAt, sender, attachments }' },
            { event: 'MESSAGE_UPDATED', desc: 'Message modifié', payload: '{ id, content, channelId, isEdited }' },
            { event: 'MESSAGE_DELETED', desc: 'Message supprimé', payload: '{ id, channelId }' },
            { event: 'TYPING_INDICATOR', desc: 'Utilisateur en train de taper', payload: '{ userId, channelId, isTyping }' },
            { event: 'PRESENCE_UPDATE', desc: 'Changement de présence', payload: '{ userId, status, isOnline }' },
            { event: 'MEMBER_JOINED', desc: 'Nouveau membre sur un serveur', payload: '{ serverId, userId, username }' },
            { event: 'MEMBER_LEFT', desc: "Membre parti d'un serveur", payload: '{ serverId, userId }' },
          ].map(e => (
            <div key={e.event} className="rounded-lg bg-[var(--background)]/50 border border-[var(--border)] p-3">
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono font-semibold text-green-400">{e.event}</code>
                <span className="text-[10px] text-[var(--muted)]">{e.desc}</span>
              </div>
              <code className="mt-1 block text-[10px] font-mono text-[var(--muted)]/70">{e.payload}</code>
            </div>
          ))}
        </div>

        <CodeBlock title="Écouter les événements" code={`// Messages
socket.on('NEW_MESSAGE', (message) => {
  console.log(\`[\${message.channelId}] \${message.sender?.username}: \${message.content}\`);
});

// Présence
socket.on('PRESENCE_UPDATE', (data) => {
  console.log(\`\${data.userId} est maintenant \${data.status}\`);
});

// Membres
socket.on('MEMBER_JOINED', (data) => {
  console.log(\`\${data.username} a rejoint le serveur \${data.serverId}\`);
});

// Typing
socket.on('TYPING_INDICATOR', (data) => {
  if (data.isTyping) {
    console.log(\`\${data.userId} est en train d'écrire...\`);
  }
});`} />
      </Section>

      {/* ── Envoyer des messages ── */}
      <Section id="messages" title="Envoyer et gérer des messages" icon={CodeIcon}>
        <CodeBlock title="Envoyer un message" code={`async function sendMessage(channelId, content, options = {}) {
  const res = await fetch(\`\${API_BASE}/messages\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bot \${BOT_TOKEN}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      channelId,
      content,
      ...options
    })
  });

  return res.json();
}

// Exemples d'utilisation
await sendMessage('channel-id', 'Hello World ! 👋');
await sendMessage('channel-id', '**Texte en gras** et *italique*');
await sendMessage('channel-id', 'Réponse à un message', {
  replyToId: 'message-id-original'
});`} />

        <CodeBlock title="Modifier et supprimer un message" code={`// Modifier un message
async function editMessage(messageId, newContent) {
  return fetch(\`\${API_BASE}/messages/\${messageId}\`, {
    method: 'PATCH',
    headers: {
      'Authorization': \`Bot \${BOT_TOKEN}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content: newContent })
  });
}

// Supprimer un message
async function deleteMessage(messageId) {
  return fetch(\`\${API_BASE}/messages/\${messageId}\`, {
    method: 'DELETE',
    headers: {
      'Authorization': \`Bot \${BOT_TOKEN}\`
    }
  });
}

// Exemple: Message auto-supprimé après 5 secondes
async function sendTempMessage(channelId, content, delay = 5000) {
  const res = await sendMessage(channelId, content);
  const data = await res.json();
  setTimeout(() => deleteMessage(data.id), delay);
}`} />
      </Section>

      {/* ── Certification ── */}
      <Section id="certification" title="Certification & Vérification" icon={ShieldCheckIcon}>
        <p className="text-sm text-[var(--muted)]">
          La certification donne à votre bot un badge de vérification et une meilleure visibilité.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4">
            <h4 className="text-sm font-semibold mb-2">Critères de certification</h4>
            <ul className="text-[11px] text-[var(--muted)] space-y-1 list-disc pl-4">
              <li>Bot fonctionnel et stable</li>
              <li>Description claire et complète</li>
              <li>Politique de confidentialité</li>
              <li>Aucun contenu abusif ou spam</li>
              <li>Présent sur au moins 1 serveur</li>
              <li>Commandes documentées</li>
            </ul>
          </div>
          <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4">
            <h4 className="text-sm font-semibold mb-2">Avantages</h4>
            <ul className="text-[11px] text-[var(--muted)] space-y-1 list-disc pl-4">
              <li>Badge de vérification ✓</li>
              <li>Meilleur classement dans la recherche</li>
              <li>Badge &quot;Verified Bot Developer&quot; sur votre profil</li>
              <li>Accès aux fonctionnalités premium</li>
              <li>Support prioritaire</li>
            </ul>
          </div>
        </div>
        <CodeBlock title="POST /api/bots/:id/certification — Demander la certification" code={`{
  "reason": "Mon bot de modération est utilisé par 50+ serveurs. 
             Il offre l'auto-modération, les logs et le système d'avertissements.
             Privacy policy: https://monbot.fr/privacy"
}

// Réponse (201 Created)
{
  "success": true,
  "requestId": "req-uuid-..."
}

// Le statut du bot passe à "pending"
// Un admin examinera votre demande`} />
      </Section>

      {/* ── Exemple complet ── */}
      <Section id="full-example" title="Exemple complet : Bot de modération" icon={CodeIcon}>
        <CodeBlock title="modbot.js — Bot complet" code={`require('dotenv').config();
const { io } = require('socket.io-client');

// ── Configuration ──
const CONFIG = {
  token: process.env.BOT_TOKEN,
  botId: process.env.BOT_ID,
  apiBase: 'https://api.alfychat.fr/api',
  prefix: '!',
};

// ── API Helper ──
async function apiCall(endpoint, options = {}) {
  const res = await fetch(\`\${CONFIG.apiBase}\${endpoint}\`, {
    ...options,
    headers: {
      'Authorization': \`Bot \${CONFIG.token}\`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res.json();
}

async function sendMessage(channelId, content) {
  return apiCall('/messages', {
    method: 'POST',
    body: JSON.stringify({ channelId, content }),
  });
}

// ── Système d'avertissements ──
const warnings = new Map(); // userId -> count

function getWarnings(userId) {
  return warnings.get(userId) || 0;
}

function addWarning(userId) {
  const count = getWarnings(userId) + 1;
  warnings.set(userId, count);
  return count;
}

// ── Commandes ──
const commands = {
  help: {
    description: 'Affiche les commandes disponibles',
    handler: async (msg) => {
      const cmdList = Object.entries(commands)
        .map(([name, cmd]) => \`**\${CONFIG.prefix}\${name}** — \${cmd.description}\`)
        .join('\\n');
      await sendMessage(msg.channelId, \`📋 **Commandes disponibles:**\\n\${cmdList}\`);
    },
  },

  warn: {
    description: "Avertir un utilisateur",
    handler: async (msg, args) => {
      const userId = args[0];
      const reason = args.slice(1).join(' ') || 'Aucune raison';
      if (!userId) {
        return sendMessage(msg.channelId, '❌ Usage: !warn @utilisateur [raison]');
      }
      const count = addWarning(userId);
      await sendMessage(msg.channelId,
        \`⚠️ **Avertissement** pour <@\${userId}> (\\#\${count})\\nRaison: \${reason}\`
      );
      if (count >= 3) {
        await sendMessage(msg.channelId,
          \`🔨 <@\${userId}> a atteint 3 avertissements !\`
        );
      }
    },
  },

  warnings: {
    description: "Voir les avertissements d'un utilisateur",
    handler: async (msg, args) => {
      const userId = args[0] || msg.authorId;
      const count = getWarnings(userId);
      await sendMessage(msg.channelId,
        \`📊 <@\${userId}> a **\${count}** avertissement(s)\`
      );
    },
  },

  clear: {
    description: 'Réinitialiser les avertissements',
    handler: async (msg, args) => {
      const userId = args[0];
      if (!userId) {
        return sendMessage(msg.channelId, '❌ Usage: !clear @utilisateur');
      }
      warnings.delete(userId);
      await sendMessage(msg.channelId,
        \`✅ Avertissements de <@\${userId}> réinitialisés\`
      );
    },
  },

  ping: {
    description: 'Vérifier la latence',
    handler: async (msg) => {
      const start = Date.now();
      await sendMessage(msg.channelId, '🏓 Pong !');
      const latency = Date.now() - start;
      await sendMessage(msg.channelId, \`Latence: \${latency}ms\`);
    },
  },
};

// ── Connexion ──
const socket = io('https://api.alfychat.fr', {
  auth: { token: CONFIG.token, type: 'bot' },
});

socket.on('connect', async () => {
  console.log('🤖 ModBot connecté !');
  await apiCall(\`/bots/\${CONFIG.botId}/status\`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'online' }),
  });
});

socket.on('NEW_MESSAGE', async (message) => {
  if (!message.content.startsWith(CONFIG.prefix)) return;
  
  const args = message.content.slice(CONFIG.prefix.length).split(' ');
  const cmdName = args.shift()?.toLowerCase();
  const command = commands[cmdName];
  
  if (command) {
    try {
      await command.handler(message, args);
    } catch (err) {
      console.error(\`Erreur commande \${cmdName}:\`, err);
      await sendMessage(message.channelId, '❌ Une erreur est survenue.');
    }
  }
});

socket.on('disconnect', () => {
  console.log('❌ ModBot déconnecté');
});`} />
      </Section>

      {/* ── Rate Limits ── */}
      <Section id="rate-limits" title="Limites & bonnes pratiques" icon={TagIcon}>
        <div className="space-y-4">
          <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4">
            <h4 className="text-sm font-semibold mb-3">Rate Limits</h4>
            <div className="space-y-2">
              {[
                { route: 'Global', limit: '100 requêtes / 60 secondes' },
                { route: 'POST /messages', limit: '5 messages / 5 secondes par channel' },
                { route: 'PATCH /bots/:id', limit: '2 requêtes / 10 secondes' },
                { route: 'POST /bots/:id/regenerate-token', limit: '1 requête / 60 secondes' },
              ].map(r => (
                <div key={r.route} className="flex items-center justify-between rounded-lg bg-[var(--background)]/50 px-3 py-2">
                  <code className="text-xs font-mono text-[var(--foreground)]">{r.route}</code>
                  <span className="text-xs text-[var(--muted)]">{r.limit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4">
            <h4 className="text-sm font-semibold mb-3">Bonnes pratiques</h4>
            <ul className="text-xs text-[var(--muted)] space-y-2 list-disc pl-4">
              <li><strong>Gestion d&apos;erreurs</strong> — Entourez chaque handler de try/catch et loguez les erreurs</li>
              <li><strong>Cooldowns</strong> — Implémentez des cooldowns côté bot pour éviter le spam</li>
              <li><strong>Reconnexion</strong> — Utilisez les options de reconnexion de Socket.io</li>
              <li><strong>Variables d&apos;environnement</strong> — Ne hardcodez jamais le token</li>
              <li><strong>Statut</strong> — Mettez le statut à &quot;online&quot; à la connexion et &quot;offline&quot; à la déconnexion</li>
              <li><strong>Permissions</strong> — Vérifiez les permissions avant d&apos;exécuter des actions sensibles</li>
              <li><strong>Logs</strong> — Loguez les commandes exécutées pour le debugging</li>
              <li><strong>Graceful shutdown</strong> — Gérez SIGINT/SIGTERM pour un arrêt propre</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* ── Codes d'erreur ── */}
      <Section id="errors" title="Codes d'erreur" icon={XCircleIcon}>
        <div className="space-y-1.5">
          {[
            { code: 200, desc: 'Succès', color: 'text-green-400' },
            { code: 201, desc: 'Ressource créée', color: 'text-green-400' },
            { code: 400, desc: 'Requête invalide (données manquantes ou format incorrect)', color: 'text-yellow-400' },
            { code: 401, desc: 'Token invalide ou manquant', color: 'text-red-400' },
            { code: 403, desc: 'Permissions insuffisantes', color: 'text-red-400' },
            { code: 404, desc: 'Ressource non trouvée (bot, commande, serveur)', color: 'text-orange-400' },
            { code: 429, desc: 'Rate limit atteint — attendez avant de réessayer', color: 'text-red-400' },
            { code: 500, desc: 'Erreur serveur interne', color: 'text-red-400' },
            { code: 502, desc: 'Service indisponible (le microservice bot est down)', color: 'text-red-400' },
          ].map(e => (
            <div key={e.code} className="flex items-center gap-3 rounded-lg bg-[var(--background)]/50 px-3 py-2.5">
              <span className={cn('text-sm font-mono font-bold', e.color)}>{e.code}</span>
              <span className="text-xs text-[var(--muted)]">{e.desc}</span>
            </div>
          ))}
        </div>
        <CodeBlock title="Format de réponse d'erreur" code={`// Erreur de validation (400)
{
  "error": "Données invalides",
  "details": [
    {
      "field": "name",
      "message": "Nom requis (2-32 caractères)"
    }
  ]
}

// Erreur d'authentification (401)
{
  "error": "Token de bot invalide"
}

// Erreur serveur (500)
{
  "error": "Erreur lors de la création du bot"
}`} />
      </Section>

      {/* ── Exemple Python ── */}
      <Section id="python" title="Exemple en Python" icon={CodeIcon}>
        <p className="text-sm text-[var(--muted)]">
          Vous pouvez aussi développer votre bot en Python avec la bibliothèque requests et python-socketio.
        </p>
        <CodeBlock title="bot.py — Bot Python" code={`import os
import requests
import socketio

BOT_TOKEN = os.getenv('BOT_TOKEN')
API_BASE = 'https://api.alfychat.fr/api'
HEADERS = {
    'Authorization': f'Bot {BOT_TOKEN}',
    'Content-Type': 'application/json'
}

# Créer le client Socket.IO
sio = socketio.Client()

def send_message(channel_id: str, content: str):
    """Envoyer un message dans un channel."""
    return requests.post(f'{API_BASE}/messages', json={
        'channelId': channel_id,
        'content': content,
    }, headers=HEADERS)

@sio.event
def connect():
    print('🤖 Bot Python connecté !')

@sio.on('NEW_MESSAGE')
def on_message(data):
    content = data.get('content', '')
    channel_id = data.get('channelId')
    
    if content == '!ping':
        send_message(channel_id, '🏓 Pong depuis Python !')
    
    elif content == '!info':
        send_message(channel_id, '🐍 Bot écrit en Python avec python-socketio')

@sio.event
def disconnect():
    print('❌ Bot déconnecté')

# Connexion
sio.connect('https://api.alfychat.fr', auth={
    'token': BOT_TOKEN,
    'type': 'bot'
})

sio.wait()`} />
        <CodeBlock title="requirements.txt" code={`python-socketio[client]
requests
python-dotenv`} />
      </Section>
    </div>
  );
}
