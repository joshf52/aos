"use client";

// TUNING KNOBS: PIPELINE (label copy + count), RAIL_DURATION / RAIL_STAGGER
// (energy pulse speed + left->right propagation feel), FLOAT_Y (node bob
// amplitude, disabled under reduced motion), and node size (w-[150px] on
// desktop via the className on each AOSDepthCard). Eyebrow/H1/CTA copy lives
// in components/aos/hero-scene/hero-copy.tsx — edit it there, not here.
import { Fragment } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AOSAnimatedBackground } from "@/components/aos/animated-background";
import { AOSDepthCard } from "@/components/aos/depth-card";
import { HeroHeading, HeroCta } from "@/components/aos/hero-scene/hero-copy";
import { POP } from "@/components/motion";
import { cn } from "@/lib/utils";

const PIPELINE = ["Idea", "Lens", "Build Path", "MVP", "Launch"];

const RAIL_DURATION = 2.4; // s — base loop length for the traveling energy pulse
const RAIL_STAGGER = 0.22; // s — delay between successive rail segments (propagation feel)
const FLOAT_Y = 10; // px — continuous bob amplitude once nodes have entered

const container = {
  hidden: {},
  visible: { transition: { delayChildren: 0.1, staggerChildren: 0.16 } },
};

const nodeVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.94 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.65, ease: POP } },
};

/**
 * One segment of the connecting rail between two pipeline nodes. Thin along
 * the cross-axis, full-length along the flow axis, so the same dual-axis
 * translate reads correctly whether the layout is vertical (mobile, stacked)
 * or horizontal (desktop) — only the visible axis actually moves.
 */
function RailSegment({ index, reduced }: { index: number; reduced: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden shrink-0 self-center",
        "w-px h-8", // vertical, mobile default
        "md:w-auto md:h-px md:flex-1 md:min-w-[24px] md:self-auto"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-transparent via-aos-accent/35 to-transparent" />
      <motion.div
        className="absolute bg-aos-accent inset-x-0 h-1/2 w-full md:inset-y-0 md:h-full md:w-1/3 blur-[1.5px]"
        style={{ boxShadow: "0 0 18px rgba(61,184,122,0.85), 0 0 4px rgba(61,184,122,0.9)" }}
        animate={
          reduced
            ? { opacity: 0.35 }
            : { y: ["-60%", "160%"], x: ["-60%", "160%"], opacity: [0, 1, 0] }
        }
        transition={
          reduced
            ? undefined
            : {
                duration: RAIL_DURATION + index * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * RAIL_STAGGER,
              }
        }
      />
    </div>
  );
}

/**
 * Landing hero — the AOS transformation as a glowing five-stage pipeline
 * (Idea -> Lens -> Build Path -> MVP -> Launch). An emerald energy pulse
 * travels the connecting rail left to right; floating stage nodes sit above
 * it, ending in a serif thesis and a single confident CTA. Stacks vertically
 * on mobile with a matching vertical rail.
 */
export function LaunchPipelineHero({
  ctaHref = "/auth/signup",
  className = "",
}: {
  ctaHref?: string;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const reduced = !!prefersReducedMotion;

  return (
    <section className={cn("relative overflow-hidden", className)}>
      <AOSAnimatedBackground variant="command" grid rails intensity={1.0} />

      <div className="relative z-[1] px-6 py-20 md:py-28 max-w-5xl mx-auto">
        <HeroHeading className="mb-16" />

        {/* The pipeline — an emerald rail with floating stage nodes */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          role="list"
          aria-label="The AOS build pipeline"
          className="relative flex flex-col md:flex-row items-center md:items-stretch gap-0"
        >
          {PIPELINE.map((stage, i) => (
            <Fragment key={stage}>
              {i > 0 && <RailSegment index={i - 1} reduced={reduced} />}
              {/* Outer: entrance only (driven by parent's stagger via variants).
                  Inner: continuous float only (independent `animate`). Kept on
                  separate elements so the two `y` animations compose instead
                  of one clobbering the other. */}
              <motion.div
                variants={nodeVariants}
                role="listitem"
                className="relative flex justify-center w-full md:w-auto shrink-0"
              >
                <motion.div
                  animate={
                    reduced
                      ? undefined
                      : { y: [0, i % 2 === 0 ? -FLOAT_Y : -FLOAT_Y * 0.6, 0] }
                  }
                  transition={
                    reduced
                      ? undefined
                      : {
                          duration: 5 + i * 0.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.6 + i * 0.2,
                        }
                  }
                  className="w-full md:w-auto"
                >
                  <AOSDepthCard
                    intensity="subtle"
                    glow={i === PIPELINE.length - 1 ? "gold" : "green"}
                    className="w-full md:w-[150px] text-center"
                    style={
                      i === PIPELINE.length - 1
                        ? undefined
                        : {
                            border: "1px solid rgba(61,184,122,0.35)",
                            boxShadow:
                              "0 0 0 1px rgba(61,184,122,0.14), 0 14px 34px rgba(0,0,0,0.35), 0 0 34px rgba(61,184,122,0.28)",
                          }
                    }
                  >
                    <div className="px-4 py-5">
                      <div className="font-mono text-[10px] text-aos-tertiary tracking-[0.18em] mb-1">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <div className="font-serif text-lg text-aos-text">{stage}</div>
                    </div>
                  </AOSDepthCard>
                </motion.div>
              </motion.div>
            </Fragment>
          ))}
        </motion.div>

        <HeroCta ctaHref={ctaHref} className="mt-16" />
      </div>
    </section>
  );
}
