"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";

const QUESTIONS = [
  {
    num: 1,
    label: "Customer",
    q: "Who exactly is the customer?",
    hint: "Be specific. Name them.",
  },
  {
    num: 2,
    label: "Today",
    q: "What are they doing today instead?",
    hint: "The current solution — even if it's suffering.",
  },
  {
    num: 3,
    label: "Wedge",
    q: "Why would they switch to you?",
    hint: "The compelling reason to change.",
  },
  {
    num: 4,
    label: "Test",
    q: "What's the smallest test you can ship?",
    hint: "Not the full product. The minimum version.",
  },
  {
    num: 5,
    label: "Success",
    q: "What does success look like in 30 days?",
    hint: "Specific. Measurable. Real.",
  },
] as const;

// 2π × r=13 ≈ 81.68
const CIRC = 81.68;

export function LensContent({
  lensId,
  opportunityTitle,
  initialStep,
  initialAnswers,
  saveStep,
  completeLens,
}: {
  lensId: string;
  opportunityTitle: string;
  initialStep: number;
  initialAnswers: string[];
  saveStep: (lensId: string, step: number, answer: string) => Promise<void>;
  completeLens: (lensId: string, answers: string[]) => Promise<string>;
}) {
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 1), 5));
  const [answers, setAnswers] = useState<string[]>(initialAnswers);
  const [completing, setCompleting] = useState(false);
  const router = useRouter();

  const current = QUESTIONS[step - 1];
  const currentAnswer = answers[step - 1] ?? "";
  const canAdvance = currentAnswer.trim().length > 0;

  const progress = ((step - 1 + (canAdvance ? 0.5 : 0)) / 5) * 100;
  const dashLength = (progress / 100) * CIRC;

  function setAnswer(value: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[step - 1] = value;
      return next;
    });
  }

  function handleBack() {
    if (step === 1) {
      router.back();
    } else {
      setStep((s) => s - 1);
    }
  }

  async function handleNext() {
    if (!canAdvance || completing) return;

    if (step < 5) {
      // Save current answer in background; advance immediately
      saveStep(lensId, step, currentAnswer).catch(() => {});
      setStep((s) => s + 1);
    } else {
      setCompleting(true);
      try {
        const commitmentId = await completeLens(lensId, answers);
        if (commitmentId) {
          router.push(`/commit/${commitmentId}/ceremony`);
        } else {
          router.push("/feed");
        }
      } catch {
        setCompleting(false);
      }
    }
  }

  return (
    <main className="min-h-dvh bg-aos-bg flex flex-col px-6 pt-16 pb-8">
      <div className="max-w-sm mx-auto w-full flex flex-col flex-1">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-7">
          <button
            onClick={handleBack}
            aria-label={step === 1 ? "Close" : "Previous question"}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ background: "#15151A", border: "1px solid var(--aos-border)" }}
          >
            {step === 1 ? (
              <X size={16} color="#F5F2ED" strokeWidth={2} />
            ) : (
              <ArrowLeft size={16} color="#F5F2ED" strokeWidth={2} />
            )}
          </button>

          <div className="flex items-center gap-2.5">
            {/* Progress arc */}
            <svg
              width="32"
              height="32"
              style={{ transform: "rotate(-90deg)" }}
              aria-hidden
            >
              <circle
                cx="16"
                cy="16"
                r="13"
                stroke="rgba(245,242,237,0.12)"
                strokeWidth="2"
                fill="none"
              />
              <motion.circle
                cx="16"
                cy="16"
                r="13"
                stroke="#3DB87A"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                animate={{ strokeDasharray: `${dashLength} ${CIRC + 10}` }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
            <span className="text-[13px] text-aos-secondary font-medium tabular-nums">
              {step}
              <span className="opacity-40"> / 5</span>
            </span>
          </div>
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="text-[11px] uppercase tracking-[0.14em] font-medium mb-3.5" style={{ color: "#D4A574" }}>
              Step {current.num} · {current.label}
            </div>
            <h1 className="font-serif text-[30px] text-aos-text tracking-[-0.02em] leading-[1.15] mb-2.5">
              {current.q}
            </h1>
            <p className="text-sm text-aos-secondary italic leading-relaxed">
              {current.hint}
            </p>
            {opportunityTitle && (
              <p className="text-[11px] text-aos-tertiary mt-2 tracking-[-0.01em]">
                Re: {opportunityTitle}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Textarea */}
        <div className="flex-1 flex flex-col mt-7 min-h-0">
          <textarea
            key={step}
            autoFocus
            value={currentAnswer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer…"
            className="w-full min-h-[160px] max-h-[280px] flex-1 rounded-[18px] p-[18px] text-aos-text text-base leading-relaxed resize-none outline-none placeholder:text-aos-tertiary font-sans"
            style={{
              background: "#15151A",
              border: "1px solid var(--aos-border)",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "rgba(245,242,237,0.18)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--aos-border)";
            }}
          />
        </div>

        {/* CTA */}
        <div className="mt-4 shrink-0">
          <motion.button
            onClick={handleNext}
            disabled={!canAdvance || completing}
            whileTap={canAdvance ? { scale: 0.98 } : {}}
            className="flex items-center justify-center gap-2 w-full py-[17px] rounded-[18px] text-base font-semibold tracking-[-0.01em] transition-all duration-300"
            style={{
              background: !canAdvance || completing ? "#1C1C22" : "#F5F2ED",
              color: !canAdvance || completing ? "#5A5650" : "#0A0A0C",
              cursor: !canAdvance || completing ? "not-allowed" : "pointer",
            }}
          >
            {completing ? (
              "Sealing your commitment…"
            ) : step === 5 ? (
              <>
                Complete evaluation <Check size={17} strokeWidth={2.5} />
              </>
            ) : (
              <>
                Continue <ArrowRight size={17} strokeWidth={2.5} />
              </>
            )}
          </motion.button>
        </div>

      </div>
    </main>
  );
}
