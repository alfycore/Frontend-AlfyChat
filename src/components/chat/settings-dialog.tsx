'use client';

import { useEffect, useState, useRef } from 'react';
import {
  UserIcon, PaletteIcon, BellIcon, ShieldIcon, LogOutIcon,
  CameraIcon, ImageIcon, SaveIcon, MicIcon, Volume2Icon,
  SunIcon, MoonIcon, MonitorIcon, RotateCcwIcon,
  GlobeIcon, SearchIcon, HelpCircleIcon, LockIcon,
  Trash2Icon, KeyRoundIcon, ZapIcon, CalendarIcon, ClockIcon,
  AlertTriangleIcon, ChevronRightIcon, ArrowLeftIcon,
  XIcon, LayoutIcon, CheckIcon, Loader2Icon, PencilIcon, UploadIcon,
} from '@/components/icons';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTranslation } from '@/components/locale-provider';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useBackground } from '@/hooks/use-background';
import { socketService } from '@/lib/socket';
import { api, resolveMediaUrl } from '@/lib/api';
import { deriveKey, decryptPrivateKey, encryptPrivateKey, generateSalt } from '@/lib/e2ee';
import { toast } from 'sonner';
import {
  getAudioPreferences,
  setAudioPreferences,
  type AudioPreferences,
} from '@/hooks/use-call';
import { useLayoutPrefs } from '@/hooks/use-layout-prefs';
import { cn } from '@/lib/utils';
import { sanitizeSvg } from '@/lib/sanitize';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from 'radix-ui';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

/* -- Constants -------------------------------------------------------------- */

const CARD_COLOR_PRESETS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#64748b',
  '#0ea5e9', '#14b8a6', '#a855f7', '#f43f5e', '#84cc16',
];

const TIMEZONES = [
  { id: 'europe-paris', label: 'Europe/Paris (UTC+1)' },
  { id: 'europe-london', label: 'Europe/London (UTC+0)' },
  { id: 'europe-berlin', label: 'Europe/Berlin (UTC+1)' },
  { id: 'america-new-york', label: 'America/New_York (UTC-5)' },
  { id: 'america-la', label: 'America/Los_Angeles (UTC-8)' },
  { id: 'america-chicago', label: 'America/Chicago (UTC-6)' },
  { id: 'asia-tokyo', label: 'Asia/Tokyo (UTC+9)' },
  { id: 'asia-shanghai', label: 'Asia/Shanghai (UTC+8)' },
  { id: 'australia-sydney', label: 'Australia/Sydney (UTC+11)' },
  { id: 'pacific-auckland', label: 'Pacific/Auckland (UTC+13)' },
];

const FONTS = [
  { id: 'geist', label: 'Geist (défaut)' },
  { id: 'inter', label: 'Inter' },
  { id: 'system', label: 'Système' },
  { id: 'mono', label: 'Monospace' },
];

const DEFAULT_INTERESTS = ['Gaming', 'Musique', 'Tech', 'Cinéma'];

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
  if      (ua.includes('Edg/')   || ua.includes('EdgA/'))               browser = 'Edge';
  else if (ua.includes('OPR/')   || ua.includes('Opera'))               browser = 'Opera';
  else if (ua.includes('YaBrowser/'))                                    browser = 'Yandex';
  else if (ua.includes('Brave/') || ua.includes('Brave'))               browser = 'Brave';
  else if (ua.includes('Vivaldi/'))                                      browser = 'Vivaldi';
  else if (ua.includes('SamsungBrowser/'))                               browser = 'Samsung Internet';
  else if (ua.includes('Chrome/') && !ua.includes('Chromium'))          browser = 'Chrome';
  else if (ua.includes('Chromium/'))                                     browser = 'Chromium';
  else if (ua.includes('Firefox/') || ua.includes('FxiOS/'))            browser = 'Firefox';
  else if (ua.includes('Safari/')  && !ua.includes('Chrome'))           browser = 'Safari';
  else if (ua.includes('MSIE')     || ua.includes('Trident/'))          browser = 'Internet Explorer';
  let os   = 'OS inconnu';
  let icon = '🖥️';
  if (ua.includes('iPhone')) {
    const match = ua.match(/CPU(?: iPhone)? OS (\d+)[_.](\d+)/);
    os = match ? `iOS ${match[1]}.${match[2]}` : 'iOS'; icon = '📱';
  } else if (ua.includes('iPad')) {
    const match = ua.match(/CPU OS (\d+)[_.](\d+)/);
    os = match ? `iPadOS ${match[1]}.${match[2]}` : 'iPadOS'; icon = '📱';
  } else if (ua.includes('Android')) {
    const match = ua.match(/Android (\d+(?:\.\d+)?)/);
    os = match ? `Android ${match[1]}` : 'Android'; icon = '📱';
  } else if (ua.includes('Windows NT 10.0')) {
    os = 'Windows 10/11'; icon = '🖥️';
  } else if (ua.includes('Windows NT 6.3')) { os = 'Windows 8.1'; icon = '🖥️';
  } else if (ua.includes('Windows NT 6.2')) { os = 'Windows 8'; icon = '🖥️';
  } else if (ua.includes('Windows NT 6.1')) { os = 'Windows 7'; icon = '🖥️';
  } else if (ua.includes('Windows')) { os = 'Windows'; icon = '🖥️';
  } else if (ua.includes('CrOS')) { os = 'ChromeOS'; icon = '💻';
  } else if (ua.includes('Mac OS X')) {
    const match = ua.match(/Mac OS X (\d+)[_.](\d+)/);
    if (match) {
      const major = parseInt(match[1]);
      const minor = parseInt(match[2]);
      if (major >= 11 || (major === 10 && minor >= 16)) { os = `macOS ${major}`; }
      else { const names: Record<number, string> = { 15: 'Sequoia', 14: 'Sonoma', 13: 'Ventura', 12: 'Monterey', 11: 'Big Sur', 10: 'Catalina', 9: 'Mojave', 8: 'High Sierra' }; os = `macOS${names[minor] ? ` ${names[minor]}` : ` 10.${minor}`}`; }
    } else { os = 'macOS'; }
    icon = '🍎';
  } else if (ua.includes('Linux')) {
    if (ua.includes('Ubuntu')) { os = 'Ubuntu'; icon = '🐧'; }
    else if (ua.includes('Fedora')) { os = 'Fedora'; icon = '🐧'; }
    else if (ua.includes('Debian')) { os = 'Debian'; icon = '🐧'; }
    else { os = 'Linux'; icon = '🐧'; }
  }
  return { browser, os, icon };
}

type SettingsTab = 'profile' | 'voice' | 'notifications' | 'privacy' | 'appearance' | 'language' | 'layout';

/* -- Component -------------------------------------------------------------- */

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const router = useRouter();
  const { user, updateUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const NAV_TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: t.settings.profile, icon: UserIcon },
    { id: 'voice', label: t.settings.voice, icon: MicIcon },
    { id: 'notifications', label: t.settings.notifications, icon: BellIcon },
    { id: 'privacy', label: t.settings.privacy, icon: ShieldIcon },
    { id: 'appearance', label: t.settings.appearance, icon: PaletteIcon },
    { id: 'language', label: t.settings.language, icon: GlobeIcon },
    { id: 'layout', label: 'Mise en page', icon: LayoutIcon },
  ];

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  /* -- Profile state -- */
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

  /* -- Username change state -- */
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernamePassword, setUsernamePassword] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameChanging, setUsernameChanging] = useState(false);
  const usernameCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* -- Voice state -- */
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioPrefs, setAudioPrefsState] = useState<AudioPreferences>(getAudioPreferences());
  const [micTestActive, setMicTestActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [voiceTab, setVoiceTab] = useState('mic');
  const [micMode, setMicMode] = useState('vad');
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const micTestRef = useRef<{ stream: MediaStream; analyser: AnalyserNode; ctx: AudioContext; raf: number } | null>(null);

  /* -- Notifications state -- */
  const [notifSound, setNotifSound] = useState(true);
  const [notifDesktop, setNotifDesktop] = useState(true);
  const [notifDm, setNotifDm] = useState(true);
  const [notifMentions, setNotifMentions] = useState(true);
  const [dndEnabled, setDndEnabled] = useState(false);
  const [notifKeywords, setNotifKeywords] = useState<string[]>(['urgent', 'alerte']);
  const [newKeyword, setNewKeyword] = useState('');

  /* -- Privacy state -- */
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [dmMode, setDmMode] = useState('everyone');
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  /* -- Change password -- */
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  /* -- 2FA -- */
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState<'idle' | 'setup' | 'backup'>('idle');
  const [twoFAQR, setTwoFAQR] = useState('');
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFABackupCodes, setTwoFABackupCodes] = useState<string[]>([]);
  const [twoFADisableCode, setTwoFADisableCode] = useState('');
  const [twoFADisabling, setTwoFADisabling] = useState(false);

  /* -- Appearance -- */
  const [fontFamily, setFontFamily] = useState('geist');

  /* -- Layout & wallpaper -- */
  const { prefs: layoutPrefs, updatePrefs: updateLayoutPrefs } = useLayoutPrefs();
  const { wallpaper, setWallpaper } = useBackground();
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  /* -- Language -- */
  const [langSearch, setLangSearch] = useState('');

  /* -- Mobile nav -- */
  const [mobileShowMenu, setMobileShowMenu] = useState(true);
  useEffect(() => { if (open) setMobileShowMenu(true); }, [open]);

  /* -- Effects -- */
  useEffect(() => {
    if (open && activeTab === 'privacy') {
      api.get2FAStatus().then((res) => {
        if (res.success && res.data) setTwoFAEnabled((res.data as any).enabled === true);
      });
      setSessionsLoading(true);
      api.getSessions().then((res) => {
        if (res.success && res.data) setSessions((res.data as any).sessions ?? []);
      }).finally(() => setSessionsLoading(false));
    }
  }, [open, activeTab]);

  useEffect(() => {
    if (open && activeTab === 'voice') {
      setAudioPrefsState(getAudioPreferences());
      setIsLoadingDevices(true);
      const loadDevices = async () => {
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
      loadDevices();
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
    api.getPreferences(user.id).then((result) => {
      if (result.success && result.data) {
        const prefs = result.data as any;
        if (prefs.notificationsSound !== undefined) setNotifSound(prefs.notificationsSound);
        if (prefs.notificationsDesktop !== undefined) setNotifDesktop(prefs.notificationsDesktop);
        if (prefs.notificationsDm !== undefined) setNotifDm(prefs.notificationsDm);
        if (prefs.notificationsMentions !== undefined) setNotifMentions(prefs.notificationsMentions);
        if (prefs.privacyShowOnline !== undefined) setShowOnlineStatus(prefs.privacyShowOnline);
        if (prefs.privacyAllowDm !== undefined) setDmMode(prefs.privacyAllowDm ? 'everyone' : 'friends');
        if (prefs.birthday) setBirthday(prefs.birthday);
        if (prefs.timezone) setTimezone(prefs.timezone);
        if (Array.isArray(prefs.interests)) setInterests(prefs.interests);
        if (prefs.micMode) setMicMode(prefs.micMode);
        if (prefs.fontFamily) {
          setFontFamily(prefs.fontFamily);
          const fontMap: Record<string, string> = {
            inter: 'var(--font-inter), sans-serif',
            system: 'system-ui, sans-serif',
            mono: 'var(--font-geist-mono), ui-monospace, monospace',
          };
          if (prefs.fontFamily !== 'geist' && fontMap[prefs.fontFamily]) {
            document.documentElement.style.setProperty('--font-sans', fontMap[prefs.fontFamily]);
          } else {
            document.documentElement.style.removeProperty('--font-sans');
          }
        }
        if (prefs.dndEnabled !== undefined) setDndEnabled(prefs.dndEnabled);
        if (Array.isArray(prefs.notifKeywords)) setNotifKeywords(prefs.notifKeywords);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  /* -- Handlers -- */
  const updateAudioPref = (key: keyof AudioPreferences, value: any) => {
    const newPrefs = { ...audioPrefs, [key]: value };
    setAudioPrefsState(newPrefs);
    setAudioPreferences({ [key]: value });
  };

  const startMicTest = async () => {
    try {
      const constraints: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true };
      if (audioPrefs.inputDeviceId !== 'default') constraints.deviceId = { exact: audioPrefs.inputDeviceId };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
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
      toast.error(t.settings.micAccessError);
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setDeleteAvatarFlag(false);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setDeleteBannerFlag(false);
      const reader = new FileReader();
      reader.onloadend = () => setBannerPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteAvatar = () => { setAvatarPreview(null); setAvatarFile(null); setDeleteAvatarFlag(true); };
  const handleDeleteBanner = () => { setBannerPreview(null); setBannerFile(null); setDeleteBannerFlag(true); };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) { toast.error(t.settings.displayNameRequired); return; }
    setIsSaving(true);
    try {
      const data: Record<string, any> = { displayName: displayName.trim(), bio: bio.trim(), cardColor, showBadges, hiddenBadgeIds };
      if (deleteAvatarFlag) {
        if (user?.avatarUrl) await api.deleteImage(user.avatarUrl).catch(() => {});
        data.avatarUrl = null;
      } else if (avatarFile) {
        const result = await api.uploadImage(avatarFile, 'avatar');
        if (result.success && result.data) data.avatarUrl = result.data.url;
      }
      if (deleteBannerFlag) {
        if ((user as any)?.bannerUrl) await api.deleteImage((user as any).bannerUrl).catch(() => {});
        data.bannerUrl = null;
      } else if (bannerFile) {
        const result = await api.uploadImage(bannerFile, 'banner');
        if (result.success && result.data) data.bannerUrl = result.data.url;
      }
      socketService.updateProfile(data);
      updateUser(data);
      if (user) {
        api.updatePreferences(user.id, { birthday: birthday || undefined, timezone: timezone || undefined, interests }).catch(() => {});
      }
      setAvatarFile(null); setBannerFile(null); setDeleteAvatarFlag(false); setDeleteBannerFlag(false);
      toast.success(t.settings.profileSavedToast);
    } catch {
      toast.error(t.settings.profileSaveErrorToast);
    }
    setIsSaving(false);
  };

  const handleLogout = async () => {
    await logout();
    onOpenChange(false);
    router.push('/login');
  };

  const saveNotificationPrefs = async () => {
    if (!user) return;
    try {
      await api.updatePreferences(user.id, {
        notificationsSound: notifSound, notificationsDesktop: notifDesktop,
        notificationsDm: notifDm, notificationsMentions: notifMentions, dndEnabled,
      });
    } catch { /* silent */ }
    socketService.updatePresence(dndEnabled ? 'dnd' : 'online');
  };

  const savePrivacyPrefs = async (showOnline: boolean, dm: string) => {
    if (!user) return;
    try {
      await api.updatePreferences(user.id, { privacyShowOnline: showOnline, privacyAllowDm: dm !== 'none' });
    } catch { /* silent */ }
  };

  const applyFont = (fontId: string) => {
    setFontFamily(fontId);
    if (user) api.updatePreferences(user.id, { fontFamily: fontId }).catch(() => {});
    const fontMap: Record<string, string> = {
      inter: 'var(--font-inter), sans-serif',
      system: 'system-ui, sans-serif',
      mono: 'var(--font-geist-mono), ui-monospace, monospace',
    };
    if (fontId === 'geist' || !fontMap[fontId]) {
      document.documentElement.style.removeProperty('--font-sans');
    } else {
      document.documentElement.style.setProperty('--font-sans', fontMap[fontId]);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (!currentPassword.trim() || !newPassword.trim()) { toast.error('Veuillez remplir tous les champs'); return; }
    if (newPassword !== confirmPassword) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (newPassword.length < 8) { toast.error('Le nouveau mot de passe doit faire au moins 8 caractères'); return; }
    setIsChangingPassword(true);
    try {
      // Re-encrypt E2EE private key with the new password
      let e2eeFields: { encryptedPrivateKey?: string; keySalt?: string } = {};
      try {
        const keysRes = await api.getMyE2EEKeys();
        const keySalt = keysRes.data?.keySalt;
        const encPrivKey = keysRes.data?.encryptedPrivateKey;
        if (keySalt && encPrivKey) {
          const oldAesKey = await deriveKey(currentPassword, keySalt);
          const rawPrivateKey = await decryptPrivateKey(encPrivKey, oldAesKey);
          const newSalt = generateSalt();
          const newAesKey = await deriveKey(newPassword, newSalt);
          const newEncPrivKey = await encryptPrivateKey(rawPrivateKey, newAesKey);
          e2eeFields = { encryptedPrivateKey: newEncPrivKey, keySalt: newSalt };
        }
      } catch (e2eeErr) {
        console.error('[E2EE] Impossible de ré-encrypter la clé privée:', e2eeErr);
        toast.error('Impossible de ré-encrypter la clé de chiffrement. Vérifiez votre mot de passe actuel.');
        setIsChangingPassword(false);
        return;
      }

      const result = await api.changePassword(user.id, { currentPassword, newPassword, ...e2eeFields });
      if (result.success) {
        toast.success('Mot de passe modifié avec succès');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      } else {
        toast.error((result as any).error || 'Mot de passe actuel incorrect');
      }
    } catch { toast.error('Erreur lors du changement de mot de passe'); }
    setIsChangingPassword(false);
  };

  const handleUsernameInput = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setNewUsername(sanitized);
    setUsernameAvailable(null);
    if (usernameCheckTimeout.current) clearTimeout(usernameCheckTimeout.current);
    if (sanitized.length >= 3 && sanitized !== user?.username) {
      setUsernameChecking(true);
      usernameCheckTimeout.current = setTimeout(async () => {
        try {
          const res = await api.checkUsernameAvailable(sanitized);
          setUsernameAvailable((res as any).data?.available ?? (res as any).available ?? false);
        } catch { setUsernameAvailable(null); }
        setUsernameChecking(false);
      }, 400);
    } else {
      setUsernameChecking(false);
    }
  };

  const handleChangeUsername = async () => {
    if (!user || !newUsername.trim() || !usernamePassword.trim()) { toast.error('Veuillez remplir tous les champs'); return; }
    if (newUsername.length < 3) { toast.error('Le nom d\'utilisateur doit faire au moins 3 caractères'); return; }
    if (!usernameAvailable) { toast.error('Ce nom d\'utilisateur n\'est pas disponible'); return; }
    setUsernameChanging(true);
    try {
      const result = await api.changeUsername(user.id, { newUsername, password: usernamePassword });
      if (result.success) {
        toast.success('Nom d\'utilisateur modifié avec succès');
        updateUser({ username: newUsername } as any);
        setEditingUsername(false);
        setNewUsername('');
        setUsernamePassword('');
        setUsernameAvailable(null);
      } else {
        toast.error((result as any).error || 'Erreur lors du changement');
      }
    } catch { toast.error('Erreur lors du changement de nom d\'utilisateur'); }
    setUsernameChanging(false);
  };

  const handleRevokeAllSessions = async () => {
    setIsRevokingAll(true);
    try {
      await api.logoutAll();
      toast.success(t.settings.revokeAllSuccess);
      await handleLogout();
    } catch {
      toast.error(t.settings.revokeAllError);
      setIsRevokingAll(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) { toast.error(t.settings.deleteMissingPassword); return; }
    setIsDeletingAccount(true);
    const result = await api.requestAccountDeletion(deletePassword);
    if (result.success) {
      toast.success(t.settings.deleteSuccess);
      setDeletePassword('');
      await handleLogout();
    } else {
      toast.error((result as any).error ?? t.settings.profileSaveError);
      setIsDeletingAccount(false);
    }
  };

  if (!user) return null;

  /* ================================================================== */
  /*  RENDER                                                            */
  /* ================================================================== */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="flex h-[85vh] max-w-5xl sm:max-w-5xl gap-0 overflow-hidden rounded-xl border-border/50 bg-card p-0 shadow-2xl">
          <VisuallyHidden.Root><DialogTitle>{t.settings.sectionHeader}</DialogTitle></VisuallyHidden.Root>

          {/* ─── Sidebar (desktop) ─── */}
          <aside className="hidden w-56 shrink-0 flex-col border-r border-border/40 bg-muted/30 sm:flex">
            <div className="px-4 pt-5 pb-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t.settings.sectionHeader}
              </p>
              <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                {user.displayName || user.username}
              </p>
            </div>

            <ScrollArea className="flex-1 px-2 py-1">
              <nav className="flex flex-col gap-0.5">
                {NAV_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors',
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </ScrollArea>

            <Separator />
            <div className="p-2">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
              >
                <LogOutIcon size={14} />
                {t.settings.logout}
              </button>
            </div>
          </aside>

          {/* ─── Main content column ─── */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

            {/* Mobile menu */}
            {mobileShowMenu && (
              <div className="flex flex-1 flex-col overflow-y-auto pb-8 sm:hidden">
                <div className="flex items-center gap-3 border-b border-border/40 bg-muted/30 px-4 py-4">
                  <Avatar className="size-12 shrink-0">
                    <AvatarImage src={avatarPreview || undefined} alt={displayName} />
                    <AvatarFallback>{displayName?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{displayName || user.username}</p>
                    <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="ml-auto size-8" onClick={() => onOpenChange(false)}>
                    <XIcon size={18} />
                  </Button>
                </div>
                <nav className="flex flex-col gap-0.5 p-3">
                  {NAV_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => { setActiveTab(tab.id); setMobileShowMenu(false); }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-colors active:bg-muted/50 hover:bg-muted/50"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <tab.icon size={18} className="text-primary" />
                      </span>
                      <span className="flex-1 text-left text-sm font-medium text-foreground">{tab.label}</span>
                      <ChevronRightIcon size={16} className="text-muted-foreground/40" />
                    </button>
                  ))}
                </nav>
                <div className="mt-auto px-3 pb-2">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-red-500/10"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                      <LogOutIcon size={18} className="text-red-500" />
                    </span>
                    <span className="flex-1 text-left text-sm font-medium text-red-500">{t.settings.logout}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Mobile header with back button */}
            {!mobileShowMenu && (
              <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/40 px-3 sm:hidden">
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setMobileShowMenu(true)}>
                  <ArrowLeftIcon size={18} />
                </Button>
                <h2 className="text-sm font-semibold text-foreground">
                  {NAV_TABS.find((tab) => tab.id === activeTab)?.label}
                </h2>
                <Button variant="ghost" size="icon" className="ml-auto size-8" onClick={() => onOpenChange(false)}>
                  <XIcon size={16} />
                </Button>
              </div>
            )}

            {/* Desktop close button */}
            <div className="hidden sm:flex h-12 shrink-0 items-center justify-between border-b border-border/40 px-4">
              <h2 className="text-sm font-semibold text-foreground">
                {NAV_TABS.find((tab) => tab.id === activeTab)?.label}
              </h2>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => onOpenChange(false)}>
                <XIcon size={16} />
              </Button>
            </div>

            {/* ─── Content ─── */}
            <div className={cn('flex-1 overflow-y-auto p-4 sm:p-6', mobileShowMenu && 'hidden sm:block')}>

                {/* ═══════════ PROFILE ═══════════ */}
                {activeTab === 'profile' && (
                  <div className="mx-auto max-w-2xl space-y-5">

                    {/* Banner + Avatar */}
                    <Card>
                      <div
                        className="relative h-28 cursor-pointer overflow-hidden rounded-t-xl sm:h-36"
                        style={{ backgroundColor: cardColor }}
                        onClick={() => bannerInputRef.current?.click()}
                      >
                        {bannerPreview ? (
                          <img src={bannerPreview} alt="Banner" className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center gap-2 text-sm text-white/60">
                            <ImageIcon size={20} />
                            <span className="hidden sm:inline">{t.settings.addBanner}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                          <CameraIcon size={32} className="text-white" />
                        </div>
                      </div>
                      <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />

                      <CardContent className="relative px-4 pb-5 sm:px-6">
                        <div className="-mt-8 mb-4 flex items-end justify-between sm:-mt-10">
                          <div className="relative cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                            <Avatar className="size-16 ring-[3px] ring-card sm:size-20">
                              <AvatarImage src={avatarPreview || undefined} alt="Avatar" />
                              <AvatarFallback className="text-lg font-bold">{displayName?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                            </Avatar>
                            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                              <CameraIcon size={20} className="text-white" />
                            </div>
                          </div>
                          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{(user as any).role || 'Membre'}</Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8">
                                  <CameraIcon size={14} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => avatarInputRef.current?.click()}>
                                  {t.settings.changeAvatar}
                                </DropdownMenuItem>
                                {avatarPreview && (
                                  <DropdownMenuItem onSelect={handleDeleteAvatar} className="text-red-500">
                                    Supprimer l&apos;avatar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onSelect={() => bannerInputRef.current?.click()}>
                                  {t.settings.changeBanner}
                                </DropdownMenuItem>
                                {bannerPreview && (
                                  <DropdownMenuItem onSelect={handleDeleteBanner} className="text-red-500">
                                    Supprimer la bannière
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} className="space-y-4">
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="space-y-2">
                              <Label>{t.settings.displayName}</Label>
                              <Input
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                maxLength={32}
                                placeholder={t.settings.displayNamePlaceholder}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t.settings.username}</Label>
                              {!editingUsername ? (
                                <div className="flex gap-2">
                                  <Input value={user.username} readOnly disabled className="flex-1" />
                                  <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => { setEditingUsername(true); setNewUsername(user.username); }}>
                                    <PencilIcon size={14} />
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-2 rounded-lg border p-3">
                                  <div className="relative">
                                    <Input
                                      value={newUsername}
                                      onChange={(e) => handleUsernameInput(e.target.value)}
                                      maxLength={32}
                                      placeholder="nouveau_pseudo"
                                      className="pr-8"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                      {usernameChecking ? (
                                        <Loader2Icon size={14} className="animate-spin text-muted-foreground" />
                                      ) : usernameAvailable === true ? (
                                        <CheckIcon size={14} className="text-green-500" />
                                      ) : usernameAvailable === false ? (
                                        <XIcon size={14} className="text-red-500" />
                                      ) : null}
                                    </span>
                                  </div>
                                  {usernameAvailable === false && (
                                    <p className="text-xs text-red-500">Ce pseudo est déjà pris</p>
                                  )}
                                  {usernameAvailable === true && (
                                    <p className="text-xs text-green-500">Pseudo disponible !</p>
                                  )}
                                  <Input
                                    type="password"
                                    value={usernamePassword}
                                    onChange={(e) => setUsernamePassword(e.target.value)}
                                    placeholder="Mot de passe actuel"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      type="button" size="sm"
                                      disabled={!usernameAvailable || !usernamePassword.trim() || usernameChanging}
                                      onClick={handleChangeUsername}
                                    >
                                      {usernameChanging ? 'Changement...' : 'Confirmer'}
                                    </Button>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingUsername(false); setNewUsername(''); setUsernamePassword(''); setUsernameAvailable(null); }}>
                                      Annuler
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="space-y-2 lg:col-span-2">
                              <Label>{t.settings.bio}</Label>
                              <Textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder={t.settings.bioPlaceholder}
                                rows={3}
                                maxLength={200}
                              />
                              <p className="text-right text-xs text-muted-foreground">{bio.length}/200</p>
                            </div>
                            <div className="space-y-2">
                              <Label>{t.settings.birthday}</Label>
                              <Input
                                type="date"
                                value={birthday}
                                onChange={(e) => setBirthday(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t.settings.timezone}</Label>
                              <Select value={timezone} onValueChange={setTimezone}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TIMEZONES.map((tz) => (
                                    <SelectItem key={tz.id} value={tz.id}>{tz.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <Button type="submit" disabled={isSaving} className="gap-2">
                              <SaveIcon size={14} />
                              {isSaving ? t.common.saving : t.common.save}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => {
                              setDisplayName(user.displayName || user.username || '');
                              setBio((user as any).bio || '');
                            }}>
                              {t.settings.reset}
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>

                    {/* Interests */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Centres d&apos;intérêt</CardTitle>
                        <CardDescription>Tags visibles sur votre profil</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {interests.map((interest) => (
                            <Badge key={interest} variant="secondary" className="gap-1.5">
                              {interest}
                              <button
                                type="button"
                                className="ml-0.5 rounded-full hover:text-foreground"
                                onClick={() => {
                                  const updated = interests.filter((i) => i !== interest);
                                  setInterests(updated);
                                  api.updatePreferences(user.id, { interests: updated }).catch(() => {});
                                }}
                              >
                                <XIcon size={12} />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Ajouter un intérêt..."
                            value={newInterest}
                            onChange={(e) => setNewInterest(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newInterest.trim()) {
                                e.preventDefault();
                                const updated = [...interests, newInterest.trim()];
                                setInterests(updated);
                                api.updatePreferences(user.id, { interests: updated }).catch(() => {});
                                setNewInterest('');
                              }
                            }}
                            className="flex-1"
                          />
                          <Button
                            variant="secondary"
                            disabled={!newInterest.trim()}
                            onClick={() => {
                              if (newInterest.trim()) {
                                const updated = [...interests, newInterest.trim()];
                                setInterests(updated);
                                api.updatePreferences(user.id, { interests: updated }).catch(() => {});
                                setNewInterest('');
                              }
                            }}
                          >
                            Ajouter
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Profile color + preview */}
                    <div className="grid gap-4 lg:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle>{t.settings.profileColor}</CardTitle>
                          <CardDescription>{t.settings.profileColorDesc}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {bannerPreview && (
                            <p className="rounded-lg border border-border/30 bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                              La couleur s&apos;applique quand aucune bannière n&apos;est définie.
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {CARD_COLOR_PRESETS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className={cn(
                                  'size-8 rounded-full border-2 transition-all',
                                  cardColor === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105',
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => setCardColor(color)}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-3">
                            <Label className="text-sm">Hexadécimal</Label>
                            <Input
                              value={cardColor}
                              onChange={(e) => setCardColor(e.target.value)}
                              className="w-28 font-mono"
                              maxLength={7}
                            />
                            <div className="size-8 rounded-full border" style={{ backgroundColor: cardColor }} />
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{t.settings.showBadges}</p>
                              <p className="text-xs text-muted-foreground">{t.settings.showBadgesDesc}</p>
                            </div>
                            <Switch checked={showBadges} onCheckedChange={setShowBadges} />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Preview */}
                      <Card>
                        <CardHeader>
                          <CardTitle>{t.settings.profilePreview}</CardTitle>
                          <CardDescription>{t.settings.profilePreviewDesc}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Card size="sm">
                            <div className="relative h-18 overflow-hidden rounded-t-xl" style={{ backgroundColor: cardColor }}>
                              {bannerPreview && <img src={bannerPreview} alt="" className="size-full object-cover" />}
                              <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
                            </div>
                            <div className="relative px-3">
                              <div className="-mt-7 inline-block rounded-full ring-[3px] ring-card">
                                <Avatar className="size-14" style={{ backgroundColor: cardColor + '25', color: cardColor }}>
                                  <AvatarImage src={avatarPreview || undefined} alt="" />
                                  <AvatarFallback className="text-lg font-bold">{displayName?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                                </Avatar>
                              </div>
                            </div>
                            <div className="space-y-2 px-3 pb-3 pt-1.5">
                              <div>
                                <p className="text-sm font-bold leading-tight">{displayName || 'Nom'}</p>
                                <p className="text-xs text-muted-foreground">@{user.username}</p>
                              </div>
                              {showBadges && userBadges.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {userBadges.filter((b: any) => !hiddenBadgeIds.includes(b.id)).slice(0, 4).map((badge: any) => (
                                    <div key={badge.id} className="flex size-7 items-center justify-center rounded-lg" style={{ backgroundColor: badge.color + '18', border: `1.5px solid ${badge.color}35` }} title={badge.name}>
                                      {badge.iconType === 'svg' ? (
                                        <span dangerouslySetInnerHTML={{ __html: sanitizeSvg(badge.iconValue || badge.icon) }} className="flex size-4 items-center justify-center [&>svg]:size-full" />
                                      ) : badge.iconType === 'flaticon' ? (
                                        <i className={`${badge.iconValue || badge.icon}`} style={{ color: badge.color, fontSize: '14px', lineHeight: 1 }} />
                                      ) : (
                                        <i className={`fi fi-br-${badge.iconValue || badge.icon}`} style={{ color: badge.color, fontSize: '14px', lineHeight: 1 }} />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {bio && (
                                <>
                                  <Separator />
                                  <p className="text-xs leading-relaxed text-muted-foreground">{bio}</p>
                                </>
                              )}
                            </div>
                          </Card>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Badges */}
                    {userBadges.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>{t.settings.myBadges}</CardTitle>
                          <CardDescription>{t.settings.badgesDesc}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {userBadges.map((badge: any) => {
                              const isHidden = hiddenBadgeIds.includes(badge.id);
                              return (
                                <div key={badge.id} className={cn('flex items-center gap-2.5 rounded-xl border p-3 transition-opacity', isHidden && 'opacity-40')} style={{ backgroundColor: badge.color + '08', borderColor: badge.color + '30' }}>
                                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: badge.color + '20', border: `2px solid ${badge.color}40` }}>
                                    {badge.iconType === 'svg' ? (
                                      <span dangerouslySetInnerHTML={{ __html: sanitizeSvg(badge.iconValue || badge.icon) }} className="flex size-5 items-center justify-center [&>svg]:size-full" />
                                    ) : badge.iconType === 'flaticon' ? (
                                      <i className={`${badge.iconValue || badge.icon}`} style={{ color: badge.color, fontSize: '20px', lineHeight: 1 }} />
                                    ) : (
                                      <i className={`fi fi-br-${badge.iconValue || badge.icon}`} style={{ color: badge.color, fontSize: '20px', lineHeight: 1 }} />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold">{badge.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(badge.earnedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                  </div>
                                  <Switch
                                    checked={!isHidden}
                                    onCheckedChange={(checked) => {
                                      setHiddenBadgeIds((prev) =>
                                        checked ? prev.filter((id) => id !== badge.id) : [...prev, badge.id]
                                      );
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* ═══════════ VOICE ═══════════ */}
                {activeTab === 'voice' && (
                  <div className="mx-auto max-w-2xl space-y-5">
                    <Tabs value={voiceTab} onValueChange={setVoiceTab}>
                      <TabsList>
                        <TabsTrigger value="mic" className="gap-1.5">
                          <MicIcon size={14} />
                          {t.settings.microphone}
                        </TabsTrigger>
                        <TabsTrigger value="speaker" className="gap-1.5">
                          <Volume2Icon size={14} />
                          {t.settings.audioOutput}
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="mic" className="mt-4 space-y-5">
                        <Card>
                          <CardContent className="pt-6 space-y-5">
                            {isLoadingDevices ? (
                              <div className="space-y-3">
                                <Skeleton className="h-10 rounded-lg" />
                                <Skeleton className="h-10 rounded-lg" />
                              </div>
                            ) : (
                              <>
                                <div className="space-y-2">
                                  <Label>{t.settings.inputDevice}</Label>
                                  <Select value={audioPrefs.inputDeviceId} onValueChange={(v) => updateAudioPref('inputDeviceId', v)}>
                                    <SelectTrigger>
                                      <SelectValue placeholder={t.settings.systemDefault} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="default">{t.settings.systemDefault}</SelectItem>
                                      {audioDevices.map((d) => (
                                        <SelectItem key={d.deviceId} value={d.deviceId}>
                                          {d.label || `Micro ${d.deviceId.slice(0, 8)}`}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label>{t.settings.inputVolume}</Label>
                                    <span className="text-sm text-muted-foreground">{audioPrefs.inputVolume}%</span>
                                  </div>
                                  <Slider
                                    value={[audioPrefs.inputVolume]}
                                    onValueChange={([v]) => updateAudioPref('inputVolume', v)}
                                    min={0}
                                    max={200}
                                  />
                                </div>
                              </>
                            )}

                            {/* Mic test */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{t.settings.micTest}</span>
                                <Button
                                  variant={micTestActive ? 'destructive' : 'secondary'}
                                  size="sm"
                                  onClick={micTestActive ? stopMicTest : startMicTest}
                                >
                                  {micTestActive ? t.settings.stopTest : t.settings.testMic}
                                </Button>
                              </div>
                              {micTestActive && <Progress value={micLevel} />}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Mic mode */}
                        <Card>
                          <CardHeader>
                            <CardTitle>{t.settings.micMode}</CardTitle>
                            <CardDescription>{t.settings.micModeDesc}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <RadioGroup value={micMode} onValueChange={(v) => { setMicMode(v); api.updatePreferences(user.id, { micMode: v }).catch(() => {}); }}>
                              {([
                                { value: 'vad', label: t.settings.micModeVAD, desc: t.settings.micModeVADDesc },
                                { value: 'ptt', label: t.settings.micModePTT, desc: t.settings.micModePTTDesc },
                                { value: 'always', label: t.settings.micModeAlways, desc: t.settings.micModeAlwaysDesc },
                              ] as const).map(({ value, label, desc }) => (
                                <label
                                  key={value}
                                  className={cn(
                                    'flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all',
                                    micMode === value
                                      ? 'border-primary/50 bg-primary/5'
                                      : 'border-border/40 hover:border-border hover:bg-muted/30',
                                  )}
                                >
                                  <RadioGroupItem value={value} className="mt-0.5" />
                                  <div>
                                    <p className="text-[13px] font-medium">{label}</p>
                                    <p className="text-[11px] text-muted-foreground">{desc}</p>
                                  </div>
                                </label>
                              ))}
                            </RadioGroup>
                          </CardContent>
                        </Card>

                        {/* Advanced audio */}
                        <Collapsible>
                          <CollapsibleTrigger asChild>
                            <Button variant="outline" className="w-full justify-between gap-2">
                              <span className="flex items-center gap-2 text-sm">
                                <ZapIcon size={14} />
                                {t.settings.audioProcessing}
                              </span>
                              <ChevronRightIcon size={16} className="transition-transform data-[state=open]:rotate-90" />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-2 flex flex-col gap-4 rounded-xl border border-border/40 p-4">
                              {[
                                { key: 'noiseSuppression' as const, label: t.settings.noiseSuppression, desc: t.settings.noiseSuppressionDesc },
                                { key: 'echoCancellation' as const, label: t.settings.echoCancellation, desc: t.settings.echoCancellationDesc },
                                { key: 'autoGainControl' as const, label: t.settings.autoGain, desc: t.settings.autoGainDesc },
                              ].map((item) => (
                                <div key={item.key} className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium">{item.label}</p>
                                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                                  </div>
                                  <Switch
                                    checked={audioPrefs[item.key]}
                                    onCheckedChange={(v) => updateAudioPref(item.key, v)}
                                  />
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </TabsContent>

                      <TabsContent value="speaker" className="mt-4 space-y-5">
                        <Card>
                          <CardContent className="pt-6 space-y-5">
                            {isLoadingDevices ? (
                              <div className="space-y-3">
                                <Skeleton className="h-10 rounded-lg" />
                                <Skeleton className="h-10 rounded-lg" />
                              </div>
                            ) : (
                              <>
                                <div className="space-y-2">
                                  <Label>{t.settings.outputDevice}</Label>
                                  <Select value={audioPrefs.outputDeviceId} onValueChange={(v) => updateAudioPref('outputDeviceId', v)}>
                                    <SelectTrigger>
                                      <SelectValue placeholder={t.settings.systemDefault} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="default">{t.settings.systemDefault}</SelectItem>
                                      {outputDevices.map((d) => (
                                        <SelectItem key={d.deviceId} value={d.deviceId}>
                                          {d.label || `Sortie ${d.deviceId.slice(0, 8)}`}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label>{t.settings.outputVolume}</Label>
                                    <span className="text-sm text-muted-foreground">{audioPrefs.outputVolume}%</span>
                                  </div>
                                  <Slider
                                    value={[audioPrefs.outputVolume]}
                                    onValueChange={([v]) => updateAudioPref('outputVolume', v)}
                                    min={0}
                                    max={200}
                                  />
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {/* ═══════════ NOTIFICATIONS ═══════════ */}
                {activeTab === 'notifications' && (
                  <div className="mx-auto max-w-2xl space-y-5">

                    {/* DND */}
                    <Card>
                      <CardContent className="flex items-center justify-between gap-4 py-4">
                        <div>
                          <p className="text-sm font-semibold">{t.settings.dndMode}</p>
                          <p className="text-xs text-muted-foreground">{t.settings.dndModeDesc}</p>
                        </div>
                        <Switch checked={dndEnabled} onCheckedChange={(v) => { setDndEnabled(v); setTimeout(saveNotificationPrefs, 0); }} />
                      </CardContent>
                    </Card>

                    {/* Notification categories */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BellIcon size={16} />
                          {t.settings.notifCategories}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {[
                          { id: 'sound', checked: notifSound, set: setNotifSound, label: t.settings.notifSound, desc: t.settings.notifSoundDesc },
                          { id: 'desktop', checked: notifDesktop, set: setNotifDesktop, label: t.settings.desktopNotifs, desc: t.settings.desktopNotifsDesc },
                          { id: 'dm', checked: notifDm, set: setNotifDm, label: t.settings.dms, desc: t.settings.dmsDesc },
                          { id: 'mentions', checked: notifMentions, set: setNotifMentions, label: t.settings.mentions, desc: t.settings.mentionsDesc },
                        ].map((item) => (
                          <div key={item.id} className="flex items-center gap-3">
                            <Checkbox
                              id={`notif-${item.id}`}
                              checked={item.checked}
                              onCheckedChange={(v) => { item.set(v as boolean); setTimeout(saveNotificationPrefs, 0); }}
                            />
                            <div>
                              <Label htmlFor={`notif-${item.id}`} className="text-sm font-medium cursor-pointer">{item.label}</Label>
                              <p className="text-xs text-muted-foreground">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Keywords */}
                    <Card>
                      <CardHeader>
                        <CardTitle>{t.settings.keywords}</CardTitle>
                        <CardDescription>{t.settings.keywordsDesc}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {notifKeywords.map((kw) => (
                            <Badge key={kw} variant="secondary" className="gap-1.5">
                              {kw}
                              <button
                                type="button"
                                className="ml-0.5 rounded-full hover:text-foreground"
                                onClick={() => {
                                  const updated = notifKeywords.filter((k) => k !== kw);
                                  setNotifKeywords(updated);
                                  api.updatePreferences(user.id, { notifKeywords: updated }).catch(() => {});
                                }}
                              >
                                <XIcon size={12} />
                              </button>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder={t.settings.addKeyword}
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newKeyword.trim()) {
                                e.preventDefault();
                                const updated = [...notifKeywords, newKeyword.trim()];
                                setNotifKeywords(updated);
                                api.updatePreferences(user.id, { notifKeywords: updated }).catch(() => {});
                                setNewKeyword('');
                              }
                            }}
                            className="flex-1"
                          />
                          <Button
                            variant="secondary"
                            disabled={!newKeyword.trim()}
                            onClick={() => {
                              if (newKeyword.trim()) {
                                const updated = [...notifKeywords, newKeyword.trim()];
                                setNotifKeywords(updated);
                                api.updatePreferences(user.id, { notifKeywords: updated }).catch(() => {});
                                setNewKeyword('');
                              }
                            }}
                          >
                            {t.settings.add}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* ═══════════ PRIVACY ═══════════ */}
                {activeTab === 'privacy' && (
                  <div className="mx-auto max-w-2xl space-y-5">

                    {/* Visibility */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ShieldIcon size={16} />
                          {t.settings.privacyTitle}
                        </CardTitle>
                        <CardDescription>{t.settings.privacyDesc}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{t.settings.showOnlineStatus}</p>
                            <p className="text-xs text-muted-foreground">{t.settings.showOnlineStatusDesc}</p>
                          </div>
                          <Switch checked={showOnlineStatus} onCheckedChange={(v) => { setShowOnlineStatus(v); savePrivacyPrefs(v, dmMode); }} />
                        </div>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium">{t.settings.allowDMs}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground mb-3">{t.settings.allowDMsDesc}</p>
                          <div className="flex gap-2">
                            {([
                              { value: 'everyone', label: t.settings.dmEveryone },
                              { value: 'friends', label: t.settings.dmFriends },
                              { value: 'none', label: t.settings.dmNone },
                            ] as const).map(({ value, label }) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => { setDmMode(value); savePrivacyPrefs(showOnlineStatus, value); }}
                                className={cn(
                                  'flex-1 rounded-lg border px-3 py-2.5 text-[13px] transition-all',
                                  dmMode === value
                                    ? 'border-primary/50 bg-primary/10 font-semibold text-foreground'
                                    : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground',
                                )}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Change password */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <KeyRoundIcon size={16} />
                          Changer le mot de passe
                        </CardTitle>
                        <CardDescription>Modifiez votre mot de passe de connexion.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <Label>Mot de passe actuel</Label>
                          <Input type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Nouveau mot de passe</Label>
                          <Input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                          <p className="text-xs text-muted-foreground">Minimum 8 caractères</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Confirmer le nouveau mot de passe</Label>
                          <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        </div>
                        <Button
                          size="sm"
                          onClick={handleChangePassword}
                          disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                          className="gap-2"
                        >
                          <KeyRoundIcon size={14} />
                          Modifier le mot de passe
                        </Button>
                      </CardContent>
                    </Card>

                    {/* 2FA */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <LockIcon size={16} />
                          {t.settings.twoFATitle}
                        </CardTitle>
                        <CardDescription>
                          {twoFAEnabled ? t.settings.twoFAEnabledDesc : t.settings.twoFADisabledDesc}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {twoFAStep === 'idle' && (
                          <>
                            {twoFAEnabled ? (
                              <div className="space-y-3">
                                <p className="text-sm text-muted-foreground">{t.settings.twoFADisablePrompt}</p>
                                <InputOTP maxLength={6} value={twoFADisableCode} onChange={setTwoFADisableCode}>
                                  <InputOTPGroup>
                                    <InputOTPSlot index={0} />
                                    <InputOTPSlot index={1} />
                                    <InputOTPSlot index={2} />
                                  </InputOTPGroup>
                                  <InputOTPSeparator />
                                  <InputOTPGroup>
                                    <InputOTPSlot index={3} />
                                    <InputOTPSlot index={4} />
                                    <InputOTPSlot index={5} />
                                  </InputOTPGroup>
                                </InputOTP>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={twoFADisableCode.length < 6 || twoFADisabling}
                                  onClick={async () => {
                                    setTwoFADisabling(true);
                                    const res = await api.disable2FA(twoFADisableCode);
                                    setTwoFADisabling(false);
                                    if (res.success) { setTwoFAEnabled(false); setTwoFADisableCode(''); }
                                    else { setTwoFADisableCode(''); }
                                  }}
                                >
                                  {t.settings.twoFADisableBtn}
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                disabled={twoFALoading}
                                onClick={async () => {
                                  setTwoFALoading(true);
                                  const res = await api.setup2FA();
                                  setTwoFALoading(false);
                                  if (res.success && res.data) {
                                    setTwoFAQR((res.data as any).qrCodeDataUrl);
                                    setTwoFASecret((res.data as any).secret);
                                    setTwoFAStep('setup');
                                  }
                                }}
                              >
                                {t.settings.twoFAConfigureBtn}
                              </Button>
                            )}
                          </>
                        )}
                        {twoFAStep === 'setup' && (
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">{t.settings.twoFAScanPrompt}</p>
                            {twoFAQR && (
                              <div className="flex justify-center">
                                <img src={twoFAQR} alt="QR 2FA" className="size-44 rounded-lg" />
                              </div>
                            )}
                            <div className="rounded-lg bg-muted p-3 font-mono text-xs break-all text-center text-muted-foreground">
                              {twoFASecret}
                            </div>
                            <p className="text-sm text-muted-foreground">{t.settings.twoFAEnterCode}</p>
                            <InputOTP maxLength={6} value={twoFACode} onChange={setTwoFACode}>
                              <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                              </InputOTPGroup>
                              <InputOTPSeparator />
                              <InputOTPGroup>
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                disabled={twoFACode.length < 6 || twoFALoading}
                                onClick={async () => {
                                  setTwoFALoading(true);
                                  const res = await api.enable2FA(twoFACode);
                                  setTwoFALoading(false);
                                  if (res.success && res.data) {
                                    setTwoFABackupCodes((res.data as any).backupCodes ?? []);
                                    setTwoFAEnabled(true); setTwoFACode(''); setTwoFAStep('backup');
                                  } else { setTwoFACode(''); }
                                }}
                              >
                                {t.settings.twoFAActivateBtn}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { setTwoFAStep('idle'); setTwoFACode(''); }}>
                                {t.common.cancel}
                              </Button>
                            </div>
                          </div>
                        )}
                        {twoFAStep === 'backup' && (
                          <div className="space-y-3">
                            <p className="text-sm font-semibold">{t.settings.twoFAEnabledAlert}</p>
                            <p className="text-sm text-muted-foreground">{t.settings.twoFABackupPrompt}</p>
                            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-3">
                              {twoFABackupCodes.map((c) => (
                                <span key={c} className="font-mono text-xs">{c}</span>
                              ))}
                            </div>
                            <Button size="sm" onClick={() => setTwoFAStep('idle')}>{t.common.close}</Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Active sessions */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <KeyRoundIcon size={16} />
                              Sessions actives
                            </CardTitle>
                            <CardDescription>Appareils connectés à votre compte</CardDescription>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="secondary" onClick={handleRevokeAllSessions} disabled={isRevokingAll} className="gap-1.5">
                                  <AlertTriangleIcon size={14} />
                                  {t.settings.revokeAll}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">{t.settings.revokeAllTooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {sessionsLoading ? (
                          <div className="space-y-2">
                            <Skeleton className="h-14 rounded-lg" />
                            <Skeleton className="h-14 rounded-lg" />
                          </div>
                        ) : sessions.length === 0 ? (
                          <p className="py-4 text-center text-sm text-muted-foreground">{t.settings.sessionsEmpty}</p>
                        ) : (
                          <div className="space-y-2">
                            {sessions.map((session) => {
                              const { browser, os, icon } = parseUserAgent(session.userAgent);
                              const currentSessionId = typeof window !== 'undefined' ? localStorage.getItem('alfychat_session_id') : null;
                              const isCurrent = session.id === currentSessionId;
                              const date = new Date(session.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
                              const displayIP = session.ipAddress
                                ? session.ipAddress.startsWith('::ffff:') ? session.ipAddress.slice(7)
                                : session.ipAddress === '::1' ? '127.0.0.1' : session.ipAddress
                                : '—';
                              return (
                                <div key={session.id} className="flex items-center gap-3 rounded-lg border border-border/40 p-3">
                                  <span className="text-xl leading-none">{icon}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{os} — {browser}</span>
                                      {isCurrent && <Badge variant="outline" className="text-[10px] py-0">Actuel</Badge>}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{displayIP} • {date}</p>
                                  </div>
                                  {!isCurrent && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="size-8 text-red-500 hover:text-red-400"
                                      onClick={async () => {
                                        const res = await api.revokeSession(session.id);
                                        if (res.success) {
                                          setSessions((prev) => prev.filter((s) => s.id !== session.id));
                                          toast.success(t.settings.sessionRevoked);
                                        } else {
                                          toast.error(t.settings.sessionRevokeError);
                                        }
                                      }}
                                    >
                                      <Trash2Icon size={14} />
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Legal links */}
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <a href="#" className="hover:underline text-primary">{t.settings.privacyPolicyLink}</a>
                      <a href="#" className="hover:underline text-primary">{t.settings.termsLink}</a>
                    </div>

                    {/* Danger zone */}
                    <Card className="border-red-500/30">
                      <CardHeader>
                        <CardTitle className="text-red-500">{t.settings.dangerZone}</CardTitle>
                        <CardDescription>{t.settings.dangerZoneDesc}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="gap-2">
                              <Trash2Icon size={16} />
                              {t.settings.deleteAccount}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t.settings.deleteAccountTitle}</AlertDialogTitle>
                              <AlertDialogDescription>{t.settings.deleteAccountBody}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2">
                              <Label>{t.settings.deletePasswordLabel}</Label>
                              <Input
                                type="password"
                                placeholder={t.settings.deletePasswordPlaceholder}
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                              />
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setDeletePassword('')}>{t.common.cancel}</AlertDialogCancel>
                              <AlertDialogAction
                                disabled={isDeletingAccount || !deletePassword.trim()}
                                onClick={handleDeleteAccount}
                              >
                                {t.settings.deleteConfirm}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* ═══════════ APPEARANCE ═══════════ */}
                {activeTab === 'appearance' && (
                  <div className="mx-auto max-w-2xl space-y-5">

                    {/* Theme mode */}
                    <Card>
                      <CardHeader>
                        <CardTitle>{t.settings.mode}</CardTitle>
                        <CardDescription>{t.settings.modeDesc}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                          {([
                            { id: 'dark', label: t.settings.dark, icon: MoonIcon },
                            { id: 'light', label: t.settings.light, icon: SunIcon },
                            { id: 'system', label: t.settings.system, icon: MonitorIcon },
                          ] as const).map(({ id, label, icon: Icon }) => (
                            <Button
                              key={id}
                              variant={theme === id ? 'default' : 'outline'}
                              className="gap-2"
                              onClick={() => setTheme(id)}
                            >
                              <Icon size={14} />
                              {label}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Font */}
                    <Card>
                      <CardHeader>
                        <CardTitle>{t.settings.fontFamily}</CardTitle>
                        <CardDescription>{t.settings.fontFamilyDesc}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Label>{t.settings.fontLabel}</Label>
                          <Select value={fontFamily} onValueChange={applyFont}>
                            <SelectTrigger className="max-w-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FONTS.map((f) => (
                                <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* ═══════════ LANGUAGE ═══════════ */}
                {activeTab === 'language' && (
                  <div className="mx-auto max-w-2xl space-y-5">
                    <Card>
                      <CardHeader>
                        <CardTitle>{t.settings.langInterfaceTitle}</CardTitle>
                        <CardDescription>{t.settings.langInterfaceDesc}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="relative">
                          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={langSearch}
                            onChange={(e) => setLangSearch(e.target.value)}
                            placeholder={t.settings.searchPlaceholder}
                            className="pl-9"
                          />
                        </div>
                        <LanguageSwitcher variant="full" filter={langSearch} />
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* ═══════════ LAYOUT ═══════════ */}
                {activeTab === 'layout' && (
                  <div className="mx-auto max-w-2xl space-y-5">

                    {/* Server list position */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Position de la liste des serveurs</CardTitle>
                        <CardDescription>Choisissez où apparaît la liste des icônes de serveurs</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {([
                            {
                              id: 'left', label: 'Gauche',
                              preview: (
                                <div className="flex h-12 w-full gap-0.5 overflow-hidden rounded-md border border-border/20 bg-background/50 p-0.5">
                                  <div className="w-2 rounded-sm bg-primary/50" />
                                  <div className="w-3.5 rounded-sm bg-muted/50" />
                                  <div className="flex-1 rounded-sm bg-muted/20" />
                                </div>
                              ),
                            },
                            {
                              id: 'right', label: 'Droite',
                              preview: (
                                <div className="flex h-12 w-full gap-0.5 overflow-hidden rounded-md border border-border/20 bg-background/50 p-0.5">
                                  <div className="flex-1 rounded-sm bg-muted/20" />
                                  <div className="w-3.5 rounded-sm bg-muted/50" />
                                  <div className="w-2 rounded-sm bg-primary/50" />
                                </div>
                              ),
                            },
                            {
                              id: 'top', label: 'Haut',
                              preview: (
                                <div className="flex h-12 w-full flex-col gap-0.5 overflow-hidden rounded-md border border-border/20 bg-background/50 p-0.5">
                                  <div className="h-2 w-full rounded-sm bg-primary/50" />
                                  <div className="flex flex-1 gap-0.5">
                                    <div className="w-3.5 rounded-sm bg-muted/50" />
                                    <div className="flex-1 rounded-sm bg-muted/20" />
                                  </div>
                                </div>
                              ),
                            },
                            {
                              id: 'bottom', label: 'Bas',
                              preview: (
                                <div className="flex h-12 w-full flex-col gap-0.5 overflow-hidden rounded-md border border-border/20 bg-background/50 p-0.5">
                                  <div className="flex flex-1 gap-0.5">
                                    <div className="w-3.5 rounded-sm bg-muted/50" />
                                    <div className="flex-1 rounded-sm bg-muted/20" />
                                  </div>
                                  <div className="h-2 w-full rounded-sm bg-primary/50" />
                                </div>
                              ),
                            },
                          ] as const).map(({ id, label, preview }) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => updateLayoutPrefs({ serverListPosition: id })}
                              className={cn(
                                'flex flex-col items-center gap-2 rounded-xl border-2 p-2.5 text-xs font-medium transition-all duration-150',
                                layoutPrefs.serverListPosition === id
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border/30 bg-muted/20 text-muted-foreground hover:border-border/60',
                              )}
                            >
                              {preview}
                              <span>{label}</span>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Member list position */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Position de la liste des membres</CardTitle>
                        <CardDescription>Visible uniquement dans les serveurs</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          {(['left', 'right'] as const).map((side) => (
                            <button
                              key={side}
                              type="button"
                              onClick={() => updateLayoutPrefs({ memberListSide: side })}
                              className={cn(
                                'flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition-all duration-150',
                                layoutPrefs.memberListSide === side
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border/30 bg-muted/20 text-muted-foreground hover:border-border/60',
                              )}
                            >
                              <div className="flex h-14 w-full gap-1 overflow-hidden rounded-lg border border-border/20 bg-background/50 p-1">
                                {side === 'left' && <div className="w-7 rounded-sm bg-emerald-500/30" />}
                                <div className="flex-1 rounded-sm bg-muted/20" />
                                {side === 'right' && <div className="w-7 rounded-sm bg-emerald-500/30" />}
                              </div>
                              <span>{side === 'left' ? 'Gauche' : 'Droite'}</span>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* UI Style */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Style de l&apos;interface</CardTitle>
                        <CardDescription>Choisissez entre un style épuré ou un style vitré inspiré d&apos;Apple</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          {([
                            {
                              id: 'flat' as const,
                              label: 'Flat',
                              desc: 'Épuré · actuel',
                              preview: (
                                <div className="flex w-full gap-1 rounded-lg border border-border/20 bg-background/50 p-1.5">
                                  <div className="w-5 rounded bg-muted/60" />
                                  <div className="flex flex-1 flex-col gap-0.5">
                                    <div className="h-1.5 rounded bg-muted/50" />
                                    <div className="h-1.5 w-3/4 rounded bg-muted/40" />
                                    <div className="mt-1 h-2.5 w-full rounded bg-muted/30" />
                                  </div>
                                </div>
                              ),
                            },
                            {
                              id: 'glass' as const,
                              label: 'Glass',
                              desc: 'Apple · vitré',
                              preview: (
                                <div className="relative flex w-full gap-1 overflow-hidden rounded-lg border border-white/20 p-1.5"
                                  style={{ background: 'linear-gradient(135deg, oklch(0.78 0.10 280 / 30%), oklch(0.72 0.12 230 / 20%))' }}>
                                  <div className="absolute inset-0 rounded-lg" style={{ backdropFilter: 'blur(8px)' }} />
                                  <div className="relative w-5 rounded border border-white/20 bg-white/30" />
                                  <div className="relative flex flex-1 flex-col gap-0.5">
                                    <div className="h-1.5 rounded border border-white/15 bg-white/40" />
                                    <div className="h-1.5 w-3/4 rounded border border-white/10 bg-white/30" />
                                    <div className="mt-1 h-2.5 w-full rounded border border-white/15 bg-white/25" />
                                  </div>
                                </div>
                              ),
                            },
                          ]).map(({ id, label, desc, preview }) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => updateLayoutPrefs({ uiStyle: id })}
                              className={cn(
                                'flex flex-col items-center gap-2 rounded-xl border-2 p-2.5 text-xs font-medium transition-all duration-150',
                                layoutPrefs.uiStyle === id
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border/30 bg-muted/20 text-muted-foreground hover:border-border/60',
                              )}
                            >
                              {preview}
                              <div className="text-center">
                                <span className="block">{label}</span>
                                <span className="block text-[10px] font-normal text-muted-foreground">{desc}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Wallpaper — visible only in glass mode */}
                    {layoutPrefs.uiStyle === 'glass' && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Fond d&apos;écran</CardTitle>
                          <CardDescription>
                            Une image ou un dégradé affiché derrière les panneaux vitrés
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Preset gradients */}
                          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                            {([
                              {
                                label: 'Aurore',
                                value: 'linear-gradient(135deg, #667eea 0%, #764ba2 40%, #f093fb 100%)',
                              },
                              {
                                label: 'Océan',
                                value: 'linear-gradient(135deg, #0f2027 0%, #203a43 40%, #2c5364 100%)',
                              },
                              {
                                label: 'Coucher',
                                value: 'linear-gradient(135deg, #f7971e 0%, #ffd200 50%, #f7971e 100%)',
                              },
                              {
                                label: 'Rose',
                                value: 'linear-gradient(135deg, #fc5c7d 0%, #6a3093 100%)',
                              },
                              {
                                label: 'Forêt',
                                value: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
                              },
                              {
                                label: 'Nuit',
                                value: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 40%, #16213e 100%)',
                              },
                              {
                                label: 'Pêche',
                                value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                              },
                              {
                                label: 'Minuit',
                                value: 'linear-gradient(135deg, #2d3561 0%, #c05c7e 50%, #f3826f 100%)',
                              },
                              {
                                label: 'Jade',
                                value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                              },
                              {
                                label: 'Braise',
                                value: 'linear-gradient(135deg, #c31432 0%, #240b36 100%)',
                              },
                              {
                                label: 'Azur',
                                value: 'linear-gradient(135deg, #1a6dff 0%, #c822ff 100%)',
                              },
                              {
                                label: 'Nacre',
                                value: 'linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 40%, #e8e8e8 100%)',
                              },
                            ] as const).map(({ label, value }) => (
                              <button
                                key={label}
                                type="button"
                                title={label}
                                onClick={() => setWallpaper(value)}
                                className={cn(
                                  'relative h-12 w-full overflow-hidden rounded-xl border-2 transition-all',
                                  wallpaper === value
                                    ? 'border-primary shadow-md scale-105'
                                    : 'border-transparent hover:border-border/50 hover:scale-105',
                                )}
                                style={{ background: value }}
                              >
                                {wallpaper === value && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <CheckIcon size={14} className="text-white drop-shadow" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>

                          {/* Custom upload */}
                          <div className="flex items-center gap-2">
                            <input
                              ref={wallpaperInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                e.target.value = '';
                                try {
                                  const res = await api.uploadImage(file, 'wallpaper');
                                  if (res.success && res.data?.url) {
                                    // Resolve to absolute URL so CSS url() works across origins
                                    const absUrl = resolveMediaUrl(res.data.url) || res.data.url;
                                    setWallpaper(absUrl);
                                  } else {
                                    toast.error(res.error || 'Erreur lors de l\'upload');
                                  }
                                } catch {
                                  toast.error('Erreur lors de l\'upload de l\'image.');
                                }
                              }}}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => wallpaperInputRef.current?.click()}
                            >
                              <UploadIcon size={13} />
                              Image personnalisée
                            </Button>
                            {wallpaper && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2 text-muted-foreground hover:text-destructive"
                                onClick={() => setWallpaper(null)}
                              >
                                <XIcon size={13} />
                                Supprimer
                              </Button>
                            )}
                          </div>

                          {/* Preview strip */}
                          {wallpaper && (
                            <div
                              className="h-16 w-full overflow-hidden rounded-xl border border-border/30"
                              style={{
                                backgroundImage: wallpaper.startsWith('linear-gradient') || wallpaper.startsWith('radial-gradient')
                                  ? wallpaper
                                  : `url(${wallpaper})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }}
                            />
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* UI Density */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Densité de l&apos;interface</CardTitle>
                        <CardDescription>Ajustez l&apos;espacement de toute l&apos;interface</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-3">
                          {([
                            {
                              id: 'comfortable' as const,
                              label: 'Confortable',
                              desc: 'Plus aéré',
                              preview: (
                                <div className="flex w-full flex-col gap-1.5 rounded-lg border border-border/20 bg-background/50 p-2">
                                  <div className="h-3 w-3/4 rounded bg-muted/50" />
                                  <div className="h-3 w-1/2 rounded bg-muted/40" />
                                  <div className="h-3 w-2/3 rounded bg-muted/30" />
                                </div>
                              ),
                            },
                            {
                              id: 'default' as const,
                              label: 'Normal',
                              desc: 'Équilibré',
                              preview: (
                                <div className="flex w-full flex-col gap-1 rounded-lg border border-border/20 bg-background/50 p-1.5">
                                  <div className="h-2.5 w-3/4 rounded bg-muted/50" />
                                  <div className="h-2.5 w-1/2 rounded bg-muted/40" />
                                  <div className="h-2.5 w-2/3 rounded bg-muted/30" />
                                </div>
                              ),
                            },
                            {
                              id: 'compact' as const,
                              label: 'Compact',
                              desc: 'Plus dense',
                              preview: (
                                <div className="flex w-full flex-col gap-0.5 rounded-lg border border-border/20 bg-background/50 p-1">
                                  <div className="h-2 w-3/4 rounded bg-muted/50" />
                                  <div className="h-2 w-1/2 rounded bg-muted/40" />
                                  <div className="h-2 w-2/3 rounded bg-muted/30" />
                                  <div className="h-2 w-1/2 rounded bg-muted/20" />
                                </div>
                              ),
                            },
                          ]).map(({ id, label, desc, preview }) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => updateLayoutPrefs({ density: id, compactServerList: id === 'compact' })}
                              className={cn(
                                'flex flex-col items-center gap-2 rounded-xl border-2 p-2.5 text-xs font-medium transition-all duration-150',
                                layoutPrefs.density === id
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border/30 bg-muted/20 text-muted-foreground hover:border-border/60',
                              )}
                            >
                              {preview}
                              <div className="text-center">
                                <span className="block">{label}</span>
                                <span className="block text-[10px] font-normal text-muted-foreground">{desc}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}
