'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertDialog, Button, Dropdown, FieldError, Input, Label, Table, TextField, toast } from '@heroui/react';
import { Ellipsis, ShieldOff, UserMinus } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { socketService } from '@/lib/socket';
import { useUserById } from '@/components/alfy/user-directory';
import type { AlfyServer } from '@/components/alfy/mock/types';
import { canActOnMember, type MemberPerms } from '@/lib/server-perms';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { RoleChip } from '@/components/alfy/primitives/role-chip';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';
import { useTranslation } from '@/components/locale-provider';

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export function MembersPanel({ server, perms }: { server: AlfyServer; perms?: MemberPerms }) {
  const { t, tx } = useTranslation();
  const { user: currentUser } = useAuth();
  const userById = useUserById();
  const [banTarget, setBanTarget] = useState<{ userId: string; displayName: string } | null>(null);
  const [banReason, setBanReason] = useState('');
  /** Action en vol : sert à n'annoncer le succès qu'une fois le membre réellement parti. */
  const pending = useRef<{ userId: string; displayName: string; kind: 'kick' | 'ban' } | null>(null);

  // Le succès vient du serveur (MEMBER_LEAVE), l'échec aussi (MEMBER_ERROR).
  // Auparavant le toast de succès s'affichait avant même la réponse, y compris
  // quand le gateway répondait PERMISSION_DENIED.
  useEffect(() => {
    function onMemberLeave(payload: any) {
      const p = payload?.payload ?? payload;
      const inFlight = pending.current;
      if (!inFlight || p?.userId !== inFlight.userId) return;
      pending.current = null;
      toast(
        inFlight.kind === 'kick' ? t.membersPanel.memberKicked : t.membersPanel.memberBanned,
        { description: inFlight.displayName },
      );
    }
    function onMemberError(payload: any) {
      const inFlight = pending.current;
      pending.current = null;
      const message: string | undefined = payload?.message ?? payload?.error;
      toast.danger(t.common.error, {
        description: inFlight ? `${inFlight.displayName} — ${message ?? ''}`.trim() : message,
      });
    }
    socketService.on('MEMBER_LEAVE', onMemberLeave);
    socketService.on('MEMBER_ERROR', onMemberError);
    return () => {
      socketService.off('MEMBER_LEAVE', onMemberLeave);
      socketService.off('MEMBER_ERROR', onMemberError);
    };
  }, [t]);

  const handleKick = useCallback((userId: string, displayName: string) => {
    pending.current = { userId, displayName, kind: 'kick' };
    socketService.kickMember(server.id, userId);
  }, [server.id]);

  const handleBan = () => {
    if (!banTarget) return;
    pending.current = { userId: banTarget.userId, displayName: banTarget.displayName, kind: 'ban' };
    socketService.banMember(server.id, banTarget.userId, banReason.trim() || undefined);
    setBanTarget(null);
    setBanReason('');
  };

  return (
    <div>
      <PanelHeader
        title={t.membersPanel.panelTitle}
        description={tx(t.membersPanel.panelDescription, { n: server.members.length })}
      />
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label={t.membersPanel.panelTitle}>
            <Table.Header>
              <Table.Column isRowHeader>{t.membersPanel.columnMember}</Table.Column>
              <Table.Column>{t.membersPanel.columnRoles}</Table.Column>
              <Table.Column>{t.membersPanel.columnJoined}</Table.Column>
              <Table.Column aria-label="Actions" />
            </Table.Header>
            <Table.Body>
              {server.members.map((member) => {
                const user = userById(member.userId);
                const roles = server.roles.filter((r) => member.roleIds.includes(r.id));
                const isSelf = member.userId === currentUser?.id;
                // On n'affiche l'action que si le serveur l'accepterait :
                // droit correspondant ET cible pas plus puissante que soi.
                const actionable = canActOnMember(server, currentUser?.id, member.userId);
                const showKick = Boolean(perms?.canKick) && actionable;
                const showBan = Boolean(perms?.canBan) && actionable;
                return (
                  <Table.Row key={member.userId}>
                    <Table.Cell>
                      <div className="flex items-center gap-2.5">
                        <AlfyAvatar name={user.displayName} avatarUrl={user.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{user.displayName}</p>
                          <p className="truncate text-xs text-muted">@{user.username}</p>
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-wrap gap-1">
                        {roles.map((r) => (
                          <RoleChip key={r.id} role={r} />
                        ))}
                      </div>
                    </Table.Cell>
                    <Table.Cell className="text-muted">
                      {dateFmt.format(new Date(member.joinedAt))}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex justify-end">
                        {!isSelf && (showKick || showBan) && (
                          <Dropdown>
                            <Dropdown.Trigger
                              aria-label={tx(t.membersPanel.actionsAria, { name: user.displayName })}
                              className="flex size-7 cursor-pointer items-center justify-center rounded-sm text-muted outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
                            >
                              <Ellipsis className="size-4" />
                            </Dropdown.Trigger>
                            <Dropdown.Popover className="min-w-44">
                              <Dropdown.Menu
                                onAction={(key) => {
                                  if (key === 'kick') handleKick(member.userId, user.displayName);
                                  else if (key === 'ban') setBanTarget({ userId: member.userId, displayName: user.displayName });
                                }}
                              >
                                {showKick && (
                                  <Dropdown.Item id="kick" textValue={t.membersPanel.kick} variant="danger">
                                    <UserMinus className="size-4" />
                                    <Label>{t.membersPanel.kick}</Label>
                                  </Dropdown.Item>
                                )}
                                {showBan && (
                                  <Dropdown.Item id="ban" textValue={t.membersPanel.ban} variant="danger">
                                    <ShieldOff className="size-4" />
                                    <Label>{t.membersPanel.ban}</Label>
                                  </Dropdown.Item>
                                )}
                              </Dropdown.Menu>
                            </Dropdown.Popover>
                          </Dropdown>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      <AlertDialog isOpen={!!banTarget} onOpenChange={(open) => { if (!open) { setBanTarget(null); setBanReason(''); } }}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-100">
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>{tx(t.membersPanel.banTitle, { name: banTarget?.displayName ?? '' })}</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body className="flex flex-col gap-3">
                <p>{t.membersPanel.banBody}</p>
                <TextField value={banReason} onChange={setBanReason}>
                  <Label>{t.membersPanel.banReasonLabel}</Label>
                  <Input placeholder={t.membersPanel.banReasonPlaceholder} />
                  <FieldError />
                </TextField>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button slot="close" variant="tertiary">{t.common.cancel}</Button>
                <Button variant="danger" onPress={handleBan}>{t.membersPanel.ban}</Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}
