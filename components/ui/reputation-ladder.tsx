"use client";

import { motion } from "framer-motion";
import { Compass, Hammer, Ship, Crown } from "lucide-react";
import type { ReputationStage } from "@/types/database";

const spring = { ease: [0.22, 1, 0.36, 1] as const };

const STAGES: {
  id: ReputationStage;
  Icon: typeof Compass;
  hint: (shipped: number, commits: number) => string | null;
}[] = [
  {
    id: "Explorer",
    Icon: Compass,
    hint: () => "Browse the feed and find something worth committing to.",
  },
  {
    id: "Builder",
    Icon: Hammer,
    hint: (shipped) =>
      shipped === 0
        ? "Ship one to advance — even an early version counts."
        : null,
  },
  {
    id: "Shipper",
    Icon: Ship,
    hint: (shipped) => {
      const left = 3 - shipped;
      return left > 0 ? `${left} more ship${left === 1 ? "" : "s"} to Proven.` : null;
    },
  },
  { id: "Proven", Icon: Crown, hint: () => "You've earned the rarest stage." },
];

const STAGE_INDEX: Record<ReputationStage, number> = {
  Explorer: 0,
  Builder: 1,
  Shipper: 2,
  Proven: 3,
};

export function ReputationLadder({
  stage,
  totalCommitments,
  shippedCount,
}: {
  stage: ReputationStage;
  totalCommitments: number;
  shippedCount: number;
}) {
  const currentIdx = STAGE_INDEX[stage] ?? 0;
  const current = STAGES[currentIdx];
  const hint = current.hint(shippedCount, totalCommitments);
  const next = STAGES[currentIdx + 1];

  return (
    <div className="relative">
      {/* Track */}
      <div
        aria-hidden
        className="absolute left-[14px] right-[14px] top-[14px] h-px"
        style={{ background: "rgba(245,242,237,0.08)" }}
      />
      {/* Filled portion of track */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: currentIdx / (STAGES.length - 1) }}
        transition={{ duration: 0.9, delay: 0.2, ...spring }}
        style={{
          transformOrigin: "left",
          background: "linear-gradient(90deg, #3DB87A 0%, #D4A574 100%)",
        }}
        className="absolute left-[14px] right-[14px] top-[14px] h-px"
      />

      <div className="relative flex justify-between">
        {STAGES.map((s, i) => {
          const isPast = i < currentIdx;
          const isCurrent = i === currentIdx;
          const tint = isCurrent
            ? "#D4A574"
            : isPast
            ? "#3DB87A"
            : "rgba(245,242,237,0.18)";
          return (
            <div key={s.id} className="flex flex-col items-center gap-1.5">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.06, ...spring }}
                className="relative w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  background: "#15151A",
                  border: `1.5px solid ${tint}`,
                  boxShadow: isCurrent
                    ? "0 0 0 4px rgba(212,165,116,0.10), 0 4px 14px rgba(212,165,116,0.18)"
                    : "none",
                }}
              >
                {isCurrent && (
                  <motion.div
                    aria-hidden
                    animate={{ opacity: [0.25, 0.5, 0.25], scale: [0.9, 1.15, 0.9] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full"
                    style={{ background: "rgba(212,165,116,0.18)" }}
                  />
                )}
                <s.Icon
                  size={12}
                  strokeWidth={2.2}
                  style={{ color: isPast || isCurrent ? tint : "#5A5650" }}
                  className="relative"
                />
              </motion.div>
              <span
                className="text-[10px] uppercase tracking-[0.12em] font-medium"
                style={{
                  color: isCurrent
                    ? "#D4A574"
                    : isPast
                    ? "#3DB87A"
                    : "#3A3A42",
                }}
              >
                {s.id}
              </span>
            </div>
          );
        })}
      </div>

      {hint && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ...spring }}
          className="font-serif italic text-[13px] leading-relaxed mt-4"
          style={{ color: "#8A8580" }}
        >
          {next ? `Next — ${next.id}. ` : ""}
          {hint}
        </motion.p>
      )}
    </div>
  );
}
