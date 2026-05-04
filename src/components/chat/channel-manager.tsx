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
} from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/components/locale-provider';

// ── Permission categories by channel type ──

type PermFlag = { flag: number; labelKey: string; key: string; description?: string };

// Values MUST match server-node/src/enums/Permission.ts
const PERM_GENERAL: PermFlag[] = [
  { flag: 0x1,  labelKey: 'viewChannel',   key: 'view',          description: 'Permet de voir le salon dans la liste' },
  { flag: 0x80, labelKey: 'manageChannel', key: 'manage_channel', description: 'Modifier le nom, la description, les permissions…' },
];

const PERM_TEXT: PermFlag[] = [
  { flag: 0x2,    labelKey: 'sendMessages',    key: 'send',             description: 'Publier des messages dans le salon' },
  { flag: 0x200,  labelKey: 'manageMessages',  key: 'manage_messages',  description: 'Supprimer ou épingler les messages' },
  { flag: 0x8,    labelKey: 'attachFiles',     key: 'attach',           description: 'Envoyer des images et fichiers' },
  { flag: 0x4000, labelKey: 'mentionEveryone', key: 'mention_everyone', description: 'Utiliser @everyone et @here' },
];

const PERM_VOICE: PermFlag[] = [
  { flag: 0x10, labelKey: 'connect', key: 'voice_connect', description: 'Rejoindre le salon vocal' },
  { flag: 0x20, labelKey: 'speak',   key: 'voice_speak',   description: 'Transmettre du son dans le salon' },
];

const PERM_TEXT_BY_TYPE: Partial<Record<ChannelType, PermFlag[]>> = {
  announcement: [
    { flag: 0x2,    labelKey: 'postAnnouncement',    key: 'send',             description: 'Rédiger et publier des annonces officielles' },
    { flag: 0x200,  labelKey: 'manageAnnouncements', key: 'manage_messages',  description: 'Modifier ou supprimer les annonces' },
    { flag: 0x4000, labelKey: 'mentionEveryone',     key: 'mention_everyone', description: 'Notifier tous les membres' },
  ],
  forum: [
    { flag: 0x2,   labelKey: 'createThread',  key: 'send',            description: 'Ouvrir un nouveau fil de discussion' },
    { flag: 0x200, labelKey: 'manageThreads', key: 'manage_messages', description: 'Épingler, supprimer ou verrouiller' },
    { flag: 0x8,   labelKey: 'attachFiles',   key: 'attach',          description: 'Ajouter des images aux fils' },
  ],
  gallery: [
    { flag: 0x2,   labelKey: 'shareContent',    key: 'send',            description: 'Publier des images et vidéos dans la galerie' },
    { flag: 0x200, labelKey: 'moderateGallery', key: 'manage_messages', description: 'Supprimer les publications' },
  ],
  poll: [
    { flag: 0x2,   labelKey: 'createPoll',  key: 'send',            description: 'Ouvrir un nouveau sondage' },
    { flag: 0x200, labelKey: 'managePolls', key: 'manage_messages', description: 'Clôturer ou supprimer les sondages' },
  ],
  suggestion: [
    { flag: 0x2,   labelKey: 'submitIdea',  key: 'send',            description: 'Proposer une idée à la communauté' },
    { flag: 0x200, labelKey: 'manageIdeas', key: 'manage_messages', description: 'Accepter, refuser ou supprimer' },
  ],
  doc: [
    { flag: 0x2,   labelKey: 'createDoc',  key: 'send',            description: 'Rédiger un nouveau document' },
    { flag: 0x200, labelKey: 'manageDocs', key: 'manage_messages', description: 'Supprimer ou archiver les documents' },
  ],
  counting: [
    { flag: 0x2,   labelKey: 'postNumber', key: 'send',            description: 'Participer au comptage collectif' },
    { flag: 0x200, labelKey: 'resetCount', key: 'manage_messages', description: 'Remettre le compteur à zéro' },
  ],
  vent: [
    { flag: 0x2,   labelKey: 'ventExpress', key: 'send',            description: 'Poster librement ses frustrations' },
    { flag: 0x200, labelKey: 'moderate',    key: 'manage_messages', description: 'Supprimer les messages problématiques' },
  ],
  thread: [
    { flag: 0x2,   labelKey: 'createThread',  key: 'send',            description: 'Démarrer un nouveau fil' },
    { flag: 0x200, labelKey: 'manageThreads', key: 'manage_messages', description: 'Archiver ou supprimer des fils' },
    { flag: 0x8,   labelKey: 'attachFiles',   key: 'attach',          description: 'Ajouter des pièces jointes' },
  ],
  media: [
    { flag: 0x2,   labelKey: 'shareMedia',  key: 'send',            description: 'Publier des vidéos, images ou sons' },
    { flag: 0x200, labelKey: 'manageMedia', key: 'manage_messages', description: 'Supprimer les publications' },
  ],
};

const PERM_STAGE: PermFlag[] = [
  { flag: 0x10, labelKey: 'joinAsAudience', key: 'voice_connect', description: 'Assister à la scène en tant qu\'auditeur' },
  { flag: 0x20, labelKey: 'takeSpeech',     key: 'voice_speak',   description: 'Parler comme orateur désigné par l\'hôte' },
  { flag: 0x2,  labelKey: 'sendMessages',   key: 'send',          description: 'Utiliser le chat pendant la scène' },
];

function getPermDict(channelType: ChannelType, cTypes: Record<string, string>): Record<string, PermFlag[]> {
  const dict: Record<string, PermFlag[]> = { 'General': PERM_GENERAL };
  if (channelType === 'stage') {
    dict[cTypes.stage ?? 'Stage'] = PERM_STAGE;
  } else if (channelType === 'voice') {
    dict[cTypes.voice ?? 'Voice'] = PERM_VOICE;
  } else {
    dict[cTypes.text ?? 'Text'] = PERM_TEXT_BY_TYPE[channelType] ?? PERM_TEXT;
  }
  return dict;
}

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

const CHANNEL_TYPES: { id: ChannelType; icon: any; label: string; description: string; color: string }[] = [
  { id: 'text',         icon: HashIcon,       label: 'Texte',       description: 'Messages en temps réel',        color: 'text-muted-foreground/60' },
  { id: 'announcement', icon: MegaphoneIcon,  label: 'Annonce',     description: 'Informations officielles',      color: 'text-amber-400'           },
  { id: 'voice',        icon: Volume2Icon,    label: 'Vocal',       description: 'Audio / vidéo en direct',       color: 'text-green-400'           },
  { id: 'forum',        icon: ForumIcon,      label: 'Forum',       description: 'Fils de discussion',            color: 'text-blue-400'            },
  { id: 'stage',        icon: StageIcon,      label: 'Scène',       description: 'Présentations live',            color: 'text-purple-400'          },
  { id: 'gallery',      icon: GalleryIcon,    label: 'Galerie',     description: 'Images & médias',               color: 'text-pink-400'            },
  { id: 'poll',         icon: PollIcon,       label: 'Sondage',     description: 'Votes & enquêtes',              color: 'text-orange-400'          },
  { id: 'suggestion',   icon: SuggestionIcon, label: 'Suggestion',  description: 'Boîte à idées',                 color: 'text-emerald-400'         },
  { id: 'doc',          icon: DocIcon,        label: 'Document',    description: 'Ressources & docs partagés',    color: 'text-sky-400'             },
  { id: 'counting',     icon: CountingIcon,   label: 'Comptage',    description: 'Compteur collaboratif',         color: 'text-rose-400'            },
  { id: 'vent',         icon: VentIcon,       label: 'Défouloir',   description: 'Exprimer ses frustrations',     color: 'text-red-400'             },
  { id: 'thread',       icon: ThreadIcon,     label: 'Fil',         description: 'Discussions thématiques',       color: 'text-violet-400'          },
  { id: 'media',        icon: MediaIcon,      label: 'Médias',      description: 'Vidéos, clips & sons',          color: 'text-cyan-400'            },
];

export function ChannelManager({ serverId, onChannelsChanged }: ChannelManagerProps) {
  const { t } = useTranslation();
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
    const Icon = CHANNEL_TYPE_ICON[type] ?? HashIcon;
    const colorCls = CHANNEL_TYPES.find((t) => t.id === type)?.color ?? 'text-[var(--muted)]';
    return <Icon size={16} className={cn('shrink-0', colorCls)} />;
  };

  const DeleteConfirm = ({ target, indent = false }: { target: Channel; indent?: boolean }) => (
    <div className={cn('rounded-2xl border border-destructive/30 bg-destructive/5 p-4 space-y-3', indent && 'ml-4')}>
      <p className="text-[13px] font-semibold text-destructive">
        {target.type === 'category' ? t.channelMgr.deleteCategory : t.channelMgr.deleteChannel}
      </p>
      <p className="text-[13px] text-[var(--muted)]">
        {target.type === 'category' ? (
          <>Supprimer la catégorie <strong className="text-[var(--foreground)]">{target.name}</strong> ? Les salons à l&apos;intérieur ne seront pas supprimés.</>
        ) : (
          <>Supprimer <strong className="text-[var(--foreground)]">#{target.name}</strong> ? Tous les messages seront perdus.</>
        )}
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>{t.channelMgr.cancel}</Button>
        <Button size="sm" className="bg-destructive text-white hover:bg-destructive/90" onClick={handleDelete}>{t.messageItem.delete}</Button>
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
              size="icon-sm"
              onClick={() => setPermsChannel(permsChannel?.id === channel.id ? null : channel)}
              disabled={isEditorOpen}
              className={cn(permsChannel?.id === channel.id && 'text-[var(--accent)]')}
            >
              <ShieldIcon size={14} />
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(channel)} disabled={isEditorOpen}>
            <PencilIcon size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive"
            onClick={() => setDeleteTarget(deleteTarget?.id === channel.id ? null : channel)}
            disabled={isEditorOpen}
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
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--border)]/40 bg-[var(--surface-secondary)]/10 px-3 py-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--surface-secondary)]/40">
                <FolderOpenIcon size={16} className="shrink-0 text-[var(--muted)]" />
              </div>
              <span className="flex-1 truncate text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">
                {cat.name}
              </span>
              <div className="flex items-center gap-1">
                {!isEditorOpen && (
                  <Button variant="ghost" size="icon-sm" onClick={() => openCreate('text', cat.id)}>
                    <PlusIcon size={14} />
                  </Button>
                )}
                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(cat)} disabled={isEditorOpen}>
                  <PencilIcon size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  onClick={() => setDeleteTarget(deleteTarget?.id === cat.id ? null : cat)}
                  disabled={isEditorOpen}>
                  <Trash2Icon size={14} />
                </Button>
              </div>
            </div>
            {deleteTarget?.id === cat.id && <DeleteConfirm target={cat} />}
            {catChannels.map((ch) => (
              <ChannelRow key={ch.id} channel={ch} indent />
            ))}
            {catChannels.length === 0 && <p className="ml-4 text-xs text-[var(--muted)]/50">{t.channelMgr.emptyCategory}</p>}
          </div>
        );
      })}

      {channels.length === 0 && !isEditorOpen && <p className="text-sm text-[var(--muted)]">{t.channelMgr.noChannels}</p>}

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
            onClick={() => openCreate('text')}
          >
            <PlusIcon size={14} />
            {t.channelMgr.newChannel}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl border-[var(--border)]/60"
            onClick={() => openCreate('category')}
          >
            <FolderOpenIcon size={14} />
            {t.channelMgr.newCategory}
          </Button>
        </div>
      )}

      {/* Inline editor */}
      {isEditorOpen && (
        <div className="space-y-4 rounded-2xl border border-[var(--border)]/60 bg-[var(--surface-secondary)]/20 p-5">
          <h4 className="text-sm font-semibold">
            {isCreating
              ? formType === 'category'
                ? t.channelMgr.newCategory
                : t.channelMgr.newChannelTitle
              : t.channelMgr.editChannelTitle.replace('{name}', editingChannel?.name ?? '')}
          </h4>

          {/* Type visual grid */}
          {isCreating && formType !== 'category' && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">{t.channelMgr.channelType}</span>
              <div className="grid grid-cols-2 gap-1.5">
              {CHANNEL_TYPES.map(({ id, icon: Icon, color }) => {
                  const typeLabel = (t.channelMgr.channelTypes as Record<string, string>)[id] ?? id;
                  const typeDesc  = (t.channelMgr.channelDescs as Record<string, string>)[id] ?? '';
                  const isSelected = formType === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFormType(id)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all duration-200',
                        isSelected
                          ? 'border-[var(--accent)]/40 bg-[var(--accent)]/8'
                          : 'border-[var(--border)]/40 hover:bg-[var(--surface-secondary)]/30',
                      )}
                    >
                      <span className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                        isSelected ? 'bg-[var(--accent)]/15' : 'bg-[var(--surface-secondary)]/50',
                      )}>
                        <Icon size={15} className={isSelected ? 'text-[var(--accent)]' : color} />
                      </span>
                      <div className="min-w-0">
                        <p className={cn('truncate text-[12px] font-semibold leading-tight', isSelected ? 'text-[var(--accent)]' : 'text-[var(--foreground)]')}>{typeLabel}</p>
                        <p className="truncate text-[10px] leading-tight text-[var(--muted)]/70">{typeDesc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Name input */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">
              {formType === 'category' ? t.channelMgr.categoryName : t.channelMgr.channelName}
            </span>
            <Input
                value={formName}
                onChange={(e) =>
                  setFormName(formType === 'category' ? e.target.value : e.target.value.toLowerCase().replace(/\s+/g, '-'))
                }
                placeholder={formType === 'category' ? t.channelMgr.categoryPlaceholder : t.channelMgr.channelPlaceholder}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="rounded-xl border-[var(--border)]/60 bg-[var(--background)]/60"
              />
          </div>

          {/* Category pills */}
          {isCreating && formType !== 'category' && categories.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">{t.channelMgr.categoryOptional}</span>
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
                  {t.channelMgr.none}
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
            <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={isSaving} className="rounded-lg">
              <XIcon size={14} className="mr-1.5" />
              {t.channelMgr.cancel}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!formName.trim() || isSaving} className="rounded-lg">
              {isSaving ? (
                <Loader2Icon size={14} className="mr-1.5 animate-spin" />
              ) : (
                <SaveIcon size={14} className="mr-1.5" />
              )}
              {isCreating ? t.channelMgr.create : t.channelMgr.save}
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
  const { t } = useTranslation();

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
  const permDict = getPermDict(channel.type, t.channelMgr.channelTypes as unknown as Record<string, string>);

  if (loading) {
    return (
      <div className="rounded-lg border bg-[var(--surface-secondary)]/30 p-4">
        <div className="flex items-center gap-2">
          <Spinner size="sm" />
          <span className="text-sm text-[var(--muted)]">{t.serverStatus.loading}</span>
        </div>
      </div>
    );
  }

  const STATE_LABEL: Record<string, string> = {
    allow:   t.channelMgr.allow,
    deny:    t.channelMgr.deny,
    inherit: t.channelMgr.inherit,
  };

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--border)]/60 bg-[var(--surface-secondary)]/20 p-5">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--surface-secondary)]/40">
            <ShieldIcon size={16} />
          </div>
          {t.channelMgr.permissions.replace('{name}', channel.name)}
          <span className="ml-1 rounded-lg bg-[var(--surface-secondary)]/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
            {channel.type}
          </span>
        </h4>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <XIcon size={14} />
        </Button>
      </div>

      {roles.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">{t.channelMgr.noRoles}</p>
      ) : (
        <>
          {/* Role selector */}
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

          {/* Permission categories */}
          {selectedRole && (
            <div className="space-y-4">
              {Object.entries(permDict).map(([category, flags]) => (
                <div key={category}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">
                    {category}
                  </p>
                  <div className="space-y-1 rounded-xl border border-[var(--border)]/30 bg-[var(--background)]/30 p-1">
                    {flags.map(({ flag, labelKey, description }) => {
                      const state = getPermState(selectedRole.id, flag);
                      const permLabel = (t.channelMgr.perm as unknown as Record<string, string>)[labelKey] ?? labelKey;
                      return (
                        <button
                          key={flag}
                          onClick={() => cyclePermState(selectedRole.id, flag)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-all duration-200 hover:bg-[var(--surface-secondary)]/30"
                        >
                          <span
                            className={cn(
                              'flex size-5 shrink-0 items-center justify-center rounded-lg border text-xs transition-colors',
                              state === 'allow' && 'border-success bg-success/10 text-success',
                              state === 'deny' && 'border-destructive bg-destructive/10 text-destructive',
                              state === 'inherit' && 'border-[var(--border)] text-[var(--muted)]',
                            )}
                          >
                            {state === 'allow' && <CheckIcon size={12} />}
                            {state === 'deny' && <XIcon size={12} />}
                            {state === 'inherit' && <MinusIcon size={12} />}
                          </span>
                          <div className="min-w-0 flex-1 text-left">
                            <span className="block text-[13px] font-medium">{permLabel}</span>
                            {description && (
                              <span className="block text-[11px] text-[var(--muted)]/70">{description}</span>
                            )}
                          </div>
                          <span
                            className={cn(
                              'shrink-0 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                              state === 'allow' && 'bg-success/10 text-success',
                              state === 'deny' && 'bg-destructive/10 text-destructive',
                              state === 'inherit' && 'bg-[var(--surface-secondary)]/50 text-[var(--muted)]',
                            )}
                          >
                            {STATE_LABEL[state]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <p className="text-[10px] text-[var(--muted)]">
                {t.channelMgr.toggleHint}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
