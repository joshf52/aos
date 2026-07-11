"use client";

// TUNING KNOBS: `intensity` scales line/glow opacity + parallax amplitude;
// PARALLAX_STRENGTH below controls how far nodes drift on pointer move;
// input/module counts drive layout so keep lists reasonably short (4-8 items
// reads best at both mobile and desktop widths).
import { motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SPRING } from "@/components/motion";
import { AOSDepthCard } from "@/components/aos/depth-card";

const DEFAULT_INPUTS = ["Customer", "Today", "Wedge", "Smallest test", "30-day win"];
const DEFAULT_MODULES = [
  "Landing page",
  "Dashboard",
  "Auth",
  "CRUD",
  "Pricing",
  "README",
  "Deploy guide",
  "Launch checklist",
];

const PARALLAX_STRENGTH = 14; // px, max drift per axis

/**
 * Dimensional constellation: loose input nodes (the Lens answers) converge
 * via emerald energy lines into a structured grid of MVP modules. Nodes
 * float with subtle pointer-parallax; frozen under reduced motion.
 */
export function BuildPathConstellation({
  inputs = DEFAULT_INPUTS,
  modules = DEFAULT_MODULES,
  intensity = 1,
  className = "",
}: {
  inputs?: string[];
  modules?: string[];
  intensity?: number;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Skip touch — parallax is a pointer/hover flourish only.
    if (prefersReducedMotion || e.pointerType === "touch" || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setParallax({ x: px * PARALLAX_STRENGTH, y: py * PARALLAX_STRENGTH });
  };

  const handlePointerLeave = () => setParallax({ x: 0, y: 0 });

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn("relative grid md:grid-cols-[1fr_auto_1.4fr] gap-8 md:gap-4 items-center", className)}
    >
      {/* Inputs — loose, hand-written feel */}
      <div className="flex md:flex-col flex-wrap gap-3 justify-center md:justify-start">
        {inputs.map((label, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.06, ease: SPRING }}
            animate={
              prefersReducedMotion
                ? undefined
                : { x: parallax.x * (0.4 + i * 0.05), y: parallax.y * (0.4 + i * 0.05) }
            }
            style={{ willChange: "transform" }}
            className="px-4 py-2.5 rounded-full border border-aos-border bg-aos-surface/80 backdrop-blur-sm"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-aos-secondary">
              {label}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Convergence lines */}
      <div className="hidden md:flex flex-col items-center justify-center gap-1.5 px-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-10 h-px"
            style={{
              background: `linear-gradient(90deg, rgba(61,184,122,${0.15 * intensity}) 0%, rgba(61,184,122,${0.55 * intensity}) 100%)`,
            }}
            animate={
              prefersReducedMotion
                ? undefined
                : { opacity: [0.4, 1, 0.4] }
            }
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
          />
        ))}
      </div>

      {/* Modules — structured grid, the "system" — small AOSDepthCards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {modules.map((label, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 + i * 0.05, ease: SPRING }}
            animate={
              prefersReducedMotion
                ? undefined
                : { x: parallax.x * -0.15, y: parallax.y * -0.15 }
            }
            style={{ willChange: "transform" }}
          >
            <AOSDepthCard glow="green" intensity="subtle" className="px-3 py-3 text-center rounded-xl">
              <span className="relative font-sans text-xs text-aos-text">{label}</span>
            </AOSDepthCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
