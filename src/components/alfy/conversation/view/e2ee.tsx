'use client';

/**
 * Chiffrement de bout en bout, côté interface :
 *  - `E2eePill`        : pastille de l'en-tête (ouvre la vérification en MP) ;
 *  - `SafetyDialog`    : numéro de sécurité à comparer de vive voix, état vérifié ;
 *  - `E2eeIntro`       : carte en tête du fil ;
 *  - `KeyChangeNotice` : la clé du contact a changé depuis la dernière fois.
 */

import { Button, Chip, Modal, Spinner, Tooltip } from '@heroui/react';
import { KeyRound, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

import { localPublicKey } from '@/lib/e2ee/envelope';
import { getPublicKey, keyFingerprint, safetyNumber } from '@/lib/e2ee/public-keys';
import { vault } from '@/lib/e2ee/vault';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';

export function E2eePill({ onPress, compact }: { onPress?: () => void; compact?: boolean }) {
  const { t } = useTranslation();
  const body = (
    <>
      <Lock className="size-3.5 shrink-0" aria-hidden />
      {!compact && <span className="truncate">{t.conv.e2ee.badge}</span>}
    </>
  );
  const cls =
    'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-(--alfy-e2e) ring-1 ring-(--alfy-e2e)/30 bg-(--alfy-e2e)/8';
  return (
    <Tooltip delay={300} closeDelay={0}>
      {onPress ? (
        <button
          type="button"
          onClick={onPress}
          className={cn(cls, 'cursor-pointer outline-none transition-colors duration-(--dur-1) hover:bg-(--alfy-e2e)/14 focus-visible:ring-2 focus-visible:ring-focus')}
        >
          {body}
        </button>
      ) : (
        <span tabIndex={0} className={cn(cls, 'outline-none')}>
          {body}
        </span>
      )}
      <Tooltip.Content className="max-w-64">
        <p>{t.conv.e2ee.badgeTooltip}</p>
      </Tooltip.Content>
    </Tooltip>
  );
}

export function E2eeIntro({ kind, onVerify }: { kind: 'dm' | 'group'; onVerify?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="mt-4 flex max-w-xl items-start gap-3 rounded-xl border border-(--alfy-e2e)/25 bg-(--alfy-e2e)/6 p-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--alfy-e2e)/15 text-(--alfy-e2e)">
        <Lock className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground/90">{kind === 'dm' ? t.conv.e2ee.introDm : t.conv.e2ee.introGroup}</p>
        <p className="mt-1 text-xs text-muted">{t.conv.e2ee.vaultNote}</p>
        {onVerify && (
          <Button size="sm" variant="ghost" className="mt-1.5 -ml-2 text-(--alfy-e2e)" onPress={onVerify}>
            <ShieldCheck className="size-4" aria-hidden />
            {t.conv.e2ee.verify}
          </Button>
        )}
      </div>
    </div>
  );
}

export function KeyChangeNotice({ name, onVerify }: { name: string; onVerify: () => void }) {
  const { t, tx } = useTranslation();
  return (
    <div role="status" className="mx-4 my-3 flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/8 px-3 py-2 text-sm">
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <p className="min-w-0 flex-1 text-foreground/90">{tx(t.conv.e2ee.keyChanged, { name })}</p>
      <Button size="sm" variant="secondary" onPress={onVerify}>
        {t.conv.e2ee.keyChangedAction}
      </Button>
    </div>
  );
}

interface SafetyState {
  digits: string[];
  mine: string;
  theirs: string;
  verifiedAt?: number;
}

function SafetyBody({ peerId, peerName }: { peerId: string; peerName: string }) {
  const { t, tx } = useTranslation();
  const [state, setState] = useState<SafetyState | 'missing' | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [myKey, theirKey] = await Promise.all([localPublicKey(), getPublicKey(peerId)]);
      if (!alive) return;
      if (!myKey || !theirKey) {
        setState('missing');
        return;
      }
      const [digits, mine, theirs, trust] = await Promise.all([
        safetyNumber(myKey, theirKey),
        keyFingerprint(myKey),
        keyFingerprint(theirKey),
        vault.trustGet(peerId),
      ]);
      if (alive) setState({ digits, mine, theirs, verifiedAt: trust?.ecdhKey === theirKey ? trust.verifiedAt : undefined });
    })();
    return () => {
      alive = false;
    };
  }, [peerId]);

  const toggleVerified = async () => {
    if (!state || state === 'missing') return;
    const theirKey = await getPublicKey(peerId);
    if (!theirKey) return;
    const current = await vault.trustGet(peerId);
    const verifiedAt = state.verifiedAt ? undefined : Date.now();
    await vault.trustPut({ userId: peerId, ecdhKey: theirKey, firstSeenAt: current?.firstSeenAt ?? Date.now(), verifiedAt });
    setState({ ...state, verifiedAt });
  };

  if (state === null) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  if (state === 'missing') {
    return <p className="py-6 text-sm text-muted">{tx(t.conv.e2ee.safetyUnavailable, { name: peerName })}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{tx(t.conv.e2ee.safetyDesc, { name: peerName })}</p>
      <div className="grid grid-cols-4 gap-2 rounded-xl border border-border bg-surface-secondary p-4 font-mono text-[15px] tracking-wider text-foreground tabular-nums sm:grid-cols-6">
        {state.digits.map((g, i) => (
          <span key={i} className="at-fade-up text-center" style={{ animationDelay: `calc(var(--stagger-step) * ${i})` }}>
            {g}
          </span>
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <KeyRound className="size-3.5 text-muted" aria-hidden />
          <dt className="text-muted">{t.conv.e2ee.yourKey}</dt>
          <dd className="font-mono text-foreground">{state.mine}</dd>
        </div>
        <div className="flex items-center gap-2">
          <KeyRound className="size-3.5 text-muted" aria-hidden />
          <dt className="truncate text-muted">{tx(t.conv.e2ee.theirKey, { name: peerName })}</dt>
          <dd className="font-mono text-foreground">{state.theirs}</dd>
        </div>
      </dl>
      <div className="flex items-center justify-between gap-3">
        <Chip size="sm" variant="soft" color={state.verifiedAt ? 'success' : 'default'}>
          {state.verifiedAt ? <ShieldCheck className="size-3" /> : <ShieldAlert className="size-3" />}
          <Chip.Label>{state.verifiedAt ? t.conv.e2ee.verified : t.conv.e2ee.unverified}</Chip.Label>
        </Chip>
        <Button size="sm" variant={state.verifiedAt ? 'secondary' : 'primary'} onPress={() => void toggleVerified()}>
          {state.verifiedAt ? t.conv.e2ee.unmarkVerified : t.conv.e2ee.markVerified}
        </Button>
      </div>
    </div>
  );
}

export function SafetyDialog({
  isOpen,
  onOpenChange,
  peerId,
  peerName,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  peerId: string;
  peerName: string;
}) {
  const { t } = useTranslation();
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.CloseTrigger />
            <Modal.Header className="flex-row items-center gap-2">
              <ShieldCheck className="size-5 text-(--alfy-e2e)" aria-hidden />
              <Modal.Heading>{t.conv.e2ee.safetyTitle}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>{isOpen && <SafetyBody peerId={peerId} peerName={peerName} />}</Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={() => onOpenChange(false)}>
                {t.conv.e2ee.close}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
