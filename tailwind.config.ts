import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        aos: {
          bg:             "#0A0A0C",
          surface:        "#15151A",
          elevated:       "#1C1C22",
          // rgba tokens — defined as CSS vars in globals.css
          border:         "var(--aos-border)",
          "border-strong":"var(--aos-border-strong)",
          glass:          "var(--aos-glass)",
          text:           "#F5F2ED",
          secondary:      "#8A8580",
          tertiary:       "#5A5650",
          accent:         "#3DB87A",
          "accent-soft":  "var(--aos-accent-soft)",
          gold:           "#D4A574",
          "gold-soft":    "var(--aos-gold-soft)",
          energy:         "#3DB87A",
        },
        ink: {
          500: "#34343F",
          700: "#1F1F26",
        },
      },
      fontFamily: {
        sans:  ["var(--font-jakarta)", "system-ui", "sans-serif"],
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        mono:  ["var(--font-jetbrains)", "monospace"],
      },
      transitionTimingFunction: {
        spring:     "cubic-bezier(0.22, 1, 0.36, 1)",
        "spring-pop": "cubic-bezier(0.22, 1.5, 0.36, 1)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        drift: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "33%": { transform: "translate(2%, -3%)" },
          "66%": { transform: "translate(-2%, 2%)" },
        },
        pulseRail: {
          "0%, 100%": { opacity: "0.25", transform: "translateY(-10%)" },
          "50%": { opacity: "0.75", transform: "translateY(10%)" },
        },
        shipPop: {
          "0%": { opacity: "0", transform: "scale(0.85)" },
          "40%": { opacity: "1", transform: "scale(1.04)" },
          "100%": { opacity: "0", transform: "scale(1.4)" },
        },
      },
      animation: {
        drift: "drift 20s ease-in-out infinite",
        pulseRail: "pulseRail 3s ease-in-out infinite",
        shipPop: "shipPop 900ms cubic-bezier(0.22, 1.5, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};
export default config;
