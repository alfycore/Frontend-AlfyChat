'use client';

import { useLocale } from '@/components/locale-provider';
import { LOCALES, resolveSystemLocale } from '@/i18n';
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
  const { locale, localePreference, setLocale } = useLocale();

  const systemLocale = resolveSystemLocale();
  const systemLabel = `Langue du système (${LOCALES.find((l) => l.value === systemLocale)?.label ?? systemLocale})`;
  const systemActive = localePreference === 'system';

  const matchesFilter = (label: string, value: string) =>
    !filter ||
    label.toLowerCase().includes(filter.toLowerCase()) ||
    value.toLowerCase().includes(filter.toLowerCase());

  const visibleLocales = LOCALES.filter(({ label, value }) => matchesFilter(label, value));
  const showSystem = matchesFilter(systemLabel, 'system');

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {/* System language option */}
      {showSystem && (
        <button
          key="system"
          type="button"
          onClick={() => setLocale('system')}
          title={systemLabel}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors',
            systemActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted hover:bg-surface-secondary/70 hover:text-foreground',
          )}
        >
          <span className="text-base leading-none">🌐</span>
          {variant === 'full' && <span>{systemLabel}</span>}
          {variant === 'compact' && <span className="uppercase text-[11px] font-bold tracking-wide">SYS</span>}
        </button>
      )}

      {visibleLocales.map(({ value, label, flag }) => {
        const active = !systemActive && locale === value;
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
            {variant === 'full' && <span>{label}</span>}
            {variant === 'compact' && (
              <span className="uppercase text-[11px] font-bold tracking-wide">{value}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
