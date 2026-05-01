"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, ChevronRight } from "lucide-react";

const spring = { ease: [0.22, 1, 0.36, 1] as const };

// Snake path connecting all 30 dots (3 rows × 10)
const SNAKE_PATH = Array.from({ length: 30 })
  .map((_, i) => {
    const x = 12 + (i % 10) * 30;
    const y = 30 + Math.floor(i / 10) * 60;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  })
  .join(" ");

const WEEK_LABELS = new Set([1, 7, 14, 21, 30]);

export function DashboardContent({
  commitmentId,
  opportunityTitle,
  daysIn,
  currentWeek,
  checkinCount,
  checkinDue,
  startDate,
}: {
  commitmentId: string;
  opportunityTitle: string;
  daysIn: number;
  currentWeek: number;
  checkinCount: number;
  checkinDue: boolean;
  startDate: string;
}) {
  return (
    <main className="min-h-dvh bg-aos-bg">
      <div className="px-6 pt-16 pb-28 max-w-lg mx-auto">

        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-[12px] text-aos-tertiary uppercase tracking-[0.15em] font-medium"
        >
          Sprint · Day {daysIn} of 30
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="font-serif text-[38px] text-aos-text tracking-[-0.03em] leading-[1.05] mt-1.5"
        >
          {opportunityTitle}.
        </motion.h1>

        {/* Constellation card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.18, ...spring }}
          className="mt-8 rounded-3xl p-6 relative overflow-hidden"
          style={{
            background: "#15151A",
            border: "1px solid var(--aos-border)",
          }}
        >
          {/* Subtle green ambient */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 30% 50%, rgba(61, 184, 122, 0.08) 0%, transparent 60%)",
            }}
          />

          {/* 30-day SVG constellation */}
          <svg
            width="100%"
            height="180"
            viewBox="0 0 320 180"
            className="relative"
            aria-hidden
          >
            {/* Dashed connecting path */}
            <path
              d={SNAKE_PATH}
              stroke="rgba(245,242,237,0.10)"
              strokeWidth="1"
              fill="none"
              strokeDasharray="2 4"
            />

            {/* Day dots */}
            {Array.from({ length: 30 }).map((_, i) => {
              const day = i + 1;
              const x = 12 + (i % 10) * 30;
              const y = 30 + Math.floor(i / 10) * 60;
              const isToday = day === daysIn;
              const isPast = day < daysIn;

              return (
                <g key={day}>
                  {isToday && (
                    <motion.circle
                      cx={x}
                      cy={y}
                      fill="#3DB87A"
                      animate={{
                        r: [14, 18, 14],
                        opacity: [0.2, 0.05, 0.2],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r={isToday ? 5 : 3.5}
                    fill={
                      isToday
                        ? "#3DB87A"
                        : isPast
                        ? "#D4A574"
                        : "rgba(245,242,237,0.12)"
                    }
                  />
                  {WEEK_LABELS.has(day) && (
                    <text
                      x={x}
                      y={y + 18}
                      fontSize="9"
                      fill="#5A5650"
                      textAnchor="middle"
                      fontFamily="var(--font-jakarta), system-ui, sans-serif"
                    >
                      {day}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Stats */}
          <div
            className="flex justify-between mt-3 pt-4"
            style={{ borderTop: "1px solid var(--aos-border)" }}
          >
            <Stat label="Days in" value={daysIn} />
            <Stat label="Check-ins" value={`${checkinCount}/4`} />
            <Stat label="Week" value={currentWeek} />
          </div>
        </motion.div>

        {/* Check-in nudge — shown when a week has passed without logging */}
        {checkinDue && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28, ...spring }}
            className="mt-4 p-5 rounded-[20px]"
            style={{
              background:
                "linear-gradient(135deg, var(--aos-gold-soft) 0%, #15151A 70%)",
              border: "1px solid rgba(212, 165, 116, 0.2)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap size={13} color="#D4A574" strokeWidth={2} />
              <span
                className="text-[11px] uppercase tracking-[0.12em] font-medium"
                style={{ color: "#D4A574" }}
              >
                Week {currentWeek} check-in due
              </span>
            </div>
            <div className="font-serif text-[19px] text-aos-text tracking-[-0.01em] leading-[1.3] mb-3.5">
              What did you ship or learn this week?
            </div>
            <Link
              href={`/dashboard/checkin/${commitmentId}`}
              className="inline-block px-[18px] py-2.5 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-opacity hover:opacity-80"
              style={{ background: "#D4A574", color: "#1a1a1a" }}
            >
              Log update
            </Link>
          </motion.div>
        )}

        {/* Covenant card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: checkinDue ? 0.36 : 0.28, ...spring }}
          className="mt-4 p-[18px] rounded-[18px]"
          style={{
            background: "#15151A",
            border: "1px solid var(--aos-border)",
          }}
        >
          <div className="text-[11px] text-aos-tertiary uppercase tracking-[0.12em] font-medium mb-2.5">
            Your Covenant
          </div>
          <p className="font-serif text-sm text-aos-text italic leading-relaxed mb-3">
            &ldquo;I commit to building {opportunityTitle} for thirty days,
            with full intention, beginning {startDate}.&rdquo;
          </p>
          <button
            className="flex items-center gap-1 text-[13px] font-medium"
            style={{ color: "#3DB87A", background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            View full document <ChevronRight size={13} strokeWidth={2} />
          </button>
        </motion.div>

      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-[11px] text-aos-tertiary uppercase tracking-[0.12em] font-medium mb-1">
        {label}
      </div>
      <div className="text-[22px] text-aos-text font-medium tracking-[-0.02em] tabular-nums">
        {value}
      </div>
    </div>
  );
}
