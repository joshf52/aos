"use client";

import { motion } from "framer-motion";

export function Aurora({ intensity = 1 }: { intensity?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <motion.div
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[10%] left-[20%] w-80 h-80"
        style={{
          background: `radial-gradient(circle, rgba(61,184,122,${0.18 * intensity}) 0%, transparent 60%)`,
          filter: "blur(40px)",
        }}
      />
      <motion.div
        animate={{ x: [0, -30, 40, 0], y: [0, 40, -10, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[40%] right-0 w-72 h-72"
        style={{
          background: `radial-gradient(circle, rgba(212,165,116,${0.12 * intensity}) 0%, transparent 60%)`,
          filter: "blur(40px)",
        }}
      />
    </div>
  );
}
