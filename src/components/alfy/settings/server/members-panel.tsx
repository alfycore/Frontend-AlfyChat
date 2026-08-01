'use client';

import { useState } from 'react';
import { AlertDialog, Button, Dropdown, FieldError, Input, Label, Table, TextField, toast } from '@heroui/react';
import { Ellipsis, ShieldOff, UserMinus } from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { socketService } from '@/lib/socket';
import { useUserById } from '@/components/alfy/user-directory';
import type { AlfyServer } from '@/components/alfy/mock/types';
import { AlfyAvatar } from '@/components/alfy/primitives/alfy-avatar';
import { RoleChip } from '@/components/alfy/primitives/role-chip';
import { PanelHeader } from '@/components/alfy/settings/settings-shell';

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export function MembersPanel({ server }: { server: AlfyServer }) {
  const { user: currentUser } = useAuth();
  const userById = useUserById();
  const [banTarget, setBanTarget] = useState<{ userId: string; displayName: string } | null>(null);
  const [banReason, setBanReason] = useState('');

  const handleKick = (userId: string, displayName: string) => {
    socketService.kickMember(server.id, userId);
    toast('Membre expulsé', { description: displayName });
  };

  const handleBan = () => {
    if (!banTarget) return;
    socketService.banMember(server.id, banTarget.userId, banReason.trim() || undefined);
    toast('Membre banni', { description: banTarget.displayName });
    setBanTarget(null);
    setBanReason('');
  };

  return (
    <div>
      <PanelHeader
        title="Membres"
        description={`${server.members.length} membres sur ce serveur.`}
      />
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Membres du serveur">
            <Table.Header>
              <Table.Column isRowHeader>Membre</Table.Column>
              <Table.Column>Rôles</Table.Column>
              <Table.Column>Arrivé·e le</Table.Column>
              <Table.Column aria-label="Actions" />
            </Table.Header>
            <Table.Body>
              {server.members.map((member) => {
                const user = userById(member.userId);
                const roles = server.roles.filter((r) => member.roleIds.includes(r.id));
                const isSelf = member.userId === currentUser?.id;
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
                        {!isSelf && (
                          <Dropdown>
                            <Dropdown.Trigger
                              aria-label={`Actions pour ${user.displayName}`}
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
                                <Dropdown.Item id="kick" textValue="Expulser" variant="danger">
                                  <UserMinus className="size-4" />
                                  <Label>Expulser</Label>
                                </Dropdown.Item>
                                <Dropdown.Item id="ban" textValue="Bannir" variant="danger">
                                  <ShieldOff className="size-4" />
                                  <Label>Bannir</Label>
                                </Dropdown.Item>
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
                <AlertDialog.Heading>Bannir {banTarget?.displayName} ?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body className="flex flex-col gap-3">
                <p>Cette personne ne pourra plus rejoindre ce serveur tant qu&apos;elle ne sera pas débannie.</p>
                <TextField value={banReason} onChange={setBanReason}>
                  <Label>Motif (optionnel)</Label>
                  <Input placeholder="Raison du bannissement" />
                  <FieldError />
                </TextField>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button slot="close" variant="tertiary">Annuler</Button>
                <Button variant="danger" onPress={handleBan}>Bannir</Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}
