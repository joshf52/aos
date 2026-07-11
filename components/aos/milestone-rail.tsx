"use client";

// TUNING KNOBS: `intensity` scales the active pulse + rail-fill glow opacity;
// NODE_SIZE controls dot diameter; orientation="responsive" breaks to vertical
// below the `md:` breakpoint — adjust those classes for a different cutoff.
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPRING, POP } from "@/components/motion";

type Step = { label: string; sublabel?: string; status: "done" | "active" | "upcoming" };

const NODE_SIZE = 14; // px

/**
 * Animated progress rail for a staged build path (e.g. the 30-day sprint).
 * Done nodes fill gold with a checkmark and a one-shot "shipped" pop on
 * mount; the active node pulses emerald slowly; upcoming nodes stay quiet
 * hairline circles. The rail fill over a completed segment is an
 * emerald -> gold gradient — the energy color resolving into the sacred one.
 * Horizontal on desktop, vertical on mobile by default; pin either way via
 * `orientation`. Progress is conveyed to assistive tech via an ordered list
 * with `aria-current="step"` on the active node.
 */
export function MilestoneRail({
  steps,
  orientation = "responsive",
  intensity = 1,
  className = "",
}: {
  steps: Step[];
  orientation?: "horizontal" | "vertical" | "responsive";
  intensity?: number;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  const isVertical = orientation === "vertical";
  const isResponsive = orientation === "responsive";

  return (
    <ol
      className={cn(
        "relative flex list-none m-0 p-0",
        isVertical && "flex-col",
        isResponsive && "flex-col md:flex-row",
        !isVertical && !isResponsive && "flex-row",
        className
      )}
      aria-label="Build path progress"
    >
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        // The segment leading out of a "done" node is filled; a segment
        // leading out of the active node is half-lit (energy in transit).
        const segmentState =
          step.status === "done" ? "done" : step.status === "active" ? "active" : "upcoming";

        return (
          <li
            key={step.label}
            aria-current={step.status === "active" ? "step" : undefined}
            aria-label={`${step.label}${step.sublabel ? `, ${step.sublabel}` : ""} — ${
              step.status === "done" ? "shipped" : step.status === "active" ? "in progress" : "upcoming"
            }`}
            className={cn(
              "relative flex flex-1",
              isVertical && "flex-row items-start gap-4",
              isResponsive && "flex-row md:flex-col items-start md:items-center gap-4 md:gap-2",
              !isVertical && !isResponsive && "flex-col items-center gap-2"
            )}
          >
            {/* Connector to next node */}
            {!isLast && (
              <div
                aria-hidden
                className={cn(
                  "absolute bg-aos-border overflow-hidden",
                  isVertical && "left-[6px] top-4 bottom-[-1.5rem] w-px",
                  isResponsive &&
                    "left-[6px] top-4 bottom-[-1.5rem] w-px md:left-auto md:top-[6px] md:right-0 md:bottom-auto md:h-px md:w-full md:translate-x-1/2",
                  !isVertical && !isResponsive && "left-auto top-[6px] right-0 h-px w-full translate-x-1/2"
                )}
              >
                {segmentState !== "upcoming" && (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: isVertical
                        ? `linear-gradient(180deg, rgba(61,184,122,${0.55 * intensity}) 0%, rgba(212,165,116,${
                            segmentState === "done" ? 0.65 * intensity : 0.15 * intensity
                          }) 100%)`
                        : `linear-gradient(90deg, rgba(61,184,122,${0.55 * intensity}) 0%, rgba(212,165,116,${
                            segmentState === "done" ? 0.65 * intensity : 0.15 * intensity
                          }) 100%)`,
                      opacity: segmentState === "active" ? 0.7 : 1,
                    }}
                  />
                )}
              </div>
            )}

            {/* Node */}
            <div
              className="relative shrink-0 rounded-full flex items-center justify-center"
              style={{ width: NODE_SIZE, height: NODE_SIZE }}
            >
              {step.status === "done" && (
                <>
                  <div
                    className="absolute inset-0 rounded-full flex items-center justify-center"
                    style={{ background: "#D4A574" }}
                  >
                    <Check
                      aria-hidden
                      strokeWidth={3}
                      className="text-aos-bg"
                      style={{ width: NODE_SIZE * 0.65, height: NODE_SIZE * 0.65 }}
                    />
                  </div>
                  {!prefersReducedMotion && (
                    <motion.div
                      key={`${step.label}-pop`}
                      initial={{ opacity: 0.9, scale: 1 }}
                      animate={{ opacity: 0, scale: 2.2 }}
                      transition={{ duration: 0.9, ease: POP }}
                      className="absolute inset-0 rounded-full"
                      style={{ background: "rgba(212,165,116,0.5)" }}
                    />
                  )}
                </>
              )}
              {step.status === "active" && (
                <>
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{ background: "#3DB87A" }}
                  />
                  <motion.div
                    className="absolute -inset-1.5 rounded-full"
                    style={{ background: `rgba(61,184,122,${0.35 * intensity})` }}
                    animate={
                      prefersReducedMotion
                        ? undefined
                        : { scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }
                    }
                    transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                  />
                </>
              )}
              {step.status === "upcoming" && (
                <div
                  className="absolute inset-0 rounded-full border border-aos-border-strong"
                  style={{ background: "rgba(28,28,34,0.8)" }}
                />
              )}
            </div>

            {/* Label — mono eyebrow (sublabel) above a serif/sans thesis label */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: SPRING }}
              className="min-w-0 md:text-center"
            >
              {step.sublabel && (
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-aos-tertiary">
                  {step.sublabel}
                </div>
              )}
              <div
                className={cn(
                  "font-serif truncate mt-0.5",
                  step.status === "active" ? "text-base" : "text-sm",
                  step.status === "upcoming" ? "text-aos-tertiary" : "text-aos-text"
                )}
              >
                {step.label}
              </div>
            </motion.div>
          </li>
        );
      })}
    </ol>
  );
}
