'use client';

import { AlertDialog, Button, Chip, Dropdown, ListBox, Label, toast } from '@heroui/react';
import { Ellipsis, Plus, Shield, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { AlfyRole, AlfyServer } from '@/components/alfy/mock/types';
import { PERMISSIONS } from '@/components/alfy/mock/types';
import type { MemberPerms } from '@/lib/server-perms';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { RoleEditor } from '@/components/alfy/settings/server/role-editor';

interface RolesPanelProps {
  server: AlfyServer;
  /** Droits du membre courant — l'éditeur est en lecture seule sans MANAGE_ROLES. */
  perms?: MemberPerms;
  /** Persistance réelle du rôle édité (socket, permissions en bitmask). */
  onSaveRole?: (role: AlfyRole) => void;
  /** Création réelle (socket). Sans ce callback, le bouton n'est pas affiché. */
  onCreateRole?: (data: { name: string; color?: string; permissions?: number }) => void;
  /** Suppression réelle (socket). */
  onDeleteRole?: (roleId: string) => void;
}

/** Maître-détail : liste des rôles à gauche, éditeur à droite. */
export function RolesPanel({ server, perms, onSaveRole, onCreateRole, onDeleteRole }: RolesPanelProps) {
  const [roles, setRoles] = useState<AlfyRole[]>(server.roles);
  const [selectedId, setSelectedId] = useState(roles[0]?.id);
  const [deleteTarget, setDeleteTarget] = useState<AlfyRole | null>(null);
  const canManage = perms?.canManageRoles ?? Boolean(onSaveRole);

  // Les rôles réels arrivent en asynchrone : resynchroniser à leur arrivée.
  const [lastServerRoles, setLastServerRoles] = useState(server.roles);
  if (server.roles !== lastServerRoles) {
    setLastServerRoles(server.roles);
    setRoles(server.roles);
    if (!server.roles.some((r) => r.id === selectedId)) setSelectedId(server.roles[0]?.id);
  }
  const selected = roles.find((r) => r.id === selectedId);

  const memberCount = (roleId: string) =>
    server.members.filter((m) => m.roleIds.includes(roleId)).length;

  return (
    <div>
      <PanelHeader
        title="Rôles"
        description="Les rôles définissent les permissions des membres. Un membre cumule les permissions de tous ses rôles."
      />
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full shrink-0 lg:w-52">
          <ListBox
            aria-label="Rôles du serveur"
            selectionMode="single"
            selectedKeys={selectedId ? [selectedId] : []}
            onSelectionChange={(keys) => {
              const id = [...keys][0];
              if (id) setSelectedId(String(id));
            }}
            className="w-full rounded-lg border border-border/70 bg-surface p-1.5"
          >
            {roles.map((role) => (
              <ListBox.Item key={role.id} id={role.id} textValue={role.name} className="rounded-md">
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px]"
                  style={{ backgroundColor: `${role.color}26`, color: role.color }}
                >
                  {role.emoji ?? <Shield className="size-3" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <Label className="truncate text-sm font-medium" style={{ color: role.color }}>
                    {role.name}
                  </Label>
                  <span className="text-[11px] text-muted">
                    {memberCount(role.id)} membre{memberCount(role.id) > 1 ? 's' : ''}
                  </span>
                </span>
                {(role.permissions & PERMISSIONS.ADMIN) !== 0 && (
                  <Chip size="sm" color="danger" variant="soft" className="text-[10px]">
                    Admin
                  </Chip>
                )}
              </ListBox.Item>
            ))}
          </ListBox>
          {canManage && onCreateRole && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-2 w-full"
              onPress={() => {
                // Le rôle est créé côté serveur ; il réapparaît via ROLE_CREATE.
                // Auparavant il n'existait qu'en state local et disparaissait au
                // rechargement — et l'édition ciblait un identifiant inventé.
                onCreateRole({
                  name: 'Nouveau rôle',
                  color: '#94a3b8',
                  permissions: PERMISSIONS.READ | PERMISSIONS.SEND | PERMISSIONS.REACT,
                });
                toast('Rôle en cours de création…');
              }}
            >
              <Plus className="size-3.5" />
              Créer un rôle
            </Button>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {selected && (
            <>
              {canManage && onDeleteRole && (
                <div className="mb-3 flex justify-end">
                  <Dropdown>
                    <Dropdown.Trigger
                      aria-label={`Actions pour ${selected.name}`}
                      className="flex size-7 cursor-pointer items-center justify-center rounded-sm text-muted outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <Ellipsis className="size-4" />
                    </Dropdown.Trigger>
                    <Dropdown.Popover className="min-w-48">
                      <Dropdown.Menu onAction={(k) => { if (k === 'delete') setDeleteTarget(selected); }}>
                        <Dropdown.Item id="delete" textValue="Supprimer le rôle" variant="danger">
                          <Trash2 className="size-4" />
                          <Label>Supprimer le rôle</Label>
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown>
                </div>
              )}
              <RoleEditor
                role={selected}
                onSave={(updated) => {
                  setRoles((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
                  onSaveRole?.(updated);
                }}
              />
            </>
          )}
        </div>
      </div>

      <AlertDialog
        isOpen={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-100">
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>Supprimer « {deleteTarget?.name} » ?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  Le rôle est retiré de tous les membres qui le portent. Cette action est
                  définitive.
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button slot="close" variant="tertiary">Annuler</Button>
                <Button
                  variant="danger"
                  onPress={() => {
                    if (!deleteTarget) return;
                    onDeleteRole?.(deleteTarget.id);
                    setDeleteTarget(null);
                  }}
                >
                  Supprimer
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}
