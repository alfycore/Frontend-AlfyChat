'use client';

import { Button, FieldError, Form, Input, InputOTP, Label, Link, Spinner, TextField, toast } from '@heroui/react';
import { ShieldCheck } from 'lucide-react';
import NextLink from 'next/link';
import { useState } from 'react';

import { AuthHeading } from '@/components/alfy/auth/auth-shell';
import { useTranslation } from '@/components/locale-provider';

type Step = 'form' | '2fa';

export function LoginCard() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('2fa');
    }, 700);
  };

  if (step === '2fa') {
    return (
      <div className="alfy-enter flex flex-col gap-6">
        <div className="flex flex-col items-start gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-accent/12 text-accent">
            <ShieldCheck className="size-5" aria-hidden />
          </div>
          <AuthHeading title={t.auth.loginCard.twoFAHeading} subtitle={t.auth.loginCard.twoFASubtitle} />
        </div>
        <InputOTP maxLength={6} value={code} onChange={setCode} autoFocus onComplete={() => toast(t.auth.loginCard.connectedToast)}>
          <InputOTP.Group>
            <InputOTP.Slot index={0} />
            <InputOTP.Slot index={1} />
            <InputOTP.Slot index={2} />
          </InputOTP.Group>
          <InputOTP.Separator />
          <InputOTP.Group>
            <InputOTP.Slot index={3} />
            <InputOTP.Slot index={4} />
            <InputOTP.Slot index={5} />
          </InputOTP.Group>
        </InputOTP>
        <div className="flex flex-col gap-2">
          <Button className="w-full" isDisabled={code.length < 6} onPress={() => toast(t.auth.loginCard.connectedToast)}>
            {t.auth.login.twoFAVerify}
          </Button>
          <Button variant="ghost" className="w-full" onPress={() => setStep('form')}>
            {t.common.back}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="alfy-enter">
      <AuthHeading title={t.auth.loginCard.heading} subtitle={t.auth.loginCard.subtitle} />
      <Form className="flex flex-col gap-4" onSubmit={submit}>
        <TextField name="email" type="email" isRequired>
          <Label className="text-[11px] font-medium tracking-wider text-muted uppercase">{t.auth.loginCard.emailLabel}</Label>
          <Input placeholder={t.auth.loginCard.emailPlaceholder} autoComplete="email" />
          <FieldError />
        </TextField>

        <TextField name="password" type="password" isRequired>
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-medium tracking-wider text-muted uppercase">{t.auth.login.password}</Label>
            <Link href="/uitest/auth/forgot" className="text-xs text-muted hover:text-accent">
              {t.auth.login.forgotPassword}
            </Link>
          </div>
          <Input placeholder={t.auth.register.passwordPlaceholder} autoComplete="current-password" />
          <FieldError />
        </TextField>

        <Button type="submit" size="lg" className="w-full gap-2" isDisabled={loading}>
          {loading ? <Spinner size="sm" color="current" /> : null}
          {loading ? t.auth.login.logging : t.auth.login.login}
        </Button>
      </Form>

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-separator" />
          <span className="text-[10px] tracking-wider text-muted uppercase">{t.auth.login.or}</span>
          <div className="h-px flex-1 bg-separator" />
        </div>
        <p className="text-[13px] text-muted">
          {t.auth.login.noAccount}{' '}
          <NextLink href="/uitest/auth/register" className="font-medium text-accent hover:underline">
            {t.auth.login.createAccount}
          </NextLink>
        </p>
      </div>
    </div>
  );
}
