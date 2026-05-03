"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";

const QUESTIONS = [
  {
    num: 1,
    label: "Customer",
    q: "Who exactly is\nthe customer?",
    hint: "Be specific. Name them.",
    accent: "rgba(61,184,122,0.06)",
  },
  {
    num: 2,
    label: "Today",
    q: "What are they doing\ntoday instead?",
    hint: "The current solution — even if it's suffering.",
    accent: "rgba(212,165,116,0.05)",
  },
  {
    num: 3,
    label: "Wedge",
    q: "Why would they\nswitch to you?",
    hint: "The compelling reason to change.",
    accent: "rgba(61,184,122,0.06)",
  },
  {
    num: 4,
    label: "Test",
    q: "What's the smallest\ntest you can ship?",
    hint: "Not the full product. The minimum version.",
    accent: "rgba(212,165,116,0.05)",
  },
  {
    num: 5,
    label: "Success",
    q: "What does success\nlook like in 30 days?",
    hint: "Specific. Measurable. Real.",
    accent: "rgba(61,184,122,0.06)",
  },
] as const;

const CIRC = 81.68;
const SPRING = [0.22, 1, 0.36, 1] as const;

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
    if (step === 1) router.back();
    else setStep((s) => s - 1);
  }

  async function handleNext() {
    if (!canAdvance || completing) return;
    if (step < 5) {
      saveStep(lensId, step, currentAnswer).catch(() => {});
      setStep((s) => s + 1);
    } else {
      setCompleting(true);
      try {
        const commitmentId = await completeLens(lensId, answers);
        router.push(commitmentId ? `/commit/${commitmentId}/ceremony` : "/feed");
      } catch {
        setCompleting(false);
      }
    }
  }

  return (
    <main className="min-h-dvh bg-aos-bg flex flex-col relative overflow-hidden">

      {/* Per-question ambient glow */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${current.accent} 0%, transparent 100%)`,
          }}
        />
      </AnimatePresence>

      <div className="relative z-10 flex flex-col flex-1 px-6 pt-14 pb-8 max-w-sm mx-auto w-full">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={handleBack}
            aria-label={step === 1 ? "Close" : "Previous"}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ background: "#15151A", border: "1px solid rgba(245,242,237,0.08)" }}
          >
            {step === 1
              ? <X size={15} color="#8A8580" strokeWidth={2} />
              : <ArrowLeft size={15} color="#8A8580" strokeWidth={2} />}
          </button>

          {/* Progress ring + counter */}
          <div className="flex items-center gap-2.5">
            <svg width="34" height="34" style={{ transform: "rotate(-90deg)" }} aria-hidden>
              <circle cx="17" cy="17" r="14" stroke="rgba(245,242,237,0.08)" strokeWidth="2" fill="none" />
              <motion.circle
                cx="17" cy="17" r="14"
                stroke="#3DB87A"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                animate={{ strokeDasharray: `${dashLength} ${CIRC + 10}` }}
                transition={{ duration: 0.6, ease: SPRING }}
              />
            </svg>
            <span className="text-[12px] font-medium tabular-nums" style={{ color: "#5A5650" }}>
              {step}<span style={{ opacity: 0.4 }}> / 5</span>
            </span>
          </div>
        </div>

        {/* Question — the monumental moment */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: SPRING }}
            className="mb-8"
          >
            <div
              className="text-[10px] uppercase tracking-[0.2em] font-medium mb-5"
              style={{ color: "#D4A574" }}
            >
              {current.label}
            </div>

            <h1
              className="font-serif text-aos-text leading-[1.1] whitespace-pre-line"
              style={{ fontSize: "clamp(34px, 9vw, 42px)", letterSpacing: "-0.025em" }}
            >
              {current.q}
            </h1>

            <p className="font-serif italic text-[14px] leading-relaxed mt-4" style={{ color: "#5A5650" }}>
              {current.hint}
            </p>

            {opportunityTitle && (
              <div
                className="flex items-center gap-1.5 mt-4"
              >
                <div className="w-1 h-1 rounded-full shrink-0" style={{ background: "rgba(245,242,237,0.2)" }} />
                <p className="text-[11px] tracking-[-0.01em]" style={{ color: "#3A3A42" }}>
                  {opportunityTitle}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Answer textarea */}
        <div className="flex-1 flex flex-col min-h-0">
          <textarea
            key={step}
            autoFocus
            value={currentAnswer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Write your answer…"
            className="w-full flex-1 min-h-[150px] rounded-[20px] p-5 text-[15px] text-aos-text leading-relaxed resize-none outline-none font-sans"
            style={{
              background: "rgba(21,21,26,0.8)",
              border: "1px solid rgba(245,242,237,0.07)",
              caretColor: "#3DB87A",
              transition: "border-color 0.25s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(245,242,237,0.15)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(245,242,237,0.07)")}
          />
        </div>

        {/* CTA */}
        <div className="mt-5 shrink-0">
          <motion.button
            onClick={handleNext}
            disabled={!canAdvance || completing}
            whileTap={canAdvance ? { scale: 0.98 } : {}}
            className="flex items-center justify-center gap-2 w-full py-[17px] rounded-[18px] text-[15px] font-semibold tracking-[-0.01em] enabled:hover:opacity-90"
            style={{
              background: !canAdvance || completing ? "#1C1C22" : "#F5F2ED",
              color: !canAdvance || completing ? "#3A3A42" : "#0A0A0C",
              cursor: !canAdvance || completing ? "not-allowed" : "pointer",
              transition: "background 0.3s, color 0.3s",
            }}
          >
            {completing ? "Sealing your commitment…"
              : step === 5 ? <><span>Complete evaluation</span><Check size={16} strokeWidth={2.5} /></>
              : <><span>Continue</span><ArrowRight size={16} strokeWidth={2.5} /></>}
          </motion.button>
        </div>

      </div>
    </main>
  );
}
