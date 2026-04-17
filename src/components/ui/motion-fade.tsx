'use client';

import { motion, type HTMLMotionProps } from 'motion/react';
import { forwardRef } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

interface MotionFadeProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'exit' | 'transition'> {
  delay?: number;
  duration?: number;
  direction?: Direction;
  distance?: number;
}

const offsetFor = (d: Direction, px: number) => {
  switch (d) {
    case 'up':    return { y: px };
    case 'down':  return { y: -px };
    case 'left':  return { x: px };
    case 'right': return { x: -px };
    default:      return {};
  }
};

export const MotionFade = forwardRef<HTMLDivElement, MotionFadeProps>(function MotionFade(
  { delay = 0, duration = 0.4, direction = 'up', distance = 12, children, ...rest },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...offsetFor(direction, distance) }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
});

interface StaggerProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'variants' | 'transition'> {
  delay?: number;
  stagger?: number;
}

export const MotionStagger = forwardRef<HTMLDivElement, StaggerProps>(function MotionStagger(
  { delay = 0, stagger = 0.06, children, ...rest },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
});

interface StaggerItemProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  direction?: Direction;
  distance?: number;
}

export const MotionStaggerItem = forwardRef<HTMLDivElement, StaggerItemProps>(function MotionStaggerItem(
  { direction = 'up', distance = 10, children, ...rest },
  ref,
) {
  return (
    <motion.div
      ref={ref}
      variants={{
        hidden: { opacity: 0, ...offsetFor(direction, distance) },
        show:   { opacity: 1, x: 0, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
});
