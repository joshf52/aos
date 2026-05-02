"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

const SPRING = [0.22, 1, 0.36, 1] as const;

function Field({
  label,
  hint,
  name,
  placeholder,
  required,
  rows = 4,
}: {
  label: string;
  hint?: string;
  name: string;
  placeholder: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <div className="mb-6">
      <label className="block text-[11px] text-aos-tertiary uppercase tracking-[0.13em] font-medium mb-1.5">
        {label}
        {!required && (
          <span className="ml-1.5 normal-case tracking-normal text-[11px]">
            — optional
          </span>
        )}
      </label>
      {hint && (
        <p className="font-serif italic text-[13px] text-aos-secondary leading-snug mb-2">
          {hint}
        </p>
      )}
      <textarea
        name={name}
        rows={rows}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-[14px] p-4 text-[15px] text-aos-text leading-relaxed resize-none outline-none placeholder:text-aos-tertiary"
        style={{
          background: "#15151A",
          border: "1px solid var(--aos-border)",
          fontFamily: "var(--font-jakarta), system-ui, sans-serif",
        }}
      />
    </div>
  );
}

export function CheckinContent({
  commitmentId,
  opportunityTitle,
  weekNumber,
  saveAction,
}: {
  commitmentId: string;
  opportunityTitle: string;
  weekNumber: number;
  saveAction: (formData: FormData) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  return (
    <main className="min-h-dvh bg-aos-bg">
      <div className="px-6 pt-14 pb-28 max-w-lg mx-auto">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center mb-8"
          style={{
            background: "#15151A",
            border: "1px solid var(--aos-border-strong)",
          }}
          aria-label="Back"
        >
          <ArrowLeft size={16} color="#F5F2ED" strokeWidth={2} />
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-[11px] text-aos-tertiary uppercase tracking-[0.14em] font-medium mb-1.5"
            style={{ color: "#D4A574" }}
          >
            Week {weekNumber} check-in
          </div>
          <h1 className="font-serif text-[30px] text-aos-text tracking-[-0.02em] leading-[1.15]">
            {opportunityTitle}.
          </h1>
        </motion.div>

        {/* Form */}
        <motion.form
          action={saveAction}
          onSubmit={() => setSubmitting(true)}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: SPRING }}
          className="mt-8"
        >
          <input type="hidden" name="commitment_id" value={commitmentId} />
          <input type="hidden" name="week_number" value={weekNumber} />

          <Field
            label="What did you ship or learn?"
            hint="Be specific. A URL, a lesson, a metric."
            name="shipped_learned"
            placeholder="I launched the landing page and got 3 signups…"
            required
            rows={4}
          />
          <Field
            label="Blockers"
            name="blockers"
            placeholder="Stuck on the payment integration…"
            rows={3}
          />
          <Field
            label="Focus next week"
            hint="One clear next step."
            name="next_focus"
            placeholder="Ship the onboarding flow and get first paid user…"
            required
            rows={3}
          />

          <motion.button
            type="submit"
            disabled={submitting}
            whileTap={{ scale: submitting ? 1 : 0.97 }}
            className="w-full py-[17px] rounded-[18px] text-[16px] font-semibold flex items-center justify-center gap-2 tracking-[-0.01em] mt-2"
            style={{
              background: submitting ? "#1C1C22" : "#F5F2ED",
              color: submitting ? "#5A5650" : "#0A0A0C",
              border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            Log update <ArrowRight size={17} strokeWidth={2.5} />
          </motion.button>
        </motion.form>
      </div>
    </main>
  );
}
