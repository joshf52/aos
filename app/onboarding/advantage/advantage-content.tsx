"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { OnboardingShell, PrimaryButton } from "../shell";

const SPRING = [0.22, 1, 0.36, 1] as const;

const PLACEHOLDERS = [
  "I worked in healthcare operations for 8 years…",
  "I have 50K engaged followers in productivity…",
  "I ship in two weeks what takes others two months…",
  "I know exactly what enterprise teams will pay for…",
  "I built and sold a small business in this space…",
];

export function AdvantageContent({
  initialText,
  buildMode,
  saveAction,
  returnTo,
}: {
  initialText: string;
  buildMode: "self" | "ai";
  saveAction: (formData: FormData) => Promise<void>;
  returnTo?: string;
}) {
  const [text, setText] = useState(initialText);
  const [phIdx, setPhIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = setInterval(
      () => setPhIdx((i) => (i + 1) % PLACEHOLDERS.length),
      3500
    );
    return () => clearInterval(t);
  }, []);

  const title =
    buildMode === "ai"
      ? "What do you know that others don't?"
      : "What's your edge?";

  return (
    <OnboardingShell
      step={5}
      backHref={returnTo ?? "/onboarding/commitment"}
      eyebrow="04 · Advantage"
      title={title}
      hint="The thing that makes you uniquely suited for this."
      footer={
        <form action={saveAction} onSubmit={() => setSubmitting(true)}>
          {returnTo && <input type="hidden" name="_return_to" value={returnTo} />}
          <input type="hidden" name="unfair_advantage" value={text} />
          <PrimaryButton disabled={!text.trim() || submitting}>
            Continue <ArrowRight size={17} strokeWidth={2.5} />
          </PrimaryButton>
        </form>
      }
    >
      <div className="relative flex-1 flex flex-col pb-4">
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="w-full rounded-[18px] p-[18px] text-[16px] text-aos-text leading-relaxed resize-none outline-none"
          style={{
            background: "#15151A",
            border: "1px solid var(--aos-border)",
            fontFamily: "var(--font-jakarta), system-ui, sans-serif",
          }}
          placeholder=""
        />
        {!text && (
          <div className="absolute top-[18px] left-[18px] right-[18px] pointer-events-none overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={phIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.5 }}
                className="font-serif italic text-[16px] leading-relaxed"
                style={{ color: "#5A5650" }}
              >
                {PLACEHOLDERS[phIdx]}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </OnboardingShell>
  );
}
