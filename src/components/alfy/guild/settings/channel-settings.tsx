'use client';

/**
 * Réglages d'un salon / d'une catégorie (plein écran, gabarit Discord) :
 *  - Vue d'ensemble : nom, sujet, mode lent, NSFW, limite d'utilisateurs (vocal) ;
 *  - Permissions : salon privé en un geste, puis permissions avancées par rôle
 *    ou membre avec la bascule tri-état ✗ / ⧸ / ✓ ; synchronisation avec la catégorie ;
 *  - Supprimer.
 */

import {
  Avatar,
  Button,
  Dropdown,
  Input,
  Label,
  SearchField,
  Slider,
  Spinner,
  TextArea,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  toast,
} from '@heroui/react';
import { Check, LayoutDashboard, Lock, Plus, RefreshCw, Shield, Slash, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslation } from '@/components/locale-provider';
import { socketService } from '@/lib/socket';
import { cn } from '@/lib/utils';
import { PageTitle, SectionTitle, SettingSwitch } from '@/components/alfy/guild/kit';
import { CHANNEL_ICONS, isVoiceType } from '@/components/alfy/guild/channel-icons';
import { CHANNEL_SCOPED_KEYS, P, PERM_GROUPS, type PermKey } from '@/components/alfy/guild/perms';
import { deleteChannel, deleteOverride, getOverrides, setOverride, slugChannelName, syncOverrides, updateChannel } from '@/components/alfy/guild/actions';
import { memberName, useGuildChannel, useGuildMembers, useGuildRoles, useMyPerms } from '@/components/alfy/guild/hooks';
import { guildUi, useGuildUi, type ChannelSettingsTab } from '@/components/alfy/guild/ui';
import { SettingsLayer, useSettingsForm } from '@/components/alfy/guild/settings/settings-layer';
import type { ChannelOverride, GuildChannel } from '@/components/alfy/guild/types';

const SLOWMODE = [0, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 21600];

export function ChannelSettingsDialog() {
  const req = useGuildUi((s) => s.channelSettings);
  if (!req) return null;
  return <ChannelSettings key={req.channelId} serverId={req.serverId} channelId={req.channelId} initialTab={req.tab} />;
}

function ChannelSettings({ serverId, channelId, initialTab }: { serverId: string; channelId: string; initialTab: ChannelSettingsTab }) {
  const { t, tx } = useTranslation();
  const router = useRouter();
  const channel = useGuildChannel(serverId, channelId);
  const perms = useMyPerms(serverId, channelId);
  const [tab, setTab] = useState<ChannelSettingsTab>(initialTab === 'permissions' ? 'permissions' : 'overview');
  const isCategory = channel?.type === 'category';

  useEffect(() => {
    if (!channel) guildUi.close('channelSettings');
  }, [channel]);
  if (!channel) return null;

  const Icon = CHANNEL_ICONS[channel.type] ?? CHANNEL_ICONS.text;
  const remove = async () => {
    const ok = await guildUi.confirm({
      title: isCategory ? t.guild.deleteChannel.titleCategory : t.guild.deleteChannel.title,
      body: tx(isCategory ? t.guild.deleteChannel.bodyCategory : t.guild.deleteChannel.body, { name: channel.name }),
      confirmLabel: isCategory ? t.guild.deleteChannel.confirmCategory : t.guild.deleteChannel.confirm,
      danger: true,
    });
    if (!ok) return;
    deleteChannel(serverId, channel.id);
    guildUi.close('channelSettings');
    if (window.location.pathname.includes(channel.id)) router.push(`/channels/server/${serverId}`);
  };

  return (
    <SettingsLayer
      isOpen
      onClose={() => guildUi.close('channelSettings')}
      title={
        <span className="flex items-center gap-1 normal-case">
          <Icon className="size-3.5" aria-hidden />
          {channel.name}
          <span className="ml-1 text-muted/70 uppercase">{isCategory ? t.guild.channelSettings.category : t.guild.channelSettings.channel}</span>
        </span>
      }
      groups={[
        {
          id: 'main',
          items: [
            { id: 'overview', label: t.guild.settings.overview, icon: LayoutDashboard },
            (perms.can('MANAGE_ROLES') || perms.can('MANAGE_CHANNELS')) && { id: 'permissions', label: t.guild.channelSettings.permissions, icon: Shield },
          ],
        },
        {
          id: 'danger',
          items: [{ id: 'delete', label: isCategory ? t.guild.menu.deleteCategory : t.guild.menu.deleteChannel, icon: Trash2, danger: true }],
        },
      ]}
      active={tab}
      onSelect={(id) => (id === 'delete' ? void remove() : setTab(id as ChannelSettingsTab))}
    >
      {tab === 'overview' && <ChannelOverview serverId={serverId} channel={channel} />}
      {tab === 'permissions' && <ChannelPermissions serverId={serverId} channel={channel} />}
    </SettingsLayer>
  );
}

/* ── Vue d'ensemble ───────────────────────────────────────────────────────── */

function ChannelOverview({ serverId, channel }: { serverId: string; channel: GuildChannel }) {
  const { t, tx } = useTranslation();
  const voice = isVoiceType(channel.type);
  const isCategory = channel.type === 'category';
  const initial = { name: channel.name, topic: channel.topic ?? '', slowMode: channel.slowMode, isNsfw: channel.isNsfw, userLimit: channel.userLimit };
  const [base, setBase] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const dirty = JSON.stringify(base) !== JSON.stringify(draft);

  useSettingsForm({
    dirty,
    save: () => {
      const name = slugChannelName(draft.name, channel.type) || channel.name;
      const patch: Parameters<typeof updateChannel>[2] = {};
      if (name !== channel.name) patch.name = name;
      if (draft.topic !== (channel.topic ?? '')) patch.topic = draft.topic;
      if (draft.slowMode !== channel.slowMode) patch.slowMode = draft.slowMode;
      if (draft.isNsfw !== channel.isNsfw) patch.isNsfw = draft.isNsfw;
      if (draft.userLimit !== channel.userLimit) patch.userLimit = draft.userLimit;
      updateChannel(serverId, channel.id, patch);
      const next = { ...draft, name };
      setBase(next);
      setDraft(next);
      toast.success(t.guild.settings.saved);
    },
    reset: () => setDraft(base),
  });

  const slowLabel = (s: number) =>
    s === 0 ? t.guild.channelSettings.off : s < 60 ? `${s}s` : s < 3600 ? `${s / 60} min` : `${s / 3600} h`;
  const slowIndex = Math.max(0, SLOWMODE.indexOf(draft.slowMode));

  return (
    <div className="flex flex-col gap-7">
      <PageTitle>{t.guild.settings.overview}</PageTitle>
      <TextField value={draft.name} onChange={(name) => setDraft((d) => ({ ...d, name }))} isRequired>
        <Label className="text-xs font-bold tracking-[0.02em] text-muted uppercase">{isCategory ? t.guild.create.categoryName : t.guild.create.channelName}</Label>
        <Input maxLength={100} />
      </TextField>

      {!isCategory && !voice && (
        <TextField value={draft.topic} onChange={(topic) => setDraft((d) => ({ ...d, topic }))}>
          <Label className="text-xs font-bold tracking-[0.02em] text-muted uppercase">{t.guild.channelSettings.topic}</Label>
          <TextArea maxLength={1024} rows={3} placeholder={t.guild.channelSettings.topicPlaceholder} />
          <span className="mt-1 block text-right text-xs text-muted tabular-nums">{1024 - draft.topic.length}</span>
        </TextField>
      )}

      {!isCategory && !voice && (
        <div className="flex flex-col gap-2 border-t border-separator pt-6">
          <SectionTitle>{t.guild.channelSettings.slowmode}</SectionTitle>
          <Slider
            aria-label={t.guild.channelSettings.slowmode}
            minValue={0}
            maxValue={SLOWMODE.length - 1}
            step={1}
            value={slowIndex}
            onChange={(v) => setDraft((d) => ({ ...d, slowMode: SLOWMODE[Array.isArray(v) ? v[0] : v] ?? 0 }))}
          >
            <Slider.Output className="text-sm font-semibold">{slowLabel(draft.slowMode)}</Slider.Output>
            <Slider.Track>
              <Slider.Fill />
              <Slider.Thumb />
            </Slider.Track>
          </Slider>
          <p className="text-sm text-muted">{t.guild.channelSettings.slowmodeDesc}</p>
        </div>
      )}

      {voice && (
        <div className="flex flex-col gap-2 border-t border-separator pt-6">
          <SectionTitle>{t.guild.channelSettings.userLimit}</SectionTitle>
          <Slider
            aria-label={t.guild.channelSettings.userLimit}
            minValue={0}
            maxValue={99}
            step={1}
            value={draft.userLimit}
            onChange={(v) => setDraft((d) => ({ ...d, userLimit: Array.isArray(v) ? v[0] : v }))}
          >
            <Slider.Output className="text-sm font-semibold">{draft.userLimit === 0 ? '∞' : tx(t.guild.channelSettings.users, { n: draft.userLimit })}</Slider.Output>
            <Slider.Track>
              <Slider.Fill />
              <Slider.Thumb />
            </Slider.Track>
          </Slider>
          <p className="text-sm text-muted">{t.guild.channelSettings.userLimitDesc}</p>
        </div>
      )}

      {!isCategory && !voice && (
        <div className="border-t border-separator pt-6">
          <SettingSwitch
            label={t.guild.channelSettings.nsfw}
            description={t.guild.channelSettings.nsfwDesc}
            isSelected={draft.isNsfw}
            onChange={(isNsfw) => setDraft((d) => ({ ...d, isNsfw }))}
          />
        </div>
      )}
    </div>
  );
}

/* ── Permissions ──────────────────────────────────────────────────────────── */

type TriState = 'deny' | 'neutral' | 'allow';

function stateOf(o: ChannelOverride | undefined, key: PermKey): TriState {
  if (!o) return 'neutral';
  if (o.deny & P[key]) return 'deny';
  if (o.allow & P[key]) return 'allow';
  return 'neutral';
}

function applyState(o: ChannelOverride, key: PermKey, s: TriState): ChannelOverride {
  const bit = P[key];
  const allow = s === 'allow' ? o.allow | bit : o.allow & ~bit;
  const deny = s === 'deny' ? o.deny | bit : o.deny & ~bit;
  return { ...o, allow, deny };
}

const keyOf = (o: Pick<ChannelOverride, 'targetType' | 'targetId'>) => `${o.targetType}:${o.targetId}`;

function ChannelPermissions({ serverId, channel }: { serverId: string; channel: GuildChannel }) {
  const { t, tx } = useTranslation();
  const roles = useGuildRoles(serverId);
  const members = useGuildMembers(serverId);
  const parent = useGuildChannel(serverId, channel.parentId);
  const everyone = roles.find((r) => r.isDefault);
  const [loaded, setLoaded] = useState<ChannelOverride[] | null>(null);
  const [synced, setSynced] = useState(false);
  const [draft, setDraft] = useState<ChannelOverride[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(
    () =>
      getOverrides(serverId, channel.id)
        .then((res) => {
          setLoaded(res.overrides);
          setDraft(res.overrides);
          setSynced(res.synced);
        })
        .catch(() => {
          setLoaded([]);
          setDraft([]);
        }),
    [serverId, channel.id],
  );
  useEffect(() => {
    void load();
  }, [load]);

  /* Une autre fenêtre (ou un autre modérateur) a modifié les surcharges. */
  useEffect(() => {
    const onUpdate = (data: unknown) => {
      const d = ((data as { payload?: unknown })?.payload ?? data) as { channelId?: string };
      if (d?.channelId === channel.id) void load();
    };
    socketService.on('CHANNEL_PERMS_UPDATE', onUpdate);
    return () => socketService.off('CHANNEL_PERMS_UPDATE', onUpdate);
  }, [channel.id, load]);

  const byKey = useMemo(() => new Map(draft.map((o) => [keyOf(o), o])), [draft]);
  const everyoneKey = everyone ? `role:${everyone.id}` : '';
  const current = selected ?? everyoneKey;
  const currentOverride = byKey.get(current);

  const dirty = loaded !== null && JSON.stringify([...loaded].sort((a, b) => keyOf(a).localeCompare(keyOf(b)))) !== JSON.stringify([...draft].sort((a, b) => keyOf(a).localeCompare(keyOf(b))));

  useSettingsForm({
    dirty,
    save: async () => {
      if (!loaded) return;
      const before = new Map(loaded.map((o) => [keyOf(o), o]));
      const after = new Map(draft.map((o) => [keyOf(o), o]));
      for (const [k, o] of after) {
        const prev = before.get(k);
        if (!prev || prev.allow !== o.allow || prev.deny !== o.deny) await setOverride(serverId, channel.id, o);
      }
      for (const [k, o] of before) if (!after.has(k)) await deleteOverride(serverId, channel.id, o.targetType, o.targetId);
      setLoaded(draft);
      setSynced(false);
      toast.success(t.guild.settings.saved);
    },
    reset: () => loaded && setDraft(loaded),
  });

  const ensure = (targetType: 'role' | 'member', targetId: string) => {
    const k = `${targetType}:${targetId}`;
    if (!byKey.has(k)) setDraft((d) => [...d, { targetType, targetId, allow: 0, deny: 0 }]);
    setSelected(k);
  };

  const setPerm = (key: PermKey, s: TriState) => {
    if (!current) return;
    const [targetType, targetId] = current.split(':') as ['role' | 'member', string];
    setDraft((d) => {
      const existing = d.find((o) => keyOf(o) === current) ?? { targetType, targetId, allow: 0, deny: 0 };
      const next = applyState(existing, key, s);
      return d.some((o) => keyOf(o) === current) ? d.map((o) => (keyOf(o) === current ? next : o)) : [...d, next];
    });
  };

  /* Bascule « Salon privé » : @everyone ne voit plus le salon. */
  const isPrivate = everyone ? stateOf(byKey.get(everyoneKey), 'READ') === 'deny' : false;
  const togglePrivate = (on: boolean) => {
    if (!everyone) return;
    const k = everyoneKey;
    setDraft((d) => {
      const existing = d.find((o) => keyOf(o) === k) ?? { targetType: 'role' as const, targetId: everyone.id, allow: 0, deny: 0 };
      let next = applyState(existing, 'READ', on ? 'deny' : 'neutral');
      if (isVoiceType(channel.type)) next = applyState(next, 'CONNECT', on ? 'deny' : 'neutral');
      return d.some((o) => keyOf(o) === k) ? d.map((o) => (keyOf(o) === k ? next : o)) : [...d, next];
    });
  };

  const labelOf = (k: string) => {
    const [type, id] = k.split(':');
    if (type === 'role') {
      const r = roles.find((x) => x.id === id);
      return { name: r?.name ?? '?', color: r?.color, avatar: undefined as string | undefined, isEveryone: Boolean(r?.isDefault) };
    }
    const m = members[id];
    return { name: memberName(m, '?'), color: undefined, avatar: m?.user.avatarUrl, isEveryone: false };
  };

  const targets = [everyoneKey, ...draft.map(keyOf).filter((k) => k !== everyoneKey)].filter(Boolean);
  const addableRoles = roles.filter((r) => !r.isDefault && !byKey.has(`role:${r.id}`));
  const addableMembers = Object.values(members).filter((m) => !byKey.has(`member:${m.userId}`));
  const voice = isVoiceType(channel.type);
  const scoped = new Set(CHANNEL_SCOPED_KEYS);
  const q = query.trim().toLowerCase();

  if (loaded === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle description={t.guild.channelSettings.permissionsDesc}>{t.guild.channelSettings.permissions}</PageTitle>

      {parent && (
        <div className={cn('flex items-center gap-3 rounded-lg border px-4 py-3 text-sm', synced ? 'border-success/30 bg-success/10' : 'border-separator bg-surface-secondary')}>
          <RefreshCw className={cn('size-4 shrink-0', synced ? 'text-success' : 'text-muted')} aria-hidden />
          <span className="min-w-0 flex-1">{synced ? tx(t.guild.channelSettings.synced, { name: parent.name }) : tx(t.guild.channelSettings.notSynced, { name: parent.name })}</span>
          {!synced && (
            <Button
              size="sm"
              variant="secondary"
              onPress={async () => {
                await syncOverrides(serverId, channel.id);
                await load();
              }}
            >
              {t.guild.channelSettings.syncNow}
            </Button>
          )}
        </div>
      )}

      <div className="rounded-lg border border-separator bg-surface-secondary p-4">
        <SettingSwitch
          icon={Lock}
          label={channel.type === 'category' ? t.guild.create.privateCategory : t.guild.create.privateChannel}
          description={t.guild.channelSettings.privateDesc}
          isSelected={isPrivate}
          onChange={togglePrivate}
        />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Rôles / membres */}
        <div className="flex shrink-0 flex-col gap-1 lg:w-52">
          <div className="flex items-center justify-between pb-1">
            <SectionTitle>{t.guild.channelSettings.rolesMembers}</SectionTitle>
            <Dropdown>
              <Tooltip delay={300} closeDelay={0}>
                <Button isIconOnly size="sm" variant="ghost" aria-label={t.guild.channelSettings.addTarget} className="size-6 min-w-6 text-muted">
                  <Plus className="size-4" aria-hidden />
                </Button>
                <Tooltip.Content>
                  <p>{t.guild.channelSettings.addTarget}</p>
                </Tooltip.Content>
              </Tooltip>
              <Dropdown.Popover className="max-h-80 min-w-56">
                <Dropdown.Menu aria-label={t.guild.channelSettings.addTarget}>
                  <Dropdown.Section>
                    {addableRoles.map((r) => (
                      <Dropdown.Item key={r.id} id={`r-${r.id}`} textValue={r.name} onAction={() => ensure('role', r.id)}>
                        <span className="size-2.5 rounded-full" style={{ background: r.color }} aria-hidden />
                        <Label>{r.name}</Label>
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Section>
                  <Dropdown.Section>
                    {addableMembers.slice(0, 50).map((m) => (
                      <Dropdown.Item key={m.userId} id={`m-${m.userId}`} textValue={memberName(m)} onAction={() => ensure('member', m.userId)}>
                        <Avatar className="size-5 text-[9px]">
                          {m.user.avatarUrl && <Avatar.Image src={m.user.avatarUrl} alt="" />}
                          <Avatar.Fallback>{memberName(m).slice(0, 1)}</Avatar.Fallback>
                        </Avatar>
                        <Label>{memberName(m)}</Label>
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Section>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>
          {targets.map((k) => {
            const l = labelOf(k);
            const active = k === current;
            return (
              <div key={k} className={cn('group/t flex h-8 items-center gap-2 rounded-md px-2 transition-colors duration-(--dur-1)', active ? 'bg-foreground/10' : 'hover:bg-foreground/6')}>
                <button type="button" onClick={() => setSelected(k)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-focus">
                  {k.startsWith('member:') ? (
                    <Avatar className="size-5 text-[9px]">
                      {l.avatar && <Avatar.Image src={l.avatar} alt="" />}
                      <Avatar.Fallback>{l.name.slice(0, 1)}</Avatar.Fallback>
                    </Avatar>
                  ) : (
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: l.color }} aria-hidden />
                  )}
                  <span className="truncate">{l.name}</span>
                </button>
                {!l.isEveryone && (
                  <button
                    type="button"
                    aria-label={t.guild.channelSettings.removeTarget}
                    onClick={() => {
                      setDraft((d) => d.filter((o) => keyOf(o) !== k));
                      if (selected === k) setSelected(null);
                    }}
                    className="flex size-5 cursor-pointer items-center justify-center rounded-sm text-muted opacity-0 outline-none group-hover/t:opacity-100 hover:text-danger focus-visible:opacity-100"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Permissions de la cible */}
        <div className="min-w-0 flex-1">
          <SearchField value={query} onChange={setQuery} aria-label={t.guild.roles.searchPerms} className="mb-4">
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={t.guild.roles.searchPerms} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          {PERM_GROUPS.map((group) => {
            const keys = group.keys.filter((k) => scoped.has(k) && (!voice || group.id !== 'text') && (voice || group.id !== 'voice')).filter((k) => {
              if (!q) return true;
              const p = t.guild.perms[k];
              return p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q);
            });
            if (!keys.length) return null;
            return (
              <div key={group.id} className="mb-6">
                <SectionTitle className="mb-2">{t.guild.permGroups[group.id]}</SectionTitle>
                <div className="divide-y divide-separator">
                  {keys.map((key) => {
                    const s = stateOf(currentOverride, key);
                    return (
                      <div key={key} className="flex items-start gap-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-medium">{t.guild.perms[key].label}</p>
                          <p className="text-sm text-muted">{t.guild.perms[key].desc}</p>
                        </div>
                        <ToggleButtonGroup
                          selectionMode="single"
                          disallowEmptySelection
                          selectedKeys={new Set([s])}
                          onSelectionChange={(keys) => {
                            const next = [...keys][0] as TriState | undefined;
                            if (next) setPerm(key, next);
                          }}
                          size="sm"
                          aria-label={t.guild.perms[key].label}
                        >
                          <ToggleButton id="deny" isIconOnly aria-label={t.guild.channelSettings.deny} className="data-selected:bg-danger data-selected:text-(--danger-foreground)">
                            <X className="size-4" aria-hidden />
                          </ToggleButton>
                          <ToggleButton id="neutral" isIconOnly aria-label={t.guild.channelSettings.inherit}>
                            <ToggleButtonGroup.Separator />
                            <Slash className="size-3.5" aria-hidden />
                          </ToggleButton>
                          <ToggleButton id="allow" isIconOnly aria-label={t.guild.channelSettings.allow} className="data-selected:bg-success data-selected:text-(--success-foreground)">
                            <ToggleButtonGroup.Separator />
                            <Check className="size-4" aria-hidden />
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
