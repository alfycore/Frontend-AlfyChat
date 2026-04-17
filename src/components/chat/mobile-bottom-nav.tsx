'use client';

import { usePathname, useRouter } from 'next/navigation';
import { MessageCircleIcon, UsersIcon, SettingsIcon } from '@/components/icons';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'messages', label: 'Messages',   icon: MessageCircleIcon },
  { id: 'friends',  label: 'Amis',       icon: UsersIcon         },
  { id: 'settings', label: 'Paramètres', icon: SettingsIcon      },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const router   = useRouter();
  const { showSidebar, showSettings, toggleSidebar, closeSidebar, openSettings, closeSettings } = useMobileNav();

  const isOnFriends = pathname === '/channels/me' || pathname === '/channels/me/';

  const isActive = (id: string) => {
    if (id === 'messages') return showSidebar;
    if (id === 'friends')  return isOnFriends && !showSidebar && !showSettings;
    if (id === 'settings') return showSettings;
    return false;
  };

  const handlePress = (id: string) => {
    if (id === 'messages') {
      closeSettings();
      toggleSidebar();
    } else if (id === 'friends') {
      closeSidebar();
      closeSettings();
      if (!isOnFriends) router.push('/channels/me');
    } else if (id === 'settings') {
      closeSidebar();
      openSettings();
    }
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-stretch border-t border-border/40 bg-sidebar/95 backdrop-blur-xl md:hidden">
      {TABS.map((tab) => {
        const active = isActive(tab.id);
        return (
          <Button
            key={tab.id}
            variant="ghost"
            onClick={() => handlePress(tab.id)}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-none h-full transition-colors hover:bg-transparent',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {/* Top indicator pill */}
            <span
              aria-hidden
              className={cn(
                'absolute left-1/2 top-0 h-[3px] -translate-x-1/2 rounded-b-full bg-linear-to-r from-primary to-[#7c3aed] transition-all duration-300 ease-out',
                active ? 'w-8 opacity-100' : 'w-0 opacity-0',
              )}
            />
            <div className={cn(
              'flex size-9 items-center justify-center rounded-xl transition-all duration-300',
              active
                ? 'scale-105 bg-linear-to-br from-primary/15 to-[#7c3aed]/10 ring-1 ring-primary/20'
                : 'scale-100',
            )}>
              <tab.icon size={20} />
            </div>
            <span className={cn(
              'text-[10px] font-heading tracking-tight transition-opacity',
              active ? 'opacity-100' : 'opacity-70',
            )}>
              {tab.label}
            </span>
          </Button>
        );
      })}
    </nav>
  );
}
