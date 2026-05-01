"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { OnboardingShell, PrimaryButton } from "../shell";

const SPRING = [0.22, 1, 0.36, 1] as const;

const AUDIENCES = [
  { id: "creators", label: "Creators", sub: "Solopreneurs, indie makers, content people" },
  { id: "developers", label: "Indie Hackers", sub: "Developers and technical builders" },
  { id: "smb", label: "Small Business", sub: "Owner-operators and small teams" },
  { id: "consumers", label: "Consumers", sub: "Everyday people and households" },
] as const;

export function AudienceContent({
  initialAudience,
  saveAction,
}: {
  initialAudience: string | null;
  saveAction: (formData: FormData) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string | null>(initialAudience);
  const [submitting, setSubmitting] = useState(false);

  return (
    <OnboardingShell
      step={3}
      backHref="/onboarding/domains"
      eyebrow="02 · Audience"
      title="Who do you want to serve?"
      hint="There's a customer behind every great product."
      footer={
        <form action={saveAction} onSubmit={() => setSubmitting(true)}>
          <input type="hidden" name="audience" value={selected ?? ""} />
          <PrimaryButton disabled={!selected || submitting}>
            Continue <ArrowRight size={17} strokeWidth={2.5} />
          </PrimaryButton>
        </form>
      }
    >
      <div className="flex flex-col gap-3 pb-4">
        {AUDIENCES.map((audience, i) => {
          const isSelected = selected === audience.id;
          return (
            <motion.button
              key={audience.id}
              type="button"
              onClick={() => setSelected(audience.id)}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: SPRING }}
              className="p-5 rounded-[18px] text-left w-full transition-colors"
              style={{
                background: isSelected ? "rgba(61, 184, 122, 0.10)" : "#15151A",
                border: `1px solid ${
                  isSelected ? "rgba(61, 184, 122, 0.4)" : "var(--aos-border)"
                }`,
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-serif text-[19px] text-aos-text tracking-[-0.01em]">
                    {audience.label}
                  </div>
                  <div className="text-[13px] text-aos-secondary mt-1">
                    {audience.sub}
                  </div>
                </div>
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ duration: 0.25, ease: SPRING }}
                      className="w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 ml-3"
                      style={{ background: "#3DB87A" }}
                    >
                      <Check size={12} color="#000" strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          );
        })}
      </div>
    </OnboardingShell>
  );
}
