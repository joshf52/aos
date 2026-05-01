"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

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

const AUDIENCE_LABELS: Record<string, string> = {
  creators: "Creators",
  developers: "Indie Hackers",
  smb: "Small Business",
  consumers: "Consumers",
};

const COMMITMENT_LABELS: Record<string, string> = {
  exploring: "Exploring",
  building: "Building",
  allin: "All in",
};

type Token = { label: string; color: string };

export function PersonalizingContent({
  buildMode,
  domains,
  audience,
  commitmentLevel,
}: {
  buildMode: "self" | "ai" | null;
  domains: string[];
  audience: string | null;
  commitmentLevel: string | null;
}) {
  const [phase, setPhase] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1400);
    const t2 = setTimeout(() => setPhase(2), 2600);
    const t3 = setTimeout(() => setPhase(3), 3800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const tokens: Token[] = useMemo(() => {
    const result: Token[] = [];
    if (buildMode) {
      result.push({
        label: buildMode === "self" ? "Self-builder" : "AI-builder",
        color: "#3DB87A",
      });
    }
    domains.slice(0, 4).forEach((id) => {
      if (DOMAIN_LABELS[id]) {
        result.push({ label: DOMAIN_LABELS[id], color: "#D4A574" });
      }
    });
    if (audience && AUDIENCE_LABELS[audience]) {
      result.push({ label: AUDIENCE_LABELS[audience], color: "#3DB87A" });
    }
    if (commitmentLevel && COMMITMENT_LABELS[commitmentLevel]) {
      result.push({ label: COMMITMENT_LABELS[commitmentLevel], color: "#D4A574" });
    }
    return result;
  }, [buildMode, domains, audience, commitmentLevel]);

  // Pre-compute stable random starting positions (avoid re-randomizing on re-render)
  const startPositions = useRef(
    Array.from({ length: 10 }, () => ({
      x: (Math.random() - 0.5) * 220,
      y: (Math.random() - 0.5) * 220,
    }))
  );

  const positions = useMemo(() => {
    return tokens.map((_, i) => {
      const angle = (i / tokens.length) * Math.PI * 2 - Math.PI / 2;
      const r = 110;
      return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
    });
  }, [tokens]);

  return (
    <main
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#000" }}
    >
      {/* Ambient gold */}
      <motion.div
        animate={{ opacity: phase >= 2 ? 1 : 0.25 }}
        transition={{ duration: 1.2 }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(212, 165, 116, 0.16) 0%, transparent 60%)",
        }}
      />

      {/* Constellation */}
      <div className="relative" style={{ width: 320, height: 320 }}>
        {/* Connecting lines (SVG) */}
        <svg
          className="absolute inset-0"
          width="320"
          height="320"
          viewBox="-160 -160 320 320"
          overflow="visible"
        >
          {positions.map((pos, i) => (
            <motion.line
              key={i}
              x1="0"
              y1="0"
              x2={pos.x}
              y2={pos.y}
              stroke="#D4A574"
              strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: phase >= 1 ? 1 : 0,
                opacity: phase >= 1 ? 0.3 : 0,
              }}
              transition={{
                duration: 1,
                delay: i * 0.08,
                ease: SPRING,
              }}
            />
          ))}
        </svg>

        {/* Center pulse */}
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence>
            {phase >= 2 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative flex items-center justify-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.35, 0, 0.35] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute w-20 h-20 rounded-full"
                  style={{ background: "#D4A574" }}
                />
                <motion.div
                  animate={{ scale: [1, 1.8, 1], opacity: [0.18, 0, 0.18] }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.4,
                  }}
                  className="absolute w-20 h-20 rounded-full"
                  style={{ background: "#D4A574" }}
                />
                <div
                  className="relative z-10 w-3.5 h-3.5 rounded-full"
                  style={{
                    background: "#D4A574",
                    boxShadow: "0 0 30px #D4A574, 0 0 60px #D4A574",
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating token pills */}
        <div className="absolute inset-0 flex items-center justify-center">
          {tokens.map((token, i) => {
            const pos = positions[i];
            const start = startPositions.current[i] ?? { x: 0, y: 0 };
            return (
              <motion.div
                key={i}
                initial={{ x: start.x, y: start.y, opacity: 0, scale: 0.5 }}
                animate={{ x: pos.x, y: pos.y, opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, delay: i * 0.1, ease: SPRING }}
                className="absolute px-3 py-1.5 rounded-full text-[11px] font-medium tracking-[-0.01em] whitespace-nowrap text-aos-text"
                style={{
                  background: "rgba(20, 20, 24, 0.85)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  border: `1px solid ${token.color}40`,
                  boxShadow:
                    phase >= 2 ? `0 0 16px ${token.color}30` : "none",
                  transition: "box-shadow 0.6s",
                }}
              >
                {token.label}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Status text */}
      <div className="absolute bottom-[120px] left-0 right-0 text-center px-8">
        <AnimatePresence mode="wait">
          {phase < 3 ? (
            <motion.div
              key="building"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="font-serif italic text-[18px] text-aos-text tracking-[-0.01em]">
                Building your taste profile…
              </div>
              <div className="text-[13px] text-aos-tertiary mt-1.5">
                {phase === 0 && "Reading signals"}
                {phase === 1 && "Connecting patterns"}
                {phase === 2 && "Calibrating taste"}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: SPRING }}
            >
              <div className="font-serif text-[26px] text-aos-text tracking-[-0.02em] leading-tight mb-2">
                Twelve opportunities,
                <br />
                curated for you.
              </div>
              <div className="font-serif italic text-[14px] text-aos-secondary">
                Refreshed every Monday morning.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CTA */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: SPRING }}
            className="absolute bottom-9 left-6 right-6"
          >
            <motion.button
              onClick={() => router.push("/feed")}
              whileTap={{ scale: 0.97 }}
              className="w-full py-[17px] rounded-[18px] text-[16px] font-semibold flex items-center justify-center gap-2 tracking-[-0.01em]"
              style={{ background: "#D4A574", color: "#1a1a1a", border: "none" }}
            >
              See your opportunities
              <ArrowRight size={17} strokeWidth={2.5} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
