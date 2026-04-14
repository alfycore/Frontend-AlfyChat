'use client';

import { useEffect, useRef, useState } from 'react';

const EDGE_ZONE = 28;          // px from left edge to start opening gesture
const OPEN_RATIO = 0.35;       // fraction of sidebar width to consider open
const VELOCITY_MIN = 0.3;      // px/ms — quick flick threshold
const ANGLE_LOCK = 1.2;        // horizontal must dominate vertical by this ratio

interface Options {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  width: number;
  enabled?: boolean;
}

interface Refs {
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  backdropRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Discord-style swipe drawer.
 * - Swipe right from the left edge → opens sidebar (tracks finger)
 * - Swipe left while open → closes sidebar (tracks finger)
 * - Release below threshold snaps back; above snaps open/closed
 */
export function useSwipeDrawer({ open, onOpen, onClose, width, enabled = true }: Options): Refs {
  const sidebarRef   = useRef<HTMLDivElement | null>(null);
  const backdropRef  = useRef<HTMLDivElement | null>(null);
  const gesture      = useRef<{ startX: number; startY: number; startT: number; mode: 'open' | 'close' | 'idle' | 'locked' }>({
    startX: 0, startY: 0, startT: 0, mode: 'idle',
  });
  const [dragging, setDragging] = useState(false);

  // Apply transform based on drag x relative to sidebar-fully-visible position.
  const apply = (offset: number) => {
    // offset: 0 = fully open, -width = fully closed.
    const clamped = Math.max(-width, Math.min(0, offset));
    if (sidebarRef.current) {
      sidebarRef.current.style.transform = `translateX(${clamped}px)`;
      sidebarRef.current.style.transition = 'none';
    }
    if (backdropRef.current) {
      const opacity = ((clamped + width) / width) * 0.5; // 0 → closed, 0.5 → open
      backdropRef.current.style.opacity = String(Math.max(0, Math.min(0.5, opacity)));
      backdropRef.current.style.pointerEvents = opacity > 0.05 ? 'auto' : 'none';
    }
  };

  // Snap to open/closed state when not dragging.
  useEffect(() => {
    if (dragging) return;
    if (sidebarRef.current) {
      sidebarRef.current.style.transition = 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)';
      sidebarRef.current.style.transform  = open ? 'translateX(0)' : `translateX(-${width}px)`;
    }
    if (backdropRef.current) {
      backdropRef.current.style.transition = 'opacity 220ms cubic-bezier(0.32, 0.72, 0, 1)';
      backdropRef.current.style.opacity    = open ? '0.5' : '0';
      backdropRef.current.style.pointerEvents = open ? 'auto' : 'none';
    }
  }, [open, dragging, width]);

  useEffect(() => {
    if (!enabled) return;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const sidebar = sidebarRef.current;
      const insideSidebar = !!(sidebar && t.target instanceof Node && sidebar.contains(t.target));

      if (open && insideSidebar) {
        gesture.current = { startX: t.clientX, startY: t.clientY, startT: Date.now(), mode: 'close' };
      } else if (!open && t.clientX <= EDGE_ZONE) {
        gesture.current = { startX: t.clientX, startY: t.clientY, startT: Date.now(), mode: 'open' };
      } else {
        gesture.current.mode = 'idle';
      }
    };

    const onMove = (e: TouchEvent) => {
      const g = gesture.current;
      if (g.mode === 'idle' || g.mode === 'locked') return;
      const t = e.touches[0];
      const dx = t.clientX - g.startX;
      const dy = t.clientY - g.startY;

      // On first move, decide if this is a horizontal gesture.
      if (!dragging) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        if (Math.abs(dx) < Math.abs(dy) * ANGLE_LOCK) {
          gesture.current.mode = 'locked';
          return;
        }
        setDragging(true);
      }

      const base = g.mode === 'open' ? -width : 0;
      apply(base + dx);
    };

    const onEnd = (e: TouchEvent) => {
      const g = gesture.current;
      if (g.mode === 'idle' || g.mode === 'locked' || !dragging) {
        setDragging(false);
        gesture.current.mode = 'idle';
        return;
      }
      const t = e.changedTouches[0];
      const dx = t.clientX - g.startX;
      const dt = Math.max(1, Date.now() - g.startT);
      const velocity = dx / dt;

      setDragging(false);
      gesture.current.mode = 'idle';

      if (g.mode === 'open') {
        if (dx > width * OPEN_RATIO || velocity > VELOCITY_MIN) onOpen();
        else onClose();
      } else {
        if (dx < -width * OPEN_RATIO || velocity < -VELOCITY_MIN) onClose();
        else onOpen();
      }
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove',  onMove,  { passive: true });
    document.addEventListener('touchend',   onEnd,   { passive: true });
    document.addEventListener('touchcancel', onEnd,  { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove',  onMove);
      document.removeEventListener('touchend',   onEnd);
      document.removeEventListener('touchcancel', onEnd);
    };
  }, [enabled, open, width, onOpen, onClose, dragging]);

  return { sidebarRef, backdropRef };
}
