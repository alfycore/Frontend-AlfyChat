'use client';

import { Button, Chip, Input, Label, Switch, TextField, toast } from '@heroui/react';
import { Server, Users } from 'lucide-react';
import { useState } from 'react';

import type { AlfyServer } from '@/components/alfy/mock/types';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { TrustBadges } from '@/components/alfy/primitives/trust-badges';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { SettingsContent, SettingsRow, SettingsSection } from '@/components/alfy/settings/section';

interface OverviewPanelProps {
  server: AlfyServer;
  /** Persistance réelle ; sans elle, simple retour visuel. */
  onSave?: (data: { name?: string; isPublic?: boolean }) => void;
}

export function OverviewPanel({ server, onSave }: OverviewPanelProps) {
  const [name, setName] = useState(server.name);
  const [requireInvite, setRequireInvite] = useState(!server.isPublic);

  return (
    <div>
      <PanelHeader title="Vue d'ensemble" description="Identité et visibilité du serveur." />

      {/* Carte d'identité du serveur */}
      <div className="mb-8 flex items-center gap-4 rounded-lg border border-border/70 bg-surface p-5">
        <AlfyAvatar name={server.name} avatarUrl={server.iconUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold">{server.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
            <Users className="size-3" aria-hidden />
            {server.members.length} membres
            {server.selfHosted && (
              <Chip size="sm" color="success" variant="soft" className="ml-1">
                <Server className="size-2.5" aria-hidden />
                <Chip.Label>Auto-hébergé</Chip.Label>
              </Chip>
            )}
          </p>
        </div>
        <Button size="sm" variant="secondary">
          Changer l&apos;icône
        </Button>
      </div>

      <SettingsSection title="Identité">
        <SettingsContent>
          <TextField value={name} onChange={setName} className="max-w-sm">
            <Label>Nom du serveur</Label>
            <Input placeholder="Nom du serveur" />
          </TextField>
        </SettingsContent>
      </SettingsSection>

      <SettingsSection title="Accès">
        <SettingsRow
          label="Sur invitation uniquement"
          description="Le serveur n'apparaît pas dans la découverte publique ; il faut un lien d'invitation pour le rejoindre."
        >
          <Switch isSelected={requireInvite} onChange={setRequireInvite} aria-label="Sur invitation uniquement">
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </SettingsRow>
      </SettingsSection>

      {server.selfHosted && (
        <SettingsSection
          title="Souveraineté"
          description="Les messages de ce serveur sont stockés sur votre propre nœud, pas sur l'infrastructure AlfyChat."
        >
          <SettingsRow label="Garanties">
            <TrustBadges compact />
          </SettingsRow>
        </SettingsSection>
      )}

      <div className="flex justify-end">
        <Button
          onPress={() => {
            onSave?.({ name, isPublic: !requireInvite });
            toast('Serveur enregistré', { description: name });
          }}
        >
          Enregistrer les modifications
        </Button>
      </div>
    </div>
  );
}
