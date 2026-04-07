'use client';

import { useLocale } from '@/components/locale-provider';
import { LOCALES } from '@/i18n';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  /** Class applied to the wrapper */
  className?: string;
  /** Compact: show only flag + code; full: flag + full label */
  variant?: 'compact' | 'full';
  /** Filter languages by this string (case-insensitive) */
  filter?: string;
}

export function LanguageSwitcher({ className, variant = 'full', filter }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale();

  const visibleLocales = filter
    ? LOCALES.filter(({ label, value }) =>
        label.toLowerCase().includes(filter.toLowerCase()) ||
        value.toLowerCase().includes(filter.toLowerCase())
      )
    : LOCALES;

  return (
    <div className={cn('flex gap-1', className)}>
      {visibleLocales.map(({ value, label, flag }) => {
        const active = locale === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setLocale(value)}
            title={label}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted hover:bg-surface-secondary/70 hover:text-foreground',
            )}
          >
            <span className="text-base leading-none">{flag}</span>
            {variant === 'full' && (
              <span>{label}</span>
            )}
            {variant === 'compact' && (
              <span className="uppercase text-[11px] font-bold tracking-wide">{value}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
