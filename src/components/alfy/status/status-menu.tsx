'use client';

/**
 * Menu de statut du panneau utilisateur, au gabarit Discord.
 *
 * « En ligne » s'applique d'un clic ; Inactif / Ne pas déranger / Invisible
 * ouvrent un sous-menu de durées (15 min … pour toujours). Le statut en cours
 * affiche son échéance. Le statut personnalisé s'édite ou s'efface ici.
 */

import { Dropdown, Header, Label, Separator } from '@heroui/react';
import { Check, Copy, SmilePlus, X } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { StatusDot, usePresenceLabels } from '@/components/alfy/primitives/status-dot';
import { copyText } from '@/components/alfy/guild/actions';
import type { AlfyPresence } from '@/components/alfy/mock/types';
import { useTranslation } from '@/components/locale-provider';
import { STATUS_DURATIONS, useStatusStore, type ChosenStatus, type StatusDuration } from '@/components/alfy/status/status-store';
import { useStatusActions } from '@/components/alfy/status/use-status';

const TIMED: Exclude<ChosenStatus, 'online'>[] = ['idle', 'dnd', 'invisible'];
/** Horloge lue au rendu (échéance affichée) — isolée pour le compilateur React. */
const nowMs = () => Date.now();

export function StatusMenuPopover() {
  const { t, tx, intlLocale } = useTranslation();
  const { user } = useAuth();
  const labels = usePresenceLabels();
  const { setStatus, clearCustom } = useStatusActions();
  const until = useStatusStore((s) => (user ? s.byUser[user.id]?.statusUntil ?? null : null));
  if (!user) return null;

  const me = user as typeof user & { emoji?: string | null; customStatus?: string | null };
  const status = ((me.status as AlfyPresence) ?? 'online') as AlfyPresence;
  const display = me.displayName || me.username;
  const custom = me.customStatus?.trim();
  const untilText =
    until && until > nowMs() ? tx(t.presence.until, { time: new Date(until).toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit' }) }) : null;
  const desc: Record<Exclude<ChosenStatus, 'online'>, string> = {
    idle: t.presence.idleDesc,
    dnd: t.presence.dndDesc,
    invisible: t.presence.invisibleDesc,
  };

  return (
    <Dropdown.Popover placement="top start" offset={10} className="min-w-72">
      <Dropdown.Menu aria-label={t.presence.menuAria}>
        <Dropdown.Section>
          <Header>{display}</Header>
          <Dropdown.Item id="online" textValue={labels.online} onAction={() => setStatus('online')}>
            <StatusDot status="online" size="sm" ringClass="ring-overlay" />
            <Label>{labels.online}</Label>
            {status === 'online' && <Check className="ms-auto size-4 shrink-0 text-accent" aria-hidden />}
          </Dropdown.Item>
          {TIMED.map((s) => (
            <Dropdown.SubmenuTrigger key={s}>
              <Dropdown.Item id={s} textValue={labels[s]}>
                <StatusDot status={s} size="sm" ringClass="ring-overlay" />
                <div className="flex min-w-0 flex-col">
                  <Label>{labels[s]}</Label>
                  <span className="text-xs text-muted">{status === s && untilText ? untilText : desc[s]}</span>
                </div>
                {status === s && <Check className="ms-auto size-4 shrink-0 text-accent" aria-hidden />}
                <Dropdown.SubmenuIndicator />
              </Dropdown.Item>
              <Dropdown.Popover className="min-w-52">
                <Dropdown.Menu aria-label={`${labels[s]} — ${t.presence.durationMenu}`} onAction={(k) => setStatus(s, String(k).replace(`${s}:`, '') as StatusDuration)}>
                  {STATUS_DURATIONS.map((d) => (
                    <Dropdown.Item key={d} id={`${s}:${d}`} textValue={t.presence.durations[d]}>
                      <Label>{t.presence.durations[d]}</Label>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown.SubmenuTrigger>
          ))}
        </Dropdown.Section>

        <Separator />
        <Dropdown.Section>
          <Dropdown.Item id="custom" textValue={custom ? t.presence.editCustom : t.presence.setCustom} onAction={() => useStatusStore.getState().openEditor()}>
            {me.emoji ? <span className="w-4 text-center text-base leading-none">{me.emoji}</span> : <SmilePlus className="size-4" aria-hidden />}
            <Label className="truncate">{custom || (me.emoji ? t.presence.editCustom : t.presence.setCustom)}</Label>
          </Dropdown.Item>
          {custom || me.emoji ? (
            <Dropdown.Item id="clear-custom" textValue={t.presence.clearCustom} onAction={clearCustom}>
              <X className="size-4" aria-hidden />
              <Label>{t.presence.clearCustom}</Label>
            </Dropdown.Item>
          ) : null}
        </Dropdown.Section>

        <Separator />
        <Dropdown.Section>
          <Dropdown.Item id="copy" textValue={t.presence.copyId} onAction={() => void copyText(me.id, t.presence.copied)}>
            <Copy className="size-4" aria-hidden />
            <Label>{t.presence.copyId}</Label>
          </Dropdown.Item>
        </Dropdown.Section>
      </Dropdown.Menu>
    </Dropdown.Popover>
  );
}
