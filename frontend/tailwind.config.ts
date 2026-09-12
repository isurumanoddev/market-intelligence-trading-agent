import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#0a0d14",
          panel: "#111622",
          sub: "#171f30",
          border: "#1e293b",
          hover: "#1e293b",
        },
        accent: {
          green: "#10b981",
          emerald: "#059669",
          red: "#f43f5e",
          rose: "#be123c",
          blue: "#3b82f6",
          cyan: "#06b6d4",
          amber: "#f59e0b",
          purple: "#8b5cf6",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
