import type { ReactNode } from 'react';

export default function OAuth2Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-background">
      {children}
    </div>
  );
}
