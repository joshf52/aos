"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ChevronRight, Sparkles } from "lucide-react";
import type { Opportunity } from "@/types/database";

const spring = { ease: [0.22, 1, 0.36, 1] as const };

const DOMAIN_LABELS: Record<string, string> = {
  ai: "AI", creator: "Creator", b2b: "B2B", devtools: "Dev Tools",
  health: "Health", finance: "Finance", education: "Education",
  productivity: "Productivity", commerce: "E-commerce",
  community: "Community", media: "Media", climate: "Climate",
};

function pickMatch(opp: Opportunity, userDomains: string[]): string | null {
  const set = new Set(userDomains);
  const match = (opp.domains ?? []).find((d) => set.has(d));
  return match ? DOMAIN_LABELS[match] ?? match : null;
}

export function FeedContent({
  opportunities,
  dateLabel,
  subtitle,
  userDomains,
}: {
  opportunities: Opportunity[];
  dateLabel: string;
  subtitle: string;
  userDomains: string[];
}) {
  const [featured, ...rest] = opportunities;
  const featuredMatch = featured ? pickMatch(featured, userDomains) : null;

  return (
    <main className="min-h-dvh bg-aos-bg">
      <div className="px-6 pt-16 pb-28 max-w-lg mx-auto">

        {/* Date */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-[12px] text-aos-tertiary uppercase tracking-[0.15em] font-medium"
        >
          {dateLabel}
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-serif text-[38px] text-aos-text tracking-[-0.03em] leading-[1.05] mt-1.5"
        >
          Today&apos;s pulse.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-sm text-aos-secondary mt-2 leading-relaxed"
        >
          {subtitle}
        </motion.p>

        {/* Featured card */}
        {featured ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ...spring }}
            className="mt-7"
          >
            <Link href={`/opportunity/${featured.slug}`} className="block rounded-[28px]">
              <div
                className="rounded-[28px] relative overflow-hidden cursor-pointer active:scale-[0.99] transition-all duration-200 hover:-translate-y-0.5 hover:![border-color:rgba(245,242,237,0.14)]"
                style={{
                  background: "linear-gradient(160deg, #1E1E26 0%, #15151A 60%, #12121A 100%)",
                  border: "1px solid rgba(245,242,237,0.08)",
                  boxShadow: "0 0 0 1px rgba(212,165,116,0.04), 0 24px 48px rgba(0,0,0,0.4)",
                }}
              >
                {/* Gold atmospheric glow — top right */}
                <div
                  className="absolute -top-10 -right-10 w-64 h-64 pointer-events-none"
                  style={{
                    background: "radial-gradient(circle, rgba(212,165,116,0.14) 0%, transparent 65%)",
                    filter: "blur(20px)",
                  }}
                />
                {/* Green atmospheric glow — bottom left */}
                <div
                  className="absolute -bottom-8 -left-8 w-48 h-48 pointer-events-none"
                  style={{
                    background: "radial-gradient(circle, rgba(61,184,122,0.08) 0%, transparent 65%)",
                    filter: "blur(20px)",
                  }}
                />
                {/* Subtle dot grid */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(circle, rgba(245,242,237,0.08) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                    maskImage: "radial-gradient(ellipse at 70% 30%, black 10%, transparent 65%)",
                    WebkitMaskImage: "radial-gradient(ellipse at 70% 30%, black 10%, transparent 65%)",
                  }}
                />

                <div className="relative p-6">
                  {/* Badge + confidence */}
                  <div className="flex items-start justify-between mb-5">
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full text-[10px] font-medium tracking-[0.06em] uppercase"
                      style={{ background: "rgba(212,165,116,0.1)", color: "#D4A574", border: "1px solid rgba(212,165,116,0.18)" }}
                    >
                      <Sparkles size={10} strokeWidth={2} />
                      {featuredMatch ? `For you · ${featuredMatch}` : "Featured"}
                    </div>
                    <ConfidenceDots count={featured.confidence} />
                  </div>

                  {/* Category */}
                  <div className="text-[10px] text-aos-tertiary uppercase tracking-[0.14em] font-medium mb-2.5">
                    {featured.capability}
                  </div>

                  {/* Title */}
                  <h2
                    className="font-serif text-aos-text leading-[1.12]"
                    style={{ fontSize: "clamp(24px, 6.5vw, 30px)", letterSpacing: "-0.025em", marginBottom: 14 }}
                  >
                    {featured.title}
                  </h2>

                  {/* Gap */}
                  <p className="text-[13px] leading-[1.6] mb-6" style={{ color: "#8A8580" }}>
                    {featured.gap}
                  </p>

                  {/* Footer */}
                  <div
                    className="flex items-center justify-between pt-4"
                    style={{ borderTop: "1px solid rgba(245,242,237,0.07)" }}
                  >
                    <PresenceDots count={featured.builder_count} />
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: "#F5F2ED" }}>
                      Explore <ArrowRight size={13} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ) : (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="font-serif text-xl text-aos-secondary italic mt-14 text-center"
          >
            New opportunities every Monday.
          </motion.p>
        )}

        {/* Also for you */}
        {rest.length > 0 && (
          <div className="mt-9">
            <div className="flex items-center justify-between mb-3.5">
              <div className="text-[11px] text-aos-tertiary uppercase tracking-[0.12em] font-medium">
                Also for you
              </div>
              <div className="text-xs text-aos-secondary">{rest.length} more</div>
            </div>

            <div className="flex flex-col gap-2">
              {rest.map((opp, i) => (
                <motion.div
                  key={opp.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.08, ...spring }}
                >
                  <Link
                    href={`/opportunity/${opp.slug}`}
                    className="flex items-center gap-3.5 p-4 rounded-[18px] w-full active:scale-[0.99] transition-all duration-200 hover:!bg-aos-elevated hover:![border-color:var(--aos-border-strong)]"
                    style={{
                      background: "#15151A",
                      border: "1px solid var(--aos-border)",
                      display: "flex",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-aos-tertiary uppercase tracking-[0.1em] font-medium mb-1">
                        {opp.capability}
                      </div>
                      <div className="font-serif text-[17px] text-aos-text tracking-[-0.01em] leading-snug">
                        {opp.title}
                      </div>
                      <div className="flex items-center gap-2.5 mt-1.5">
                        <ConfidenceDots count={opp.confidence} small />
                        <span className="text-xs text-aos-secondary tabular-nums">
                          {opp.builder_count} exploring
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} color="#8A8580" strokeWidth={2} className="shrink-0" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function ConfidenceDots({ count, small = false }: { count: number; small?: boolean }) {
  const dotClass = small ? "w-[4px] h-[4px]" : "w-[5px] h-[5px]";
  return (
    <div className="flex gap-[3px] items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`${dotClass} rounded-full`}
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
              border: "2px solid #15151A",
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
