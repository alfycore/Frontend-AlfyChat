'use client';

/**
 * Édition d'un groupe — nom, icône, accès, membres, départ/suppression.
 *
 * Droits calqués sur le backend (messages/conversations.controller) :
 *  - tout membre peut renommer le groupe et changer son icône ;
 *  - seul le propriétaire ouvre/ferme le groupe et peut le supprimer ;
 *  - propriétaire et admins retirent des membres ;
 *  - un groupe fermé n'accepte de nouveaux membres que du propriétaire.
 *
 * Les écritures passent par `GROUP_UPDATE` (socket) : le gateway notifie les
 * membres et fait rejoindre la room aux nouveaux arrivants — le conteneur se
 * rafraîchit sur l'écho de cet événement.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar, Button, Checkbox, Chip, Description, Input, Label, Modal, Radio, RadioGroup,
  ScrollShadow, SearchField, Spinner, Tabs, TextField,
} from '@heroui/react';
import { Camera, LogOut, Trash2, UserMinus, Users } from 'lucide-react';
import { toast } from 'sonner';

import { api, resolveMediaUrl } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import type { AlfyUser } from '@/components/alfy/mock/types';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';

export type GroupRole = 'owner' | 'admin' | 'member';

export interface GroupMember {
  user: AlfyUser;
  role: GroupRole;
}

interface Friend {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

interface GroupSettingsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  name: string;
  avatarUrl?: string;
  /** false = seul le propriétaire peut ajouter des membres. */
  isOpenGroup: boolean;
  members: GroupMember[];
  currentUserId: string;
  /** Appelé après « quitter » ou « supprimer » : la vue doit partir. */
  onGone: () => void;
}

export function GroupSettingsModal(props: GroupSettingsModalProps) {
  const { t } = useTranslation();
  const { isOpen, onOpenChange, members } = props;
  const [tab, setTab] = useState<'general' | 'members'>('general');

  // Chaque ouverture repart de l'onglet général.
  useEffect(() => {
    if (isOpen) setTab('general');
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[520px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t.group.edit}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-0">
              <Tabs
                variant="secondary"
                selectedKey={tab}
                onSelectionChange={(k) => setTab(k as 'general' | 'members')}
              >
                <Tabs.ListContainer className="px-6">
                  <Tabs.List aria-label={t.group.settings}>
                    <Tabs.Tab id="general">
                      {t.group.general}
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="members">
                      {t.group.membersTab.replace('{n}', String(members.length))}
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
                <Tabs.Panel id="general" className="m-0 p-0">
                  <GeneralPanel {...props} />
                </Tabs.Panel>
                <Tabs.Panel id="members" className="m-0 p-0">
                  <MembersPanel {...props} />
                </Tabs.Panel>
              </Tabs>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/* ── Général ─────────────────────────────────────────────────────────── */

function GeneralPanel({
  groupId, name, avatarUrl, isOpenGroup, members, currentUserId, onOpenChange, onGone,
}: GroupSettingsModalProps) {
  const { t } = useTranslation();
  const isOwner = members.find((m) => m.user.id === currentUserId)?.role === 'owner';

  const [draftName, setDraftName] = useState(name);
  const [access, setAccess] = useState<'open' | 'closed'>(isOpenGroup ? 'open' : 'closed');
  const [file, setFile] = useState<File | null>(null);
  const [removeIcon, setRemoveIcon] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<'leave' | 'delete' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const shownIcon = removeIcon ? undefined : preview ?? resolveMediaUrl(avatarUrl);
  const trimmed = draftName.trim();
  const dirty =
    (trimmed !== '' && trimmed !== name) ||
    !!file ||
    removeIcon ||
    (isOwner && (access === 'open') !== isOpenGroup);

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const update: { groupId: string; name?: string; avatarUrl?: string; isOpen?: boolean } = { groupId };
      if (trimmed && trimmed !== name) update.name = trimmed;
      if (isOwner && (access === 'open') !== isOpenGroup) update.isOpen = access === 'open';
      if (file) {
        const res = await api.uploadImage(file, 'avatar');
        if (!res.success || !res.data) throw new Error(res.error);
        update.avatarUrl = res.data.url;
      } else if (removeIcon) {
        // Le canal socket valide les chaînes : l'effacement passe par REST.
        await api.updateConversation(groupId, { avatarUrl: null as unknown as string });
      }
      if (Object.keys(update).length > 1) socketService.updateGroup(update);
      toast.success(t.group.saved);
      setFile(null);
      setRemoveIcon(false);
      onOpenChange(false);
    } catch {
      toast.error(t.group.saveError);
    } finally {
      setSaving(false);
    }
  };

  const leave = () => {
    socketService.leaveGroup(groupId);
    onOpenChange(false);
    onGone();
  };
  const destroy = () => {
    socketService.deleteGroup(groupId);
    onOpenChange(false);
    onGone();
  };

  return (
    <div className="flex flex-col gap-7 px-6 pt-6 pb-6">
      {/* Icône */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label={t.group.changeIcon}
          className="group relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Avatar className="size-16" color="accent" variant="soft">
            {shownIcon && <Avatar.Image src={shownIcon} alt="" />}
            <Avatar.Fallback>
              <Users className="size-6" aria-hidden />
            </Avatar.Fallback>
          </Avatar>
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity duration-(--dur-2) group-hover:opacity-100">
            <Camera className="size-5" aria-hidden />
          </span>
        </button>
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-sm font-medium text-foreground">{t.group.groupIcon}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onPress={() => inputRef.current?.click()}>
              {t.group.changeIcon}
            </Button>
            {shownIcon && (
              <Button
                size="sm"
                variant="ghost"
                onPress={() => {
                  setFile(null);
                  setRemoveIcon(true);
                }}
              >
                {t.group.removeIcon}
              </Button>
            )}
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setFile(f);
              setRemoveIcon(false);
            }
            e.target.value = '';
          }}
        />
      </div>

      {/* Nom */}
      <TextField value={draftName} onChange={setDraftName} maxLength={100} fullWidth>
        <Label>{t.group.groupName}</Label>
        <Input placeholder={t.group.groupNamePlaceholder} />
      </TextField>

      {/* Accès */}
      {isOwner && (
        <RadioGroup value={access} onChange={(v) => setAccess(v as 'open' | 'closed')}>
          <Label>{t.group.groupAccess}</Label>
          <Description>{t.group.groupAccessDesc}</Description>
          <Radio value="open">
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              {t.group.groupAccessOpen}
            </Radio.Content>
            <Description>{t.group.groupAccessOpenDesc}</Description>
          </Radio>
          <Radio value="closed">
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              {t.group.groupAccessClosed}
            </Radio.Content>
            <Description>{t.group.groupAccessClosedDesc}</Description>
          </Radio>
        </RadioGroup>
      )}

      {/* Zone dangereuse */}
      <div className="flex flex-col gap-3 rounded-xl bg-danger/6 p-4">
        <p className="text-xs font-semibold tracking-wide text-danger uppercase">{t.group.dangerZone}</p>
        {confirm ? (
          <div className="at-fade-up flex flex-col gap-3">
            <p className="text-sm text-foreground">
              {confirm === 'leave' ? t.group.leaveConfirm : t.group.deleteConfirm}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="danger" onPress={confirm === 'leave' ? leave : destroy}>
                {confirm === 'leave' ? t.group.leave : t.group.deleteGroup}
              </Button>
              <Button size="sm" variant="ghost" onPress={() => setConfirm(null)}>
                {t.group.cancel}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="danger-soft" onPress={() => setConfirm('leave')}>
              <LogOut className="size-4" aria-hidden />
              {t.group.leave}
            </Button>
            {isOwner && (
              <Button size="sm" variant="danger-soft" onPress={() => setConfirm('delete')}>
                <Trash2 className="size-4" aria-hidden />
                {t.group.deleteGroup}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="tertiary" onPress={() => onOpenChange(false)}>
          {t.group.cancel}
        </Button>
        <Button isDisabled={!dirty} isPending={saving} onPress={save}>
          {saving && <Spinner size="sm" color="current" />}
          {t.group.save}
        </Button>
      </div>
    </div>
  );
}

/* ── Membres ─────────────────────────────────────────────────────────── */

function MembersPanel({ groupId, isOpenGroup, members, currentUserId }: GroupSettingsModalProps) {
  const { t } = useTranslation();
  const myRole = members.find((m) => m.user.id === currentUserId)?.role;
  const canAdd = myRole === 'owner' || isOpenGroup;
  const canRemove = myRole === 'owner' || myRole === 'admin';

  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!canAdd) return;
    let cancelled = false;
    api.getFriends().then((res) => {
      if (cancelled) return;
      const list = (res.success && Array.isArray(res.data) ? res.data : []) as Friend[];
      setFriends(list);
    }).catch(() => !cancelled && setFriends([]));
    return () => {
      cancelled = true;
    };
  }, [canAdd]);

  const memberIds = useMemo(() => new Set(members.map((m) => m.user.id)), [members]);
  const candidates = (friends ?? [])
    .filter((f) => !memberIds.has(f.id))
    .filter((f) => {
      const q = query.trim().toLowerCase();
      return !q || f.displayName?.toLowerCase().includes(q) || f.username?.toLowerCase().includes(q);
    });

  const add = () => {
    if (picked.size === 0) return;
    socketService.updateGroup({ groupId, addParticipants: [...picked] });
    setPicked(new Set());
    setQuery('');
  };
  const remove = (userId: string) => socketService.updateGroup({ groupId, removeParticipants: [userId] });

  const roleLabel = (role: GroupRole) => (role === 'owner' ? t.group.owner : role === 'admin' ? t.group.admin : null);

  return (
    <div className="flex flex-col gap-6 px-6 pt-6 pb-6">
      {canAdd && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-foreground">{t.group.addMembers}</p>
          <SearchField value={query} onChange={setQuery} aria-label={t.group.searchFriends} fullWidth>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={t.group.searchFriends} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ScrollShadow className="max-h-44 overflow-y-auto">
            {friends === null ? (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            ) : candidates.length === 0 ? (
              <p className="py-3 text-center text-sm text-muted">
                {query ? t.group.noResults : t.group.allFriendsAdded}
              </p>
            ) : (
              <ul className="flex flex-col">
                {candidates.map((f) => (
                  <li key={f.id}>
                    <Checkbox
                      isSelected={picked.has(f.id)}
                      onChange={(on) =>
                        setPicked((prev) => {
                          const next = new Set(prev);
                          if (on) next.add(f.id);
                          else next.delete(f.id);
                          return next;
                        })
                      }
                      className="w-full rounded-lg px-2 py-1.5 transition-colors duration-(--dur-1) hover:bg-surface-secondary"
                    >
                      <Checkbox.Content className="w-full">
                        <AlfyAvatar name={f.displayName || f.username} avatarUrl={resolveMediaUrl(f.avatarUrl)} size="sm" />
                        <span className="min-w-0 flex-1 truncate text-sm">{f.displayName || f.username}</span>
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                      </Checkbox.Content>
                    </Checkbox>
                  </li>
                ))}
              </ul>
            )}
          </ScrollShadow>
          {picked.size > 0 && (
            <Button className="at-fade-up self-end" size="sm" onPress={add}>
              {t.group.addCount.replace('{n}', String(picked.size))}
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">{t.group.groupMembersTitle}</p>
        <ul className="flex flex-col">
          {members.map(({ user, role }) => {
            const me = user.id === currentUserId;
            const label = roleLabel(role);
            return (
              <li key={user.id} className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-secondary">
                <AlfyAvatar name={user.displayName} avatarUrl={user.avatarUrl} status={user.status} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-foreground">
                    {user.displayName}
                    {me && <span className="text-muted"> ({t.group.you})</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">@{user.username}</span>
                </span>
                {label && (
                  <Chip size="sm" variant="soft" color={role === 'owner' ? 'warning' : 'accent'}>
                    <Chip.Label>{label}</Chip.Label>
                  </Chip>
                )}
                {canRemove && !me && role !== 'owner' && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label={`${t.group.remove} ${user.displayName}`}
                    className={cn('text-danger opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100')}
                    onPress={() => remove(user.id)}
                  >
                    <UserMinus className="size-4" aria-hidden />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
