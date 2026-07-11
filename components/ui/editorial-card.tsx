import type { CSSProperties, ReactNode } from "react";
import { AOSDepthCard } from "@/components/aos/depth-card";

type Glow = "gold" | "green" | "dual" | "none";
type Intensity = "subtle" | "feature";

/**
 * The editorial "premium card" recipe — now a thin wrapper around
 * AOSDepthCard, kept for existing callers (profile-content, sprint-strip).
 * Same public API: intensity (shadow weight), glow (corner blobs), dotGrid,
 * className, style, children.
 */
export function EditorialCard({
  children,
  className = "",
  intensity = "subtle",
  glow = "gold",
  dotGrid = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  intensity?: Intensity;
  glow?: Glow;
  dotGrid?: boolean;
  style?: CSSProperties;
}) {
  return (
    <AOSDepthCard
      intensity={intensity}
      glow={glow}
      dotGrid={dotGrid}
      className={className}
      style={style}
    >
      {children}
    </AOSDepthCard>
  );
}
