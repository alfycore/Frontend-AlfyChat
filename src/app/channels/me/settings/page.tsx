'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeftIcon, UserIcon, PaletteIcon, BellIcon, ShieldIcon, LogOutIcon,
  CameraIcon, ImageIcon, SaveIcon, EyeIcon, EyeOffIcon,
  MicIcon, Volume2Icon, GlobeIcon, LockIcon, KeyRoundIcon,
  Trash2Icon, SunIcon, MoonIcon, MonitorIcon, ZapIcon, AlertTriangleIcon,
} from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { socketService } from '@/lib/socket';
import { api, resolveMediaUrl } from '@/lib/api';
import { useTheme } from 'next-themes';
import { useTranslation } from '@/components/locale-provider';
import { LanguageSwitcher } from '@/components/language-switcher';
import {
  getAudioPreferences, setAudioPreferences, type AudioPreferences,
} from '@/hooks/use-call';
import {
  AlertDialog, Avatar, Button, ButtonGroup, Card, Chip, ComboBox,
  Description, Disclosure, DisclosureGroup, Input, InputGroup, InputOTP,
  Label, ListBox, NumberField, SearchField, Select, Separator, Skeleton,
  Slider, Spinner, Surface, Switch, Tabs, TextField, toast,
} from '@heroui/react';
import { cn } from '@/lib/utils';

/* ── Constants ─────────────────────────────────────────────────────────────── */

const CARD_COLOR_PRESETS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#64748b',
];

const FONTS = [
  { id: 'geist',  label: 'Geist (défaut)' },
  { id: 'inter',  label: 'Inter'          },
  { id: 'system', label: 'Système'        },
  { id: 'mono',   label: 'Monospace'      },
];

interface SessionInfo {
  id: string; userAgent: string | null; ipAddress: string | null; createdAt: string; expiresAt: string;
}

function parseUserAgent(ua: string | null): { browser: string; os: string } {
  if (!ua) return { browser: 'Navigateur inconnu', os: 'OS inconnu' };
  let browser = 'Navigateur';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/') && !ua.includes('Chromium')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  let os = 'OS inconnu';
  if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('iPhone')) os = 'iOS';
  else if (ua.includes('iPad')) os = 'iPadOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  return { browser, os };
}

function SettingsSwitch({ label, description, isSelected, onChange }: {
  label: string; description: string; isSelected: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <Switch isSelected={isSelected} onChange={onChange}>
      <Switch.Content className="flex-1">
        <Label className="text-sm">{label}</Label>
        <Description>{description}</Description>
      </Switch.Content>
      <Switch.Control><Switch.Thumb /></Switch.Control>
    </Switch>
  );
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, updateUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef  = useRef<HTMLInputElement>(null);
  const micTestRef      = useRef<{ stream: MediaStream; analyser: AnalyserNode; ctx: AudioContext; raf: number } | null>(null);

  /* ── Profile ── */
  const [displayName,   setDisplayName]   = useState('');
  const [bio,           setBio]           = useState('');
  const [cardColor,     setCardColor]     = useState('#6366f1');
  const [showBadges,    setShowBadges]    = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null);
  const [bannerFile,    setBannerFile]    = useState<File | null>(null);
  const [isSaving,      setIsSaving]      = useState(false);
  const [saveSuccess,   setSaveSuccess]   = useState(false);
  const [saveError,     setSaveError]     = useState<string | null>(null);

  /* ── Voice ── */
  const [audioDevices,     setAudioDevices]    = useState<MediaDeviceInfo[]>([]);
  const [outputDevices,    setOutputDevices]   = useState<MediaDeviceInfo[]>([]);
  const [audioPrefs,       setAudioPrefsState] = useState<AudioPreferences>(getAudioPreferences());
  const [micTestActive,    setMicTestActive]   = useState(false);
  const [micLevel,         setMicLevel]        = useState(0);
  const [voiceTab,         setVoiceTab]        = useState<string>('mic');
  const [micMode,          setMicMode]         = useState('vad');
  const [isLoadingDevices, setIsLoadingDevices]= useState(false);

  /* ── Notifications ── */
  const [notifTypes, setNotifTypes] = useState<string[]>(['sound', 'desktop', 'dm', 'mentions']);
  const [dndEnabled, setDndEnabled] = useState(false);

  /* ── Privacy ── */
  const [showOnlineStatus,  setShowOnlineStatus]  = useState(true);
  const [dmMode,            setDmMode]            = useState<'everyone' | 'friends' | 'none'>('everyone');
  const [sessions,          setSessions]          = useState<SessionInfo[]>([]);
  const [sessionsLoading,   setSessionsLoading]   = useState(false);
  const [deletePassword,    setDeletePassword]    = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isRevokingAll,     setIsRevokingAll]     = useState(false);
  /* 2FA */
  const [twoFAEnabled,     setTwoFAEnabled]     = useState(false);
  const [twoFALoading,     setTwoFALoading]     = useState(false);
  const [twoFAStep,        setTwoFAStep]        = useState<'idle' | 'setup' | 'backup'>('idle');
  const [twoFAQR,          setTwoFAQR]          = useState('');
  const [twoFASecret,      setTwoFASecret]      = useState('');
  const [twoFACode,        setTwoFACode]        = useState('');
  const [twoFABackupCodes, setTwoFABackupCodes] = useState<string[]>([]);
  const [twoFADisableCode, setTwoFADisableCode] = useState('');
  const [twoFADisabling,   setTwoFADisabling]   = useState(false);

  /* ── Appearance ── */
  const [fontFamily, setFontFamily] = useState('geist');

  /* ── Language ── */
  const [langSearch, setLangSearch] = useState('');

  /* ── Active tab ── */
  const [activeTab, setActiveTab] = useState<string | number>('profile');

  /* ── Guards ── */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  /* ── Init user data ── */
  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || user.username || '');
    setBio((user as any).bio || '');
    setCardColor((user as any).cardColor || '#6366f1');
    setShowBadges((user as any).showBadges !== false);
    setAvatarPreview(resolveMediaUrl(user.avatarUrl) || null);
    setBannerPreview(resolveMediaUrl((user as any).bannerUrl) || null);
  }, [user]);

  /* ── Load preferences ── */
  useEffect(() => {
    if (!user) return;
    api.getPreferences(user.id).then((result) => {
      if (!result.success || !result.data) return;
      const p = result.data as any;
      const types: string[] = [];
      if (p.notificationsSound)    types.push('sound');
      if (p.notificationsDesktop)  types.push('desktop');
      if (p.notificationsDm)       types.push('dm');
      if (p.notificationsMentions) types.push('mentions');
      if (types.length) setNotifTypes(types);
      if (p.privacyShowOnline !== undefined) setShowOnlineStatus(p.privacyShowOnline);
      if (p.privacyAllowDm  !== undefined)  setDmMode(p.privacyAllowDm ? 'everyone' : 'friends');
      if (p.micMode)     setMicMode(p.micMode);
      if (p.fontFamily)  {
        setFontFamily(p.fontFamily);
        const fontMap: Record<string, string> = {
          inter: 'Inter, sans-serif', system: 'system-ui, sans-serif', mono: 'ui-monospace, monospace',
        };
        if (p.fontFamily !== 'geist' && fontMap[p.fontFamily]) {
          document.documentElement.style.setProperty('--font-family', fontMap[p.fontFamily]);
        }
      }
      if (p.dndEnabled !== undefined) setDndEnabled(p.dndEnabled);
    }).catch(() => {});
  }, [user?.id]);

  /* ── Load voice devices on tab open ── */
  useEffect(() => {
    if (activeTab !== 'voice') return;
    setAudioPrefsState(getAudioPreferences());
    setIsLoadingDevices(true);
    const load = async () => {
      try {
        let devices = await navigator.mediaDevices.enumerateDevices();
        if (devices.some((d) => d.kind === 'audioinput' && !d.label)) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
          devices = await navigator.mediaDevices.enumerateDevices();
        }
        setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
        setOutputDevices(devices.filter((d) => d.kind === 'audiooutput'));
      } catch { /* permission denied */ }
      finally { setIsLoadingDevices(false); }
    };
    load();
    return () => stopMicTest();
  }, [activeTab]);

  /* ── Load privacy data on tab open ── */
  useEffect(() => {
    if (activeTab !== 'privacy' || !user) return;
    api.get2FAStatus().then((res) => {
      if (res.success && res.data) setTwoFAEnabled((res.data as any).enabled === true);
    });
    setSessionsLoading(true);
    api.getSessions().then((res) => {
      if (res.success && res.data) setSessions((res.data as any).sessions ?? []);
    }).finally(() => setSessionsLoading(false));
  }, [activeTab, user?.id]);

  /* ── Audio helpers ── */
  const updateAudioPref = (key: keyof AudioPreferences, value: any) => {
    const newPrefs = { ...audioPrefs, [key]: value };
    setAudioPrefsState(newPrefs);
    setAudioPreferences({ [key]: value });
  };

  const startMicTest = async () => {
    try {
      const constraints: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true };
      if (audioPrefs.inputDeviceId !== 'default') constraints.deviceId = { exact: audioPrefs.inputDeviceId };
      const stream  = await navigator.mediaDevices.getUserMedia({ audio: constraints });
      const ctx     = new AudioContext();
      const source  = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const update = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
        if (micTestRef.current) micTestRef.current.raf = requestAnimationFrame(update);
      };
      micTestRef.current = { stream, analyser, ctx, raf: requestAnimationFrame(update) };
      setMicTestActive(true);
    } catch {
      toast.danger('Impossible d\'accéder au microphone');
    }
  };

  const stopMicTest = () => {
    if (micTestRef.current) {
      cancelAnimationFrame(micTestRef.current.raf);
      micTestRef.current.stream.getTracks().forEach((t) => t.stop());
      micTestRef.current.ctx.close();
      micTestRef.current = null;
    }
    setMicTestActive(false);
    setMicLevel(0);
  };

  /* ── Profile handlers ── */
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setBannerPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) { setSaveError('Le nom d\'affichage est requis.'); return; }
    setIsSaving(true); setSaveSuccess(false); setSaveError(null);
    try {
      const data: Record<string, any> = { displayName: displayName.trim(), bio: bio.trim(), cardColor, showBadges };
      if (avatarFile) { const r = await api.uploadImage(avatarFile, 'avatar'); if (r.success && r.data) data.avatarUrl = r.data.url; }
      if (bannerFile) { const r = await api.uploadImage(bannerFile, 'banner'); if (r.success && r.data) data.bannerUrl = r.data.url; }
      socketService.updateProfile(data);
      updateUser(data);
      setAvatarFile(null); setBannerFile(null);
      setSaveSuccess(true);
      toast.success('Profil sauvegardé !');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError('Erreur lors de la sauvegarde.');
      toast.danger('Erreur lors de la sauvegarde du profil.');
    }
    setIsSaving(false);
  };

  const handleLogout = async () => { await logout(); router.push('/login'); };

  /* ── Preference savers ── */
  const saveNotificationPrefs = async (types: string[], dnd: boolean) => {
    if (!user) return;
    await api.updatePreferences(user.id, {
      notificationsSound: types.includes('sound'), notificationsDesktop: types.includes('desktop'),
      notificationsDm: types.includes('dm'), notificationsMentions: types.includes('mentions'), dndEnabled: dnd,
    }).catch(() => {});
    socketService.updatePresence(dnd ? 'dnd' : 'online');
  };

  const savePrivacyPrefs = async (showOnline: boolean, dm: string) => {
    if (!user) return;
    await api.updatePreferences(user.id, { privacyShowOnline: showOnline, privacyAllowDm: dm !== 'none' }).catch(() => {});
  };

  const applyFont = (fontId: string) => {
    setFontFamily(fontId);
    if (user) api.updatePreferences(user.id, { fontFamily: fontId }).catch(() => {});
    const fontMap: Record<string, string> = {
      inter: 'Inter, sans-serif', system: 'system-ui, sans-serif', mono: 'ui-monospace, monospace',
    };
    if (fontId === 'geist' || !fontMap[fontId]) { document.documentElement.style.removeProperty('--font-family'); }
    else { document.documentElement.style.setProperty('--font-family', fontMap[fontId]); }
  };

  const handleRevokeAllSessions = async () => {
    setIsRevokingAll(true);
    try { await api.logoutAll(); toast.success('Toutes les sessions révoquées.'); await handleLogout(); }
    catch { toast.danger('Erreur lors de la révocation.'); setIsRevokingAll(false); }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) { toast.danger('Mot de passe requis.'); return; }
    setIsDeletingAccount(true);
    const result = await api.requestAccountDeletion(deletePassword);
    if (result.success) { toast.success('Compte supprimé.'); setDeletePassword(''); await handleLogout(); }
    else { toast.danger((result as any).error ?? 'Erreur lors de la suppression.'); setIsDeletingAccount(false); }
  };

  /* ── Loading ── */
  if (isLoading || !user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[var(--background)]">
        <p className="text-sm text-[var(--muted)]">Chargement...</p>
      </div>
    );
  }

  /* ── Render ── */
  return (
    <div className="flex h-dvh flex-col bg-[var(--background)]">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--border)]/40 px-2 md:gap-3 md:px-4">
        <Button variant="ghost" size="sm" isIconOnly onPress={() => router.back()}>
          <HugeiconsIcon icon={ArrowLeftIcon} size={20} />
        </Button>
        <h1 className="text-base font-semibold text-[var(--foreground)] md:text-lg">Paramètres</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className="mx-auto max-w-2xl p-3 md:p-6">
          <Tabs selectedKey={activeTab} onSelectionChange={setActiveTab}>
            <Tabs.List className="mb-4 w-full flex-wrap md:mb-6">
              <Tabs.Tab id="profile"       className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
                <HugeiconsIcon icon={UserIcon}    size={15} /><span className="hidden sm:inline">Profil</span>
              </Tabs.Tab>
              <Tabs.Tab id="voice"         className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
                <HugeiconsIcon icon={MicIcon}     size={15} /><span className="hidden sm:inline">Voix</span>
              </Tabs.Tab>
              <Tabs.Tab id="notifications" className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
                <HugeiconsIcon icon={BellIcon}    size={15} /><span className="hidden sm:inline">Notifications</span>
              </Tabs.Tab>
              <Tabs.Tab id="privacy"       className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
                <HugeiconsIcon icon={ShieldIcon}  size={15} /><span className="hidden sm:inline">Confidentialité</span>
              </Tabs.Tab>
              <Tabs.Tab id="appearance"    className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
                <HugeiconsIcon icon={PaletteIcon} size={15} /><span className="hidden sm:inline">Apparence</span>
              </Tabs.Tab>
              <Tabs.Tab id="language"      className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
                <HugeiconsIcon icon={GlobeIcon}   size={15} /><span className="hidden sm:inline">Langue</span>
              </Tabs.Tab>
            </Tabs.List>

            {/* ══════════ PROFILE ══════════ */}
            <Tabs.Panel id="profile" className="space-y-6">
              {/* Bannière */}
              <div className="overflow-hidden rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)]/30">
                <div className="border-b border-[var(--border)]/60 px-5 py-4">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Bannière</h3>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">Image affichée en haut de votre profil</p>
                </div>
                <div className="p-5">
                  <div
                    className="relative h-32 cursor-pointer overflow-hidden rounded-lg border border-[var(--border)]/40 bg-[var(--surface)]/60"
                    onClick={() => bannerInputRef.current?.click()}
                  >
                    {bannerPreview
                      ? <img src={bannerPreview} alt="Bannière" className="size-full object-cover" />
                      : <div className="flex size-full items-center justify-center text-[var(--muted)]">
                          <HugeiconsIcon icon={ImageIcon} size={20} className="mr-2" />
                          Cliquez pour ajouter une bannière
                        </div>}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                      <HugeiconsIcon icon={CameraIcon} size={32} className="text-white" />
                    </div>
                  </div>
                  <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
                </div>
              </div>

              {/* Informations */}
              <div className="overflow-hidden rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)]/30">
                <div className="border-b border-[var(--border)]/60 px-5 py-4">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Informations du profil</h3>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">Personnalisez votre apparence sur AlfyChat</p>
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex items-center gap-4">
                    <div className="relative cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                      <Avatar className="size-16">
                        {avatarPreview && <Avatar.Image src={avatarPreview} alt="Avatar" />}
                        <Avatar.Fallback>{displayName?.[0]?.toUpperCase() || '?'}</Avatar.Fallback>
                      </Avatar>
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                        <HugeiconsIcon icon={CameraIcon} size={20} className="text-white" />
                      </div>
                    </div>
                    <p className="flex-1 text-sm text-[var(--muted)]">Cliquez sur l&apos;avatar pour le modifier</p>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </div>

                  <Separator className="border-[var(--border)]/40" />

                  <TextField fullWidth value={displayName} onChange={setDisplayName} maxLength={32}>
                    <Label>Nom d&apos;affichage</Label>
                    <InputGroup fullWidth className="bg-[var(--surface-secondary)] border-[var(--border)]">
                      <InputGroup.Input placeholder="Votre nom d'affichage" />
                    </InputGroup>
                    <Description>C&apos;est le nom que les autres utilisateurs voient.</Description>
                  </TextField>

                  <TextField fullWidth value={user.username} isDisabled>
                    <Label>Nom d&apos;utilisateur</Label>
                    <InputGroup fullWidth className="bg-[var(--surface-secondary)] border-[var(--border)] opacity-50">
                      <InputGroup.Input />
                    </InputGroup>
                    <Description>Le nom d&apos;utilisateur ne peut pas être modifié.</Description>
                  </TextField>

                  <div>
                    <label className="text-sm font-medium text-[var(--foreground)]">Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Parlez de vous..."
                      className="mt-1 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      rows={3}
                      maxLength={200}
                    />
                    <p className="mt-1 text-right text-xs text-[var(--muted)]">{bio.length}/200</p>
                  </div>
                </div>
              </div>

              {/* Couleur profil */}
              <div className="overflow-hidden rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)]/30">
                <div className="border-b border-[var(--border)]/60 px-5 py-4">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Couleur du profil</h3>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">Couleur de votre carte de profil</p>
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap gap-2">
                    {CARD_COLOR_PRESETS.map((color) => (
                      <button
                        key={color} type="button"
                        className={`size-8 rounded-full border-2 transition-transform hover:scale-110 ${cardColor === color ? 'border-[var(--foreground)] scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setCardColor(color)}
                      />
                    ))}
                    <input type="color" value={cardColor} onChange={(e) => setCardColor(e.target.value)} className="size-8 cursor-pointer rounded-full border-0 p-0" />
                  </div>
                  {/* Preview */}
                  <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border)]/40">
                    <div className="h-16" style={{ backgroundColor: cardColor }} />
                    <div className="relative px-4 pb-4">
                      <Avatar className="size-16 -mt-6 border-4 border-[var(--surface)]">
                        {avatarPreview && <Avatar.Image src={avatarPreview} alt="Avatar" />}
                        <Avatar.Fallback>{displayName?.[0]?.toUpperCase() || '?'}</Avatar.Fallback>
                      </Avatar>
                      <p className="mt-2 font-semibold text-[var(--foreground)]">{displayName || 'Nom'}</p>
                      {bio && <p className="mt-1 text-sm text-[var(--muted)]">{bio}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div className="overflow-hidden rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)]/30">
                <div className="border-b border-[var(--border)]/60 px-5 py-4">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Badges</h3>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon icon={showBadges ? EyeIcon : EyeOffIcon} size={16} className="text-[var(--muted)]" />
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">Afficher les badges</p>
                        <p className="text-xs text-[var(--muted)]">Les badges sont visibles sur votre profil</p>
                      </div>
                    </div>
                    <Switch isSelected={showBadges} onChange={() => setShowBadges(!showBadges)}>
                      <Switch.Control><Switch.Thumb /></Switch.Control>
                    </Switch>
                  </div>
                </div>
              </div>

              {/* Save */}
              <div className="flex items-center gap-3">
                <Button onPress={handleSaveProfile} isDisabled={isSaving} className="gap-2">
                  <HugeiconsIcon icon={SaveIcon} size={16} />
                  {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
                {saveSuccess && <p className="text-sm text-green-500">Profil sauvegardé !</p>}
                {saveError   && <p className="text-sm text-red-500">{saveError}</p>}
              </div>
            </Tabs.Panel>

            {/* ══════════ VOICE ══════════ */}
            <Tabs.Panel id="voice" className="space-y-5">
              <Tabs variant="secondary" selectedKey={voiceTab} onSelectionChange={(k) => setVoiceTab(k as string)}>
                <Tabs.List aria-label="Voix">
                  <Tabs.Tab id="mic">
                    <HugeiconsIcon icon={MicIcon} size={14} className="mr-1.5" />Microphone
                  </Tabs.Tab>
                  <Tabs.Tab id="speaker">
                    <HugeiconsIcon icon={Volume2Icon} size={14} className="mr-1.5" />Haut-parleur
                  </Tabs.Tab>
                </Tabs.List>

                {/* Mic */}
                <Tabs.Panel id="mic" className="mt-4 space-y-5">
                  <Surface variant="secondary" className="rounded-2xl space-y-5 p-4">
                    {isLoadingDevices
                      ? <div className="space-y-2"><Skeleton className="h-10 rounded-xl" /><Skeleton className="h-10 rounded-xl" /></div>
                      : <>
                          <Select aria-label="Périphérique d'entrée" className="w-full" placeholder="Système par défaut"
                            value={audioPrefs.inputDeviceId} onChange={(k) => { if (k) updateAudioPref('inputDeviceId', k as string); }} variant="secondary">
                            <Label>Périphérique d&apos;entrée</Label>
                            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                <ListBox.Item id="default" textValue="Système par défaut">Système par défaut<ListBox.ItemIndicator /></ListBox.Item>
                                {audioDevices.map((d) => (
                                  <ListBox.Item key={d.deviceId} id={d.deviceId} textValue={d.label || `Micro ${d.deviceId.slice(0, 8)}`}>
                                    {d.label || `Micro ${d.deviceId.slice(0, 8)}`}<ListBox.ItemIndicator />
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select>
                          <Slider aria-label="Volume d'entrée" minValue={0} maxValue={200} value={audioPrefs.inputVolume} onChange={(v) => updateAudioPref('inputVolume', v)} className="w-full">
                            <div className="flex items-center justify-between">
                              <Label>Volume d&apos;entrée</Label><Slider.Output />
                            </div>
                            <Slider.Track><Slider.Fill /><Slider.Thumb /></Slider.Track>
                          </Slider>
                        </>}
                    {/* Test */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Test microphone</span>
                        <Button variant={micTestActive ? 'danger' : 'secondary'} size="sm" onPress={micTestActive ? stopMicTest : startMicTest}>
                          {micTestActive ? 'Arrêter' : 'Tester'}
                        </Button>
                      </div>
                      {micTestActive && (
                        <div className="h-2.5 overflow-hidden rounded-full bg-surface-tertiary">
                          <div className="h-full rounded-full bg-green-500 transition-all duration-75" style={{ width: `${micLevel}%` }} />
                        </div>
                      )}
                    </div>
                  </Surface>

                  {/* Mode */}
                  <Card variant="secondary">
                    <Card.Header>
                      <Card.Title>Mode de détection</Card.Title>
                      <Card.Description>Comment votre micro est activé lors d&apos;un appel</Card.Description>
                    </Card.Header>
                    <Card.Content>
                      <div className="space-y-2" role="radiogroup">
                        {([
                          { value: 'vad',    label: 'Détection automatique', desc: 'Le micro s\'active quand vous parlez' },
                          { value: 'ptt',    label: 'Push to talk',           desc: 'Maintenez une touche pour parler' },
                          { value: 'always', label: 'Toujours actif',         desc: 'Le micro est toujours allumé' },
                        ] as const).map(({ value, label, desc }) => (
                          <button key={value} type="button" role="radio" aria-checked={micMode === value}
                            onClick={() => { setMicMode(value); if (user) api.updatePreferences(user.id, { micMode: value }).catch(() => {}); }}
                            className={cn('flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                              micMode === value ? 'border-[var(--accent)]/50 bg-[var(--accent)]/8' : 'border-[var(--border)]/40 bg-[var(--surface-secondary)]/30 hover:border-[var(--border)]'
                            )}>
                            <span className={cn('mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                              micMode === value ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border)]')}>
                              {micMode === value && <span className="size-1.5 rounded-full bg-white" />}
                            </span>
                            <div>
                              <p className="text-[13px] font-medium text-[var(--foreground)]">{label}</p>
                              <p className="text-[11px] text-[var(--muted)]/70">{desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </Card.Content>
                  </Card>

                  {/* Avancé */}
                  <DisclosureGroup>
                    <Disclosure id="advanced-audio">
                      <Disclosure.Heading>
                        <Button slot="trigger" variant="ghost" className="w-full justify-between rounded-xl border border-[var(--border)]/40 px-4 py-3">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            <HugeiconsIcon icon={ZapIcon} size={14} />Traitement audio avancé
                          </span>
                          <Disclosure.Indicator />
                        </Button>
                      </Disclosure.Heading>
                      <Disclosure.Content>
                        <Disclosure.Body>
                          <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)]/40 border-t-0 p-4">
                            {([
                              { key: 'noiseSuppression' as const, label: 'Suppression du bruit', desc: 'Réduit les bruits de fond' },
                              { key: 'echoCancellation' as const, label: 'Annulation d\'écho', desc: 'Supprime l\'écho' },
                              { key: 'autoGainControl'  as const, label: 'Contrôle automatique du gain', desc: 'Ajuste le volume automatiquement' },
                            ]).map((item) => (
                              <SettingsSwitch key={item.key} label={item.label} description={item.desc}
                                isSelected={audioPrefs[item.key]} onChange={(v) => updateAudioPref(item.key, v)} />
                            ))}
                          </div>
                        </Disclosure.Body>
                      </Disclosure.Content>
                    </Disclosure>
                  </DisclosureGroup>
                </Tabs.Panel>

                {/* Speaker */}
                <Tabs.Panel id="speaker" className="mt-4 space-y-5">
                  <Surface variant="secondary" className="rounded-2xl space-y-5 p-4">
                    {isLoadingDevices
                      ? <div className="space-y-2"><Skeleton className="h-10 rounded-xl" /><Skeleton className="h-10 rounded-xl" /></div>
                      : <>
                          <Select aria-label="Périphérique de sortie" className="w-full" placeholder="Système par défaut"
                            value={audioPrefs.outputDeviceId} onChange={(k) => { if (k) updateAudioPref('outputDeviceId', k as string); }} variant="secondary">
                            <Label>Périphérique de sortie</Label>
                            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                <ListBox.Item id="default" textValue="Système par défaut">Système par défaut<ListBox.ItemIndicator /></ListBox.Item>
                                {outputDevices.map((d) => (
                                  <ListBox.Item key={d.deviceId} id={d.deviceId} textValue={d.label || `Sortie ${d.deviceId.slice(0, 8)}`}>
                                    {d.label || `Sortie ${d.deviceId.slice(0, 8)}`}<ListBox.ItemIndicator />
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select>
                          <Slider aria-label="Volume de sortie" minValue={0} maxValue={200} value={audioPrefs.outputVolume} onChange={(v) => updateAudioPref('outputVolume', v)} className="w-full">
                            <div className="flex items-center justify-between">
                              <Label>Volume de sortie</Label><Slider.Output />
                            </div>
                            <Slider.Track><Slider.Fill /><Slider.Thumb /></Slider.Track>
                          </Slider>
                        </>}
                  </Surface>
                </Tabs.Panel>
              </Tabs>
            </Tabs.Panel>

            {/* ══════════ NOTIFICATIONS ══════════ */}
            <Tabs.Panel id="notifications" className="space-y-5">
              <Card variant="secondary">
                <Card.Content className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">Mode Ne pas déranger</p>
                      <p className="text-xs text-[var(--muted)]">Silence toutes les notifications</p>
                    </div>
                    <Switch isSelected={dndEnabled} onChange={(v) => { setDndEnabled(v); saveNotificationPrefs(notifTypes, v); }}>
                      <Switch.Control><Switch.Thumb /></Switch.Control>
                    </Switch>
                  </div>
                </Card.Content>
              </Card>

              <div className="overflow-hidden rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)]/30">
                <div className="border-b border-[var(--border)]/60 px-5 py-4">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Catégories de notifications</h3>
                </div>
                <div className="divide-y divide-[var(--border)]/40">
                  {([
                    { key: 'sound',    label: 'Son',               desc: 'Jouer un son à chaque message'           },
                    { key: 'desktop',  label: 'Bureau',            desc: 'Afficher les notifications sur le bureau' },
                    { key: 'dm',       label: 'Messages privés',   desc: 'Notifications pour les DMs'               },
                    { key: 'mentions', label: 'Mentions',          desc: 'Quand quelqu\'un vous mentionne'          },
                  ] as const).map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{label}</p>
                        <p className="text-xs text-[var(--muted)]">{desc}</p>
                      </div>
                      <Switch
                        isSelected={notifTypes.includes(key)}
                        onChange={(v) => {
                          const updated = v ? [...notifTypes, key] : notifTypes.filter((k) => k !== key);
                          setNotifTypes(updated);
                          saveNotificationPrefs(updated, dndEnabled);
                        }}>
                        <Switch.Control><Switch.Thumb /></Switch.Control>
                      </Switch>
                    </div>
                  ))}
                </div>
              </div>
            </Tabs.Panel>

            {/* ══════════ PRIVACY ══════════ */}
            <Tabs.Panel id="privacy" className="space-y-5">
              {/* Visibilité & DMs */}
              <Card variant="secondary">
                <Card.Header>
                  <Card.Title className="flex items-center gap-2">
                    <HugeiconsIcon icon={ShieldIcon} size={16} />Confidentialité
                  </Card.Title>
                  <Card.Description>Contrôlez qui peut interagir avec vous</Card.Description>
                </Card.Header>
                <Card.Content className="space-y-4">
                  <SettingsSwitch
                    label="Afficher le statut en ligne"
                    description="Les autres peuvent voir quand vous êtes en ligne"
                    isSelected={showOnlineStatus}
                    onChange={(v) => { setShowOnlineStatus(v); savePrivacyPrefs(v, dmMode); }}
                  />
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">Qui peut m&apos;envoyer des DMs</p>
                    <p className="mt-0.5 mb-3 text-xs text-[var(--muted)]">Choisissez qui peut vous contacter</p>
                    <div className="flex gap-2">
                      {([
                        { value: 'everyone', label: 'Tout le monde' },
                        { value: 'friends',  label: 'Amis'          },
                        { value: 'none',     label: 'Personne'       },
                      ] as const).map(({ value, label }) => (
                        <button key={value} type="button"
                          onClick={() => { setDmMode(value); savePrivacyPrefs(showOnlineStatus, value); }}
                          className={cn('flex-1 rounded-xl border px-3 py-2.5 text-[13px] transition-all',
                            dmMode === value
                              ? 'border-[var(--accent)]/50 bg-[var(--accent)]/10 font-semibold text-[var(--foreground)]'
                              : 'border-[var(--border)]/40 bg-[var(--surface-secondary)]/30 text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]'
                          )}>{label}</button>
                      ))}
                    </div>
                  </div>
                </Card.Content>
              </Card>

              {/* 2FA */}
              <Card variant="secondary">
                <Card.Header>
                  <Card.Title className="flex items-center gap-2">
                    <HugeiconsIcon icon={LockIcon} size={16} />Authentification 2 facteurs
                  </Card.Title>
                  <Card.Description>
                    {twoFAEnabled ? 'Le 2FA est activé sur votre compte.' : 'Sécurisez votre compte avec une application d\'authentification.'}
                  </Card.Description>
                </Card.Header>
                <Card.Content className="space-y-4">
                  {twoFAStep === 'idle' && (
                    twoFAEnabled ? (
                      <div className="space-y-3">
                        <p className="text-sm text-[var(--muted)]">Saisissez votre code 2FA pour désactiver la protection.</p>
                        <InputOTP maxLength={6} value={twoFADisableCode} onChange={setTwoFADisableCode}>
                          <InputOTP.Group><InputOTP.Slot index={0} /><InputOTP.Slot index={1} /><InputOTP.Slot index={2} /></InputOTP.Group>
                          <InputOTP.Separator />
                          <InputOTP.Group><InputOTP.Slot index={3} /><InputOTP.Slot index={4} /><InputOTP.Slot index={5} /></InputOTP.Group>
                        </InputOTP>
                        <Button variant="secondary" size="sm" isDisabled={twoFADisableCode.length < 6} isPending={twoFADisabling}
                          onPress={async () => {
                            setTwoFADisabling(true);
                            const res = await api.disable2FA(twoFADisableCode);
                            setTwoFADisabling(false);
                            if (res.success) { setTwoFAEnabled(false); setTwoFADisableCode(''); }
                            else { setTwoFADisableCode(''); toast.danger('Code incorrect.'); }
                          }}>
                          {({ isPending }) => <>{isPending && <Spinner size="sm" color="current" />}Désactiver le 2FA</>}
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" isPending={twoFALoading}
                        onPress={async () => {
                          setTwoFALoading(true);
                          const res = await api.setup2FA();
                          setTwoFALoading(false);
                          if (res.success && res.data) { setTwoFAQR((res.data as any).qrCodeDataUrl); setTwoFASecret((res.data as any).secret); setTwoFAStep('setup'); }
                        }}>
                        {({ isPending }) => <>{isPending && <Spinner size="sm" color="current" />}Configurer le 2FA</>}
                      </Button>
                    )
                  )}
                  {twoFAStep === 'setup' && (
                    <div className="space-y-4">
                      <p className="text-sm text-[var(--muted)]">Scannez ce QR code avec votre application d&apos;authentification.</p>
                      {twoFAQR && <div className="flex justify-center"><img src={twoFAQR} alt="QR 2FA" className="size-44 rounded-lg" /></div>}
                      <div className="rounded-lg bg-[var(--surface-tertiary)] p-3 font-mono text-xs break-all text-center text-[var(--muted)]">{twoFASecret}</div>
                      <InputOTP maxLength={6} value={twoFACode} onChange={setTwoFACode}>
                        <InputOTP.Group><InputOTP.Slot index={0} /><InputOTP.Slot index={1} /><InputOTP.Slot index={2} /></InputOTP.Group>
                        <InputOTP.Separator />
                        <InputOTP.Group><InputOTP.Slot index={3} /><InputOTP.Slot index={4} /><InputOTP.Slot index={5} /></InputOTP.Group>
                      </InputOTP>
                      <div className="flex gap-2">
                        <Button size="sm" isDisabled={twoFACode.length < 6} isPending={twoFALoading}
                          onPress={async () => {
                            setTwoFALoading(true);
                            const res = await api.enable2FA(twoFACode);
                            setTwoFALoading(false);
                            if (res.success && res.data) { setTwoFABackupCodes((res.data as any).backupCodes ?? []); setTwoFAEnabled(true); setTwoFACode(''); setTwoFAStep('backup'); }
                            else { setTwoFACode(''); toast.danger('Code incorrect.'); }
                          }}>
                          {({ isPending }) => <>{isPending && <Spinner size="sm" color="current" />}Activer</>}
                        </Button>
                        <Button size="sm" variant="ghost" onPress={() => { setTwoFAStep('idle'); setTwoFACode(''); }}>Annuler</Button>
                      </div>
                    </div>
                  )}
                  {twoFAStep === 'backup' && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-green-500">2FA activé avec succès !</p>
                      <p className="text-sm text-[var(--muted)]">Sauvegardez ces codes de secours dans un endroit sûr.</p>
                      <div className="grid grid-cols-2 gap-1 rounded-lg bg-[var(--surface-tertiary)] p-3">
                        {twoFABackupCodes.map((c) => <span key={c} className="font-mono text-xs">{c}</span>)}
                      </div>
                      <Button size="sm" onPress={() => setTwoFAStep('idle')}>Fermer</Button>
                    </div>
                  )}
                </Card.Content>
              </Card>

              {/* Sessions */}
              <Card variant="secondary">
                <Card.Header>
                  <div className="flex items-center justify-between">
                    <div>
                      <Card.Title className="flex items-center gap-2">
                        <HugeiconsIcon icon={KeyRoundIcon} size={16} />Sessions actives
                      </Card.Title>
                      <Card.Description>Appareils connectés à votre compte</Card.Description>
                    </div>
                    <Button size="sm" variant="secondary" onPress={handleRevokeAllSessions} isDisabled={isRevokingAll}>
                      {isRevokingAll ? <Spinner size="sm" color="current" /> : <HugeiconsIcon icon={AlertTriangleIcon} size={14} />}
                      Tout révoquer
                    </Button>
                  </div>
                </Card.Header>
                <Card.Content className="space-y-2">
                  {sessionsLoading
                    ? <><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-12 rounded-xl mt-2" /></>
                    : sessions.length === 0
                      ? <p className="text-center text-sm text-[var(--muted)] py-4">Aucune session active.</p>
                      : sessions.map((session) => {
                          const { browser, os } = parseUserAgent(session.userAgent);
                          const currentSessionId = typeof window !== 'undefined' ? localStorage.getItem('alfychat_session_id') : null;
                          const isCurrent = session.id === currentSessionId;
                          const date = new Date(session.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
                          return (
                            <div key={session.id} className="flex items-center justify-between rounded-xl border border-[var(--border)]/40 px-4 py-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <HugeiconsIcon icon={MonitorIcon} size={14} className="text-[var(--muted)]" />
                                  <span className="text-sm font-medium">{browser} / {os}</span>
                                  {isCurrent && <Chip color="success" variant="soft" size="sm"><Chip.Label>Actuel</Chip.Label></Chip>}
                                </div>
                                <p className="mt-0.5 text-xs text-[var(--muted)]">{session.ipAddress ?? ''} · {date}</p>
                              </div>
                              {!isCurrent && (
                                <Button size="sm" variant="ghost" className="text-red-500 shrink-0"
                                  onPress={async () => {
                                    const res = await api.revokeSession(session.id);
                                    if (res.success) { setSessions((prev) => prev.filter((s) => s.id !== session.id)); toast.success('Session révoquée.'); }
                                    else toast.danger('Erreur lors de la révocation.');
                                  }}>
                                  <HugeiconsIcon icon={Trash2Icon} size={14} />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                </Card.Content>
              </Card>

              {/* Déconnexion + Danger */}
              <div className="overflow-hidden rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)]/30 p-5">
                <Button variant="secondary" className="w-full gap-2" onPress={handleLogout}>
                  <HugeiconsIcon icon={LogOutIcon} size={16} />Se déconnecter
                </Button>
              </div>

              <Card variant="secondary" className="border-red-500/30">
                <Card.Header>
                  <Card.Title className="text-red-500">Zone dangereuse</Card.Title>
                  <Card.Description>Cette action est irréversible.</Card.Description>
                </Card.Header>
                <Card.Content>
                  <AlertDialog>
                    <Button variant="danger"><HugeiconsIcon icon={Trash2Icon} size={16} />Supprimer le compte</Button>
                    <AlertDialog.Backdrop variant="blur">
                      <AlertDialog.Container size="sm">
                        <AlertDialog.Dialog>
                          <AlertDialog.CloseTrigger />
                          <AlertDialog.Header>
                            <AlertDialog.Icon status="danger" />
                            <AlertDialog.Heading>Supprimer votre compte ?</AlertDialog.Heading>
                          </AlertDialog.Header>
                          <AlertDialog.Body>
                            <p className="text-sm text-[var(--muted)]">Cette action est définitive. Toutes vos données seront supprimées.</p>
                            <TextField className="mt-4 w-full">
                              <Label>Mot de passe</Label>
                              <InputGroup fullWidth variant="secondary">
                                <InputGroup.Input type="password" placeholder="Confirmez avec votre mot de passe"
                                  value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
                              </InputGroup>
                            </TextField>
                          </AlertDialog.Body>
                          <AlertDialog.Footer>
                            <Button slot="close" variant="tertiary" onPress={() => setDeletePassword('')}>Annuler</Button>
                            <Button variant="danger" isDisabled={isDeletingAccount || !deletePassword.trim()} onPress={handleDeleteAccount}>
                              {isDeletingAccount && <Spinner size="sm" color="current" />}
                              Supprimer définitivement
                            </Button>
                          </AlertDialog.Footer>
                        </AlertDialog.Dialog>
                      </AlertDialog.Container>
                    </AlertDialog.Backdrop>
                  </AlertDialog>
                </Card.Content>
              </Card>
            </Tabs.Panel>

            {/* ══════════ APPEARANCE ══════════ */}
            <Tabs.Panel id="appearance" className="space-y-5">
              <Card variant="secondary">
                <Card.Header>
                  <Card.Title>Thème</Card.Title>
                  <Card.Description>Choisissez le thème de l&apos;application</Card.Description>
                </Card.Header>
                <Card.Content>
                  <ButtonGroup>
                    <Button variant={theme === 'dark'   ? 'primary' : 'secondary'} onPress={() => setTheme('dark')}>
                      <HugeiconsIcon icon={MoonIcon}    size={14} />Sombre
                    </Button>
                    <Button variant={theme === 'light'  ? 'primary' : 'secondary'} onPress={() => setTheme('light')}>
                      <HugeiconsIcon icon={SunIcon}     size={14} />Clair
                    </Button>
                    <Button variant={theme === 'system' ? 'primary' : 'secondary'} onPress={() => setTheme('system')}>
                      <HugeiconsIcon icon={MonitorIcon} size={14} />Système
                    </Button>
                  </ButtonGroup>
                </Card.Content>
              </Card>

              <Card variant="secondary">
                <Card.Header>
                  <Card.Title>Police d&apos;écriture</Card.Title>
                  <Card.Description>Choisissez la police utilisée dans l&apos;interface</Card.Description>
                </Card.Header>
                <Card.Content>
                  <ComboBox className="w-full max-w-xs" selectedKey={fontFamily} onSelectionChange={(k) => { if (k) applyFont(k as string); }}>
                    <Label>Police</Label>
                    <ComboBox.InputGroup>
                      <Input placeholder="Choisir une police" /><ComboBox.Trigger />
                    </ComboBox.InputGroup>
                    <ComboBox.Popover>
                      <ListBox>
                        {FONTS.map((f) => (
                          <ListBox.Item key={f.id} id={f.id} textValue={f.label}>{f.label}<ListBox.ItemIndicator /></ListBox.Item>
                        ))}
                      </ListBox>
                    </ComboBox.Popover>
                  </ComboBox>
                </Card.Content>
              </Card>
            </Tabs.Panel>

            {/* ══════════ LANGUAGE ══════════ */}
            <Tabs.Panel id="language" className="space-y-5">
              <Card variant="secondary">
                <Card.Header>
                  <Card.Title>Langue de l&apos;interface</Card.Title>
                  <Card.Description>Sélectionnez votre langue préférée</Card.Description>
                </Card.Header>
                <Card.Content className="space-y-4">
                  <SearchField value={langSearch} onChange={setLangSearch}>
                    <Label>Rechercher une langue</Label>
                    <SearchField.Group>
                      <SearchField.SearchIcon />
                      <SearchField.Input placeholder="Ex: English, Français..." />
                      <SearchField.ClearButton />
                    </SearchField.Group>
                  </SearchField>
                  <LanguageSwitcher variant="full" filter={langSearch} />
                </Card.Content>
              </Card>
            </Tabs.Panel>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
