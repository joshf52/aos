"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";

const QUESTIONS = [
  { num: 1, label: "Customer", q: "Who exactly is the customer?",            hint: "Be specific. Name them." },
  { num: 2, label: "Today",    q: "What are they doing today instead?",      hint: "The current solution — even if it's suffering." },
  { num: 3, label: "Wedge",    q: "Why would they switch to you?",           hint: "The compelling reason to change." },
  { num: 4, label: "Test",     q: "What's the smallest test you can ship?",  hint: "Not the full product. The minimum version." },
  { num: 5, label: "Success",  q: "What does success look like in 30 days?", hint: "Specific. Measurable. Real." },
] as const;

const SPRING = [0.22, 1, 0.36, 1] as const;
const ARC_R = 14;
const ARC_C = 2 * Math.PI * ARC_R;

type Phase = "answer" | "review";

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
  const [phase, setPhase] = useState<Phase>("answer");
  const [completing, setCompleting] = useState(false);
  const directionRef = useRef<1 | -1>(1);
  const router = useRouter();

  const current = QUESTIONS[step - 1];
  const currentAnswer = answers[step - 1] ?? "";
  const canAdvance = currentAnswer.trim().length > 0;
  const allAnswered = answers.every((a) => a.trim().length > 0);
  const progress = phase === "review" ? 1 : (step - 1 + (canAdvance ? 0.5 : 0)) / 5;
  const dashLength = progress * ARC_C;

  function setAnswer(value: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[step - 1] = value;
      return next;
    });
  }

  function handleBack() {
    if (phase === "review") {
      directionRef.current = -1;
      setPhase("answer");
      return;
    }
    if (step === 1) {
      router.back();
      return;
    }
    directionRef.current = -1;
    setStep((s) => s - 1);
  }

  function handleNext() {
    if (!canAdvance || completing) return;
    saveStep(lensId, step, currentAnswer).catch(() => {});
    if (step < 5) {
      directionRef.current = 1;
      setStep((s) => s + 1);
    } else {
      directionRef.current = 1;
      setPhase("review");
    }
  }

  function editAnswer(stepNum: number) {
    directionRef.current = -1;
    setStep(stepNum);
    setPhase("answer");
  }

  async function lockItIn() {
    if (completing) return;
    setCompleting(true);
    try {
      const commitmentId = await completeLens(lensId, answers);
      router.push(commitmentId ? `/commit/${commitmentId}/ceremony` : "/feed");
    } catch {
      setCompleting(false);
    }
  }

  // Direction-aware slide: forward = exit-left + enter-from-right; back = mirror.
  const slideVariants = {
    enter: (dir: 1 | -1) => ({ x: dir * 60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: 1 | -1) => ({ x: dir * -60, opacity: 0 }),
  };

  return (
    <main className="relative min-h-dvh bg-aos-bg overflow-hidden flex flex-col">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 75% 55% at 50% -10%, rgba(212,165,116,0.06) 0%, transparent 65%)",
        }}
      />

      {/* TOP BAR — back + progress */}
      <header className="relative z-10 px-6 pt-7 flex items-center justify-between max-w-3xl mx-auto w-full">
        <button
          onClick={handleBack}
          aria-label={phase === "review" ? "Back to last question" : step === 1 ? "Close" : "Previous question"}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full
                     text-aos-secondary text-[13px] tracking-[-0.01em]
                     border border-aos-border bg-transparent
                     transition-[color,border-color] duration-200
                     hover:text-aos-text hover:border-aos-border-strong
                     focus-visible:outline-none focus-visible:border-aos-border-strong"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-3">
          <svg width="34" height="34" style={{ transform: "rotate(-90deg)" }} aria-hidden>
            <circle cx="17" cy="17" r={ARC_R} stroke="rgba(245,242,237,0.08)" strokeWidth="2" fill="none" />
            <motion.circle
              cx="17"
              cy="17"
              r={ARC_R}
              stroke={phase === "review" ? "#D4A574" : "#D4A574"}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              animate={{ strokeDasharray: `${dashLength} ${ARC_C + 10}` }}
              transition={{ duration: 0.55, ease: SPRING }}
            />
          </svg>
          <span className="font-mono text-[12px] tabular-nums tracking-[0.06em] text-aos-tertiary">
            {phase === "review" ? "5" : step}
            <span className="opacity-50"> / 5</span>
          </span>
        </div>
      </header>

      {/* BODY */}
      <div className="relative z-10 flex flex-col flex-1 min-h-0 px-6 pt-6 pb-8 max-w-3xl mx-auto w-full">
        <AnimatePresence mode="wait" initial={false}>
          {phase === "answer" ? (
            <motion.section
              key={`step-${step}`}
              custom={directionRef.current}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: SPRING }}
              className="flex flex-col flex-1 min-h-0"
            >
              {/* Eyebrow */}
              <div className="text-center mt-4 mb-6">
                <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-aos-gold">
                  {String(current.num).padStart(2, "0")} · {current.label}
                </p>
                {opportunityTitle && (
                  <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-aos-tertiary mt-3 truncate">
                    {opportunityTitle}
                  </p>
                )}
              </div>

              {/* Koan question */}
              <div className="flex flex-col items-center text-center mt-6">
                <h1 className="text-koan font-serif text-aos-text">{current.q}</h1>
                <p className="font-serif italic text-[15px] leading-relaxed text-aos-tertiary mt-6 max-w-md">
                  {current.hint}
                </p>
              </div>

              {/* Answer — focused writing area */}
              <div className="mt-10">
                <textarea
                  id={`lens-answer-${step}`}
                  key={`textarea-${step}`}
                  autoFocus
                  value={currentAnswer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Write your answer…"
                  className="w-full min-h-[120px] resize-none bg-ink-700 border border-aos-border rounded-lg p-4 text-base font-sans text-aos-text leading-relaxed outline-none placeholder:text-aos-tertiary placeholder:italic transition-colors duration-200 focus:border-aos-border-strong"
                  style={{ caretColor: "#D4A574" }}
                />
              </div>

              {/* Continue */}
              <div className="mt-7 shrink-0">
                <motion.button
                  type="button"
                  onClick={handleNext}
                  disabled={!canAdvance || completing}
                  whileTap={canAdvance ? { scale: 0.99 } : {}}
                  className={
                    "inline-flex items-center justify-center gap-2 w-full py-4 rounded-[18px] " +
                    "text-[15px] font-semibold tracking-[-0.01em] transition-[opacity,transform] " +
                    (canAdvance && !completing
                      ? "bg-gradient-to-b from-aos-gold to-[#B8895A] text-aos-bg " +
                        "shadow-[0_1px_0_rgba(245,232,210,0.4)_inset,0_12px_30px_rgba(212,165,116,0.25)] " +
                        "hover:shadow-[0_1px_0_rgba(245,232,210,0.5)_inset,0_18px_40px_rgba(212,165,116,0.35)]"
                      : "bg-aos-elevated text-aos-tertiary cursor-not-allowed")
                  }
                >
                  <span>{step === 5 ? "Review your answers" : "Continue"}</span>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </motion.button>
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="review"
              custom={directionRef.current}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: SPRING }}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="text-center mt-4 mb-8">
                <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-aos-gold">
                  Final review
                </p>
                <h1 className="text-koan font-serif text-aos-text mt-6">
                  Read it back to yourself.
                </h1>
                <p className="font-serif italic text-[15px] leading-relaxed text-aos-tertiary mt-5 max-w-md mx-auto">
                  This becomes the covenant. Edit anything you want to change.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto -mx-6 px-6 flex flex-col gap-3 pb-2">
                {QUESTIONS.map((q, i) => {
                  const a = answers[i] ?? "";
                  const truncated = a.length > 240 ? a.slice(0, 240) + "…" : a;
                  return (
                    <motion.button
                      key={q.num}
                      type="button"
                      onClick={() => editAnswer(q.num)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.05 + i * 0.05, ease: SPRING }}
                      className="card-interactive group text-left"
                    >
                      <div className="flex items-baseline justify-between gap-3 mb-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-aos-gold">
                          {String(q.num).padStart(2, "0")} · {q.label}
                        </span>
                        <Pencil size={11} strokeWidth={2} className="text-aos-tertiary opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                      <div className="font-serif text-[15px] leading-snug text-aos-secondary mb-2">
                        {q.q}
                      </div>
                      {a.trim().length > 0 ? (
                        <p className="text-[14px] text-aos-text leading-[1.55] whitespace-pre-line">
                          {truncated}
                        </p>
                      ) : (
                        <p className="font-serif italic text-[13px] text-aos-secondary">
                          Empty — tap to fill in.
                        </p>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-6 shrink-0">
                <motion.button
                  type="button"
                  onClick={lockItIn}
                  disabled={!allAnswered || completing}
                  whileTap={allAnswered && !completing ? { scale: 0.99 } : {}}
                  className={
                    "inline-flex items-center justify-center gap-2 w-full py-4 rounded-[18px] " +
                    "text-[15px] font-semibold tracking-[-0.01em] focus-gold " +
                    (allAnswered && !completing
                      ? "bg-gradient-to-b from-aos-gold to-[#B8895A] text-aos-bg " +
                        "shadow-[0_1px_0_rgba(245,232,210,0.4)_inset,0_12px_30px_rgba(212,165,116,0.25)] " +
                        "hover:shadow-[0_1px_0_rgba(245,232,210,0.5)_inset,0_18px_40px_rgba(212,165,116,0.35)]"
                      : "bg-aos-elevated text-aos-tertiary cursor-not-allowed")
                  }
                >
                  {completing ? (
                    <span>Sealing your commitment…</span>
                  ) : (
                    <>
                      <span>Lock it in</span>
                      <Check size={16} strokeWidth={2.5} />
                    </>
                  )}
                </motion.button>
                <p className="text-[11px] text-center mt-3 leading-relaxed text-aos-tertiary">
                  Next: the Ceremony.
                </p>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
