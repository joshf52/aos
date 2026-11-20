"use client";

import Link from "next/link";
import { useState } from "react";
import { config as kit } from "@/kit.config";

export default function PricingPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const res = await fetch("/api/interest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "Could not save your email. Try again in a moment.");
    } else {
      setSubmitted(true);
    }
    setBusy(false);
  }

  return (
    <main className="min-h-dvh bg-ink-bg">
      <nav className="px-6 pt-6 flex items-center justify-between max-w-3xl mx-auto">
        <Link href="/" className="font-serif text-[20px] tracking-[-0.02em]">{kit.brand.name}</Link>
        <Link href="/about" className="text-[13px] text-ink-secondary hover:text-ink-text transition-colors">
          About
        </Link>
      </nav>

      <section className="px-6 pt-20 pb-24 max-w-md mx-auto">
        <h1 className="font-serif text-[44px] leading-[1.05] tracking-[-0.025em] text-balance text-center">
          One price.
        </h1>
        <p className="font-serif italic text-[16px] text-ink-secondary text-center mt-3">
          {kit.pricing.oneLiner}
        </p>

        <div className="mt-10 p-8 rounded-[22px] bg-ink-surface border border-ink-border">
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-[56px] tracking-[-0.025em] text-gold-gradient">{kit.pricing.price}</span>
            <span className="text-[15px] text-ink-secondary">{kit.pricing.cadence}</span>
          </div>
          <p className="text-[14px] text-ink-secondary mt-2">{kit.brand.tagline}</p>

          {submitted ? (
            <div className="mt-7 p-4 rounded-[12px] bg-ink-elevated text-[14px]">
              <span style={{ color: "#D4A574" }}>You&apos;re on the list.</span>{" "}
              <span className="text-ink-secondary">We&apos;ll write when there&apos;s something to send.</span>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-7 flex flex-col gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@work.com"
                className="px-4 py-3 rounded-[12px] bg-ink-elevated border border-ink-border text-[15px] outline-none focus:border-ink-gold/50"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 rounded-[12px] bg-ink-text text-ink-bg text-[14px] font-semibold tracking-[-0.01em] disabled:opacity-60"
              >
                {busy ? "Saving…" : kit.pricing.ctaLabel}
              </button>
              {err && <div className="text-[12px] text-red-300">{err}</div>}
            </form>
          )}
        </div>

        <p className="text-center text-[12px] text-ink-tertiary mt-6">
          Not selling yet. We&apos;ll email you when it&apos;s ready.
        </p>
      </section>
    </main>
  );
}
