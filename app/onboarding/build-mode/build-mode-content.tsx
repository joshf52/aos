"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Code2, Wand2, Check } from "lucide-react";
import { OnboardingShell, PrimaryButton } from "../shell";

const SPRING = [0.22, 1, 0.36, 1] as const;

const MODES = [
  {
    id: "self" as const,
    label: "I'll build it myself",
    sub: "Technical builder or no-code tools. You own the sprint.",
    Icon: Code2,
  },
  {
    id: "ai" as const,
    label: "Build it for me with AI",
    sub: "AI builds it. You own the outcome.",
    Icon: Wand2,
  },
];

export function BuildModeContent({
  saveAction,
}: {
  saveAction: (formData: FormData) => Promise<void>;
}) {
  const [selected, setSelected] = useState<"self" | "ai" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <OnboardingShell
      step={1}
      backHref="/feed"
      eyebrow="Before we begin"
      title="How do you want to build?"
      hint="You can change this anytime from preferences."
      footer={
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.35, ease: SPRING }}
            >
              <form
                action={saveAction}
                onSubmit={() => setSubmitting(true)}
              >
                <input type="hidden" name="build_mode" value={selected} />
                <PrimaryButton disabled={submitting}>
                  Continue <ArrowRight size={17} strokeWidth={2.5} />
                </PrimaryButton>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      }
    >
      <div className="flex flex-col gap-3 pb-4">
        {MODES.map((mode, i) => {
          const isSelected = selected === mode.id;
          return (
            <motion.button
              key={mode.id}
              type="button"
              onClick={() => setSelected(mode.id)}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: SPRING }}
              className="flex items-center gap-4 p-5 rounded-[18px] text-left w-full transition-colors"
              style={{
                background: isSelected
                  ? "rgba(61, 184, 122, 0.10)"
                  : "#15151A",
                border: `1px solid ${
                  isSelected
                    ? "rgba(61, 184, 122, 0.4)"
                    : "var(--aos-border)"
                }`,
              }}
            >
              <div
                className="w-11 h-11 rounded-[13px] flex items-center justify-center shrink-0 transition-colors"
                style={{
                  background: isSelected
                    ? "rgba(61, 184, 122, 0.2)"
                    : "#1C1C22",
                }}
              >
                <mode.Icon
                  size={20}
                  color={isSelected ? "#3DB87A" : "#F5F2ED"}
                  strokeWidth={1.5}
                />
              </div>
              <div className="flex-1">
                <div className="text-[16px] text-aos-text font-medium tracking-[-0.01em]">
                  {mode.label}
                </div>
                <div className="text-[13px] text-aos-secondary mt-0.5">
                  {mode.sub}
                </div>
              </div>
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: SPRING }}
                    className="w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "#3DB87A" }}
                  >
                    <Check size={12} color="#000" strokeWidth={3} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}

        <AnimatePresence>
          {selected === "ai" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.35, ease: SPRING }}
              className="p-4 rounded-2xl"
              style={{
                background: "rgba(212, 165, 116, 0.06)",
                border: "1px solid rgba(212, 165, 116, 0.2)",
              }}
            >
              <p className="text-[13px] leading-relaxed" style={{ color: "#D4A574" }}>
                You'll get a free trial of the AI Build service. After
                evaluating an opportunity, we hand it off to AI — you review
                and approve.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </OnboardingShell>
  );
}
