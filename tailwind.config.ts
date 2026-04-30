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
    },
  },
  plugins: [],
};
export default config;
