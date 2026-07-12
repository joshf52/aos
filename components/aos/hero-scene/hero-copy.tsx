"use client";

// Shared hero copy — the ONE place the eyebrow / H1 / CTA wording lives, so the
// CSS pipeline hero (launch-pipeline-hero.tsx) and the 3D hero (hero-stage.tsx)
// never drift. Wording is locked; edit it here only, never inline in a shell.
// Exposed as three pieces so a shell can place the CTA where its layout needs
// it (the CSS hero puts it BELOW the pipeline; the 3D hero keeps the full
// HeroCopy centered over the scene).
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { SPRING, POP } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Eyebrow + serif thesis H1. */
export function HeroHeading({ className = "" }: { className?: string }) {
  return (
    <div className={cn("text-center", className)}>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: SPRING }}
        className="font-mono text-[11px] uppercase tracking-[0.32em] text-aos-tertiary text-center mb-6"
      >
        From idea to shipped
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.08, ease: SPRING }}
        className="font-serif italic text-center text-koan text-aos-text text-balance"
      >
        Build with{" "}
        <span className="text-gold-gradient">conviction</span>.
      </motion.h1>
    </div>
  );
}

/** The single hero CTA. `delay` lets a shell tune the entrance timing. */
export function HeroCta({
  ctaHref = "/auth/signup",
  className = "",
  delay = 0.6,
}: {
  ctaHref?: string;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: POP }}
      className={cn("flex justify-center", className)}
    >
      <Button variant="primary" size="lg" href={ctaHref}>
        Begin your sprint
        <ArrowRight size={16} strokeWidth={2.5} />
      </Button>
    </motion.div>
  );
}

/** Eyebrow + H1 + CTA as one centered block — used by the 3D hero overlay. */
export function HeroCopy({
  ctaHref = "/auth/signup",
  className = "",
  align = "center",
}: {
  ctaHref?: string;
  className?: string;
  align?: "center";
}) {
  return (
    <div className={cn(align === "center" && "text-center", className)}>
      <HeroHeading className="mb-14" />
      <HeroCta ctaHref={ctaHref} />
    </div>
  );
}
