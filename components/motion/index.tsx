"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

export const SPRING = [0.22, 1, 0.36, 1] as const;
export const POP = [0.22, 1.5, 0.36, 1] as const;

/** Thin re-export of framer-motion's useReducedMotion for consistent import
 *  paths across components/aos/* — treat `null` (not yet resolved) as false. */
export function useReducedMotionSafe(): boolean {
  return !!useReducedMotion();
}

const fadeVariants = (y: number): Variants => ({
  hidden: { opacity: 0, y },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: SPRING },
  },
});

const containerVariants = (
  delayChildren: number,
  staggerChildren: number
): Variants => ({
  hidden: {},
  visible: { transition: { delayChildren, staggerChildren } },
});

export function FadeIn({
  children,
  className,
  delay,
  y = 12,
  duration = 0.7,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
}) {
  const variants: Variants =
    delay === undefined && duration === 0.7
      ? fadeVariants(y)
      : {
          hidden: { opacity: 0, y },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration, delay, ease: SPRING },
          },
        };

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={variants}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({
  children,
  className,
  delayChildren = 0.05,
  staggerChildren = 0.08,
}: {
  children: ReactNode;
  className?: string;
  delayChildren?: number;
  staggerChildren?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={containerVariants(delayChildren, staggerChildren)}
    >
      {children}
    </motion.div>
  );
}

const AXIS: Record<"up" | "down" | "left" | "right", { x?: number; y?: number }> = {
  up: { y: 1 },
  down: { y: -1 },
  left: { x: 1 },
  right: { x: -1 },
};

/**
 * Directional entrance — opacity + translate from one edge, spring-eased.
 * Freezes to a plain fade under reduced motion (no directional slide).
 */
export function SpringSlide({
  children,
  className,
  from = "up",
  delay = 0,
  distance = 16,
}: {
  children: ReactNode;
  className?: string;
  from?: "up" | "down" | "left" | "right";
  delay?: number;
  distance?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const axis = AXIS[from];
  const hidden = prefersReducedMotion
    ? { opacity: 0 }
    : {
        opacity: 0,
        x: axis.x ? axis.x * distance : 0,
        y: axis.y ? axis.y * distance : 0,
      };

  return (
    <motion.div
      className={className}
      initial={hidden}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0.2 : 0.6, delay, ease: SPRING }}
    >
      {children}
    </motion.div>
  );
}
