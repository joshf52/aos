"use client";

// TUNING KNOBS: DURATION_MS controls how long the full moment plays before
// onDone fires; PARTICLE_COUNT controls gold-dust density (kept low — this
// is a quiet celebration, never confetti).
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { POP } from "@/components/motion";

const DURATION_MS = 1400;
const PARTICLE_COUNT = 14;

// Gold dust drifts upward like light catching motes in the air, not a
// radial burst — dx spreads gently sideways, dy is always negative (up).
const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  dx: ((i % 7) - 3) * 12 + (i % 2) * 6,
  dy: -(50 + (i % 5) * 20),
  size: 3 + (i % 3),
  delay: (i % 5) * 0.05,
}));

/**
 * Subtle, on-brand celebration for a shipped milestone — a single expanding
 * gold ring plus a light gold-dust shimmer. No confetti, no balloons.
 * Under reduced motion: one static gold flash, no particles.
 */
export function ShipMoment({
  show,
  message,
  onDone,
}: {
  show: boolean;
  message?: string;
  onDone?: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => onDone?.(), prefersReducedMotion ? 700 : DURATION_MS);
    return () => clearTimeout(t);
  }, [show, onDone, prefersReducedMotion]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          {...(message
            ? { role: "status", "aria-live": "polite" as const }
            : { "aria-hidden": true })}
          className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {prefersReducedMotion ? (
            <motion.div
              className="absolute inset-0"
              style={{ background: "radial-gradient(circle, rgba(212,165,116,0.22) 0%, transparent 60%)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          ) : (
            <>
              {/* Expanding gold ring */}
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: 40,
                  height: 40,
                  border: "1px solid rgba(212,165,116,0.8)",
                }}
                initial={{ scale: 0.5, opacity: 0.9 }}
                animate={{ scale: 14, opacity: 0 }}
                transition={{ duration: 1.1, ease: POP }}
              />
              {/* Gold-dust shimmer — drifts up, fades out */}
              {particles.map((p, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{ width: p.size, height: p.size, background: "#D4A574" }}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0.6 }}
                  animate={{
                    x: p.dx,
                    y: p.dy,
                    opacity: [0, 1, 0],
                    scale: [0.6, 1, 0.4],
                  }}
                  transition={{ duration: 1.1, delay: p.delay, ease: "easeOut" }}
                />
              ))}
            </>
          )}

          {message && (
            <motion.p
              className="relative font-serif italic text-2xl text-aos-gold"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: prefersReducedMotion ? 0.1 : 0.3, ease: POP }}
            >
              {message}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
