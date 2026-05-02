"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Clock, MessageSquare, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";

const SPRING = [0.22, 1, 0.36, 1] as const;
const POP = [0.22, 1.5, 0.36, 1] as const;

const DELIVERABLES = [
  "Working MVP with your core wedge",
  "Landing page to validate demand",
  "Deployment guide to go live",
  "README with context and next steps",
];

const STEPS = [
  { icon: Clock, label: "Architecture review", sub: "We'll send you a plan within 24 hours to approve." },
  { icon: Rocket, label: "Build begins", sub: "AI constructs your MVP based on your lens inputs." },
  { icon: MessageSquare, label: "You review & ship", sub: "One round of changes, then it's yours." },
];

export function AIBuildContent({
  opportunityTitle,
  answers,
}: {
  opportunityTitle: string;
  answers: string[];
}) {
  const router = useRouter();

  return (
    <main className="min-h-dvh bg-aos-bg">
      <div className="px-6 pt-16 pb-28 max-w-lg mx-auto">

        {/* Trial badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: POP }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
          style={{
            background: "rgba(212, 165, 116, 0.1)",
            border: "1px solid rgba(212, 165, 116, 0.3)",
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#D4A574]" />
          <span className="text-[11px] font-medium tracking-[0.08em] uppercase" style={{ color: "#D4A574" }}>
            Free Trial Active
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: SPRING }}
          className="font-serif text-[40px] text-aos-text tracking-[-0.03em] leading-[1.05]"
        >
          Your build is queued.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18, ease: SPRING }}
          className="font-serif italic text-[16px] text-aos-secondary leading-relaxed mt-3"
        >
          We&apos;ve received your commitment. The AI is reviewing your lens
          inputs and will begin building{" "}
          <span style={{ color: "#D4A574" }}>{opportunityTitle}</span> within
          24 hours.
        </motion.p>

        {/* What we'll build */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.26, ease: SPRING }}
          className="mt-8 p-5 rounded-[20px]"
          style={{
            background: "#15151A",
            border: "1px solid var(--aos-border)",
          }}
        >
          <div className="text-[11px] text-aos-tertiary uppercase tracking-[0.14em] font-medium mb-4">
            What we&apos;ll build
          </div>
          <div className="flex flex-col gap-3">
            {DELIVERABLES.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" style={{ color: "#3DB87A" }} strokeWidth={2} />
                <span className="text-[14px] text-aos-text leading-snug">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* What happens next */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.34, ease: SPRING }}
          className="mt-4"
        >
          <div className="text-[11px] text-aos-tertiary uppercase tracking-[0.14em] font-medium mb-3.5">
            What happens next
          </div>
          <div className="flex flex-col gap-2">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-3.5 p-4 rounded-[16px]"
                style={{
                  background: "#15151A",
                  border: "1px solid var(--aos-border)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
                  style={{ background: "#1C1C22" }}
                >
                  <step.icon size={15} style={{ color: "#D4A574" }} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-[14px] text-aos-text font-medium tracking-[-0.01em]">
                    {step.label}
                  </div>
                  <div className="text-[12px] text-aos-secondary mt-0.5 leading-snug">
                    {step.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Your inputs */}
        {answers.some(Boolean) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.42, ease: SPRING }}
            className="mt-4 p-5 rounded-[20px]"
            style={{
              background: "#15151A",
              border: "1px solid var(--aos-border)",
            }}
          >
            <div className="text-[11px] text-aos-tertiary uppercase tracking-[0.14em] font-medium mb-3.5">
              Your strategic inputs
            </div>
            <div className="flex flex-col gap-3">
              {[
                "Customer",
                "Today",
                "Wedge",
                "Test",
                "Success",
              ].map((label, i) =>
                answers[i] ? (
                  <div key={i}>
                    <div className="text-[10px] uppercase tracking-[0.12em] font-medium mb-1" style={{ color: "#D4A574" }}>
                      {label}
                    </div>
                    <p className="font-serif italic text-[13px] text-aos-secondary leading-snug">
                      &ldquo;{answers[i]}&rdquo;
                    </p>
                  </div>
                ) : null
              )}
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: SPRING }}
          onClick={() => router.push("/dashboard")}
          whileTap={{ scale: 0.98 }}
          className="mt-7 flex items-center justify-center gap-2 w-full py-[17px] rounded-[18px] text-base font-semibold tracking-[-0.01em]"
          style={{ background: "#F5F2ED", color: "#0A0A0C" }}
        >
          Track your build <ArrowRight size={17} strokeWidth={2.5} />
        </motion.button>

      </div>
    </main>
  );
}
