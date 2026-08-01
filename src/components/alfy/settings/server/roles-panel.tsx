'use client';

import { Button, Chip, ListBox, Label } from '@heroui/react';
import { Plus, Shield } from 'lucide-react';
import { useState } from 'react';

import type { AlfyRole, AlfyServer } from '@/components/alfy/mock/types';
import { PERMISSIONS } from '@/components/alfy/mock/types';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { RoleEditor } from '@/components/alfy/settings/server/role-editor';

interface RolesPanelProps {
  server: AlfyServer;
  /** Persistance réelle du rôle édité (socket, permissions en bitmask). */
  onSaveRole?: (role: AlfyRole) => void;
}

/** Maître-détail : liste des rôles à gauche, éditeur à droite. */
export function RolesPanel({ server, onSaveRole }: RolesPanelProps) {
  const [roles, setRoles] = useState<AlfyRole[]>(server.roles);
  const [selectedId, setSelectedId] = useState(roles[0]?.id);

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
          <Button
            size="sm"
            variant="secondary"
            className="mt-2 w-full"
            onPress={() => {
              const nr: AlfyRole = {
                id: `r-new-${Date.now()}`,
                name: 'Nouveau rôle',
                color: '#94a3b8',
                permissions: PERMISSIONS.READ | PERMISSIONS.SEND | PERMISSIONS.REACT,
                hoisted: false,
                position: roles.length,
              };
              setRoles((r) => [...r, nr]);
              setSelectedId(nr.id);
            }}
          >
            <Plus className="size-3.5" />
            Créer un rôle
          </Button>
        </div>
        <div className="min-w-0 flex-1">
          {selected && (
            <RoleEditor
              role={selected}
              onSave={(updated) => {
                setRoles((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
                onSaveRole?.(updated);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
