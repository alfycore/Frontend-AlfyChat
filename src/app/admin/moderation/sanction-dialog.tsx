'use client';

import { useEffect, useState } from 'react';
import { Button }   from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangleIcon, BanIcon, LogOutIcon, VolumeXIcon } from '@/components/icons';
import { api } from '@/lib/api';

export type SanctionType = 'warn' | 'mute' | 'kick' | 'ban';

export const SANCTION_META: Record<
  SanctionType,
  { label: string; icon: typeof BanIcon; color: string; blurb: string; timed: boolean }
> = {
  warn: {
    label: 'Avertissement',
    icon: AlertTriangleIcon,
    color: 'bg-amber-500/15 text-amber-500 border-amber-500/25',
    blurb: "Consigne l'incident au dossier sans restreindre le compte.",
    timed: false,
  },
  mute: {
    label: 'Réduction au silence',
    icon: VolumeXIcon,
    color: 'bg-blue-500/15 text-blue-500 border-blue-500/25',
    blurb: "Le compte reste connecté mais ne peut plus envoyer de message.",
    timed: true,
  },
  kick: {
    label: 'Déconnexion forcée',
    icon: LogOutIcon,
    color: 'bg-violet-500/15 text-violet-500 border-violet-500/25',
    blurb: 'Coupe toutes les sessions. Le compte peut se reconnecter aussitôt.',
    timed: false,
  },
  ban: {
    label: 'Bannissement',
    icon: BanIcon,
    color: 'bg-red-500/15 text-red-500 border-red-500/25',
    blurb: 'Bloque la connexion et coupe les sessions ouvertes.',
    timed: true,
  },
};

/** Durées proposées, en minutes. 0 = permanent */
const DURATIONS = [
  { value: 60,      label: '1 heure' },
  { value: 360,     label: '6 heures' },
  { value: 1440,    label: '24 heures' },
  { value: 10080,   label: '7 jours' },
  { value: 43200,   label: '30 jours' },
  { value: 0,       label: 'Permanent' },
];

export function SanctionDialog({
  open,
  onOpenChange,
  user,
  defaultType = 'ban',
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: { id: string; username?: string; displayName?: string } | null;
  defaultType?: SanctionType;
  onDone?: () => void;
}) {
  const [type, setType]         = useState<SanctionType>(defaultType);
  const [reason, setReason]     = useState('');
  const [duration, setDuration] = useState(1440);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Repartir d'un formulaire vierge à chaque ouverture
  useEffect(() => {
    if (open) {
      setType(defaultType);
      setReason('');
      setDuration(1440);
      setError(null);
    }
  }, [open, defaultType]);

  const meta = SANCTION_META[type];

  const submit = async () => {
    if (!user || reason.trim().length < 3) {
      setError('Le motif doit contenir au moins 3 caractères.');
      return;
    }
    setSaving(true);
    setError(null);

    const res = await api.sanctionUser(user.id, {
      type,
      reason: reason.trim(),
      durationMinutes: meta.timed && duration > 0 ? duration : null,
    });

    setSaving(false);
    if (!res.success) {
      setError((res as any).error || 'La sanction n’a pas pu être appliquée.');
      return;
    }
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sanctionner un compte</DialogTitle>
          <DialogDescription>
            {user ? `@${user.username ?? user.id}` : ''}
            {user?.displayName ? ` — ${user.displayName}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Type de sanction */}
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(SANCTION_META) as SanctionType[]).map(key => {
              const m = SANCTION_META[key];
              const Icon = m.icon;
              const active = type === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={[
                    'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm',
                    'transition-all duration-100',
                    active
                      ? m.color
                      : 'border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  ].join(' ')}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate font-medium">{m.label}</span>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">{meta.blurb}</p>

          {/* Durée — uniquement pour les sanctions qui courent dans le temps */}
          {meta.timed && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Durée</label>
              <NativeSelect
                value={String(duration)}
                onChange={e => setDuration(Number(e.target.value))}
              >
                {DURATIONS.map(d => (
                  <NativeSelectOption key={d.value} value={String(d.value)}>
                    {d.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          )}

          {/* Motif */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Motif <span className="text-muted-foreground/60">(visible par le staff)</span>
            </label>
            <Textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ex. : harcèlement répété en DM malgré un premier avertissement"
            />
          </div>

          {error && (
            <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={submit} disabled={saving}>
            {saving ? 'Application…' : `Appliquer — ${meta.label}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
