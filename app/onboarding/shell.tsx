"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const SPRING = [0.22, 1, 0.36, 1] as const;

export function OnboardingShell({
  step,
  totalSteps = 5,
  backHref,
  eyebrow,
  title,
  hint,
  children,
  footer,
}: {
  step: number;
  totalSteps?: number;
  backHref?: string;
  eyebrow?: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <main className="min-h-dvh bg-aos-bg flex flex-col px-6 pt-14 pb-8">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => (backHref ? router.push(backHref) : router.back())}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: "#15151A",
            border: "1px solid var(--aos-border-strong)",
          }}
          aria-label="Back"
        >
          <ArrowLeft size={16} color="#F5F2ED" strokeWidth={2} />
        </button>

        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i + 1 === step ? 18 : 6,
                backgroundColor:
                  i + 1 <= step ? "#F5F2ED" : "rgba(245,242,237,0.12)",
              }}
              transition={{ duration: 0.4, ease: SPRING }}
              style={{ height: 6, borderRadius: 3 }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: SPRING }}
        className="flex flex-col flex-1 min-h-0"
      >
        {eyebrow && (
          <div
            className="text-[11px] uppercase tracking-[0.14em] font-medium mb-3.5"
            style={{ color: "#D4A574" }}
          >
            {eyebrow}
          </div>
        )}
        <h1 className="font-serif text-[30px] text-aos-text tracking-[-0.02em] leading-[1.15] mb-2.5">
          {title}
        </h1>
        {hint && (
          <p className="font-serif italic text-aos-secondary text-sm leading-relaxed mb-6">
            {hint}
          </p>
        )}
        <div className="flex-1 overflow-auto -mr-6 pr-6">{children}</div>
      </motion.div>

      {footer && <div className="pt-3 shrink-0">{footer}</div>}
    </main>
  );
}

export function PrimaryButton({
  children,
  disabled,
  dark,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  dark?: boolean;
}) {
  return (
    <motion.button
      type="submit"
      disabled={disabled}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      className="w-full py-[17px] rounded-[18px] text-[16px] font-semibold flex items-center justify-center gap-2 tracking-[-0.01em] transition-colors"
      style={{
        background: disabled
          ? "#1C1C22"
          : dark
          ? "#0A0A0C"
          : "#F5F2ED",
        color: disabled
          ? "#5A5650"
          : dark
          ? "#F5F2ED"
          : "#0A0A0C",
        border: dark ? "1px solid rgba(245,242,237,0.12)" : "none",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </motion.button>
  );
}
