import { Button } from '@heroui/react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn('alfy-enter flex flex-col items-center justify-center gap-3 p-8 text-center', className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-surface-secondary text-muted">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="max-w-xs text-xs text-muted">{description}</p>}
      </div>
      {actionLabel && (
        <Button size="sm" variant="secondary" onPress={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
