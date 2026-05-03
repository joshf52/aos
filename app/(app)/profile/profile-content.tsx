"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Settings, ChevronRight, ExternalLink } from "lucide-react";
import { GoldSeal } from "@/components/ui/gold-seal";

type ShippedItem = {
  id: string;
  title: string;
  url: string | null;
  completedAt: string | null;
};

function formatShipDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function trimUrl(url: string | null): string {
  if (!url) return "";
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

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
      <div className="text-[10px] text-aos-tertiary uppercase tracking-[0.14em] font-medium mb-1">
        {label}
      </div>
      <div className="text-[26px] text-aos-text font-medium tracking-[-0.03em] tabular-nums leading-none">
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
  shippedHistory,
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
  shippedHistory: ShippedItem[];
}) {
  const initial = name.charAt(0).toUpperCase();
  const modeLabel =
    buildMode === "ai" ? "AI Builder" : buildMode === "self" ? "Builder" : "Builder";

  return (
    <main className="min-h-dvh bg-aos-bg relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-20 -left-20 w-[360px] h-[360px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(212,165,116,0.12) 0%, transparent 65%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute top-[40%] -right-10 w-[260px] h-[260px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(61,184,122,0.07) 0%, transparent 65%)",
            filter: "blur(50px)",
          }}
        />
      </div>

      <div className="relative z-10 px-6 pt-16 pb-28 max-w-lg mx-auto">

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
            <h1 className="font-serif text-[42px] text-aos-text tracking-[-0.035em] leading-[1.0] mt-1">
              {name}.
            </h1>
          </div>
          <Link
            href="/preferences"
            className="w-9 h-9 rounded-full flex items-center justify-center mt-8 transition-opacity hover:opacity-70"
            style={{
              background: "#15151A",
              border: "1px solid rgba(245,242,237,0.08)",
            }}
            aria-label="Preferences"
          >
            <Settings size={16} color="#8A8580" strokeWidth={1.8} />
          </Link>
        </motion.div>

        {/* Identity card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: SPRING }}
          className="mt-7 rounded-[26px] relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #1E1E26 0%, #15151A 55%, #12121A 100%)",
            border: "1px solid rgba(245,242,237,0.08)",
            boxShadow: "0 0 0 1px rgba(212,165,116,0.04), 0 20px 40px rgba(0,0,0,0.35)",
          }}
        >
          {/* Gold glow top-right */}
          <div
            className="absolute -top-10 -right-10 w-52 h-52 pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(212,165,116,0.18) 0%, transparent 65%)",
              filter: "blur(24px)",
            }}
          />
          {/* Green glow bottom-left */}
          <div
            className="absolute -bottom-8 -left-8 w-40 h-40 pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(61,184,122,0.08) 0%, transparent 65%)",
              filter: "blur(20px)",
            }}
          />
          {/* Dot grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(245,242,237,0.07) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
              maskImage: "radial-gradient(ellipse at 80% 20%, black 0%, transparent 60%)",
              WebkitMaskImage: "radial-gradient(ellipse at 80% 20%, black 0%, transparent 60%)",
            }}
          />

          <div className="relative p-6">
            {/* Wax seal avatar */}
            <div className="mb-5">
              <GoldSeal letter={initial} size={58} pulse />
            </div>

            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full text-[10px] font-medium tracking-[0.06em] uppercase mb-3"
              style={{
                background: "rgba(212,165,116,0.1)",
                color: "#D4A574",
                border: "1px solid rgba(212,165,116,0.18)",
              }}
            >
              {modeLabel}
            </div>

            {unfairAdvantage && (
              <p className="font-serif italic text-[14px] leading-relaxed mb-5" style={{ color: "#8A8580" }}>
                &ldquo;{unfairAdvantage}&rdquo;
              </p>
            )}

            <div
              className="flex gap-7 pt-5"
              style={{ borderTop: "1px solid rgba(245,242,237,0.07)" }}
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
              className="mt-4 flex items-center justify-between p-5 rounded-[20px] transition-opacity hover:opacity-80"
              style={{
                background: "rgba(61, 184, 122, 0.07)",
                border: "1px solid rgba(61, 184, 122, 0.22)",
              }}
            >
              <div>
                <div
                  className="text-[10px] uppercase tracking-[0.14em] font-medium mb-1.5"
                  style={{ color: "#3DB87A" }}
                >
                  Active sprint
                </div>
                <div className="font-serif text-[18px] text-aos-text tracking-[-0.02em] leading-snug">
                  {activeCommitmentTitle}
                </div>
              </div>
              <ChevronRight size={16} color="#3DB87A" strokeWidth={2} className="shrink-0" />
            </Link>
          </motion.div>
        )}

        {/* Shipped history */}
        {shippedHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22, ease: SPRING }}
            className="mt-5"
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="text-[10px] uppercase tracking-[0.16em] font-medium" style={{ color: "#D4A574" }}>
                Shipped
              </div>
              <span className="text-[11px] tabular-nums" style={{ color: "#5A5650" }}>
                {shippedHistory.length} sealed
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {shippedHistory.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.28 + i * 0.06, ease: SPRING }}
                  className="relative p-4 rounded-[18px] overflow-hidden"
                  style={{
                    background: "linear-gradient(160deg, #1A1A22 0%, #15151A 100%)",
                    border: "1px solid rgba(212,165,116,0.12)",
                  }}
                >
                  {/* Tiny seal corner */}
                  <div className="absolute -top-2 -right-2 opacity-80 pointer-events-none">
                    <GoldSeal size={36} letter="A" />
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.14em] font-medium mb-1.5" style={{ color: "#5A5650" }}>
                    {formatShipDate(item.completedAt)}
                  </div>
                  <div className="font-serif text-[16px] text-aos-text tracking-[-0.01em] leading-snug pr-10 mb-2">
                    {item.title}
                  </div>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[12px] font-medium transition-opacity hover:opacity-80"
                      style={{ color: "#D4A574" }}
                    >
                      <span className="truncate max-w-[220px]">{trimUrl(item.url)}</span>
                      <ExternalLink size={11} strokeWidth={2.2} />
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Taste profile */}
        {domains.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24, ease: SPRING }}
            className="mt-4 p-5 rounded-[20px]"
            style={{
              background: "#15151A",
              border: "1px solid rgba(245,242,237,0.06)",
            }}
          >
            <div className="flex items-center justify-between mb-3.5">
              <div className="text-[10px] text-aos-tertiary uppercase tracking-[0.14em] font-medium">
                Taste profile
              </div>
              <Link
                href="/preferences"
                className="text-[11px] font-medium transition-opacity hover:opacity-70"
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
                    border: "1px solid rgba(245,242,237,0.07)",
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
                    border: "1px solid rgba(245,242,237,0.07)",
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
            className="mt-4 p-6 rounded-[20px] text-center"
            style={{
              background: "#15151A",
              border: "1px solid rgba(245,242,237,0.06)",
            }}
          >
            <p className="font-serif italic text-[15px] leading-relaxed mb-5" style={{ color: "#5A5650" }}>
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
