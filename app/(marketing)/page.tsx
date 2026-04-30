"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code, FileText, Briefcase, Package, ArrowRight, Check } from "lucide-react";

const CAPABILITIES = [
  { id: "software", label: "Software", sub: "Apps, SaaS, tools", Icon: Code },
  { id: "content",  label: "Content",  sub: "Newsletters, courses, media", Icon: FileText },
  { id: "services", label: "Services", sub: "Consulting, productized", Icon: Briefcase },
  { id: "physical", label: "Physical", sub: "Products, hardware", Icon: Package },
];

const spring = { ease: [0.22, 1, 0.36, 1] as const };

export default function LandingPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <main className="min-h-dvh bg-aos-bg relative flex flex-col overflow-hidden">
      {/* Aurora */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] left-[20%] w-80 h-80"
          style={{ background: "radial-gradient(circle, rgba(61,184,122,0.18) 0%, transparent 60%)", filter: "blur(40px)" }}
        />
        <motion.div
          animate={{ x: [0, -30, 40, 0], y: [0, 40, -10, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[40%] right-0 w-72 h-72"
          style={{ background: "radial-gradient(circle, rgba(212,165,116,0.12) 0%, transparent 60%)", filter: "blur(40px)" }}
        />
      </div>

      <div className="relative z-10 flex flex-col flex-1 px-6 pt-24 pb-10 max-w-lg mx-auto w-full">
        {/* Wordmark */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ...spring }}
        >
          <div className="font-serif text-6xl text-aos-text tracking-[-0.04em] leading-none">
            AOS
          </div>
          <div className="font-serif text-2xl text-aos-secondary italic mt-1.5 tracking-[-0.01em]">
            Build with conviction.
          </div>
        </motion.div>

        {/* Capability selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ...spring }}
          className="mt-14"
        >
          <div className="text-xs text-aos-tertiary uppercase tracking-[0.12em] font-medium mb-3.5">
            What can you build?
          </div>
          <div className="flex flex-col gap-2.5">
            {CAPABILITIES.map((cap, i) => (
              <motion.button
                key={cap.id}
                onClick={() => setSelected(cap.id)}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.07, ...spring }}
                className="flex items-center gap-3.5 p-4 rounded-[18px] text-left w-full transition-all duration-300"
                style={{
                  background: selected === cap.id ? "var(--aos-accent-soft)" : "#15151A",
                  border: `1px solid ${selected === cap.id ? "rgba(61,184,122,0.4)" : "var(--aos-border)"}`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
                  style={{ background: selected === cap.id ? "rgba(61,184,122,0.2)" : "#1C1C22" }}
                >
                  <cap.Icon
                    size={18}
                    strokeWidth={1.5}
                    color={selected === cap.id ? "#3DB87A" : "#F5F2ED"}
                  />
                </div>
                <div className="flex-1">
                  <div className="text-aos-text text-base font-medium tracking-[-0.01em]">
                    {cap.label}
                  </div>
                  <div className="text-aos-secondary text-sm mt-0.5">{cap.sub}</div>
                </div>
                <AnimatePresence>
                  {selected === cap.id && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ...spring }}
                      className="w-5 h-5 rounded-full bg-aos-accent flex items-center justify-center shrink-0"
                    >
                      <Check size={11} color="#000" strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>
        </motion.div>

        <div className="flex-1" />

        {/* CTA */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ...spring }}
            >
              <a
                href="/auth/signup"
                className="flex items-center justify-center gap-2 w-full py-[17px] rounded-[18px] bg-aos-text text-aos-bg text-base font-semibold tracking-[-0.01em] transition-opacity hover:opacity-90"
              >
                Continue <ArrowRight size={17} strokeWidth={2.5} />
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
