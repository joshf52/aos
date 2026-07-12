"use client";

// TUNING KNOBS: `intensity` scales glow opacity + drift amplitude (0..1).
// `variant` swaps the composition ("command" adds grid/rails feel, "editorial"
// is the quiet single gold glow, "minimal" is vignette-only). Loop durations
// (16-24s) live inline on each motion.div below — raise them for a calmer feel.
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const GRAIN_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

type Variant = "command" | "editorial" | "minimal";

/**
 * Layered ambient background — the drifting radial-blob idea from
 * components/aurora.tsx, generalized into a variant system with an optional
 * perspective grid, emerald pipeline rails, and grain texture. Always
 * pointer-events-none / aria-hidden and sits at z-0; page content should be
 * z-[1] or higher.
 */
export function AOSAnimatedBackground({
  variant = "editorial",
  intensity = 1,
  grid = false,
  rails = false,
  grain = true,
  className = "",
}: {
  variant?: Variant;
  intensity?: number;
  grid?: boolean;
  rails?: boolean;
  grain?: boolean;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const still = !!prefersReducedMotion;

  const goldOpacity = 0.17 * intensity;
  const greenOpacity = 0.26 * intensity;
  const isCommand = variant === "command";
  const isMinimal = variant === "minimal";

  return (
    <div
      aria-hidden
      className={cn("absolute inset-0 pointer-events-none overflow-hidden z-0", className)}
    >
      {/* Base vignette — present in every variant, grounds the warm-ink base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(28,28,34,0.5) 0%, transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.4) 0%, transparent 55%)",
        }}
      />

      {!isMinimal && (
        <>
          {/* Emerald drift blob */}
          <motion.div
            animate={still ? undefined : { x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
            transition={{ duration: isCommand ? 24 : 18, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[10%] left-[20%] w-80 h-80"
            style={{
              background: `radial-gradient(circle, rgba(61,184,122,${greenOpacity}) 0%, transparent 60%)`,
              filter: "blur(40px)",
            }}
          />
          {/* Gold drift blob — sacred accent, kept quiet */}
          <motion.div
            animate={still ? undefined : { x: [0, -30, 40, 0], y: [0, 40, -10, 0] }}
            transition={{ duration: isCommand ? 22 : 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[40%] right-0 w-72 h-72"
            style={{
              background: `radial-gradient(circle, rgba(212,165,116,${goldOpacity}) 0%, transparent 60%)`,
              filter: "blur(40px)",
            }}
          />
          {isCommand && (
            <motion.div
              animate={still ? undefined : { x: [0, 20, -30, 0], y: [0, -20, 10, 0] }}
              transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-[5%] left-[45%] w-96 h-96"
              style={{
                background: `radial-gradient(circle, rgba(61,184,122,${greenOpacity * 0.6}) 0%, transparent 65%)`,
                filter: "blur(50px)",
              }}
            />
          )}
        </>
      )}

      {isCommand && grid && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(245,242,237,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(245,242,237,0.05) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at 50% 20%, black 0%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 20%, black 0%, transparent 70%)",
            opacity: 0.85 * intensity,
          }}
        />
      )}

      {isCommand && rails && (
        <div className="absolute inset-0 flex justify-between px-[8%]">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="relative w-px h-full overflow-hidden"
              style={{ background: "var(--aos-rail, rgba(61,184,122,0.22))" }}
            >
              <motion.div
                className="absolute inset-x-0 h-1/3"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 0%, rgba(61,184,122,0.7) 50%, transparent 100%)",
                  boxShadow: "0 0 16px rgba(61,184,122,0.5)",
                }}
                animate={still ? undefined : { y: ["-40%", "140%"] }}
                transition={{
                  duration: 3 + i * 0.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.6,
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Slow breathing vignette — a faint pulse of warmth to keep the
          composition alive even when the drifting blobs are between beats. */}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(212,165,116,0.05) 0%, transparent 65%)",
        }}
        animate={still ? undefined : { opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {grain && (
        <div
          className="absolute inset-0"
          style={{ backgroundImage: GRAIN_DATA_URI, opacity: 0.028 }}
        />
      )}
    </div>
  );
}
