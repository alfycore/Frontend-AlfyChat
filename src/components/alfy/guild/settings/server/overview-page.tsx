'use client';

/** Réglages du serveur — Vue d'ensemble (icône, bannière, nom, description, visibilité). */

import { Button, Chip, Input, Label, TextArea, TextField, toast } from '@heroui/react';
import { Camera, Globe, ImagePlus } from 'lucide-react';
import { useRef, useState } from 'react';

import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import { PageTitle, SectionTitle, SettingSwitch } from '@/components/alfy/guild/kit';
import { guildAcronym } from '@/components/alfy/guild/rail/guild-icon';
import { guildStore } from '@/components/alfy/guild/store';
import { useGuildInfo, useMyPerms } from '@/components/alfy/guild/hooks';
import { useSettingsForm } from '@/components/alfy/guild/settings/settings-layer';
import { serverListStore } from '@/lib/server-list-store';

interface Draft {
  name: string;
  description: string;
  iconUrl?: string;
  bannerUrl?: string;
  isPublic: boolean;
}

export function OverviewPage({ serverId }: { serverId: string }) {
  const { t, tx } = useTranslation();
  const info = useGuildInfo(serverId);
  const perms = useMyPerms(serverId);
  const canEdit = perms.can('MANAGE_SERVER');
  const initial: Draft = {
    name: info?.name ?? '',
    description: info?.description ?? '',
    iconUrl: info?.iconUrl,
    bannerUrl: info?.bannerUrl,
    isPublic: Boolean(info?.isPublic),
  };
  const [draft, setDraft] = useState<Draft>(initial);
  const [base, setBase] = useState<Draft>(initial);
  const [uploading, setUploading] = useState<'icon' | 'banner' | null>(null);
  const iconRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(base);

  const save = async () => {
    if (draft.name.trim().length < 2) {
      toast.danger(t.guild.overview.nameTooShort);
      return;
    }
    const patch = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      iconUrl: draft.iconUrl ?? '',
      bannerUrl: draft.bannerUrl ?? '',
      isPublic: draft.isPublic,
    };
    // Socket : écrit (node ou service) ET diffuse SERVER_UPDATE à tous les membres.
    socketService.updateServerViaNode(serverId, patch);
    guildStore.patchInfo(serverId, { ...patch, iconUrl: draft.iconUrl, bannerUrl: draft.bannerUrl });
    serverListStore.update(serverId, { name: patch.name, iconUrl: draft.iconUrl });
    setBase(draft);
    toast.success(t.guild.settings.saved);
  };

  useSettingsForm({ dirty, save, reset: () => setDraft(base) });

  const upload = async (file: File | undefined, kind: 'icon' | 'banner') => {
    if (!file) return;
    setUploading(kind);
    try {
      const res = await api.uploadImage(file, kind === 'icon' ? 'icon' : 'banner');
      if (!res.success || !res.data?.url) {
        toast.danger(t.guild.overview.uploadFailed, { description: res.error ?? file.name });
        return;
      }
      const url = resolveMediaUrl(res.data.url);
      setDraft((d) => ({ ...d, [kind === 'icon' ? 'iconUrl' : 'bannerUrl']: url }));
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageTitle>{t.guild.overview.title}</PageTitle>

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => iconRef.current?.click()}
            aria-label={t.guild.overview.changeIcon}
            className="group/ico relative flex size-25 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-accent text-3xl font-semibold text-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-default"
          >
            {draft.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.iconUrl} alt="" className="size-full object-cover" />
            ) : (
              <span>{guildAcronym(draft.name)}</span>
            )}
            {canEdit && (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-[10px] font-bold text-white uppercase opacity-0 transition-opacity duration-(--dur-1) group-hover/ico:opacity-100">
                <Camera className="size-5" aria-hidden />
                {t.guild.overview.changeIcon}
              </span>
            )}
          </button>
          {draft.iconUrl && canEdit && (
            <button type="button" className="cursor-pointer text-xs font-medium text-muted hover:text-foreground hover:underline" onClick={() => setDraft((d) => ({ ...d, iconUrl: undefined }))}>
              {t.guild.overview.remove}
            </button>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-sm text-muted">{t.guild.overview.iconHint}</p>
          <Button variant="secondary" className="w-fit" isDisabled={!canEdit} isPending={uploading === 'icon'} onPress={() => iconRef.current?.click()}>
            {t.guild.overview.uploadImage}
          </Button>
        </div>
        <TextField value={draft.name} onChange={(name) => setDraft((d) => ({ ...d, name }))} isDisabled={!canEdit} className="flex-1">
          <Label className="text-xs font-bold tracking-[0.02em] text-muted uppercase">{t.guild.overview.name}</Label>
          <Input maxLength={100} />
        </TextField>
      </div>
      <input ref={iconRef} type="file" accept="image/*" hidden onChange={(e) => void upload(e.target.files?.[0], 'icon')} />

      <div className="flex flex-col gap-2">
        <SectionTitle>{t.guild.overview.banner}</SectionTitle>
        <p className="text-sm text-muted">{t.guild.overview.bannerHint}</p>
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => bannerRef.current?.click()}
          className={cn(
            'group/ban relative mt-1 flex aspect-[16/6] w-full max-w-md cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-foreground/25 bg-surface-secondary outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-default',
            draft.bannerUrl && 'border-solid',
          )}
        >
          {draft.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.bannerUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-sm text-muted">
              <ImagePlus className="size-6" aria-hidden />
              {t.guild.overview.uploadBanner}
            </span>
          )}
        </button>
        {draft.bannerUrl && canEdit && (
          <button type="button" className="w-fit cursor-pointer text-xs font-medium text-muted hover:text-foreground hover:underline" onClick={() => setDraft((d) => ({ ...d, bannerUrl: undefined }))}>
            {t.guild.overview.remove}
          </button>
        )}
        <input ref={bannerRef} type="file" accept="image/*" hidden onChange={(e) => void upload(e.target.files?.[0], 'banner')} />
      </div>

      <TextField value={draft.description} onChange={(description) => setDraft((d) => ({ ...d, description }))} isDisabled={!canEdit}>
        <Label className="text-xs font-bold tracking-[0.02em] text-muted uppercase">{t.guild.overview.description}</Label>
        <TextArea maxLength={1000} rows={3} placeholder={t.guild.overview.descriptionPlaceholder} />
      </TextField>

      <div className="flex flex-col gap-3 border-t border-separator pt-6">
        <SettingSwitch
          icon={Globe}
          label={t.guild.overview.public}
          description={t.guild.overview.publicDesc}
          isSelected={draft.isPublic}
          onChange={(isPublic) => setDraft((d) => ({ ...d, isPublic }))}
          isDisabled={!canEdit}
        />
      </div>

      {info?.hostingType !== 'self_hosted' && (
        <div className="flex flex-wrap items-center gap-2 border-t border-separator pt-6 text-sm text-muted">
          <SectionTitle className="w-full">{t.guild.overview.hosting}</SectionTitle>
          <Chip size="sm" variant="soft">
            {info?.hostingCategory === 'community' ? t.guild.overview.community : t.guild.overview.standard}
          </Chip>
          {info?.maxMembers ? <span>{tx(t.guild.overview.maxMembers, { n: info.maxMembers })}</span> : null}
        </div>
      )}
    </div>
  );
}
