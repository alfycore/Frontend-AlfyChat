'use client';

import { usePathname, useRouter } from 'next/navigation';
import { MessageCircleIcon, UsersIcon, SettingsIcon } from '@/components/icons';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'messages',  label: 'Messages',   icon: MessageCircleIcon },
  { id: 'friends',   label: 'Amis',       icon: UsersIcon         },
  { id: 'settings',  label: 'Paramètres', icon: SettingsIcon      },
] as const;

export function MobileBottomNav() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { showSidebar, showSettings, openSidebar, closeSidebar, openSettings, closeSettings } = useMobileNav();

  const isFriends  = (pathname === '/channels/me' || pathname === '/channels/me/') && !showSidebar && !showSettings;
  const isMessages = (!isFriends && !showSettings) || showSidebar;

  const isActive = (id: string) => {
    if (id === 'messages') return isMessages;
    if (id === 'friends')  return isFriends;
    if (id === 'settings') return showSettings;
    return false;
  };

  const handlePress = (id: string) => {
    if (id === 'messages') {
      closeSettings();
      if (isFriends) {
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
      closeSettings();
      router.push('/channels/me');
    } else if (id === 'settings') {
      closeSidebar();
      openSettings();
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-stretch border-t border-[var(--border)]/30 bg-[var(--surface)]/80 md:hidden">
      {TABS.map((tab) => {
        const active = isActive(tab.id);
        return (
          <Button
            key={tab.id}
            variant="ghost"
            onClick={() => handlePress(tab.id)}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 rounded-none h-full transition-all',
              active ? 'text-[var(--accent)]' : 'text-[var(--muted)]',
            )}
          >
            <div className={cn(
              'flex size-10 items-center justify-center rounded-xl transition-all',
              active ? 'bg-[var(--accent)]/12 scale-110' : 'scale-100',
            )}>
              <tab.icon size={20} />
            </div>
            <span className={cn(
              'text-[10px] font-semibold transition-all',
              active ? 'opacity-100' : 'opacity-60',
            )}>
              {tab.label}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
