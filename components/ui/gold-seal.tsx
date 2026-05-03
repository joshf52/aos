"use client";

import { motion } from "framer-motion";

const SPRING = [0.22, 1, 0.36, 1] as const;

export function GoldSeal({
  size = 56,
  letter = "A",
  pulse = false,
}: {
  size?: number;
  letter?: string;
  pulse?: boolean;
}) {
  const id = `seal-${letter}`;
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.7, ease: SPRING }}
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {pulse && (
        <motion.div
          aria-hidden
          animate={{ scale: [1, 1.4, 1], opacity: [0.18, 0, 0.18] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full"
          style={{ background: "#D4A574" }}
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        aria-hidden
        style={{ filter: "drop-shadow(0 4px 12px rgba(212,165,116,0.25))" }}
      >
        <defs>
          <radialGradient id={`${id}-fill`} cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#E8BD8E" />
            <stop offset="55%" stopColor="#D4A574" />
            <stop offset="100%" stopColor="#9B7A4F" />
          </radialGradient>
          <radialGradient id={`${id}-rim`} cx="50%" cy="50%" r="50%">
            <stop offset="85%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
          </radialGradient>
        </defs>
        {/* Outer ring */}
        <circle cx="32" cy="32" r="30" fill={`url(#${id}-fill)`} />
        <circle cx="32" cy="32" r="30" fill={`url(#${id}-rim)`} />
        {/* Inner ridge */}
        <circle
          cx="32"
          cy="32"
          r="25"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="0.7"
        />
        <circle
          cx="32"
          cy="32"
          r="22"
          fill="none"
          stroke="rgba(0,0,0,0.18)"
          strokeWidth="0.5"
        />
        {/* Highlight */}
        <ellipse
          cx="24"
          cy="22"
          rx="11"
          ry="7"
          fill="rgba(255,255,255,0.18)"
        />
        {/* Letter */}
        <text
          x="32"
          y="42"
          textAnchor="middle"
          fontFamily="var(--font-cormorant), Georgia, serif"
          fontSize="24"
          fontStyle="italic"
          fontWeight="500"
          fill="#3a2814"
          style={{ letterSpacing: "-0.02em" }}
        >
          {letter}
        </text>
      </svg>
    </motion.div>
  );
}
