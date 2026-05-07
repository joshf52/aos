"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Activity, CheckCircle2, ExternalLink, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Opportunity } from "@/types/database";
import { AdjacentOpportunities } from "@/components/ui/adjacent-opportunities";
import { EditorialCard } from "@/components/ui/editorial-card";
import { DomainTag } from "@/components/ui/domain-tag";
import { ConfidenceDots } from "@/components/ui/confidence-dots";

const spring = { ease: [0.22, 1, 0.36, 1] as const };

export function OpportunityContent({
  opportunity,
  adjacent,
  explorerCount,
  wedges,
  buildMode,
  activeCommitmentId,
  atCap,
  startEvaluation,
}: {
  opportunity: Opportunity;
  adjacent: Opportunity[];
  explorerCount: number;
  wedges: string[];
  buildMode: "self" | "ai";
  activeCommitmentId: string | null;
  atCap: boolean;
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
            <div className="flex items-center flex-wrap gap-2 mb-3.5">
              <div
                className="px-2.5 py-1 rounded-full text-[11px] text-aos-text font-medium tracking-[0.04em] capitalize"
                style={{
                  background: "rgba(245,242,237,0.08)",
                  border: "1px solid var(--aos-border)",
                }}
              >
                {opportunity.capability}
              </div>
              {(opportunity.domains ?? []).slice(0, 3).map((d) => (
                <DomainTag key={d} domain={d} size="sm" variant="outline" />
              ))}
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

        {/* Market context — only renders when curated data exists */}
        {(opportunity.market_hint || (opportunity.source_links?.length ?? 0) > 0) && (
          <MarketContext
            hint={opportunity.market_hint}
            links={opportunity.source_links ?? []}
          />
        )}

        {/* Who's exploring — anonymized wedge summaries from past Lens runs */}
        {explorerCount > 0 && (
          <WhosExploring count={explorerCount} wedges={wedges} />
        )}

        {/* Adjacent opportunities — graceful exit if this one isn't right */}
        <AdjacentOpportunities opportunities={adjacent} />
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
        ) : atCap ? (
          <Link
            href="/upgrade"
            className="flex flex-col items-center gap-1 w-full py-[15px] rounded-[18px] text-base font-semibold tracking-[-0.01em] transition-opacity hover:opacity-90"
            style={{
              background: "rgba(212, 165, 116, 0.12)",
              border: "1px solid rgba(212, 165, 116, 0.35)",
              color: "#D4A574",
            }}
          >
            <span className="flex items-center gap-2">
              Upgrade to Pro <ArrowRight size={16} strokeWidth={2.5} />
            </span>
            <span
              className="text-[11px] font-normal tracking-normal"
              style={{ color: "rgba(212, 165, 116, 0.7)" }}
            >
              You&rsquo;re at your sprint cap. Pro adds two more.
            </span>
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

function MarketContext({
  hint,
  links,
}: {
  hint: string | null;
  links: { label: string; url: string }[];
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ...spring }}
      className="px-6 pt-6"
    >
      <EditorialCard intensity="subtle" glow="gold">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={12} className="text-aos-tertiary" strokeWidth={2} />
            <span className="text-[10px] uppercase tracking-[0.16em] font-medium text-aos-tertiary">
              Market context
            </span>
          </div>
          {hint && (
            <p className="font-serif text-aos-text text-[18px] leading-[1.4] tracking-[-0.01em]">
              {hint}
            </p>
          )}
          {links.length > 0 && (
            <div className={`flex flex-wrap gap-1.5 ${hint ? "mt-4" : ""}`}>
              {links.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-[-0.01em] transition-all hover:!bg-aos-elevated hover:![border-color:var(--aos-border-strong)]"
                  style={{
                    background: "rgba(245,242,237,0.04)",
                    border: "1px solid var(--aos-border)",
                    color: "#F5F2ED",
                  }}
                >
                  {l.label}
                  <ExternalLink size={10} className="text-aos-secondary" strokeWidth={2} />
                </a>
              ))}
            </div>
          )}
        </div>
      </EditorialCard>
    </motion.section>
  );
}

function WhosExploring({ count, wedges }: { count: number; wedges: string[] }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ...spring }}
      className="px-6 pt-6"
    >
      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users size={12} className="text-aos-tertiary" strokeWidth={2} />
            <span className="text-[10px] uppercase tracking-[0.16em] font-medium text-aos-tertiary">
              Who&apos;s exploring
            </span>
          </div>
          <h3 className="font-serif text-aos-text text-[20px] leading-tight tracking-[-0.02em]">
            {count} {count === 1 ? "builder has" : "builders have"} run the Lens.
          </h3>
        </div>
      </div>
      {wedges.length > 0 && (
        <div className="flex flex-col gap-2.5 mt-2">
          {wedges.map((w, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08, ...spring }}
              className="relative pl-4 py-1"
            >
              <div
                aria-hidden
                className="absolute left-0 top-0 bottom-0 w-px"
                style={{ background: "rgba(212,165,116,0.35)" }}
              />
              <p className="font-serif italic text-[14px] text-aos-text leading-[1.55]">
                &ldquo;{w}&rdquo;
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </motion.section>
  );
}
