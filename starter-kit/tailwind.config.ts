import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          bg:        "#0A0A0C",
          surface:   "#15151A",
          elevated:  "#1C1C22",
          border:    "var(--ink-border)",
          text:      "#F5F2ED",
          secondary: "#8A8580",
          tertiary:  "#5A5650",
          gold:      "#D4A574",
          accent:    "#3DB87A",
        },
      },
      fontFamily: {
        sans:  ["var(--font-jakarta)", "system-ui", "sans-serif"],
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        mono:  ["var(--font-jetbrains)", "monospace"],
      },
      transitionTimingFunction: {
        spring:       "cubic-bezier(0.22, 1, 0.36, 1)",
        "spring-pop": "cubic-bezier(0.22, 1.5, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
