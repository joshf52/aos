"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, Wand2, Target } from "lucide-react";
import { OnboardingShell, PrimaryButton } from "../shell";

const SPRING = [0.22, 1, 0.36, 1] as const;

const LEVELS = [
  {
    id: "exploring",
    label: "Exploring",
    sub: "2–5 hrs/week · Looking for the right thing",
    Icon: Sparkles,
  },
  {
    id: "building",
    label: "Building",
    sub: "10–20 hrs/week · Ready to commit",
    Icon: Wand2,
  },
  {
    id: "allin",
    label: "All in",
    sub: "30+ hrs/week · This is my main focus",
    Icon: Target,
  },
] as const;

export function CommitmentContent({
  initialCommitment,
  buildMode,
  saveAction,
  returnTo,
}: {
  initialCommitment: string | null;
  buildMode: "self" | "ai";
  saveAction: (formData: FormData) => Promise<void>;
  returnTo?: string;
}) {
  const [selected, setSelected] = useState<string | null>(initialCommitment);
  const [submitting, setSubmitting] = useState(false);

  const title =
    buildMode === "ai" ? "How involved do you want to be?" : "How serious is this?";

  return (
    <OnboardingShell
      step={4}
      backHref={returnTo ?? "/onboarding/audience"}
      eyebrow="03 · Commitment"
      title={title}
      hint="We match opportunities to your level."
      footer={
        <form action={saveAction} onSubmit={() => setSubmitting(true)}>
          {returnTo && <input type="hidden" name="_return_to" value={returnTo} />}
          <input type="hidden" name="commitment_level" value={selected ?? ""} />
          <PrimaryButton disabled={!selected || submitting}>
            Continue <ArrowRight size={17} strokeWidth={2.5} />
          </PrimaryButton>
        </form>
      }
    >
      <div className="flex flex-col gap-3 pb-4">
        {LEVELS.map((level, i) => {
          const isSelected = selected === level.id;
          return (
            <motion.button
              key={level.id}
              type="button"
              onClick={() => setSelected(level.id)}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07, ease: SPRING }}
              className="flex items-center gap-4 p-5 rounded-[18px] text-left w-full transition-colors"
              style={{
                background: isSelected ? "rgba(61, 184, 122, 0.10)" : "#15151A",
                border: `1px solid ${
                  isSelected ? "rgba(61, 184, 122, 0.4)" : "var(--aos-border)"
                }`,
              }}
            >
              <div
                className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 transition-colors"
                style={{
                  background: isSelected ? "rgba(61, 184, 122, 0.2)" : "#1C1C22",
                }}
              >
                <level.Icon
                  size={20}
                  color={isSelected ? "#3DB87A" : "#F5F2ED"}
                  strokeWidth={1.5}
                />
              </div>
              <div className="flex-1">
                <div className="font-serif text-[19px] text-aos-text tracking-[-0.01em]">
                  {level.label}
                </div>
                <div className="text-[13px] text-aos-secondary mt-0.5">
                  {level.sub}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </OnboardingShell>
  );
}
