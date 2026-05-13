"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  const v = navigator.vibrate?.bind(navigator);
  if (!v) return;
  try {
    v(pattern);
  } catch {
    /* unsupported — silent */
  }
}

export function HoldButton({
  label,
  holdLabel,
  duration = 2000,
  onComplete,
  className,
}: {
  label: string;
  holdLabel: string;
  duration?: number;
  onComplete: () => void;
  className?: string;
}) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const halfPulsedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    };
  }, []);

  function clearTimer() {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function start() {
    if (completedRef.current) return;
    setHolding(true);
    halfPulsedRef.current = false;
    const startTime = Date.now();
    intervalRef.current = window.setInterval(() => {
      const p = Math.min((Date.now() - startTime) / duration, 1);
      setProgress(p);
      if (p >= 0.5 && !halfPulsedRef.current) {
        halfPulsedRef.current = true;
        vibrate(12);
      }
      if (p >= 1) {
        completedRef.current = true;
        clearTimer();
        vibrate([40, 30, 80]);
        onComplete();
      }
    }, 16);
  }

  function cancel() {
    if (completedRef.current) return;
    clearTimer();
    setHolding(false);
    halfPulsedRef.current = false;
    setProgress(0);
  }

  const showHoldLabel = holding && progress >= 0.4;

  return (
    <motion.button
      type="button"
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      onTouchStart={start}
      onTouchEnd={cancel}
      onPointerCancel={cancel}
      whileTap={{ scale: 0.99 }}
      aria-label={label}
      className={cn(
        "relative inline-flex items-center justify-center min-w-[260px] px-9 py-4 rounded-full",
        "border border-aos-gold/40 text-aos-gold bg-transparent overflow-hidden select-none",
        "font-semibold text-[15px] tracking-[-0.01em]",
        "transition-[border-color,box-shadow,background-color] duration-300",
        "hover:border-aos-gold/70 hover:bg-aos-gold/[0.05]",
        "focus-gold focus-visible:outline-none",
        className,
      )}
      style={{ WebkitUserSelect: "none", userSelect: "none" }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-aos-gold/[0.18]"
        style={{ width: `${progress * 100}%`, transition: "width 0.05s linear" }}
      />
      <span className="relative z-10">{showHoldLabel ? holdLabel : label}</span>
    </motion.button>
  );
}
