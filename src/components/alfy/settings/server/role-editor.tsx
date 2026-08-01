'use client';

import { Button, ColorSwatchPicker, Input, Label, Switch, TextField, toast } from '@heroui/react';
import { useState } from 'react';

import type { AlfyRole } from '@/components/alfy/mock/types';
import { RoleChip } from '@/components/alfy/primitives/role-chip';
import { SettingsContent, SettingsRow, SettingsSection } from '@/components/alfy/settings/section';
import { PermissionList } from '@/components/alfy/settings/server/permission-list';

const ROLE_COLORS = [
  '#a78bfa', '#818cf8', '#38bdf8', '#22d3ee', '#4ade80',
  '#facc15', '#fb923c', '#f87171', '#f472b6', '#94a3b8',
];

interface RoleEditorProps {
  role: AlfyRole;
  onSave?: (role: AlfyRole) => void;
}

export function RoleEditor({ role, onSave }: RoleEditorProps) {
  const [draft, setDraft] = useState<AlfyRole>(role);
  // Resynchronise le brouillon quand on change de rôle sélectionné.
  const [lastRoleId, setLastRoleId] = useState(role.id);
  if (role.id !== lastRoleId) {
    setDraft(role);
    setLastRoleId(role.id);
  }

  return (
    <div className="alfy-enter">
      <SettingsSection title="Apparence du rôle">
        <SettingsContent className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end gap-4">
            <TextField
              value={draft.name}
              onChange={(name) => setDraft((d) => ({ ...d, name }))}
              className="w-52"
            >
              <Label>Nom du rôle</Label>
              <Input placeholder="Nom du rôle" />
            </TextField>
            <TextField
              value={draft.emoji ?? ''}
              onChange={(emoji) => setDraft((d) => ({ ...d, emoji: emoji || undefined }))}
              className="w-20"
            >
              <Label>Emoji</Label>
              <Input placeholder="🛡️" />
            </TextField>
            <div className="pb-1.5">
              <p className="mb-1 text-[11px] text-muted">Aperçu</p>
              <RoleChip role={draft} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted">Couleur</p>
            <ColorSwatchPicker
              value={draft.color}
              onChange={(c) => setDraft((d) => ({ ...d, color: c.toString('hex') }))}
              aria-label="Couleur du rôle"
            >
              {ROLE_COLORS.map((color) => (
                <ColorSwatchPicker.Item key={color} color={color}>
                  <ColorSwatchPicker.Swatch />
                  <ColorSwatchPicker.Indicator />
                </ColorSwatchPicker.Item>
              ))}
            </ColorSwatchPicker>
          </div>
        </SettingsContent>
        <SettingsRow
          label="Afficher séparément"
          description="Les membres de ce rôle apparaissent dans leur propre groupe de la liste des membres."
        >
          <Switch
            isSelected={draft.hoisted}
            onChange={(hoisted) => setDraft((d) => ({ ...d, hoisted }))}
            aria-label="Afficher séparément"
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Permissions"
        description="Stockées en bitmask — identiques à celles appliquées par la passerelle."
      >
        <PermissionList
          value={draft.permissions}
          onChange={(permissions) => setDraft((d) => ({ ...d, permissions }))}
        />
      </SettingsSection>

      <div className="flex justify-end gap-2">
        <Button variant="tertiary" onPress={() => setDraft(role)}>
          Réinitialiser
        </Button>
        <Button
          onPress={() => {
            onSave?.(draft);
            toast('Rôle enregistré', { description: `« ${draft.name} » a été mis à jour.` });
          }}
        >
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
