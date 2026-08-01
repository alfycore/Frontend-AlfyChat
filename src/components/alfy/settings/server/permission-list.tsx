'use client';

import { Switch } from '@heroui/react';

import { PERMISSION_LABELS, PERMISSIONS, type PermissionKey } from '@/components/alfy/mock/types';
import { SettingsRow } from '@/components/alfy/settings/section';

/** Permissions exposées dans l'éditeur (les doublons service/gateway KICK/BAN restent masqués). */
const VISIBLE: PermissionKey[] = [
  'READ',
  'SEND',
  'REACT',
  'MANAGE_MESSAGES',
  'MANAGE_CHANNELS',
  'MANAGE_ROLES',
  'KICK_MEMBERS',
  'BAN_MEMBERS',
  'ADMIN',
];

interface PermissionListProps {
  value: number;
  onChange: (next: number) => void;
}

/** Mapping bitmask ↔ interrupteurs. */
export function PermissionList({ value, onChange }: PermissionListProps) {
  return (
    <>
      {VISIBLE.map((key) => {
        const bit = PERMISSIONS[key];
        const { label, description } = PERMISSION_LABELS[key];
        const checked = (value & bit) !== 0;
        return (
          <SettingsRow
            key={key}
            label={<span className={key === 'ADMIN' ? 'text-danger' : undefined}>{label}</span>}
            description={description}
          >
            <Switch
              isSelected={checked}
              onChange={(isSelected) => onChange(isSelected ? value | bit : value & ~bit)}
              aria-label={label}
            >
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Content>
            </Switch>
          </SettingsRow>
        );
      })}
    </>
  );
}
