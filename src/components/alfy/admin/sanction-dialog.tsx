'use client';

import { useEffect, useState } from 'react';
import {
  Alert, Button, Description, Label, ListBox, Modal, Select, TextArea, TextField,
} from '@heroui/react';
import { AlertTriangle, Ban, Gavel, LogOut, VolumeX } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { api, type SanctionType } from '@/lib/api';
import { cn } from '@/lib/utils';

export const SANCTION_META: Record<
  SanctionType,
  { label: string; short: string; icon: LucideIcon; blurb: string; timed: boolean; accent: string }
> = {
  warn: {
    label: 'Avertissement',
    short: 'Averti',
    icon: AlertTriangle,
    blurb: "Consigne l'incident au dossier. Le compte n'est pas restreint.",
    timed: false,
    accent: 'border-warning bg-warning/10 text-warning',
  },
  mute: {
    label: 'Réduction au silence',
    short: 'Muet',
    icon: VolumeX,
    blurb: 'Le compte reste connecté mais ne peut plus envoyer de message, nulle part.',
    timed: true,
    accent: 'border-accent bg-accent/10 text-accent',
  },
  kick: {
    label: 'Déconnexion forcée',
    short: 'Déconnecté',
    icon: LogOut,
    blurb: 'Coupe toutes les sessions ouvertes. Le compte peut se reconnecter aussitôt.',
    timed: false,
    accent: 'border-foreground/30 bg-default text-foreground',
  },
  ban: {
    label: 'Bannissement',
    short: 'Banni',
    icon: Ban,
    blurb: 'Bloque la connexion et coupe immédiatement les sessions en cours.',
    timed: true,
    accent: 'border-danger bg-danger/10 text-danger',
  },
};

/** Durées proposées, en minutes. 0 = permanent. */
const DURATIONS = [
  { key: '60',    label: '1 heure' },
  { key: '360',   label: '6 heures' },
  { key: '1440',  label: '24 heures' },
  { key: '10080', label: '7 jours' },
  { key: '43200', label: '30 jours' },
  { key: '0',     label: 'Permanent' },
];

export interface SanctionTarget {
  id: string;
  username?: string;
  displayName?: string;
}

export function SanctionDialog({
  isOpen,
  onOpenChange,
  target,
  defaultType = 'ban',
  onApplied,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  target: SanctionTarget | null;
  defaultType?: SanctionType;
  /** Appelé après une sanction appliquée avec succès. */
  onApplied?: () => void;
}) {
  const [type, setType] = useState<SanctionType>(defaultType);
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('1440');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Repartir d'un formulaire vierge à chaque ouverture
  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setReason('');
      setDuration('1440');
      setError(null);
    }
  }, [isOpen, defaultType]);

  const meta = SANCTION_META[type];

  const submit = async () => {
    if (!target) return;
    if (reason.trim().length < 3) {
      setError('Le motif doit contenir au moins 3 caractères.');
      return;
    }

    setSaving(true);
    setError(null);

    const res = await api.sanctionUser(target.id, {
      type,
      reason: reason.trim(),
      durationMinutes: meta.timed && duration !== '0' ? Number(duration) : null,
    });

    setSaving(false);

    if (!res.success) {
      setError(res.error ?? "La sanction n'a pas pu être appliquée.");
      return;
    }

    onOpenChange(false);
    onApplied?.();
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[460px]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-danger/12 text-danger">
              <Gavel className="size-5" aria-hidden />
            </Modal.Icon>
            <Modal.Heading>Sanctionner un compte</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="space-y-4">
            {target && (
              <p className="text-sm text-muted">
                <span className="font-medium text-foreground">
                  {target.displayName ?? target.username}
                </span>
                {target.username && <> · @{target.username}</>}
              </p>
            )}

            {/* Type de sanction */}
            <div>
              <p className="mb-2 text-xs font-medium text-muted">Type de sanction</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(SANCTION_META) as SanctionType[]).map((key) => {
                  const m = SANCTION_META[key];
                  const Icon = m.icon;
                  const active = type === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setType(key)}
                      aria-pressed={active}
                      className={cn(
                        'flex items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm',
                        'transition-all duration-150',
                        active
                          ? m.accent
                          : 'border-border text-muted hover:bg-surface-secondary hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="truncate font-medium">{m.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">{meta.blurb}</p>
            </div>

            {/* Durée — seulement pour les sanctions qui courent dans le temps */}
            {meta.timed && (
              <Select selectedKey={duration} onSelectionChange={(k) => setDuration(String(k))}>
                <Label>Durée</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {DURATIONS.map((d) => (
                      <ListBox.Item key={d.key} id={d.key} textValue={d.label}>
                        <Label>{d.label}</Label>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}

            {/* Motif */}
            <TextField value={reason} onChange={setReason} isRequired>
              <Label>Motif</Label>
              <TextArea
                rows={3}
                placeholder="Ex. : harcèlement répété en messages privés malgré un premier avertissement"
              />
              <Description>Consigné au dossier et visible par le staff.</Description>
            </TextField>

            {error && (
              <Alert status="danger">
                <Alert.Content>
                  <Alert.Description>{error}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button slot="close" variant="tertiary" isDisabled={saving}>
              Annuler
            </Button>
            <Button variant="danger" onPress={submit} isPending={saving}>
              Appliquer — {meta.label}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
