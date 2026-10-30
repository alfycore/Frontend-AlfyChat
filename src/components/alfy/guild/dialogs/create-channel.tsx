'use client';

/**
 * « Créer un salon » / « Créer une catégorie » (gabarit Discord) : type choisi
 * dans une grille groupée et filtrable (35 types, voir channel-kinds.ts), nom
 * avec préfixe, commutateur « Salon privé ». Un salon textuel créé s'ouvre aussitôt.
 */

import { Button, InputGroup, Label, Modal, Radio, RadioGroup, SearchField, TextField } from '@heroui/react';
import { Lock, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { useTranslation } from '@/components/locale-provider';
import { SettingSwitch } from '@/components/alfy/guild/kit';
import { CHANNEL_ICONS, isVoiceType } from '@/components/alfy/guild/channel-icons';
import { CHANNEL_KINDS, type KindGroup } from '@/components/alfy/guild/channel-kinds';
import { cn } from '@/lib/utils';
import { createChannel, slugChannelName } from '@/components/alfy/guild/actions';
import { useGuildChannel } from '@/components/alfy/guild/hooks';
import { guildUi, useGuildUi } from '@/components/alfy/guild/ui';
import type { GuildChannelType } from '@/components/alfy/guild/types';

const GROUPS: KindGroup[] = ['basic', 'text', 'forum', 'voice'];

export function CreateChannelDialog() {
  const req = useGuildUi((s) => s.createChannel);
  return (
    <Modal isOpen={!!req} onOpenChange={(open) => !open && guildUi.close('createChannel')}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[560px]">
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
  const [query, setQuery] = useState('');

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
    if (type !== 'category' && !isVoiceType(type)) router.push(`/channels/server/${serverId}/${created.id}`);
  };

  const k = t.guild.kinds;
  const BASIC: Partial<Record<GuildChannelType, { name: string; desc: string }>> = {
    text: { name: t.guild.create.text, desc: t.guild.create.textDesc },
    voice: { name: t.guild.create.voice, desc: t.guild.create.voiceDesc },
    announcement: { name: t.guild.create.announcement, desc: t.guild.create.announcementDesc },
    forum: { name: t.guild.create.forum, desc: t.guild.create.forumDesc },
    stage: { name: t.guild.create.stage, desc: t.guild.create.stageDesc },
  };
  const labelOf = (id: GuildChannelType) =>
    BASIC[id] ?? (k.types as Record<string, { name: string; desc: string }>)[id] ?? { name: id, desc: '' };

  const fold = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const groups = useMemo(() => {
    const q = fold(query.trim());
    return GROUPS.map((g) => ({
      id: g,
      kinds: CHANNEL_KINDS.filter((kind) => kind.group === g).filter((kind) => {
        if (!q) return true;
        const l = labelOf(kind.id);
        return fold(`${l.name} ${l.desc} ${kind.id}`).includes(q);
      }),
    })).filter((g) => g.kinds.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, t]);

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
            <SearchField aria-label={k.search} value={query} onChange={setQuery}>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder={k.search} />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <RadioGroup
              value={type}
              onChange={(v) => setType(v as GuildChannelType)}
              aria-label={t.guild.create.type}
              className="alfy-thin-scroll flex max-h-[min(44vh,380px)] flex-col gap-4 overflow-y-auto pr-1"
            >
              {groups.length === 0 && <p className="py-6 text-center text-sm text-muted">{k.noMatch}</p>}
              {groups.map((g) => (
                <div key={g.id} className="flex flex-col gap-1.5">
                  <p className="text-[11px] font-bold tracking-[0.04em] text-muted uppercase">{k.groups[g.id]}</p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {g.kinds.map((kind) => {
                      const KindIcon = CHANNEL_ICONS[kind.id] ?? CHANNEL_ICONS.text;
                      const l = labelOf(kind.id);
                      return (
                        <Radio key={kind.id} value={kind.id}>
                          <Radio.Content
                            className={cn(
                              'group/kind flex w-full cursor-pointer items-start gap-2.5 rounded-lg bg-surface-secondary px-2.5 py-2',
                              'transition-colors duration-(--dur-1) hover:bg-surface-tertiary data-selected:bg-accent/12',
                            )}
                          >
                            <KindIcon className="mt-0.5 size-4.5 shrink-0 text-muted group-data-selected/kind:text-accent" aria-hidden />
                            <span className="min-w-0 flex-1">
                              <Label className="block text-sm font-semibold">{l.name}</Label>
                              <span className="line-clamp-2 text-xs leading-snug text-muted">{l.desc}</span>
                            </span>
                          </Radio.Content>
                        </Radio>
                      );
                    })}
                  </div>
                </div>
              ))}
            </RadioGroup>
            {(() => {
              const rule = CHANNEL_KINDS.find((kind) => kind.id === type)?.rule;
              return rule ? (
                <p className="flex items-start gap-2 rounded-lg bg-accent/8 px-3 py-2 text-xs text-foreground/85">
                  <ShieldCheck className="mt-px size-3.5 shrink-0 text-accent" aria-hidden />
                  <span>
                    {k.rules[rule]} {k.modsBypass}
                  </span>
                </p>
              ) : null;
            })()}
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
              placeholder={isCategory ? t.guild.create.categoryPlaceholder : isVoiceType(type) ? t.guild.create.voicePlaceholder : t.guild.create.textPlaceholder}
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
