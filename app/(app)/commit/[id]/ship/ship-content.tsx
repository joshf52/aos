"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GoldSeal } from "@/components/ui/gold-seal";

const SPRING = [0.22, 1, 0.36, 1] as const;
const POP = [0.22, 1.5, 0.36, 1] as const;

export function ShipContent({
  commitmentId,
  opportunityTitle,
  capability,
  daysIn,
  markShipped,
}: {
  commitmentId: string;
  opportunityTitle: string;
  capability: string;
  daysIn: number;
  markShipped: (formData: FormData) => Promise<void>;
}) {
  const [phase, setPhase] = useState<"form" | "stamping" | "shipped">("form");
  const [url, setUrl] = useState("");
  const [reflection, setReflection] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const canSubmit =
    /^https?:\/\/.+\..+/.test(url.trim()) && reflection.trim().length >= 12;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setPhase("stamping");

    const fd = new FormData();
    fd.set("commitmentId", commitmentId);
    fd.set("url", url.trim());
    fd.set("reflection", reflection.trim());

    try {
      await markShipped(fd);
    } catch {
      // ignore — server action redirects on validation failures
    }
  }

  // Move from stamping to shipped after a beat
  useEffect(() => {
    if (phase === "stamping") {
      const t = window.setTimeout(() => setPhase("shipped"), 2200);
      return () => window.clearTimeout(t);
    }
  }, [phase]);

  return (
    <main
      className="min-h-dvh relative overflow-hidden flex flex-col"
      style={{ background: "#0A0A0C" }}
    >
      {/* Atmospheric layers */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          opacity: 0.028,
        }}
      />

      <motion.div
        animate={{ opacity: phase === "form" ? 0.4 : 1 }}
        transition={{ duration: 1.2 }}
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 30%, rgba(212,165,116,0.16) 0%, transparent 65%)",
        }}
      />
      <motion.div
        animate={{ opacity: phase === "shipped" ? 1 : 0 }}
        transition={{ duration: 1.6 }}
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 100% 80% at 50% 60%, rgba(212,165,116,0.10) 0%, transparent 70%)",
        }}
      />

      <AnimatePresence mode="wait">
        {phase === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 flex flex-col flex-1 px-6 pt-14 pb-8 max-w-md mx-auto w-full"
          >
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full flex items-center justify-center mb-8 transition-opacity hover:opacity-70"
              style={{
                background: "#15151A",
                border: "1px solid rgba(245,242,237,0.08)",
              }}
              aria-label="Back"
            >
              <ArrowLeft size={16} color="#8A8580" strokeWidth={2} />
            </button>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: SPRING }}
            >
              <div
                className="text-[10px] uppercase tracking-[0.2em] font-medium mb-3"
                style={{ color: "#D4A574" }}
              >
                Day {daysIn} · Closing the loop
              </div>
              <h1
                className="font-serif text-aos-text tracking-[-0.025em] leading-[1.1]"
                style={{ fontSize: "clamp(32px, 8vw, 42px)" }}
              >
                You shipped.
              </h1>
              <p
                className="font-serif italic mt-3 leading-relaxed"
                style={{ color: "#8A8580", fontSize: 15 }}
              >
                Mark this sprint complete. The covenant gets sealed.
              </p>
            </motion.div>

            <form onSubmit={handleSubmit} className="mt-9 flex flex-col gap-5">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.16em] font-medium mb-2" style={{ color: "#5A5650" }}>
                  Where can it be seen?
                </label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://"
                  autoFocus
                  className="w-full rounded-[16px] p-4 text-[15px] text-aos-text outline-none placeholder:text-aos-tertiary"
                  style={{
                    background: "rgba(21,21,26,0.8)",
                    border: "1px solid rgba(245,242,237,0.07)",
                    fontFamily: "var(--font-jakarta), system-ui, sans-serif",
                    caretColor: "#3DB87A",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(245,242,237,0.18)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(245,242,237,0.07)"; }}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.16em] font-medium mb-2" style={{ color: "#5A5650" }}>
                  What did you learn?
                </label>
                <p className="font-serif italic text-[13px] leading-snug mb-2.5" style={{ color: "#5A5650" }}>
                  One sentence. The thing you&rsquo;d tell your past self on day one.
                </p>
                <textarea
                  required
                  rows={4}
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="The customer wasn't who I thought…"
                  className="w-full rounded-[16px] p-4 text-[15px] text-aos-text leading-relaxed resize-none outline-none placeholder:text-aos-tertiary"
                  style={{
                    background: "rgba(21,21,26,0.8)",
                    border: "1px solid rgba(245,242,237,0.07)",
                    fontFamily: "var(--font-jakarta), system-ui, sans-serif",
                    caretColor: "#3DB87A",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(245,242,237,0.18)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(245,242,237,0.07)"; }}
                />
              </div>

              <motion.button
                type="submit"
                disabled={!canSubmit || submitting}
                whileTap={canSubmit ? { scale: 0.98 } : {}}
                className="mt-2 flex items-center justify-center gap-2 w-full py-[17px] rounded-[18px] text-[16px] font-semibold tracking-[-0.01em] focus-gold transition-[filter] enabled:hover:brightness-110"
                style={{
                  background: !canSubmit || submitting ? "#1C1C22" : "linear-gradient(180deg, #E8BD8E 0%, #B8895A 100%)",
                  color: !canSubmit || submitting ? "#3A3A42" : "#1a1208",
                  cursor: !canSubmit || submitting ? "not-allowed" : "pointer",
                  boxShadow: !canSubmit || submitting ? "none" : "0 0 0 1px rgba(212,165,116,0.3) inset, 0 12px 30px rgba(212,165,116,0.18)",
                  transition: "background 0.3s",
                }}
              >
                {submitting ? "Sealing…" : <>Stamp it shipped <Sparkles size={15} strokeWidth={2.5} /></>}
              </motion.button>
            </form>
          </motion.div>
        )}

        {phase === "stamping" && (
          <motion.div
            key="stamping"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 flex flex-col items-center justify-center flex-1 px-6"
          >
            <motion.div
              initial={{ scale: 6, opacity: 0, rotate: -25, y: -120 }}
              animate={{ scale: 1, opacity: 1, rotate: 0, y: 0 }}
              transition={{ duration: 0.7, ease: POP }}
            >
              <GoldSeal size={140} letter="A" />
            </motion.div>
            {/* Impact ring */}
            <motion.div
              initial={{ scale: 0.4, opacity: 0.5 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
              className="absolute w-[140px] h-[140px] rounded-full pointer-events-none"
              style={{
                border: "1px solid rgba(212,165,116,0.6)",
              }}
            />
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.0 }}
              className="font-serif italic mt-10"
              style={{ color: "#8A8580", fontSize: 16 }}
            >
              Sealed.
            </motion.p>
          </motion.div>
        )}

        {phase === "shipped" && (
          <motion.div
            key="shipped"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: SPRING }}
            className="relative z-10 flex flex-col flex-1 px-6 pt-14 pb-10 max-w-md mx-auto w-full"
          >
            {/* Big seal */}
            <div className="flex justify-center mb-8">
              <GoldSeal size={92} letter="A" />
            </div>

            <div
              className="text-center text-[10px] uppercase tracking-[0.24em] font-medium mb-3"
              style={{ color: "#D4A574" }}
            >
              Shipped
            </div>

            {capability && (
              <div className="text-center text-[11px] text-aos-tertiary uppercase tracking-[0.14em] mb-3">
                {capability}
              </div>
            )}

            <h1
              className="text-center font-serif text-aos-text tracking-[-0.03em] leading-[1.05]"
              style={{ fontSize: "clamp(28px, 7vw, 36px)" }}
            >
              {opportunityTitle}.
            </h1>

            {/* Reflection quote */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: SPRING }}
              className="mt-9 px-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ background: "rgba(212,165,116,0.18)" }} />
                <div className="w-1 h-1 rotate-45" style={{ background: "#D4A574" }} />
                <div className="flex-1 h-px" style={{ background: "rgba(212,165,116,0.18)" }} />
              </div>
              <p
                className="font-serif italic text-center leading-[1.5]"
                style={{ color: "#F5F2ED", fontSize: 17 }}
              >
                &ldquo;{reflection}&rdquo;
              </p>
              <div className="flex items-center gap-3 mt-4">
                <div className="flex-1 h-px" style={{ background: "rgba(212,165,116,0.18)" }} />
                <div className="w-1 h-1 rotate-45" style={{ background: "#D4A574" }} />
                <div className="flex-1 h-px" style={{ background: "rgba(212,165,116,0.18)" }} />
              </div>
            </motion.div>

            {/* URL pill */}
            <motion.a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45, ease: SPRING }}
              className="mt-7 mx-auto flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium transition-opacity hover:opacity-80"
              style={{
                background: "rgba(245,242,237,0.05)",
                border: "1px solid rgba(245,242,237,0.10)",
                color: "#F5F2ED",
                maxWidth: "fit-content",
              }}
            >
              <span className="truncate max-w-[260px]">{url.replace(/^https?:\/\//, "")}</span>
              <ExternalLink size={12} strokeWidth={2} />
            </motion.a>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              className="mt-9 flex justify-center gap-10"
            >
              <Stat label="Days" value={daysIn} />
              <Stat label="Sprint" value="1 / 1" />
            </motion.div>

            <div className="flex-1" />

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8, ease: SPRING }}
              className="mt-12"
            >
              <Link
                href="/feed"
                className="flex items-center justify-center gap-2 w-full py-[17px] rounded-[18px] text-[16px] font-semibold tracking-[-0.01em] transition-opacity hover:opacity-90"
                style={{ background: "#F5F2ED", color: "#0A0A0C" }}
              >
                See what&apos;s next <ArrowRight size={17} strokeWidth={2.5} />
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-[0.14em] font-medium mb-1" style={{ color: "#5A5650" }}>
        {label}
      </div>
      <div className="text-[24px] text-aos-text font-medium tracking-[-0.03em] tabular-nums leading-none">
        {value}
      </div>
    </div>
  );
}
