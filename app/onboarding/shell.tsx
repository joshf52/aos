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
    <main className="min-h-dvh bg-aos-bg flex flex-col relative overflow-hidden">
      {/* Grain */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          opacity: 0.025,
        }}
      />
      {/* Ambient blobs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 30, -20, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -right-16 w-[340px] h-[340px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(61,184,122,0.10) 0%, transparent 65%)",
            filter: "blur(50px)",
          }}
        />
        <motion.div
          animate={{ x: [0, -20, 30, 0], y: [0, 40, -10, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-10 -left-16 w-[280px] h-[280px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(212,165,116,0.10) 0%, transparent 65%)",
            filter: "blur(50px)",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col flex-1 px-6 pt-14 pb-8 max-w-sm mx-auto w-full">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => (backHref ? router.push(backHref) : router.back())}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-opacity hover:opacity-70"
            style={{
              background: "#15151A",
              border: "1px solid rgba(245,242,237,0.1)",
            }}
            aria-label="Back"
          >
            <ArrowLeft size={16} color="#8A8580" strokeWidth={2} />
          </button>

          {/* Progress pills */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  width: i + 1 === step ? 22 : 6,
                  background:
                    i + 1 === step
                      ? "#3DB87A"
                      : i + 1 < step
                      ? "rgba(61,184,122,0.4)"
                      : "rgba(245,242,237,0.10)",
                }}
                transition={{ duration: 0.4, ease: SPRING }}
                style={{ height: 5, borderRadius: 3 }}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: SPRING }}
          className="flex flex-col flex-1 min-h-0"
        >
          {eyebrow && (
            <div
              className="text-[10px] uppercase tracking-[0.2em] font-medium mb-4"
              style={{ color: "#D4A574" }}
            >
              {eyebrow}
            </div>
          )}
          <h1
            className="font-serif text-aos-text tracking-[-0.025em] leading-[1.1] mb-2.5"
            style={{ fontSize: "clamp(30px, 8vw, 38px)" }}
          >
            {title}
          </h1>
          {hint && (
            <p className="font-serif italic text-[14px] leading-relaxed mb-6" style={{ color: "#5A5650" }}>
              {hint}
            </p>
          )}
          <div className="flex-1 overflow-auto -mr-6 pr-6">{children}</div>
        </motion.div>

        {footer && <div className="pt-3 shrink-0">{footer}</div>}
      </div>
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
        background: disabled ? "#1C1C22" : dark ? "#0A0A0C" : "#F5F2ED",
        color: disabled ? "#3A3A42" : dark ? "#F5F2ED" : "#0A0A0C",
        border: dark ? "1px solid rgba(245,242,237,0.12)" : "none",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </motion.button>
  );
}
