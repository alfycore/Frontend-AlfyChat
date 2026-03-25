'use client';

import { usePathname, useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { MessageCircleIcon, UsersIcon, SettingsIcon } from '@/components/icons';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'messages',  label: 'Messages',   icon: MessageCircleIcon },
  { id: 'friends',   label: 'Amis',       icon: UsersIcon         },
  { id: 'settings',  label: 'Paramètres', icon: SettingsIcon      },
] as const;

export function MobileBottomNav() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { showSidebar, openSidebar, closeSidebar } = useMobileNav();

  const isSettings = pathname.startsWith('/channels/me/settings');
  const isFriends  = (pathname === '/channels/me' || pathname === '/channels/me/') && !showSidebar;
  const isMessages = (!isFriends && !isSettings) || showSidebar;

  const isActive = (id: string) => {
    if (id === 'messages') return isMessages;
    if (id === 'friends')  return isFriends;
    if (id === 'settings') return isSettings;
    return false;
  };

  const handlePress = (id: string) => {
    if (id === 'messages') {
      if (isSettings || isFriends) {
        closeSidebar();
        router.push('/channels/me');
        setTimeout(openSidebar, 50);
      } else if (showSidebar) {
        closeSidebar();
      } else {
        openSidebar();
      }
    } else if (id === 'friends') {
      closeSidebar();
      router.push('/channels/me');
    } else if (id === 'settings') {
      closeSidebar();
      router.push('/channels/me/settings');
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-stretch border-t border-[var(--border)]/60 bg-[var(--surface)]/95 backdrop-blur-xl md:hidden">
      {TABS.map((tab) => {
        const active = isActive(tab.id);
        return (
          <button
            key={tab.id}
            onClick={() => handlePress(tab.id)}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 transition-all',
              active ? 'text-[var(--accent)]' : 'text-[var(--muted)]',
            )}
          >
            <div className={cn(
              'flex size-10 items-center justify-center rounded-xl transition-all',
              active ? 'bg-[var(--accent)]/12 scale-110' : 'scale-100',
            )}>
              <HugeiconsIcon icon={tab.icon} size={20} />
            </div>
            <span className={cn(
              'text-[10px] font-semibold transition-all',
              active ? 'opacity-100' : 'opacity-60',
            )}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
