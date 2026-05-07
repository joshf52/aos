"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/**
 * Mounts at 0 and springs to `value` once. Used on stat blocks where seeing
 * the number land feels more alive than rendering it cold. Stays a bare
 * number — caller controls font, color, and tabular-nums alignment.
 */
export function NumberTicker({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 90, damping: 22, mass: 0.8 });
  const rounded = useTransform(spring, (v) => Math.round(v).toString());
  const [text, setText] = useState("0");

  useEffect(() => {
    mv.set(value);
    const unsub = rounded.on("change", (v) => setText(v));
    return unsub;
  }, [value, mv, rounded]);

  // Render a span so the parent's font + size flows in unchanged.
  return <motion.span>{text}</motion.span>;
}
