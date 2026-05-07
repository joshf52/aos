"use client";

import Link from "next/link";
import { useTransition } from "react";
import { motion } from "framer-motion";

const SPRING = [0.22, 1, 0.36, 1] as const;

const BENEFITS = [
  {
    title: "Three concurrent sprints",
    body: "Run more than one bet at a time when your judgment outpaces your bandwidth.",
  },
  {
    title: "Priority on new opportunities",
    body: "First look as fresh signals land in the catalog each week.",
  },
  {
    title: "AI Build expanded access",
    body: "If you switch to AI-build mode, Pro covers the longer-running builds.",
  },
];

export function UpgradeContent({
  priceUsd,
  canceled,
  startCheckout,
}: {
  priceUsd: number;
  canceled: boolean;
  startCheckout: () => Promise<void>;
}) {
  const [pending, start] = useTransition();

  return (
    <main className="min-h-dvh bg-aos-bg text-aos-text relative overflow-hidden">
      {/* Ambient gold + emerald glow */}
      <div
        aria-hidden
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(212,165,116,0.16) 0%, transparent 65%)",
          filter: "blur(60px)",
        }}
      />
      <div
        aria-hidden
        className="absolute bottom-[-120px] right-[-80px] w-[360px] h-[360px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(61,184,122,0.07) 0%, transparent 60%)",
          filter: "blur(50px)",
        }}
      />

      <div className="relative z-10 max-w-xl mx-auto px-6 pt-16 pb-24">
        <Link
          href="/feed"
          className="text-[12px] uppercase tracking-[0.14em] text-aos-secondary hover:text-aos-text transition-colors"
        >
          ← Back
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: SPRING }}
          className="mt-10"
        >
          <div className="text-[11px] uppercase tracking-[0.18em] font-medium" style={{ color: "#D4A574" }}>
            Pro
          </div>
          <h1 className="font-serif text-[44px] tracking-[-0.035em] leading-[1.05] mt-2">
            Run more than one bet.
          </h1>
          <p className="font-serif italic text-aos-secondary text-[16px] mt-4 leading-relaxed">
            For when one sprint isn&rsquo;t enough &mdash; and you&rsquo;ve earned
            the right to run several at once.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: SPRING }}
          className="mt-10 p-7 rounded-[24px] relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #1E1E26 0%, #15151A 55%, #12121A 100%)",
            border: "1px solid rgba(212,165,116,0.18)",
            boxShadow: "0 0 0 1px rgba(212,165,116,0.05), 0 24px 48px rgba(0,0,0,0.35)",
          }}
        >
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-[56px] tracking-[-0.04em] leading-none tabular-nums">
              ${priceUsd}
            </span>
            <span className="text-aos-secondary text-[15px]">/ month</span>
          </div>
          <div className="text-[11px] uppercase tracking-[0.16em] font-medium text-aos-tertiary mt-2">
            Cancel anytime
          </div>

          <ul className="mt-6 space-y-4">
            {BENEFITS.map((b) => (
              <li key={b.title}>
                <div className="font-serif text-[17px] tracking-[-0.02em] text-aos-text leading-snug">
                  {b.title}
                </div>
                <div className="text-[13px] text-aos-secondary mt-1 leading-relaxed">
                  {b.body}
                </div>
              </li>
            ))}
          </ul>

          <form
            action={() => {
              start(() => startCheckout());
            }}
          >
            <button
              type="submit"
              disabled={pending}
              className="w-full mt-8 py-4 rounded-full text-[14px] font-semibold tracking-[-0.01em] transition-all disabled:opacity-60"
              style={{ background: "#D4A574", color: "#0A0A0C" }}
            >
              {pending ? "Opening Stripe…" : "Continue to Stripe"}
            </button>
          </form>

          {canceled && (
            <p className="text-[12px] text-aos-tertiary text-center mt-3">
              Checkout canceled. No charge was made.
            </p>
          )}
        </motion.div>

        <p className="text-[11px] text-aos-tertiary mt-6 text-center leading-relaxed">
          Payment handled by Stripe. AOS never sees your card details.
        </p>
      </div>
    </main>
  );
}
