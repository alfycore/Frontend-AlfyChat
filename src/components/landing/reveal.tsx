'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** delay in ms, e.g. 100, 200 … */
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'none';
}

export function Reveal({ children, className = '', delay = 0, direction = 'up' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const translateMap = { up: 'translateY(28px)', left: 'translateX(-28px)', right: 'translateX(28px)', none: 'none' };
    const translate = translateMap[direction];

    el.style.opacity = '0';
    el.style.transform = translate === 'none' ? '' : translate;
    el.style.transition = `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = '';
          obs.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay, direction]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Staggered container — each direct child gets a reveal with incremental delay */
interface StaggerProps {
  children: ReactNode;
  className?: string;
  baseDelay?: number;
  step?: number;
  direction?: RevealProps['direction'];
}

export function Stagger({ children, className = '', baseDelay = 0, step = 80, direction = 'up' }: StaggerProps) {
  const arr = Array.isArray(children) ? children : [children];
  return (
    <div className={className}>
      {arr.map((child, i) => (
        <Reveal key={i} delay={baseDelay + i * step} direction={direction}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
