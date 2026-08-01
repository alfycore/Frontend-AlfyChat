import { cn } from '@/lib/utils';

/** Titre de section discret (sidebar, panneaux) — uppercase, muted. */
export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3
      className={cn(
        'px-2 text-[11px] font-semibold tracking-wider text-muted uppercase select-none',
        className,
      )}
    >
      {children}
    </h3>
  );
}
