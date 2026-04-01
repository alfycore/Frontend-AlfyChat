'use client';

import { useEffect, useState, useRef } from 'react';
import { parseDate } from '@internationalized/date';
import {
  UserIcon, PaletteIcon, BellIcon, ShieldIcon, LogOutIcon,
  CameraIcon, ImageIcon, SaveIcon, MicIcon, Volume2Icon,
  SunIcon, MoonIcon, MonitorIcon, RotateCcwIcon, PipetteIcon,
  RotateCwIcon, GlobeIcon, SearchIcon, HelpCircleIcon, LockIcon,
  Trash2Icon, KeyRoundIcon, ZapIcon, CalendarIcon, ClockIcon,
  MoreHorizontalIcon, AlertTriangleIcon, ChevronDownIcon, ChevronRightIcon, ArrowLeftIcon,
  XIcon, UploadIcon, LayoutIcon,
} from '@/components/icons';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTranslation } from '@/components/locale-provider';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useBackground } from '@/hooks/use-background';
import { socketService } from '@/lib/socket';
import { api, resolveMediaUrl } from '@/lib/api';
import {
  Accordion,
  Alert,
  AlertDialog,
  Autocomplete,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  ButtonGroup,
  Calendar,
  Card,
  Checkbox,
  CheckboxGroup,
  Chip,
  CloseButton,
  ColorArea,
  ColorField,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  ComboBox,
  DateField,
  DatePicker,
  DateRangePicker,
  Description,
  Disclosure,
  DisclosureGroup,
  Dropdown,
  ErrorMessage,
  FieldError,
  FieldGroup,
  Fieldset,
  Form,
  Input,
  InputGroup,
  InputOTP,
  Kbd,
  Label,
  Link,
  ListBox,
  Modal,
  NumberField,
  Pagination,
  parseColor,
  Popover,
  Radio,
  RadioGroup,
  RangeCalendar,
  ScrollShadow,
  SearchField,
  Select,
  Separator,
  Skeleton,
  Slider,
  Spinner,
  Surface,
  Switch,
  Table,
  Tabs,
  Tag,
  TagGroup,
  TextArea,
  TextField,
  TimeField,
  Toast,
  toast,
  Tooltip,
  useFilter,
} from '@heroui/react';
import {
  getAudioPreferences,
  setAudioPreferences,
  type AudioPreferences,
} from '@/hooks/use-call';
import { useLayoutPrefs } from '@/hooks/use-layout-prefs';
import { cn } from '@/lib/utils';
import { sanitizeSvg } from '@/lib/sanitize';

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

  // ── Navigateur ──
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

  // ── Système d'exploitation ──
  let os   = 'OS inconnu';
  let icon = '🖥️';

  if (ua.includes('iPhone')) {
    // Extraire la version iOS : "iPhone OS 17_0" ou "CPU iPhone OS 17_0"
    const match = ua.match(/CPU(?: iPhone)? OS (\d+)[_.](\d+)/);
    os   = match ? `iOS ${match[1]}.${match[2]}` : 'iOS';
    icon = '📱';
  } else if (ua.includes('iPad')) {
    const match = ua.match(/CPU OS (\d+)[_.](\d+)/);
    os   = match ? `iPadOS ${match[1]}.${match[2]}` : 'iPadOS';
    icon = '📱';
  } else if (ua.includes('Android')) {
    const match = ua.match(/Android (\d+(?:\.\d+)?)/);
    os   = match ? `Android ${match[1]}` : 'Android';
    icon = '📱';
  } else if (ua.includes('Windows NT 10.0')) {
    // Windows 11 : "Windows NT 10.0" + présence de "Windows 11" dans certains Hint headers
    // ou via SEC-CH-UA-Platform-Version ≥ "13.0" — on reste conservateur
    os   = 'Windows 10/11';
    icon = '🖥️';
  } else if (ua.includes('Windows NT 6.3')) {
    os = 'Windows 8.1'; icon = '🖥️';
  } else if (ua.includes('Windows NT 6.2')) {
    os = 'Windows 8';   icon = '🖥️';
  } else if (ua.includes('Windows NT 6.1')) {
    os = 'Windows 7';   icon = '🖥️';
  } else if (ua.includes('Windows')) {
    os = 'Windows';     icon = '🖥️';
  } else if (ua.includes('CrOS')) {
    os = 'ChromeOS';    icon = '💻';
  } else if (ua.includes('Mac OS X')) {
    // Extraire la version macOS : "Mac OS X 10_15_7" ou "Mac OS X 14_0"
    const match = ua.match(/Mac OS X (\d+)[_.](\d+)/);
    if (match) {
      const major = parseInt(match[1]);
      const minor = parseInt(match[2]);
      // macOS 11+ utilise la numérotation 11.x, 12.x, etc.
      if (major >= 11 || (major === 10 && minor >= 16)) {
        os = `macOS ${major}`;
      } else {
        const names: Record<number, string> = { 15: 'Sequoia', 14: 'Sonoma', 13: 'Ventura', 12: 'Monterey', 11: 'Big Sur', 10: 'Catalina', 9: 'Mojave', 8: 'High Sierra' };
        os = `macOS${names[minor] ? ` ${names[minor]}` : ` 10.${minor}`}`;
      }
    } else {
      os = 'macOS';
    }
    icon = '🍎';
  } else if (ua.includes('Linux')) {
    if      (ua.includes('Ubuntu'))  { os = 'Ubuntu';  icon = '🐧'; }
    else if (ua.includes('Fedora'))  { os = 'Fedora';  icon = '🐧'; }
    else if (ua.includes('Debian'))  { os = 'Debian';  icon = '🐧'; }
    else                             { os = 'Linux';   icon = '🐧'; }
  }

  return { browser, os, icon };
}
type SettingsTab = 'profile' | 'voice' | 'notifications' | 'privacy' | 'appearance' | 'language' | 'layout';

/* -- Helpers ---------------------------------------------------------------- */

function SettingsSwitch({
  label,
  description,
  isSelected,
  onChange,
}: {
  label: string;
  description: string;
  isSelected: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Switch isSelected={isSelected} onChange={onChange}>
      <Switch.Content className="flex-1">
        <Label className="text-sm">{label}</Label>
        <Description>{description}</Description>
      </Switch.Content>
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
    </Switch>
  );
}

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
  const { contains } = useFilter({ sensitivity: 'base' });

  const NAV_TABS: { id: SettingsTab; label: string; shortLabel: string; icon: any }[] = [
    { id: 'profile', label: t.settings.profile, shortLabel: t.settings.profileShort, icon: UserIcon },
    { id: 'voice', label: t.settings.voice, shortLabel: t.settings.voiceShort, icon: MicIcon },
    { id: 'notifications', label: t.settings.notifications, shortLabel: t.settings.notifShort, icon: BellIcon },
    { id: 'privacy', label: t.settings.privacy, shortLabel: t.settings.privacyShort, icon: ShieldIcon },
    { id: 'appearance', label: t.settings.appearance, shortLabel: t.settings.appearanceShort, icon: PaletteIcon },
    { id: 'language', label: t.settings.language, shortLabel: t.settings.languageShort, icon: GlobeIcon },
    { id: 'layout', label: 'Mise en page', shortLabel: 'Layout', icon: LayoutIcon },
  ];

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  /* -- Profile -- */
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [cardColor, setCardColor] = useState('#6366f1');
  const [showBadges, setShowBadges] = useState(true);
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [deleteAvatarFlag, setDeleteAvatarFlag] = useState(false);
  const [deleteBannerFlag, setDeleteBannerFlag] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>(DEFAULT_INTERESTS);
  const [newInterest, setNewInterest] = useState('');
  const [timezone, setTimezone] = useState('europe-paris');
  const [birthday, setBirthday] = useState<any>(null);

  /* -- Voice -- */
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioPrefs, setAudioPrefsState] = useState<AudioPreferences>(getAudioPreferences());
  const [micTestActive, setMicTestActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [voiceTab, setVoiceTab] = useState<string>('mic');
  const [micMode, setMicMode] = useState('vad');
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const micTestRef = useRef<{ stream: MediaStream; analyser: AnalyserNode; ctx: AudioContext; raf: number } | null>(null);

  /* -- Notifications -- */
  const [notifTypes, setNotifTypes] = useState<string[]>(['sound', 'desktop', 'dm', 'mentions']);
  const [quietStartTime, setQuietStartTime] = useState<any>(null);
  const [quietEndTime, setQuietEndTime] = useState<any>(null);
  const [vacationRange, setVacationRange] = useState<any>(null);
  const [notifKeywords, setNotifKeywords] = useState<string[]>(['urgent', 'alerte']);
  const [newKeyword, setNewKeyword] = useState('');
  const [dndEnabled, setDndEnabled] = useState(false);

  /* -- Privacy -- */
  const [allowDMs, setAllowDMs] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [dmMode, setDmMode] = useState('everyone');
  const [otpValue, setOtpValue] = useState('');
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
  const { wallpaper, blur, opacity, setWallpaper, setBlur, setOpacity } = useBackground();
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  /* -- Layout -- */
  const { prefs: layoutPrefs, updatePrefs: updateLayoutPrefs } = useLayoutPrefs();

  /* -- Language -- */
  const [langSearch, setLangSearch] = useState('');

  /* -- Mobile nav -- */
  const [mobileShowMenu, setMobileShowMenu] = useState(true);
  useEffect(() => { if (open) setMobileShowMenu(true); }, [open]);

  /* -- Computed -- */
  /* -- Effects -- */
  // Charger le statut 2FA
  useEffect(() => {
    if (open && activeTab === 'privacy') {
      api.get2FAStatus().then((res) => {
        if (res.success && res.data) {
          setTwoFAEnabled((res.data as any).enabled === true);
        }
      });
      // Charger les sessions actives
      setSessionsLoading(true);
      api.getSessions().then((res) => {
        if (res.success && res.data) {
          setSessions((res.data as any).sessions ?? []);
        }
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
        } catch {
          /* permission denied */
        } finally {
          setIsLoadingDevices(false);
        }
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
      setAvatarPreview(resolveMediaUrl(user.avatarUrl) || null);
      setBannerPreview(resolveMediaUrl((user as any).bannerUrl) || null);


    }
  }, [user, open]);

  // Load backend preferences when dialog opens
  useEffect(() => {
    if (!open || !user) return;
    api.getPreferences(user.id).then((result) => {
      if (result.success && result.data) {
        const prefs = result.data as any;
        // Notification types
        const types: string[] = [];
        if (prefs.notificationsSound) types.push('sound');
        if (prefs.notificationsDesktop) types.push('desktop');
        if (prefs.notificationsDm) types.push('dm');
        if (prefs.notificationsMentions) types.push('mentions');
        if (types.length > 0) setNotifTypes(types);
        // Privacy
        if (prefs.privacyShowOnline !== undefined) setShowOnlineStatus(prefs.privacyShowOnline);
        if (prefs.privacyAllowDm !== undefined) setDmMode(prefs.privacyAllowDm ? 'everyone' : 'friends');
        // Extended settings from DB
        if (prefs.birthday) { try { setBirthday(parseDate(prefs.birthday)); } catch {} }
        if (prefs.timezone) setTimezone(prefs.timezone);
        if (Array.isArray(prefs.interests)) setInterests(prefs.interests);
        if (prefs.micMode) setMicMode(prefs.micMode);
        if (prefs.fontFamily) {
          setFontFamily(prefs.fontFamily);
          const fontMap: Record<string, string> = { inter: 'Inter, sans-serif', system: 'system-ui, sans-serif', mono: 'ui-monospace, monospace' };
          if (prefs.fontFamily !== 'geist' && fontMap[prefs.fontFamily]) {
            document.documentElement.style.setProperty('--font-family', fontMap[prefs.fontFamily]);
          } else {
            document.documentElement.style.removeProperty('--font-family');
          }
        }
        if (prefs.dndEnabled !== undefined) setDndEnabled(prefs.dndEnabled);
        if (Array.isArray(prefs.notifKeywords)) setNotifKeywords(prefs.notifKeywords);
        if (prefs.quietStart) { try { setQuietStartTime(JSON.parse(prefs.quietStart)); } catch {} }
        if (prefs.quietEnd) { try { setQuietEndTime(JSON.parse(prefs.quietEnd)); } catch {} }
        if (prefs.vacationStart && prefs.vacationEnd) {
          try { setVacationRange({ start: parseDate(prefs.vacationStart), end: parseDate(prefs.vacationEnd) }); } catch {}
        }
      }
    }).catch(() => {/* silent */});
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
      toast.danger(t.settings.micAccessError);
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
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setBannerPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    setDeleteAvatarFlag(true);
  };

  const handleDeleteBanner = () => {
    setBannerPreview(null);
    setBannerFile(null);
    setDeleteBannerFlag(true);
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      setSaveError(t.settings.displayNameRequired);
      return;
    }
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      const data: Record<string, any> = {
        displayName: displayName.trim(),
        bio: bio.trim(),
        cardColor,
        showBadges,
      };
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
      // Persist extended profile fields to DB
      if (user) {
        api.updatePreferences(user.id, {
          birthday: birthday?.toString() || undefined,
          timezone: timezone || undefined,
          interests,
        }).catch(() => {});
      }
      setAvatarFile(null);
      setBannerFile(null);
      setDeleteAvatarFlag(false);
      setDeleteBannerFlag(false);
      setSaveSuccess(true);
      toast.success(t.settings.profileSavedToast);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError(t.settings.profileSaveError);
      toast.danger(t.settings.profileSaveErrorToast);
    }
    setIsSaving(false);
  };

  const handleLogout = async () => {
    await logout();
    onOpenChange(false);
    router.push('/login');
  };

  const saveNotificationPrefs = async (types: string[], dnd: boolean) => {
    if (!user) return;
    try {
      await api.updatePreferences(user.id, {
        notificationsSound: types.includes('sound'),
        notificationsDesktop: types.includes('desktop'),
        notificationsDm: types.includes('dm'),
        notificationsMentions: types.includes('mentions'),
        dndEnabled: dnd,
      });
    } catch { /* silent */ }
    socketService.updatePresence(dnd ? 'dnd' : 'online');
  };

  const savePrivacyPrefs = async (showOnline: boolean, dm: string) => {
    if (!user) return;
    try {
      await api.updatePreferences(user.id, {
        privacyShowOnline: showOnline,
        privacyAllowDm: dm !== 'none',
      });
    } catch { /* silent */ }
  };

  const applyFont = (fontId: string) => {
    setFontFamily(fontId);
    if (user) api.updatePreferences(user.id, { fontFamily: fontId }).catch(() => {});
    const fontMap: Record<string, string> = {
      inter: 'Inter, sans-serif',
      system: 'system-ui, sans-serif',
      mono: 'ui-monospace, monospace',
    };
    if (fontId === 'geist' || !fontMap[fontId]) {
      document.documentElement.style.removeProperty('--font-family');
    } else {
      document.documentElement.style.setProperty('--font-family', fontMap[fontId]);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (!currentPassword.trim() || !newPassword.trim()) {
      toast.danger('Veuillez remplir tous les champs');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.danger('Les mots de passe ne correspondent pas');
      return;
    }
    if (newPassword.length < 8) {
      toast.danger('Le nouveau mot de passe doit faire au moins 8 caractères');
      return;
    }
    setIsChangingPassword(true);
    try {
      const result = await api.changePassword(user.id, { currentPassword, newPassword });
      if (result.success) {
        toast.success('Mot de passe modifié avec succès');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.danger((result as any).error || 'Mot de passe actuel incorrect');
      }
    } catch {
      toast.danger('Erreur lors du changement de mot de passe');
    }
    setIsChangingPassword(false);
  };

  const handleRevokeAllSessions = async () => {
    setIsRevokingAll(true);
    try {
      await api.logoutAll();
      toast.success(t.settings.revokeAllSuccess);
      await handleLogout();
    } catch {
      toast.danger(t.settings.revokeAllError);
      setIsRevokingAll(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      toast.danger(t.settings.deleteMissingPassword);
      return;
    }
    setIsDeletingAccount(true);
    const result = await api.requestAccountDeletion(deletePassword);
    if (result.success) {
      toast.success(t.settings.deleteSuccess);
      setDeletePassword('');
      await handleLogout();
    } else {
      toast.danger((result as any).error ?? t.settings.profileSaveError);
      setIsDeletingAccount(false);
    }
  };

  if (!user) return null;

  /* -- Render -- */
  return (
    <Modal.Backdrop isOpen={open} onOpenChange={onOpenChange} variant="blur">
      <Modal.Container size="lg" scroll="inside">
        <Modal.Dialog className="h-[85vh] max-w-5xl overflow-hidden bg-[var(--background)] p-0">
          <Modal.CloseTrigger />

          <div className="flex h-full bg-[var(--background)]">
            {/* ------ Sidebar ------ */}
            <aside className="hidden w-56 shrink-0 flex-col border-r border-[var(--border)]/40 bg-[var(--surface)] sm:flex">
              <div className="px-4 pt-5 pb-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                  {t.settings.sectionHeader}
                </p>
                <p className="mt-0.5 truncate text-sm font-medium text-[var(--foreground)]">
                  {user.displayName || user.username}
                </p>
              </div>

              <ScrollShadow className="flex-1 px-2 py-1" hideScrollBar>
                <nav className="flex flex-col gap-0.5">
                  {NAV_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium outline-none transition-colors',
                        activeTab === tab.id
                          ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                          : 'text-[var(--muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]',
                      )}
                    >
                      <tab.icon size={16} />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </ScrollShadow>

              <Separator />
              <div className="p-2">
                <Button variant="ghost" onPress={handleLogout} className="w-full justify-start gap-2.5 rounded-xl px-3 py-2 text-sm text-red-500">
                  <LogOutIcon size={14} />
                  {t.settings.logout}
                </Button>
              </div>
            </aside>

            {/* ------ Mobile nav ------ */}
            <div className="flex w-full flex-col">

              {/* ── Mobile : menu principal (iOS-style) ── */}
              {mobileShowMenu && (
                <div className="flex flex-1 flex-col overflow-y-auto pb-8 sm:hidden">
                  {/* User header */}
                  <div className="flex items-center gap-3 border-b border-[var(--border)]/40 bg-[var(--surface)]/60 px-4 py-4">
                    <Avatar size="md" className="size-12 shrink-0">
                      <Avatar.Image src={avatarPreview || undefined} alt={displayName} />
                      <Avatar.Fallback>{displayName?.[0]?.toUpperCase() || '?'}</Avatar.Fallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">{displayName || user.username}</p>
                      <p className="truncate text-xs text-[var(--muted)]">@{user.username}</p>
                    </div>
                  </div>

                  {/* Nav rows */}
                  <nav className="flex flex-col gap-0.5 p-3">
                    {NAV_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => { setActiveTab(tab.id); setMobileShowMenu(false); }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-colors active:bg-[var(--surface-secondary)] hover:bg-[var(--surface-secondary)]"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10">
                          <tab.icon size={18} className="text-[var(--accent)]" />
                        </span>
                        <span className="flex-1 text-left text-sm font-medium text-[var(--foreground)]">{tab.label}</span>
                        <ChevronRightIcon size={16} className="text-[var(--muted)]/40" />
                      </button>
                    ))}
                  </nav>

                  {/* Logout */}
                  <div className="mt-auto px-3 pb-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-colors active:bg-red-500/10 hover:bg-red-500/10"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                        <LogOutIcon size={18} className="text-red-500" />
                      </span>
                      <span className="flex-1 text-left text-sm font-medium text-red-500">{t.settings.logout}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ── Mobile : header section avec retour ── */}
              {!mobileShowMenu && (
                <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--border)]/40 px-3 sm:hidden">
                  <Button isIconOnly variant="ghost" size="sm" onPress={() => setMobileShowMenu(true)}>
                    <ArrowLeftIcon size={18} />
                  </Button>
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    {NAV_TABS.find((tab) => tab.id === activeTab)?.label}
                  </h2>
                </div>
              )}

              {/* ------ Content ------ */}
              <div className={cn('flex-1 overflow-y-auto bg-[var(--background)] p-4 sm:p-6', mobileShowMenu && 'hidden sm:block')} >

                {/* --------- PROFIL --------- */}
                {activeTab === 'profile' && (
                  <div className="mx-auto max-w-2xl space-y-5">

                    {/* Breadcrumbs */}
                    <Breadcrumbs>
                      <Breadcrumbs.Item href="#">{t.common.settings}</Breadcrumbs.Item>
                      <Breadcrumbs.Item>{t.settings.profile}</Breadcrumbs.Item>
                    </Breadcrumbs>

                    {/* Alerts */}
                    {saveSuccess && (
                      <Alert status="success">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>{t.settings.savedTitle}</Alert.Title>
                          <Alert.Description>{t.settings.savedDesc}</Alert.Description>
                        </Alert.Content>
                        <CloseButton onPress={() => setSaveSuccess(false)} />
                      </Alert>
                    )}
                    {saveError && (
                      <Alert status="danger">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>{t.common.error}</Alert.Title>
                          <Alert.Description>{saveError}</Alert.Description>
                        </Alert.Content>
                        <CloseButton onPress={() => setSaveError(null)} />
                      </Alert>
                    )}

                    {/* Banner + Avatar card */}
                    <Card>
                      <div
                        className="relative h-28 cursor-pointer overflow-hidden rounded-t-2xl sm:h-36"
                        style={{ backgroundColor: cardColor }}
                        onClick={() => bannerInputRef.current?.click()}
                      >
                        {bannerPreview ? (
                          <img src={bannerPreview} alt={t.settings.banner} className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center gap-2 text-sm text-white/60">
                            <ImageIcon size={20} />
                            <span className="hidden sm:inline">{t.settings.addBanner}</span>
                            <span className="sm:hidden">{t.settings.addBannerMobile}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                          <CameraIcon size={32} className="text-white" />
                        </div>
                      </div>
                      <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />

                      <Card.Content className="relative px-4 pb-5 sm:px-6">
                        <div className="flex items-end justify-between -mt-8 mb-4 sm:-mt-10">
                          {/* Avatar with Badge */}
                          <Badge.Anchor>
                            <div
                              className="relative cursor-pointer"
                              onClick={() => avatarInputRef.current?.click()}
                            >
                              <Avatar size="lg" className="size-16 border-4 border-[var(--background)] sm:size-20">
                                <Avatar.Image src={avatarPreview || undefined} alt="Avatar" />
                                <Avatar.Fallback>{displayName?.[0]?.toUpperCase() || '?'}</Avatar.Fallback>
                              </Avatar>
                              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                                <CameraIcon size={20} className="text-white" />
                              </div>
                            </div>
                            <Badge color="success" size="sm" placement="bottom-right" />
                          </Badge.Anchor>
                          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

                          {/* Role chip + actions dropdown */}
                          <div className="flex items-center gap-2">
                            <Chip color="accent" variant="soft" size="sm">
                              <Chip.Label>{(user as any).role || 'Membre'}</Chip.Label>
                            </Chip>
                            <Dropdown>
                              <Button isIconOnly variant="ghost" size="sm" aria-label="Actions profil">
                                <MoreHorizontalIcon size={16} />
                              </Button>
                              <Dropdown.Popover>
                                <Dropdown.Menu onAction={(key) => {
                                  if (key === 'avatar') avatarInputRef.current?.click();
                                  if (key === 'banner') bannerInputRef.current?.click();
                                  if (key === 'delete-avatar') handleDeleteAvatar();
                                  if (key === 'delete-banner') handleDeleteBanner();
                                }}>
                                  <Dropdown.Item id="avatar" textValue={t.settings.changeAvatar}>
                                    <Label>{t.settings.changeAvatar}</Label>
                                  </Dropdown.Item>
                                  {(avatarPreview) && (
                                    <Dropdown.Item id="delete-avatar" textValue="Supprimer l'avatar">
                                      <Label>Supprimer l'avatar</Label>
                                    </Dropdown.Item>
                                  )}
                                  <Dropdown.Item id="banner" textValue={t.settings.changeBanner}>
                                    <Label>{t.settings.changeBanner}</Label>
                                  </Dropdown.Item>
                                  {(bannerPreview) && (
                                    <Dropdown.Item id="delete-banner" textValue="Supprimer la bannière">
                                      <Label>Supprimer la bannière</Label>
                                    </Dropdown.Item>
                                  )}
                                </Dropdown.Menu>
                              </Dropdown.Popover>
                            </Dropdown>
                          </div>
                        </div>

                        {/* Form / Fieldset */}
                        <Form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }}>
                          <Fieldset className="w-full">
                            <Fieldset.Legend className="text-base font-semibold">{t.settings.personalInfo}</Fieldset.Legend>
                            <Description className="text-sm text-[var(--muted)] mb-4">{t.settings.personalInfoDesc}</Description>
                            {saveError && <ErrorMessage className="mb-2">{saveError}</ErrorMessage>}
                            <FieldGroup className="grid gap-4 lg:grid-cols-2">
                              <TextField
                                className="w-full"
                                value={displayName}
                                onChange={setDisplayName}
                                isRequired
                                name="displayName"
                                validate={(v) => !v.trim() ? t.settings.nameRequired : null}
                              >
                                <Label>{t.settings.displayName}</Label>
                                <InputGroup fullWidth variant="secondary">
                                  <InputGroup.Input
                                    maxLength={32}
                                    placeholder={t.settings.displayNamePlaceholder}
                                  />
                                </InputGroup>
                                <FieldError />
                              </TextField>

                              <TextField className="w-full" isDisabled>
                                <Label>{t.settings.username}</Label>
                                <InputGroup fullWidth variant="secondary">
                                  <InputGroup.Input value={user.username} readOnly />
                                </InputGroup>
                              </TextField>

                              <TextField className="w-full lg:col-span-2"
                                value={bio}
                                onChange={setBio}
                              >
                                <Label>{t.settings.bio}</Label>
                                <TextArea
                                  placeholder={t.settings.bioPlaceholder}
                                  className="w-full resize-none"
                                  rows={3}
                                  maxLength={200}
                                  variant="secondary"
                                />
                                <Description className="text-right">{bio.length}/200</Description>
                              </TextField>

                              {/* DatePicker — anniversaire */}
                              <div className="w-full">
                                <DatePicker className="w-full" name="birthday" value={birthday} onChange={setBirthday}>
                                  <Label>{t.settings.birthday}</Label>
                                  <DateField.Group fullWidth>
                                    <DateField.Input>
                                      {(segment) => <DateField.Segment segment={segment} />}
                                    </DateField.Input>
                                    <DateField.Suffix>
                                      <DatePicker.Trigger>
                                        <DatePicker.TriggerIndicator />
                                      </DatePicker.Trigger>
                                    </DateField.Suffix>
                                  </DateField.Group>
                                  <DatePicker.Popover>
                                    <Calendar aria-label={t.settings.birthday}>
                                      <Calendar.Header>
                                        <Calendar.YearPickerTrigger>
                                          <Calendar.YearPickerTriggerHeading />
                                          <Calendar.YearPickerTriggerIndicator />
                                        </Calendar.YearPickerTrigger>
                                        <Calendar.NavButton slot="previous" />
                                        <Calendar.NavButton slot="next" />
                                      </Calendar.Header>
                                      <Calendar.Grid>
                                        <Calendar.GridHeader>
                                          {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                                        </Calendar.GridHeader>
                                        <Calendar.GridBody>
                                          {(date) => <Calendar.Cell date={date} />}
                                        </Calendar.GridBody>
                                      </Calendar.Grid>
                                      <Calendar.YearPickerGrid>
                                        <Calendar.YearPickerGridBody>
                                          {({ year }) => <Calendar.YearPickerCell year={year} />}
                                        </Calendar.YearPickerGridBody>
                                      </Calendar.YearPickerGrid>
                                    </Calendar>
                                  </DatePicker.Popover>
                                </DatePicker>
                              </div>

                              {/* Autocomplete — fuseau horaire */}
                              <Autocomplete
                                className="w-full"
                                selectedKey={timezone}
                                onSelectionChange={(k) => { if (k) setTimezone(k as string); }}
                              >
                                <Label>{t.settings.timezone}</Label>
                                <Autocomplete.Trigger>
                                  <Autocomplete.Value />
                                  <Autocomplete.Indicator />
                                </Autocomplete.Trigger>
                                <Autocomplete.Popover>
                                  <Autocomplete.Filter filter={contains}>
                                    <SearchField variant="secondary">
                                      <SearchField.Group>
                                        <SearchField.SearchIcon />
                                        <SearchField.Input placeholder={t.settings.searchPlaceholder} />
                                        <SearchField.ClearButton />
                                      </SearchField.Group>
                                    </SearchField>
                                    <ListBox>
                                      {TIMEZONES.map((tz) => (
                                        <ListBox.Item key={tz.id} id={tz.id} textValue={tz.label}>
                                          {tz.label}
                                          <ListBox.ItemIndicator />
                                        </ListBox.Item>
                                      ))}
                                    </ListBox>
                                  </Autocomplete.Filter>
                                </Autocomplete.Popover>
                              </Autocomplete>
                            </FieldGroup>
                            <Fieldset.Actions className="mt-4 flex gap-3">
                              <ButtonGroup>
                                <Button type="submit" isDisabled={isSaving}>
                                  {isSaving ? (
                                    <Spinner size="sm" color="current" />
                                  ) : (
                                    <SaveIcon size={16} />
                                  )}
                                  {isSaving ? t.common.saving : t.common.save}
                                </Button>
                                <Button type="reset" variant="secondary" onPress={() => {
                                  setDisplayName(user.displayName || user.username || '');
                                  setBio((user as any).bio || '');
                                }}>
                                  {t.settings.reset}
                                </Button>
                              </ButtonGroup>
                            </Fieldset.Actions>
                          </Fieldset>
                        </Form>
                      </Card.Content>
                    </Card>

                    {/* Centres d'intérêt — TagGroup */}
                    <Card variant="secondary">
                      <Card.Header>
                        <Card.Title>Centres d&apos;intérêt</Card.Title>
                        <Card.Description>Tags visibles sur votre profil</Card.Description>
                      </Card.Header>
                      <Card.Content className="space-y-3">
                        <TagGroup onRemove={(keys) => {
                          const updated = interests.filter((i) => !keys.has(i));
                          setInterests(updated);
                          api.updatePreferences(user.id, { interests: updated }).catch(() => {});
                        }}>
                          <Label className="sr-only">Centres d&apos;intérêt</Label>
                          <TagGroup.List className="flex flex-wrap gap-2">
                            {interests.map((interest) => (
                              <Tag key={interest} id={interest}>{interest}</Tag>
                            ))}
                          </TagGroup.List>
                        </TagGroup>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Ajouter un intérêt..."
                            value={newInterest}
                            onChange={(e) => setNewInterest(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newInterest.trim()) {
                                const updated = [...interests, newInterest.trim()];
                                setInterests(updated);
                                api.updatePreferences(user.id, { interests: updated }).catch(() => {});
                                setNewInterest('');
                              }
                            }}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            isDisabled={!newInterest.trim()}
                            onPress={() => {
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
                      </Card.Content>
                    </Card>

                    {/* Couleur de profil + preview */}
                    <div className="grid gap-4 lg:grid-cols-2">
                      <Card variant="secondary">
                        <Card.Header>
                          <Card.Title>{t.settings.profileColor}</Card.Title>
                          <Card.Description>{t.settings.profileColorDesc}</Card.Description>
                        </Card.Header>
                        <Card.Content className="space-y-4">
                          {bannerPreview && (
                            <p className="rounded-lg border border-[var(--border)]/30 bg-[var(--surface-secondary)]/40 px-3 py-2 text-[11px] text-[var(--muted)]">
                              💡 La couleur s&apos;applique quand aucune bannière n&apos;est définie. Vous pouvez la supprimer via le menu Actions.
                            </p>
                          )}
                          <ColorSwatchPicker
                            value={cardColor}
                            onChange={(c) => setCardColor(c.toString('hex'))}
                            size="sm"
                          >
                            {CARD_COLOR_PRESETS.map((color) => (
                              <ColorSwatchPicker.Item key={color} color={color}>
                                <ColorSwatchPicker.Swatch />
                                <ColorSwatchPicker.Indicator />
                              </ColorSwatchPicker.Item>
                            ))}
                          </ColorSwatchPicker>

                          <ColorPicker
                            value={cardColor}
                            onChange={(c) => setCardColor(c.toString('hex'))}
                          >
                            <ColorPicker.Trigger>
                              <ColorSwatch size="lg" />
                              <Label>{t.settings.customColor}</Label>
                            </ColorPicker.Trigger>
                            <ColorPicker.Popover className="gap-2">
                              <ColorArea aria-label={t.settings.colorArea} className="max-w-full" colorSpace="hsb" xChannel="saturation" yChannel="brightness">
                                <ColorArea.Thumb />
                              </ColorArea>
                              <ColorSlider aria-label={t.settings.hue} channel="hue" className="gap-1 px-1" colorSpace="hsb">
                                <Label>{t.settings.hue}</Label>
                                <ColorSlider.Output className="text-[var(--muted)]" />
                                <ColorSlider.Track>
                                  <ColorSlider.Thumb />
                                </ColorSlider.Track>
                              </ColorSlider>
                              <ColorField aria-label={t.settings.hexValue}>
                                <ColorField.Group variant="secondary">
                                  <ColorField.Prefix><ColorSwatch size="xs" /></ColorField.Prefix>
                                  <ColorField.Input />
                                </ColorField.Group>
                              </ColorField>
                            </ColorPicker.Popover>
                          </ColorPicker>

                          <Separator />

                          <Switch isSelected={showBadges} onChange={setShowBadges}>
                            <Switch.Content className="flex-1">
                              <Label className="text-sm">{t.settings.showBadges}</Label>
                              <Description>{t.settings.showBadgesDesc}</Description>
                            </Switch.Content>
                            <Switch.Control><Switch.Thumb /></Switch.Control>
                          </Switch>
                        </Card.Content>
                      </Card>

                      {/* Preview */}
                      <Card variant="secondary">
                        <Card.Header>
                          <Card.Title>{t.settings.profilePreview}</Card.Title>
                          <Card.Description>{t.settings.profilePreviewDesc}</Card.Description>
                        </Card.Header>
                        <Card.Content>
                          <Card>
                            <div className="relative h-18 overflow-hidden rounded-t-2xl" style={{ backgroundColor: cardColor }}>
                              {bannerPreview && <img src={bannerPreview} alt="" className="size-full object-cover" />}
                              <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
                            </div>
                            <div className="relative px-3">
                              <div className="-mt-7 inline-block rounded-full ring-[3px] ring-[var(--background)]" style={{ boxShadow: `0 0 0 2px ${cardColor}60` }}>
                                <Avatar size="lg" className="size-14" style={{ backgroundColor: cardColor + '25', color: cardColor }}>
                                  <Avatar.Image src={avatarPreview || undefined} alt="" />
                                  <Avatar.Fallback className="text-lg font-bold">{displayName?.[0]?.toUpperCase() || '?'}</Avatar.Fallback>
                                </Avatar>
                              </div>
                            </div>
                            <div className="space-y-2 px-3 pb-3 pt-1.5">
                              <div>
                                <p className="text-sm font-bold leading-tight">{displayName || 'Nom'}</p>
                                <p className="text-xs text-[var(--muted)]">@{user.username}</p>
                              </div>
                              {showBadges && userBadges.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {userBadges.slice(0, 4).map((badge: any) => (
                                    <div key={badge.id} className="flex size-7 items-center justify-center rounded-lg" style={{ backgroundColor: badge.color + '18', border: `1.5px solid ${badge.color}35` }} title={badge.name}>
                                      {badge.iconType === 'svg' ? (
                                        <span dangerouslySetInnerHTML={{ __html: sanitizeSvg(badge.iconValue || badge.icon) }} />
                                      ) : (
                                        <i className={`bi ${badge.iconValue || badge.icon}`} style={{ color: badge.color, fontSize: '13px' }} />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {bio && (
                                <>
                                  <Separator />
                                  <p className="text-xs leading-relaxed text-[var(--muted)]">{bio}</p>
                                </>
                              )}
                            </div>
                          </Card>
                        </Card.Content>
                      </Card>
                    </div>

                    {/* Badges */}
                    {userBadges.length > 0 && (
                      <Card variant="secondary">
                        <Card.Header>
                          <Card.Title>{t.settings.myBadges}</Card.Title>
                          <Card.Description>{t.settings.badgesDesc}</Card.Description>
                        </Card.Header>
                        <Card.Content>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {userBadges.map((badge: any) => (
                              <div key={badge.id} className="flex items-center gap-2.5 rounded-xl border p-3" style={{ backgroundColor: badge.color + '08', borderColor: badge.color + '30' }}>
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg text-xl" style={{ backgroundColor: badge.color + '20', border: `2px solid ${badge.color}40` }}>
                                  {badge.iconType === 'svg' ? (
                                    <span dangerouslySetInnerHTML={{ __html: sanitizeSvg(badge.iconValue || badge.icon) }} />
                                  ) : (
                                    <i className={`bi ${badge.iconValue || badge.icon}`} style={{ color: badge.color }} />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold">{badge.name}</p>
                                  <p className="text-xs text-[var(--muted)]">
                                    {new Date(badge.earnedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card.Content>
                      </Card>
                    )}
                  </div>
                )}

                {/* --------- VOICE & VIDEO --------- */}
                {activeTab === 'voice' && (
                  <div className="mx-auto max-w-2xl space-y-5">
                    <Breadcrumbs>
                      <Breadcrumbs.Item href="#">{t.common.settings}</Breadcrumbs.Item>
                      <Breadcrumbs.Item>{t.settings.voice}</Breadcrumbs.Item>
                    </Breadcrumbs>

                    <Tabs
                      variant="secondary"
                      selectedKey={voiceTab}
                      onSelectionChange={(k) => setVoiceTab(k as string)}
                    >
                      <Tabs.ListContainer>
                        <Tabs.List aria-label={t.settings.voice}>
                          <Tabs.Tab id="mic">
                            <MicIcon size={14} className="mr-1.5" />
                            {t.settings.microphone}
                          </Tabs.Tab>
                          <Tabs.Tab id="speaker">
                            <Volume2Icon size={14} className="mr-1.5" />
                            {t.settings.audioOutput}
                          </Tabs.Tab>
                        </Tabs.List>
                      </Tabs.ListContainer>

                      {/* -- Microphone tab -- */}
                      <Tabs.Panel id="mic" className="mt-4 space-y-5">
                        <Surface variant="secondary" className="rounded-2xl p-4 space-y-5">
                          {isLoadingDevices ? (
                            <div className="space-y-2">
                              <Skeleton className="h-10 rounded-xl" />
                              <Skeleton className="h-10 rounded-xl" />
                              <Skeleton className="h-8 rounded-lg" />
                            </div>
                          ) : (
                            <>
                              <Select
                                aria-label={t.settings.inputDevice}
                                className="w-full"
                                placeholder={t.settings.systemDefault}
                                value={audioPrefs.inputDeviceId}
                                onChange={(key) => { if (key) updateAudioPref('inputDeviceId', key as string); }}
                                variant="secondary"
                              >
                                <Label>{t.settings.inputDevice}</Label>
                                <Select.Trigger>
                                  <Select.Value />
                                  <Select.Indicator />
                                </Select.Trigger>
                                <Select.Popover>
                                  <ListBox>
                                    <ListBox.Item id="default" textValue={t.settings.systemDefault}>
                                      {t.settings.systemDefault}
                                      <ListBox.ItemIndicator />
                                    </ListBox.Item>
                                    {audioDevices.map((d) => (
                                      <ListBox.Item key={d.deviceId} id={d.deviceId} textValue={d.label || `Micro ${d.deviceId.slice(0, 8)}`}>
                                        {d.label || `Micro ${d.deviceId.slice(0, 8)}`}
                                        <ListBox.ItemIndicator />
                                      </ListBox.Item>
                                    ))}
                                  </ListBox>
                                </Select.Popover>
                              </Select>

                              <div className="grid gap-4 sm:grid-cols-2">
                                <Slider
                                  aria-label={t.settings.inputVolume}
                                  minValue={0}
                                  maxValue={200}
                                  value={audioPrefs.inputVolume}
                                  onChange={(v) => updateAudioPref('inputVolume', v)}
                                  className="w-full"
                                >
                                  <div className="flex items-center justify-between">
                                    <Label>{t.settings.inputVolume}</Label>
                                    <Slider.Output />
                                  </div>
                                  <Slider.Track>
                                    <Slider.Fill />
                                    <Slider.Thumb />
                                  </Slider.Track>
                                </Slider>

                                <NumberField
                                  minValue={0}
                                  maxValue={200}
                                  value={audioPrefs.inputVolume}
                                  onChange={(v) => updateAudioPref('inputVolume', v)}
                                >
                                  <Label>{t.settings.exactVolume}</Label>
                                  <NumberField.Group>
                                    <NumberField.DecrementButton />
                                    <NumberField.Input className="w-16" />
                                    <NumberField.IncrementButton />
                                  </NumberField.Group>
                                </NumberField>
                              </div>
                            </>
                          )}

                          {/* Test micro */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{t.settings.micTest}</span>
                              <Button
                                variant={micTestActive ? 'danger' : 'secondary'}
                                size="sm"
                                onPress={micTestActive ? stopMicTest : startMicTest}
                              >
                                {micTestActive ? t.settings.stopTest : t.settings.testMic}
                              </Button>
                            </div>
                            {micTestActive && (
                              <div className="h-2.5 overflow-hidden rounded-full bg-surface-tertiary">
                                <div className="h-full rounded-full bg-green-500 transition-all duration-75" style={{ width: `${micLevel}%` }} />
                              </div>
                            )}
                          </div>
                        </Surface>

                        {/* micMode */}
                        <Card variant="secondary">
                          <Card.Header>
                            <Card.Title>{t.settings.micMode}</Card.Title>
                            <Card.Description>{t.settings.micModeDesc}</Card.Description>
                          </Card.Header>
                          <Card.Content>
                            <div className="space-y-2" role="radiogroup" aria-label={t.settings.micMode}>
                              {([
                                { value: 'vad',    label: t.settings.micModeVAD,    desc: t.settings.micModeVADDesc },
                                { value: 'ptt',    label: t.settings.micModePTT,    desc: t.settings.micModePTTDesc },
                                { value: 'always', label: t.settings.micModeAlways, desc: t.settings.micModeAlwaysDesc },
                              ] as const).map(({ value, label, desc }) => (
                                <button
                                  key={value}
                                  type="button"
                                  role="radio"
                                  aria-checked={micMode === value}
                                  onClick={() => { setMicMode(value); api.updatePreferences(user.id, { micMode: value }).catch(() => {}); }}
                                  className={cn(
                                    'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                                    micMode === value
                                      ? 'border-[var(--accent)]/50 bg-[var(--accent)]/8'
                                      : 'border-[var(--border)]/40 bg-[var(--surface-secondary)]/30 hover:border-[var(--border)] hover:bg-[var(--surface-secondary)]/60',
                                  )}
                                >
                                  <span className={cn(
                                    'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                                    micMode === value ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border)]',
                                  )}>
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

                        {/* Paramètres avancés — DisclosureGroup */}
                        <DisclosureGroup>
                          <Disclosure id="advanced-audio">
                            <Disclosure.Heading>
                              <Button slot="trigger" variant="ghost" className="w-full justify-between rounded-xl border border-[var(--border)]/40 px-4 py-3">
                                <span className="flex items-center gap-2 text-sm font-medium">
                                  <ZapIcon size={14} />
                                  {t.settings.audioProcessing}
                                </span>
                                <Disclosure.Indicator />
                              </Button>
                            </Disclosure.Heading>
                            <Disclosure.Content>
                              <Disclosure.Body>
                                <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)]/40 border-t-0 p-4">
                                  {[
                                    { key: 'noiseSuppression' as const, label: t.settings.noiseSuppression, desc: t.settings.noiseSuppressionDesc },
                                    { key: 'echoCancellation' as const, label: t.settings.echoCancellation, desc: t.settings.echoCancellationDesc },
                                    { key: 'autoGainControl' as const, label: t.settings.autoGain, desc: t.settings.autoGainDesc },
                                  ].map((item) => (
                                    <SettingsSwitch
                                      key={item.key}
                                      label={item.label}
                                      description={item.desc}
                                      isSelected={audioPrefs[item.key]}
                                      onChange={(v) => updateAudioPref(item.key, v)}
                                    />
                                  ))}
                                </div>
                              </Disclosure.Body>
                            </Disclosure.Content>
                          </Disclosure>
                        </DisclosureGroup>
                      </Tabs.Panel>

                      {/* -- Speaker tab -- */}
                      <Tabs.Panel id="speaker" className="mt-4 space-y-5">
                        <Surface variant="secondary" className="rounded-2xl p-4 space-y-5">
                          {isLoadingDevices ? (
                            <div className="space-y-2">
                              <Skeleton className="h-10 rounded-xl" />
                              <Skeleton className="h-10 rounded-xl" />
                            </div>
                          ) : (
                            <>
                              <Select
                                aria-label={t.settings.outputDevice}
                                className="w-full"
                                placeholder={t.settings.systemDefault}
                                value={audioPrefs.outputDeviceId}
                                onChange={(key) => { if (key) updateAudioPref('outputDeviceId', key as string); }}
                                variant="secondary"
                              >
                                <Label>{t.settings.outputDevice}</Label>
                                <Select.Trigger>
                                  <Select.Value />
                                  <Select.Indicator />
                                </Select.Trigger>
                                <Select.Popover>
                                  <ListBox>
                                    <ListBox.Item id="default" textValue={t.settings.systemDefault}>
                                      {t.settings.systemDefault}
                                      <ListBox.ItemIndicator />
                                    </ListBox.Item>
                                    {outputDevices.map((d) => (
                                      <ListBox.Item key={d.deviceId} id={d.deviceId} textValue={d.label || `Sortie ${d.deviceId.slice(0, 8)}`}>
                                        {d.label || `Sortie ${d.deviceId.slice(0, 8)}`}
                                        <ListBox.ItemIndicator />
                                      </ListBox.Item>
                                    ))}
                                  </ListBox>
                                </Select.Popover>
                              </Select>

                              <div className="grid gap-4 sm:grid-cols-2">
                                <Slider
                                  aria-label={t.settings.outputVolume}
                                  minValue={0}
                                  maxValue={200}
                                  value={audioPrefs.outputVolume}
                                  onChange={(v) => updateAudioPref('outputVolume', v)}
                                  className="w-full"
                                >
                                  <div className="flex items-center justify-between">
                                    <Label>{t.settings.outputVolume}</Label>
                                    <Slider.Output />
                                  </div>
                                  <Slider.Track>
                                    <Slider.Fill />
                                    <Slider.Thumb />
                                  </Slider.Track>
                                </Slider>

                                <NumberField
                                  minValue={0}
                                  maxValue={200}
                                  value={audioPrefs.outputVolume}
                                  onChange={(v) => updateAudioPref('outputVolume', v)}
                                >
                                  <Label>{t.settings.exactVolume}</Label>
                                  <NumberField.Group>
                                    <NumberField.DecrementButton />
                                    <NumberField.Input className="w-16" />
                                    <NumberField.IncrementButton />
                                  </NumberField.Group>
                                </NumberField>
                              </div>
                            </>
                          )}
                        </Surface>
                      </Tabs.Panel>
                    </Tabs>
                  </div>
                )}

                {/* --------- NOTIFICATIONS --------- */}
                {activeTab === 'notifications' && (
                  <div className="mx-auto max-w-2xl space-y-5">
                    <Breadcrumbs>
                      <Breadcrumbs.Item href="#">{t.common.settings}</Breadcrumbs.Item>
                      <Breadcrumbs.Item>{t.settings.notifications}</Breadcrumbs.Item>
                    </Breadcrumbs>

                    {/* DND Switch */}
                    <Card variant="secondary">
                      <Card.Content className="py-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold">{t.settings.dndMode}</p>
                            <p className="text-xs text-[var(--muted)]">{t.settings.dndModeDesc}</p>
                          </div>
                          <Switch isSelected={dndEnabled} onChange={(v) => { setDndEnabled(v); saveNotificationPrefs(notifTypes, v); }}>
                            <Switch.Control><Switch.Thumb /></Switch.Control>
                          </Switch>
                        </div>
                      </Card.Content>
                    </Card>

                    {/* Accordion for notification categories */}
                    <Accordion>
                      <Accordion.Item>
                        <Accordion.Heading>
                          <Accordion.Trigger className="w-full">
                            <span className="flex items-center gap-2 text-sm font-medium">
                              <BellIcon size={14} />
                              {t.settings.notifCategories}
                            </span>
                            <Accordion.Indicator />
                          </Accordion.Trigger>
                        </Accordion.Heading>
                        <Accordion.Panel>
                          <Accordion.Body className=" ">
                            <CheckboxGroup
                              value={notifTypes}
                              onChange={(v) => { setNotifTypes(v); saveNotificationPrefs(v, dndEnabled); }}
                            >
                              <Label className="sr-only">{t.settings.notifCategories}</Label>
                              <div className="space-y-3">
                                <Checkbox value="sound">
                                  <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
                                  <Checkbox.Content>
                                    <Label>{t.settings.notifSound}</Label>
                                    <Description>{t.settings.notifSoundDesc}</Description>
                                  </Checkbox.Content>
                                </Checkbox>
                                <Checkbox value="desktop">
                                  <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
                                  <Checkbox.Content>
                                    <Label>{t.settings.desktopNotifs}</Label>
                                    <Description>{t.settings.desktopNotifsDesc}</Description>
                                  </Checkbox.Content>
                                </Checkbox>
                                <Checkbox value="dm">
                                  <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
                                  <Checkbox.Content>
                                    <Label>{t.settings.dms}</Label>
                                    <Description>{t.settings.dmsDesc}</Description>
                                  </Checkbox.Content>
                                </Checkbox>
                                <Checkbox value="mentions">
                                  <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
                                  <Checkbox.Content>
                                    <Label>{t.settings.mentions}</Label>
                                    <Description>{t.settings.mentionsDesc}</Description>
                                  </Checkbox.Content>
                                </Checkbox>
                              </div>
                            </CheckboxGroup>
                          </Accordion.Body>
                        </Accordion.Panel>
                      </Accordion.Item>

                      <Accordion.Item>
                        <Accordion.Heading>
                          <Accordion.Trigger className="w-full">
                            <span className="flex items-center gap-2 text-sm font-medium">
                              <ClockIcon size={14} />
                              {t.settings.quietHours}
                            </span>
                            <Accordion.Indicator />
                          </Accordion.Trigger>
                        </Accordion.Heading>
                        <Accordion.Panel>
                          <Accordion.Body className=" ">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <TimeField name="quietStart" value={quietStartTime} onChange={(v) => { setQuietStartTime(v); api.updatePreferences(user.id, { quietStart: v ? JSON.stringify(v) : undefined }).catch(() => {}); }}>
                                <Label>{t.settings.quietHoursStart}</Label>
                                <TimeField.Group>
                                  <TimeField.Input>
                                    {(segment) => <TimeField.Segment segment={segment} />}
                                  </TimeField.Input>
                                </TimeField.Group>
                              </TimeField>
                              <TimeField name="quietEnd" value={quietEndTime} onChange={(v) => { setQuietEndTime(v); api.updatePreferences(user.id, { quietEnd: v ? JSON.stringify(v) : undefined }).catch(() => {}); }}>
                                <Label>{t.settings.quietHoursEnd}</Label>
                                <TimeField.Group>
                                  <TimeField.Input>
                                    {(segment) => <TimeField.Segment segment={segment} />}
                                  </TimeField.Input>
                                </TimeField.Group>
                              </TimeField>
                            </div>
                          </Accordion.Body>
                        </Accordion.Panel>
                      </Accordion.Item>

                      <Accordion.Item>
                        <Accordion.Heading>
                          <Accordion.Trigger className="w-full">
                            <span className="flex items-center gap-2 text-sm font-medium">
                              <CalendarIcon size={14} />
                              {t.settings.vacationMode}
                            </span>
                            <Accordion.Indicator />
                          </Accordion.Trigger>
                        </Accordion.Heading>
                        <Accordion.Panel>
                          <Accordion.Body className=" ">
                            <DateRangePicker className="w-full" startName="vacStart" endName="vacEnd" value={vacationRange} onChange={(v) => { setVacationRange(v); if (v?.start && v?.end) api.updatePreferences(user.id, { vacationStart: v.start.toString(), vacationEnd: v.end.toString() }).catch(() => {}); }}>
                              <Label>{t.settings.vacationPeriod}</Label>
                              <DateField.Group fullWidth>
                                <DateField.Input slot="start">
                                  {(segment) => <DateField.Segment segment={segment} />}
                                </DateField.Input>
                                <DateRangePicker.RangeSeparator />
                                <DateField.Input slot="end">
                                  {(segment) => <DateField.Segment segment={segment} />}
                                </DateField.Input>
                                <DateField.Suffix>
                                  <DateRangePicker.Trigger>
                                    <DateRangePicker.TriggerIndicator />
                                  </DateRangePicker.Trigger>
                                </DateField.Suffix>
                              </DateField.Group>
                              <DateRangePicker.Popover>
                                <RangeCalendar aria-label={t.settings.vacationMode}>
                                  <RangeCalendar.Header>
                                    <RangeCalendar.YearPickerTrigger>
                                      <RangeCalendar.YearPickerTriggerHeading />
                                      <RangeCalendar.YearPickerTriggerIndicator />
                                    </RangeCalendar.YearPickerTrigger>
                                    <RangeCalendar.NavButton slot="previous" />
                                    <RangeCalendar.NavButton slot="next" />
                                  </RangeCalendar.Header>
                                  <RangeCalendar.Grid>
                                    <RangeCalendar.GridHeader>
                                      {(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
                                    </RangeCalendar.GridHeader>
                                    <RangeCalendar.GridBody>
                                      {(date) => <RangeCalendar.Cell date={date} />}
                                    </RangeCalendar.GridBody>
                                  </RangeCalendar.Grid>
                                  <RangeCalendar.YearPickerGrid>
                                    <RangeCalendar.YearPickerGridBody>
                                      {({ year }) => <RangeCalendar.YearPickerCell year={year} />}
                                    </RangeCalendar.YearPickerGridBody>
                                  </RangeCalendar.YearPickerGrid>
                                </RangeCalendar>
                              </DateRangePicker.Popover>
                            </DateRangePicker>
                          </Accordion.Body>
                        </Accordion.Panel>
                      </Accordion.Item>
                    </Accordion>

                    {/* Keywords TagGroup */}
                    <Card variant="secondary">
                      <Card.Header>
                        <Card.Title>{t.settings.keywords}</Card.Title>
                        <Card.Description>{t.settings.keywordsDesc}</Card.Description>
                      </Card.Header>
                      <Card.Content className="space-y-3">
                        <TagGroup onRemove={(keys) => {
                          const updated = notifKeywords.filter((k) => !keys.has(k));
                          setNotifKeywords(updated);
                          api.updatePreferences(user.id, { notifKeywords: updated }).catch(() => {});
                        }}>
                          <Label className="sr-only">{t.settings.keywords}</Label>
                          <TagGroup.List className="flex flex-wrap gap-2">
                            {notifKeywords.map((kw) => (
                              <Tag key={kw} id={kw}>{kw}</Tag>
                            ))}
                          </TagGroup.List>
                        </TagGroup>
                        <div className="flex gap-2">
                          <Input
                            placeholder={t.settings.addKeyword}
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newKeyword.trim()) {
                                const updated = [...notifKeywords, newKeyword.trim()];
                                setNotifKeywords(updated);
                                api.updatePreferences(user.id, { notifKeywords: updated }).catch(() => {});
                                setNewKeyword('');
                              }
                            }}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            isDisabled={!newKeyword.trim()}
                            onPress={() => {
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
                      </Card.Content>
                    </Card>
                  </div>
                )}

                {/*  PRIVACY  */}
                {activeTab === 'privacy' && (
                  <div className="mx-auto max-w-2xl space-y-5">
                    <Breadcrumbs>
                      <Breadcrumbs.Item href="#">{t.common.settings}</Breadcrumbs.Item>
                      <Breadcrumbs.Item>{t.settings.privacy}</Breadcrumbs.Item>
                    </Breadcrumbs>

                    {/* Visibility settings */}
                    <Card variant="secondary">
                      <Card.Header>
                        <Card.Title className="flex items-center gap-2">
                          <ShieldIcon size={16} />
                          {t.settings.privacyTitle}
                          {/* Popover info */}
                          <Popover>
                            <Button isIconOnly variant="ghost" size="sm" aria-label={t.settings.privacyTitle}>
                              <HelpCircleIcon size={14} className="text-[var(--muted)]" />
                            </Button>
                            <Popover.Content className="max-w-56">
                              <Popover.Dialog>
                                <Popover.Arrow />
                                <Popover.Heading className="text-sm font-semibold">{t.settings.privacyTitle}</Popover.Heading>
                                <p className="mt-1 text-xs text-[var(--muted)]">{t.settings.privacyControlDesc}</p>
                              </Popover.Dialog>
                            </Popover.Content>
                          </Popover>
                        </Card.Title>
                        <Card.Description>{t.settings.privacyDesc}</Card.Description>
                      </Card.Header>
                      <Card.Content className="space-y-5">
                        <SettingsSwitch
                          label={t.settings.showOnlineStatus}
                          description={t.settings.showOnlineStatusDesc}
                          isSelected={showOnlineStatus}
                          onChange={(v) => { setShowOnlineStatus(v); savePrivacyPrefs(v, dmMode); }}
                        />
                        <Separator />
                        {/* Qui peut envoyer des DMs — pill selector */}
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground)]">{t.settings.allowDMs}</p>
                          <p className="mt-0.5 text-xs text-[var(--muted)] mb-3">{t.settings.allowDMsDesc}</p>
                          <div className="flex gap-2">
                            {([
                              { value: 'everyone', label: t.settings.dmEveryone },
                              { value: 'friends',  label: t.settings.dmFriends },
                              { value: 'none',     label: t.settings.dmNone },
                            ] as const).map(({ value, label }) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => { setDmMode(value); savePrivacyPrefs(showOnlineStatus, value); }}
                                className={cn(
                                  'flex-1 rounded-xl border px-3 py-2.5 text-[13px] transition-all',
                                  dmMode === value
                                    ? 'border-[var(--accent)]/50 bg-[var(--accent)]/10 font-semibold text-[var(--foreground)]'
                                    : 'border-[var(--border)]/40 bg-[var(--surface-secondary)]/30 text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]',
                                )}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </Card.Content>
                    </Card>

                    {/* Change Password */}
                    <Card variant="secondary">
                      <Card.Header>
                        <Card.Title className="flex items-center gap-2">
                          <KeyRoundIcon size={16} />
                          Changer le mot de passe
                        </Card.Title>
                        <Card.Description>Modifiez votre mot de passe de connexion.</Card.Description>
                      </Card.Header>
                      <Card.Content className="space-y-3">
                        <TextField className="w-full">
                          <Label>Mot de passe actuel</Label>
                          <InputGroup fullWidth variant="secondary">
                            <InputGroup.Input
                              type="password"
                              placeholder="••••••••"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                          </InputGroup>
                        </TextField>
                        <TextField className="w-full">
                          <Label>Nouveau mot de passe</Label>
                          <InputGroup fullWidth variant="secondary">
                            <InputGroup.Input
                              type="password"
                              placeholder="••••••••"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                            />
                          </InputGroup>
                          <Description className="text-xs text-[var(--muted)]">Minimum 8 caractères</Description>
                        </TextField>
                        <TextField className="w-full">
                          <Label>Confirmer le nouveau mot de passe</Label>
                          <InputGroup fullWidth variant="secondary">
                            <InputGroup.Input
                              type="password"
                              placeholder="••••••••"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                          </InputGroup>
                        </TextField>
                        <Button
                          size="sm"
                          onPress={handleChangePassword}
                          isDisabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                          className="gap-2"
                        >
                          {isChangingPassword ? <Spinner size="sm" color="current" /> : <KeyRoundIcon size={14} />}
                          Modifier le mot de passe
                        </Button>
                      </Card.Content>
                    </Card>

                    {/* 2FA TOTP */}
                    <Card variant="secondary">
                      <Card.Header>
                        <Card.Title className="flex items-center gap-2">
                          <LockIcon size={16} />
                          {t.settings.twoFATitle}
                        </Card.Title>
                        <Card.Description>
                          {twoFAEnabled
                            ? t.settings.twoFAEnabledDesc
                            : t.settings.twoFADisabledDesc}
                        </Card.Description>
                      </Card.Header>
                      <Card.Content className="space-y-4">
                        {twoFAStep === 'idle' && (
                          <>
                            {twoFAEnabled ? (
                              <div className="space-y-3">
                                <p className="text-sm text-[var(--muted)]">
                                  {t.settings.twoFADisablePrompt}
                                </p>
                                <InputOTP maxLength={6} value={twoFADisableCode} onChange={setTwoFADisableCode}>
                                  <InputOTP.Group>
                                    <InputOTP.Slot index={0} />
                                    <InputOTP.Slot index={1} />
                                    <InputOTP.Slot index={2} />
                                  </InputOTP.Group>
                                  <InputOTP.Separator />
                                  <InputOTP.Group>
                                    <InputOTP.Slot index={3} />
                                    <InputOTP.Slot index={4} />
                                    <InputOTP.Slot index={5} />
                                  </InputOTP.Group>
                                </InputOTP>
                                <Button variant="secondary" size="sm" isDisabled={twoFADisableCode.length < 6} isPending={twoFADisabling}
                                  onPress={async () => {
                                    setTwoFADisabling(true);
                                    const res = await api.disable2FA(twoFADisableCode);
                                    setTwoFADisabling(false);
                                    if (res.success) { setTwoFAEnabled(false); setTwoFADisableCode(''); } else { setTwoFADisableCode(''); }
                                  }}>
                                  {({ isPending }) => (<>{isPending ? <Spinner size="sm" color="current" /> : null}{t.settings.twoFADisableBtn}</>)}
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
                                {({ isPending }) => (<>{isPending ? <Spinner size="sm" color="current" /> : null}{t.settings.twoFAConfigureBtn}</>)}
                              </Button>
                            )}
                          </>
                        )}
                        {twoFAStep === 'setup' && (
                          <div className="space-y-4">
                            <p className="text-sm text-[var(--muted)]">{t.settings.twoFAScanPrompt}</p>
                            {twoFAQR && (<div className="flex justify-center"><img src={twoFAQR} alt="QR 2FA" className="size-44 rounded-lg" /></div>)}
                            <div className="rounded-lg bg-[var(--surface-tertiary)] p-3 font-mono text-xs break-all text-center text-[var(--muted)]">{twoFASecret}</div>
                            <p className="text-sm text-[var(--muted)]">{t.settings.twoFAEnterCode}</p>
                            <InputOTP maxLength={6} value={twoFACode} onChange={setTwoFACode}>
                              <InputOTP.Group>
                                <InputOTP.Slot index={0} />
                                <InputOTP.Slot index={1} />
                                <InputOTP.Slot index={2} />
                              </InputOTP.Group>
                              <InputOTP.Separator />
                              <InputOTP.Group>
                                <InputOTP.Slot index={3} />
                                <InputOTP.Slot index={4} />
                                <InputOTP.Slot index={5} />
                              </InputOTP.Group>
                            </InputOTP>
                            <div className="flex gap-2">
                              <Button size="sm" isDisabled={twoFACode.length < 6} isPending={twoFALoading}
                                onPress={async () => {
                                  setTwoFALoading(true);
                                  const res = await api.enable2FA(twoFACode);
                                  setTwoFALoading(false);
                                  if (res.success && res.data) { setTwoFABackupCodes((res.data as any).backupCodes ?? []); setTwoFAEnabled(true); setTwoFACode(''); setTwoFAStep('backup'); } else { setTwoFACode(''); }
                                }}>
                                {({ isPending }) => (<>{isPending ? <Spinner size="sm" color="current" /> : null}{t.settings.twoFAActivateBtn}</>)}
                              </Button>
                              <Button size="sm" variant="ghost" onPress={() => { setTwoFAStep('idle'); setTwoFACode(''); }}>{t.common.cancel}</Button>
                            </div>
                          </div>
                        )}
                        {twoFAStep === 'backup' && (
                          <div className="space-y-3">
                            <p className="text-sm font-semibold">{t.settings.twoFAEnabledAlert}</p>
                            <p className="text-sm text-[var(--muted)]">{t.settings.twoFABackupPrompt}</p>
                            <div className="grid grid-cols-2 gap-1 rounded-lg bg-[var(--surface-tertiary)] p-3">
                              {twoFABackupCodes.map((c) => (<span key={c} className="font-mono text-xs">{c}</span>))}
                            </div>
                            <Button size="sm" onPress={() => setTwoFAStep('idle')}>{t.common.close}</Button>
                          </div>
                        )}
                      </Card.Content>
                    </Card>

                    {/* Sessions actives */}
                    <Card variant="secondary">
                      <Card.Header>
                        <div className="flex items-center justify-between">
                          <div>
                            <Card.Title className="flex items-center gap-2">
                              <KeyRoundIcon size={16} />
                              Sessions actives
                            </Card.Title>
                            <Card.Description>Appareils connectés à votre compte</Card.Description>
                          </div>
                          <Tooltip delay={0}>
                            <Button size="sm" variant="secondary" onPress={handleRevokeAllSessions} isDisabled={isRevokingAll}>
                              {isRevokingAll ? <Spinner size="sm" color="current" /> : <AlertTriangleIcon size={14} />}
                              {t.settings.revokeAll}
                            </Button>
                            <Tooltip.Content showArrow placement="top">
                              <Tooltip.Arrow />
                              <p className="text-xs">{t.settings.revokeAllTooltip}</p>
                            </Tooltip.Content>
                          </Tooltip>
                        </div>
                      </Card.Header>
                      <Card.Content>
                        <Table>
                          <Table.ScrollContainer>
                            <Table.Content aria-label={t.settings.sessionsTitle}>
                              <Table.Header>
                                <Table.Column isRowHeader>{t.settings.sessionDevice}</Table.Column>
                                <Table.Column>{t.settings.sessionIP}</Table.Column>
                                <Table.Column>{t.settings.sessionConnection}</Table.Column>
                                <Table.Column>{t.settings.sessionAction}</Table.Column>
                              </Table.Header>
                              <Table.Body>
                                {sessionsLoading ? (
                                  <Table.Row>
                                    <Table.Cell colSpan={4} className="text-center py-4">
                                      <Spinner size="sm" />
                                    </Table.Cell>
                                  </Table.Row>
                                ) : sessions.length === 0 ? (
                                  <Table.Row>
                                    <Table.Cell colSpan={4} className="text-center text-sm text-[var(--muted)] py-4">
                                      {t.settings.sessionsEmpty}
                                    </Table.Cell>
                                  </Table.Row>
                                ) : (
                                  sessions.map((session) => {
                                    const { browser, os, icon } = parseUserAgent(session.userAgent);
                                    const currentSessionId = typeof window !== 'undefined' ? localStorage.getItem('alfychat_session_id') : null;
                                    const isCurrent = session.id === currentSessionId;
                                    const date = new Date(session.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
                                    // Normaliser l'IP côté affichage aussi (double sécurité)
                                    const displayIP = session.ipAddress
                                      ? session.ipAddress.startsWith('::ffff:')
                                        ? session.ipAddress.slice(7)
                                        : session.ipAddress === '::1' ? '127.0.0.1' : session.ipAddress
                                      : '—';
                                    return (
                                      <Table.Row key={session.id}>
                                        <Table.Cell>
                                          <div className="flex items-center gap-2">
                                            <span className="text-base leading-none">{icon}</span>
                                            <div className="flex flex-col">
                                              <span className="text-sm font-medium">{os}</span>
                                              <span className="text-xs text-[var(--muted)]">{browser}</span>
                                            </div>
                                            {isCurrent && (
                                              <Chip color="success" variant="soft" size="sm">
                                                <Chip.Label>{t.settings.sessionCurrent}</Chip.Label>
                                              </Chip>
                                            )}
                                          </div>
                                        </Table.Cell>
                                        <Table.Cell className="font-mono text-sm text-[var(--muted)]">{displayIP}</Table.Cell>
                                        <Table.Cell className="text-sm text-[var(--muted)]">{date}</Table.Cell>
                                        <Table.Cell>
                                          {!isCurrent && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="text-red-500"
                                              onPress={async () => {
                                                const res = await api.revokeSession(session.id);
                                                if (res.success) {
                                                  setSessions((prev) => prev.filter((s) => s.id !== session.id));
                                                  toast.success(t.settings.sessionRevoked);
                                                } else {
                                                  toast.danger(t.settings.sessionRevokeError);
                                                }
                                              }}
                                            >
                                              <Trash2Icon size={14} />
                                            </Button>
                                          )}
                                        </Table.Cell>
                                      </Table.Row>
                                    );
                                  })
                                )}
                              </Table.Body>
                            </Table.Content>
                          </Table.ScrollContainer>
                        </Table>
                      </Card.Content>
                    </Card>

                    {/* Calendrier compte */}
                    <Card variant="secondary">
                      <Card.Header>
                        <Card.Title>{t.settings.accountCalendar}</Card.Title>
                        <Card.Description>{t.settings.accountCalendarDesc}</Card.Description>
                      </Card.Header>
                      <Card.Content className="flex justify-center overflow-auto">
                        <Calendar aria-label={t.settings.accountCalendar} isReadOnly>
                          <Calendar.Header>
                            <Calendar.Heading />
                            <Calendar.NavButton slot="previous" />
                            <Calendar.NavButton slot="next" />
                          </Calendar.Header>
                          <Calendar.Grid>
                            <Calendar.GridHeader>
                              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                            </Calendar.GridHeader>
                            <Calendar.GridBody>
                              {(date) => <Calendar.Cell date={date} />}
                            </Calendar.GridBody>
                          </Calendar.Grid>
                        </Calendar>
                      </Card.Content>
                    </Card>

                    {/* Legal links */}
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <Link href="#" className="hover:underline text-accent">
                        {t.settings.privacyPolicyLink}
                      </Link>
                      <Link href="#" className="hover:underline text-accent">
                        {t.settings.termsLink}
                      </Link>
                    </div>

                    {/* Supprimer le compte  AlertDialog */}
                    <Card variant="secondary" className="border-red-500/30">
                      <Card.Header>
                        <Card.Title className="text-red-500">{t.settings.dangerZone}</Card.Title>
                        <Card.Description>{t.settings.dangerZoneDesc}</Card.Description>
                      </Card.Header>
                      <Card.Content>
                        <AlertDialog>
                          <Button variant="danger">
                            <Trash2Icon size={16} />
                            {t.settings.deleteAccount}
                          </Button>
                          <AlertDialog.Backdrop variant="blur">
                            <AlertDialog.Container size="sm">
                              <AlertDialog.Dialog>
                                <AlertDialog.CloseTrigger />
                                <AlertDialog.Header>
                                  <AlertDialog.Icon status="danger" />
                                  <AlertDialog.Heading>{t.settings.deleteAccountTitle}</AlertDialog.Heading>
                                </AlertDialog.Header>
                                <AlertDialog.Body>
                                  <p className="text-sm text-[var(--muted)]">{t.settings.deleteAccountBody}</p>
                                  <TextField className="mt-4 w-full">
                                    <Label>{t.settings.deletePasswordLabel}</Label>
                                    <InputGroup fullWidth variant="secondary">
                                      <InputGroup.Input
                                        type="password"
                                        placeholder={t.settings.deletePasswordPlaceholder}
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                      />
                                    </InputGroup>
                                  </TextField>
                                </AlertDialog.Body>
                                <AlertDialog.Footer>
                                  <Button slot="close" variant="tertiary" onPress={() => setDeletePassword('')}>{t.common.cancel}</Button>
                                  <Button
                                    variant="danger"
                                    isDisabled={isDeletingAccount || !deletePassword.trim()}
                                    onPress={handleDeleteAccount}
                                  >
                                    {isDeletingAccount && <Spinner size="sm" color="current" />}
                                    {t.settings.deleteConfirm}
                                  </Button>
                                </AlertDialog.Footer>
                              </AlertDialog.Dialog>
                            </AlertDialog.Container>
                          </AlertDialog.Backdrop>
                        </AlertDialog>
                      </Card.Content>
                    </Card>
                  </div>
                )}

                {/*  APPEARANCE  */}
                {activeTab === 'appearance' && (
                  <div className="mx-auto max-w-2xl space-y-5">
                    <Breadcrumbs>
                      <Breadcrumbs.Item href="#">{t.common.settings}</Breadcrumbs.Item>
                      <Breadcrumbs.Item>{t.settings.appearance}</Breadcrumbs.Item>
                    </Breadcrumbs>

                    {/* Mode clair/sombre  ButtonGroup */}
                    <Card variant="secondary">
                      <Card.Header>
                        <Card.Title>{t.settings.mode}</Card.Title>
                        <Card.Description>{t.settings.modeDesc}</Card.Description>
                      </Card.Header>
                      <Card.Content>
                        <ButtonGroup>
                          <Button
                            variant={theme === 'dark' ? 'primary' : 'secondary'}
                            onPress={() => setTheme('dark')}
                          >
                            <MoonIcon size={14} />
                            {t.settings.dark}
                          </Button>
                          <Button
                            variant={theme === 'light' ? 'primary' : 'secondary'}
                            onPress={() => setTheme('light')}
                          >
                            <SunIcon size={14} />
                            {t.settings.light}
                          </Button>
                          <Button
                            variant={theme === 'system' ? 'primary' : 'secondary'}
                            onPress={() => setTheme('system')}
                          >
                            <MonitorIcon size={14} />
                            {t.settings.system}
                          </Button>
                        </ButtonGroup>
                      </Card.Content>
                    </Card>

                    {/* Font family ComboBox */}
                    <Card variant="secondary">
                      <Card.Header>
                        <Card.Title>{t.settings.fontFamily}</Card.Title>
                        <Card.Description>{t.settings.fontFamilyDesc}</Card.Description>
                      </Card.Header>
                      <Card.Content>
                        <ComboBox className="w-full max-w-xs" selectedKey={fontFamily} onSelectionChange={(k) => { if (k) applyFont(k as string); }}>
                          <Label>{t.settings.fontLabel}</Label>
                          <ComboBox.InputGroup>
                            <Input placeholder={t.settings.fontPlaceholder} />
                            <ComboBox.Trigger />
                          </ComboBox.InputGroup>
                          <ComboBox.Popover>
                            <ListBox>
                              {FONTS.map((f) => (
                                <ListBox.Item key={f.id} id={f.id} textValue={f.label}>
                                  {f.label}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </ComboBox.Popover>
                        </ComboBox>
                      </Card.Content>
                    </Card>

                    {/* Wallpaper + Glassmorphism */}
                    <Card variant="secondary">
                      <Card.Header>
                        <Card.Title>Image de fond & Glassmorphisme</Card.Title>
                        <Card.Description>Choisissez une image de fond. L'interface devient automatiquement en verre dépoli.</Card.Description>
                      </Card.Header>
                      <Card.Content className="space-y-5">
                        {/* Hidden file input */}
                        <input
                          ref={wallpaperInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const result = ev.target?.result as string;
                              if (result) setWallpaper(result);
                            };
                            reader.readAsDataURL(file);
                            e.target.value = '';
                          }}
                        />

                        {/* Preset wallpapers */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-[var(--foreground)]">Fonds prédéfinis</p>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { label: 'Aurore', value: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80' },
                              { label: 'Forêt', value: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80' },
                              { label: 'Nuit', value: 'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=1920&q=80' },
                              { label: 'Montagne', value: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80' },
                              { label: 'Océan', value: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=80' },
                              { label: 'Abstrait', value: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80' },
                            ].map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => setWallpaper(preset.value)}
                                className={`relative h-14 w-20 overflow-hidden rounded-lg border-2 transition-all hover:scale-105 ${wallpaper === preset.value ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}
                                title={preset.label}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={preset.value} alt={preset.label} className="h-full w-full object-cover" />
                                <span className="absolute inset-x-0 bottom-0 bg-black/50 py-0.5 text-center text-[10px] text-white">{preset.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Upload + clear */}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onPress={() => wallpaperInputRef.current?.click()}
                          >
                            <UploadIcon size={14} />
                            Importer une image
                          </Button>
                          {wallpaper && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onPress={() => setWallpaper(null)}
                            >
                              <XIcon size={14} />
                              Supprimer le fond
                            </Button>
                          )}
                        </div>

                        {/* Current preview */}
                        {wallpaper && (
                          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={wallpaper}
                              alt="Aperçu du fond"
                              className="h-28 w-full object-cover"
                            />
                          </div>
                        )}

                        {/* Blur & opacity sliders — only visible when wallpaper is set */}
                        {wallpaper && (
                          <div className="space-y-4">
                            <Slider
                              aria-label="Flou du verre"
                              minValue={0}
                              maxValue={40}
                              step={1}
                              value={blur}
                              onChange={(v) => setBlur(Array.isArray(v) ? v[0] : v)}
                              className="w-full"
                            >
                              <div className="flex items-center justify-between">
                                <Label>Flou du verre</Label>
                                <Slider.Output />
                              </div>
                              <Slider.Track>
                                <Slider.Fill />
                                <Slider.Thumb />
                              </Slider.Track>
                            </Slider>
                            <Slider
                              aria-label="Opacité des panneaux"
                              minValue={20}
                              maxValue={95}
                              step={5}
                              value={opacity}
                              onChange={(v) => setOpacity(Array.isArray(v) ? v[0] : v)}
                              className="w-full"
                            >
                              <div className="flex items-center justify-between">
                                <Label>Opacité des panneaux</Label>
                                <Slider.Output />
                              </div>
                              <Slider.Track>
                                <Slider.Fill />
                                <Slider.Thumb />
                              </Slider.Track>
                            </Slider>
                          </div>
                        )}
                      </Card.Content>
                    </Card>
                  </div>
                )}

                {/*  LANGUAGE  */}
                {activeTab === 'language' && (
                  <div className="mx-auto max-w-2xl space-y-5">
                    <Breadcrumbs>
                      <Breadcrumbs.Item href="#">{t.common.settings}</Breadcrumbs.Item>
                      <Breadcrumbs.Item>{t.settings.language}</Breadcrumbs.Item>
                    </Breadcrumbs>

                    <Card variant="secondary">
                      <Card.Header>
                        <Card.Title>{t.settings.langInterfaceTitle}</Card.Title>
                        <Card.Description>{t.settings.langInterfaceDesc}</Card.Description>
                      </Card.Header>
                      <Card.Content className="space-y-4">
                        <SearchField value={langSearch} onChange={setLangSearch}>
                          <Label>{t.settings.searchLang}</Label>
                          <SearchField.Group>
                            <SearchField.SearchIcon />
                            <SearchField.Input placeholder={t.settings.searchPlaceholder} />
                            <SearchField.ClearButton />
                          </SearchField.Group>
                        </SearchField>
                        <LanguageSwitcher variant="full" filter={langSearch} />
                      </Card.Content>
                    </Card>
                  </div>
                )}

                {activeTab === 'layout' && (
                  <div className="mx-auto max-w-2xl space-y-5">
                    <Breadcrumbs>
                      <Breadcrumbs.Item href="#">{t.common.settings}</Breadcrumbs.Item>
                      <Breadcrumbs.Item>Mise en page</Breadcrumbs.Item>
                    </Breadcrumbs>

                    {/* Server list position */}
                    <Card variant="secondary">
                      <Card.Header>
                        <Card.Title>Position de la liste des serveurs</Card.Title>
                        <Card.Description>Choisissez où apparaît la liste des icônes de serveurs</Card.Description>
                      </Card.Header>
                      <Card.Content>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {([
                            {
                              id: 'left', label: 'Gauche',
                              preview: (
                                <div className="flex h-12 w-full gap-0.5 overflow-hidden rounded-md border border-[var(--border)]/20 bg-[var(--background)]/50 p-0.5">
                                  <div className="w-2 rounded-sm bg-[var(--accent)]/50" />
                                  <div className="w-3.5 rounded-sm bg-[var(--surface-secondary)]/50" />
                                  <div className="flex-1 rounded-sm bg-[var(--surface-secondary)]/20" />
                                </div>
                              ),
                            },
                            {
                              id: 'right', label: 'Droite',
                              preview: (
                                <div className="flex h-12 w-full gap-0.5 overflow-hidden rounded-md border border-[var(--border)]/20 bg-[var(--background)]/50 p-0.5">
                                  <div className="flex-1 rounded-sm bg-[var(--surface-secondary)]/20" />
                                  <div className="w-3.5 rounded-sm bg-[var(--surface-secondary)]/50" />
                                  <div className="w-2 rounded-sm bg-[var(--accent)]/50" />
                                </div>
                              ),
                            },
                            {
                              id: 'top', label: 'Haut',
                              preview: (
                                <div className="flex h-12 w-full flex-col gap-0.5 overflow-hidden rounded-md border border-[var(--border)]/20 bg-[var(--background)]/50 p-0.5">
                                  <div className="h-2 w-full rounded-sm bg-[var(--accent)]/50" />
                                  <div className="flex flex-1 gap-0.5">
                                    <div className="w-3.5 rounded-sm bg-[var(--surface-secondary)]/50" />
                                    <div className="flex-1 rounded-sm bg-[var(--surface-secondary)]/20" />
                                  </div>
                                </div>
                              ),
                            },
                            {
                              id: 'bottom', label: 'Bas',
                              preview: (
                                <div className="flex h-12 w-full flex-col gap-0.5 overflow-hidden rounded-md border border-[var(--border)]/20 bg-[var(--background)]/50 p-0.5">
                                  <div className="flex flex-1 gap-0.5">
                                    <div className="w-3.5 rounded-sm bg-[var(--surface-secondary)]/50" />
                                    <div className="flex-1 rounded-sm bg-[var(--surface-secondary)]/20" />
                                  </div>
                                  <div className="h-2 w-full rounded-sm bg-[var(--accent)]/50" />
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
                                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                                  : 'border-[var(--border)]/30 bg-[var(--surface-secondary)]/20 text-[var(--muted)] hover:border-[var(--border)]/60',
                              )}
                            >
                              {preview}
                              <span>{label}</span>
                            </button>
                          ))}
                        </div>
                      </Card.Content>
                    </Card>

                    {/* Member list position */}
                    <Card variant="secondary">
                      <Card.Header>
                        <Card.Title>Position de la liste des membres</Card.Title>
                        <Card.Description>Visible uniquement dans les serveurs (côté de la liste des membres)</Card.Description>
                      </Card.Header>
                      <Card.Content>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => updateLayoutPrefs({ memberListSide: 'left' })}
                            className={cn(
                              'flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition-all duration-150',
                              layoutPrefs.memberListSide === 'left'
                                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                                : 'border-[var(--border)]/30 bg-[var(--surface-secondary)]/20 text-[var(--muted)] hover:border-[var(--border)]/60',
                            )}
                          >
                            <div className="flex h-14 w-full gap-1 overflow-hidden rounded-lg border border-[var(--border)]/20 bg-[var(--background)]/50 p-1">
                              <div className="w-7 rounded-sm bg-emerald-500/30" />
                              <div className="flex-1 rounded-sm bg-[var(--surface-secondary)]/20" />
                            </div>
                            <span>Gauche</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => updateLayoutPrefs({ memberListSide: 'right' })}
                            className={cn(
                              'flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition-all duration-150',
                              layoutPrefs.memberListSide === 'right'
                                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                                : 'border-[var(--border)]/30 bg-[var(--surface-secondary)]/20 text-[var(--muted)] hover:border-[var(--border)]/60',
                            )}
                          >
                            <div className="flex h-14 w-full gap-1 overflow-hidden rounded-lg border border-[var(--border)]/20 bg-[var(--background)]/50 p-1">
                              <div className="flex-1 rounded-sm bg-[var(--surface-secondary)]/20" />
                              <div className="w-7 rounded-sm bg-emerald-500/30" />
                            </div>
                            <span>Droite</span>
                          </button>
                        </div>
                      </Card.Content>
                    </Card>

                    {/* Compact server list */}
                    <Card variant="secondary">
                      <Card.Content className="pt-4">
                        <SettingsSwitch
                          label="Liste des serveurs compacte"
                          description="Affiche des icônes plus petites pour gagner de l'espace"
                          isSelected={layoutPrefs.compactServerList}
                          onChange={(v) => updateLayoutPrefs({ compactServerList: v })}
                        />
                      </Card.Content>
                    </Card>

                    {/* UI Style */}
                    <Card variant="secondary">
                      <Card.Header>
                        <Card.Title>Style de l&apos;interface</Card.Title>
                        <Card.Description>Choisissez entre un style vitré arrondi ou un style plat comme Discord</Card.Description>
                      </Card.Header>
                      <Card.Content>
                        <div className="grid grid-cols-2 gap-3">
                          {([
                            {
                              id: 'glass' as const,
                              label: 'Vitré arrondi',
                              preview: (
                                <div className="flex h-14 w-full gap-1 overflow-hidden rounded-xl border border-[var(--border)]/20 bg-[var(--background)]/50 p-1.5">
                                  <div className="w-4 rounded-xl bg-[var(--accent)]/40 backdrop-blur-sm" />
                                  <div className="w-6 rounded-xl bg-[var(--surface-secondary)]/50 backdrop-blur-sm" />
                                  <div className="flex-1 rounded-xl bg-[var(--surface-secondary)]/20 backdrop-blur-sm" />
                                  <div className="w-5 rounded-xl bg-[var(--surface-secondary)]/30 backdrop-blur-sm" />
                                </div>
                              ),
                            },
                            {
                              id: 'flat' as const,
                              label: 'Plat (Discord)',
                              preview: (
                                <div className="flex h-14 w-full gap-0 overflow-hidden rounded-md border border-[var(--border)]/20 bg-[var(--background)]/50">
                                  <div className="w-4 bg-[var(--accent)]/40" />
                                  <div className="w-6 bg-[var(--surface-secondary)]/50" />
                                  <div className="flex-1 bg-[var(--surface-secondary)]/20" />
                                  <div className="w-5 bg-[var(--surface-secondary)]/30" />
                                </div>
                              ),
                            },
                          ]).map(({ id, label, preview }) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => updateLayoutPrefs({ uiStyle: id })}
                              className={cn(
                                'flex flex-col items-center gap-2 rounded-xl border-2 p-2.5 text-xs font-medium transition-all duration-150',
                                layoutPrefs.uiStyle === id
                                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                                  : 'border-[var(--border)]/30 bg-[var(--surface-secondary)]/20 text-[var(--muted)] hover:border-[var(--border)]/60',
                              )}
                            >
                              {preview}
                              <span>{label}</span>
                            </button>
                          ))}
                        </div>
                      </Card.Content>
                    </Card>
                  </div>
                )}

              </div>
            </div>
          </div>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}