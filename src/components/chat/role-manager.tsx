'use client';

import { useEffect, useState } from 'react';
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  Loader2Icon,
  SaveIcon,
  XIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CrownIcon,
  ShieldIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  StarIcon,
  ZapIcon,
  SwordIcon,
  HeartIcon,
  EyeIcon,
  FlameIcon,
  GemIcon,
  AwardIcon,
  SparklesIcon,
  BugIcon,
  BotIcon,
  SkullIcon,
  MusicIcon,
  Gamepad2Icon,
  WrenchIcon,
  HammerIcon,
  MegaphoneIcon,
  GlobeIcon,
} from '@/components/icons';
import { socketService } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover, PopoverTrigger, PopoverContent,
} from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface Role {
  id: string;
  name: string;
  color?: string;
  iconEmoji?: string;
  iconUrl?: string;
  permissions: number;
  position?: number;
  isDefault?: boolean;
}

interface RoleManagerProps {
  serverId: string;
}

// ── HugeIcons icon map for role icons ──
const ROLE_ICONS: { name: string; icon: any }[] = [
  { name: 'crown', icon: CrownIcon },
  { name: 'shield', icon: ShieldIcon },
  { name: 'shield-check', icon: ShieldCheckIcon },
  { name: 'shield-alert', icon: ShieldAlertIcon },
  { name: 'star', icon: StarIcon },
  { name: 'zap', icon: ZapIcon },
  { name: 'sword', icon: SwordIcon },
  { name: 'heart', icon: HeartIcon },
  { name: 'eye', icon: EyeIcon },
  { name: 'flame', icon: FlameIcon },
  { name: 'gem', icon: GemIcon },
  { name: 'award', icon: AwardIcon },
  { name: 'sparkles', icon: SparklesIcon },
  { name: 'bug', icon: BugIcon },
  { name: 'bot', icon: BotIcon },
  { name: 'skull', icon: SkullIcon },
  { name: 'music', icon: MusicIcon },
  { name: 'gamepad-2', icon: Gamepad2Icon },
  { name: 'wrench', icon: WrenchIcon },
  { name: 'hammer', icon: HammerIcon },
  { name: 'megaphone', icon: MegaphoneIcon },
  { name: 'globe', icon: GlobeIcon },
];

export function getRoleIconComponent(iconName?: string): any | null {
  if (!iconName) return null;
  return ROLE_ICONS.find((i) => i.name === iconName)?.icon || null;
}

// Values MUST match server-node/src/enums/Permission.ts
const PERMISSIONS = [
  { label: 'Voir les salons', value: 0x1 },
  { label: 'Envoyer des messages', value: 0x2 },
  { label: 'Lire l\'historique', value: 0x4 },
  { label: 'Joindre des fichiers', value: 0x8 },
  { label: 'Se connecter (vocal)', value: 0x10 },
  { label: 'Parler (vocal)', value: 0x20 },
  { label: 'Gérer les salons', value: 0x80 },
  { label: 'Gérer les rôles', value: 0x100 },
  { label: 'Gérer les messages', value: 0x200 },
  { label: 'Expulser des membres', value: 0x400 },
  { label: 'Bannir des membres', value: 0x800 },
  { label: 'Gérer le serveur', value: 0x1000 },
  { label: 'Gérer les invitations', value: 0x2000 },
  { label: 'Mentionner @everyone', value: 0x4000 },
  { label: 'Administrateur (toutes permissions)', value: 0x40 },
];

// VIEW_CHANNELS | SEND_MESSAGES | READ_HISTORY | CONNECT_VOICE
const DEFAULT_PERMS = 0x1 | 0x2 | 0x4 | 0x10;

export { ROLE_ICONS };

export function RoleManager({ serverId }: RoleManagerProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('#5865F2');
  const [formIcon, setFormIcon] = useState('');
  const [formPerms, setFormPerms] = useState(DEFAULT_PERMS);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => {
    loadRoles();
  }, [serverId]);

  useEffect(() => {
    const handleRoleChange = (data: any) => {
      const payload = data?.payload || data;
      if (payload?.serverId === serverId) loadRoles();
    };
    socketService.on('ROLE_CREATE', handleRoleChange);
    socketService.on('ROLE_UPDATE', handleRoleChange);
    socketService.on('ROLE_DELETE', handleRoleChange);
    return () => {
      socketService.off('ROLE_CREATE', handleRoleChange);
      socketService.off('ROLE_UPDATE', handleRoleChange);
      socketService.off('ROLE_DELETE', handleRoleChange);
    };
  }, [serverId]);

  const loadRoles = () => {
    setIsLoading(true);
    socketService.requestRoles(serverId, (data: any) => {
      if (data?.roles) {
        const sorted = (data.roles as Role[]).sort((a, b) => (b.position ?? 0) - (a.position ?? 0));
        setRoles(sorted);
      }
      setIsLoading(false);
    });
  };

  const openCreate = () => {
    setEditingRole(null);
    setIsCreating(true);
    setFormName('');
    setFormColor('#5865F2');
    setFormIcon('');
    setFormPerms(DEFAULT_PERMS);
  };

  const openEdit = (role: Role) => {
    setIsCreating(false);
    setEditingRole(role);
    setFormName(role.name);
    setFormColor(role.color || '#5865F2');
    setFormIcon(role.iconEmoji || '');
    setFormPerms(role.permissions || DEFAULT_PERMS);
  };

  const cancelEdit = () => {
    setEditingRole(null);
    setIsCreating(false);
  };

  const togglePerm = (val: number) => {
    setFormPerms((prev) => (prev & val ? prev & ~val : prev | val));
  };

  const moveRole = (role: Role, direction: 'up' | 'down') => {
    const idx = roles.findIndex((r) => r.id === role.id);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= roles.length) return;
    const other = roles[swapIdx];
    if (other.isDefault || role.isDefault) return;
    const posA = role.position ?? 0;
    const posB = other.position ?? 0;
    socketService.updateRole(serverId, role.id, { position: posB } as any);
    socketService.updateRole(serverId, other.id, { position: posA } as any);
    const updated = [...roles];
    updated[idx] = { ...role, position: posB };
    updated[swapIdx] = { ...other, position: posA };
    updated.sort((a, b) => (b.position ?? 0) - (a.position ?? 0));
    setRoles(updated);
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    setIsSaving(true);

    if (isCreating) {
      socketService.createRole(serverId, {
        name: formName.trim(),
        color: formColor,
        permissions: formPerms,
      });
      if (formIcon) {
        setTimeout(() => {
          socketService.requestRoles(serverId, (data: any) => {
            const newest = (data?.roles || []).find((r: any) => r.name === formName.trim());
            if (newest) {
              socketService.updateRole(serverId, newest.id, { iconEmoji: formIcon } as any);
            }
          });
        }, 500);
      }
    } else if (editingRole) {
      socketService.updateRole(serverId, editingRole.id, {
        name: formName.trim(),
        color: formColor,
        iconEmoji: formIcon || undefined,
        permissions: formPerms,
      });
    }

    setIsSaving(false);
    cancelEdit();
    setTimeout(() => loadRoles(), 500);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    socketService.deleteRole(serverId, deleteTarget.id);
    setDeleteTarget(null);
    setTimeout(() => loadRoles(), 300);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="sm" />
      </div>
    );
  }

  const isEditorOpen = isCreating || editingRole !== null;

  return (
    <div className="space-y-3">
      {roles.map((role, idx) => {
        const IconComp = getRoleIconComponent(role.iconEmoji);
        return (
          <div
            key={role.id}
            className="flex items-center gap-3 rounded-xl border border-[var(--border)]/40 bg-[var(--surface-secondary)]/10 px-3 py-2.5 transition-all duration-200 hover:bg-[var(--surface-secondary)]/20"
          >
            <div
              className="flex size-8 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ backgroundColor: role.color || '#5865F2' }}
            >
              {IconComp ? <IconComp size={14} /> : null}
            </div>

            <span className="flex-1 truncate text-sm font-medium">{role.name}</span>

            {role.isDefault && <span className="text-xs text-[var(--muted)]">par défaut</span>}

            <div className="flex items-center gap-0.5">
              {!role.isDefault && (
                <>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => moveRole(role, 'up')}
                    disabled={isEditorOpen || idx === 0}
                    className="text-[var(--muted)]"
                  >
                    <ChevronUpIcon size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => moveRole(role, 'down')}
                    disabled={isEditorOpen || idx === roles.length - 1}
                    className="text-[var(--muted)]"
                  >
                    <ChevronDownIcon size={14} />
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon-sm" onClick={() => openEdit(role)} disabled={isEditorOpen}>
                <PencilIcon size={14} />
              </Button>
              {!role.isDefault && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-red-500"
                  onClick={() => setDeleteTarget(role)}
                  disabled={isEditorOpen}
                >
                  <Trash2Icon size={14} />
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {!isEditorOpen && (
        <Button variant="outline" size="sm" className="w-full gap-2 rounded-xl border-[var(--border)]/60" onClick={openCreate}>
          <PlusIcon size={16} />
          Ajouter un rôle
        </Button>
      )}

      {isEditorOpen && (
        <div className="space-y-4 rounded-2xl border border-[var(--border)]/60 bg-[var(--surface-secondary)]/20 p-5">
          <h4 className="text-sm font-semibold">
            {isCreating ? 'Nouveau rôle' : `Modifier "${editingRole?.name}"`}
          </h4>

          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">
              Nom du rôle
            </span>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Administrateur, Modérateur..."
              autoFocus
              className="rounded-xl border-[var(--border)]/60 bg-[var(--background)]/60"
            />
          </div>

          <div className="flex gap-3">
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">
                Couleur
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="size-9 cursor-pointer rounded-lg border border-[var(--border)]/60 bg-transparent"
                />
                <Input
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="w-28 rounded-xl border-[var(--border)]/60 bg-[var(--background)]/60 font-mono text-sm"
                  maxLength={7}
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">
                Icône
              </span>
              <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
                <PopoverTrigger asChild>
                  <div
                    role="button"
                    className="flex h-9 w-20 items-center justify-center rounded-xl border border-[var(--border)]/60 transition-colors hover:bg-[var(--surface-secondary)]/30"
                  >
                    {formIcon ? (() => {
                      const IC = getRoleIconComponent(formIcon);
                      return IC ? <IC size={16} /> : <span className="text-xs text-[var(--muted)]">—</span>;
                    })() : (
                      <span className="text-xs text-[var(--muted)]">—</span>
                    )}
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="w-64 rounded-xl border-[var(--border)]/60 bg-popover/95 p-2 shadow-2xl"
                  align="start"
                >
                  <div className="grid grid-cols-6 gap-1">
                    <button
                      className={cn(
                        'flex size-9 items-center justify-center rounded-lg transition-all duration-200 hover:bg-[var(--surface-secondary)]/50',
                        !formIcon && 'bg-[var(--accent)]/10 ring-1 ring-primary/40',
                      )}
                      onClick={() => {
                        setFormIcon('');
                        setIconPickerOpen(false);
                      }}
                    >
                      <XIcon size={16} className="text-[var(--muted)]" />
                    </button>
                    {ROLE_ICONS.map(({ name, icon: Icon }) => (
                      <button
                        key={name}
                        className={cn(
                          'flex size-9 items-center justify-center rounded-lg transition-all duration-200 hover:bg-[var(--surface-secondary)]/50',
                          formIcon === name && 'bg-[var(--accent)]/10 ring-1 ring-primary/40',
                        )}
                        onClick={() => {
                          setFormIcon(name);
                          setIconPickerOpen(false);
                        }}
                        title={name}
                      >
                        <Icon size={16} />
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">
              Permissions
            </span>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {PERMISSIONS.map((perm) => (
                <label key={perm.value} className="flex items-center gap-2">
                  <Checkbox
                    checked={Boolean(formPerms & perm.value)}
                    onCheckedChange={() => togglePerm(perm.value)}
                  />
                  <span className="text-xs">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={isSaving} className="rounded-lg">
              <XIcon size={14} className="mr-1.5" />
              Annuler
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!formName.trim() || isSaving} className="rounded-lg">
              {isSaving ? (
                <Loader2Icon size={14} className="mr-1.5 animate-spin" />
              ) : (
                <SaveIcon size={14} className="mr-1.5" />
              )}
              Enregistrer
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="rounded-2xl border border-[var(--border)]/60 p-0 sm:max-w-sm">
          <DialogHeader className="p-5 pb-0">
            <DialogTitle>Supprimer le rôle</DialogTitle>
          </DialogHeader>
          <div className="p-5 pt-3">
            <p className="text-sm text-[var(--muted)]">
              Supprimer le rôle <strong>{deleteTarget?.name}</strong> ? Les membres qui ont ce rôle le perdront.
            </p>
          </div>
          <DialogFooter className="gap-2 p-5 pt-0">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
