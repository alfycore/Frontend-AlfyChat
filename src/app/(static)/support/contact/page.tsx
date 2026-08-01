'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon, MessageSquareIcon, CheckCircle2Icon, AlertTriangleIcon,
  MailIcon, ShieldIcon, SettingsIcon, ServerIcon, HelpCircleIcon,
  ZapIcon, WrenchIcon, UsersIcon,
} from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/components/locale-provider';

type Category = 'general' | 'account' | 'security' | 'billing' | 'bug' | 'abuse' | 'server' | 'other';
type Priority = 'low' | 'medium' | 'high';

const CATEGORY_KEYS: Category[] = ['general', 'account', 'security', 'bug', 'abuse', 'server', 'billing', 'other'];
const PRIORITY_KEYS: Priority[] = ['low', 'medium', 'high'];
const GUEST_ALLOWED = new Set(['account', 'security']);

const CAT_ICONS: Record<Category, React.ElementType> = {
  general:  HelpCircleIcon,
  account:  UsersIcon,
  security: ShieldIcon,
  bug:      WrenchIcon,
  abuse:    AlertTriangleIcon,
  server:   ServerIcon,
  billing:  ZapIcon,
  other:    SettingsIcon,
};

const PRIORITY_CFG: Record<Priority, { color: string; dot: string }> = {
  low:    { color: '#22c55e', dot: 'bg-green-500' },
  medium: { color: '#3b82f6', dot: 'bg-blue-500' },
  high:   { color: '#f59e0b', dot: 'bg-amber-500' },
};

export default function SupportContactPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const s = t.static.support;
  const [form, setForm] = useState({
    subject:     '',
    category:    'general' as Category,
    priority:    'medium' as Priority,
    description: '',
    email:       '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await api.post('/api/helpdesk/public/tickets', {
        subject:     form.subject.trim(),
        category:    form.category,
        priority:    form.priority,
        description: form.description.trim(),
        email:       form.email.trim() || undefined,
      });
      if (res.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMsg(res.error || s.errorGeneric);
      }
    } catch {
      setStatus('error');
      setErrorMsg(s.errorServer);
    }
  };

  /* ── Success state ── */
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="relative size-20 mx-auto mb-7">
            <div className="absolute inset-0 rounded-full bg-green-500/15 animate-ping"
              style={{ animationDuration: '2.5s' }} />
            <div className="relative size-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <CheckCircle2Icon size={30} className="text-green-500" />
            </div>
          </div>
          <h1 className="font-heading text-2xl font-bold mb-3">{s.sentTitle}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">{s.sentBody}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/support"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
              <ArrowLeftIcon size={13} /> {s.backToSupport}
            </Link>
            <Link href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              {s.backToApp}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Form ── */
  return (
    <div className="min-h-screen">

      {/* Header */}
      <div className="border-b border-border/50">
        <div className="mx-auto max-w-2xl px-6 pt-10 pb-8">
          <Link href="/support"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-7 group">
            <ArrowLeftIcon size={12} className="group-hover:-translate-x-0.5 transition-transform" />
            {s.backToSupport}
          </Link>
          <div className="flex items-center gap-4">
            <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <MessageSquareIcon size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight leading-tight">{s.contactHeading}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{s.contactSubtitle}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Subject */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {s.formSubject} <span className="text-destructive">*</span>
            </label>
            <Input
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              placeholder={s.formSubjectPlaceholder}
              required maxLength={120}
            />
          </div>

          {/* Category */}
          <div className="space-y-3">
            <label className="text-sm font-medium">
              {s.formCategory} <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORY_KEYS.map(key => {
                const CatIcon = CAT_ICONS[key];
                const active = form.category === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, category: key }))}
                    className={`flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center transition-all active:scale-[0.97] ${
                      active
                        ? 'border-primary bg-primary/8 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-muted/30'
                    }`}
                  >
                    <CatIcon size={16} className={active ? 'text-primary' : 'text-muted-foreground'} />
                    <span className="text-[11px] font-medium leading-tight">{s.categories[key]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-3">
            <label className="text-sm font-medium">{s.formPriority}</label>
            <div className="grid grid-cols-3 gap-3">
              {PRIORITY_KEYS.map(key => {
                const active = form.priority === key;
                const cfg = PRIORITY_CFG[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, priority: key }))}
                    className={`rounded-xl border px-4 py-3.5 text-left transition-all active:scale-[0.97] ${
                      active ? 'border-2' : 'border-border bg-card hover:bg-muted/30'
                    }`}
                    style={active ? { borderColor: cfg.color, background: cfg.color + '0a' } : {}}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`size-2 rounded-full shrink-0 ${cfg.dot}`} />
                      <p className="text-xs font-bold"
                        style={active ? { color: cfg.color } : {}}>
                        {s.priorities[key].label}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      {s.priorities[key].desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {s.formDescription} <span className="text-destructive">*</span>
              </label>
              <span className="text-[11px] text-muted-foreground">{form.description.length}/4000</span>
            </div>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder={s.formDescriptionPlaceholder}
              required rows={7} maxLength={4000}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MailIcon size={13} className="text-muted-foreground" />
              {s.formEmail}
              {!user && GUEST_ALLOWED.has(form.category) ? (
                <span className="text-destructive text-xs">*</span>
              ) : (
                <span className="text-muted-foreground text-xs font-normal">{s.formEmailOptional}</span>
              )}
            </label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="votre@email.com"
              required={!user && GUEST_ALLOWED.has(form.category)}
            />
            <p className="text-xs text-muted-foreground">
              {!user && GUEST_ALLOWED.has(form.category) ? s.formEmailGuestHint : s.formEmailUserHint}
            </p>
          </div>

          {/* Error */}
          {status === 'error' && (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertTriangleIcon size={14} className="shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Submit row */}
          <div className="flex items-center justify-between gap-4 pt-1 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {s.altContact}{' '}
              <a href="mailto:support@alfycore.pro" className="text-primary hover:underline underline-offset-2">
                support@alfycore.pro
              </a>
            </p>
            <Button
              type="submit"
              disabled={status === 'loading' || !form.subject.trim() || !form.description.trim()}
              className="gap-2">
              {status === 'loading' ? (
                <>
                  <div className="size-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                  {s.sendingTicket}
                </>
              ) : (
                s.sendTicket
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
