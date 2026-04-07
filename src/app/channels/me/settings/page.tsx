'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeftIcon,
  UserIcon,
  PaletteIcon,
  BellIcon,
  ShieldIcon,
  LogOutIcon,
  CameraIcon,
  ImageIcon,
  SaveIcon,
  EyeIcon,
  EyeOffIcon,
} from '@/components/icons';
import { useAuth } from '@/hooks/use-auth';
import { socketService } from '@/lib/socket';
import { api } from '@/lib/api';
import { Avatar, Button, Separator, Switch, Tabs } from '@heroui/react';

const CARD_COLOR_PRESETS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#64748b', // slate
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, updateUser, logout } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Profile form state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [cardColor, setCardColor] = useState('#6366f1');
  const [showBadges, setShowBadges] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Notification settings
  const [notifSound, setNotifSound] = useState(true);
  const [notifDesktop, setNotifDesktop] = useState(true);
  const [notifDM, setNotifDM] = useState(true);
  const [notifMentions, setNotifMentions] = useState(true);

  // Privacy settings
  const [allowDMs, setAllowDMs] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);

  // Active tab
  const [activeTab, setActiveTab] = useState<string | number>('profile');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.username || '');
      setBio((user as any).bio || '');
      setCardColor((user as any).cardColor || '#6366f1');
      setShowBadges((user as any).showBadges !== false);
      setAvatarPreview(user.avatarUrl || null);
      setBannerPreview((user as any).bannerUrl || null);
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const data: Record<string, any> = {
        displayName: displayName.trim(),
        bio: bio.trim(),
        cardColor,
        showBadges,
      };

      // If avatar changed and is a data URL (new upload)
      if (avatarPreview && avatarPreview.startsWith('data:')) {
        data.avatarUrl = avatarPreview;
      }

      // If banner changed and is a data URL (new upload)
      if (bannerPreview && bannerPreview.startsWith('data:')) {
        data.bannerUrl = bannerPreview;
      }

      socketService.updateProfile(data);

      // Update local state optimistically
      updateUser(data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Erreur sauvegarde profil:', error);
    }
    setIsSaving(false);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (isLoading || !user) {
    return (
      <div className="relative flex h-dvh items-center justify-center overflow-hidden bg-[var(--background)]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0_280/3%)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_280/3%)_1px,transparent_1px)] bg-size-[72px_72px]" />
        <p className="relative z-10 text-sm text-[var(--muted)]">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh bg-[var(--background)]">
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--border)]/40 px-2 md:gap-3 md:px-4">
          <Button variant="ghost" size="sm" isIconOnly onPress={() => router.push('/channels/me')}>
            <HugeiconsIcon icon={ArrowLeftIcon} size={20} />
          </Button>
          <h1 className="text-base font-semibold md:text-lg text-[var(--foreground)]">Paramètres</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl p-3 md:p-6">
            <Tabs selectedKey={activeTab} onSelectionChange={setActiveTab}>
              <Tabs.List className="mb-4 w-full md:mb-6">
                <Tabs.Tab id="profile" className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
                  <HugeiconsIcon icon={UserIcon} size={16} />
                  <span className="hidden sm:inline">Profil</span>
                </Tabs.Tab>
                <Tabs.Tab id="notifications" className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
                  <HugeiconsIcon icon={BellIcon} size={16} />
                  <span className="hidden sm:inline">Notifications</span>
                </Tabs.Tab>
                <Tabs.Tab id="privacy" className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
                  <HugeiconsIcon icon={ShieldIcon} size={16} />
                  <span className="hidden sm:inline">Confidentialité</span>
                </Tabs.Tab>
                <Tabs.Tab id="appearance" className="flex items-center gap-1.5 text-xs sm:gap-2 sm:text-sm">
                  <HugeiconsIcon icon={PaletteIcon} size={16} />
                  <span className="hidden sm:inline">Apparence</span>
                </Tabs.Tab>
              </Tabs.List>

              {/* ── Profile Tab ── */}
              <Tabs.Panel id="profile" className="space-y-6">
                {/* Banner */}
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
                      {bannerPreview ? (
                        <img
                          src={bannerPreview}
                          alt="Bannière"
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-[var(--muted)]">
                          <HugeiconsIcon icon={ImageIcon} size={20} className="mr-2" />
                          Cliquez pour ajouter une bannière
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                        <HugeiconsIcon icon={CameraIcon} size={32} className="text-white" />
                      </div>
                    </div>
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleBannerChange}
                    />
                  </div>
                </div>

                {/* Avatar + Display Name */}
                <div className="overflow-hidden rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)]/30">
                  <div className="border-b border-[var(--border)]/60 px-5 py-4">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Informations du profil</h3>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">Personnalisez votre apparence sur AlfyChat</p>
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="flex items-center gap-4">
                      <div
                        className="relative cursor-pointer"
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        <Avatar className="size-16">
                          {avatarPreview && <Avatar.Image src={avatarPreview} alt="Avatar" />}
                          <Avatar.Fallback>{displayName?.[0]?.toUpperCase() || '?'}</Avatar.Fallback>
                        </Avatar>
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                          <HugeiconsIcon icon={CameraIcon} size={20} className="text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-[var(--muted)]">
                          Cliquez sur l&apos;avatar pour le modifier
                        </p>
                      </div>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </div>

                    <Separator className="border-[var(--border)]/40" />

                    <div>
                      <label htmlFor="display-name" className="text-sm font-medium text-[var(--foreground)]">Nom d&apos;affichage</label>
                      <input
                        id="display-name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Votre nom d'affichage"
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        maxLength={32}
                      />
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        C&apos;est le nom que les autres utilisateurs voient.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="username" className="text-sm font-medium text-[var(--foreground)]">Nom d&apos;utilisateur</label>
                      <input
                        id="username"
                        value={user.username}
                        disabled
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] opacity-50 placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      />
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Le nom d&apos;utilisateur ne peut pas être modifié.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="bio" className="text-sm font-medium text-[var(--foreground)]">Bio</label>
                      <textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Parlez de vous..."
                        className="mt-1 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        rows={3}
                        maxLength={200}
                      />
                      <p className="mt-1 text-right text-xs text-[var(--muted)]">
                        {bio.length}/200
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Color */}
                <div className="overflow-hidden rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)]/30">
                  <div className="border-b border-[var(--border)]/60 px-5 py-4">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Couleur du profil</h3>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">Couleur de votre carte de profil</p>
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap gap-2">
                      {CARD_COLOR_PRESETS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`size-8 rounded-full border-2 transition-transform hover:scale-110 ${
                            cardColor === color
                              ? 'border-[var(--foreground)] scale-110'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setCardColor(color)}
                        />
                      ))}
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={cardColor}
                          onChange={(e) => setCardColor(e.target.value)}
                          className="size-8 cursor-pointer rounded-full border-0 p-0"
                        />
                      </div>
                    </div>

                    {/* Preview card */}
                    <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border)]/40">
                      <div className="h-16" style={{ backgroundColor: cardColor }} />
                      <div className="relative px-4 pb-4">
                        <Avatar className="size-16 -mt-6 border-4 border-[var(--surface)]">
                          {avatarPreview && <Avatar.Image src={avatarPreview} alt="Avatar" />}
                          <Avatar.Fallback>{displayName?.[0]?.toUpperCase() || '?'}</Avatar.Fallback>
                        </Avatar>
                        <p className="mt-2 font-semibold text-[var(--foreground)]">{displayName || 'Nom'}</p>
                        {bio && (
                          <p className="mt-1 text-sm text-[var(--muted)]">{bio}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="overflow-hidden rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)]/30">
                  <div className="border-b border-[var(--border)]/60 px-5 py-4">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Badges</h3>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">Gérez la visibilité de vos badges sur votre profil</p>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {showBadges ? (
                          <HugeiconsIcon icon={EyeIcon} size={16} className="text-[var(--muted)]" />
                        ) : (
                          <HugeiconsIcon icon={EyeOffIcon} size={16} className="text-[var(--muted)]" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground)]">Afficher les badges</p>
                          <p className="text-xs text-[var(--muted)]">
                            Les badges seront visibles sur votre profil
                          </p>
                        </div>
                      </div>
                      <Switch isSelected={showBadges} onChange={() => setShowBadges(!showBadges)}>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                    </div>
                  </div>
                </div>

                {/* Save button */}
                <div className="flex items-center gap-3">
                  <Button onPress={handleSaveProfile} isDisabled={isSaving} className="gap-2">
                    <HugeiconsIcon icon={SaveIcon} size={16} />
                    {isSaving ? 'Sauvegarde...' : 'Sauvegarder le profil'}
                  </Button>
                  {saveSuccess && (
                    <p className="text-sm text-green-500">Profil sauvegardé !</p>
                  )}
                </div>
              </Tabs.Panel>

              {/* ── Notifications Tab ── */}
              <Tabs.Panel id="notifications" className="space-y-6">
                <div className="overflow-hidden rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)]/30">
                  <div className="border-b border-[var(--border)]/60 px-5 py-4">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Notifications</h3>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">Configurez comment vous êtes notifié</p>
                  </div>
                  <div className="divide-y divide-[var(--border)]/40">
                    <div className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">Son de notification</p>
                        <p className="text-xs text-[var(--muted)]">
                          Jouer un son lors de la réception d&apos;un message
                        </p>
                      </div>
                      <Switch isSelected={notifSound} onChange={() => setNotifSound(!notifSound)}>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                    </div>
                    <div className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">Notifications bureau</p>
                        <p className="text-xs text-[var(--muted)]">
                          Afficher les notifications sur le bureau
                        </p>
                      </div>
                      <Switch isSelected={notifDesktop} onChange={() => setNotifDesktop(!notifDesktop)}>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                    </div>
                    <div className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">Messages privés</p>
                        <p className="text-xs text-[var(--muted)]">
                          Notifications pour les messages privés
                        </p>
                      </div>
                      <Switch isSelected={notifDM} onChange={() => setNotifDM(!notifDM)}>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                    </div>
                    <div className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">Mentions</p>
                        <p className="text-xs text-[var(--muted)]">
                          Notifications quand on vous mentionne
                        </p>
                      </div>
                      <Switch isSelected={notifMentions} onChange={() => setNotifMentions(!notifMentions)}>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                    </div>
                  </div>
                </div>
              </Tabs.Panel>

              {/* ── Privacy Tab ── */}
              <Tabs.Panel id="privacy" className="space-y-6">
                <div className="overflow-hidden rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)]/30">
                  <div className="border-b border-[var(--border)]/60 px-5 py-4">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Confidentialité</h3>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">Contrôlez qui peut interagir avec vous</p>
                  </div>
                  <div className="divide-y divide-[var(--border)]/40">
                    <div className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">Autoriser les messages privés</p>
                        <p className="text-xs text-[var(--muted)]">
                          Les non-amis peuvent vous envoyer des messages
                        </p>
                      </div>
                      <Switch isSelected={allowDMs} onChange={() => setAllowDMs(!allowDMs)}>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                    </div>
                    <div className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">Afficher le statut en ligne</p>
                        <p className="text-xs text-[var(--muted)]">
                          Les autres peuvent voir quand vous êtes en ligne
                        </p>
                      </div>
                      <Switch isSelected={showOnlineStatus} onChange={() => setShowOnlineStatus(!showOnlineStatus)}>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                      </Switch>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-red-500/30 bg-red-500/5">
                  <div className="border-b border-red-500/20 px-5 py-4">
                    <h3 className="text-sm font-semibold text-red-500">Zone dangereuse</h3>
                  </div>
                  <div className="p-5">
                    <Button
                      variant="danger"
                      className="w-full gap-2"
                      onPress={handleLogout}
                    >
                      <HugeiconsIcon icon={LogOutIcon} size={16} />
                      Se déconnecter
                    </Button>
                  </div>
                </div>
              </Tabs.Panel>

              {/* ── Appearance Tab ── */}
              <Tabs.Panel id="appearance" className="space-y-6">
                <div className="overflow-hidden rounded-2xl border border-[var(--border)]/60 bg-[var(--surface)]/30">
                  <div className="border-b border-[var(--border)]/60 px-5 py-4">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Apparence</h3>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">Personnalisez l&apos;apparence de l&apos;application</p>
                  </div>
                  <div className="p-5">
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">Thème</p>
                      <p className="text-xs text-[var(--muted)]">
                        Le thème sombre est activé par défaut.
                      </p>
                      <div className="mt-3 flex gap-3">
                        <div className="flex-1 cursor-pointer rounded-xl border-2 border-[var(--accent)] p-3 text-center">
                          <div className="mx-auto mb-2 h-12 rounded-lg bg-[#1a1a2e]" />
                          <p className="text-sm font-medium text-[var(--foreground)]">Sombre</p>
                        </div>
                        <div className="flex-1 cursor-not-allowed rounded-xl border border-[var(--border)]/40 p-3 text-center opacity-40">
                          <div className="mx-auto mb-2 h-12 rounded-lg bg-[#f5f5f7]" />
                          <p className="text-sm font-medium text-[var(--foreground)]">Clair</p>
                          <p className="text-xs text-[var(--muted)]">Bientôt</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Tabs.Panel>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
