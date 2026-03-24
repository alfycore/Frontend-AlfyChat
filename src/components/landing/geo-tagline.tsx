'use client';

import { useEffect, useState } from 'react';

// Timezones Europe/Paris = France. All other Europe/* = European. Rest = international.
function getRegionLabel(tz: string): { word: string; flag: string } {
  if (tz === 'Europe/Paris') return { word: 'française.', flag: '🇫🇷' };
  if (tz.startsWith('Europe/'))  return { word: 'Européenne.', flag: '🇪🇺' };
  return { word: 'internationale.', flag: '🌍' };
}

export function GeoTagline() {
  const [label, setLabel] = useState<{ word: string; flag: string }>({ word: 'française.', flag: '🇫🇷' });

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setLabel(getRegionLabel(tz));
    } catch {
      // fallback already set
    }
  }, []);

  return <span className="text-accent">{label.word}</span>;
}

export function GeoHostingBadge() {
  const [label, setLabel] = useState<string>('🇫🇷 Hébergé en France');

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz === 'Europe/Paris') setLabel('🇫🇷 Hébergé en France');
      else if (tz.startsWith('Europe/')) setLabel('🇪🇺 Hébergé en Europe');
      else setLabel('🌍 Hébergé en Europe');
    } catch {}
  }, []);

  return <>{label}</>;
}
