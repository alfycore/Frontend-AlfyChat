'use client';

/**
 * Petites fenêtres du module serveur : confirmation, profil de serveur
 * (pseudo), notifications du serveur, actions de modération sur un membre.
 */

import { AlertDialog, Avatar, Button, Input, Label, Modal, RadioGroup, TextArea, TextField } from '@heroui/react';
import { AtSign, Bell, BellOff, BellRing } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import * as notif from '@/lib/notification-store';
import { useTranslation } from '@/components/locale-provider';
import { RadioCard, SettingSwitch } from '@/components/alfy/guild/kit';
import { guildUi, useGuildUi } from '@/components/alfy/guild/ui';
import { banMember, kickMember, muteServer, setNickname, setNotifLevel } from '@/components/alfy/guild/actions';
import { memberName, useGuildInfo, useGuildMember } from '@/components/alfy/guild/hooks';
import { isMuteActive, useGuildPrefs } from '@/components/alfy/guild/prefs';

/* ── Confirmation ─────────────────────────────────────────────────────────── */

export function ConfirmDialog() {
  const { t } = useTranslation();
  const req = useGuildUi((s) => s.confirm);
  return (
    <AlertDialog isOpen={!!req} onOpenChange={(open) => !open && guildUi.settleConfirm(false)}>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[440px]">
            {req && (
              <>
                <AlertDialog.Header>
                  {req.danger && <AlertDialog.Icon status="danger" />}
                  <AlertDialog.Heading>{req.title}</AlertDialog.Heading>
                </AlertDialog.Header>
                {req.body && (
                  <AlertDialog.Body>
                    <p className="text-sm wrap-break-word whitespace-pre-line text-muted">{req.body}</p>
                  </AlertDialog.Body>
                )}
                <AlertDialog.Footer>
                  <Button variant="tertiary" onPress={() => guildUi.settleConfirm(false)}>
                    {req.cancelLabel ?? t.common.cancel}
                  </Button>
                  <Button variant={req.danger ? 'danger' : 'primary'} onPress={() => guildUi.settleConfirm(true)} autoFocus>
                    {req.confirmLabel}
                  </Button>
                </AlertDialog.Footer>
              </>
            )}
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

/* ── Profil de serveur (pseudo) ───────────────────────────────────────────── */

export function ServerProfileDialog() {
  const req = useGuildUi((s) => s.serverProfile);
  return (
    <Modal isOpen={!!req} onOpenChange={(open) => !open && guildUi.close('serverProfile')}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">{req && <ServerProfileForm serverId={req.serverId} />}</Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function ServerProfileForm({ serverId }: { serverId: string }) {
  const { t, tx } = useTranslation();
  const { user } = useAuth();
  const info = useGuildInfo(serverId);
  const member = useGuildMember(serverId, user?.id);
  const [nick, setNick] = useState(member?.nickname ?? '');
  const [busy, setBusy] = useState(false);
  const preview = nick.trim() || user?.displayName || user?.username || '';

  const save = async () => {
    if (!user) return;
    setBusy(true);
    await setNickname(serverId, user.id, nick.trim());
    setBusy(false);
    guildUi.close('serverProfile');
  };

  return (
    <>
      <Modal.CloseTrigger />
      <Modal.Header className="flex-col items-start gap-0.5">
        <Modal.Heading>{t.guild.profile.title}</Modal.Heading>
        <p className="text-sm text-muted">{tx(t.guild.profile.subtitle, { name: info?.name ?? '' })}</p>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-lg border border-separator bg-surface-secondary p-3">
          <Avatar className="size-12">
            {user?.avatarUrl && <Avatar.Image src={user.avatarUrl} alt="" />}
            <Avatar.Fallback>{preview.slice(0, 1)}</Avatar.Fallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{preview}</p>
            <p className="truncate text-xs text-muted">{user?.username}</p>
          </div>
        </div>
        <TextField value={nick} onChange={setNick}>
          <Label className="text-xs font-bold tracking-[0.02em] text-muted uppercase">{t.guild.profile.nickname}</Label>
          <Input placeholder={user?.displayName || user?.username} maxLength={32} autoFocus onKeyDown={(e) => e.key === 'Enter' && void save()} />
        </TextField>
        <p className="text-xs text-muted">{t.guild.profile.hint}</p>
      </Modal.Body>
      <Modal.Footer>
        {member?.nickname && (
          <Button variant="ghost" className="mr-auto" onPress={() => setNick('')}>
            {t.guild.profile.reset}
          </Button>
        )}
        <Button variant="tertiary" onPress={() => guildUi.close('serverProfile')}>
          {t.common.cancel}
        </Button>
        <Button variant="primary" isPending={busy} onPress={() => void save()}>
          {t.guild.common.save}
        </Button>
      </Modal.Footer>
    </>
  );
}

/* ── Notifications du serveur ─────────────────────────────────────────────── */

export function NotificationsDialog() {
  const req = useGuildUi((s) => s.notifications);
  return (
    <Modal isOpen={!!req} onOpenChange={(open) => !open && guildUi.close('notifications')}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">{req && <NotificationsForm serverId={req.serverId} />}</Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function NotificationsForm({ serverId }: { serverId: string }) {
  const { t } = useTranslation();
  const info = useGuildInfo(serverId);
  const [level, setLevel] = useState<notif.NotifLevel>(() => notif.getLevel(serverId));
  const muted = useGuildPrefs((s) => isMuteActive(s.mutedServers[serverId]));
  const hideMuted = useGuildPrefs((s) => Boolean(s.hideMuted[serverId]));

  return (
    <>
      <Modal.CloseTrigger />
      <Modal.Header className="flex-col items-start gap-0.5">
        <Modal.Heading>{t.guild.notif.title}</Modal.Heading>
        <p className="text-sm text-muted">{info?.name}</p>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-5">
        <SettingSwitch
          icon={BellOff}
          label={t.guild.notif.muteServer}
          description={t.guild.notif.muteServerDesc}
          isSelected={muted}
          onChange={(v) => muteServer(serverId, v ? 0 : null)}
        />
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold tracking-[0.02em] text-muted uppercase">{t.guild.notif.levelTitle}</p>
          <RadioGroup
            value={level}
            onChange={(v) => {
              setLevel(v as notif.NotifLevel);
              setNotifLevel(serverId, v as notif.NotifLevel, 'server');
            }}
            aria-label={t.guild.notif.levelTitle}
            className="flex flex-col gap-2"
          >
            <RadioCard value="all" icon={BellRing} title={t.guild.notif.all} description={t.guild.notif.allDesc} />
            <RadioCard value="mentions" icon={AtSign} title={t.guild.notif.mentions} description={t.guild.notif.mentionsDesc} />
            <RadioCard value="nothing" icon={Bell} title={t.guild.notif.nothing} description={t.guild.notif.nothingDesc} />
          </RadioGroup>
        </div>
        <SettingSwitch
          label={t.guild.menu.hideMutedChannels}
          description={t.guild.notif.hideMutedDesc}
          isSelected={hideMuted}
          onChange={(v) => useGuildPrefs.getState().setHideMuted(serverId, v)}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onPress={() => guildUi.close('notifications')}>
          {t.guild.common.done}
        </Button>
      </Modal.Footer>
    </>
  );
}

/* ── Actions sur un membre ────────────────────────────────────────────────── */

export function MemberActionDialog() {
  const req = useGuildUi((s) => s.memberAction);
  return (
    <Modal isOpen={!!req} onOpenChange={(open) => !open && guildUi.close('memberAction')}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            {req && <MemberActionForm key={`${req.kind}:${req.userId}`} kind={req.kind} serverId={req.serverId} userId={req.userId} />}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function MemberActionForm({ kind, serverId, userId }: { kind: 'nickname' | 'kick' | 'ban'; serverId: string; userId: string }) {
  const { t, tx } = useTranslation();
  const member = useGuildMember(serverId, userId);
  const info = useGuildInfo(serverId);
  const name = memberName(member, t.guild.chat.unknownUser);
  const [value, setValue] = useState(kind === 'nickname' ? (member?.nickname ?? '') : '');
  const [busy, setBusy] = useState(false);
  const close = () => guildUi.close('memberAction');

  const submit = async () => {
    setBusy(true);
    if (kind === 'nickname') await setNickname(serverId, userId, value.trim());
    if (kind === 'kick') kickMember(serverId, userId);
    if (kind === 'ban') banMember(serverId, userId, value.trim() || undefined);
    setBusy(false);
    close();
  };

  const title =
    kind === 'nickname' ? t.guild.member.changeNickname : tx(kind === 'kick' ? t.guild.member.kickTitle : t.guild.member.banTitle, { name, server: info?.name ?? '' });

  return (
    <>
      <Modal.CloseTrigger />
      <Modal.Header>
        <Modal.Heading>{title}</Modal.Heading>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-3">
        {kind !== 'nickname' && <p className="text-sm text-muted">{tx(kind === 'kick' ? t.guild.member.kickBody : t.guild.member.banBody, { name })}</p>}
        {kind === 'nickname' ? (
          <TextField value={value} onChange={setValue}>
            <Label className="text-xs font-bold tracking-[0.02em] text-muted uppercase">{t.guild.profile.nickname}</Label>
            <Input placeholder={member?.user.displayName} maxLength={32} autoFocus onKeyDown={(e) => e.key === 'Enter' && void submit()} />
          </TextField>
        ) : kind === 'ban' ? (
          <TextField value={value} onChange={setValue}>
            <Label className="text-xs font-bold tracking-[0.02em] text-muted uppercase">{t.guild.member.reason}</Label>
            <TextArea placeholder={t.guild.member.reasonPlaceholder} maxLength={500} rows={3} />
          </TextField>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="tertiary" onPress={close}>
          {t.common.cancel}
        </Button>
        <Button variant={kind === 'nickname' ? 'primary' : 'danger'} isPending={busy} onPress={() => void submit()}>
          {kind === 'nickname' ? t.guild.common.save : kind === 'kick' ? t.guild.member.kick : t.guild.member.ban}
        </Button>
      </Modal.Footer>
    </>
  );
}
