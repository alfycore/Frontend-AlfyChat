'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  UsersIcon, BarChart3Icon, ShieldIcon, ServerIcon,
  CompassIcon, CheckCircle2Icon, AwardIcon, SettingsIcon,
  ShieldAlertIcon, FileTextIcon, ShieldCheckIcon,
} from '@/components/icons';
import { api } from '@/lib/api';

function StatCard({
  label, value, color, icon: Icon, suffix,
}: {
  label: string;
  value: number | undefined;
  color: string;
  icon: React.ElementType;
  suffix?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className={`mt-2 text-3xl font-bold tabular-nums tracking-tight ${color}`}>
            {(value ?? 0).toLocaleString('fr-FR')}
            {suffix && <span className="ml-1 text-base font-normal text-muted-foreground">{suffix}</span>}
          </p>
        </div>
        <div className={`rounded-lg p-2.5 ${color.includes('green') ? 'bg-green-500/10' : color.includes('primary') || color.includes('purple') ? 'bg-primary/10' : color.includes('orange') ? 'bg-orange-500/10' : 'bg-muted'}`}>
          <Icon className={`size-5 ${color}`} />
        </div>
      </div>
    </div>
  );
}

const QUICK = [
  { href: '/admin/users',      label: 'Utilisateurs',  icon: UsersIcon,        color: 'text-primary',     bg: 'bg-primary/10',     desc: 'Gérer les comptes' },
  { href: '/admin/monitoring', label: 'Monitoring',    icon: BarChart3Icon,    color: 'text-blue-500',    bg: 'bg-blue-500/10',    desc: 'Métriques temps réel' },
  { href: '/admin/status',     label: 'Status public', icon: CheckCircle2Icon, color: 'text-green-500',   bg: 'bg-green-500/10',   desc: 'Incidents & services' },
  { href: '/admin/security',   label: 'Sécurité',      icon: ShieldAlertIcon,  color: 'text-destructive', bg: 'bg-destructive/10', desc: 'IPs bannies & RL' },
  { href: '/admin/discovery',  label: 'Découverte',    icon: CompassIcon,      color: 'text-cyan-500',    bg: 'bg-cyan-500/10',    desc: 'Candidatures serveurs' },
  { href: '/admin/badges',     label: 'Badges',        icon: AwardIcon,        color: 'text-amber-500',   bg: 'bg-amber-500/10',   desc: 'Créer & attribuer' },
  { href: '/admin/services',   label: 'Services',      icon: ServerIcon,       color: 'text-violet-500',  bg: 'bg-violet-500/10',  desc: 'Registre des instances' },
  { href: '/admin/helpdesk',   label: 'Helpdesk',      icon: ShieldCheckIcon,  color: 'text-teal-500',    bg: 'bg-teal-500/10',    desc: 'Tickets support' },
  { href: '/admin/changelogs', label: 'Changelogs',    icon: FileTextIcon,     color: 'text-indigo-500',  bg: 'bg-indigo-500/10',  desc: 'Notes de version' },
  { href: '/admin/settings',   label: 'Paramètres',    icon: SettingsIcon,     color: 'text-muted-foreground', bg: 'bg-muted', desc: 'Config plateforme' },
];

export default function AdminOverviewPage() {
  const [stats, setStats]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [time, setTime]     = useState('');

  useEffect(() => {
    api.getAdminStats().then(r => {
      if (r.success) setStats(r.data);
      setLoading(false);
    });
    const fmt = () => setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    fmt();
    const t = setInterval(fmt, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vue d&apos;ensemble</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Tableau de bord de la plateforme AlfyChat.</p>
        </div>
        {time && (
          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-green-500" />
            </span>
            <span className="text-xs text-muted-foreground">Mis à jour à {time}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-26 animate-pulse rounded-xl border border-border bg-muted/40" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Utilisateurs"    value={stats.totalUsers}  color="text-foreground"  icon={UsersIcon} />
          <StatCard label="En ligne"        value={stats.onlineUsers} color="text-green-500"   icon={BarChart3Icon} />
          <StatCard label="Administrateurs" value={stats.admins}      color="text-primary"     icon={ShieldIcon} />
          <StatCard label="Modérateurs"     value={stats.moderators}  color="text-orange-500"  icon={ShieldIcon} />
        </div>
      ) : null}

      {/* Quick links */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Accès rapide
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {QUICK.map(({ href, label, icon: Icon, color, bg, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${bg} transition-transform duration-150 group-hover:scale-110`}>
                <Icon className={`size-4 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{label}</p>
                <p className="truncate text-xs text-muted-foreground">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
