'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  HashIcon,
  Volume2Icon,
  MegaphoneIcon,
  FolderOpenIcon,
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  Loader2Icon,
  SaveIcon,
  XIcon,
  ShieldIcon,
  CheckIcon,
  MinusIcon,
  ChevronRightIcon,
  ForumIcon,
  StageIcon,
  GalleryIcon,
  PollIcon,
  SuggestionIcon,
  DocIcon,
  CountingIcon,
  VentIcon,
  ThreadIcon,
  MediaIcon,
} from '@/components/icons';
import { socketService } from '@/lib/socket';
import {
  Button,
  InputGroup,
  Spinner,
} from '@heroui/react';
import { cn } from '@/lib/utils';

// ── Permission flags ──
const PERM_FLAGS = [
  { flag: 1 << 0, label: 'Voir le salon', key: 'view' },
  { flag: 1 << 1, label: 'Envoyer des messages', key: 'send' },
  { flag: 1 << 2, label: 'Gérer les messages', key: 'manage_messages' },
  { flag: 1 << 3, label: 'Joindre des fichiers', key: 'attach' },
  { flag: 1 << 4, label: 'Mentionner @everyone', key: 'mention_everyone' },
  { flag: 1 << 5, label: 'Gérer le salon', key: 'manage_channel' },
  { flag: 1 << 10, label: 'Se connecter (vocal)', key: 'voice_connect' },
  { flag: 1 << 11, label: 'Parler (vocal)', key: 'voice_speak' },
  { flag: 1 << 12, label: 'Rendre muet (vocal)', key: 'voice_mute' },
];

interface ChannelPerm {
  channelId: string;
  roleId: string;
  allow: number;
  deny: number;
}

interface Role {
  id: string;
  name: string;
  color?: string;
  position?: number;
  isDefault?: boolean;
}

type ChannelType = 'text' | 'voice' | 'announcement' | 'category' | 'forum' | 'stage' | 'gallery' | 'poll' | 'suggestion' | 'doc' | 'counting' | 'vent' | 'thread' | 'media';

interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  topic?: string;
  position?: number;
  parentId?: string | null;
}

interface ChannelManagerProps {
  serverId: string;
  onChannelsChanged?: () => void;
}

const CHANNEL_TYPES: { id: ChannelType; icon: any; label: string }[] = [
  { id: 'text',       icon: HashIcon,       label: 'Textuel' },
  { id: 'announcement', icon: MegaphoneIcon, label: 'Annonce' },
  { id: 'voice',      icon: Volume2Icon,    label: 'Vocal' },
  { id: 'forum',      icon: ForumIcon,      label: 'Forum' },
  { id: 'stage',      icon: StageIcon,      label: 'Scène' },
  { id: 'gallery',    icon: GalleryIcon,    label: 'Galerie' },
  { id: 'poll',       icon: PollIcon,       label: 'Sondage' },
  { id: 'suggestion', icon: SuggestionIcon, label: 'Suggestions' },
  { id: 'doc',        icon: DocIcon,        label: 'Document' },
  { id: 'counting',   icon: CountingIcon,   label: 'Comptage' },
  { id: 'vent',       icon: VentIcon,       label: 'Défouloir' },
  { id: 'thread',     icon: ThreadIcon,     label: 'Fil' },
  { id: 'media',      icon: MediaIcon,      label: 'Médias' },
];

export function ChannelManager({ serverId, onChannelsChanged }: ChannelManagerProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Channel | null>(null);
  const [permsChannel, setPermsChannel] = useState<Channel | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<ChannelType>('text');
  const [formParentId, setFormParentId] = useState<string | null>(null);

  useEffect(() => {
    loadChannels();
  }, [serverId]);

  useEffect(() => {
    const handleChannelChange = (data: any) => {
      const payload = data?.payload || data;
      if (payload?.serverId === serverId) loadChannels();
    };
    socketService.on('CHANNEL_CREATE', handleChannelChange);
    socketService.on('CHANNEL_UPDATE', handleChannelChange);
    socketService.on('CHANNEL_DELETE', handleChannelChange);
    return () => {
      socketService.off('CHANNEL_CREATE', handleChannelChange);
      socketService.off('CHANNEL_UPDATE', handleChannelChange);
      socketService.off('CHANNEL_DELETE', handleChannelChange);
    };
  }, [serverId]);

  const loadChannels = () => {
    setIsLoading(true);
    socketService.requestServerChannels(serverId, (data: any) => {
      const raw = Array.isArray(data) ? data : data?.channels || [];
      const chs: Channel[] = raw.map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        parentId: ch.parentId ?? ch.parent_id ?? null,
        position: ch.position ?? 0,
        topic: ch.topic,
      }));
      setChannels(chs);
      setIsLoading(false);
    });
  };

  const openCreate = (type: ChannelType, parentId?: string) => {
    setEditingChannel(null);
    setIsCreating(true);
    setFormName('');
    setFormType(type);
    setFormParentId(parentId || null);
  };

  const openEdit = (channel: Channel) => {
    setIsCreating(false);
    setEditingChannel(channel);
    setFormName(channel.name);
    setFormType(channel.type);
    setFormParentId(channel.parentId || null);
  };

  const cancelEdit = () => {
    setEditingChannel(null);
    setIsCreating(false);
    setFormParentId(null);
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    setIsSaving(true);

    if (isCreating) {
      socketService.createChannel(serverId, {
        name: formName.trim(),
        type: formType,
        ...(formParentId ? { parentId: formParentId } : {}),
      });
    } else if (editingChannel) {
      socketService.updateChannel(serverId, editingChannel.id, { name: formName.trim() });
    }

    setIsSaving(false);
    cancelEdit();
    setTimeout(() => {
      loadChannels();
      onChannelsChanged?.();
    }, 300);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    socketService.deleteChannel(serverId, deleteTarget.id);
    setDeleteTarget(null);
    setTimeout(() => {
      loadChannels();
      onChannelsChanged?.();
    }, 300);
  };

  // ── Grouping ──
  const categories = channels
    .filter((c) => c.type === 'category')
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const categoryIds = new Set(categories.map((c) => c.id));
  const channelsByCategory = (catId: string) =>
    channels
      .filter((c) => c.type !== 'category' && c.parentId === catId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const uncategorized = channels.filter(
    (c) => c.type !== 'category' && (!c.parentId || !categoryIds.has(c.parentId)),
  );

  const isEditorOpen = isCreating || editingChannel !== null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="sm" />
      </div>
    );
  }

  const CHANNEL_TYPE_ICON: Record<string, any> = {
    text: HashIcon,
    voice: Volume2Icon,
    announcement: MegaphoneIcon,
    category: ChevronRightIcon,
    forum: ForumIcon,
    stage: StageIcon,
    gallery: GalleryIcon,
    poll: PollIcon,
    suggestion: SuggestionIcon,
    doc: DocIcon,
    counting: CountingIcon,
    vent: VentIcon,
    thread: ThreadIcon,
    media: MediaIcon,
  };

  const ChannelIcon = ({ type }: { type: string }) => {
    const icon = CHANNEL_TYPE_ICON[type] ?? HashIcon;
    return <icon size={16} className="shrink-0 text-[var(--muted)]" />;
  };

  const DeleteConfirm = ({ target, indent = false }: { target: Channel; indent?: boolean }) => (
    <div className={cn('rounded-2xl border border-red-500/30 bg-red-500/5 p-4 space-y-3', indent && 'ml-4')}>
      <p className="text-[13px] font-semibold text-red-400">
        {target.type === 'category' ? 'Supprimer la catégorie' : 'Supprimer le salon'}
      </p>
      <p className="text-[13px] text-[var(--muted)]">
        {target.type === 'category' ? (
          <>Supprimer la catégorie <strong className="text-[var(--foreground)]">{target.name}</strong> ? Les salons à l&apos;intérieur ne seront pas supprimés.</>
        ) : (
          <>Supprimer <strong className="text-[var(--foreground)]">#{target.name}</strong> ? Tous les messages seront perdus.</>
        )}
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onPress={() => setDeleteTarget(null)}>Annuler</Button>
        <Button size="sm" className="bg-red-500 text-white hover:bg-red-600" onPress={handleDelete}>Supprimer</Button>
      </div>
    </div>
  );

  const ChannelRow = ({ channel, indent = false }: { channel: Channel; indent?: boolean }) => (
    <>
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border border-[var(--border)]/40 bg-[var(--surface-secondary)]/10 px-3 py-2.5 transition-all duration-200 hover:bg-[var(--surface-secondary)]/20',
          indent && 'ml-4',
        )}
      >
        <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--surface-secondary)]/40">
          <ChannelIcon type={channel.type} />
        </div>
        <span className="flex-1 truncate text-sm">{channel.name}</span>
        <div className="flex items-center gap-1">
          {channel.type !== 'category' && (
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              onPress={() => setPermsChannel(permsChannel?.id === channel.id ? null : channel)}
              isDisabled={isEditorOpen}
              className={cn(permsChannel?.id === channel.id && 'text-[var(--accent)]')}
            >
              <ShieldIcon size={14} />
            </Button>
          )}
          <Button variant="ghost" isIconOnly size="sm" onPress={() => openEdit(channel)} isDisabled={isEditorOpen}>
            <PencilIcon size={14} />
          </Button>
          <Button
            variant="ghost"
            isIconOnly
            size="sm"
            className="text-red-500"
            onPress={() => setDeleteTarget(deleteTarget?.id === channel.id ? null : channel)}
            isDisabled={isEditorOpen}
          >
            <Trash2Icon size={14} />
          </Button>
        </div>
      </div>
      {deleteTarget?.id === channel.id && <DeleteConfirm target={channel} indent={indent} />}
    </>
  );

  return (
    <div className="space-y-4">
      {/* Uncategorized channels */}
      {uncategorized.length > 0 && (
        <div className="space-y-1.5">
          {uncategorized.map((ch) => (
            <ChannelRow key={ch.id} channel={ch} />
          ))}
        </div>
      )}

      {/* Categories with their channels */}
      {categories.map((cat) => {
        const catChannels = channelsByCategory(cat.id);
        return (
          <div key={cat.id} className="space-y-1.5">
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--border)]/40 bg-[var(--surface-secondary)]/10 px-3 py-2.5 backdrop-blur-sm">
              <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--surface-secondary)]/40">
                <FolderOpenIcon size={16} className="shrink-0 text-[var(--muted)]" />
              </div>
              <span className="flex-1 truncate text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">
                {cat.name}
              </span>
              <div className="flex items-center gap-1">
                {!isEditorOpen && (
                  <Button variant="ghost" isIconOnly size="sm" onPress={() => openCreate('text', cat.id)}>
                    <PlusIcon size={14} />
                  </Button>
                )}
                <Button variant="ghost" isIconOnly size="sm" onPress={() => openEdit(cat)} isDisabled={isEditorOpen}>
                  <PencilIcon size={14} />
                </Button>
                <Button
                  variant="ghost"
                  isIconOnly
                  size="sm"
                  className="text-red-500"
                  onPress={() => setDeleteTarget(deleteTarget?.id === cat.id ? null : cat)}
                  isDisabled={isEditorOpen}>
                  <Trash2Icon size={14} />
                </Button>
              </div>
            </div>
            {deleteTarget?.id === cat.id && <DeleteConfirm target={cat} />}
            {catChannels.map((ch) => (
              <ChannelRow key={ch.id} channel={ch} indent />
            ))}
            {catChannels.length === 0 && <p className="ml-4 text-xs text-[var(--muted)]/50">Catégorie vide</p>}
          </div>
        );
      })}

      {channels.length === 0 && !isEditorOpen && <p className="text-sm text-[var(--muted)]">Aucun salon créé.</p>}

      {/* Per-channel permissions editor */}
      {permsChannel && (
        <ChannelPermissionsEditor serverId={serverId} channel={permsChannel} onClose={() => setPermsChannel(null)} />
      )}

      {/* Action buttons */}
      {!isEditorOpen && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2 rounded-xl border-[var(--border)]/60"
            onPress={() => openCreate('text')}
          >
            <PlusIcon size={14} />
            Nouveau salon
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl border-[var(--border)]/60"
            onPress={() => openCreate('category')}
          >
            <FolderOpenIcon size={14} />
            Catégorie
          </Button>
        </div>
      )}

      {/* Inline editor */}
      {isEditorOpen && (
        <div className="space-y-4 rounded-2xl border border-[var(--border)]/60 bg-[var(--surface-secondary)]/20 p-5 backdrop-blur-sm">
          <h4 className="text-sm font-semibold">
            {isCreating
              ? formType === 'category'
                ? 'Nouvelle catégorie'
                : `Nouveau salon${formParentId ? ` dans "${categories.find((c) => c.id === formParentId)?.name}"` : ''}`
              : `Modifier "${editingChannel?.name}"`}
          </h4>

          {/* Type visual grid */}
          {isCreating && formType !== 'category' && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">Type de salon</span>
              <div className="grid grid-cols-4 gap-1.5">
                {CHANNEL_TYPES.map(({ id, icon, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFormType(id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-[11px] font-medium transition-all duration-200',
                      formType === id
                        ? 'border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'border-[var(--border)]/40 text-[var(--muted)] hover:bg-[var(--surface-secondary)]/40 hover:text-[var(--foreground)]',
                    )}
                  >
                    <icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name input */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">
              {formType === 'category' ? 'Nom de la catégorie' : 'Nom du salon'}
            </span>
            <InputGroup className="rounded-xl border-[var(--border)]/60 bg-[var(--background)]/60 backdrop-blur-sm">
              <InputGroup.Input
                value={formName}
                onChange={(e) =>
                  setFormName(formType === 'category' ? e.target.value : e.target.value.toLowerCase().replace(/\s+/g, '-'))
                }
                placeholder={formType === 'category' ? 'GÉNÉRAL' : 'mon-salon'}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </InputGroup>
          </div>

          {/* Category pills */}
          {isCreating && formType !== 'category' && categories.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">Catégorie (optionnel)</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setFormParentId(null)}
                  className={cn(
                    'rounded-xl border px-2.5 py-1 text-[11px] font-medium transition-all duration-200',
                    formParentId === null
                      ? 'border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'border-[var(--border)]/40 text-[var(--muted)] hover:bg-[var(--surface-secondary)]/40',
                  )}
                >
                  Aucune
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormParentId(cat.id)}
                    className={cn(
                      'rounded-xl border px-2.5 py-1 text-[11px] font-medium transition-all duration-200',
                      formParentId === cat.id
                        ? 'border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'border-[var(--border)]/40 text-[var(--muted)] hover:bg-[var(--surface-secondary)]/40',
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onPress={cancelEdit} isDisabled={isSaving} className="rounded-lg">
              <XIcon size={14} className="mr-1.5" />
              Annuler
            </Button>
            <Button size="sm" onPress={handleSave} isDisabled={!formName.trim() || isSaving} className="rounded-lg">
              {isSaving ? (
                <Loader2Icon size={14} className="mr-1.5 animate-spin" />
              ) : (
                <SaveIcon size={14} className="mr-1.5" />
              )}
              {isCreating ? 'Créer' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      )}


    </div>
  );
}

// ── Per-channel permissions editor ──
function ChannelPermissionsEditor({
  serverId,
  channel,
  onClose,
}: {
  serverId: string;
  channel: Channel;
  onClose: () => void;
}) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [perms, setPerms] = useState<ChannelPerm[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    socketService.requestRoles(serverId, (data: any) => {
      const r = Array.isArray(data) ? data : data?.roles || [];
      setRoles(r.sort((a: Role, b: Role) => (b.position ?? 0) - (a.position ?? 0)));
      if (r.length > 0) setSelectedRoleId(r[0].id);
    });
    socketService.requestChannelPerms(serverId, channel.id, (data: any) => {
      setPerms(data?.permissions || []);
      setLoading(false);
    });
  }, [serverId, channel.id]);

  const getRolePerm = useCallback(
    (roleId: string) => perms.find((p) => p.roleId === roleId) || { channelId: channel.id, roleId, allow: 0, deny: 0 },
    [perms, channel.id],
  );

  const getPermState = (roleId: string, flag: number): 'allow' | 'deny' | 'inherit' => {
    const p = getRolePerm(roleId);
    if (p.allow & flag) return 'allow';
    if (p.deny & flag) return 'deny';
    return 'inherit';
  };

  const cyclePermState = (roleId: string, flag: number) => {
    const current = getPermState(roleId, flag);
    const p = getRolePerm(roleId);
    let newAllow = p.allow;
    let newDeny = p.deny;

    if (current === 'inherit') {
      newAllow |= flag;
      newDeny &= ~flag;
    } else if (current === 'allow') {
      newAllow &= ~flag;
      newDeny |= flag;
    } else {
      newAllow &= ~flag;
      newDeny &= ~flag;
    }

    setPerms((prev) => {
      const exists = prev.find((pp) => pp.roleId === roleId);
      if (exists) {
        return prev.map((pp) => (pp.roleId === roleId ? { ...pp, allow: newAllow, deny: newDeny } : pp));
      }
      return [...prev, { channelId: channel.id, roleId, allow: newAllow, deny: newDeny }];
    });

    socketService.setChannelPerms(serverId, channel.id, roleId, newAllow, newDeny);
  };

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  if (loading) {
    return (
      <div className="rounded-lg border bg-[var(--surface-secondary)]/30 p-4">
        <div className="flex items-center gap-2">
          <Spinner size="sm" />
          <span className="text-sm text-[var(--muted)]">Chargement…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--border)]/60 bg-[var(--surface-secondary)]/20 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--surface-secondary)]/40">
            <ShieldIcon size={16} />
          </div>
          Permissions — #{channel.name}
        </h4>
        <Button variant="ghost" isIconOnly size="sm" onPress={onClose}>
          <XIcon size={14} />
        </Button>
      </div>

      {roles.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">Aucun rôle configuré.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={cn(
                  'rounded-xl border px-2.5 py-1 text-xs font-medium transition-all duration-200',
                  selectedRoleId === role.id
                    ? 'border-primary/40 bg-[var(--accent)]/10 text-[var(--accent)] shadow-sm'
                    : 'border-[var(--border)]/40 bg-[var(--background)]/60 text-[var(--muted)] hover:bg-[var(--surface-secondary)]/40',
                )}
                style={
                  role.color
                    ? { borderColor: selectedRoleId === role.id ? role.color : undefined, color: role.color }
                    : undefined
                }
              >
                {role.name}
              </button>
            ))}
          </div>

          {selectedRole && (
            <div className="space-y-1">
              {PERM_FLAGS.map(({ flag, label }) => {
                const state = getPermState(selectedRole.id, flag);
                return (
                  <button
                    key={flag}
                    onClick={() => cyclePermState(selectedRole.id, flag)}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-sm transition-all duration-200 hover:bg-[var(--surface-secondary)]/30"
                  >
                    <span
                      className={cn(
                        'flex size-5 items-center justify-center rounded-lg border text-xs transition-colors',
                        state === 'allow' && 'border-green-500 bg-green-500/10 text-green-500',
                        state === 'deny' && 'border-red-500 bg-red-500/10 text-red-500',
                        state === 'inherit' && 'border-[var(--border)] text-[var(--muted)]',
                      )}
                    >
                      {state === 'allow' && <CheckIcon size={12} />}
                      {state === 'deny' && <XIcon size={12} />}
                      {state === 'inherit' && <MinusIcon size={12} />}
                    </span>
                    <span className="flex-1 text-left">{label}</span>
                    <span className="text-[10px] uppercase text-[var(--muted)]">
                      {state === 'allow' ? 'Autoriser' : state === 'deny' ? 'Refuser' : 'Hériter'}
                    </span>
                  </button>
                );
              })}
              <p className="mt-2 text-[10px] text-[var(--muted)]">
                Cliquez pour alterner : Hériter → Autoriser → Refuser → Hériter
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
