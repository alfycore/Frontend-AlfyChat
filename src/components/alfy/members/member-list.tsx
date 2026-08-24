'use client';

import { ScrollShadow } from '@heroui/react';
import { useMemo } from 'react';

import { UsersRound } from 'lucide-react';

import { CURRENT_USER, getMemberPermissions } from '@/components/alfy/mock/data';
import type { AlfyServer } from '@/components/alfy/mock/types';
import { useUserById } from '@/components/alfy/user-directory';
import { EmptyState } from '@/components/alfy/primitives/empty-state';
import { SectionLabel } from '@/components/alfy/primitives/section-label';
import { MemberItem } from '@/components/alfy/members/member-item';
import { useTranslation } from '@/components/locale-provider';

/**
 * Liste des membres, groupée par rôle « hoisted » (position croissante),
 * puis « En ligne » / « Hors ligne » pour les autres.
 * `currentUserId` : identité réelle (défaut = utilisateur mock).
 */
interface MemberListProps {
  server: AlfyServer;
  currentUserId?: string;
  onKick?: (userId: string) => void;
  onBan?: (userId: string, reason: string) => void;
  onToggleRole?: (userId: string, roleId: string, next: boolean) => void;
}

export function MemberList({ server, currentUserId, onKick, onBan, onToggleRole }: MemberListProps) {
  const { t, tx } = useTranslation();
  const userById = useUserById();
  const meId = currentUserId ?? CURRENT_USER.id;

  const groups = useMemo(() => {
    const hoisted = server.roles.filter((r) => r.hoisted).sort((a, b) => a.position - b.position);
    const assigned = new Set<string>();
    const out: { label: string; members: typeof server.members }[] = [];

    for (const role of hoisted) {
      const members = server.members.filter((m) => {
        const user = userById(m.userId);
        const online = user.status !== 'offline' && user.status !== 'invisible';
        return online && !assigned.has(m.userId) && m.roleIds.includes(role.id);
      });
      members.forEach((m) => assigned.add(m.userId));
      if (members.length > 0) {
        out.push({ label: tx(t.admin.members.roleGroupCount, { role: role.name, n: members.length }), members });
      }
    }

    const rest = server.members.filter((m) => !assigned.has(m.userId));
    const online = rest.filter((m) => {
      const u = userById(m.userId);
      return u.status !== 'offline' && u.status !== 'invisible';
    });
    const offline = rest.filter((m) => !online.includes(m));
    if (online.length > 0) out.push({ label: tx(t.admin.members.onlineGroup, { n: online.length }), members: online });
    if (offline.length > 0) out.push({ label: tx(t.admin.members.offlineGroup, { n: offline.length }), members: offline });
    return out;
  }, [server, userById, t, tx]);

  const moderatorPermissions = useMemo(
    () => getMemberPermissions(server, meId),
    [server, meId],
  );

  return (
    <aside aria-label={t.admin.members.ariaServerMembers} className="flex h-full w-full flex-col bg-surface-secondary/35">
      <ScrollShadow className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {/* Un panneau vide était indiscernable d'un chargement bloqué. */}
        {groups.length === 0 && (
          <EmptyState icon={UsersRound} title={t.memberList.title} description={tx(t.memberList.memberCountPlural, { n: 0 })} />
        )}
        {groups.map((g) => (
          <div key={g.label} className="mb-4">
            <SectionLabel className="mb-1">{g.label}</SectionLabel>
            <div className="flex flex-col gap-0.5">
              {g.members.map((m) => (
                <MemberItem
                  key={m.userId}
                  member={m}
                  roles={server.roles.filter((r) => m.roleIds.includes(r.id))}
                  allServerRoles={server.roles}
                  isSelf={m.userId === meId}
                  moderatorPermissions={moderatorPermissions}
                  onKick={onKick}
                  onBan={onBan}
                  onToggleRole={onToggleRole}
                />
              ))}
            </div>
          </div>
        ))}
      </ScrollShadow>
    </aside>
  );
}
