'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon, BotIcon, TerminalIcon, GlobeIcon, LinkIcon, LockIcon,
  ShieldCheckIcon, KeyIcon, CopyIcon, EyeIcon, EyeOffIcon, RefreshCwIcon,
  PlusIcon, Trash2Icon, XIcon, CheckCircleIcon, ClockIcon, XCircleIcon,
  SaveIcon,
} from '@/components/icons';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton,
} from '@/components/ui/input-group';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { api, resolveMediaUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

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
  redirectUris?: string[];
  commands: BotCommand[];
}

interface BotCommand {
  id: string;
  name: string;
  description: string;
  usage: string;
  isEnabled: boolean;
  cooldown: number;
}

// ── Constantes ───────────────────────────────────────────────────────────────

const AVAILABLE_TAGS = [
  'Modération', 'Musique', 'Jeux', 'Utilitaire', 'Fun',
  'Social', 'Économie', 'Niveaux', 'Logs', 'Sondages',
  'Notifications', 'Traduction', 'IA', 'Statistiques', 'Rôles',
];

const PERMISSIONS = [
  { bit: 0x1,   label: 'Lire les messages',       desc: 'Voir les messages dans les salons' },
  { bit: 0x2,   label: 'Envoyer des messages',    desc: 'Envoyer des messages dans les salons' },
  { bit: 0x4,   label: 'Ajouter des réactions',   desc: 'Réagir aux messages avec des émojis' },
  { bit: 0x8,   label: 'Gérer les messages',      desc: 'Supprimer et épingler des messages' },
  { bit: 0x10,  label: 'Expulser des membres',    desc: 'Expulser des membres du serveur' },
  { bit: 0x20,  label: 'Bannir des membres',      desc: 'Bannir des membres du serveur' },
  { bit: 0x40,  label: 'Administrateur',          desc: 'Accès complet (inclut toutes les permissions)' },
  { bit: 0x80,  label: 'Gérer les salons',        desc: 'Créer, modifier et supprimer des salons' },
  { bit: 0x100, label: 'Gérer les rôles',         desc: 'Créer, modifier et supprimer des rôles' },
];

const CERTIF_CONFIG = {
  none:     { border: 'border-border/40',        bg: 'bg-background/50',    icon: null,             color: '', label: 'Aucune certification' },
  pending:  { border: 'border-yellow-500/30',    bg: 'bg-yellow-500/5',     icon: ClockIcon,        color: 'text-yellow-400', label: 'En attente de révision' },
  approved: { border: 'border-emerald-500/30',   bg: 'bg-emerald-500/5',    icon: CheckCircleIcon,  color: 'text-emerald-400', label: 'Certifié' },
  rejected: { border: 'border-destructive/30',   bg: 'bg-destructive/5',    icon: XCircleIcon,      color: 'text-destructive', label: 'Certification refusée' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-5', className)}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
      {children}
    </p>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function BotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [bot, setBot] = useState<BotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Général — état local (dirty tracking)
  const [generalForm, setGeneralForm] = useState({
    name: '', description: '', prefix: '!', isPublic: false,
    status: 'offline' as 'online' | 'offline' | 'maintenance',
    websiteUrl: '', supportServerUrl: '', privacyPolicyUrl: '', tags: [] as string[],
  });
  const [generalDirty, setGeneralDirty] = useState(false);

  // Token
  const [showToken, setShowToken] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [showRegenTokenDialog, setShowRegenTokenDialog] = useState(false);
  const [regenTokenLoading, setRegenTokenLoading] = useState(false);
  const [currentToken, setCurrentToken] = useState('');

  // OAuth2
  const [oauth2Config, setOAuth2Config] = useState<{ clientId: string; clientSecretMasked: string; redirectUris: string[] } | null>(null);
  const [oauth2Loading, setOAuth2Loading] = useState(false);
  const [redirectUrisLocal, setRedirectUrisLocal] = useState<string[]>([]);
  const [redirectUrisDirty, setRedirectUrisDirty] = useState(false);
  const [savingUris, setSavingUris] = useState(false);
  const [uriSaveError, setUriSaveError] = useState('');
  const [showRegenSecretDialog, setShowRegenSecretDialog] = useState(false);
  const [regenSecretLoading, setRegenSecretLoading] = useState(false);
  const [newClientSecret, setNewClientSecret] = useState<string | null>(null);
  const [permsBitmask, setPermsBitmask] = useState(0);
  const [secretCopied, setSecretCopied] = useState(false);
  const [clientIdCopied, setClientIdCopied] = useState(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);

  // Commandes
  const [commands, setCommands] = useState<BotCommand[]>([]);
  const [showAddCmd, setShowAddCmd] = useState(false);
  const [cmdForm, setCmdForm] = useState({ name: '', description: '', usage: '', cooldown: 0 });
  const [cmdSaving, setCmdSaving] = useState(false);

  // Certification
  const [certifReason, setCertifReason] = useState('');
  const [certifSaving, setCertifSaving] = useState(false);
  const [certifError, setCertifError] = useState('');

  // ── Chargement ────────────────────────────────────────────────────────────

  const loadBot = useCallback(async () => {
    setLoading(true);
    const res = await api.getBotById(id);
    if (res.success && res.data) {
      const b = (res.data as any).bot as BotData;
      setBot(b);
      setCurrentToken(b.token);
      setGeneralForm({
        name: b.name, description: b.description || '', prefix: b.prefix,
        isPublic: b.isPublic, status: b.status,
        websiteUrl: b.websiteUrl || '', supportServerUrl: b.supportServerUrl || '',
        privacyPolicyUrl: b.privacyPolicyUrl || '', tags: b.tags || [],
      });
      setCommands(b.commands || []);
    }
    setLoading(false);
  }, [id]);

  const loadOAuth2 = useCallback(async () => {
    setOAuth2Loading(true);
    const res = await api.getBotOAuth2Config(id);
    if (res.success && res.data) {
      const cfg = res.data as any;
      setOAuth2Config(cfg);
      setRedirectUrisLocal(cfg.redirectUris || []);
    }
    setOAuth2Loading(false);
  }, [id]);

  useEffect(() => { loadBot(); }, [loadBot]);
  useEffect(() => {
    if (activeTab === 'oauth2' && !oauth2Config) loadOAuth2();
  }, [activeTab, oauth2Config, loadOAuth2]);

  // ── Général ───────────────────────────────────────────────────────────────

  const updateGeneralField = <K extends keyof typeof generalForm>(key: K, value: typeof generalForm[K]) => {
    setGeneralForm(prev => ({ ...prev, [key]: value }));
    setGeneralDirty(true);
  };

  const toggleTag = (tag: string) => {
    setGeneralForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : prev.tags.length < 5 ? [...prev.tags, tag] : prev.tags,
    }));
    setGeneralDirty(true);
  };

  const saveGeneral = async () => {
    if (!generalDirty) return;
    setSaving(true);
    const res = await api.updateBot(id, generalForm);
    if (res.success) { setGeneralDirty(false); await loadBot(); }
    setSaving(false);
  };

  // ── Token ─────────────────────────────────────────────────────────────────

  const copyToken = () => {
    navigator.clipboard.writeText(currentToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const handleRegenToken = async () => {
    setRegenTokenLoading(true);
    const res = await api.regenerateBotToken(id);
    if (res.success && res.data) {
      const newTok = (res.data as any).token;
      setCurrentToken(newTok);
      setShowToken(true);
    }
    setRegenTokenLoading(false);
    setShowRegenTokenDialog(false);
  };

  // ── OAuth2 ────────────────────────────────────────────────────────────────

  const handleRegenSecret = async () => {
    setRegenSecretLoading(true);
    const res = await api.regenerateBotClientSecret(id);
    if (res.success && res.data) {
      setNewClientSecret((res.data as any).clientSecret);
      await loadOAuth2();
    }
    setRegenSecretLoading(false);
    setShowRegenSecretDialog(false);
  };

  const saveRedirectUris = async () => {
    setUriSaveError('');
    setSavingUris(true);
    const res = await api.updateBotRedirectUris(id, redirectUrisLocal.filter(u => u.trim()));
    if (res.success) {
      setRedirectUrisDirty(false);
      await loadOAuth2();
    } else {
      const msg = (res as any).error || (res.data as any)?.error || 'Erreur lors de l\'enregistrement. Vérifiez que les URIs commencent par https:// ou http://localhost.';
      setUriSaveError(msg);
    }
    setSavingUris(false);
  };

  const addRedirectUri = () => {
    if (redirectUrisLocal.length >= 5) return;
    setRedirectUrisLocal(prev => [...prev, '']);
    setRedirectUrisDirty(true);
  };

  const updateUri = (i: number, val: string) => {
    setRedirectUrisLocal(prev => prev.map((u, idx) => idx === i ? val : u));
    setRedirectUrisDirty(true);
  };

  const removeUri = (i: number) => {
    setRedirectUrisLocal(prev => prev.filter((_, idx) => idx !== i));
    setRedirectUrisDirty(true);
  };

  const togglePerm = (bit: number) => setPermsBitmask(prev => prev ^ bit);

  const getInviteLink = () => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const uri = redirectUrisLocal.find(u => u.trim()) || '';
    const params = new URLSearchParams({
      client_id: id,
      scope: 'bot',
      permissions: String(permsBitmask),
    });
    if (uri) params.set('redirect_uri', uri);
    return `${base}/oauth2/authorize?${params.toString()}`;
  };

  const copyText = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  // ── Commandes ─────────────────────────────────────────────────────────────

  const handleAddCommand = async () => {
    if (!cmdForm.name || !cmdForm.description) return;
    setCmdSaving(true);
    const res = await api.createBotCommand(id, cmdForm);
    if (res.success) {
      setShowAddCmd(false);
      setCmdForm({ name: '', description: '', usage: '', cooldown: 0 });
      await loadBot();
    }
    setCmdSaving(false);
  };

  const handleDeleteCommand = async (commandId: string) => {
    await api.deleteBotCommand(id, commandId);
    await loadBot();
  };

  const handleToggleCommand = async (commandId: string, isEnabled: boolean) => {
    await api.updateBotCommand(id, commandId, { isEnabled });
    await loadBot();
  };

  // ── Certification ─────────────────────────────────────────────────────────

  const handleRequestCertification = async () => {
    if (!bot || certifReason.length < 10) return;
    setCertifSaving(true);
    setCertifError('');
    const res = await api.requestBotCertification(id, certifReason);
    if (res.success) { setCertifReason(''); await loadBot(); }
    else setCertifError((res as any).error || 'Une erreur est survenue');
    setCertifSaving(false);
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-full px-6 py-10 md:px-10 lg:px-14">
        <div className="mx-auto max-w-3xl space-y-6">
          <Skeleton className="h-12 w-64 rounded-xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 py-20">
        <BotIcon size={32} className="text-muted-foreground/30" />
        <p className="text-[14px] text-muted-foreground">Bot introuvable</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/developers/bots">Retour à mes bots</Link>
        </Button>
      </div>
    );
  }

  const certif = CERTIF_CONFIG[bot.certificationStatus] || CERTIF_CONFIG.none;
  const isDirty = activeTab === 'general' && generalDirty;

  return (
    <div className="min-h-full px-6 py-10 md:px-10 lg:px-14">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Header */}
        <MotionFade direction="down" distance={8} duration={0.3}>
          <div className="flex items-center gap-3">
            <Button asChild size="icon" variant="ghost" className="size-8 shrink-0">
              <Link href="/developers/bots">
                <ArrowLeftIcon size={14} />
              </Link>
            </Button>
            <div className="flex size-10 items-center justify-center rounded-xl border border-border/40 bg-background">
              {bot.avatarUrl ? (
                <img src={resolveMediaUrl(bot.avatarUrl)} alt={bot.name} className="size-10 rounded-xl object-cover" />
              ) : (
                <span className="text-sm font-bold text-accent">{bot.name[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-[16px] font-bold text-foreground">{bot.name}</h1>
                {bot.isVerified && (
                  <Badge className="h-4 border border-blue-500/30 bg-blue-500/10 px-1.5 text-[9px] text-blue-400">
                    VÉRIFIÉ
                  </Badge>
                )}
                <Badge className="h-4 border border-border/40 bg-background px-1.5 text-[9px] text-muted-foreground">
                  BOT
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {bot.serverCount} serveur{bot.serverCount !== 1 ? 's' : ''} · {bot.inviteCount} invitation{bot.inviteCount !== 1 ? 's' : ''}
              </p>
            </div>
            {isDirty && (
              <Button size="sm" onClick={saveGeneral} disabled={saving} className="shrink-0">
                {saving ? <Spinner className="size-3.5" /> : <SaveIcon size={13} />}
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            )}
          </div>
        </MotionFade>

        {/* Onglets */}
        <MotionFade direction="up" distance={8} duration={0.35}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList variant="line" className="mb-6">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="oauth2">OAuth2</TabsTrigger>
              <TabsTrigger value="commands">Commandes</TabsTrigger>
              <TabsTrigger value="certification">Certification</TabsTrigger>
            </TabsList>

            {/* ═══════════════ GÉNÉRAL ═══════════════ */}
            <TabsContent value="general" className="space-y-4">
              <MotionStagger className="space-y-4">

                {/* Identité */}
                <MotionStaggerItem>
                  <SectionCard>
                    <SectionLabel>Identité</SectionLabel>
                    <div className="space-y-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Nom</label>
                        <InputGroup className="h-9">
                          <InputGroupInput
                            value={generalForm.name}
                            onChange={e => updateGeneralField('name', e.target.value)}
                            maxLength={32}
                            className="text-sm"
                          />
                          <InputGroupAddon align="inline-start">
                            <BotIcon size={14} className="text-muted-foreground/50" />
                          </InputGroupAddon>
                        </InputGroup>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Description</label>
                        <textarea
                          value={generalForm.description}
                          onChange={e => updateGeneralField('description', e.target.value)}
                          maxLength={500}
                          rows={3}
                          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-ring focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Préfixe</label>
                        <InputGroup className="h-9">
                          <InputGroupInput
                            value={generalForm.prefix}
                            onChange={e => updateGeneralField('prefix', e.target.value)}
                            maxLength={5}
                            className="text-sm"
                          />
                          <InputGroupAddon align="inline-start">
                            <TerminalIcon size={14} className="text-muted-foreground/50" />
                          </InputGroupAddon>
                        </InputGroup>
                      </div>
                    </div>
                  </SectionCard>
                </MotionStaggerItem>

                {/* Visibilité */}
                <MotionStaggerItem>
                  <SectionCard>
                    <SectionLabel>Visibilité</SectionLabel>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-medium text-foreground">Bot public</p>
                          <p className="text-[11px] text-muted-foreground">Visible dans la liste publique des bots AlfyChat</p>
                        </div>
                        <Switch
                          checked={generalForm.isPublic}
                          onCheckedChange={v => updateGeneralField('isPublic', v)}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Statut</label>
                        <select
                          value={generalForm.status}
                          onChange={e => updateGeneralField('status', e.target.value as any)}
                          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-ring focus:outline-none"
                        >
                          <option value="online">En ligne</option>
                          <option value="offline">Hors ligne</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                      </div>
                    </div>
                  </SectionCard>
                </MotionStaggerItem>

                {/* Liens */}
                <MotionStaggerItem>
                  <SectionCard>
                    <SectionLabel>Liens</SectionLabel>
                    <div className="space-y-3">
                      {[
                        { key: 'websiteUrl', label: 'Site web', icon: GlobeIcon, placeholder: 'https://monbot.fr' },
                        { key: 'supportServerUrl', label: 'Serveur support', icon: LinkIcon, placeholder: 'https://alfychat.app/invite/abc' },
                        { key: 'privacyPolicyUrl', label: 'Politique de confidentialité', icon: LockIcon, placeholder: 'https://monbot.fr/privacy' },
                      ].map(({ key, label, icon: Icon, placeholder }) => (
                        <div key={key} className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
                          <InputGroup className="h-9">
                            <InputGroupInput
                              type="url"
                              placeholder={placeholder}
                              value={(generalForm as any)[key]}
                              onChange={e => updateGeneralField(key as any, e.target.value)}
                              className="text-sm"
                            />
                            <InputGroupAddon align="inline-start">
                              <Icon size={14} className="text-muted-foreground/50" />
                            </InputGroupAddon>
                          </InputGroup>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                </MotionStaggerItem>

                {/* Tags */}
                <MotionStaggerItem>
                  <SectionCard>
                    <SectionLabel>Tags <span className="text-muted-foreground/30">(max 5)</span></SectionLabel>
                    <div className="flex flex-wrap gap-1.5">
                      {AVAILABLE_TAGS.map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all',
                            generalForm.tags.includes(tag)
                              ? 'border-accent/30 bg-accent/15 text-accent'
                              : 'border-border/40 bg-background text-muted-foreground hover:border-accent/20'
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </SectionCard>
                </MotionStaggerItem>

                {/* Token — zone danger */}
                <MotionStaggerItem>
                  <SectionCard className="border-destructive/15 bg-destructive/3">
                    <SectionLabel>Token Bot</SectionLabel>
                    <div className="space-y-3">
                      <div className="rounded-xl border border-destructive/20 bg-destructive/8 px-3 py-2.5">
                        <p className="text-[11px] font-semibold text-destructive">Ne partagez jamais votre token</p>
                        <p className="mt-0.5 text-[10px] text-destructive/70">
                          Il donne un accès complet à votre bot. En cas de compromission, régénérez-le immédiatement.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 overflow-hidden rounded-lg border border-border/40 bg-background px-3 py-2 font-mono text-[12px] text-foreground">
                          {showToken ? currentToken : '•'.repeat(32)}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 shrink-0"
                          onClick={() => setShowToken(v => !v)}
                        >
                          {showToken ? <EyeOffIcon size={13} /> : <EyeIcon size={13} />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 shrink-0"
                          onClick={copyToken}
                        >
                          {tokenCopied ? <CheckCircleIcon size={13} className="text-emerald-400" /> : <CopyIcon size={13} />}
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={() => setShowRegenTokenDialog(true)}
                      >
                        <RefreshCwIcon size={13} />
                        Régénérer le token
                      </Button>
                    </div>
                  </SectionCard>
                </MotionStaggerItem>

              </MotionStagger>
            </TabsContent>

            {/* ═══════════════ OAUTH2 ═══════════════ */}
            <TabsContent value="oauth2" className="space-y-4">
              {oauth2Loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-40 rounded-2xl" />
                  <Skeleton className="h-40 rounded-2xl" />
                </div>
              ) : (
                <MotionStagger className="space-y-4">

                  {/* Identifiants */}
                  <MotionStaggerItem>
                    <SectionCard>
                      <SectionLabel>Identifiants de l&apos;application</SectionLabel>
                      <div className="space-y-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Client ID</label>
                          <div className="flex items-center gap-2">
                            <InputGroup className="h-9 flex-1">
                              <InputGroupInput
                                readOnly
                                value={id}
                                className="text-sm font-mono text-muted-foreground"
                              />
                              <InputGroupAddon align="inline-start">
                                <KeyIcon size={14} className="text-muted-foreground/50" />
                              </InputGroupAddon>
                            </InputGroup>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-9 shrink-0"
                              onClick={() => copyText(id, setClientIdCopied)}
                            >
                              {clientIdCopied ? <CheckCircleIcon size={13} className="text-emerald-400" /> : <CopyIcon size={13} />}
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Client Secret</label>
                          {newClientSecret ? (
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
                              <p className="text-[11px] font-semibold text-emerald-400">
                                Nouveau secret généré — copiez-le maintenant, il ne sera plus affiché.
                              </p>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 overflow-hidden rounded-lg border border-border/40 bg-background px-3 py-2 font-mono text-[12px] text-foreground break-all">
                                  {newClientSecret}
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-8 shrink-0"
                                  onClick={() => copyText(newClientSecret, setSecretCopied)}
                                >
                                  {secretCopied ? <CheckCircleIcon size={13} className="text-emerald-400" /> : <CopyIcon size={13} />}
                                </Button>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground"
                                onClick={() => setNewClientSecret(null)}
                              >
                                Masquer
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 rounded-lg border border-border/40 bg-background px-3 py-2 font-mono text-[12px] text-muted-foreground">
                                {oauth2Config?.clientSecretMasked || '••••••••••••••••••••••••••••'}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="shrink-0"
                                onClick={() => setShowRegenSecretDialog(true)}
                              >
                                <RefreshCwIcon size={12} />
                                Régénérer
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </SectionCard>
                  </MotionStaggerItem>

                  {/* Redirect URIs */}
                  <MotionStaggerItem>
                    <SectionCard>
                      <SectionLabel>URIs de redirection <span className="text-muted-foreground/30">(max 5)</span></SectionLabel>
                      <p className="mb-3 text-[12px] text-muted-foreground">
                        Les URIs autorisées pour recevoir le code d&apos;autorisation OAuth2. Doivent commencer par <span className="font-mono text-foreground">https://</span> ou <span className="font-mono text-foreground">http://localhost</span>.
                      </p>
                      <div className="space-y-2">
                        {redirectUrisLocal.map((uri, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <InputGroup className="h-9 flex-1">
                              <InputGroupInput
                                type="url"
                                placeholder="https://monapp.fr/callback"
                                value={uri}
                                onChange={e => updateUri(i, e.target.value)}
                                className="text-sm"
                              />
                              <InputGroupAddon align="inline-start">
                                <LinkIcon size={14} className="text-muted-foreground/50" />
                              </InputGroupAddon>
                            </InputGroup>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeUri(i)}
                            >
                              <XIcon size={13} />
                            </Button>
                          </div>
                        ))}
                        <div className="flex items-center gap-2">
                          {redirectUrisLocal.length < 5 && (
                            <Button size="sm" variant="outline" onClick={addRedirectUri}>
                              <PlusIcon size={13} />
                              Ajouter une URI
                            </Button>
                          )}
                          {redirectUrisDirty && (
                            <Button size="sm" onClick={saveRedirectUris} disabled={savingUris}>
                              {savingUris && <Spinner className="size-3.5" />}
                              Enregistrer
                            </Button>
                          )}
                        </div>
                        {uriSaveError && (
                          <p className="text-[12px] text-destructive">{uriSaveError}</p>
                        )}
                      </div>
                    </SectionCard>
                  </MotionStaggerItem>

                  {/* Générateur de lien d'invitation */}
                  <MotionStaggerItem>
                    <SectionCard>
                      <SectionLabel>Générateur de lien d&apos;invitation</SectionLabel>
                      <p className="mb-4 text-[12px] text-muted-foreground">
                        Sélectionnez les permissions que votre bot requiert pour générer un lien d&apos;invitation OAuth2.
                      </p>
                      <div className="mb-4 grid gap-2 sm:grid-cols-2">
                        {PERMISSIONS.map(perm => (
                          <label key={perm.bit} className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/40 bg-background/50 p-2.5 transition-colors hover:border-border/70">
                            <input
                              type="checkbox"
                              checked={(permsBitmask & perm.bit) !== 0}
                              onChange={() => togglePerm(perm.bit)}
                              className="mt-0.5 rounded accent-accent"
                            />
                            <div>
                              <p className="text-[12px] font-medium text-foreground">{perm.label}</p>
                              <p className="text-[10px] text-muted-foreground">{perm.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Lien généré
                        </label>
                        <span className="text-[10px] text-muted-foreground/50">
                          Permissions : {permsBitmask}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <InputGroup className="h-9 flex-1">
                          <InputGroupInput
                            readOnly
                            value={getInviteLink()}
                            className="text-[11px] font-mono text-muted-foreground"
                          />
                        </InputGroup>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-9 shrink-0"
                          onClick={() => copyText(getInviteLink(), setInviteLinkCopied)}
                        >
                          {inviteLinkCopied ? <CheckCircleIcon size={13} className="text-emerald-400" /> : <CopyIcon size={13} />}
                        </Button>
                      </div>
                    </SectionCard>
                  </MotionStaggerItem>

                </MotionStagger>
              )}
            </TabsContent>

            {/* ═══════════════ COMMANDES ═══════════════ */}
            <TabsContent value="commands" className="space-y-4">
              <SectionCard>
                <div className="mb-4 flex items-center justify-between">
                  <SectionLabel>Commandes ({commands.length})</SectionLabel>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddCmd(v => !v)}
                  >
                    {showAddCmd ? <XIcon size={13} /> : <PlusIcon size={13} />}
                    {showAddCmd ? 'Annuler' : 'Ajouter'}
                  </Button>
                </div>

                {showAddCmd && (
                  <div className="mb-4 rounded-xl border border-border/40 bg-background/60 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Nom *</label>
                        <InputGroup className="h-8">
                          <InputGroupInput
                            placeholder="help"
                            maxLength={32}
                            value={cmdForm.name}
                            onChange={e => setCmdForm(f => ({ ...f, name: e.target.value }))}
                            className="text-sm"
                          />
                        </InputGroup>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Cooldown (sec)</label>
                        <InputGroup className="h-8">
                          <InputGroupInput
                            type="number"
                            min={0}
                            value={cmdForm.cooldown}
                            onChange={e => setCmdForm(f => ({ ...f, cooldown: parseInt(e.target.value) || 0 }))}
                            className="text-sm"
                          />
                        </InputGroup>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Description *</label>
                      <InputGroup className="h-8">
                        <InputGroupInput
                          placeholder="Affiche la liste des commandes"
                          maxLength={200}
                          value={cmdForm.description}
                          onChange={e => setCmdForm(f => ({ ...f, description: e.target.value }))}
                          className="text-sm"
                        />
                      </InputGroup>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Usage</label>
                      <InputGroup className="h-8">
                        <InputGroupInput
                          placeholder={`${bot.prefix}help [commande]`}
                          maxLength={200}
                          value={cmdForm.usage}
                          onChange={e => setCmdForm(f => ({ ...f, usage: e.target.value }))}
                          className="text-sm"
                        />
                      </InputGroup>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleAddCommand}
                      disabled={cmdSaving || !cmdForm.name || !cmdForm.description}
                    >
                      {cmdSaving && <Spinner className="size-3.5" />}
                      Ajouter la commande
                    </Button>
                  </div>
                )}

                {commands.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <TerminalIcon size={22} className="mb-2 text-muted-foreground/30" />
                    <p className="text-[13px] text-muted-foreground">Aucune commande définie</p>
                    <p className="text-[11px] text-muted-foreground/60">Cliquez sur Ajouter pour créer votre première commande</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border/40">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b border-border/40 bg-background/50">
                          <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Nom</th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Description</th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Cooldown</th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Actif</th>
                          <th className="w-10 px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {commands.map((cmd, i) => (
                          <tr
                            key={cmd.id}
                            className={cn('border-b border-border/30 last:border-0', i % 2 === 0 ? 'bg-background/20' : '')}
                          >
                            <td className="px-3 py-2.5">
                              <span className="font-mono font-semibold text-accent">{bot.prefix}{cmd.name}</span>
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">{cmd.description}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{cmd.cooldown}s</td>
                            <td className="px-3 py-2.5">
                              <Switch
                                checked={cmd.isEnabled}
                                onCheckedChange={v => handleToggleCommand(cmd.id, v)}
                                className="scale-75"
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteCommand(cmd.id)}
                              >
                                <Trash2Icon size={12} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </TabsContent>

            {/* ═══════════════ CERTIFICATION ═══════════════ */}
            <TabsContent value="certification" className="space-y-4">
              <MotionStagger className="space-y-4">

                {/* Statut actuel */}
                <MotionStaggerItem>
                  <SectionCard className={cn(certif.border, certif.bg)}>
                    <div className="flex items-start gap-3">
                      <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl border', certif.border, 'bg-background/60')}>
                        {certif.icon ? (
                          <certif.icon size={16} className={certif.color} />
                        ) : (
                          <ShieldCheckIcon size={16} className="text-muted-foreground/40" />
                        )}
                      </div>
                      <div>
                        <p className={cn('text-[13px] font-semibold', certif.color || 'text-foreground')}>
                          {certif.label}
                        </p>
                        {bot.certificationNote && (
                          <p className="mt-1 text-[12px] text-muted-foreground italic">{bot.certificationNote}</p>
                        )}
                      </div>
                    </div>
                  </SectionCard>
                </MotionStaggerItem>

                {/* Formulaire de demande */}
                {(bot.certificationStatus === 'none' || bot.certificationStatus === 'rejected') && (
                  <MotionStaggerItem>
                    <SectionCard>
                      <SectionLabel>Demander la certification</SectionLabel>
                      <div className="space-y-4">
                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 space-y-1">
                          <p className="text-[11px] font-semibold text-blue-400">Avantages de la certification</p>
                          <ul className="space-y-0.5 text-[11px] text-blue-400/70">
                            <li>· Badge de vérification officiel sur votre bot</li>
                            <li>· Meilleure visibilité dans la liste publique</li>
                            <li>· Confiance accrue des administrateurs de serveurs</li>
                          </ul>
                        </div>
                        {certifError && (
                          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive">
                            {certifError}
                          </div>
                        )}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                            Justification <span className="text-muted-foreground/40">(10-1000 caractères)</span>
                          </label>
                          <textarea
                            value={certifReason}
                            onChange={e => setCertifReason(e.target.value)}
                            placeholder="Expliquez le but de votre bot, son nombre d'utilisateurs, ses fonctionnalités uniques..."
                            rows={5}
                            maxLength={1000}
                            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-ring focus:outline-none"
                          />
                          <p className="text-right text-[10px] text-muted-foreground/50">{certifReason.length}/1000</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleRequestCertification}
                          disabled={certifSaving || certifReason.length < 10}
                        >
                          {certifSaving && <Spinner className="size-3.5" />}
                          <ShieldCheckIcon size={13} />
                          Envoyer la demande
                        </Button>
                      </div>
                    </SectionCard>
                  </MotionStaggerItem>
                )}

                {bot.certificationStatus === 'pending' && (
                  <MotionStaggerItem>
                    <SectionCard className="border-yellow-500/20">
                      <p className="text-[13px] text-muted-foreground">
                        Votre demande est en cours d&apos;examen par notre équipe. Ce processus peut prendre plusieurs jours.
                      </p>
                    </SectionCard>
                  </MotionStaggerItem>
                )}

                {bot.certificationStatus === 'approved' && (
                  <MotionStaggerItem>
                    <SectionCard className="border-emerald-500/20 bg-emerald-500/3">
                      <p className="text-[13px] text-muted-foreground">
                        Félicitations ! Votre bot est certifié et affiche le badge de vérification officiel AlfyChat.
                      </p>
                    </SectionCard>
                  </MotionStaggerItem>
                )}

              </MotionStagger>
            </TabsContent>

          </Tabs>
        </MotionFade>

      </div>

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}

      {/* Regén token */}
      <Dialog open={showRegenTokenDialog} onOpenChange={setShowRegenTokenDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Régénérer le token ?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground">
            L&apos;ancien token sera immédiatement invalidé. Votre bot ne pourra plus se connecter jusqu&apos;à ce que vous mettiez à jour son token.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowRegenTokenDialog(false)}>Annuler</Button>
            <Button variant="destructive" size="sm" onClick={handleRegenToken} disabled={regenTokenLoading}>
              {regenTokenLoading && <Spinner className="size-3.5" />}
              Régénérer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regén client secret */}
      <Dialog open={showRegenSecretDialog} onOpenChange={setShowRegenSecretDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Régénérer le client secret ?</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground">
            L&apos;ancien secret sera invalidé. Tous les échanges de tokens en cours utilisant ce secret échoueront. Mettez à jour votre serveur avant de procéder.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowRegenSecretDialog(false)}>Annuler</Button>
            <Button variant="destructive" size="sm" onClick={handleRegenSecret} disabled={regenSecretLoading}>
              {regenSecretLoading && <Spinner className="size-3.5" />}
              Régénérer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
