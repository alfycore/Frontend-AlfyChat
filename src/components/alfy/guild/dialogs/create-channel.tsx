'use client';

/**
 * « Créer un salon » / « Créer une catégorie » (gabarit Discord) : type en
 * cartes, nom avec préfixe, commutateur « Salon privé ». Un salon textuel créé
 * s'ouvre aussitôt.
 */

import { Button, InputGroup, Label, Modal, RadioGroup, TextField } from '@heroui/react';
import { Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useTranslation } from '@/components/locale-provider';
import { RadioCard, SettingSwitch } from '@/components/alfy/guild/kit';
import { CHANNEL_ICONS } from '@/components/alfy/guild/channel-icons';
import { createChannel, slugChannelName } from '@/components/alfy/guild/actions';
import { useGuildChannel } from '@/components/alfy/guild/hooks';
import { guildUi, useGuildUi } from '@/components/alfy/guild/ui';
import type { GuildChannelType } from '@/components/alfy/guild/types';

const TYPES: GuildChannelType[] = ['text', 'voice', 'announcement', 'forum', 'stage'];

export function CreateChannelDialog() {
  const req = useGuildUi((s) => s.createChannel);
  return (
    <Modal isOpen={!!req} onOpenChange={(open) => !open && guildUi.close('createChannel')}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[460px]">
            {req && <Form key={`${req.serverId}:${req.parentId ?? ''}:${req.type ?? ''}`} serverId={req.serverId} parentId={req.parentId ?? null} initialType={req.type} />}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function Form({ serverId, parentId, initialType }: { serverId: string; parentId: string | null; initialType?: GuildChannelType }) {
  const { t, tx } = useTranslation();
  const router = useRouter();
  const isCategory = initialType === 'category';
  const parent = useGuildChannel(serverId, parentId);
  const [type, setType] = useState<GuildChannelType>(isCategory ? 'category' : initialType ?? 'text');
  const [name, setName] = useState('');
  const [isPrivate, setPrivate] = useState(false);
  const [busy, setBusy] = useState(false);

  const preview = slugChannelName(name, type);
  const Icon = CHANNEL_ICONS[type] ?? CHANNEL_ICONS.text;
  const valid = preview.length > 0;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const created = await createChannel(serverId, { name, type, parentId: isCategory ? null : parentId, isPrivate });
    setBusy(false);
    if (!created) return;
    guildUi.close('createChannel');
    if (type !== 'category' && type !== 'voice' && type !== 'stage') router.push(`/channels/server/${serverId}/${created.id}`);
  };

  const DESC: Partial<Record<GuildChannelType, string>> = {
    text: t.guild.create.textDesc,
    voice: t.guild.create.voiceDesc,
    announcement: t.guild.create.announcementDesc,
    forum: t.guild.create.forumDesc,
    stage: t.guild.create.stageDesc,
  };
  const LABEL: Partial<Record<GuildChannelType, string>> = {
    text: t.guild.create.text,
    voice: t.guild.create.voice,
    announcement: t.guild.create.announcement,
    forum: t.guild.create.forum,
    stage: t.guild.create.stage,
  };

  return (
    <>
      <Modal.CloseTrigger />
      <Modal.Header className="flex-col items-start gap-0.5">
        <Modal.Heading className="text-xl font-bold">{isCategory ? t.guild.create.titleCategory : t.guild.create.title}</Modal.Heading>
        {!isCategory && parent && <p className="text-xs text-muted">{tx(t.guild.create.inCategory, { name: parent.name })}</p>}
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-5">
        {!isCategory && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold tracking-[0.02em] text-muted uppercase">{t.guild.create.type}</p>
            <RadioGroup value={type} onChange={(v) => setType(v as GuildChannelType)} aria-label={t.guild.create.type} className="flex flex-col gap-2">
              {TYPES.map((k) => (
                <RadioCard key={k} value={k} icon={CHANNEL_ICONS[k]} title={LABEL[k] ?? k} description={DESC[k]} />
              ))}
            </RadioGroup>
          </div>
        )}

        <TextField value={name} onChange={setName} autoFocus isRequired>
          <Label className="text-xs font-bold tracking-[0.02em] text-muted uppercase">{isCategory ? t.guild.create.categoryName : t.guild.create.channelName}</Label>
          <InputGroup>
            {!isCategory && (
              <InputGroup.Prefix>
                <Icon className="size-4.5 text-muted" aria-hidden />
              </InputGroup.Prefix>
            )}
            <InputGroup.Input
              placeholder={isCategory ? t.guild.create.categoryPlaceholder : type === 'voice' || type === 'stage' ? t.guild.create.voicePlaceholder : t.guild.create.textPlaceholder}
              maxLength={100}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
            />
          </InputGroup>
        </TextField>
        {!isCategory && name && preview !== name.trim() && (
          <p className="-mt-3 text-xs text-muted">
            {t.guild.create.willBe} <span className="font-semibold text-foreground">{preview}</span>
          </p>
        )}

        <SettingSwitch
          icon={Lock}
          label={isCategory ? t.guild.create.privateCategory : t.guild.create.privateChannel}
          description={isCategory ? t.guild.create.privateCategoryDesc : t.guild.create.privateChannelDesc}
          isSelected={isPrivate}
          onChange={setPrivate}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="tertiary" onPress={() => guildUi.close('createChannel')}>
          {t.common.cancel}
        </Button>
        <Button variant="primary" isDisabled={!valid} isPending={busy} onPress={() => void submit()}>
          {isCategory ? t.guild.create.submitCategory : t.guild.create.submit}
        </Button>
      </Modal.Footer>
    </>
  );
}
