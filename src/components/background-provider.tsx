'use client';

import { useBackground } from '@/hooks/use-background';

/**
 * Applies wallpaper + glassmorphism side-effects to <body>.
 * Must be a client component placed inside the root layout.
 */
export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  useBackground();
  return <>{children}</>;
}
