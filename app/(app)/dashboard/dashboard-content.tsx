"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ChevronRight, Sparkles, Compass, Flag, Feather } from "lucide-react";
import { GoldSeal } from "@/components/ui/gold-seal";
import { EditorialCard } from "@/components/ui/editorial-card";
import { NumberTicker } from "@/components/ui/number-ticker";

const spring = { ease: [0.22, 1, 0.36, 1] as const };
const SPRING = [0.22, 1, 0.36, 1] as const;

type FocusInfo = {
  source: "checkin" | "lens";
  week: number;
  text: string;
} | null;

type LogEvent = {
  kind: "lens" | "start" | "checkin";
  date: string;
  label: string;
  detail?: string;
};

type Quote = { line: string; attribution?: string };

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
  focus,
  log,
  quote,
  abandonCommitment,
}: {
  commitmentId: string;
  opportunityTitle: string;
  daysIn: number;
  currentWeek: number;
  checkinCount: number;
  checkinDue: boolean;
  startDate: string;
  buildMode: "self" | "ai";
  focus: FocusInfo;
  log: LogEvent[];
  quote: Quote;
  abandonCommitment: (formData: FormData) => Promise<void>;
}) {
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const canShip = daysIn >= 1; // user can ship any time
  const shipReady = daysIn >= 28;

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
          className="mt-8"
        >
          <EditorialCard intensity="subtle" glow="dual">
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
              <Stat label="Days in" value={<NumberTicker value={daysIn} />} />
              <Stat
                label={buildMode === "ai" ? "Updates" : "Check-ins"}
                value={
                  <span>
                    <NumberTicker value={checkinCount} />
                    <span className="text-aos-tertiary">/4</span>
                  </span>
                }
              />
              <Stat label="Week" value={<NumberTicker value={currentWeek} />} />
            </div>
          </div>
          </EditorialCard>
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

        {/* Today's focus */}
        {focus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: checkinDue ? 0.34 : 0.26, ...spring }}
            className="mt-4"
          >
            <EditorialCard intensity="subtle" glow="green">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2.5">
                  <Compass size={12} className="text-aos-tertiary" strokeWidth={2} />
                  <span className="text-[10px] uppercase tracking-[0.16em] font-medium text-aos-tertiary">
                    Today&apos;s focus
                  </span>
                </div>
                <p
                  className="font-serif italic text-aos-text leading-[1.4] tracking-[-0.01em]"
                  style={{ fontSize: "clamp(18px, 4.5vw, 22px)" }}
                >
                  &ldquo;{focus.text}&rdquo;
                </p>
                <div className="text-[11px] text-aos-tertiary mt-3">
                  {focus.source === "checkin"
                    ? `From your week ${focus.week} check-in`
                    : "From your Decision Lens — the smallest test"}
                </div>
              </div>
            </EditorialCard>
          </motion.div>
        )}

        {/* Builder log */}
        {log.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: (checkinDue ? 0.4 : 0.32) + (focus ? 0.06 : 0),
              ...spring,
            }}
            className="mt-4 p-5 rounded-[20px]"
            style={{
              background: "#15151A",
              border: "1px solid var(--aos-border)",
            }}
          >
            <div className="text-[10px] text-aos-tertiary uppercase tracking-[0.16em] font-medium mb-4">
              Builder log
            </div>
            <BuilderLog events={log} />
          </motion.div>
        )}

        {/* Daily quote */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ...spring }}
          className="mt-5 px-2 py-1 text-center"
        >
          <div
            aria-hidden
            className="mx-auto mb-3 w-[60px] h-px"
            style={{ background: "rgba(212,165,116,0.25)" }}
          />
          <p
            className="font-serif italic text-aos-text leading-[1.4] tracking-[-0.01em]"
            style={{ fontSize: "clamp(16px, 4.5vw, 20px)" }}
          >
            &ldquo;{quote.line}&rdquo;
          </p>
          {quote.attribution && (
            <div className="text-[10px] uppercase tracking-[0.16em] font-medium mt-2 text-aos-tertiary">
              — {quote.attribution}
            </div>
          )}
        </motion.div>

        {/* Covenant card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: checkinDue ? 0.36 : 0.28, ...spring }}
          className="mt-4 p-5 rounded-[20px] relative overflow-hidden"
          style={{
            background: "#15151A",
            border: "1px solid rgba(245,242,237,0.06)",
          }}
        >
          {/* Wax seal in corner */}
          <div className="absolute -top-3 -right-3 opacity-90">
            <GoldSeal size={48} letter="A" />
          </div>
          <div className="text-[10px] text-aos-tertiary uppercase tracking-[0.14em] font-medium mb-2.5">
            Your Covenant
          </div>
          <p className="font-serif text-[14px] text-aos-text italic leading-relaxed mb-3.5 pr-12">
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

        {/* Ship CTA */}
        {canShip && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ...spring }}
            className="mt-5"
          >
            <Link
              href={`/commit/${commitmentId}/ship`}
              className="group relative flex items-center justify-center gap-2 w-full py-[16px] rounded-[18px] text-[15px] font-semibold tracking-[-0.01em] overflow-hidden transition-all active:scale-[0.99] hover:brightness-110 focus-gold"
              style={{
                background: shipReady
                  ? "linear-gradient(180deg, #E8BD8E 0%, #B8895A 100%)"
                  : "rgba(212,165,116,0.08)",
                color: shipReady ? "#1a1208" : "#D4A574",
                border: shipReady ? "none" : "1px solid rgba(212,165,116,0.25)",
                boxShadow: shipReady
                  ? "0 0 0 1px rgba(212,165,116,0.3) inset, 0 12px 30px rgba(212,165,116,0.18)"
                  : "none",
              }}
            >
              {shipReady ? (
                <>
                  <Sparkles size={15} strokeWidth={2.5} />
                  <span>Mark as shipped</span>
                </>
              ) : (
                <>
                  <span>Ship it early</span>
                  <ChevronRight size={15} strokeWidth={2.5} />
                </>
              )}
            </Link>
          </motion.div>
        )}

        {/* Abandon — discreet */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 text-center"
        >
          <button
            onClick={() => setConfirmAbandon(true)}
            className="text-[12px] font-medium tracking-[-0.01em] transition-colors hover:!text-aos-secondary rounded"
            style={{ color: "#3A3A42", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Abandon sprint
          </button>
        </motion.div>

      </div>

      {/* Abandon confirmation overlay */}
      <AnimatePresence>
        {confirmAbandon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
            style={{ background: "rgba(10,10,12,0.7)", backdropFilter: "blur(8px)" }}
            onClick={() => setConfirmAbandon(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.35, ease: SPRING }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-[24px] p-6 relative"
              style={{
                background: "linear-gradient(160deg, #1A1A22 0%, #15151A 100%)",
                border: "1px solid rgba(245,242,237,0.08)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              }}
            >
              <div className="text-[10px] uppercase tracking-[0.16em] font-medium mb-2" style={{ color: "#D4A574" }}>
                Heads up
              </div>
              <h2 className="font-serif text-[24px] text-aos-text tracking-[-0.02em] leading-[1.15]">
                Abandon this sprint?
              </h2>
              <p className="font-serif italic text-[13px] mt-2 leading-relaxed" style={{ color: "#8A8580" }}>
                The covenant breaks. Reputation and concurrent slots reset
                accordingly. You can pick a new opportunity right after.
              </p>
              <div className="flex gap-2.5 mt-6">
                <button
                  onClick={() => setConfirmAbandon(false)}
                  className="flex-1 py-3 rounded-[14px] text-[14px] font-medium transition-colors hover:!bg-aos-elevated hover:![border-color:var(--aos-border-strong)]"
                  style={{
                    background: "transparent",
                    color: "#F5F2ED",
                    border: "1px solid rgba(245,242,237,0.12)",
                    cursor: "pointer",
                  }}
                >
                  Keep going
                </button>
                <form action={abandonCommitment} className="flex-1">
                  <input type="hidden" name="commitmentId" value={commitmentId} />
                  <button
                    type="submit"
                    className="w-full py-3 rounded-[14px] text-[14px] font-semibold transition-opacity hover:opacity-90"
                    style={{
                      background: "rgba(255, 90, 90, 0.12)",
                      color: "#ff8a8a",
                      border: "1px solid rgba(255, 90, 90, 0.3)",
                      cursor: "pointer",
                    }}
                  >
                    Abandon
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
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

function formatLogDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function BuilderLog({ events }: { events: LogEvent[] }) {
  return (
    <ol className="relative">
      {/* Vertical rail */}
      <div
        aria-hidden
        className="absolute left-[7px] top-1.5 bottom-1.5 w-px"
        style={{ background: "rgba(245,242,237,0.08)" }}
      />
      {events.map((e, i) => {
        const isLast = i === events.length - 1;
        const Icon = e.kind === "lens" ? Compass : e.kind === "start" ? Feather : Flag;
        const tint =
          e.kind === "start" ? "#D4A574" : e.kind === "checkin" ? "#3DB87A" : "#8A8580";
        return (
          <li key={`${e.date}-${i}`} className={`relative pl-7 ${isLast ? "" : "pb-4"}`}>
            <div
              className="absolute left-0 top-[2px] w-[15px] h-[15px] rounded-full flex items-center justify-center"
              style={{
                background: "#15151A",
                border: `1px solid ${tint}`,
                boxShadow: `0 0 0 3px #15151A`,
              }}
            >
              <Icon size={8} color={tint} strokeWidth={2.5} />
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] text-aos-text font-medium tracking-[-0.01em]">
                {e.label}
              </span>
              <span className="text-[10px] text-aos-tertiary uppercase tracking-[0.1em] tabular-nums shrink-0">
                {formatLogDate(e.date)}
              </span>
            </div>
            {e.detail && (
              <p className="text-[12px] text-aos-secondary leading-[1.5] mt-0.5">
                {e.detail}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
