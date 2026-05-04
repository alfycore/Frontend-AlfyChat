'use client';

import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/components/locale-provider';
import type { NetworkQuality, NetworkStats } from '@/hooks/use-voice';

interface Props {
  stats: NetworkStats;
  size?: number;
  className?: string;
}

const qualityMeta: Record<NetworkQuality, { bars: number; color: string }> = {
  excellent: { bars: 4, color: 'bg-success' },
  good:      { bars: 3, color: 'bg-success' },
  fair:      { bars: 2, color: 'bg-amber-500' },
  poor:      { bars: 1, color: 'bg-destructive' },
  unknown:   { bars: 0, color: 'bg-muted-foreground/40' },
};

export function NetworkQualityIndicator({ stats, size = 14, className }: Props) {
  const { t } = useTranslation();
  const meta = qualityMeta[stats.quality];
  const qualityLabels: Record<NetworkQuality, string> = {
    excellent: t.networkQuality.excellent,
    good:      t.networkQuality.good,
    fair:      t.networkQuality.fair,
    poor:      t.networkQuality.poor,
    unknown:   t.networkQuality.unknown,
  };
  const label = qualityLabels[stats.quality];
  const heights = [0.35, 0.55, 0.75, 1];

  const rttLabel = stats.rtt !== null ? `${stats.rtt} ms` : '—';
  const lossLabel = stats.packetLoss !== null ? `${stats.packetLoss.toFixed(1)}%` : '—';
  const jitterLabel = stats.jitter !== null ? `${(stats.jitter * 1000).toFixed(1)} ms` : '—';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            aria-label={`${t.networkQuality.quality}${label}`}
            className={cn(
              'flex size-7 cursor-default items-center justify-center rounded-lg transition-colors hover:bg-foreground/6',
              className,
            )}
          >
            <div className="flex items-end gap-[2px]" style={{ height: size, width: size }}>
              {[0, 1, 2, 3].map((i) => {
                const active = i < meta.bars;
                return (
                  <span
                    key={i}
                    className={cn(
                      'w-[2.5px] rounded-[1px] transition-colors',
                      active ? meta.color : 'bg-muted-foreground/25',
                    )}
                    style={{ height: `${heights[i] * 100}%` }}
                  />
                );
              })}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[11px]">
          <div className="flex flex-col gap-0.5">
            <div className="font-heading text-[11px] font-semibold tracking-tight">
              {t.networkQuality.quality}<span className={cn(
                stats.quality === 'excellent' || stats.quality === 'good' ? 'text-success' :
                stats.quality === 'fair' ? 'text-amber-500' :
                stats.quality === 'poor' ? 'text-destructive' : 'text-muted-foreground',
              )}>{label}</span>
            </div>
            <div className="mt-1 grid grid-cols-[auto_auto] gap-x-2 gap-y-0.5 font-mono text-[10px] text-muted-foreground">
              <span>{t.networkQuality.ping}</span><span className="text-foreground">{rttLabel}</span>
              <span>{t.networkQuality.loss}</span><span className="text-foreground">{lossLabel}</span>
              <span>{t.networkQuality.jitter}</span><span className="text-foreground">{jitterLabel}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
