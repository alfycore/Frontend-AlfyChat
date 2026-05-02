'use client';

import { useEffect, useRef, useState } from 'react';
import {
  UserIcon, PaletteIcon, BellIcon, ShieldIcon, LogOutIcon,
  CameraIcon, ImageIcon, SaveIcon, MicIcon, Volume2Icon,
  SunIcon, MoonIcon, MonitorIcon,
  GlobeIcon, SearchIcon, LockIcon,
  Trash2Icon, KeyRoundIcon, ZapIcon,
  AlertTriangleIcon, ChevronRightIcon, ArrowLeftIcon,
  XIcon, LayoutIcon, CheckIcon, Loader2Icon, PencilIcon, UploadIcon,
} from '@/components/icons';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTranslation } from '@/components/locale-provider';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useBackground } from '@/hooks/use-background';
import { useUIStyle } from '@/hooks/use-ui-style';
import { socketService } from '@/lib/socket';
import { api, resolveMediaUrl } from '@/lib/api';
import { deriveKey, decryptPrivateKey, encryptPrivateKey, generateSalt } from '@/lib/e2ee';
import { signalService } from '@/lib/signal-service';
import { toast } from 'sonner';
import { containsProfanity, sanitizeText } from '@/lib/moderation';
import { sanitizeSvg } from '@/lib/sanitize';
import {
  getAudioPreferences,
  setAudioPreferences,
  type AudioPreferences,
} from '@/hooks/use-call';
import { useLayoutPrefs } from '@/hooks/use-layout-prefs';
import { cn } from '@/lib/utils';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from 'radix-ui';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';

/* ─── Constants ──────────────────────────────────────────────────────────── */

const MAX_INTERESTS = 10;
const MAX_INTEREST_LENGTH = 24;
const DEFAULT_INTERESTS = ['Gaming', 'Musique', 'Tech', 'Cinéma'];

const CARD_COLOR_PRESETS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#64748b',
  '#0ea5e9', '#14b8a6', '#a855f7', '#f43f5e', '#84cc16',
];

const TIMEZONES = [
  { id: 'europe-paris',    label: 'Europe/Paris (UTC+1)' },
  { id: 'europe-london',   label: 'Europe/London (UTC+0)' },
  { id: 'europe-berlin',   label: 'Europe/Berlin (UTC+1)' },
  { id: 'america-new-york',label: 'America/New_York (UTC-5)' },
  { id: 'america-la',      label: 'America/Los_Angeles (UTC-8)' },
  { id: 'america-chicago', label: 'America/Chicago (UTC-6)' },
  { id: 'asia-tokyo',      label: 'Asia/Tokyo (UTC+9)' },
  { id: 'asia-shanghai',   label: 'Asia/Shanghai (UTC+8)' },
  { id: 'australia-sydney',label: 'Australia/Sydney (UTC+11)' },
  { id: 'pacific-auckland',label: 'Pacific/Auckland (UTC+13)' },
];

const FONTS = [
  { id: 'geist',  label: 'Geist (défaut)' },
  { id: 'inter',  label: 'Inter' },
  { id: 'system', label: 'Système' },
  { id: 'mono',   label: 'Monospace' },
];

const WALLPAPER_PRESETS = [
  { label: 'Aurore',   value: 'linear-gradient(135deg, #667eea 0%, #764ba2 40%, #f093fb 100%)' },
  { label: 'Océan',    value: 'linear-gradient(135deg, #0f2027 0%, #203a43 40%, #2c5364 100%)' },
  { label: 'Coucher',  value: 'linear-gradient(135deg, #f7971e 0%, #ffd200 50%, #f7971e 100%)' },
  { label: 'Rose',     value: 'linear-gradient(135deg, #fc5c7d 0%, #6a3093 100%)' },
  { label: 'Forêt',    value: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)' },
  { label: 'Nuit',     value: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 40%, #16213e 100%)' },
  { label: 'Pêche',    value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  { label: 'Minuit',   value: 'linear-gradient(135deg, #2d3561 0%, #c05c7e 50%, #f3826f 100%)' },
  { label: 'Jade',     value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { label: 'Braise',   value: 'linear-gradient(135deg, #c31432 0%, #240b36 100%)' },
  { label: 'Azur',     value: 'linear-gradient(135deg, #1a6dff 0%, #c822ff 100%)' },
  { label: 'Nacre',    value: 'linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 40%, #e8e8e8 100%)' },
] as const;

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function addInterestSafely(current: string[], raw: string): { next: string[]; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { next: current, error: 'empty' };
  if (current.length >= MAX_INTERESTS) return { next: current, error: `Maximum ${MAX_INTERESTS} centres d'intérêt` };
  if (trimmed.length > MAX_INTEREST_LENGTH) return { next: current, error: `Trop long (max ${MAX_INTEREST_LENGTH} caractères)` };
  if (containsProfanity(trimmed)) return { next: current, error: 'Contenu inapproprié détecté' };
  const clean = sanitizeText(trimmed);
  if (current.some((i) => i.toLowerCase() === clean.toLowerCase())) return { next: current, error: 'Déjà ajouté' };
  return { next: [...current, clean] };
}

interface SessionInfo {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
}

function parseUserAgent(ua: string | null): { browser: string; os: string; icon: string } {
  if (!ua) return { browser: 'Navigateur inconnu', os: 'OS inconnu', icon: '🖥️' };
  let browser = 'Navigateur';
  if      (ua.includes('Edg/') || ua.includes('EdgA/'))         browser = 'Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera'))         browser = 'Opera';
  else if (ua.includes('Brave/'))                                browser = 'Brave';
  else if (ua.includes('Chrome/') && !ua.includes('Chromium'))  browser = 'Chrome';
  else if (ua.includes('Chromium/'))                             browser = 'Chromium';
  else if (ua.includes('Firefox/') || ua.includes('FxiOS/'))    browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome'))    browser = 'Safari';
  let os = 'OS inconnu', icon = '🖥️';
  if (ua.includes('iPhone')) { os = 'iOS'; icon = '📱'; }
  else if (ua.includes('iPad')) { os = 'iPadOS'; icon = '📱'; }
  else if (ua.includes('Android')) { const m = ua.match(/Android (\d+(?:\.\d+)?)/); os = m ? `Android ${m[1]}` : 'Android'; icon = '📱'; }
  else if (ua.includes('Windows')) { os = 'Windows'; icon = '🖥️'; }
  else if (ua.includes('Mac OS X')) { os = 'macOS'; icon = '🍎'; }
  else if (ua.includes('Linux')) { os = 'Linux'; icon = '🐧'; }
  return { browser, os, icon };
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">{children}</p>;
}

function SettingsCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('overflow-hidden rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm', className)}>{children}</div>;
}

function SettingsRow({ label, description, children, border = true }: { label: string; description?: string; children?: React.ReactNode; border?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 px-5 py-4', border && 'border-b border-border/30 last:border-0')}>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        {description && <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      {description && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>}
    </div>
  );
}

/* ─── Types ──────────────────────────────────────────────────────────────── */

type SettingsTab = 'profile' | 'voice' | 'notifications' | 'privacy' | 'appearance' | 'language' | 'layout';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const router = useRouter();
  const { user, updateUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const ui = useUIStyle();

  const NAV_TABS: { id: SettingsTab; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'profile',       label: t.settings.profile,       icon: UserIcon,     color: 'text-blue-400' },
    { id: 'voice',         label: t.settings.voice,         icon: MicIcon,      color: 'text-green-400' },
    { id: 'notifications', label: t.settings.notifications, icon: BellIcon,     color: 'text-amber-400' },
    { id: 'privacy',       label: t.settings.privacy,       icon: ShieldIcon,   color: 'text-rose-400' },
    { id: 'appearance',    label: t.settings.appearance,    icon: PaletteIcon,  color: 'text-purple-400' },
    { id: 'language',      label: t.settings.language,      icon: GlobeIcon,    color: 'text-cyan-400' },
    { id: 'layout',        label: 'Mise en page',           icon: LayoutIcon,   color: 'text-indigo-400' },
  ];

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  /* Profile */
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [cardColor, setCardColor] = useState('#6366f1');
  const [showBadges, setShowBadges] = useState(true);
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [hiddenBadgeIds, setHiddenBadgeIds] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [deleteAvatarFlag, setDeleteAvatarFlag] = useState(false);
  const [deleteBannerFlag, setDeleteBannerFlag] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [interests, setInterests] = useState<string[]>(DEFAULT_INTERESTS);
  const [newInterest, setNewInterest] = useState('');
  const [timezone, setTimezone] = useState('europe-paris');
  const [birthday, setBirthday] = useState('');

  /* Username change */
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernamePassword, setUsernamePassword] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameChanging, setUsernameChanging] = useState(false);
  const usernameCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Voice */
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioPrefs, setAudioPrefsState] = useState<AudioPreferences>(getAudioPreferences());
  const [micTestActive, setMicTestActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [voiceTab, setVoiceTab] = useState<'mic' | 'speaker'>('mic');
  const [micMode, setMicMode] = useState('vad');
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const micTestRef = useRef<{ stream: MediaStream; analyser: AnalyserNode; ctx: AudioContext; raf: number } | null>(null);

  /* Notifications */
  const [notifSound, setNotifSound] = useState(true);
  const [notifDesktop, setNotifDesktop] = useState(true);
  const [notifDm, setNotifDm] = useState(true);
  const [notifMentions, setNotifMentions] = useState(true);
  const [dndEnabled, setDndEnabled] = useState(false);
  const [notifKeywords, setNotifKeywords] = useState<string[]>(['urgent', 'alerte']);
  const [newKeyword, setNewKeyword] = useState('');

  /* Privacy */
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [dmMode, setDmMode] = useState('everyone');
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  /* Change password */
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  /* 2FA */
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState<'idle' | 'setup' | 'backup'>('idle');
  const [twoFAQR, setTwoFAQR] = useState('');
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFABackupCodes, setTwoFABackupCodes] = useState<string[]>([]);
  const [twoFADisableCode, setTwoFADisableCode] = useState('');
  const [twoFADisabling, setTwoFADisabling] = useState(false);

  /* Appearance */
  const [fontFamily, setFontFamily] = useState('geist');
  const { prefs: layoutPrefs, updatePrefs: updateLayoutPrefs } = useLayoutPrefs();
  const { wallpaper, setWallpaper } = useBackground();
  const [langSearch, setLangSearch] = useState('');

  /* Mobile */
  const [mobileShowMenu, setMobileShowMenu] = useState(true);
  useEffect(() => { if (open) setMobileShowMenu(true); }, [open]);

  /* ─── Effects ─── */
  useEffect(() => {
    if (open && activeTab === 'privacy') {
      api.get2FAStatus().then((r) => { if (r.success && r.data) setTwoFAEnabled((r.data as any).enabled === true); });
      setSessionsLoading(true);
      api.getSessions().then((r) => { if (r.success && r.data) setSessions((r.data as any).sessions ?? []); }).finally(() => setSessionsLoading(false));
    }
  }, [open, activeTab]);

  useEffect(() => {
    if (open && activeTab === 'voice') {
      setAudioPrefsState(getAudioPreferences());
      setIsLoadingDevices(true);
      (async () => {
        try {
          let devs = await navigator.mediaDevices.enumerateDevices();
          if (devs.some((d) => d.kind === 'audioinput' && !d.label)) {
            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
            s.getTracks().forEach((t) => t.stop());
            devs = await navigator.mediaDevices.enumerateDevices();
          }
          setAudioDevices(devs.filter((d) => d.kind === 'audioinput'));
          setOutputDevices(devs.filter((d) => d.kind === 'audiooutput'));
        } catch { /* permission denied */ }
        finally { setIsLoadingDevices(false); }
      })();
    }
    return () => stopMicTest();
  }, [open, activeTab]);

  useEffect(() => {
    if (user && open) {
      setDisplayName(user.displayName || user.username || '');
      setBio((user as any).bio || '');
      setCardColor((user as any).cardColor || '#6366f1');
      setShowBadges((user as any).showBadges !== false);
      setUserBadges((user as any).badges || []);
      setHiddenBadgeIds((user as any).hiddenBadgeIds || []);
      setAvatarPreview(resolveMediaUrl(user.avatarUrl) || null);
      setBannerPreview(resolveMediaUrl((user as any).bannerUrl) || null);
    }
  }, [user, open]);

  useEffect(() => {
    if (!open || !user) return;
    api.getPreferences(user.id).then((res) => {
      if (res.success && res.data) {
        const p = res.data as any;
        if (p.notificationsSound !== undefined)  setNotifSound(p.notificationsSound);
        if (p.notificationsDesktop !== undefined) setNotifDesktop(p.notificationsDesktop);
        if (p.notificationsDm !== undefined)      setNotifDm(p.notificationsDm);
        if (p.notificationsMentions !== undefined)setNotifMentions(p.notificationsMentions);
        if (p.privacyShowOnline !== undefined)    setShowOnlineStatus(p.privacyShowOnline);
        if (p.privacyAllowDm !== undefined)       setDmMode(p.privacyAllowDm ? 'everyone' : 'friends');
        if (p.birthday)   setBirthday(p.birthday);
        if (p.timezone)   setTimezone(p.timezone);
        if (Array.isArray(p.interests)) setInterests(p.interests.slice(0, MAX_INTERESTS).map(sanitizeText));
        if (p.micMode)    setMicMode(p.micMode);
        if (p.fontFamily) {
          setFontFamily(p.fontFamily);
          const fm: Record<string, string> = { inter: 'var(--font-inter), sans-serif', system: 'system-ui, sans-serif', mono: 'var(--font-geist-mono), ui-monospace, monospace' };
          if (p.fontFamily !== 'geist' && fm[p.fontFamily]) document.documentElement.style.setProperty('--font-sans', fm[p.fontFamily]);
          else document.documentElement.style.removeProperty('--font-sans');
        }
        if (p.dndEnabled !== undefined) setDndEnabled(p.dndEnabled);
        if (Array.isArray(p.notifKeywords)) setNotifKeywords(p.notifKeywords);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  /* ─── Handlers ─── */
  const updateAudioPref = (key: keyof AudioPreferences, value: any) => {
    const np = { ...audioPrefs, [key]: value };
    setAudioPrefsState(np);
    setAudioPreferences({ [key]: value });
  };

  const startMicTest = async () => {
    try {
      const c: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true };
      if (audioPrefs.inputDeviceId !== 'default') c.deviceId = { exact: audioPrefs.inputDeviceId };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: c });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const upd = () => { analyser.getByteFrequencyData(data); setMicLevel(Math.min(100, Math.round((data.reduce((a, b) => a + b, 0) / data.length / 128) * 100))); if (micTestRef.current) micTestRef.current.raf = requestAnimationFrame(upd); };
      micTestRef.current = { stream, analyser, ctx, raf: requestAnimationFrame(upd) };
      setMicTestActive(true);
    } catch { toast.error(t.settings.micAccessError); }
  };

  const stopMicTest = () => {
    if (micTestRef.current) { cancelAnimationFrame(micTestRef.current.raf); micTestRef.current.stream.getTracks().forEach((t) => t.stop()); micTestRef.current.ctx.close(); micTestRef.current = null; }
    setMicTestActive(false); setMicLevel(0);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setAvatarFile(f); setDeleteAvatarFlag(false); const r = new FileReader(); r.onloadend = () => setAvatarPreview(r.result as string); r.readAsDataURL(f); }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setBannerFile(f); setDeleteBannerFlag(false); const r = new FileReader(); r.onloadend = () => setBannerPreview(r.result as string); r.readAsDataURL(f); }
  };

  const handleDeleteAvatar = () => { setAvatarPreview(null); setAvatarFile(null); setDeleteAvatarFlag(true); };
  const handleDeleteBanner = () => { setBannerPreview(null); setBannerFile(null); setDeleteBannerFlag(true); };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) { toast.error(t.settings.displayNameRequired); return; }
    setIsSaving(true);
    try {
      const data: Record<string, any> = { displayName: displayName.trim(), bio: bio.trim(), cardColor, showBadges, hiddenBadgeIds };
      if (deleteAvatarFlag) { if (user?.avatarUrl) await api.deleteImage(user.avatarUrl).catch(() => {}); data.avatarUrl = null; }
      else if (avatarFile) { const r = await api.uploadImage(avatarFile, 'avatar'); if (r.success && r.data) data.avatarUrl = resolveMediaUrl(r.data.url) ?? r.data.url; }
      if (deleteBannerFlag) { if ((user as any)?.bannerUrl) await api.deleteImage((user as any).bannerUrl).catch(() => {}); data.bannerUrl = null; }
      else if (bannerFile) { const r = await api.uploadImage(bannerFile, 'banner'); if (r.success && r.data) data.bannerUrl = resolveMediaUrl(r.data.url) ?? r.data.url; }
      socketService.updateProfile(data);
      updateUser(data);
      if (user) { const si = interests.slice(0, MAX_INTERESTS).map(sanitizeText).filter((i) => !containsProfanity(i)); api.updatePreferences(user.id, { birthday: birthday || undefined, timezone: timezone || undefined, interests: si }).catch(() => {}); }
      setAvatarFile(null); setBannerFile(null); setDeleteAvatarFlag(false); setDeleteBannerFlag(false);
      toast.success(t.settings.profileSavedToast);
    } catch { toast.error(t.settings.profileSaveErrorToast); }
    setIsSaving(false);
  };

  const handleLogout = async () => { await logout(); onOpenChange(false); router.push('/login'); };

  const saveNotificationPrefs = async () => {
    if (!user) return;
    try { await api.updatePreferences(user.id, { notificationsSound: notifSound, notificationsDesktop: notifDesktop, notificationsDm: notifDm, notificationsMentions: notifMentions, dndEnabled }); }
    catch { /* silent */ }
    socketService.updatePresence(dndEnabled ? 'dnd' : 'online');
  };

  const savePrivacyPrefs = async (showOnline: boolean, dm: string) => {
    if (!user) return;
    try { await api.updatePreferences(user.id, { privacyShowOnline: showOnline, privacyAllowDm: dm !== 'none' }); }
    catch { /* silent */ }
  };

  const applyFont = (fontId: string) => {
    setFontFamily(fontId);
    if (user) api.updatePreferences(user.id, { fontFamily: fontId }).catch(() => {});
    const fm: Record<string, string> = { inter: 'var(--font-inter), sans-serif', system: 'system-ui, sans-serif', mono: 'var(--font-geist-mono), ui-monospace, monospace' };
    if (fontId === 'geist' || !fm[fontId]) document.documentElement.style.removeProperty('--font-sans');
    else document.documentElement.style.setProperty('--font-sans', fm[fontId]);
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (!currentPassword.trim() || !newPassword.trim()) { toast.error('Veuillez remplir tous les champs'); return; }
    if (newPassword !== confirmPassword) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (newPassword.length < 8) { toast.error('Le nouveau mot de passe doit faire au moins 8 caractères'); return; }
    setIsChangingPassword(true);
    try {
      let e2ee: { encryptedPrivateKey?: string; keySalt?: string } = {};
      try {
        const kr = await api.getMyE2EEKeys();
        if (kr.data?.keySalt && kr.data?.encryptedPrivateKey) {
          const oldKey = await deriveKey(currentPassword, kr.data.keySalt);
          const rawKey = await decryptPrivateKey(kr.data.encryptedPrivateKey, oldKey);
          const salt = generateSalt();
          const newKey = await deriveKey(newPassword, salt);
          e2ee = { encryptedPrivateKey: await encryptPrivateKey(rawKey, newKey), keySalt: salt };
        }
      } catch { toast.error('Impossible de ré-encrypter la clé de chiffrement.'); setIsChangingPassword(false); return; }
      const r = await api.changePassword(user.id, { currentPassword, newPassword, ...e2ee });
      if (r.success) {
        try { await api.uploadPrivateBundle(await signalService.encryptPrivateBundle(newPassword)); } catch { /* non-blocking */ }
        toast.success('Mot de passe modifié avec succès');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      } else { toast.error((r as any).error || 'Mot de passe actuel incorrect'); }
    } catch { toast.error('Erreur lors du changement de mot de passe'); }
    setIsChangingPassword(false);
  };

  const handleUsernameInput = (val: string) => {
    const s = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setNewUsername(s); setUsernameAvailable(null);
    if (usernameCheckTimeout.current) clearTimeout(usernameCheckTimeout.current);
    if (s.length >= 3 && s !== user?.username) {
      setUsernameChecking(true);
      usernameCheckTimeout.current = setTimeout(async () => {
        try { const r = await api.checkUsernameAvailable(s); setUsernameAvailable((r as any).data?.available ?? (r as any).available ?? false); }
        catch { setUsernameAvailable(null); }
        setUsernameChecking(false);
      }, 400);
    } else { setUsernameChecking(false); }
  };

  const handleChangeUsername = async () => {
    if (!user || !newUsername.trim() || !usernamePassword.trim()) { toast.error('Veuillez remplir tous les champs'); return; }
    if (newUsername.length < 3) { toast.error("Le nom d'utilisateur doit faire au moins 3 caractères"); return; }
    if (!usernameAvailable) { toast.error("Ce nom d'utilisateur n'est pas disponible"); return; }
    setUsernameChanging(true);
    try {
      const r = await api.changeUsername(user.id, { newUsername, password: usernamePassword });
      if (r.success) { toast.success("Nom d'utilisateur modifié"); updateUser({ username: newUsername } as any); setEditingUsername(false); setNewUsername(''); setUsernamePassword(''); setUsernameAvailable(null); }
      else { toast.error((r as any).error || 'Erreur lors du changement'); }
    } catch { toast.error("Erreur lors du changement de nom d'utilisateur"); }
    setUsernameChanging(false);
  };

  const handleRevokeAllSessions = async () => {
    setIsRevokingAll(true);
    try { await api.logoutAll(); toast.success(t.settings.revokeAllSuccess); await handleLogout(); }
    catch { toast.error(t.settings.revokeAllError); setIsRevokingAll(false); }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) { toast.error(t.settings.deleteMissingPassword); return; }
    setIsDeletingAccount(true);
    const r = await api.requestAccountDeletion(deletePassword);
    if (r.success) { toast.success(t.settings.deleteSuccess); setDeletePassword(''); await handleLogout(); }
    else { toast.error((r as any).error ?? t.settings.profileSaveError); setIsDeletingAccount(false); }
  };

  if (!user) return null;

  /* ═══════════════════════════════════════════════════════════════════════ */
  /*  TAB RENDERS                                                           */
  /* ═══════════════════════════════════════════════════════════════════════ */

  /* ──────────────────── PROFILE ──────────────────── */
  function renderProfile() {
    return (
      <div className="space-y-5">
        <PageHeader title={t.settings.profile} />

        {/* Banner + Avatar card */}
        <SettingsCard className="overflow-hidden">
          <div className="relative h-28 cursor-pointer overflow-hidden" style={{ backgroundColor: cardColor }} onClick={() => bannerInputRef.current?.click()}>
            {bannerPreview ? <img src={bannerPreview} alt="" className="size-full object-cover" /> : <div className="flex size-full items-center justify-center gap-2 text-sm text-white/50"><ImageIcon size={18} /><span>Ajouter une bannière</span></div>}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100"><CameraIcon size={28} className="text-white" /></div>
          </div>
          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />

          <div className="px-5 pb-5">
            <div className="-mt-8 mb-4 flex items-end justify-between">
              <div className="relative cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                <Avatar className="size-16 rounded-2xl ring-[3px] ring-card shadow-lg">
                  <AvatarImage src={avatarPreview || undefined} className="rounded-2xl" />
                  <AvatarFallback className="rounded-2xl bg-primary/15 text-lg font-bold text-primary">{displayName?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition-opacity hover:opacity-100"><CameraIcon size={18} className="text-white" /></div>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{(user as any).role || 'Membre'}</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 rounded-xl"><CameraIcon size={14} /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => avatarInputRef.current?.click()}>Changer l'avatar</DropdownMenuItem>
                    {avatarPreview && <DropdownMenuItem onSelect={handleDeleteAvatar} className="text-destructive">Supprimer l'avatar</DropdownMenuItem>}
                    <DropdownMenuItem onSelect={() => bannerInputRef.current?.click()}>Changer la bannière</DropdownMenuItem>
                    {bannerPreview && <DropdownMenuItem onSelect={handleDeleteBanner} className="text-destructive">Supprimer la bannière</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Name / username */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground/60">{t.settings.displayName}</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={32} placeholder={t.settings.displayNamePlaceholder} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground/60">{t.settings.username}</Label>
                {!editingUsername ? (
                  <div className="flex gap-2">
                    <Input value={user.username} readOnly disabled className="flex-1 rounded-xl" />
                    <Button type="button" variant="outline" size="icon" className="size-10 shrink-0 rounded-xl" onClick={() => { setEditingUsername(true); setNewUsername(user.username); }}><PencilIcon size={14} /></Button>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-2xl border border-border/40 bg-muted/20 p-3">
                    <div className="relative">
                      <Input value={newUsername} onChange={(e) => handleUsernameInput(e.target.value)} maxLength={32} placeholder="nouveau_pseudo" className="rounded-xl pr-8" />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        {usernameChecking ? <Loader2Icon size={13} className="animate-spin text-muted-foreground" /> : usernameAvailable === true ? <CheckIcon size={13} className="text-emerald-400" /> : usernameAvailable === false ? <XIcon size={13} className="text-rose-400" /> : null}
                      </span>
                    </div>
                    {usernameAvailable === false && <p className="text-[11px] text-rose-400">Ce pseudo est déjà pris</p>}
                    {usernameAvailable === true && <p className="text-[11px] text-emerald-400">Pseudo disponible !</p>}
                    <Input type="password" value={usernamePassword} onChange={(e) => setUsernamePassword(e.target.value)} placeholder="Mot de passe actuel" className="rounded-xl" />
                    <div className="flex gap-2">
                      <Button type="button" size="sm" disabled={!usernameAvailable || !usernamePassword.trim() || usernameChanging} onClick={handleChangeUsername} className="rounded-xl">
                        {usernameChanging ? 'Changement...' : 'Confirmer'}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="rounded-xl" onClick={() => { setEditingUsername(false); setNewUsername(''); setUsernamePassword(''); setUsernameAvailable(null); }}>Annuler</Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-[11px] text-muted-foreground/60">{t.settings.bio}</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t.settings.bioPlaceholder} rows={3} maxLength={200} className="rounded-xl" />
                <p className="text-right text-[11px] text-muted-foreground">{bio.length}/200</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground/60">{t.settings.birthday}</Label>
                <Input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground/60">{t.settings.timezone}</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIMEZONES.map((tz) => <SelectItem key={tz.id} value={tz.id}>{tz.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </SettingsCard>

        {/* Card color */}
        <SettingsCard>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-[13px] font-semibold text-foreground">{t.settings.profileColor}</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">{t.settings.profileColorDesc}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {CARD_COLOR_PRESETS.map((c) => (
                <button key={c} type="button" onClick={() => setCardColor(c)}
                  className={cn('size-8 rounded-full border-2 transition-all', cardColor === c ? 'scale-110 border-foreground' : 'border-transparent hover:scale-105')}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Input value={cardColor} onChange={(e) => setCardColor(e.target.value)} className="w-28 rounded-xl font-mono" maxLength={7} />
              <div className="size-8 rounded-full border shadow-sm" style={{ backgroundColor: cardColor }} />
            </div>
          </div>
        </SettingsCard>

        {/* Interests */}
        <SettingsCard>
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-foreground">Centres d'intérêt</p>
              <span className="text-[11px] text-muted-foreground">{interests.length}/{MAX_INTERESTS}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.map((i) => (
                <Badge key={i} variant="secondary" className="gap-1.5 rounded-lg">
                  {i}
                  <button type="button" onClick={() => setInterests(interests.filter((x) => x !== i))} className="hover:text-foreground"><XIcon size={11} /></button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Ajouter..." value={newInterest} maxLength={MAX_INTEREST_LENGTH} className="flex-1 rounded-xl"
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newInterest.trim()) { e.preventDefault(); const { next, error } = addInterestSafely(interests, newInterest); if (error && error !== 'empty') toast.error(error); setInterests(next); if (!error) setNewInterest(''); } }}
                disabled={interests.length >= MAX_INTERESTS} />
              <Button type="button" variant="secondary" className="rounded-xl" disabled={!newInterest.trim() || interests.length >= MAX_INTERESTS}
                onClick={() => { const { next, error } = addInterestSafely(interests, newInterest); if (error && error !== 'empty') toast.error(error); setInterests(next); if (!error) setNewInterest(''); }}>
                Ajouter
              </Button>
            </div>
          </div>
        </SettingsCard>

        {/* Badges */}
        {userBadges.length > 0 && (
          <SettingsCard>
            <div className="p-5 space-y-3">
              <p className="text-[13px] font-semibold text-foreground">{t.settings.myBadges}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {userBadges.map((badge: any) => {
                  const isHidden = hiddenBadgeIds.includes(badge.id);
                  return (
                    <div key={badge.id} className={cn('flex items-center gap-2.5 rounded-xl border p-3 transition-opacity', isHidden && 'opacity-40')} style={{ backgroundColor: badge.color + '08', borderColor: badge.color + '30' }}>
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: badge.color + '20', border: `2px solid ${badge.color}40` }}>
                        {badge.iconType === 'svg' ? <span dangerouslySetInnerHTML={{ __html: sanitizeSvg(badge.iconValue || badge.icon) }} className="flex size-4 items-center justify-center [&>svg]:size-full" />
                          : <i className={`fi fi-br-${badge.iconValue || badge.icon}`} style={{ color: badge.color, fontSize: '14px', lineHeight: 1 }} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold">{badge.name}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(badge.earnedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <Switch checked={!isHidden} onCheckedChange={(v) => setHiddenBadgeIds((p) => v ? p.filter((id) => id !== badge.id) : [...p, badge.id])} />
                    </div>
                  );
                })}
              </div>
            </div>
          </SettingsCard>
        )}

        <Button onClick={handleSaveProfile} disabled={isSaving} className="gap-2 rounded-xl">
          <SaveIcon size={14} />
          {isSaving ? t.common.saving : t.common.save}
        </Button>
      </div>
    );
  }

  /* ──────────────────── VOICE ──────────────────── */
  function renderVoice() {
    return (
      <div className="space-y-5">
        <PageHeader title={t.settings.voice} />
        <div className="flex gap-2">
          {(['mic', 'speaker'] as const).map((tab) => (
            <Button key={tab} variant={voiceTab === tab ? 'default' : 'outline'} size="sm" className="gap-2 rounded-xl" onClick={() => setVoiceTab(tab)}>
              {tab === 'mic' ? <MicIcon size={13} /> : <Volume2Icon size={13} />}
              {tab === 'mic' ? t.settings.microphone : t.settings.audioOutput}
            </Button>
          ))}
        </div>

        {voiceTab === 'mic' && (
          <div className="space-y-4">
            <SettingsCard>
              <div className="p-5 space-y-4">
                {isLoadingDevices ? (
                  <div className="space-y-3"><Skeleton className="h-10 rounded-xl" /><Skeleton className="h-10 rounded-xl" /></div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground/60">{t.settings.inputDevice}</p>
                      <Select value={audioPrefs.inputDeviceId} onValueChange={(v) => updateAudioPref('inputDeviceId', v)}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder={t.settings.systemDefault} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">{t.settings.systemDefault}</SelectItem>
                          {audioDevices.map((d) => <SelectItem key={d.deviceId} value={d.deviceId}>{d.label || `Micro ${d.deviceId.slice(0, 8)}`}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-medium text-muted-foreground/60">{t.settings.inputVolume}</p>
                        <span className="text-[11px] text-muted-foreground">{audioPrefs.inputVolume}%</span>
                      </div>
                      <Slider value={[audioPrefs.inputVolume]} onValueChange={([v]) => updateAudioPref('inputVolume', v)} min={0} max={200} className="rounded-full" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium text-foreground">{t.settings.micTest}</span>
                        <Button variant={micTestActive ? 'destructive' : 'secondary'} size="sm" className="rounded-xl" onClick={micTestActive ? stopMicTest : startMicTest}>
                          {micTestActive ? t.settings.stopTest : t.settings.testMic}
                        </Button>
                      </div>
                      {micTestActive && <Progress value={micLevel} className="rounded-full" />}
                    </div>
                  </>
                )}
              </div>
            </SettingsCard>

            <SettingsCard>
              <div className="p-5 space-y-3">
                <p className="text-[13px] font-semibold text-foreground">{t.settings.micMode}</p>
                <p className="text-[12px] text-muted-foreground">{t.settings.micModeDesc}</p>
                <RadioGroup value={micMode} onValueChange={(v) => { setMicMode(v); api.updatePreferences(user.id, { micMode: v }).catch(() => {}); }}>
                  {[{ value: 'vad', label: t.settings.micModeVAD, desc: t.settings.micModeVADDesc }, { value: 'ptt', label: t.settings.micModePTT, desc: t.settings.micModePTTDesc }, { value: 'always', label: t.settings.micModeAlways, desc: t.settings.micModeAlwaysDesc }].map(({ value, label, desc }) => (
                    <label key={value} className={cn('flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-all', micMode === value ? 'border-primary/50 bg-primary/5' : 'border-border/40 hover:border-border hover:bg-muted/30')}>
                      <RadioGroupItem value={value} className="mt-0.5" />
                      <div><p className="text-[13px] font-medium">{label}</p><p className="text-[11px] text-muted-foreground">{desc}</p></div>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </SettingsCard>

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between gap-2 rounded-xl">
                  <span className="flex items-center gap-2 text-[13px]"><ZapIcon size={13} />{t.settings.audioProcessing}</span>
                  <ChevronRightIcon size={15} className="transition-transform data-[state=open]:rotate-90" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SettingsCard className="mt-2">
                  {[{ key: 'noiseSuppression' as const, label: t.settings.noiseSuppression, desc: t.settings.noiseSuppressionDesc }, { key: 'echoCancellation' as const, label: t.settings.echoCancellation, desc: t.settings.echoCancellationDesc }, { key: 'autoGainControl' as const, label: t.settings.autoGain, desc: t.settings.autoGainDesc }].map((item) => (
                    <SettingsRow key={item.key} label={item.label} description={item.desc}>
                      <Switch checked={audioPrefs[item.key]} onCheckedChange={(v) => updateAudioPref(item.key, v)} />
                    </SettingsRow>
                  ))}
                </SettingsCard>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {voiceTab === 'speaker' && (
          <SettingsCard>
            <div className="p-5 space-y-4">
              {isLoadingDevices ? <Skeleton className="h-10 rounded-xl" /> : (
                <>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground/60">{t.settings.outputDevice}</p>
                    <Select value={audioPrefs.outputDeviceId} onValueChange={(v) => updateAudioPref('outputDeviceId', v)}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder={t.settings.systemDefault} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">{t.settings.systemDefault}</SelectItem>
                        {outputDevices.map((d) => <SelectItem key={d.deviceId} value={d.deviceId}>{d.label || `Sortie ${d.deviceId.slice(0, 8)}`}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium text-muted-foreground/60">{t.settings.outputVolume}</p>
                      <span className="text-[11px] text-muted-foreground">{audioPrefs.outputVolume}%</span>
                    </div>
                    <Slider value={[audioPrefs.outputVolume]} onValueChange={([v]) => updateAudioPref('outputVolume', v)} min={0} max={200} className="rounded-full" />
                  </div>
                </>
              )}
            </div>
          </SettingsCard>
        )}
      </div>
    );
  }

  /* ──────────────────── NOTIFICATIONS ──────────────────── */
  function renderNotifications() {
    return (
      <div className="space-y-5">
        <PageHeader title={t.settings.notifications} />
        <SettingsCard>
          <SettingsRow label={t.settings.dndMode} description={t.settings.dndModeDesc} border={false}>
            <Switch checked={dndEnabled} onCheckedChange={(v) => { setDndEnabled(v); setTimeout(saveNotificationPrefs, 0); }} />
          </SettingsRow>
        </SettingsCard>
        <SettingsCard>
          {[
            { id: 'sound', checked: notifSound, set: setNotifSound, label: t.settings.notifSound, desc: t.settings.notifSoundDesc },
            { id: 'desktop', checked: notifDesktop, set: setNotifDesktop, label: t.settings.desktopNotifs, desc: t.settings.desktopNotifsDesc },
            { id: 'dm', checked: notifDm, set: setNotifDm, label: t.settings.dms, desc: t.settings.dmsDesc },
            { id: 'mentions', checked: notifMentions, set: setNotifMentions, label: t.settings.mentions, desc: t.settings.mentionsDesc },
          ].map((item) => (
            <SettingsRow key={item.id} label={item.label} description={item.desc}>
              <Checkbox id={`notif-${item.id}`} checked={item.checked} onCheckedChange={(v) => { item.set(v as boolean); setTimeout(saveNotificationPrefs, 0); }} />
            </SettingsRow>
          ))}
        </SettingsCard>
        <SettingsCard>
          <div className="p-5 space-y-3">
            <p className="text-[13px] font-semibold text-foreground">{t.settings.keywords}</p>
            <p className="text-[12px] text-muted-foreground">{t.settings.keywordsDesc}</p>
            <div className="flex flex-wrap gap-2">
              {notifKeywords.map((kw) => (
                <Badge key={kw} variant="secondary" className="gap-1.5 rounded-lg">
                  {kw}
                  <button type="button" onClick={() => { const u = notifKeywords.filter((k) => k !== kw); setNotifKeywords(u); api.updatePreferences(user.id, { notifKeywords: u }).catch(() => {}); }} className="hover:text-foreground"><XIcon size={11} /></button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder={t.settings.addKeyword} value={newKeyword} className="flex-1 rounded-xl" onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newKeyword.trim()) { e.preventDefault(); const u = [...notifKeywords, newKeyword.trim()]; setNotifKeywords(u); api.updatePreferences(user.id, { notifKeywords: u }).catch(() => {}); setNewKeyword(''); } }} />
              <Button variant="secondary" className="rounded-xl" disabled={!newKeyword.trim()} onClick={() => { if (newKeyword.trim()) { const u = [...notifKeywords, newKeyword.trim()]; setNotifKeywords(u); api.updatePreferences(user.id, { notifKeywords: u }).catch(() => {}); setNewKeyword(''); } }}>{t.settings.add}</Button>
            </div>
          </div>
        </SettingsCard>
      </div>
    );
  }

  /* ──────────────────── PRIVACY ──────────────────── */
  function renderPrivacy() {
    return (
      <div className="space-y-5">
        <PageHeader title={t.settings.privacy} />

        {/* Visibility */}
        <SettingsCard>
          <SettingsRow label={t.settings.showOnlineStatus} description={t.settings.showOnlineStatusDesc}>
            <Switch checked={showOnlineStatus} onCheckedChange={(v) => { setShowOnlineStatus(v); savePrivacyPrefs(v, dmMode); }} />
          </SettingsRow>
          <div className="px-5 py-4">
            <p className="text-[13px] font-medium text-foreground">{t.settings.allowDMs}</p>
            <p className="mt-0.5 mb-3 text-[12px] text-muted-foreground">{t.settings.allowDMsDesc}</p>
            <div className="flex gap-2">
              {[{ value: 'everyone', label: t.settings.dmEveryone }, { value: 'friends', label: t.settings.dmFriends }, { value: 'none', label: t.settings.dmNone }].map(({ value, label }) => (
                <button key={value} type="button" onClick={() => { setDmMode(value); savePrivacyPrefs(showOnlineStatus, value); }}
                  className={cn('flex-1 rounded-xl border px-3 py-2.5 text-[13px] transition-all', dmMode === value ? 'border-primary/50 bg-primary/10 font-semibold text-foreground' : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground')}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </SettingsCard>

        {/* Change password */}
        <SettingsCard>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <KeyRoundIcon size={15} className="text-rose-400" />
              <p className="text-[13px] font-semibold text-foreground">Changer le mot de passe</p>
            </div>
            <Input type="password" placeholder="Mot de passe actuel" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="rounded-xl" />
            <Input type="password" placeholder="Nouveau mot de passe (min. 8 car.)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rounded-xl" />
            <Input type="password" placeholder="Confirmer le nouveau mot de passe" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="rounded-xl" />
            <Button size="sm" onClick={handleChangePassword} disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword} className="gap-2 rounded-xl">
              <KeyRoundIcon size={13} />Modifier le mot de passe
            </Button>
          </div>
        </SettingsCard>

        {/* 2FA */}
        <SettingsCard>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <LockIcon size={15} className="text-primary" />
              <p className="text-[13px] font-semibold text-foreground">{t.settings.twoFATitle}</p>
            </div>
            <p className="text-[12px] text-muted-foreground">{twoFAEnabled ? t.settings.twoFAEnabledDesc : t.settings.twoFADisabledDesc}</p>
            {twoFAStep === 'idle' && (
              twoFAEnabled ? (
                <div className="space-y-3">
                  <p className="text-[12px] text-muted-foreground">{t.settings.twoFADisablePrompt}</p>
                  <InputOTP maxLength={6} value={twoFADisableCode} onChange={setTwoFADisableCode}>
                    <InputOTPGroup><InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} /></InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup><InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} /></InputOTPGroup>
                  </InputOTP>
                  <Button variant="secondary" size="sm" className="rounded-xl" disabled={twoFADisableCode.length < 6 || twoFADisabling}
                    onClick={async () => { setTwoFADisabling(true); const r = await api.disable2FA(twoFADisableCode); setTwoFADisabling(false); if (r.success) { setTwoFAEnabled(false); setTwoFADisableCode(''); } else { setTwoFADisableCode(''); } }}>
                    {t.settings.twoFADisableBtn}
                  </Button>
                </div>
              ) : (
                <Button size="sm" className="rounded-xl" disabled={twoFALoading}
                  onClick={async () => { setTwoFALoading(true); const r = await api.setup2FA(); setTwoFALoading(false); if (r.success && r.data) { setTwoFAQR((r.data as any).qrCodeDataUrl); setTwoFASecret((r.data as any).secret); setTwoFAStep('setup'); } }}>
                  {t.settings.twoFAConfigureBtn}
                </Button>
              )
            )}
            {twoFAStep === 'setup' && (
              <div className="space-y-4">
                <p className="text-[12px] text-muted-foreground">{t.settings.twoFAScanPrompt}</p>
                {twoFAQR && <div className="flex justify-center"><img src={twoFAQR} alt="QR 2FA" className="size-40 rounded-xl" /></div>}
                <div className="rounded-xl bg-muted/40 p-3 font-mono text-[11px] break-all text-center text-muted-foreground">{twoFASecret}</div>
                <p className="text-[12px] text-muted-foreground">{t.settings.twoFAEnterCode}</p>
                <InputOTP maxLength={6} value={twoFACode} onChange={setTwoFACode}>
                  <InputOTPGroup><InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} /></InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup><InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} /></InputOTPGroup>
                </InputOTP>
                <div className="flex gap-2">
                  <Button size="sm" className="rounded-xl" disabled={twoFACode.length < 6 || twoFALoading}
                    onClick={async () => { setTwoFALoading(true); const r = await api.enable2FA(twoFACode); setTwoFALoading(false); if (r.success && r.data) { setTwoFABackupCodes((r.data as any).backupCodes ?? []); setTwoFAEnabled(true); setTwoFACode(''); setTwoFAStep('backup'); } else { setTwoFACode(''); } }}>
                    {t.settings.twoFAActivateBtn}
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => { setTwoFAStep('idle'); setTwoFACode(''); }}>{t.common.cancel}</Button>
                </div>
              </div>
            )}
            {twoFAStep === 'backup' && (
              <div className="space-y-3">
                <p className="text-[13px] font-semibold">{t.settings.twoFAEnabledAlert}</p>
                <p className="text-[12px] text-muted-foreground">{t.settings.twoFABackupPrompt}</p>
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/40 p-3">{twoFABackupCodes.map((c) => <span key={c} className="font-mono text-[11px]">{c}</span>)}</div>
                <Button size="sm" className="rounded-xl" onClick={() => setTwoFAStep('idle')}>{t.common.close}</Button>
              </div>
            )}
          </div>
        </SettingsCard>

        {/* Active sessions */}
        <SettingsCard>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-foreground">Sessions actives</p>
              <Button size="sm" variant="destructive" className="gap-1.5 rounded-xl" onClick={handleRevokeAllSessions} disabled={isRevokingAll}>
                <AlertTriangleIcon size={12} />{t.settings.revokeAll}
              </Button>
            </div>
            {sessionsLoading ? <div className="space-y-2"><Skeleton className="h-14 rounded-xl" /><Skeleton className="h-14 rounded-xl" /></div> : sessions.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-muted-foreground">{t.settings.sessionsEmpty}</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => {
                  const { browser, os, icon } = parseUserAgent(s.userAgent);
                  const cur = typeof window !== 'undefined' ? localStorage.getItem('alfychat_session_id') : null;
                  const isCur = s.id === cur;
                  const ip = s.ipAddress?.startsWith('::ffff:') ? s.ipAddress.slice(7) : s.ipAddress === '::1' ? '127.0.0.1' : s.ipAddress ?? '—';
                  return (
                    <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border/40 p-3">
                      <span className="text-xl">{icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium">{os} — {browser}</span>
                          {isCur && <Badge variant="outline" className="text-[10px] py-0">Actuel</Badge>}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{ip} · {new Date(s.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      {!isCur && (
                        <Button size="icon" variant="ghost" className="size-8 rounded-xl text-destructive hover:text-destructive/80"
                          onClick={async () => { const r = await api.revokeSession(s.id); if (r.success) { setSessions((p) => p.filter((x) => x.id !== s.id)); toast.success(t.settings.sessionRevoked); } else { toast.error(t.settings.sessionRevokeError); } }}>
                          <Trash2Icon size={13} />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SettingsCard>

        {/* Danger zone */}
        <SettingsCard className="border-rose-500/25">
          <div className="p-5 space-y-3">
            <p className="text-[13px] font-semibold text-rose-400">{t.settings.dangerZone}</p>
            <p className="text-[12px] text-muted-foreground">{t.settings.dangerZoneDesc}</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2 rounded-xl"><Trash2Icon size={13} />{t.settings.deleteAccount}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.settings.deleteAccountTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{t.settings.deleteAccountBody}</AlertDialogDescription>
                </AlertDialogHeader>
                <Input type="password" placeholder={t.settings.deletePasswordPlaceholder} value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="rounded-xl" />
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeletePassword('')}>{t.common.cancel}</AlertDialogCancel>
                  <AlertDialogAction disabled={isDeletingAccount || !deletePassword.trim()} onClick={handleDeleteAccount}>{t.settings.deleteConfirm}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </SettingsCard>
      </div>
    );
  }

  /* ──────────────────── APPEARANCE ──────────────────── */
  function renderAppearance() {
    return (
      <div className="space-y-5">
        <PageHeader title={t.settings.appearance} />

        {/* Theme */}
        <SettingsCard>
          <div className="p-5 space-y-3">
            <p className="text-[13px] font-semibold text-foreground">{t.settings.mode}</p>
            <p className="text-[12px] text-muted-foreground">{t.settings.modeDesc}</p>
            <div className="flex gap-2">
              {[{ id: 'dark', label: t.settings.dark, icon: MoonIcon }, { id: 'light', label: t.settings.light, icon: SunIcon }, { id: 'system', label: t.settings.system, icon: MonitorIcon }].map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setTheme(id)}
                  className={cn('flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] font-medium transition-all', theme === id ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground')}>
                  <Icon size={14} />{label}
                </button>
              ))}
            </div>
          </div>
        </SettingsCard>

        {/* Font */}
        <SettingsCard>
          <div className="p-5 space-y-3">
            <p className="text-[13px] font-semibold text-foreground">{t.settings.fontFamily}</p>
            <Select value={fontFamily} onValueChange={applyFont}>
              <SelectTrigger className="rounded-xl max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{FONTS.map((f) => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </SettingsCard>
      </div>
    );
  }

  /* ──────────────────── LANGUAGE ──────────────────── */
  function renderLanguage() {
    return (
      <div className="space-y-5">
        <PageHeader title={t.settings.language} />
        <SettingsCard>
          <div className="p-5 space-y-4">
            <div className="relative">
              <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={langSearch} onChange={(e) => setLangSearch(e.target.value)} placeholder={t.settings.searchPlaceholder} className="pl-9 rounded-xl" />
            </div>
            <LanguageSwitcher variant="full" filter={langSearch} />
          </div>
        </SettingsCard>
      </div>
    );
  }

  /* ──────────────────── LAYOUT ──────────────────── */
  function renderLayout() {
    const serverListOptions = [
      { id: 'left', label: 'Gauche', preview: <div className="flex h-12 w-full gap-0.5 overflow-hidden rounded-lg border border-border/20 bg-background/50 p-0.5"><div className="w-2 rounded-sm bg-primary/50" /><div className="w-3.5 rounded-sm bg-muted/50" /><div className="flex-1 rounded-sm bg-muted/20" /></div> },
      { id: 'right', label: 'Droite', preview: <div className="flex h-12 w-full gap-0.5 overflow-hidden rounded-lg border border-border/20 bg-background/50 p-0.5"><div className="flex-1 rounded-sm bg-muted/20" /><div className="w-3.5 rounded-sm bg-muted/50" /><div className="w-2 rounded-sm bg-primary/50" /></div> },
      { id: 'top', label: 'Haut', preview: <div className="flex h-12 w-full flex-col gap-0.5 overflow-hidden rounded-lg border border-border/20 bg-background/50 p-0.5"><div className="h-2 w-full rounded-sm bg-primary/50" /><div className="flex flex-1 gap-0.5"><div className="w-3.5 rounded-sm bg-muted/50" /><div className="flex-1 rounded-sm bg-muted/20" /></div></div> },
      { id: 'bottom', label: 'Bas', preview: <div className="flex h-12 w-full flex-col gap-0.5 overflow-hidden rounded-lg border border-border/20 bg-background/50 p-0.5"><div className="flex flex-1 gap-0.5"><div className="w-3.5 rounded-sm bg-muted/50" /><div className="flex-1 rounded-sm bg-muted/20" /></div><div className="h-2 w-full rounded-sm bg-primary/50" /></div> },
    ] as const;

    return (
      <div className="space-y-5">
        <PageHeader title="Mise en page" />

        {/* Server list position */}
        <SettingsCard>
          <div className="p-5 space-y-3">
            <p className="text-[13px] font-semibold text-foreground">Position de la liste des serveurs</p>
            <p className="text-[12px] text-muted-foreground">Choisissez où apparaît la liste des icônes de serveurs</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {serverListOptions.map(({ id, label, preview }) => (
                <button key={id} type="button" onClick={() => updateLayoutPrefs({ serverListPosition: id })}
                  className={cn('flex flex-col items-center gap-2 rounded-xl border-2 p-2.5 text-[12px] font-medium transition-all', layoutPrefs.serverListPosition === id ? 'border-primary bg-primary/10 text-primary' : 'border-border/30 bg-muted/20 text-muted-foreground hover:border-border/60')}>
                  {preview}<span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </SettingsCard>

        {/* Member list side */}
        <SettingsCard>
          <div className="p-5 space-y-3">
            <p className="text-[13px] font-semibold text-foreground">Position de la liste des membres</p>
            <div className="grid grid-cols-2 gap-3">
              {(['left', 'right'] as const).map((side) => (
                <button key={side} type="button" onClick={() => updateLayoutPrefs({ memberListSide: side })}
                  className={cn('flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-[13px] font-medium transition-all', layoutPrefs.memberListSide === side ? 'border-primary bg-primary/10 text-primary' : 'border-border/30 bg-muted/20 text-muted-foreground hover:border-border/60')}>
                  <div className="flex h-14 w-full gap-1 overflow-hidden rounded-lg border border-border/20 bg-background/50 p-1">
                    {side === 'left' && <div className="w-7 rounded-sm bg-emerald-500/30" />}
                    <div className="flex-1 rounded-sm bg-muted/20" />
                    {side === 'right' && <div className="w-7 rounded-sm bg-emerald-500/30" />}
                  </div>
                  <span>{side === 'left' ? 'Gauche' : 'Droite'}</span>
                </button>
              ))}
            </div>
          </div>
        </SettingsCard>

        {/* UI Style */}
        <SettingsCard>
          <div className="p-5 space-y-3">
            <p className="text-[13px] font-semibold text-foreground">Style de l'interface</p>
            <p className="text-[12px] text-muted-foreground">Choisissez entre un style épuré ou un style vitré inspiré d'Apple</p>
            <div className="grid grid-cols-2 gap-3">
              {[{
                id: 'flat' as const, label: 'Flat', desc: 'Épuré · actuel',
                preview: <div className="flex w-full gap-1 rounded-lg border border-border/20 bg-background/50 p-1.5"><div className="w-5 rounded bg-muted/60" /><div className="flex flex-1 flex-col gap-0.5"><div className="h-1.5 rounded bg-muted/50" /><div className="h-1.5 w-3/4 rounded bg-muted/40" /><div className="mt-1 h-2.5 w-full rounded bg-muted/30" /></div></div>,
              }, {
                id: 'glass' as const, label: 'Glass', desc: 'Apple · vitré',
                preview: <div className="relative flex w-full gap-1 overflow-hidden rounded-lg border border-white/20 p-1.5" style={{ background: 'linear-gradient(135deg, oklch(0.78 0.10 280 / 30%), oklch(0.72 0.12 230 / 20%))' }}><div className="absolute inset-0 rounded-lg" style={{ backdropFilter: 'blur(8px)' }} /><div className="relative w-5 rounded border border-white/20 bg-white/30" /><div className="relative flex flex-1 flex-col gap-0.5"><div className="h-1.5 rounded border border-white/15 bg-white/40" /><div className="h-1.5 w-3/4 rounded bg-white/30" /><div className="mt-1 h-2.5 w-full rounded bg-white/25" /></div></div>,
              }].map(({ id, label, desc, preview }) => (
                <button key={id} type="button" onClick={() => updateLayoutPrefs({ uiStyle: id })}
                  className={cn('flex flex-col items-center gap-2 rounded-xl border-2 p-2.5 text-[12px] font-medium transition-all', layoutPrefs.uiStyle === id ? 'border-primary bg-primary/10 text-primary' : 'border-border/30 bg-muted/20 text-muted-foreground hover:border-border/60')}>
                  {preview}
                  <div className="text-center"><span className="block">{label}</span><span className="block text-[10px] font-normal text-muted-foreground">{desc}</span></div>
                </button>
              ))}
            </div>
          </div>
        </SettingsCard>

        {/* Wallpaper — glass mode only */}
        {layoutPrefs.uiStyle === 'glass' && (
          <SettingsCard>
            <div className="p-5 space-y-4">
              <p className="text-[13px] font-semibold text-foreground">Fond d'écran</p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {WALLPAPER_PRESETS.map(({ label, value }) => (
                  <button key={label} type="button" title={label} onClick={() => setWallpaper(value)}
                    className={cn('relative h-12 w-full overflow-hidden rounded-xl border-2 transition-all', wallpaper === value ? 'scale-105 border-primary shadow-md' : 'border-transparent hover:scale-105 hover:border-border/50')}
                    style={{ background: value }}>
                    {wallpaper === value && <div className="absolute inset-0 flex items-center justify-center"><CheckIcon size={14} className="text-white drop-shadow" /></div>}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input ref={wallpaperInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return; e.target.value = '';
                  try { const r = await api.uploadImage(f, 'wallpaper'); if (r.success && r.data?.url) setWallpaper(r.data.url); else toast.error(r.error || "Erreur lors de l'upload"); }
                  catch { toast.error("Erreur lors de l'upload"); }
                }} />
                <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => wallpaperInputRef.current?.click()}><UploadIcon size={13} />Image personnalisée</Button>
                {wallpaper && <Button variant="ghost" size="sm" className="gap-2 rounded-xl text-muted-foreground hover:text-destructive" onClick={() => setWallpaper(null)}><XIcon size={13} />Supprimer</Button>}
              </div>
              {wallpaper && (
                <div className="h-16 w-full overflow-hidden rounded-xl border border-border/30" style={{ backgroundImage: wallpaper.startsWith('linear-gradient') || wallpaper.startsWith('radial-gradient') ? wallpaper : `url(${resolveMediaUrl(wallpaper) ?? wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              )}
            </div>
          </SettingsCard>
        )}

        {/* Message style */}
        <SettingsCard>
          <div className="p-5 space-y-3">
            <p className="text-[13px] font-semibold text-foreground">Style des messages</p>
            <div className="grid grid-cols-2 gap-3">
              {[{
                id: 'bubble' as const, label: 'Bulles', desc: 'iMessage · WhatsApp',
                preview: <div className="flex w-full flex-col gap-1 rounded-lg border border-border/20 bg-background/50 p-2"><div className="flex justify-start"><div className="h-5 w-16 rounded-2xl rounded-bl-sm bg-muted/60" /></div><div className="flex justify-end"><div className="h-5 w-20 rounded-2xl rounded-br-sm bg-primary/60" /></div><div className="flex justify-start"><div className="h-5 w-12 rounded-2xl rounded-bl-sm bg-muted/60" /></div></div>,
              }, {
                id: 'discord' as const, label: 'Plat', desc: 'Discord · Slack',
                preview: <div className="flex w-full flex-col gap-1.5 rounded-lg border border-border/20 bg-background/50 p-2">{[1, 2].map((i) => <div key={i} className="flex items-start gap-1.5"><div className="size-4 shrink-0 rounded-full bg-muted/60" /><div className="flex flex-1 flex-col gap-0.5"><div className="h-1.5 w-10 rounded bg-primary/40" /><div className="h-2 w-full rounded bg-muted/50" /></div></div>)}</div>,
              }].map(({ id, label, desc, preview }) => (
                <button key={id} type="button" onClick={() => updateLayoutPrefs({ msgStyle: id })}
                  className={cn('flex flex-col items-center gap-2 rounded-xl border-2 p-2.5 text-[12px] font-medium transition-all', layoutPrefs.msgStyle === id ? 'border-primary bg-primary/10 text-primary' : 'border-border/30 bg-muted/20 text-muted-foreground hover:border-border/60')}>
                  {preview}
                  <div className="text-center"><span className="block">{label}</span><span className="block text-[10px] font-normal text-muted-foreground">{desc}</span></div>
                </button>
              ))}
            </div>
          </div>
        </SettingsCard>

        {/* Density */}
        <SettingsCard>
          <div className="p-5 space-y-3">
            <p className="text-[13px] font-semibold text-foreground">Densité de l'interface</p>
            <div className="grid grid-cols-3 gap-3">
              {[{ id: 'comfortable' as const, label: 'Confortable', desc: 'Plus aéré', preview: <div className="flex w-full flex-col gap-1.5 rounded-lg border border-border/20 bg-background/50 p-2"><div className="h-3 w-3/4 rounded bg-muted/50" /><div className="h-3 w-1/2 rounded bg-muted/40" /><div className="h-3 w-2/3 rounded bg-muted/30" /></div> }, { id: 'default' as const, label: 'Normal', desc: 'Équilibré', preview: <div className="flex w-full flex-col gap-1 rounded-lg border border-border/20 bg-background/50 p-1.5"><div className="h-2.5 w-3/4 rounded bg-muted/50" /><div className="h-2.5 w-1/2 rounded bg-muted/40" /><div className="h-2.5 w-2/3 rounded bg-muted/30" /></div> }, { id: 'compact' as const, label: 'Compact', desc: 'Plus dense', preview: <div className="flex w-full flex-col gap-0.5 rounded-lg border border-border/20 bg-background/50 p-1"><div className="h-2 w-3/4 rounded bg-muted/50" /><div className="h-2 w-1/2 rounded bg-muted/40" /><div className="h-2 w-2/3 rounded bg-muted/30" /><div className="h-2 w-1/2 rounded bg-muted/20" /></div> }].map(({ id, label, desc, preview }) => (
                <button key={id} type="button" onClick={() => updateLayoutPrefs({ density: id, compactServerList: id === 'compact' })}
                  className={cn('flex flex-col items-center gap-2 rounded-xl border-2 p-2.5 text-[12px] font-medium transition-all', layoutPrefs.density === id ? 'border-primary bg-primary/10 text-primary' : 'border-border/30 bg-muted/20 text-muted-foreground hover:border-border/60')}>
                  {preview}
                  <div className="text-center"><span className="block">{label}</span><span className="block text-[10px] font-normal text-muted-foreground">{desc}</span></div>
                </button>
              ))}
            </div>
          </div>
        </SettingsCard>
      </div>
    );
  }

  function renderContent() {
    switch (activeTab) {
      case 'profile':       return renderProfile();
      case 'voice':         return renderVoice();
      case 'notifications': return renderNotifications();
      case 'privacy':       return renderPrivacy();
      case 'appearance':    return renderAppearance();
      case 'language':      return renderLanguage();
      case 'layout':        return renderLayout();
      default:              return null;
    }
  }

  /* ─── Dialog ─── */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={cn(
        'flex h-[88vh] w-full sm:max-w-5xl gap-0 overflow-hidden rounded-2xl border border-border/50 p-0 shadow-2xl shadow-black/30',
        'max-sm:left-0 max-sm:top-0 max-sm:h-dvh max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0',
        ui.isGlass ? 'bg-black/40 backdrop-blur-2xl' : 'bg-card',
      )}>
        <VisuallyHidden.Root><DialogTitle>{t.settings.sectionHeader}</DialogTitle></VisuallyHidden.Root>

        {/* ─── Sidebar (desktop) ─── */}
        <aside className={cn('hidden w-56 shrink-0 flex-col border-r border-border/40 sm:flex', ui.isGlass ? 'bg-white/5' : 'bg-muted/30')}>
          <div className="flex items-center gap-3 border-b border-border/40 px-4 py-4">
            <Avatar className="size-10 shrink-0 rounded-2xl">
              <AvatarImage src={avatarPreview || undefined} className="rounded-2xl" />
              <AvatarFallback className="rounded-2xl bg-primary/12 font-bold text-primary">{displayName?.[0]?.toUpperCase() || '?'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-foreground">{displayName || user.username}</p>
              <p className="truncate text-[11px] text-muted-foreground">@{user.username}</p>
            </div>
          </div>

          <ScrollArea className="flex-1 px-2 py-2">
            <nav className="flex flex-col gap-0.5">
              <div className="mb-1 mt-0.5 px-1"><SectionLabel>Compte</SectionLabel></div>
              {NAV_TABS.map((tab) => (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                  className={cn('flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium outline-none transition-all duration-150', activeTab === tab.id ? 'bg-primary/12 text-primary ring-1 ring-primary/20 shadow-sm' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}>
                  <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-lg', activeTab === tab.id ? 'bg-primary/20' : 'bg-muted/50')}>
                    <tab.icon size={13} className={activeTab === tab.id ? 'text-primary' : tab.color} />
                  </span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </ScrollArea>

          <div className="border-t border-border/40 p-2">
            <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-rose-400 transition-colors hover:bg-rose-400/10">
              <LogOutIcon size={13} />{t.settings.logout}
            </button>
          </div>
        </aside>

        {/* ─── Main ─── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

          {/* Mobile: menu list */}
          {mobileShowMenu && (
            <div className="flex flex-1 flex-col overflow-y-auto pb-8 sm:hidden">
              <div className="flex items-center gap-3 border-b border-border/40 bg-muted/20 px-4 py-4">
                <Avatar className="size-11 shrink-0 rounded-2xl">
                  <AvatarImage src={avatarPreview || undefined} className="rounded-2xl" />
                  <AvatarFallback className="rounded-2xl bg-primary/12 font-bold text-primary">{displayName?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">{displayName || user.username}</p>
                  <p className="truncate text-[11px] text-muted-foreground">@{user.username}</p>
                </div>
                <Button variant="ghost" size="icon" className="size-8 rounded-xl" onClick={() => onOpenChange(false)}><XIcon size={16} /></Button>
              </div>
              <nav className="flex flex-col gap-0.5 p-3">
                {NAV_TABS.map((tab) => (
                  <button key={tab.id} type="button" onClick={() => { setActiveTab(tab.id); setMobileShowMenu(false); }}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-muted/50 active:bg-muted/50">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/50"><tab.icon size={17} className={tab.color} /></span>
                    <span className="flex-1 text-left text-[13px] font-medium text-foreground">{tab.label}</span>
                    <ChevronRightIcon size={15} className="text-muted-foreground/40" />
                  </button>
                ))}
              </nav>
              <div className="mt-auto px-3 pb-2">
                <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-rose-400/10">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-400/10"><LogOutIcon size={17} className="text-rose-400" /></span>
                  <span className="flex-1 text-left text-[13px] font-medium text-rose-400">{t.settings.logout}</span>
                </button>
              </div>
            </div>
          )}

          {/* Mobile: back header */}
          {!mobileShowMenu && (
            <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/40 px-3 sm:hidden">
              <Button variant="ghost" size="icon" className="size-8 rounded-xl" onClick={() => setMobileShowMenu(true)}><ArrowLeftIcon size={16} /></Button>
              <h2 className="text-[13px] font-semibold text-foreground">{NAV_TABS.find((t) => t.id === activeTab)?.label}</h2>
              <Button variant="ghost" size="icon" className="ml-auto size-8 rounded-xl" onClick={() => onOpenChange(false)}><XIcon size={15} /></Button>
            </div>
          )}

          {/* Desktop header */}
          <div className="hidden h-12 shrink-0 items-center justify-between border-b border-border/40 px-5 sm:flex">
            <h2 className="text-[13px] font-semibold text-foreground">{NAV_TABS.find((t) => t.id === activeTab)?.label}</h2>
            <Button variant="ghost" size="icon" className="size-8 rounded-xl" onClick={() => onOpenChange(false)}><XIcon size={15} /></Button>
          </div>

          {/* Content area */}
          <div className={cn('flex-1 overflow-y-auto p-4 sm:p-6', mobileShowMenu && 'hidden sm:block')}>
            {renderContent()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}