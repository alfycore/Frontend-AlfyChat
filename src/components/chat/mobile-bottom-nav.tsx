'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGridIcon,
  UsersIcon,
  UserIcon,
} from '@/components/icons';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { useNotificationStore } from '@/lib/notification-store';
import { cn } from '@/lib/utils';

// ─── Onglets ──────────────────────────────────────────────────────────────────

type TabId = 'channels' | 'friends' | 'me';

interface Tab {
  id: TabId;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
}

const TABS: Tab[] = [
  { id: 'channels', label: 'Salons', Icon: LayoutGridIcon },
  { id: 'friends',  label: 'Amis',   Icon: UsersIcon      },
  { id: 'me',       label: 'Moi',    Icon: UserIcon       },
];

// ─── Composant ────────────────────────────────────────────────────────────────

export function MobileBottomNav() {
  
  const pathname = usePathname();
  const router   = useRouter();
  const {
    showSidebar,
    showSettings,
    toggleSidebar,
    closeSidebar,
    openSettings,
    closeSettings,
  } = useMobileNav();

  const notifStore = useNotificationStore();

  // Badge d'alertes non lues (tous types confondus, hors canal actif)
  const totalUnread = Array.from(notifStore.unread.values()).reduce((s, v) => s + v, 0);

  const isOnHome = pathname === '/channels/me' || pathname === '/channels/me/';

  // ── Active state ──────────────────────────────────────────────────────────
  const isActive = (id: TabId): boolean => {
    switch (id) {
      case 'channels': return showSidebar;
      case 'friends':  return isOnHome && !showSidebar && !showSettings;
      case 'me':       return showSettings;
      default:         return false;
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handlePress = (id: TabId) => {
    switch (id) {
      case 'channels':
        closeSettings();
        toggleSidebar();
        break;
      case 'friends':
        closeSidebar();
        closeSettings();
        router.push('/channels/me');
        break;
      case 'me':
        closeSidebar();
        openSettings();
        break;
    }
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex h-14 items-stretch border-t border-border/40 bg-sidebar/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const active = isActive(id);
        // Badge uniquement sur l'onglet "Salons"
        const badge  = id === 'channels' && !active && totalUnread > 0 ? totalUnread : 0;

        return (
          <button
            key={id}
            type="button"
            aria-label={label}
            aria-pressed={active}
            onClick={() => handlePress(id)}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.75 transition-colors duration-200',
              active ? 'text-foreground' : 'text-muted-foreground/70',
            )}
          >
            {/* Pill indicateur en haut */}
            <span
              aria-hidden
              className={cn(
                'absolute left-1/2 top-0 h-[2.5px] -translate-x-1/2 rounded-b-full bg-primary transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                active ? 'w-7 opacity-100' : 'w-0 opacity-0',
              )}
            />

            {/* Icône + fond actif */}
            <div
              className={cn(
                'relative flex size-8 items-center justify-center rounded-xl transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                active ? 'scale-110 bg-foreground/10' : 'scale-100',
              )}
            >
              <Icon size={20} />

              {/* Badge non-lu */}
              {badge > 0 && (
                <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 py-px text-[9px] font-bold leading-none text-white ring-2 ring-sidebar/95">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>

            {/* Label */}
            <span
              className={cn(
                'text-[9.5px] font-medium tracking-wide transition-opacity duration-200',
                active ? 'opacity-100' : 'opacity-55',
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
