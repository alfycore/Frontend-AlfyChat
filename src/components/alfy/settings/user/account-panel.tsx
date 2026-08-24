'use client';

import {
  Avatar,
  Button,
  Chip,
  Input,
  Label,
  Spinner,
  TextArea,
  TextField,
  toast,
} from '@heroui/react';
import { AtSign, Camera, Check, ImageUp, Lock, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import { CURRENT_USER } from '@/components/alfy/mock/data';
import type { AlfyUser } from '@/components/alfy/mock/types';
import { UserBadges } from '@/components/alfy/members/user-badges';
import { usePresenceLabels } from '@/components/alfy/primitives/status-dot';
import { useTranslation } from '@/components/locale-provider';
import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { cn } from '@/lib/utils';

const memberSince = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

const BIO_MAX = 190;
const STATUT_MAX = 60;

/** Initiales de repli quand aucun avatar n'est défini. */
const initiales = (nom: string) =>
  nom
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

export interface AccountProfilePatch {
  displayName: string;
  bio: string;
  avatarUrl?: string;
  bannerUrl?: string;
  /** Porté par la présence temps réel, pas par l'API profil. */
  customStatus?: string;
}

interface AccountPanelProps {
  /** Profil réel ; sans lui, jeu de démonstration. */
  user?: AlfyUser;
  /** Renvoie si l'enregistrement a réellement réussi — pilote le toast de retour. */
  onSave?: (data: AccountProfilePatch) => Promise<boolean> | void;
}

/* ══════════════════════════════════════════════════════════════════════════
 * Briques locales — zéro bordure : les zones se séparent par le fond.
 * ══════════════════════════════════════════════════════════════════════════ */

function Bloc({
  titre,
  intro,
  delai = 0,
  children,
}: {
  titre: string;
  intro?: string;
  delai?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="at-fade-up mb-10" style={{ animationDelay: `${delai}ms` } as CSSProperties}>
      <h3 className="font-heading text-lg tracking-tight">{titre}</h3>
      {intro && <p className="mt-1 mb-4 max-w-md text-sm leading-relaxed text-muted">{intro}</p>}
      {!intro && <div className="mb-4" />}
      {children}
    </section>
  );
}

/** Compteur de caractères, discret puis alarmant à l'approche de la limite. */
function Compteur({ valeur, max }: { valeur: number; max: number }) {
  const proche = valeur > max - 20;
  return (
    <span
      className={cn(
        'text-[11px] tabular-nums transition-colors duration-200',
        valeur > max ? 'text-danger' : proche ? 'text-warning' : 'text-muted',
      )}
    >
      {valeur} / {max}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * Panneau
 * ══════════════════════════════════════════════════════════════════════════ */

export function AccountPanel({ user, onSave }: AccountPanelProps = {}) {
  const { t, tx } = useTranslation();
  const presenceLabels = usePresenceLabels();
  const profil = user ?? CURRENT_USER;

  const [nom, setNom] = useState(profil.displayName ?? '');
  const [bio, setBio] = useState(profil.bio ?? '');
  const [statut, setStatut] = useState(profil.customStatus ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profil.avatarUrl);
  const [bannerUrl, setBannerUrl] = useState(profil.bannerUrl);
  // Fichiers choisis mais pas encore téléversés — l'aperçu (avatarUrl/bannerUrl
  // ci-dessus) montre déjà l'image locale ; le fichier réel ne part vers le
  // serveur qu'à l'enregistrement, pour ne pas téléverser une image qu'on
  // remplace ou annule l'instant d'après.
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState<'avatar' | 'banner' | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);

  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  // URLs locales (blob:) à révoquer quand on les remplace ou quitte le panneau.
  const previewUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const modifie = useMemo(
    () =>
      nom !== (profil.displayName ?? '') ||
      bio !== (profil.bio ?? '') ||
      statut !== (profil.customStatus ?? '') ||
      avatarUrl !== profil.avatarUrl ||
      bannerUrl !== profil.bannerUrl,
    [nom, bio, statut, avatarUrl, bannerUrl, profil],
  );

  const invalide = nom.trim().length === 0 || bio.length > BIO_MAX || statut.length > STATUT_MAX;

  /** Aperçu instantané et local — le fichier n'est envoyé qu'à l'enregistrement. */
  const previsualiser = (fichier: File | undefined, cible: 'avatar' | 'banner') => {
    if (!fichier) return;
    const url = URL.createObjectURL(fichier);
    previewUrlsRef.current.add(url);
    if (cible === 'avatar') {
      setAvatarFile(fichier);
      setAvatarUrl(url);
    } else {
      setBannerFile(fichier);
      setBannerUrl(url);
    }
  };

  const enregistrer = async () => {
    if (invalide || enregistrement) return;
    setEnregistrement(true);
    try {
      // Les fichiers choisis ne sont téléversés que maintenant — jusqu'ici
      // l'aperçu était purement local (URL blob:).
      let finalAvatarUrl = avatarUrl;
      let finalBannerUrl = bannerUrl;
      if (avatarFile) {
        setEnvoi('avatar');
        const res = await api.uploadImage(avatarFile, 'avatar');
        setEnvoi(null);
        if (!res.success || !res.data?.url) {
          toast.danger(t.profile.account.toast.avatarUploadError, { description: res.error ?? avatarFile.name });
          return;
        }
        finalAvatarUrl = res.data.url;
      }
      if (bannerFile) {
        setEnvoi('banner');
        const res = await api.uploadImage(bannerFile, 'banner');
        setEnvoi(null);
        if (!res.success || !res.data?.url) {
          toast.danger(t.profile.account.toast.bannerUploadError, { description: res.error ?? bannerFile.name });
          return;
        }
        finalBannerUrl = res.data.url;
      }

      // `false` explicite = l'API a répondu par un échec ; `undefined` (pas de
      // onSave câblé) est traité comme un succès pour ne pas casser les autres
      // usages du panneau (ex: /uitest).
      const ok = await onSave?.({
        displayName: nom.trim(),
        bio,
        avatarUrl: finalAvatarUrl,
        bannerUrl: finalBannerUrl,
        customStatus: statut.trim(),
      });
      if (ok === false) {
        toast.danger(t.profile.account.toast.saveError, { description: t.profile.account.toast.saveErrorDescription });
        return;
      }
      // Les aperçus locaux ne servent plus une fois la vraie URL enregistrée.
      // On stocke la version RÉSOLUE (avec le domaine) — pas le chemin brut
      // renvoyé par l'upload — pour matcher exactement ce que `toAlfyUser()`
      // produira une fois le profil (parent) resynchronisé. Sans ça, `modifie`
      // comparait un chemin relatif à une URL absolue : jamais égaux, donc
      // toujours vu comme "non enregistré" et la barre ne disparaissait plus.
      if (avatarFile) {
        previewUrlsRef.current.delete(avatarUrl!);
        URL.revokeObjectURL(avatarUrl!);
        setAvatarUrl(resolveMediaUrl(finalAvatarUrl));
        setAvatarFile(null);
      }
      if (bannerFile) {
        previewUrlsRef.current.delete(bannerUrl!);
        URL.revokeObjectURL(bannerUrl!);
        setBannerUrl(resolveMediaUrl(finalBannerUrl));
        setBannerFile(null);
      }
      // Le statut personnalisé passe par la présence temps réel, pas par le profil.
      if (statut !== (profil.customStatus ?? '')) {
        socketService.updatePresence(
          profil.status === 'offline' ? 'online' : profil.status,
          statut.trim() || null,
          profil.statusEmoji ?? null,
        );
      }
      toast(t.profile.account.toast.saved);
    } finally {
      setEnregistrement(false);
    }
  };

  const fondBanniere = bannerUrl
    ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {
        background:
          'linear-gradient(135deg, var(--accent) 0%, color-mix(in oklch, var(--accent) 45%, var(--surface)) 55%, var(--surface-2) 100%)',
      };

  return (
    <div className="pb-24">
      {/* ── Titre ─────────────────────────────────────────────────────── */}
      <header className="at-fade-up mb-8">
        <h2 className="font-heading text-3xl leading-tight tracking-tighter">{t.profile.account.title}</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
          {t.profile.account.description}
        </p>
      </header>

      {/* ── Aperçu vivant ─────────────────────────────────────────────── */}
      <section
        className="at-fade-up mb-10 overflow-hidden rounded-3xl bg-surface"
        style={{ animationDelay: '40ms' } as CSSProperties}
      >
        {/* Bannière */}
        <div className="group/banniere relative h-32 w-full" style={fondBanniere as CSSProperties}>
          <button
            type="button"
            onClick={() => bannerInput.current?.click()}
            disabled={envoi !== null}
            aria-label={t.profile.account.changeBanner}
            className={cn(
              'absolute inset-0 flex cursor-pointer items-center justify-center gap-2 text-sm font-medium text-white outline-none',
              'bg-black/0 opacity-0 transition-all duration-300 group-hover/banniere:bg-black/45 group-hover/banniere:opacity-100',
              'focus-visible:bg-black/45 focus-visible:opacity-100',
            )}
          >
            {envoi === 'banner' ? <Spinner size="sm" /> : <ImageUp className="size-4.5" aria-hidden />}
            {t.profile.account.changeBanner}
          </button>
        </div>

        <div className="px-6 pb-6">
          {/* Avatar chevauchant */}
          <div className="-mt-11 mb-4 flex items-end justify-between gap-4">
            <button
              type="button"
              onClick={() => avatarInput.current?.click()}
              disabled={envoi !== null}
              aria-label={t.profile.account.changeAvatar}
              className="group/avatar relative cursor-pointer rounded-3xl outline-none transition-transform duration-300 ease-out hover:scale-[1.04] focus-visible:scale-[1.04]"
            >
              <span className="block rounded-3xl bg-surface p-1">
                <Avatar className="size-22">
                  {avatarUrl && <Avatar.Image src={avatarUrl} alt="" />}
                  <Avatar.Fallback className="text-xl">{initiales(nom)}</Avatar.Fallback>
                </Avatar>
              </span>
              <span className="absolute inset-1 flex items-center justify-center rounded-3xl bg-black/50 opacity-0 transition-opacity duration-300 group-hover/avatar:opacity-100 group-focus-visible/avatar:opacity-100">
                {envoi === 'avatar' ? (
                  <Spinner size="sm" />
                ) : (
                  <Camera className="size-5 text-white" aria-hidden />
                )}
              </span>
            </button>

            <div className="mb-1">
              <UserBadges badges={profil.badges} />
            </div>
          </div>

          {/* Identité en direct */}
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xl leading-tight font-bold tracking-tight">
              {nom.trim() || t.profile.account.noName}
            </p>
            <Chip size="sm" variant="soft" className="cursor-default">
              <AtSign className="size-2.5" aria-hidden />
              <Chip.Label>{profil.username}</Chip.Label>
            </Chip>
            <Chip size="sm" color="success" variant="soft" className="cursor-default">
              {presenceLabels[profil.status]}
            </Chip>
          </div>

          {statut.trim() && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
              <Sparkles className="size-3 shrink-0" aria-hidden />
              {statut}
            </p>
          )}

          {bio.trim() && (
            <p className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-xs leading-relaxed text-foreground/85">
              {bio}
            </p>
          )}

          <p className="mt-4 text-[11px] text-muted">
            {tx(t.profile.account.memberSince, { date: memberSince.format(new Date(profil.createdAt)) })}
          </p>
        </div>
      </section>

      {/* Entrées fichier — aucun équivalent HeroUI, gardées hors flux */}
      <input
        ref={avatarInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          previsualiser(e.target.files?.[0], 'avatar');
          e.target.value = '';
        }}
      />
      <input
        ref={bannerInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          previsualiser(e.target.files?.[0], 'banner');
          e.target.value = '';
        }}
      />

      {/* ── Identité ──────────────────────────────────────────────────── */}
      <Bloc titre={t.profile.account.identity.title} intro={t.profile.account.identity.description} delai={80}>
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl bg-surface px-5 py-4">
            <TextField value={nom} onChange={setNom} isInvalid={nom.trim().length === 0} className="w-full">
              <Label>{t.profile.account.identity.displayNameLabel}</Label>
              <Input placeholder={t.profile.account.identity.displayNamePlaceholder} />
            </TextField>
          </div>

          <div className="rounded-2xl bg-surface px-5 py-4">
            <TextField value={profil.username} isReadOnly className="w-full">
              <Label>{t.profile.account.identity.usernameLabel}</Label>
              <Input />
            </TextField>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
              <Lock className="size-3 shrink-0" aria-hidden />
              {t.profile.account.identity.usernameHint}
            </p>
          </div>

          <div className="rounded-2xl bg-surface px-5 py-4">
            <TextField value={bio} onChange={setBio} isInvalid={bio.length > BIO_MAX} className="w-full">
              <div className="flex items-baseline justify-between gap-3">
                <Label>{t.profile.account.identity.bioLabel}</Label>
                <Compteur valeur={bio.length} max={BIO_MAX} />
              </div>
              <TextArea placeholder={t.profile.account.identity.bioPlaceholder} rows={3} />
            </TextField>
          </div>
        </div>
      </Bloc>

      {/* ── Statut ────────────────────────────────────────────────────── */}
      <Bloc
        titre={t.profile.account.status.title}
        intro={t.profile.account.status.description}
        delai={120}
      >
        <div className="rounded-2xl bg-surface px-5 py-4">
          <TextField
            value={statut}
            onChange={setStatut}
            isInvalid={statut.length > STATUT_MAX}
            className="w-full"
          >
            <div className="flex items-baseline justify-between gap-3">
              <Label>{t.profile.account.status.label}</Label>
              <Compteur valeur={statut.length} max={STATUT_MAX} />
            </div>
            <Input placeholder={t.profile.account.status.placeholder} />
          </TextField>
          {statut.trim() && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 text-muted"
              onPress={() => setStatut('')}
            >
              {t.profile.account.status.clear}
            </Button>
          )}
        </div>
      </Bloc>

      {/* ── Barre d'enregistrement — n'apparaît qu'en cas de changement ── */}
      {modifie && (
        <div className="at-fade-up sticky bottom-4 z-10 flex items-center justify-between gap-4 rounded-2xl bg-surface-3 px-5 py-3 shadow-2xl">
          <p className="min-w-0 text-sm">
            {invalide ? (
              <span className="text-danger">{t.profile.account.saveBar.invalid}</span>
            ) : (
              <span className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-success" aria-hidden />
                {t.profile.account.saveBar.ready}
              </span>
            )}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="ghost"
              onPress={() => {
                setNom(profil.displayName ?? '');
                setBio(profil.bio ?? '');
                setStatut(profil.customStatus ?? '');
                if (avatarFile) {
                  previewUrlsRef.current.delete(avatarUrl!);
                  URL.revokeObjectURL(avatarUrl!);
                  setAvatarFile(null);
                }
                if (bannerFile) {
                  previewUrlsRef.current.delete(bannerUrl!);
                  URL.revokeObjectURL(bannerUrl!);
                  setBannerFile(null);
                }
                setAvatarUrl(profil.avatarUrl);
                setBannerUrl(profil.bannerUrl);
              }}
            >
              {t.common.cancel}
            </Button>
            <Button onPress={enregistrer} isDisabled={invalide || enregistrement}>
              {t.profile.account.saveBar.save}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
