"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Clock, MessageSquare, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { AOSAnimatedBackground } from "@/components/aos/animated-background";
import { AOSDepthCard } from "@/components/aos/depth-card";
import { BuildPathConstellation } from "@/components/aos/build-path-constellation";
import { MilestoneRail } from "@/components/aos/milestone-rail";

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
    <main className="relative min-h-dvh bg-aos-bg overflow-hidden">
      <AOSAnimatedBackground variant="command" grain className="absolute inset-0 z-0" />

      <div className="relative z-[1] px-6 pt-16 pb-28 max-w-lg mx-auto">

        {/* Trial badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: POP }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 bg-aos-gold/10 border border-aos-gold/30"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-aos-gold" />
          <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-aos-gold">
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
          <span className="text-aos-gold">{opportunityTitle}</span> within
          24 hours.
        </motion.p>

        {/* Inputs becoming a system */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.24, ease: SPRING }}
          className="mt-8"
        >
          <div className="text-[11px] text-aos-tertiary uppercase tracking-[0.14em] font-medium mb-3 font-mono">
            Your lens, becoming a system
          </div>
          <BuildPathConstellation modules={DELIVERABLES} intensity={0.85} />
        </motion.div>

        {/* What we'll build */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.32, ease: SPRING }}
          className="mt-4"
        >
          <AOSDepthCard glow="green" intensity="subtle" className="p-5">
            <div className="text-[11px] text-aos-tertiary uppercase tracking-[0.14em] font-medium mb-4">
              What we&apos;ll build
            </div>
            <div className="flex flex-col gap-3">
              {DELIVERABLES.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-aos-accent" strokeWidth={2} />
                  <span className="text-[14px] text-aos-text leading-snug">{item}</span>
                </div>
              ))}
            </div>
          </AOSDepthCard>
        </motion.div>

        {/* What happens next */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: SPRING }}
          className="mt-6"
        >
          <div className="text-[11px] text-aos-tertiary uppercase tracking-[0.14em] font-medium mb-4">
            What happens next
          </div>

          <MilestoneRail
            steps={STEPS.map((step, i) => ({
              label: step.label,
              status: i === 0 ? "active" : "upcoming",
            }))}
            className="mb-5"
          />

          <div className="flex flex-col gap-2">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-3.5 p-4 rounded-[16px] bg-aos-surface border border-aos-border"
              >
                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 bg-aos-elevated">
                  <step.icon size={15} className="text-aos-gold" strokeWidth={1.5} />
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
            transition={{ duration: 0.6, delay: 0.48, ease: SPRING }}
            className="mt-4"
          >
            <AOSDepthCard glow="gold" intensity="subtle" className="p-5">
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
                      <div className="text-[10px] uppercase tracking-[0.12em] font-medium mb-1 text-aos-gold">
                        {label}
                      </div>
                      <p className="font-serif italic text-[13px] text-aos-secondary leading-snug">
                        &ldquo;{answers[i]}&rdquo;
                      </p>
                    </div>
                  ) : null
                )}
              </div>
            </AOSDepthCard>
          </motion.div>
        )}

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.56, ease: SPRING }}
          onClick={() => router.push("/dashboard")}
          whileTap={{ scale: 0.98 }}
          className="mt-7 flex items-center justify-center gap-2 w-full py-[17px] rounded-[18px] text-base font-semibold tracking-[-0.01em] bg-aos-text text-aos-bg"
        >
          Track your build <ArrowRight size={17} strokeWidth={2.5} />
        </motion.button>

      </div>
    </main>
  );
}
