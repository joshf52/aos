"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { Opportunity } from "@/types/database";
import { DomainTag, tintForDomain } from "./domain-tag";
import { ConfidenceDots } from "./confidence-dots";

const spring = { ease: [0.22, 1, 0.36, 1] as const };

/**
 * Horizontal row of related opportunities shown at the bottom of an
 * opportunity detail page. Gives the user a graceful exit if this one
 * isn't the right fit, without bouncing them all the way back to the feed.
 */
export function AdjacentOpportunities({
  opportunities,
}: {
  opportunities: Opportunity[];
}) {
  if (opportunities.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ...spring }}
      className="px-6 pt-8"
    >
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-[10px] text-aos-tertiary uppercase tracking-[0.16em] font-medium mb-1">
            Adjacent
          </div>
          <h3 className="font-serif text-aos-text text-[22px] leading-tight tracking-[-0.02em]">
            Other gaps in this space.
          </h3>
        </div>
      </div>

      <div
        className="-mx-6 px-6 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {opportunities.map((opp, i) => (
          <motion.div
            key={opp.id}
            initial={{ opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: i * 0.06, ...spring }}
            className="snap-start shrink-0 w-[260px]"
          >
            <Link
              href={`/opportunity/${opp.slug}`}
              className="group relative block h-full rounded-[20px] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:![border-color:rgba(245,242,237,0.14)] overflow-hidden"
              style={{
                background: "#15151A",
                border: "1px solid var(--aos-border)",
              }}
            >
              {opp.domains?.[0] && (
                <div
                  aria-hidden
                  className="absolute left-0 top-4 bottom-4 w-[2px] rounded-r-full"
                  style={{
                    background: `linear-gradient(180deg, transparent, ${tintForDomain(opp.domains[0])} 50%, transparent)`,
                  }}
                />
              )}
              <div className="flex items-start justify-between mb-2.5 gap-2">
                {opp.domains?.[0] ? (
                  <DomainTag domain={opp.domains[0]} size="xs" />
                ) : (
                  <div className="text-[10px] text-aos-tertiary uppercase tracking-[0.12em] font-medium">
                    {opp.capability}
                  </div>
                )}
                <ConfidenceDots count={opp.confidence} size="sm" />
              </div>
              <div className="font-serif text-[17px] text-aos-text leading-snug tracking-[-0.01em] line-clamp-3 min-h-[60px]">
                {opp.title}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--aos-border)" }}>
                <span className="text-[11px] text-aos-secondary tabular-nums">
                  {opp.builder_count} exploring
                </span>
                <ChevronRight size={14} className="text-aos-secondary" strokeWidth={2} />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

