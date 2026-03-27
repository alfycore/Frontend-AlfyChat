'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  /** Clé localStorage pour persister la largeur */
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  /**
   * 'right'  → le handle est à droite du panel (panel gauche, ex. ChannelList)
   * 'left'   → le handle est à gauche du panel  (panel droit,  ex. MemberList)
   */
  side?: 'right' | 'left';
  /** Désactiver le resize (mobile) */
  disabled?: boolean;
}

export function useResizablePanel({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  side = 'right',
  disabled = false,
}: Options) {
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return defaultWidth;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const n = parseInt(stored, 10);
      if (!isNaN(n) && n >= minWidth && n <= maxWidth) return n;
    }
    return defaultWidth;
  });

  const dragging    = useRef(false);
  const startX      = useRef(0);
  const startWidth  = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      dragging.current   = true;
      startX.current     = e.clientX;
      startWidth.current = width;
      document.body.style.cursor     = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [disabled, width],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta    = side === 'right'
        ? e.clientX - startX.current
        : startX.current - e.clientX;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta));
      setWidth(newWidth);
    };

    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      setWidth((prev) => {
        localStorage.setItem(storageKey, String(prev));
        return prev;
      });
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [storageKey, minWidth, maxWidth, side]);

  return { width, onMouseDown };
}
