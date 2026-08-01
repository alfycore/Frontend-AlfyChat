'use client';

import { Button, Form, Input, Label, Meter, TextField, toast } from '@heroui/react';
import { useState } from 'react';

import { AuthHeading, AuthShell } from '@/components/alfy/auth/auth-shell';

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s += 40;
  if (pw.length >= 12) s += 20;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s += 15;
  if (/\d/.test(pw)) s += 10;
  if (/[^A-Za-z0-9]/.test(pw)) s += 15;
  return Math.min(s, 100);
}

export default function UitestResetPage() {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const score = strength(pw);
  const ok = score >= 40 && pw === confirm;

  return (
    <AuthShell>
      <div className="alfy-enter">
        <AuthHeading title="Nouveau mot de passe" subtitle="Choisissez un mot de passe solide pour votre compte." />
        <Form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            toast('Mot de passe réinitialisé', { description: 'Vous pouvez vous reconnecter.' });
          }}
        >
          <TextField name="password" type="password" value={pw} onChange={setPw} isRequired>
            <Label className="text-[11px] font-medium tracking-wider text-muted uppercase">Mot de passe</Label>
            <Input placeholder="12 caractères ou plus" autoComplete="new-password" />
          </TextField>
          {pw.length > 0 && (
            <Meter aria-label="Robustesse" value={score}>
              <Label className="text-xs">Robustesse</Label>
              <span className="text-xs text-muted">{score >= 80 ? 'Excellente' : score >= 40 ? 'Correcte' : 'Trop faible'}</span>
              <Meter.Track>
                <Meter.Fill />
              </Meter.Track>
            </Meter>
          )}
          <TextField name="confirm" type="password" value={confirm} onChange={setConfirm} isRequired>
            <Label className="text-[11px] font-medium tracking-wider text-muted uppercase">Confirmer</Label>
            <Input placeholder="Retapez le mot de passe" autoComplete="new-password" />
          </TextField>
          {confirm.length > 0 && pw !== confirm && (
            <p className="text-xs text-danger">Les mots de passe ne correspondent pas.</p>
          )}
          <Button type="submit" size="lg" className="w-full" isDisabled={!ok}>
            Réinitialiser le mot de passe
          </Button>
        </Form>
      </div>
    </AuthShell>
  );
}
