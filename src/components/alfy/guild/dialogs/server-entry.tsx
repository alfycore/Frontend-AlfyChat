'use client';

/**
 * Créer ou rejoindre un serveur — le parcours Discord :
 *  1. « Crée ton serveur » : « Créer le mien » ou un modèle ; lien « Rejoindre un serveur » ;
 *  2. « Parle-nous de ton serveur » : pour un club / une communauté, ou pour mes amis
 *     (→ catégorie communautaire ou standard de l'hébergement AlfyChat) ;
 *  3. « Personnalise ton serveur » : icône + nom, puis création et ouverture du premier salon.
 * « Rejoindre » : coller un lien ou un code d'invitation.
 */

import { Button, Input, Label, Modal, TextField, toast } from '@heroui/react';
import {
  BookOpen,
  Camera,
  ChevronRight,
  Gamepad2,
  GraduationCap,
  Heart,
  Palette,
  Sparkles,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { api, resolveMediaUrl } from '@/lib/api';
import { serverListStore } from '@/lib/server-list-store';
import { socketService } from '@/lib/socket';
import { useTranslation } from '@/components/locale-provider';
import { cn } from '@/lib/utils';
import { guildUi, useGuildUi } from '@/components/alfy/guild/ui';

type Step = 'choose' | 'audience' | 'customize' | 'join';
type Template = 'default' | 'gaming' | 'friends' | 'study' | 'school' | 'creators' | 'community';

const TEMPLATES: { id: Exclude<Template, 'default'>; icon: LucideIcon }[] = [
  { id: 'gaming', icon: Gamepad2 },
  { id: 'friends', icon: Heart },
  { id: 'study', icon: BookOpen },
  { id: 'school', icon: GraduationCap },
  { id: 'creators', icon: Palette },
  { id: 'community', icon: UsersRound },
];

export function ServerEntryDialog() {
  const create = useGuildUi((s) => s.createServer);
  const join = useGuildUi((s) => s.joinServer);
  const open = create || join;
  const close = () => {
    guildUi.close('createServer');
    guildUi.close('joinServer');
  };
  return (
    <Modal isOpen={open} onOpenChange={(o) => !o && close()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="overflow-hidden sm:max-w-[440px]">{open && <Flow initial={join ? 'join' : 'choose'} onClose={close} />}</Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function Option({ icon: Icon, label, onPress, big }: { icon: LucideIcon; label: string; onPress: () => void; big?: boolean }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        'group/opt flex w-full cursor-pointer items-center gap-3 rounded-lg border border-separator bg-surface-secondary px-3 text-left outline-none',
        'transition-[background-color,border-color,box-shadow] duration-(--dur-1) hover:border-foreground/15 hover:bg-surface-tertiary hover:shadow-sm focus-visible:ring-2 focus-visible:ring-focus',
        big ? 'h-16' : 'h-14',
      )}
    >
      <span className={cn('flex shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent', big ? 'size-11' : 'size-9')}>
        <Icon className={big ? 'size-6' : 'size-5'} aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{label}</span>
      <ChevronRight className="size-5 shrink-0 text-muted transition-transform duration-(--dur-1) group-hover/opt:translate-x-0.5" aria-hidden />
    </button>
  );
}

function Flow({ initial, onClose }: { initial: Step; onClose: () => void }) {
  const { t, tx } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(initial);
  const [template, setTemplate] = useState<Template>('default');
  const [category, setCategory] = useState<'standard' | 'community'>('standard');
  const [name, setName] = useState(() => tx(t.guild.entry.defaultName, { name: user?.displayName || user?.username || '' }));
  const [icon, setIcon] = useState<File | null>(null);
  const iconPreview = useMemo(() => (icon ? URL.createObjectURL(icon) : null), [icon]);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [quota, setQuota] = useState<{ standard: number; community: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .getServerQuota()
      .then((res) => res.data && setQuota({ standard: res.data.remaining.standard, community: res.data.remaining.community }))
      .catch(() => {});
  }, []);
  useEffect(
    () => () => {
      if (iconPreview) URL.revokeObjectURL(iconPreview);
    },
    [iconPreview],
  );

  const chooseAudience = (c: 'standard' | 'community') => {
    // Plus de place dans la catégorie demandée : on bascule sur l'autre.
    if (quota && quota[c] <= 0) {
      const other = c === 'community' ? 'standard' : 'community';
      if (quota[other] > 0) {
        toast(t.guild.entry.quotaSwitched);
        setCategory(other);
      } else {
        toast.danger(t.guild.entry.quotaFull);
        return;
      }
    } else setCategory(c);
    setStep('customize');
  };

  const create = async () => {
    if (name.trim().length < 2 || busy) return;
    setBusy(true);
    try {
      let iconUrl: string | undefined;
      if (icon) {
        const up = await api.uploadImage(icon, 'icon');
        if (!up.success || !up.data?.url) {
          toast.danger(t.guild.entry.iconFailed, { description: up.error ?? icon.name });
          return;
        }
        iconUrl = up.data.url;
      }
      const res = await api.createServer({ name: name.trim(), iconUrl, category, template });
      if (!res.success || !res.data) {
        toast.danger(t.guild.entry.createFailed, { description: res.error ?? '' });
        return;
      }
      const server = { id: res.data.id, name: res.data.name, iconUrl: resolveMediaUrl(iconUrl), ownerId: user?.id };
      serverListStore.add(server);
      // Rejoindre les rooms temps réel du nouveau serveur tout de suite.
      socketService.emit('SERVER_SELF_JOIN', { serverId: server.id, name: server.name });
      onClose();
      router.push(res.data.firstChannelId ? `/channels/server/${server.id}/${res.data.firstChannelId}` : `/channels/server/${server.id}`);
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    const value = code.trim();
    if (!value || busy) return;
    setBusy(true);
    setJoinError('');
    try {
      const res = await api.joinServer(value);
      if (!res.success || !res.data) {
        setJoinError(res.error ?? t.guild.entry.joinInvalid);
        return;
      }
      const s = res.data as { id?: string; serverId?: string; name: string; iconUrl?: string };
      const server = { id: (s.id ?? s.serverId)!, name: s.name, iconUrl: s.iconUrl };
      serverListStore.add(server);
      socketService.emit('SERVER_SELF_JOIN', server);
      onClose();
      router.push(`/channels/server/${server.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div key={step} className="alfy-enter">
      <Modal.CloseTrigger />

      {step === 'choose' && (
        <>
          <Modal.Header className="flex-col items-center gap-2 pt-6 text-center">
            <Modal.Heading className="text-2xl font-bold">{t.guild.entry.createTitle}</Modal.Heading>
            <p className="text-sm text-muted">{t.guild.entry.createSubtitle}</p>
          </Modal.Header>
          <Modal.Body className="flex max-h-[min(60vh,440px)] flex-col gap-2 overflow-y-auto">
            <Option
              big
              icon={Sparkles}
              label={t.guild.entry.createOwn}
              onPress={() => {
                setTemplate('default');
                setStep('audience');
              }}
            />
            <p className="mt-3 mb-1 text-xs font-bold tracking-[0.02em] text-muted uppercase">{t.guild.entry.fromTemplate}</p>
            {TEMPLATES.map((tpl) => (
              <Option
                key={tpl.id}
                icon={tpl.icon}
                label={t.guild.entry.templates[tpl.id]}
                onPress={() => {
                  setTemplate(tpl.id);
                  setStep('audience');
                }}
              />
            ))}
          </Modal.Body>
          <Modal.Footer className="flex-col gap-2 bg-surface-secondary">
            <p className="text-base font-semibold">{t.guild.entry.haveInvite}</p>
            <Button variant="secondary" className="w-full" onPress={() => setStep('join')}>
              {t.guild.entry.joinServer}
            </Button>
          </Modal.Footer>
        </>
      )}

      {step === 'audience' && (
        <>
          <Modal.Header className="flex-col items-center gap-2 pt-6 text-center">
            <Modal.Heading className="text-2xl font-bold">{t.guild.entry.audienceTitle}</Modal.Heading>
            <p className="text-sm text-muted">{t.guild.entry.audienceSubtitle}</p>
          </Modal.Header>
          <Modal.Body className="flex flex-col gap-2">
            <Option big icon={UsersRound} label={t.guild.entry.forCommunity} onPress={() => chooseAudience('community')} />
            <Option big icon={Users} label={t.guild.entry.forFriends} onPress={() => chooseAudience('standard')} />
            <p className="pt-2 text-center text-sm text-muted">
              {t.guild.entry.notSure}{' '}
              <button type="button" className="cursor-pointer font-medium text-accent hover:underline" onClick={() => chooseAudience('standard')}>
                {t.guild.entry.skip}
              </button>
            </p>
          </Modal.Body>
          <Modal.Footer className="justify-start bg-surface-secondary">
            <Button variant="ghost" onPress={() => setStep('choose')}>
              {t.guild.entry.back}
            </Button>
          </Modal.Footer>
        </>
      )}

      {step === 'customize' && (
        <>
          <Modal.Header className="flex-col items-center gap-2 pt-6 text-center">
            <Modal.Heading className="text-2xl font-bold">{t.guild.entry.customizeTitle}</Modal.Heading>
            <p className="text-sm text-muted">{t.guild.entry.customizeSubtitle}</p>
          </Modal.Header>
          <Modal.Body className="flex flex-col items-center gap-5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label={t.guild.entry.uploadIcon}
              className="group/up relative flex size-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-foreground/40 text-muted outline-none transition-colors duration-(--dur-1) hover:border-foreground/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
            >
              {iconPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={iconPreview} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-0.5">
                  <Camera className="size-6" aria-hidden />
                  <span className="text-[10px] font-bold uppercase">{t.guild.entry.upload}</span>
                </span>
              )}
              <span className="absolute top-0 right-0 flex size-6 items-center justify-center rounded-full bg-accent text-lg leading-none text-accent-foreground">+</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              hidden
              onChange={(e) => {
                setIcon(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
            <TextField value={name} onChange={setName} className="w-full" isRequired>
              <Label className="text-xs font-bold tracking-[0.02em] text-muted uppercase">{t.guild.entry.serverName}</Label>
              <Input maxLength={100} onKeyDown={(e) => e.key === 'Enter' && void create()} autoFocus />
            </TextField>
            <p className="w-full text-xs text-muted">{t.guild.entry.guidelines}</p>
          </Modal.Body>
          <Modal.Footer className="justify-between bg-surface-secondary">
            <Button variant="ghost" onPress={() => setStep('audience')}>
              {t.guild.entry.back}
            </Button>
            <Button variant="primary" isPending={busy} isDisabled={name.trim().length < 2} onPress={() => void create()}>
              {t.guild.entry.create}
            </Button>
          </Modal.Footer>
        </>
      )}

      {step === 'join' && (
        <>
          <Modal.Header className="flex-col items-center gap-2 pt-6 text-center">
            <Modal.Heading className="text-2xl font-bold">{t.guild.entry.joinTitle}</Modal.Heading>
            <p className="text-sm text-muted">{t.guild.entry.joinSubtitle}</p>
          </Modal.Header>
          <Modal.Body className="flex flex-col gap-3">
            <TextField value={code} onChange={setCode} isRequired isInvalid={!!joinError}>
              <Label className="text-xs font-bold tracking-[0.02em] text-muted uppercase">
                {t.guild.entry.inviteLink}
                {joinError && <span className="ml-1 font-normal text-danger normal-case">— {joinError}</span>}
              </Label>
              <Input placeholder="https://alfy.chat/i/hTKzmak" autoFocus onKeyDown={(e) => e.key === 'Enter' && void join()} />
            </TextField>
            <div>
              <p className="text-xs font-bold tracking-[0.02em] text-muted uppercase">{t.guild.entry.invitesLookLike}</p>
              <p className="mt-1 text-sm text-foreground/80">hTKzmak</p>
              <p className="text-sm text-foreground/80">https://alfy.chat/i/hTKzmak</p>
              <p className="text-sm text-foreground/80">https://alfy.chat/i/cool-people</p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push('/channels/discover-server');
              }}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg bg-surface-secondary p-3 text-left outline-none transition-colors duration-(--dur-1) hover:bg-surface-tertiary focus-visible:ring-2 focus-visible:ring-focus"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                <Sparkles className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{t.guild.entry.discoverTitle}</span>
                <span className="block text-xs text-muted">{t.guild.entry.discoverDesc}</span>
              </span>
              <ChevronRight className="size-5 text-muted" aria-hidden />
            </button>
          </Modal.Body>
          <Modal.Footer className="justify-between bg-surface-secondary">
            <Button variant="ghost" onPress={() => (initial === 'join' ? onClose() : setStep('choose'))}>
              {t.guild.entry.back}
            </Button>
            <Button variant="primary" isPending={busy} isDisabled={!code.trim()} onPress={() => void join()}>
              {t.guild.entry.join}
            </Button>
          </Modal.Footer>
        </>
      )}
    </div>
  );
}
