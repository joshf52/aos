"use client";

// TUNING KNOBS: `glow` (which corner blobs render), `intensity` (shadow weight),
// `interactive` (hover lift + pointer-tilt + specular sheen), `dotGrid` (dot
// texture density is fixed at 24px — adjust MAX_TILT / LIFT_Y / SHEEN_SIZE
// below to change the interactive feel).
import { useReducedMotion, motion } from "framer-motion";
import Link from "next/link";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Glow = "gold" | "green" | "dual" | "none";
type Intensity = "subtle" | "feature";

const GRADIENT: Record<Intensity, string> = {
  feature: "linear-gradient(160deg, #1E1E26 0%, #15151A 60%, #12121A 100%)",
  subtle: "linear-gradient(160deg, #1A1A22 0%, #15151A 55%, #12121A 100%)",
};

const SHADOW: Record<Intensity, string> = {
  feature: "0 0 0 1px rgba(212,165,116,0.04), 0 24px 48px rgba(0,0,0,0.4)",
  subtle: "0 0 0 1px rgba(245,242,237,0.02), 0 14px 32px rgba(0,0,0,0.3)",
};

const SHADOW_HOVER: Record<Intensity, string> = {
  feature:
    "0 0 0 1px rgba(212,165,116,0.16), 0 40px 80px rgba(0,0,0,0.55), 0 0 60px rgba(212,165,116,0.16)",
  subtle:
    "0 0 0 1px rgba(245,242,237,0.07), 0 26px 56px rgba(0,0,0,0.5), 0 0 36px rgba(212,165,116,0.12)",
};

const MAX_TILT = 7; // degrees
const LIFT_Y = -6; // px
const SPRING = [0.22, 1, 0.36, 1] as const;
const SHEEN_SIZE = 280; // px — diameter of the pointer-tracked specular highlight

/**
 * The editorial "premium card" recipe — gradient bg, hairline inner highlight,
 * ambient glow blobs, optional dot grid — plus an interactive mode with a
 * pointer-driven perspective tilt and hover lift. Superset of the original
 * EditorialCard; EditorialCard now wraps this directly.
 */
export function AOSDepthCard({
  children,
  as = "div",
  href,
  interactive = false,
  glow = "gold",
  intensity = "subtle",
  dotGrid = false,
  className = "",
  style,
}: {
  children: ReactNode;
  as?: "div" | "article" | "section";
  href?: string;
  interactive?: boolean;
  glow?: Glow;
  intensity?: Intensity;
  dotGrid?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const prefersReducedMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [sheen, setSheen] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const showGold = glow === "gold" || glow === "dual";
  const showGreen = glow === "green" || glow === "dual";
  const canTilt = interactive && !prefersReducedMotion;

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!canTilt || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: -py * MAX_TILT * 2, ry: px * MAX_TILT * 2 });
    setSheen({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handlePointerLeave = () => {
    setHovered(false);
    setTilt({ rx: 0, ry: 0 });
  };

  // framer-motion exposes motion.div/article/section as intrinsic proxies —
  // pick the right one so `as` renders the correct semantic tag.
  const MotionComp = as === "article" ? motion.article : as === "section" ? motion.section : motion.div;

  const content = (
    <MotionComp
      ref={ref as React.Ref<never>}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={handlePointerLeave}
      animate={
        interactive && !prefersReducedMotion
          ? {
              y: hovered ? LIFT_Y : 0,
              rotateX: tilt.rx,
              rotateY: tilt.ry,
              boxShadow: hovered ? SHADOW_HOVER[intensity] : SHADOW[intensity],
            }
          : undefined
      }
      transition={{ duration: 0.28, ease: SPRING }}
      style={{
        background: GRADIENT[intensity],
        border: "1px solid rgba(245,242,237,0.08)",
        boxShadow: interactive ? undefined : SHADOW[intensity],
        transformStyle: interactive ? "preserve-3d" : undefined,
        willChange: interactive ? "transform" : undefined,
        perspective: interactive ? 800 : undefined,
        ...style,
      }}
      className={cn("relative overflow-hidden rounded-[26px]", className)}
    >
      {/* Hairline highlight along the top edge — the detail that separates
          a flat card from a "lit from above" one. */}
      <div
        aria-hidden
        className="absolute inset-x-6 top-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(245,242,237,0.14) 50%, transparent 100%)",
        }}
      />
      {showGold && (
        <div
          aria-hidden
          className="absolute -top-10 -right-10 w-64 h-64 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(212,165,116,0.14) 0%, transparent 65%)",
            filter: "blur(20px)",
          }}
        />
      )}
      {showGreen && (
        <div
          aria-hidden
          className="absolute -bottom-8 -left-8 w-48 h-48 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(61,184,122,0.10) 0%, transparent 65%)",
            filter: "blur(20px)",
          }}
        />
      )}
      {canTilt && (
        <motion.div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            width: SHEEN_SIZE,
            height: SHEEN_SIZE,
            left: 0,
            top: 0,
            background:
              "radial-gradient(circle, rgba(245,242,237,0.14) 0%, transparent 70%)",
            transform: `translate(${sheen.x - SHEEN_SIZE / 2}px, ${sheen.y - SHEEN_SIZE / 2}px)`,
          }}
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.28, ease: SPRING }}
        />
      )}
      {dotGrid && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(245,242,237,0.08) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage:
              "radial-gradient(ellipse at 70% 30%, black 10%, transparent 65%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at 70% 30%, black 10%, transparent 65%)",
          }}
        />
      )}
      <div className="relative">{children}</div>
    </MotionComp>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
