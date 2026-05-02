"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ChevronRight, Sparkles } from "lucide-react";
import type { Opportunity } from "@/types/database";

const spring = { ease: [0.22, 1, 0.36, 1] as const };

export function FeedContent({
  opportunities,
  dateLabel,
  subtitle,
}: {
  opportunities: Opportunity[];
  dateLabel: string;
  subtitle: string;
}) {
  const [featured, ...rest] = opportunities;

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
            <Link href={`/opportunity/${featured.slug}`}>
              <div
                className="rounded-3xl p-[22px] relative overflow-hidden cursor-pointer active:scale-[0.99] transition-transform duration-150"
                style={{
                  background: "linear-gradient(135deg, #1C1C22 0%, #15151A 100%)",
                  border: "1px solid var(--aos-border)",
                }}
              >
                {/* Gold glow corner */}
                <div
                  className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle at 100% 0%, rgba(212,165,116,0.08) 0%, transparent 70%)",
                  }}
                />

                {/* Badge + confidence */}
                <div className="flex items-start justify-between mb-4 relative">
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full text-[11px] font-medium tracking-[0.04em]"
                    style={{
                      background: "var(--aos-gold-soft)",
                      color: "#D4A574",
                    }}
                  >
                    <Sparkles size={11} strokeWidth={2} />
                    Featured
                  </div>
                  <ConfidenceDots count={featured.confidence} />
                </div>

                {/* Category */}
                <div className="text-[11px] text-aos-tertiary uppercase tracking-[0.12em] font-medium mb-2">
                  {featured.capability}
                </div>

                {/* Title */}
                <h2 className="font-serif text-[26px] text-aos-text tracking-[-0.02em] leading-[1.15] mb-3.5">
                  {featured.title}
                </h2>

                {/* Gap */}
                <p className="text-sm text-aos-secondary leading-[1.55] mb-5">
                  {featured.gap}
                </p>

                {/* Footer */}
                <div
                  className="flex items-center justify-between pt-4"
                  style={{ borderTop: "1px solid var(--aos-border)" }}
                >
                  <PresenceDots count={featured.builder_count} />
                  <div className="flex items-center gap-1 text-[13px] font-medium text-aos-text">
                    Explore <ArrowRight size={14} strokeWidth={2} />
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
                    className="flex items-center gap-3.5 p-4 rounded-[18px] w-full active:scale-[0.99] transition-transform duration-150"
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
