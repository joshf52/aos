"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Bookmark, Activity, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Opportunity } from "@/types/database";

const spring = { ease: [0.22, 1, 0.36, 1] as const };

export function OpportunityContent({
  opportunity,
  buildMode,
  activeCommitmentId,
  startEvaluation,
}: {
  opportunity: Opportunity;
  buildMode: "self" | "ai";
  activeCommitmentId: string | null;
  startEvaluation: (formData: FormData) => Promise<void>;
}) {
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 220);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-dvh bg-aos-bg relative">
      {/* Blur header — fades in on scroll */}
      <motion.div
        animate={{ opacity: scrolled ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className="fixed top-0 left-0 right-0 z-20 h-[86px] flex items-end pb-3.5 px-5"
        style={{
          background: "rgba(10, 10, 12, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--aos-border)",
          pointerEvents: scrolled ? "auto" : "none",
        }}
      >
        <p className="text-[15px] font-semibold text-aos-text tracking-[-0.01em] w-full text-center">
          Opportunity
        </p>
      </motion.div>

      {/* Floating back button */}
      <button
        onClick={() => router.back()}
        aria-label="Go back"
        className="fixed top-[56px] left-4 z-30 w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          background: "rgba(28, 28, 34, 0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--aos-border)",
        }}
      >
        <ArrowLeft size={16} color="#F5F2ED" strokeWidth={2} />
      </button>

      {/* Floating bookmark button */}
      <button
        aria-label="Bookmark"
        className="fixed top-[56px] right-4 z-30 w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          background: "rgba(28, 28, 34, 0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--aos-border)",
        }}
      >
        <Bookmark size={15} color="#F5F2ED" strokeWidth={2} />
      </button>

      {/* Scrollable body */}
      <div className="pb-[120px]">
        {/* Hero */}
        <div
          className="relative flex items-end px-6 pb-8 overflow-hidden"
          style={{
            minHeight: 380,
            background: `
              radial-gradient(ellipse 80% 60% at 20% 20%, rgba(212,165,116,0.22) 0%, transparent 55%),
              radial-gradient(ellipse 60% 50% at 80% 80%, rgba(61,184,122,0.14) 0%, transparent 55%),
              radial-gradient(ellipse 50% 40% at 60% 10%, rgba(212,165,116,0.08) 0%, transparent 50%),
              #0A0A0C
            `,
          }}
        >
          {/* Dot grid overlay in hero */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(245,242,237,0.12) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
              maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 40%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 40%, transparent 100%)",
            }}
          />
          {/* Bottom fade */}
          <div
            className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent, #0A0A0C)" }}
          />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ...spring }}
            className="relative z-10 w-full"
          >
            <div className="flex items-center gap-2.5 mb-3.5">
              <div
                className="px-2.5 py-1 rounded-full text-[11px] text-aos-text font-medium tracking-[0.04em] capitalize"
                style={{
                  background: "rgba(245,242,237,0.08)",
                  border: "1px solid var(--aos-border)",
                }}
              >
                {opportunity.capability}
              </div>
              <ConfidenceDots count={opportunity.confidence} />
            </div>
            <h1
              className="font-serif text-aos-text leading-[1.05]"
              style={{ fontSize: "clamp(32px, 8vw, 44px)", letterSpacing: "-0.03em" }}
            >
              {opportunity.title}
            </h1>
          </motion.div>
        </div>

        {/* Presence + Live row */}
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--aos-border)" }}
        >
          <PresenceDots count={opportunity.builder_count} />
          <div className="flex items-center gap-1.5 text-aos-secondary text-xs">
            <Activity size={12} strokeWidth={2} />
            Live
          </div>
        </div>

        {/* Content sections */}
        <div className="px-6">
          <ContentSection label="The Gap" body={opportunity.gap} />
          <ContentSection label="The Signal" body={opportunity.signal} />
          <ContentSection label="The Wedge" body={opportunity.wedge} />
          <ContentSection
            label="Example Customer"
            body={opportunity.example_customer}
            italic
          />
          <ContentSection label="Why Now" body={opportunity.why_now} />
        </div>
      </div>

      {/* Sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 px-6 pb-10 pt-8"
        style={{
          background:
            "linear-gradient(to top, #0A0A0C 0%, #0A0A0C 55%, rgba(10,10,12,0) 100%)",
        }}
      >
        {activeCommitmentId ? (
          <Link
            href={buildMode === "ai" ? `/commit/${activeCommitmentId}/ai-build` : "/dashboard"}
            className="flex items-center justify-center gap-2 w-full py-[17px] rounded-[18px] text-base font-semibold tracking-[-0.01em] transition-opacity hover:opacity-90"
            style={{
              background: "rgba(61, 184, 122, 0.12)",
              border: "1px solid rgba(61, 184, 122, 0.35)",
              color: "#3DB87A",
            }}
          >
            <CheckCircle2 size={17} strokeWidth={2.5} />
            {buildMode === "ai" ? "View your build" : "View your sprint"}
          </Link>
        ) : (
          <form action={startEvaluation}>
            <input type="hidden" name="opportunityId" value={opportunity.id} />
            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 w-full py-[17px] rounded-[18px] text-base font-semibold tracking-[-0.01em] transition-opacity hover:opacity-90"
              style={{ background: "#F5F2ED", color: "#0A0A0C" }}
            >
              {buildMode === "ai" ? "Have AI build this" : "Evaluate this opportunity"}{" "}
              <ArrowRight size={17} strokeWidth={2.5} />
            </motion.button>
          </form>
        )}
      </div>
    </div>
  );
}

function ConfidenceDots({ count }: { count: number }) {
  return (
    <div className="flex gap-[3px] items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="w-[5px] h-[5px] rounded-full"
          style={{
            background: i <= count ? "#D4A574" : "rgba(245,242,237,0.12)",
          }}
        />
      ))}
    </div>
  );
}

function PresenceDots({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-9 h-3 shrink-0">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1, 0.9] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeInOut",
            }}
            className="absolute top-[1px] w-2.5 h-2.5 rounded-full"
            style={{
              left: i * 11,
              background: "#3DB87A",
              border: "2px solid #0A0A0C",
            }}
          />
        ))}
      </div>
      <span className="text-xs text-aos-secondary tabular-nums">
        {count} exploring now
      </span>
    </div>
  );
}

function ContentSection({
  label,
  body,
  italic = false,
}: {
  label: string;
  body: string;
  italic?: boolean;
}) {
  return (
    <div className="py-6" style={{ borderBottom: "1px solid var(--aos-border)" }}>
      <div className="text-[11px] text-aos-tertiary uppercase tracking-[0.14em] font-medium mb-2.5">
        {label}
      </div>
      <p
        className={`text-[15px] text-aos-text leading-[1.6] whitespace-pre-line${
          italic ? " font-serif italic" : ""
        }`}
      >
        {body}
      </p>
    </div>
  );
}
