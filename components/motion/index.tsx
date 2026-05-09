"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const SPRING = [0.22, 1, 0.36, 1] as const;

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
