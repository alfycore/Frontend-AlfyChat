'use client';

/**
 * Réglages du serveur — AutoMod (gabarit Discord) : une carte par filtre,
 * activable d'un geste, configurable en place. Les modérateurs (gérer les
 * messages / le serveur) ne sont jamais filtrés.
 */

import { Button, Disclosure, Label, NumberField, Spinner, Switch, TextArea, TextField, toast } from '@heroui/react';
import { AtSign, ChevronDown, Link2, MailX, ShieldCheck, Type, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import { PageTitle } from '@/components/alfy/guild/kit';

type Trigger = 'keyword' | 'mention_spam' | 'link' | 'invite';

interface Rule {
  id: string;
  triggerType: Trigger;
  enabled: boolean;
  keywords: string[];
  mentionLimit: number;
}

function normalize(raw: Record<string, unknown>): Rule {
  let meta: Record<string, unknown> = {};
  const m = raw.trigger_metadata ?? raw.triggerMetadata;
  try {
    meta = typeof m === 'string' ? JSON.parse(m) : ((m as Record<string, unknown>) ?? {});
  } catch {
    meta = {};
  }
  return {
    id: String(raw.id),
    triggerType: String(raw.trigger_type ?? raw.triggerType) as Trigger,
    enabled: Boolean(Number(raw.enabled ?? 1)),
    keywords: Array.isArray(meta.keywords) ? (meta.keywords as string[]) : [],
    mentionLimit: Number(meta.mentionLimit) || 5,
  };
}

const CARDS: { trigger: Trigger; icon: LucideIcon }[] = [
  { trigger: 'keyword', icon: Type },
  { trigger: 'mention_spam', icon: AtSign },
  { trigger: 'link', icon: Link2 },
  { trigger: 'invite', icon: MailX },
];

export function AutomodPage({ serverId }: { serverId: string }) {
  const { t } = useTranslation();
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [busy, setBusy] = useState<Trigger | null>(null);

  const load = useCallback(
    () =>
      api
        .getAutomodRules(serverId)
        .catch(() => null)
        .then((res) => {
          const raw = ((res as { data?: unknown })?.data ?? res) as unknown;
          setRules(Array.isArray(raw) ? (raw as Record<string, unknown>[]).map(normalize) : []);
        }),
    [serverId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const ruleOf = (trigger: Trigger) => rules?.find((r) => r.triggerType === trigger);

  const toggle = async (trigger: Trigger, on: boolean) => {
    setBusy(trigger);
    try {
      const existing = ruleOf(trigger);
      if (existing) {
        await api.updateAutomodRule(serverId, existing.id, { enabled: on });
      } else if (on) {
        await api.createAutomodRule(serverId, {
          name: t.guild.automod[trigger].title,
          triggerType: trigger,
          actionType: 'block',
          triggerMetadata: trigger === 'keyword' ? { keywords: [] } : trigger === 'mention_spam' ? { mentionLimit: 5 } : {},
        });
      }
      await load();
    } catch {
      toast.danger(t.guild.automod.failed);
    } finally {
      setBusy(null);
    }
  };

  const saveMeta = async (trigger: Trigger, meta: Record<string, unknown>) => {
    const existing = ruleOf(trigger);
    if (!existing) return;
    setBusy(trigger);
    try {
      await api.updateAutomodRule(serverId, existing.id, { triggerMetadata: meta });
      toast.success(t.guild.settings.saved);
      await load();
    } catch {
      toast.danger(t.guild.automod.failed);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageTitle description={t.guild.automod.description}>
        <span className="flex items-center gap-2">
          <ShieldCheck className="size-6 text-accent" aria-hidden />
          {t.guild.automod.title}
        </span>
      </PageTitle>

      {rules === null ? (
        <div className="flex justify-center py-10">
          <Spinner size="sm" />
        </div>
      ) : (
        CARDS.map(({ trigger, icon: Icon }) => {
          const rule = ruleOf(trigger);
          const enabled = Boolean(rule?.enabled);
          const configurable = trigger === 'keyword' || trigger === 'mention_spam';
          return (
            <div key={trigger} className={cn('rounded-lg border bg-surface-secondary transition-colors duration-(--dur-2)', enabled ? 'border-accent/40' : 'border-separator')}>
              <div className="flex items-start gap-4 p-4">
                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', enabled ? 'bg-accent/15 text-accent' : 'bg-foreground/8 text-muted')}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold">{t.guild.automod[trigger].title}</p>
                  <p className="text-sm text-muted">{t.guild.automod[trigger].desc}</p>
                </div>
                <Switch isSelected={enabled} isDisabled={busy === trigger} onChange={(v) => void toggle(trigger, v)} aria-label={t.guild.automod[trigger].title}>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch>
              </div>
              {configurable && rule && (
                <Disclosure>
                  <Disclosure.Heading>
                    <Button slot="trigger" variant="ghost" size="sm" className="mx-3 mb-2 text-muted">
                      {t.guild.automod.configure}
                      <Disclosure.Indicator>
                        <ChevronDown className="size-4" aria-hidden />
                      </Disclosure.Indicator>
                    </Button>
                  </Disclosure.Heading>
                  <Disclosure.Content>
                    <Disclosure.Body className="border-t border-separator p-4">
                      {trigger === 'keyword' ? (
                        <KeywordEditor initial={rule.keywords} busy={busy === trigger} onSave={(keywords) => void saveMeta('keyword', { keywords })} />
                      ) : (
                        <MentionEditor initial={rule.mentionLimit} busy={busy === trigger} onSave={(mentionLimit) => void saveMeta('mention_spam', { mentionLimit })} />
                      )}
                    </Disclosure.Body>
                  </Disclosure.Content>
                </Disclosure>
              )}
            </div>
          );
        })
      )}
      <p className="text-xs text-muted">{t.guild.automod.exemptHint}</p>
    </div>
  );
}

function KeywordEditor({ initial, busy, onSave }: { initial: string[]; busy: boolean; onSave: (k: string[]) => void }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initial.join(', '));
  const parsed = value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 1000);
  return (
    <div className="flex flex-col gap-3">
      <TextField value={value} onChange={setValue}>
        <Label className="text-xs font-bold tracking-[0.02em] text-muted uppercase">{t.guild.automod.keywords}</Label>
        <TextArea rows={4} placeholder={t.guild.automod.keywordsPlaceholder} />
      </TextField>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{parsed.length} / 1000</span>
        <Button size="sm" variant="primary" isPending={busy} onPress={() => onSave(parsed)}>
          {t.guild.common.save}
        </Button>
      </div>
    </div>
  );
}

function MentionEditor({ initial, busy, onSave }: { initial: number; busy: boolean; onSave: (n: number) => void }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initial);
  return (
    <div className="flex items-end gap-3">
      <NumberField value={value} onChange={(v) => setValue(Number.isFinite(v) ? v : 5)} minValue={1} maxValue={50} className="w-40">
        <Label className="text-xs font-bold tracking-[0.02em] text-muted uppercase">{t.guild.automod.mentionLimit}</Label>
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input />
          <NumberField.IncrementButton />
        </NumberField.Group>
      </NumberField>
      <Button size="sm" variant="primary" isPending={busy} onPress={() => onSave(value)}>
        {t.guild.common.save}
      </Button>
    </div>
  );
}
