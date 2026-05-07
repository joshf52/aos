"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { EditorialCard } from "./editorial-card";

const spring = { ease: [0.22, 1, 0.36, 1] as const };

/**
 * Returning-user status banner shown on the feed. Surfaces an active
 * commitment's progress so daily visitors land somewhere productive instead
 * of having to navigate to the dashboard.
 */
export function SprintStrip({
  commitmentId,
  opportunityTitle,
  daysIn,
  checkinDue,
  buildMode,
}: {
  commitmentId: string;
  opportunityTitle: string;
  daysIn: number;
  checkinDue: boolean;
  buildMode: "self" | "ai";
}) {
  const href =
    buildMode === "ai" ? `/commit/${commitmentId}/ai-build` : "/dashboard";
  const pct = Math.min(100, Math.round((daysIn / 30) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.18, ...spring }}
      className="mt-5"
    >
      <Link
        href={href}
        className="block rounded-[22px] active:scale-[0.99] transition-transform duration-200"
      >
        <EditorialCard
          intensity="subtle"
          glow={checkinDue ? "gold" : "green"}
          className="!rounded-[22px]"
        >
          <div className="p-4 flex items-center gap-4">
            {/* Day counter */}
            <div className="shrink-0">
              <div className="text-[9px] text-aos-tertiary uppercase tracking-[0.16em] font-medium mb-1">
                Day
              </div>
              <div className="font-serif text-aos-text tabular-nums leading-none tracking-[-0.02em] text-[28px]">
                {daysIn}
                <span className="text-aos-tertiary text-[18px]">/30</span>
              </div>
            </div>

            {/* Divider */}
            <div
              className="w-px self-stretch"
              style={{ background: "rgba(245,242,237,0.06)" }}
            />

            {/* Title + bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className="text-[10px] uppercase tracking-[0.16em] font-medium"
                  style={{ color: checkinDue ? "#D4A574" : "#3DB87A" }}
                >
                  {buildMode === "ai" ? "Build" : "Sprint"}
                </span>
                {checkinDue && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded-full text-[9px] font-medium tracking-[0.06em] uppercase"
                    style={{
                      background: "rgba(212,165,116,0.12)",
                      color: "#D4A574",
                      border: "1px solid rgba(212,165,116,0.25)",
                    }}
                  >
                    <Zap size={8} strokeWidth={2.5} />
                    Check-in
                  </span>
                )}
              </div>
              <div className="font-serif text-[15px] text-aos-text leading-tight tracking-[-0.01em] truncate">
                {opportunityTitle}
              </div>
              {/* Progress bar */}
              <div
                className="mt-2 h-[3px] rounded-full overflow-hidden"
                style={{ background: "rgba(245,242,237,0.06)" }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.9, delay: 0.4, ...spring }}
                  className="h-full rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, #3DB87A 0%, #D4A574 100%)",
                  }}
                />
              </div>
            </div>

            <ArrowRight
              size={15}
              strokeWidth={2.5}
              className="shrink-0 text-aos-secondary"
            />
          </div>
        </EditorialCard>
      </Link>
    </motion.div>
  );
}
