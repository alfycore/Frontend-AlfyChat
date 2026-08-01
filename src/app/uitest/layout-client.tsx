'use client';

import { Toast } from '@heroui/react';

import { UitestSwitcher } from '@/components/alfy/shell/uitest-switcher';

export function UitestLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <div data-ui="alfy" className="flex h-dvh flex-col overflow-hidden">
      <UitestSwitcher />
      <div className="min-h-0 flex-1">{children}</div>
      <Toast.Provider placement="bottom end" />
    </div>
  );
}
