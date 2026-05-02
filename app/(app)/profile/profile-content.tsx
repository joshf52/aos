"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Settings, ChevronRight } from "lucide-react";

const SPRING = [0.22, 1, 0.36, 1] as const;

const DOMAIN_LABELS: Record<string, string> = {
  ai: "AI & ML",
  creator: "Creator Economy",
  b2b: "B2B SaaS",
  devtools: "Dev Tools",
  health: "Health",
  finance: "Finance",
  education: "Education",
  productivity: "Productivity",
  commerce: "E-commerce",
  community: "Community",
  media: "Media",
  climate: "Climate",
};

function StatBlock({ label, value }: { label: string; value: string | number }) {
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

export function ProfileContent({
  name,
  reputationStage,
  buildMode,
  domains,
  unfairAdvantage,
  totalCommitments,
  shippedCount,
  checkinCount,
  activeCommitmentTitle,
}: {
  name: string;
  reputationStage: string;
  buildMode: "self" | "ai" | null;
  domains: string[];
  unfairAdvantage: string | null;
  totalCommitments: number;
  shippedCount: number;
  checkinCount: number;
  activeCommitmentTitle: string | null;
}) {
  const initial = name.charAt(0).toUpperCase();
  const modeLabel =
    buildMode === "ai" ? "AI Builder" : buildMode === "self" ? "Builder" : "Builder";

  return (
    <main className="min-h-dvh bg-aos-bg">
      <div className="px-6 pt-16 pb-28 max-w-lg mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-start justify-between"
        >
          <div>
            <div className="text-[12px] text-aos-tertiary uppercase tracking-[0.15em] font-medium">
              {reputationStage}
            </div>
            <h1 className="font-serif text-[38px] text-aos-text tracking-[-0.03em] leading-[1.05] mt-1">
              {name}.
            </h1>
          </div>
          <Link
            href="/preferences"
            className="w-9 h-9 rounded-full flex items-center justify-center mt-7"
            style={{
              background: "#15151A",
              border: "1px solid var(--aos-border)",
            }}
            aria-label="Preferences"
          >
            <Settings size={16} color="#F5F2ED" strokeWidth={1.8} />
          </Link>
        </motion.div>

        {/* Identity card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: SPRING }}
          className="mt-7 p-6 rounded-3xl relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1C1C22 0%, #15151A 100%)",
            border: "1px solid var(--aos-border)",
          }}
        >
          {/* Ambient glow */}
          <div
            className="absolute -top-10 -right-10 w-44 h-44 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(212, 165, 116, 0.15) 0%, transparent 70%)",
            }}
          />

          <div className="relative">
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-4 font-serif text-[24px]"
              style={{
                background:
                  "linear-gradient(135deg, #D4A574 0%, #B8915C 100%)",
                color: "#1a1a1a",
              }}
            >
              {initial}
            </div>

            <div className="font-serif text-[22px] text-aos-text tracking-[-0.02em]">
              {modeLabel}
            </div>
            {unfairAdvantage && (
              <p className="font-serif italic text-[13px] text-aos-secondary leading-snug mt-1.5">
                &ldquo;{unfairAdvantage}&rdquo;
              </p>
            )}

            <div
              className="flex gap-6 mt-5 pt-5"
              style={{ borderTop: "1px solid var(--aos-border)" }}
            >
              <StatBlock label="Sprints" value={totalCommitments} />
              <StatBlock label="Shipped" value={shippedCount} />
              <StatBlock label="Check-ins" value={checkinCount} />
            </div>
          </div>
        </motion.div>

        {/* Active sprint */}
        {activeCommitmentTitle && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18, ease: SPRING }}
          >
            <Link
              href="/dashboard"
              className="mt-4 flex items-center justify-between p-[18px] rounded-[18px]"
              style={{
                background: "rgba(61, 184, 122, 0.07)",
                border: "1px solid rgba(61, 184, 122, 0.25)",
              }}
            >
              <div>
                <div className="text-[11px] uppercase tracking-[0.12em] font-medium mb-1"
                  style={{ color: "#3DB87A" }}>
                  Active sprint
                </div>
                <div className="font-serif text-[17px] text-aos-text tracking-[-0.01em]">
                  {activeCommitmentTitle}
                </div>
              </div>
              <ChevronRight size={16} color="#3DB87A" strokeWidth={2} />
            </Link>
          </motion.div>
        )}

        {/* Taste profile */}
        {domains.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24, ease: SPRING }}
            className="mt-4 p-[18px] rounded-[18px]"
            style={{
              background: "#15151A",
              border: "1px solid var(--aos-border)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] text-aos-tertiary uppercase tracking-[0.14em] font-medium">
                Taste profile
              </div>
              <Link
                href="/preferences"
                className="text-[11px] font-medium"
                style={{ color: "#5A5650" }}
              >
                Edit
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {domains.slice(0, 6).map((id) => (
                <span
                  key={id}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium text-aos-text"
                  style={{
                    background: "#1C1C22",
                    border: "1px solid var(--aos-border)",
                  }}
                >
                  {DOMAIN_LABELS[id] ?? id}
                </span>
              ))}
              {domains.length > 6 && (
                <span
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium text-aos-secondary"
                  style={{
                    background: "#1C1C22",
                    border: "1px solid var(--aos-border)",
                  }}
                >
                  +{domains.length - 6}
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Empty state for new users */}
        {totalCommitments === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28, ease: SPRING }}
            className="mt-4 p-6 rounded-[18px] text-center"
            style={{
              background: "#15151A",
              border: "1px solid var(--aos-border)",
            }}
          >
            <p className="font-serif italic text-[15px] text-aos-secondary leading-relaxed mb-4">
              Your sprint history will appear here.
            </p>
            <Link
              href="/feed"
              className="inline-block px-5 py-2.5 rounded-full text-[13px] font-semibold tracking-[-0.01em] transition-opacity hover:opacity-80"
              style={{ background: "#F5F2ED", color: "#0A0A0C" }}
            >
              Find an opportunity
            </Link>
          </motion.div>
        )}

      </div>
    </main>
  );
}
