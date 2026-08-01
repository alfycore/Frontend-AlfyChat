'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, MessageSquareIcon, CheckCircle2Icon, AlertTriangleIcon, MailIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
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

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="size-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2Icon size={28} className="text-green-500" />
          </div>
          <h1 className="font-heading text-2xl font-bold mb-3">{s.sentTitle}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">{s.sentBody}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/support"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
              <ArrowLeftIcon size={14} /> {s.backToSupport}
            </Link>
            <Link href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              {s.backToApp}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <Link href="/support" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeftIcon size={12} /> {s.backToSupport}
          </Link>
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MessageSquareIcon size={22} className="text-primary" />
            </div>
            <div>
              <Badge variant="outline" className="text-[10px] font-mono mb-1">{s.contactBadge}</Badge>
              <h1 className="font-heading text-2xl font-bold leading-tight">{s.contactHeading}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{s.contactSubtitle}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Sujet */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{s.formSubject} <span className="text-destructive">*</span></label>
            <Input
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              placeholder={s.formSubjectPlaceholder}
              required
              maxLength={120}
            />
          </div>

          {/* Catégorie */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{s.formCategory} <span className="text-destructive">*</span></label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CATEGORY_KEYS.map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, category: key }))}
                  className={`rounded-lg border px-3 py-2.5 text-xs font-medium text-left transition-all
                    ${form.category === key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-muted/50'
                    }`}
                >
                  {s.categories[key]}
                </button>
              ))}
            </div>
          </div>

          {/* Priorité */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{s.formPriority}</label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITY_KEYS.map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, priority: key }))}
                  className={`rounded-lg border px-3 py-3 text-left transition-all
                    ${form.priority === key
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:bg-muted/50'
                    }`}
                >
                  <p className={`text-xs font-semibold ${form.priority === key ? 'text-primary' : 'text-foreground'}`}>{s.priorities[key].label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{s.priorities[key].desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{s.formDescription} <span className="text-destructive">*</span></label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder={s.formDescriptionPlaceholder}
              required
              rows={7}
              maxLength={4000}
            />
            <p className="text-xs text-muted-foreground text-right">{form.description.length}/4000</p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <MailIcon size={14} />
              {s.formEmail}
              {!user && GUEST_ALLOWED.has(form.category) && (
                <span className="text-destructive text-xs">*</span>
              )}
              {(user || !GUEST_ALLOWED.has(form.category)) && (
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
            {!user && GUEST_ALLOWED.has(form.category) ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">{s.formEmailGuestHint}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{s.formEmailUserHint}</p>
            )}
          </div>

          {/* Erreur */}
          {status === 'error' && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertTriangleIcon size={15} className="shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              {s.altContact}{' '}
              <a href="mailto:support@alfycore.pro" className="text-primary hover:underline">support@alfycore.pro</a>
            </p>
            <Button type="submit" disabled={status === 'loading' || !form.subject.trim() || !form.description.trim()}>
              {status === 'loading' ? s.sendingTicket : s.sendTicket}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
