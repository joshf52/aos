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
  buildMode,
}: {
  commitmentId: string;
  opportunityTitle: string;
  daysIn: number;
  currentWeek: number;
  checkinCount: number;
  checkinDue: boolean;
  startDate: string;
  buildMode: "self" | "ai";
}) {
  return (
    <main className="min-h-dvh bg-aos-bg relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-16 -right-16 w-[320px] h-[320px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(61,184,122,0.09) 0%, transparent 65%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute bottom-[20%] -left-10 w-[260px] h-[260px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(212,165,116,0.07) 0%, transparent 65%)",
            filter: "blur(50px)",
          }}
        />
      </div>

      <div className="relative z-10 px-6 pt-16 pb-28 max-w-lg mx-auto">

        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-[12px] text-aos-tertiary uppercase tracking-[0.15em] font-medium"
        >
          {buildMode === "ai" ? "Build" : "Sprint"} · Day {daysIn} of 30
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="font-serif text-aos-text tracking-[-0.03em] leading-[1.05] mt-1.5"
          style={{ fontSize: "clamp(30px, 8vw, 40px)" }}
        >
          {opportunityTitle}.
        </motion.h1>

        {/* Constellation card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.18, ...spring }}
          className="mt-8 rounded-[26px] relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #1A1A22 0%, #15151A 55%, #12121A 100%)",
            border: "1px solid rgba(245,242,237,0.08)",
            boxShadow: "0 0 0 1px rgba(61,184,122,0.03), 0 20px 40px rgba(0,0,0,0.35)",
          }}
        >
          {/* Subtle green ambient */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 70% 60% at 20% 40%, rgba(61,184,122,0.10) 0%, transparent 65%)",
            }}
          />
          {/* Gold shimmer top-right */}
          <div
            className="absolute -top-8 right-0 w-48 h-48 pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(212,165,116,0.08) 0%, transparent 65%)",
              filter: "blur(24px)",
            }}
          />

          <div className="relative p-6">
            {/* 30-day SVG constellation */}
            <svg
              width="100%"
              height="180"
              viewBox="0 0 320 180"
              aria-hidden
            >
              {/* Dashed connecting path */}
              <path
                d={SNAKE_PATH}
                stroke="rgba(245,242,237,0.08)"
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
                          r: [14, 20, 14],
                          opacity: [0.15, 0.05, 0.15],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r={isToday ? 5.5 : isPast ? 4 : 3.5}
                      fill={
                        isToday
                          ? "#3DB87A"
                          : isPast
                          ? "#D4A574"
                          : "rgba(245,242,237,0.10)"
                      }
                    />
                    {WEEK_LABELS.has(day) && (
                      <text
                        x={x}
                        y={y + 18}
                        fontSize="9"
                        fill="#3A3A42"
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
              className="flex justify-between mt-2 pt-4"
              style={{ borderTop: "1px solid rgba(245,242,237,0.07)" }}
            >
              <Stat label="Days in" value={daysIn} />
              <Stat label={buildMode === "ai" ? "Updates" : "Check-ins"} value={`${checkinCount}/4`} />
              <Stat label="Week" value={currentWeek} />
            </div>
          </div>
        </motion.div>

        {/* Check-in nudge */}
        {checkinDue && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28, ...spring }}
            className="mt-4 p-5 rounded-[22px] relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(212,165,116,0.08) 0%, #15151A 60%)",
              border: "1px solid rgba(212, 165, 116, 0.2)",
            }}
          >
            <div
              className="absolute -top-8 -right-8 w-36 h-36 pointer-events-none"
              style={{
                background: "radial-gradient(circle, rgba(212,165,116,0.15) 0%, transparent 70%)",
                filter: "blur(20px)",
              }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2.5">
                <Zap size={12} color="#D4A574" strokeWidth={2} />
                <span
                  className="text-[10px] uppercase tracking-[0.14em] font-medium"
                  style={{ color: "#D4A574" }}
                >
                  Week {currentWeek} {buildMode === "ai" ? "update due" : "check-in due"}
                </span>
              </div>
              <div className="font-serif text-[20px] text-aos-text tracking-[-0.02em] leading-[1.25] mb-4">
                {buildMode === "ai"
                  ? "What has the AI shipped or learned this week?"
                  : "What did you ship or learn this week?"}
              </div>
              <Link
                href={`/dashboard/checkin/${commitmentId}`}
                className="inline-block px-5 py-2.5 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-opacity hover:opacity-80"
                style={{ background: "#D4A574", color: "#1a1208" }}
              >
                Log update
              </Link>
            </div>
          </motion.div>
        )}

        {/* Covenant card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: checkinDue ? 0.36 : 0.28, ...spring }}
          className="mt-4 p-5 rounded-[20px]"
          style={{
            background: "#15151A",
            border: "1px solid rgba(245,242,237,0.06)",
          }}
        >
          <div className="text-[10px] text-aos-tertiary uppercase tracking-[0.14em] font-medium mb-2.5">
            Your Covenant
          </div>
          <p className="font-serif text-[14px] text-aos-text italic leading-relaxed mb-3.5">
            &ldquo;I commit to building {opportunityTitle} for thirty days,
            with full intention, beginning {startDate}.&rdquo;
          </p>
          <Link
            href={`/commit/${commitmentId}/ceremony`}
            className="flex items-center gap-1 text-[13px] font-medium transition-opacity hover:opacity-70"
            style={{ color: "#3DB87A" }}
          >
            View full document <ChevronRight size={13} strokeWidth={2} />
          </Link>
        </motion.div>

      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-[10px] text-aos-tertiary uppercase tracking-[0.14em] font-medium mb-1">
        {label}
      </div>
      <div className="text-[24px] text-aos-text font-medium tracking-[-0.03em] tabular-nums leading-none">
        {value}
      </div>
    </div>
  );
}
