'use client';

import { Button, Form, Input, Label, Link, TextField } from '@heroui/react';
import { MailCheck } from 'lucide-react';
import { useState } from 'react';

import { AuthHeading, AuthShell } from '@/components/alfy/auth/auth-shell';

export default function UitestForgotPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');

  return (
    <AuthShell>
      {sent ? (
        <div className="alfy-enter flex flex-col gap-4">
          <div className="flex size-11 items-center justify-center rounded-xl bg-success/12 text-success">
            <MailCheck className="size-5" aria-hidden />
          </div>
          <AuthHeading title="Vérifiez votre boîte mail" subtitle={`Un lien de réinitialisation a été envoyé à ${email || 'votre adresse'}.`} />
          <Button variant="secondary" className="w-full" onPress={() => setSent(false)}>
            Renvoyer le lien
          </Button>
          <Link href="/uitest/auth/login" className="text-center text-[13px] text-muted hover:text-accent">
            Retour à la connexion
          </Link>
        </div>
      ) : (
        <div className="alfy-enter">
          <AuthHeading title="Mot de passe oublié" subtitle="Saisissez votre email pour recevoir un lien de réinitialisation." />
          <Form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <TextField name="email" type="email" value={email} onChange={setEmail} isRequired>
              <Label className="text-[11px] font-medium tracking-wider text-muted uppercase">Email</Label>
              <Input placeholder="vous@exemple.fr" autoComplete="email" />
            </TextField>
            <Button type="submit" size="lg" className="w-full">
              Envoyer le lien
            </Button>
          </Form>
          <Link href="/uitest/auth/login" className="mt-6 block text-center text-[13px] text-muted hover:text-accent">
            Retour à la connexion
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
