'use client';

/**
 * Éditeur d'un rôle (onglets Discord) : Affichage, Permissions, Gérer les membres.
 * Les modifications s'accumulent dans un brouillon ; la barre d'enregistrement
 * du shell les applique en une fois (ou les annule).
 */

import { Avatar, Button, Checkbox, Dropdown, Input, Label, Modal, SearchField, Tabs, TextField, Tooltip } from '@heroui/react';
import { Check, Ellipsis, Plus, ShieldAlert, Trash2, UserPlus, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import { SectionTitle, SettingSwitch } from '@/components/alfy/guild/kit';
import { DANGEROUS, PERM_GROUPS, rawHas, togglePerm, type PermKey } from '@/components/alfy/guild/perms';
import { deleteRole, setMemberRoles, updateRole } from '@/components/alfy/guild/actions';
import { guildUi } from '@/components/alfy/guild/ui';
import { memberName, useGuildMembers, useMyPerms } from '@/components/alfy/guild/hooks';
import { useSettingsForm } from '@/components/alfy/guild/settings/settings-layer';
import type { GuildMember, GuildRole } from '@/components/alfy/guild/types';

/** Palette de rôles Discord (deux rangées : vive puis foncée). */
export const ROLE_COLORS = [
  '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#e91e63', '#f1c40f', '#e67e22', '#e74c3c', '#95a5a6', '#607d8b',
  '#11806a', '#1f8b4c', '#206694', '#71368a', '#ad1457', '#c27c0e', '#a84300', '#992d22', '#979c9f', '#546e7a',
];
export const DEFAULT_ROLE_COLOR = '#99aab5';

type Tab = 'display' | 'permissions' | 'members';

interface RoleEditorProps {
  serverId: string;
  role: GuildRole;
  /** Peut-on toucher à ce rôle (hiérarchie). */
  editable: boolean;
  onDeleted: () => void;
}

export function RoleEditor({ serverId, role, editable, onDeleted }: RoleEditorProps) {
  const { t, tx } = useTranslation();
  const perms = useMyPerms(serverId);
  const members = useGuildMembers(serverId);
  const [tab, setTab] = useState<Tab>(role.isDefault ? 'permissions' : 'display');
  const [draft, setDraft] = useState(() => ({
    name: role.name,
    color: role.color,
    hoist: role.hoist,
    mentionable: role.mentionable,
    permissions: role.permissions,
    iconEmoji: role.iconEmoji ?? '',
  }));
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);

  const base = { name: role.name, color: role.color, hoist: role.hoist, mentionable: role.mentionable, permissions: role.permissions, iconEmoji: role.iconEmoji ?? '' };
  const dirty = JSON.stringify(draft) !== JSON.stringify(base);

  useSettingsForm({
    dirty,
    save: () => {
      const patch: Parameters<typeof updateRole>[2] = {};
      if (draft.name.trim() !== role.name && !role.isDefault) patch.name = draft.name.trim() || role.name;
      if (draft.color !== role.color) patch.color = draft.color;
      if (draft.hoist !== role.hoist) patch.hoist = draft.hoist;
      if (draft.mentionable !== role.mentionable) patch.mentionable = draft.mentionable;
      if (draft.permissions !== role.permissions) patch.permissions = draft.permissions;
      if ((draft.iconEmoji || null) !== (role.iconEmoji || null)) patch.iconEmoji = draft.iconEmoji || null;
      updateRole(serverId, role.id, patch);
    },
    reset: () => setDraft(base),
  });

  const holders = useMemo(() => Object.values(members).filter((m) => m.roleIds.includes(role.id)), [members, role.id]);
  const candidates = useMemo(() => Object.values(members).filter((m) => !m.roleIds.includes(role.id)), [members, role.id]);

  const confirmDelete = async () => {
    const ok = await guildUi.confirm({
      title: t.guild.roles.deleteTitle,
      body: tx(t.guild.roles.deleteBody, { name: role.name }),
      confirmLabel: t.guild.roles.delete,
      danger: true,
    });
    if (!ok) return;
    deleteRole(serverId, role.id);
    onDeleted();
  };

  const q = query.trim().toLowerCase();

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="mb-4 flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-xs font-bold tracking-[0.02em] text-muted uppercase">
          {tx(t.guild.roles.editRole, { name: role.name })}
        </p>
        {!role.isDefault && editable && (
          <Dropdown>
            <Button isIconOnly size="sm" variant="ghost" aria-label={t.guild.roles.more} className="text-muted">
              <Ellipsis className="size-4.5" aria-hidden />
            </Button>
            <Dropdown.Popover placement="bottom end">
              <Dropdown.Menu aria-label={t.guild.roles.more}>
                <Dropdown.Item id="delete" textValue={t.guild.roles.delete} variant="danger" onAction={() => void confirmDelete()}>
                  <Trash2 className="size-4" aria-hidden />
                  <Label>{t.guild.roles.delete}</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        )}
      </div>

      {!editable && (
        <p className="mb-4 flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-(--warning)">
          <ShieldAlert className="size-4 shrink-0" aria-hidden />
          {t.guild.roles.aboveYou}
        </p>
      )}

      <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as Tab)} variant="secondary">
        <Tabs.ListContainer>
          <Tabs.List aria-label={t.guild.roles.tabsAria}>
            {!role.isDefault && (
              <Tabs.Tab id="display">
                {t.guild.roles.tabDisplay}
                <Tabs.Indicator />
              </Tabs.Tab>
            )}
            <Tabs.Tab id="permissions">
              {t.guild.roles.tabPermissions}
              <Tabs.Indicator />
            </Tabs.Tab>
            {!role.isDefault && (
              <Tabs.Tab id="members">
                {tx(t.guild.roles.tabMembers, { n: holders.length })}
                <Tabs.Indicator />
              </Tabs.Tab>
            )}
          </Tabs.List>
        </Tabs.ListContainer>

        {/* ── Affichage ── */}
        <Tabs.Panel id="display" className="flex flex-col gap-6 pt-6">
          <TextField value={draft.name} onChange={(name) => setDraft((d) => ({ ...d, name }))} isDisabled={!editable} isRequired>
            <Label className="text-xs font-bold tracking-[0.02em] text-muted uppercase">{t.guild.roles.name}</Label>
            <Input maxLength={32} />
          </TextField>

          <div className="flex flex-col gap-2">
            <SectionTitle>{t.guild.roles.color}</SectionTitle>
            <p className="text-sm text-muted">{t.guild.roles.colorHint}</p>
            <div className="flex flex-wrap items-start gap-3">
              <button
                type="button"
                disabled={!editable}
                onClick={() => setDraft((d) => ({ ...d, color: DEFAULT_ROLE_COLOR }))}
                aria-label={t.guild.roles.defaultColor}
                aria-pressed={draft.color === DEFAULT_ROLE_COLOR}
                className="flex h-12.5 w-16.5 cursor-pointer items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-default"
                style={{ background: DEFAULT_ROLE_COLOR }}
              >
                {draft.color === DEFAULT_ROLE_COLOR && <Check className="size-5 text-white" strokeWidth={3} aria-hidden />}
              </button>
              <label
                className={cn(
                  'relative flex h-12.5 w-16.5 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-foreground/20',
                  !editable && 'pointer-events-none opacity-60',
                )}
                style={{ background: ROLE_COLORS.includes(draft.color) || draft.color === DEFAULT_ROLE_COLOR ? undefined : draft.color }}
                aria-label={t.guild.roles.customColor}
              >
                <input
                  type="color"
                  value={draft.color}
                  onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value.toLowerCase() }))}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <span className="pointer-events-none text-[10px] font-bold text-foreground uppercase mix-blend-difference">{t.guild.roles.custom}</span>
              </label>
              <div className="grid grid-cols-10 gap-2">
                {ROLE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={!editable}
                    onClick={() => setDraft((d) => ({ ...d, color: c }))}
                    aria-label={c}
                    aria-pressed={draft.color === c}
                    className="flex size-5 cursor-pointer items-center justify-center rounded-sm outline-none transition-transform duration-(--dur-1) hover:scale-110 focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-default"
                    style={{ background: c }}
                  >
                    {draft.color === c && <Check className="size-3 text-white" strokeWidth={3.5} aria-hidden />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <TextField value={draft.iconEmoji} onChange={(iconEmoji) => setDraft((d) => ({ ...d, iconEmoji }))} isDisabled={!editable}>
            <Label className="text-xs font-bold tracking-[0.02em] text-muted uppercase">{t.guild.roles.icon}</Label>
            <Input maxLength={16} placeholder={t.guild.roles.iconPlaceholder} className="max-w-48" />
          </TextField>

          <div className="flex flex-col gap-4 border-t border-separator pt-6">
            <SettingSwitch
              label={t.guild.roles.hoist}
              isSelected={draft.hoist}
              onChange={(hoist) => setDraft((d) => ({ ...d, hoist }))}
              isDisabled={!editable}
            />
            <SettingSwitch
              label={t.guild.roles.mentionable}
              description={t.guild.roles.mentionableDesc}
              isSelected={draft.mentionable}
              onChange={(mentionable) => setDraft((d) => ({ ...d, mentionable }))}
              isDisabled={!editable}
            />
          </div>

          {/* Aperçu du nom dans le fil */}
          <div className="rounded-lg border border-separator bg-surface-secondary p-4">
            <SectionTitle className="mb-3">{t.guild.roles.preview}</SectionTitle>
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <Avatar.Fallback>A</Avatar.Fallback>
              </Avatar>
              <div>
                <p className="text-[15px] font-medium" style={{ color: draft.color === DEFAULT_ROLE_COLOR ? undefined : draft.color }}>
                  {draft.iconEmoji ? `${draft.iconEmoji} ` : ''}
                  {draft.name || t.guild.roles.newRole}
                </p>
                <p className="text-sm text-muted">{t.guild.roles.previewText}</p>
              </div>
            </div>
          </div>
        </Tabs.Panel>

        {/* ── Permissions ── */}
        <Tabs.Panel id="permissions" className="flex flex-col gap-6 pt-6">
          <div className="flex items-center gap-3">
            <SearchField value={query} onChange={setQuery} aria-label={t.guild.roles.searchPerms} className="flex-1">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder={t.guild.roles.searchPerms} />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <Button variant="ghost" size="sm" isDisabled={!editable} onPress={() => setDraft((d) => ({ ...d, permissions: 0 }))} className="text-accent">
              {t.guild.roles.clearPerms}
            </Button>
          </div>
          {role.isDefault && <p className="-mt-3 text-sm text-muted">{t.guild.roles.everyoneHint}</p>}

          {PERM_GROUPS.map((group) => {
            const keys = group.keys.filter((k) => {
              if (!q) return true;
              const p = t.guild.perms[k];
              return p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q);
            });
            if (keys.length === 0) return null;
            return (
              <div key={group.id} className="flex flex-col">
                <SectionTitle className="mb-2">{t.guild.permGroups[group.id]}</SectionTitle>
                <div className="flex flex-col divide-y divide-separator">
                  {keys.map((key) => (
                    <PermRow
                      key={key}
                      permKey={key}
                      checked={rawHas(draft.permissions, key)}
                      // Anti-escalade : on n'accorde pas un droit qu'on n'a pas.
                      grantable={perms.isOwner || (key !== 'ADMIN' && rawHas(perms.bits, key))}
                      editable={editable}
                      onChange={(on) => setDraft((d) => ({ ...d, permissions: togglePerm(d.permissions, key, on) }))}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </Tabs.Panel>

        {/* ── Membres ── */}
        <Tabs.Panel id="members" className="flex flex-col gap-4 pt-6">
          <div className="flex items-center gap-3">
            <SearchField value={query} onChange={setQuery} aria-label={t.guild.roles.searchMembers} className="flex-1">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder={t.guild.roles.searchMembers} />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <Button variant="primary" size="sm" isDisabled={!editable} onPress={() => setAdding(true)}>
              <UserPlus className="size-4" aria-hidden />
              {t.guild.roles.addMembers}
            </Button>
          </div>
          {holders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">{t.guild.roles.noMembers}</p>
          ) : (
            <ul className="flex flex-col">
              {holders
                .filter((m) => !q || memberName(m).toLowerCase().includes(q) || m.user.username.toLowerCase().includes(q))
                .map((m) => (
                  <li key={m.userId} className="group/h flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-foreground/5">
                    <Avatar className="size-8">
                      {m.user.avatarUrl && <Avatar.Image src={m.user.avatarUrl} alt="" />}
                      <Avatar.Fallback>{memberName(m).slice(0, 1)}</Avatar.Fallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{memberName(m)}</span>
                      <span className="block truncate text-xs text-muted">{m.user.username}</span>
                    </span>
                    {editable && (
                      <Tooltip delay={300} closeDelay={0}>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          aria-label={t.guild.roles.removeMember}
                          className="text-muted opacity-0 group-hover/h:opacity-100 hover:text-danger focus-visible:opacity-100"
                          onPress={() => void setMemberRoles(serverId, m.userId, m.roleIds.filter((r) => r !== role.id))}
                        >
                          <X className="size-4" aria-hidden />
                        </Button>
                        <Tooltip.Content>
                          <p>{t.guild.roles.removeMember}</p>
                        </Tooltip.Content>
                      </Tooltip>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </Tabs.Panel>
      </Tabs>

      <AddMembersModal
        isOpen={adding}
        onClose={() => setAdding(false)}
        role={role}
        candidates={candidates}
        onAdd={(ids) => {
          for (const id of ids) {
            const m = members[id];
            if (m) void setMemberRoles(serverId, id, [...m.roleIds, role.id]);
          }
          setAdding(false);
        }}
      />
    </div>
  );
}

function PermRow({
  permKey,
  checked,
  grantable,
  editable,
  onChange,
}: {
  permKey: PermKey;
  checked: boolean;
  grantable: boolean;
  editable: boolean;
  onChange: (on: boolean) => void;
}) {
  const { t } = useTranslation();
  const p = t.guild.perms[permKey];
  const danger = DANGEROUS.includes(permKey);
  // Retirer un droit qu'on n'a pas reste possible ; l'accorder, non.
  const disabled = !editable || (!checked && !grantable);
  return (
    <div className="py-3">
      <SettingSwitch
        label={
          <span className="flex items-center gap-1.5">
            {p.label}
            {danger && <ShieldAlert className="size-3.5 text-danger" aria-label={t.guild.roles.dangerous} />}
          </span>
        }
        description={!grantable && !checked ? `${p.desc} ${t.guild.roles.notGrantable}` : p.desc}
        isSelected={checked}
        onChange={onChange}
        isDisabled={disabled}
      />
    </div>
  );
}

function AddMembersModal({
  isOpen,
  onClose,
  role,
  candidates,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  role: GuildRole;
  candidates: GuildMember[];
  onAdd: (ids: string[]) => void;
}) {
  const { t, tx } = useTranslation();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const list = candidates.filter((m) => !q || memberName(m).toLowerCase().includes(q.toLowerCase()) || m.user.username.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => !o && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header className="flex-col items-start gap-0.5">
              <Modal.Heading>{t.guild.roles.addMembers}</Modal.Heading>
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <span className="size-2.5 rounded-full" style={{ background: role.color }} aria-hidden />
                {role.name}
              </p>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <SearchField value={q} onChange={setQ} aria-label={t.guild.roles.searchMembers}>
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder={t.guild.roles.searchMembers} />
                </SearchField.Group>
              </SearchField>
              <div className="max-h-72 overflow-y-auto">
                {list.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">{t.guild.roles.everyoneHasIt}</p>
                ) : (
                  list.map((m) => (
                    <Checkbox
                      key={m.userId}
                      isSelected={picked.has(m.userId)}
                      onChange={(on) =>
                        setPicked((s) => {
                          const next = new Set(s);
                          if (on) next.add(m.userId);
                          else next.delete(m.userId);
                          return next;
                        })
                      }
                      className="w-full rounded-md px-2 py-1.5 hover:bg-foreground/5"
                    >
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.Content className="flex min-w-0 items-center gap-2">
                        <Avatar className="size-7">
                          {m.user.avatarUrl && <Avatar.Image src={m.user.avatarUrl} alt="" />}
                          <Avatar.Fallback>{memberName(m).slice(0, 1)}</Avatar.Fallback>
                        </Avatar>
                        <span className="truncate text-sm font-medium">{memberName(m)}</span>
                        <span className="truncate text-xs text-muted">{m.user.username}</span>
                      </Checkbox.Content>
                    </Checkbox>
                  ))
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={onClose}>
                {t.common.cancel}
              </Button>
              <Button variant="primary" isDisabled={picked.size === 0} onPress={() => onAdd([...picked])}>
                <Plus className="size-4" aria-hidden />
                {tx(t.guild.roles.addN, { n: picked.size })}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
