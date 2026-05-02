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
      <label className="block text-[10px] text-aos-tertiary uppercase tracking-[0.16em] font-medium mb-2">
        {label}
        {!required && (
          <span className="ml-1.5 normal-case tracking-normal text-[11px]" style={{ color: "#3A3A42" }}>
            — optional
          </span>
        )}
      </label>
      {hint && (
        <p className="font-serif italic text-[13px] leading-snug mb-2.5" style={{ color: "#5A5650" }}>
          {hint}
        </p>
      )}
      <textarea
        name={name}
        rows={rows}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-[16px] p-4 text-[15px] text-aos-text leading-relaxed resize-none outline-none placeholder:text-aos-tertiary"
        style={{
          background: "rgba(21,21,26,0.8)",
          border: "1px solid rgba(245,242,237,0.07)",
          fontFamily: "var(--font-jakarta), system-ui, sans-serif",
          caretColor: "#3DB87A",
          transition: "border-color 0.2s",
        }}
        onFocus={(e) => { e.target.style.borderColor = "rgba(245,242,237,0.15)"; }}
        onBlur={(e) => { e.target.style.borderColor = "rgba(245,242,237,0.07)"; }}
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
    <main className="min-h-dvh bg-aos-bg relative overflow-hidden">
      {/* Ambient gold glow */}
      <div
        className="absolute -top-10 right-0 w-[280px] h-[280px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(212,165,116,0.08) 0%, transparent 65%)",
          filter: "blur(50px)",
        }}
      />

      <div className="relative z-10 px-6 pt-14 pb-28 max-w-lg mx-auto">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center mb-8 transition-opacity hover:opacity-70"
          style={{
            background: "#15151A",
            border: "1px solid rgba(245,242,237,0.08)",
          }}
          aria-label="Back"
        >
          <ArrowLeft size={16} color="#8A8580" strokeWidth={2} />
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="text-[10px] uppercase tracking-[0.2em] font-medium mb-2"
            style={{ color: "#D4A574" }}
          >
            Week {weekNumber} check-in
          </div>
          <h1
            className="font-serif text-aos-text tracking-[-0.025em] leading-[1.1]"
            style={{ fontSize: "clamp(28px, 7vw, 36px)" }}
          >
            {opportunityTitle}.
          </h1>
        </motion.div>

        {/* Form */}
        <motion.form
          action={saveAction}
          onSubmit={() => setSubmitting(true)}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: SPRING }}
          className="mt-9"
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
              color: submitting ? "#3A3A42" : "#0A0A0C",
              border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "background 0.3s, color 0.3s",
            }}
          >
            {submitting ? "Saving…" : <>Log update <ArrowRight size={17} strokeWidth={2.5} /></>}
          </motion.button>
        </motion.form>
      </div>
    </main>
  );
}
