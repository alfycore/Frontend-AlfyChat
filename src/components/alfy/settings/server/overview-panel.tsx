'use client';

import { Avatar, Button, Chip, Input, Label, RadioGroup, Spinner, Switch, TextArea, TextField, toast } from '@heroui/react';
import { Camera, Home, ImageUp, Server, Users } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { api } from '@/lib/api';
import type { AlfyServer } from '@/components/alfy/mock/types';
import { HostingCategoryRadio } from '@/components/alfy/servers/hosting-category-radio';
import { TrustBadges } from '@/components/alfy/primitives/trust-badges';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsContent, SettingsRow, SettingsSection } from '@/components/alfy/settings/section';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/components/locale-provider';

type HostingCategory = 'standard' | 'community';

const initiales = (nom: string) =>
  nom
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

interface OverviewPanelProps {
  server: AlfyServer;
  /** Persistance réelle ; sans elle, simple retour visuel. */
  onSave?: (data: {
    name?: string;
    description?: string;
    iconUrl?: string;
    bannerUrl?: string;
    isPublic?: boolean;
    category?: HostingCategory;
  }) => void;
}

export function OverviewPanel({ server, onSave }: OverviewPanelProps) {
  const { t, tx } = useTranslation();
  const HOSTING_LABEL: Record<HostingCategory, string> = {
    standard: t.hostingCategory.standardTitle,
    community: t.hostingCategory.communityTitle,
  };
  const [name, setName] = useState(server.name);
  const [description, setDescription] = useState(server.description ?? '');
  const [requireInvite, setRequireInvite] = useState(!server.isPublic);
  const [category, setCategory] = useState<HostingCategory>(server.hostingCategory ?? 'standard');

  const [iconUrl, setIconUrl] = useState(server.iconUrl);
  const [bannerUrl, setBannerUrl] = useState(server.bannerUrl);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState<'icon' | 'banner' | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const iconInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  // Type 1 (hébergé par AlfyChat) uniquement — le Type 2 (auto-hébergé, déjà
  // `selfHosted`) et le futur Type 3 (hébergeur certifié) n'ont pas ce plafond.
  const isPlatform = !server.selfHosted && server.hostingType !== 'certified_host';
  const [quota, setQuota] = useState<{ used: { standard: number; community: number }; remaining: { standard: number; community: number } } | null>(null);

  useEffect(() => {
    if (!isPlatform) return;
    api.getServerQuota().then((res) => {
      if (res.success && res.data) setQuota({ used: res.data.used, remaining: res.data.remaining });
    });
  }, [isPlatform]);

  // Décompte des AUTRES serveurs Type 1 du propriétaire (celui-ci exclu), pour
  // savoir si le quota laisse la place à un passage vers `cat`.
  const currentCategory = server.hostingCategory ?? 'standard';
  const disabledFor = (cat: HostingCategory) => {
    if (!quota) return false;
    const used = cat === 'community' ? quota.used.community : quota.used.standard;
    const remaining = cat === 'community' ? quota.remaining.community : quota.remaining.standard;
    const limit = used + remaining;
    const others = used - (currentCategory === cat ? 1 : 0);
    return others + 1 > limit;
  };
  const overCapacity = category === 'standard' && server.members.length > 200;
  const invalide = name.trim().length < 2;

  const previsualiser = (fichier: File | undefined, cible: 'icon' | 'banner') => {
    if (!fichier) return;
    const url = URL.createObjectURL(fichier);
    previewUrlsRef.current.add(url);
    if (cible === 'icon') {
      setIconFile(fichier);
      setIconUrl(url);
    } else {
      setBannerFile(fichier);
      setBannerUrl(url);
    }
  };

  const enregistrer = async () => {
    if (invalide || overCapacity || enregistrement) return;
    setEnregistrement(true);
    try {
      let finalIconUrl = iconUrl;
      let finalBannerUrl = bannerUrl;
      if (iconFile) {
        setEnvoi('icon');
        const res = await api.uploadImage(iconFile, 'icon');
        setEnvoi(null);
        if (!res.success || !res.data?.url) {
          toast.danger(t.overviewPanel.uploadIconError, { description: res.error ?? iconFile.name });
          return;
        }
        finalIconUrl = res.data.url;
      }
      if (bannerFile) {
        setEnvoi('banner');
        const res = await api.uploadImage(bannerFile, 'banner');
        setEnvoi(null);
        if (!res.success || !res.data?.url) {
          toast.danger(t.overviewPanel.uploadBannerError, { description: res.error ?? bannerFile.name });
          return;
        }
        finalBannerUrl = res.data.url;
      }

      onSave?.({
        name: name.trim(),
        description: description.trim(),
        iconUrl: finalIconUrl,
        bannerUrl: finalBannerUrl,
        isPublic: !requireInvite,
        category: isPlatform && category !== currentCategory ? category : undefined,
      });
      toast(t.overviewPanel.serverSaved, { description: name });
    } finally {
      setEnvoi(null);
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
    <div className="pb-4">
      <PanelHeader title={t.overviewPanel.panelTitle} description={t.overviewPanel.panelDescription} />

      {/* ── Aperçu vivant ─────────────────────────────────────────────── */}
      <div className="at-fade-up mb-8 overflow-hidden rounded-2xl bg-surface" style={{ animationDelay: '20ms' } as CSSProperties}>
        <div className="group/banniere relative h-28 w-full" style={fondBanniere as CSSProperties}>
          <button
            type="button"
            onClick={() => bannerInput.current?.click()}
            disabled={envoi !== null}
            aria-label={t.overviewPanel.changeBanner}
            className={cn(
              'absolute inset-0 flex cursor-pointer items-center justify-center gap-2 text-sm font-medium text-white outline-none',
              'bg-black/0 opacity-0 transition-all duration-300 group-hover/banniere:bg-black/45 group-hover/banniere:opacity-100',
              'focus-visible:bg-black/45 focus-visible:opacity-100',
            )}
          >
            {envoi === 'banner' ? <Spinner size="sm" /> : <ImageUp className="size-4.5" aria-hidden />}
            {t.overviewPanel.changeBanner}
          </button>
        </div>

        <div className="px-5 pb-5">
          <div className="-mt-9 mb-3 flex items-end justify-between gap-4">
            <button
              type="button"
              onClick={() => iconInput.current?.click()}
              disabled={envoi !== null}
              aria-label={t.overviewPanel.changeIcon}
              className="group/icon relative cursor-pointer rounded-3xl outline-none transition-transform duration-300 ease-out hover:scale-[1.04] focus-visible:scale-[1.04]"
            >
              <span className="block rounded-3xl bg-surface p-1">
                <Avatar className="size-18">
                  {iconUrl && <Avatar.Image src={iconUrl} alt="" />}
                  <Avatar.Fallback className="text-lg">{initiales(name)}</Avatar.Fallback>
                </Avatar>
              </span>
              <span className="absolute inset-1 flex items-center justify-center rounded-3xl bg-black/50 opacity-0 transition-opacity duration-300 group-hover/icon:opacity-100 group-focus-visible/icon:opacity-100">
                {envoi === 'icon' ? <Spinner size="sm" /> : <Camera className="size-4.5 text-white" aria-hidden />}
              </span>
            </button>
          </div>

          <input
            ref={iconInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              previsualiser(e.target.files?.[0], 'icon');
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

          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-lg leading-tight font-bold tracking-tight">{name.trim() || t.overviewPanel.unnamed}</p>
            {isPlatform && (
              <Chip size="sm" variant="soft" className="cursor-default">
                <Chip.Label>{HOSTING_LABEL[category]}</Chip.Label>
              </Chip>
            )}
            {server.selfHosted && (
              <Chip size="sm" color="success" variant="soft" className="cursor-default">
                <Server className="size-2.5" aria-hidden />
                <Chip.Label>{t.overviewPanel.selfHosted}</Chip.Label>
              </Chip>
            )}
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <Users className="size-3" aria-hidden />
            {tx(t.common.members, { n: server.members.length })}
            {isPlatform && tx(t.overviewPanel.upTo, { n: category === 'community' ? '4000' : '200' })}
          </p>
        </div>
      </div>

      {/* ── Identité ──────────────────────────────────────────────────── */}
      <SettingsSection title={t.overviewPanel.identity}>
        <SettingsContent>
          <div className="flex flex-col gap-4">
            <TextField value={name} onChange={setName} isInvalid={invalide} className="max-w-sm">
              <Label>{t.overviewPanel.serverName}</Label>
              <Input placeholder={t.overviewPanel.serverNamePlaceholder} />
            </TextField>
            <TextField value={description} onChange={setDescription} className="max-w-md">
              <Label>{t.overviewPanel.descriptionLabel}</Label>
              <TextArea placeholder={t.overviewPanel.descriptionPlaceholder} rows={2} />
            </TextField>
          </div>
        </SettingsContent>
      </SettingsSection>

      <SettingsSection title={t.overviewPanel.access}>
        <SettingsRow
          label={t.overviewPanel.inviteOnly}
          description={t.overviewPanel.inviteOnlyDesc}
        >
          <Switch isSelected={requireInvite} onChange={setRequireInvite} aria-label={t.overviewPanel.inviteOnly}>
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </SettingsRow>
      </SettingsSection>

      {isPlatform && (
        <SettingsSection
          title={t.overviewPanel.serverType}
          description={t.overviewPanel.serverTypeDesc}
        >
          <SettingsContent>
            <RadioGroup
              value={category}
              onChange={(v) => setCategory(v as HostingCategory)}
              aria-label={t.createServerDialog.categoryAria}
              className="grid gap-3 sm:grid-cols-2"
            >
              <HostingCategoryRadio
                value="standard"
                icon={Home}
                title={t.hostingCategory.standardTitle}
                subtitle={t.hostingCategory.standardSubtitle}
                isDisabled={disabledFor('standard') || (category !== 'standard' && server.members.length > 200)}
              />
              <HostingCategoryRadio
                value="community"
                icon={Users}
                title={t.hostingCategory.communityTitle}
                subtitle={t.hostingCategory.communitySubtitle}
                isDisabled={disabledFor('community')}
              />
            </RadioGroup>
            {overCapacity && (
              <p className="mt-2 text-xs text-danger">
                {tx(t.overviewPanel.overCapacity, { n: server.members.length })}
              </p>
            )}
          </SettingsContent>
        </SettingsSection>
      )}

      {server.selfHosted && (
        <SettingsSection
          title={t.overviewPanel.sovereignty}
          description={t.overviewPanel.sovereigntyDesc}
        >
          <SettingsRow label={t.overviewPanel.guarantees}>
            <TrustBadges compact />
          </SettingsRow>
        </SettingsSection>
      )}

      <div className="flex justify-end">
        <Button isDisabled={invalide || overCapacity || enregistrement} onPress={enregistrer}>
          {enregistrement ? <Spinner size="sm" /> : t.overviewPanel.saveChanges}
        </Button>
      </div>
    </div>
  );
}
