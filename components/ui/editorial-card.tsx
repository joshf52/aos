import type { CSSProperties, ReactNode } from "react";

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

/**
 * The editorial "premium card" recipe — gradient bg, hairline inner highlight,
 * ambient glow blobs, optional dot grid. Wraps any content in the brand's
 * dark-warm-ink card language. Tune via `intensity` (shadow weight) and
 * `glow` (which corner blobs to render).
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
  const showGold = glow === "gold" || glow === "dual";
  const showGreen = glow === "green" || glow === "dual";

  return (
    <div
      className={`relative overflow-hidden rounded-[26px] ${className}`}
      style={{
        background: GRADIENT[intensity],
        border: "1px solid rgba(245,242,237,0.08)",
        boxShadow: SHADOW[intensity],
        ...style,
      }}
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
    </div>
  );
}
