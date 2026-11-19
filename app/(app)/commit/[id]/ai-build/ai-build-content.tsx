"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Clock, ExternalLink, MessageSquare, RefreshCw, Rocket } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AOSAnimatedBackground } from "@/components/aos/animated-background";
import { AOSDepthCard } from "@/components/aos/depth-card";
import { BuildPathConstellation } from "@/components/aos/build-path-constellation";
import { MilestoneRail } from "@/components/aos/milestone-rail";
import type { AiBuildStatus } from "@/types/database";

const SPRING = [0.22, 1, 0.36, 1] as const;
const POP = [0.22, 1.5, 0.36, 1] as const;

// How often an in-progress build re-checks its status (server re-render).
const STATUS_POLL_MS = 15_000;

const DELIVERABLES = [
  "Working MVP with your core wedge",
  "Landing page to validate demand",
  "Deployment guide to go live",
  "README with context and next steps",
];

const STEPS = [
  { icon: Clock, label: "Architecture review", sub: "Read the plan and approve it. Nothing is built before you do." },
  { icon: Rocket, label: "Build begins", sub: "Once you approve, we deploy a working first version from your lens." },
  { icon: MessageSquare, label: "You review & ship", sub: "One round of changes, then it's yours." },
];

type BuildSummary = { status: AiBuildStatus; deploymentUrl: string | null; error: string | null };

// One phase drives the heading, copy, status card, rail and bottom action.
// `pending` means a plan exists but the user hasn't approved it yet.
type Phase = "review" | "queued" | "building" | "live" | "failed";

function phaseOf(build: BuildSummary | null): Phase {
  if (!build || build.status === "pending") return "review";
  if (build.status === "approved") return "queued";
  return build.status;
}

// Which STEPS index is current. A failed build stays on "Build begins" so the
// rail shows where it stalled rather than pretending it advanced.
const ACTIVE_STEP: Record<Phase, number> = { review: 0, queued: 1, building: 1, failed: 1, live: 2 };

const HEADING: Record<Phase, string> = {
  review: "Your plan is ready to review.",
  queued: "Your build is queued.",
  building: "Building now.",
  live: "Your build is live.",
  failed: "The build stalled.",
};

export function AIBuildContent({
  commitmentId,
  opportunityTitle,
  answers,
  build,
}: {
  commitmentId: string;
  opportunityTitle: string;
  answers: string[];
  build: BuildSummary | null;
}) {
  const router = useRouter();
  const phase = phaseOf(build);
  const activeStep = ACTIVE_STEP[phase];
  // Only an active deploy advances on its own. (The server shows a deploy
  // stuck past STALE_BUILD_MS as failed, which ends the polling.)
  const polling = phase === "building";
  const architectureHref = `/commit/${commitmentId}/ai-build/architecture`;

  // While a build is in flight this page is the status view: re-fetch the
  // server component so the latest ai_builds row shows without a manual reload.
  useEffect(() => {
    if (!polling) return;
    const id = window.setInterval(() => router.refresh(), STATUS_POLL_MS);
    return () => window.clearInterval(id);
  }, [polling, router]);

  const title = <span className="text-aos-gold">{opportunityTitle}</span>;

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
          {HEADING[phase]}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18, ease: SPRING }}
          className="font-serif italic text-[16px] text-aos-secondary leading-relaxed mt-3"
        >
          {phase === "review" ? (
            <>
              Nothing gets built until you approve it. Read the plan for {title},
              rewrite anything that doesn&apos;t sound like your idea, then hold to begin.
            </>
          ) : phase === "queued" ? (
            <>You approved the plan for {title}. The live link appears here once the deploy finishes.</>
          ) : phase === "building" ? (
            <>We&apos;re deploying {title} now. This page checks in on its own, and the live link appears here.</>
          ) : phase === "live" ? (
            <>Open it, try the workflow, then share the link.</>
          ) : (
            <>Something broke during deployment. The details are below.</>
          )}
        </motion.p>

        {/* Build status — once the plan is approved. */}
        {phase !== "review" && build && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22, ease: SPRING }}
            role="status"
            aria-live="polite"
            className={
              "mt-6 p-5 rounded-[18px] border " +
              (phase === "live"
                ? "bg-aos-surface border-aos-gold/[0.35]"
                : phase === "failed"
                ? "bg-[rgba(255,80,80,0.06)] border-[rgba(255,80,80,0.30)]"
                : "bg-aos-surface border-aos-border")
            }
          >
            {phase === "live" && build.deploymentUrl ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-aos-gold">
                    Live URL
                  </div>
                  <div className="font-mono text-[13px] text-aos-text mt-1 truncate">
                    {build.deploymentUrl}
                  </div>
                </div>
                <Link
                  href={build.deploymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-gold inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-aos-text text-aos-bg text-[12px] font-semibold shrink-0"
                >
                  Open <ExternalLink size={12} strokeWidth={2.5} />
                </Link>
              </div>
            ) : phase === "failed" ? (
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-red-300">Error</div>
                <p className="text-[13px] text-aos-text mt-1 leading-snug">{build.error ?? "Unknown error."}</p>
              </div>
            ) : phase === "live" ? (
              <div className="text-[13px] text-aos-secondary">Live, but the link hasn&apos;t come through yet. Check again in a moment.</div>
            ) : (
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-aos-secondary">
                  {phase === "queued" ? "Queued" : "Deploying"}
                </div>
                <p className="text-[13px] text-aos-secondary mt-1 leading-snug">
                  {phase === "building"
                    ? "Plan approved. This page checks the build every 15 seconds."
                    : "Plan approved. Check the build status below for the latest."}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Approval CTA — before the plan is approved. */}
        {phase === "review" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22, ease: SPRING }}
            className="mt-7"
          >
            <Link
              href={architectureHref}
              className="focus-gold inline-flex items-center gap-2 px-5 py-3 rounded-[14px] text-[14px] font-semibold tracking-[-0.01em] bg-aos-gold/10 border border-aos-gold/[0.35] text-aos-gold hover:bg-aos-gold/[0.16] transition-colors"
            >
              Review the architecture <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
          </motion.div>
        )}

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
          <BuildPathConstellation modules={DELIVERABLES} intensity={0.85} layout="stacked" />
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
              status: i < activeStep ? "done" : i === activeStep ? "active" : "upcoming",
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

        {/* Primary action — the next step for this phase, not an unrelated dashboard. */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.56, ease: SPRING }}
          whileTap={{ scale: 0.98 }}
          className="mt-7"
        >
          {phase === "review" || phase === "failed" ? (
            <Link href={architectureHref} className={PRIMARY}>
              {phase === "review" ? "Review and approve the plan" : "Review the plan and try again"}
              <ArrowRight size={17} strokeWidth={2.5} />
            </Link>
          ) : phase === "live" && build?.deploymentUrl ? (
            <Link href={build.deploymentUrl} target="_blank" rel="noopener noreferrer" className={PRIMARY}>
              Open your app <ExternalLink size={16} strokeWidth={2.5} />
            </Link>
          ) : (
            <button type="button" onClick={() => router.refresh()} className={PRIMARY}>
              Check build status <RefreshCw size={16} strokeWidth={2.5} />
            </button>
          )}
        </motion.div>

      </div>
    </main>
  );
}

const PRIMARY =
  "flex items-center justify-center gap-2 w-full py-[17px] rounded-[18px] text-base font-semibold tracking-[-0.01em] bg-aos-text text-aos-bg";
