"use client";

// The gate between the 3D pipeline hero and its CSS fallback
// (launch-pipeline-hero.tsx). `useHeroCapability` decides which one a given
// device can afford; the 3D branch is only ever referenced in JSX when it's
// true, so `next/dynamic`'s chunk is never fetched on a fallback render.
// Shares HeroCopy (and its spacing rhythm) with the fallback so the two never
// drift visually.
import { useRef } from "react";
import dynamic from "next/dynamic";
import { useInView } from "framer-motion";
import { HeroCopy } from "@/components/aos/hero-scene/hero-copy";
import { LaunchPipelineHero } from "@/components/aos/launch-pipeline-hero";
import { useHeroCapability } from "@/components/aos/hero-scene/use-hero-capability";
import { cn } from "@/lib/utils";

// ssr:false + loading:null — no server render, no flash of a loading state;
// the fallback above already covers "before we know / can't do 3D".
const PipelineCanvas = dynamic(() => import("./pipeline-canvas"), {
  ssr: false,
  loading: () => null,
});

export function HeroStage({
  ctaHref = "/auth/signup",
  className = "",
}: {
  ctaHref?: string;
  className?: string;
}) {
  const can3D = useHeroCapability();

  if (!can3D) {
    return <LaunchPipelineHero ctaHref={ctaHref} className={className} />;
  }

  return <Hero3DSection ctaHref={ctaHref} className={className} />;
}

// Must be its own component, mounted only once can3D is true: useInView's
// effect bails permanently if the ref is null when it first runs, and can3D
// always starts false (SSR-safe), so observing from HeroStage itself would
// leave the frameloop gated shut forever — a hero that renders black.
function Hero3DSection({
  ctaHref,
  className,
}: {
  ctaHref: string;
  className: string;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  // Pause the frameloop the instant the hero scrolls out of view in either
  // direction, not just once on mount.
  const inView = useInView(sectionRef, { margin: "-10% 0px -10% 0px" });

  return (
    <section
      ref={sectionRef}
      className={cn(
        "relative overflow-hidden flex items-center justify-center",
        "min-h-[86vh] md:min-h-[760px] bg-aos-bg",
        className
      )}
    >
      <div className="absolute inset-0" aria-hidden>
        <PipelineCanvas active={inView} className="h-full w-full" />
      </div>

      <div className="relative z-[1] w-full max-w-5xl mx-auto px-6 py-20 md:py-28">
        <HeroCopy ctaHref={ctaHref} />
      </div>
    </section>
  );
}
