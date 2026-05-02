"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const SPRING = [0.22, 1, 0.36, 1] as const;
const PILLS = ["5 opportunities weekly", "Decision Lens", "30-day sprint"];

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-[#0A0A0C] relative flex flex-col items-center justify-center overflow-hidden">

      {/* ── Layer 0: grain texture ── */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          opacity: 0.032,
        }}
      />

      {/* ── Layer 1: animated blobs ── */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 50, -30, 0], y: [0, -40, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(61,184,122,0.20) 0%, transparent 60%)",
            filter: "blur(70px)",
          }}
        />
        <motion.div
          animate={{ x: [0, -40, 30, 0], y: [0, 50, -20, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-24 -right-24 w-[480px] h-[480px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(212,165,116,0.18) 0%, transparent 60%)",
            filter: "blur(70px)",
          }}
        />
        <motion.div
          animate={{ x: [0, -60, 20, 0], y: [0, 40, -50, 0] }}
          transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[8%] -right-16 w-[320px] h-[320px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(61,184,122,0.12) 0%, transparent 60%)",
            filter: "blur(55px)",
          }}
        />
        <motion.div
          animate={{ x: [0, 35, -15, 0], y: [0, -55, 40, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[35%] -left-24 w-[300px] h-[300px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(212,165,116,0.10) 0%, transparent 60%)",
            filter: "blur(55px)",
          }}
        />
        {/* Central soft glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(61,184,122,0.035) 0%, transparent 55%)",
          }}
        />
      </div>

      {/* ── Layer 2: floating UI fragments ── */}
      <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
        {/* Opportunity card — left edge */}
        <motion.div
          initial={{ rotate: -10 }}
          animate={{ y: [0, -14, 0], rotate: [-10, -8, -10] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-14 top-[22%] w-[210px]"
          style={{
            background: "#1C1C22",
            border: "1px solid rgba(245,242,237,0.09)",
            borderRadius: 14,
            padding: 16,
            opacity: 0.22,
            filter: "blur(1px)",
          }}
        >
          <div style={{ fontSize: 8, color: "#D4A574", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 7, fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 500 }}>
            AI & Developer Tools
          </div>
          <div style={{ fontSize: 13, color: "#F5F2ED", lineHeight: 1.3, fontFamily: "var(--font-cormorant), Georgia, serif" }}>
            The gap in AI-native research tools for independent analysts
          </div>
          <div style={{ display: "flex", gap: 3, marginTop: 10 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: i <= 4 ? "#D4A574" : "rgba(245,242,237,0.14)" }} />
            ))}
          </div>
        </motion.div>

        {/* Lens question — right edge */}
        <motion.div
          initial={{ rotate: 9 }}
          animate={{ y: [0, 16, 0], rotate: [9, 7, 9] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -right-12 top-[30%] w-[190px]"
          style={{
            background: "#15151A",
            border: "1px solid rgba(245,242,237,0.08)",
            borderRadius: 14,
            padding: 16,
            opacity: 0.22,
            filter: "blur(1px)",
          }}
        >
          <div style={{ fontSize: 8, color: "#3DB87A", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 9, fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 500 }}>
            Step 3 · Wedge
          </div>
          <div style={{ fontSize: 13, color: "#F5F2ED", lineHeight: 1.35, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic" }}>
            Why would they switch to you?
          </div>
        </motion.div>

        {/* Covenant document — bottom right */}
        <motion.div
          initial={{ rotate: 5 }}
          animate={{ y: [0, -10, 0], rotate: [5, 7, 5] }}
          transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute right-[5%] bottom-[10%] w-[150px]"
          style={{
            background: "#FAF7F0",
            border: "1px solid rgba(212,165,116,0.18)",
            borderRadius: 4,
            padding: 14,
            opacity: 0.14,
            filter: "blur(1.5px)",
          }}
        >
          <div style={{ fontSize: 7, color: "#8B7E5C", textTransform: "uppercase", letterSpacing: "0.2em", textAlign: "center", marginBottom: 7, fontFamily: "var(--font-jakarta), sans-serif" }}>
            Builder&apos;s Covenant
          </div>
          <div style={{ height: 1, background: "#d4cdb8", marginBottom: 8 }} />
          <div style={{ fontSize: 10, color: "#3a3a3a", lineHeight: 1.4, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", textAlign: "center" }}>
            I commit, with full intention, for thirty days.
          </div>
        </motion.div>

        {/* Stats pill — bottom left */}
        <motion.div
          initial={{ rotate: -4 }}
          animate={{ y: [0, 8, 0], rotate: [-4, -6, -4] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute left-[4%] bottom-[18%]"
          style={{
            background: "rgba(61,184,122,0.08)",
            border: "1px solid rgba(61,184,122,0.2)",
            borderRadius: 100,
            padding: "8px 14px",
            opacity: 0.35,
            filter: "blur(0.5px)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3DB87A" }} />
          <span style={{ fontSize: 10, color: "#3DB87A", fontFamily: "var(--font-jakarta), sans-serif", fontWeight: 500, letterSpacing: "0.04em" }}>
            47 builders active
          </span>
        </motion.div>
      </div>

      {/* ── Layer 3: edge vignette ── */}
      <div
        className="absolute inset-0 z-[3] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 80% at center, transparent 40%, rgba(10,10,12,0.55) 100%)",
        }}
      />

      {/* ── Layer 4: main content ── */}
      <div className="relative z-[4] flex flex-col items-center text-center px-6 w-full max-w-[340px] mx-auto">

        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: SPRING }}
          className="flex items-center gap-2.5 mb-8"
        >
          <div className="w-1 h-1 rounded-full" style={{ background: "#3DB87A" }} />
          <span className="text-[10px] font-medium tracking-[0.22em] uppercase" style={{ color: "#5A5650" }}>
            Builder&apos;s Framework
          </span>
          <div className="w-1 h-1 rounded-full" style={{ background: "#3DB87A" }} />
        </motion.div>

        {/* AOS wordmark */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.08, ease: SPRING }}
          className="font-serif text-[#F5F2ED] select-none"
          style={{ fontSize: "clamp(80px, 22vw, 112px)", letterSpacing: "-0.05em", lineHeight: 1 }}
        >
          AOS
        </motion.h1>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.7, delay: 0.28 }}
          className="flex items-center gap-3 my-5 w-[180px]"
        >
          <div className="flex-1 h-px" style={{ background: "rgba(212,165,116,0.22)" }} />
          <div className="w-[5px] h-[5px] rotate-45 shrink-0" style={{ background: "#D4A574", opacity: 0.55 }} />
          <div className="flex-1 h-px" style={{ background: "rgba(212,165,116,0.22)" }} />
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.18, ease: SPRING }}
          className="font-serif italic tracking-[-0.02em] leading-tight"
          style={{ fontSize: "clamp(22px, 6vw, 28px)", color: "#D4A574" }}
        >
          Build with conviction.
        </motion.p>

        {/* Body */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.32, ease: SPRING }}
          className="text-[13px] leading-relaxed mt-4"
          style={{ color: "#8A8580", maxWidth: 260 }}
        >
          Curated opportunities. A framework for deciding.
          A 30-day sprint to ship.
        </motion.p>

        {/* Pill tags */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.42, ease: SPRING }}
          className="flex flex-wrap items-center justify-center gap-2 mt-6"
        >
          {PILLS.map((label) => (
            <span
              key={label}
              className="px-3 py-1 rounded-full text-[10px] font-medium tracking-[0.02em]"
              style={{
                background: "rgba(245,242,237,0.04)",
                border: "1px solid rgba(245,242,237,0.08)",
                color: "#5A5650",
              }}
            >
              {label}
            </span>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.52, ease: SPRING }}
          className="flex flex-col gap-3 w-full mt-10"
        >
          <Link
            href="/auth/signup"
            className="flex items-center justify-center gap-2 w-full py-[16px] rounded-[18px] text-[15px] font-semibold tracking-[-0.01em] transition-opacity hover:opacity-90"
            style={{ background: "#F5F2ED", color: "#0A0A0C" }}
          >
            Get started <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
          <Link
            href="/auth/login"
            className="flex items-center justify-center w-full py-[15px] rounded-[18px] text-[15px] font-medium tracking-[-0.01em] transition-opacity hover:opacity-70"
            style={{
              background: "transparent",
              color: "#8A8580",
              border: "1px solid rgba(245,242,237,0.08)",
            }}
          >
            Sign in
          </Link>
        </motion.div>

      </div>
    </main>
  );
}
