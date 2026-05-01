"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

const QUESTIONS = [
  { num: 1, label: "Customer", q: "Who exactly is the customer?" },
  { num: 2, label: "Today",    q: "What are they doing today instead?" },
  { num: 3, label: "Wedge",   q: "Why would they switch to you?" },
  { num: 4, label: "Test",    q: "What's the smallest test you can ship?" },
  { num: 5, label: "Success", q: "What does success look like in 30 days?" },
] as const;

const POP = [0.22, 1.5, 0.36, 1] as const;
const SPRING = [0.22, 1, 0.36, 1] as const;

export function CeremonyContent({
  commitmentId,
  opportunityTitle,
  issuanceDate,
  answers,
}: {
  commitmentId: string;
  opportunityTitle: string;
  issuanceDate: string;
  answers: string[];
}) {
  const [phase, setPhase] = useState(0);
  const [signed, setSigned] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdRef = useRef<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase(1), 1800);
    const t2 = window.setTimeout(() => setPhase(2), 3400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  function startHold() {
    if (signed) return;
    const start = Date.now();
    holdRef.current = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / 1500, 1);
      setHoldProgress(p);
      if (p >= 1) {
        window.clearInterval(holdRef.current!);
        setSigned(true);
        setPhase(3);
        window.setTimeout(() => setPhase(4), 2000);
      }
    }, 16);
  }

  function cancelHold() {
    if (signed) return;
    if (holdRef.current) window.clearInterval(holdRef.current);
    setHoldProgress(0);
  }

  return (
    <main
      className="fixed inset-0 overflow-hidden flex flex-col items-center justify-center"
      style={{ background: "#000" }}
    >
      {/* Ambient gold glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(212, 165, 116, 0.08) 0%, transparent 60%)",
        }}
      />

      {/* ── PHASE 0: answer cards fan out ── */}
      <AnimatePresence>
        {phase === 0 && (
          <motion.div
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {QUESTIONS.map((q, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 100, rotate: 0, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  rotate: (i - 2) * 6,
                  x: (i - 2) * 14,
                  scale: 1,
                }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.15,
                  ease: SPRING,
                }}
                className="absolute"
                style={{
                  width: 220,
                  height: 290,
                  background: "#1C1C22",
                  border: "1px solid rgba(245, 242, 237, 0.12)",
                  borderRadius: 16,
                  padding: 18,
                  boxShadow:
                    "0 30px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,165,116,0.05)",
                  zIndex: i,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#D4A574",
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    fontWeight: 500,
                    marginBottom: 10,
                  }}
                >
                  Step {q.num} · {q.label}
                </div>
                <div
                  className="font-serif"
                  style={{
                    fontSize: 14,
                    color: "#F5F2ED",
                    lineHeight: 1.4,
                    fontStyle: "italic",
                    marginBottom: 12,
                  }}
                >
                  {q.q}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#8A8580",
                    lineHeight: 1.5,
                  }}
                >
                  {answers[i] || "—"}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PHASE 1+: Builder's Covenant document ── */}
      <AnimatePresence>
        {phase >= 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, ease: SPRING }}
            className="relative z-10"
            style={{
              width: 320,
              background: "#FAF7F0",
              borderRadius: 4,
              padding: "32px 28px",
              boxShadow:
                "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,165,116,0.2)",
              fontFamily: "var(--font-cormorant), Georgia, serif",
            }}
          >
            {/* Header */}
            <div
              style={{
                textAlign: "center",
                borderBottom: "1px solid #d4cdb8",
                paddingBottom: 14,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: "#8B7E5C",
                  textTransform: "uppercase",
                  letterSpacing: "0.3em",
                  fontWeight: 500,
                  marginBottom: 4,
                  fontFamily: "var(--font-jakarta), system-ui, sans-serif",
                }}
              >
                Builder&apos;s Covenant
              </div>
              <div
                style={{
                  fontSize: 24,
                  color: "#1a1a1a",
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                }}
              >
                AOS
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#8B7E5C",
                  fontStyle: "italic",
                  marginTop: 2,
                }}
              >
                Issued {issuanceDate}
              </div>
            </div>

            {/* Intention */}
            <div
              style={{
                fontSize: 12,
                color: "#3a3a3a",
                lineHeight: 1.5,
                fontStyle: "italic",
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              I commit, with full intention, to the following work for thirty
              days.
            </div>

            {/* The Build */}
            <div
              style={{
                background: "rgba(212, 165, 116, 0.08)",
                padding: 14,
                borderRadius: 4,
                marginBottom: 18,
                border: "1px solid rgba(212, 165, 116, 0.2)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "#8B7E5C",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontWeight: 500,
                  marginBottom: 4,
                  fontFamily: "var(--font-jakarta), system-ui, sans-serif",
                }}
              >
                The Build
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "#1a1a1a",
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                }}
              >
                {opportunityTitle}
              </div>
            </div>

            {/* Signature area */}
            <div style={{ marginTop: 24 }}>
              <div
                style={{
                  borderBottom: signed
                    ? "1px solid #1a1a1a"
                    : "1px dashed #b8a878",
                  height: 50,
                  position: "relative",
                  display: "flex",
                  alignItems: "flex-end",
                  transition: "border-bottom 0.3s",
                }}
              >
                <AnimatePresence>
                  {signed && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ paddingBottom: 6 }}
                    >
                      <svg
                        width="160"
                        height="40"
                        viewBox="0 0 160 40"
                        style={{ overflow: "visible" }}
                      >
                        <motion.path
                          d="M 8 28 Q 18 8, 32 24 T 60 22 Q 75 14, 90 26 T 130 20 L 152 18"
                          stroke="#1a1a1a"
                          strokeWidth="2"
                          fill="none"
                          strokeLinecap="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1, ease: SPRING }}
                        />
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#8B7E5C",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  fontWeight: 500,
                  marginTop: 6,
                  fontFamily: "var(--font-jakarta), system-ui, sans-serif",
                }}
              >
                Builder&apos;s Signature
              </div>
            </div>

            {/* Wax seal */}
            <AnimatePresence>
              {phase >= 3 && (
                <motion.div
                  initial={{ scale: 0, rotate: -180, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.8, ease: POP }}
                  className="absolute flex items-center justify-center"
                  style={{
                    bottom: 32,
                    right: 22,
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle at 30% 30%, #E0B884 0%, #B8915C 50%, #8B6F3E 100%)",
                    boxShadow:
                      "0 8px 16px rgba(0,0,0,0.3), inset 0 -4px 8px rgba(0,0,0,0.2), inset 0 4px 8px rgba(255,255,255,0.2)",
                  }}
                >
                  <span
                    className="font-serif"
                    style={{
                      fontSize: 24,
                      color: "#5C4220",
                      fontWeight: 400,
                      textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                      lineHeight: 1,
                    }}
                  >
                    A
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PHASE 2: hold-to-sign prompt ── */}
      <AnimatePresence>
        {phase === 2 && !signed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="absolute bottom-16 left-0 right-0 flex flex-col items-center gap-3.5 z-20"
          >
            <p
              className="font-serif italic"
              style={{ fontSize: 12, color: "#8A8580" }}
            >
              Press and hold to sign your covenant
            </p>
            <motion.button
              onMouseDown={startHold}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={startHold}
              onTouchEnd={cancelHold}
              whileTap={{ scale: 0.98 }}
              className="relative overflow-hidden"
              style={{
                width: 240,
                height: 54,
                borderRadius: 27,
                background: "#D4A574",
                border: "none",
                color: "#1a1a1a",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "-0.01em",
                userSelect: "none",
                WebkitUserSelect: "none",
              }}
            >
              {/* Fill overlay */}
              <div
                className="absolute left-0 top-0 bottom-0"
                style={{
                  width: `${holdProgress * 100}%`,
                  background: "rgba(255, 255, 255, 0.25)",
                  transition: "width 0.05s linear",
                }}
              />
              <span className="relative z-10">Hold to commit</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PHASE 4: "It is done." completion overlay ── */}
      <AnimatePresence>
        {phase === 4 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex flex-col items-center justify-center z-30 px-8"
            style={{
              background: "rgba(0, 0, 0, 0.85)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            {/* Gold check */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, ease: POP }}
              className="flex items-center justify-center mb-6"
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "#D4A574",
                boxShadow: "0 0 60px rgba(212, 165, 116, 0.4)",
              }}
            >
              <Check size={36} color="#1a1a1a" strokeWidth={2.5} />
            </motion.div>

            {/* Copy */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-center mb-8"
            >
              <div
                className="font-serif"
                style={{
                  fontSize: 32,
                  color: "#F5F2ED",
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  marginBottom: 8,
                }}
              >
                It is done.
              </div>
              <div
                className="font-serif italic"
                style={{
                  fontSize: 14,
                  color: "#8A8580",
                  lineHeight: 1.5,
                  maxWidth: 280,
                }}
              >
                Your sprint begins now. Thirty days. One commitment. Build with
                conviction.
              </div>
            </motion.div>

            {/* Begin sprint */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              onClick={() => router.push("/dashboard")}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: "14px 32px",
                background: "#F5F2ED",
                color: "#0A0A0C",
                border: "none",
                borderRadius: 100,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "-0.01em",
              }}
            >
              Begin sprint
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
