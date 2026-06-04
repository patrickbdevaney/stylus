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
        night: "#0a0a12",
        neon: {
          pink: "#ff2d95",
          cyan: "#00f0ff",
          purple: "#9d4edd",
          orange: "#ff6b35",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      fontSize: {
        stage: ["1.125rem", { lineHeight: "1.5", fontWeight: "600" }],
        "stage-sm": ["0.9375rem", { lineHeight: "1.45", fontWeight: "500" }],
      },
      boxShadow: {
        "neon-pink":
          "0 0 20px rgba(255, 45, 149, 0.5), 0 0 40px rgba(255, 45, 149, 0.2)",
        "neon-cyan":
          "0 0 20px rgba(0, 240, 255, 0.5), 0 0 40px rgba(0, 240, 255, 0.2)",
        "neon-purple":
          "0 0 24px rgba(157, 78, 221, 0.45), 0 0 48px rgba(157, 78, 221, 0.15)",
      },
      backgroundImage: {
        "hero-wash":
          "linear-gradient(135deg, rgba(255,45,149,0.15) 0%, rgba(0,240,255,0.1) 50%, rgba(157,78,221,0.12) 100%)",
        "grid-neon":
          "linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
      keyframes: {
        "step-glow": {
          "0%, 100%": {
            boxShadow:
              "0 0 0 1px rgba(255,45,149,0.4), 0 0 20px rgba(255,45,149,0.35)",
          },
          "50%": {
            boxShadow:
              "0 0 0 1px rgba(255,45,149,0.7), 0 0 32px rgba(255,45,149,0.55)",
          },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.85)", opacity: "1" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        "reveal-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "reveal-scale": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "arrow-nudge": {
          "0%, 100%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(6px)" },
        },
        "bar-grow": {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "step-glow": "step-glow 1.8s ease-in-out infinite",
        "pulse-ring": "pulse-ring 1.4s ease-out infinite",
        "reveal-up": "reveal-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "reveal-scale":
          "reveal-scale 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        shimmer: "shimmer 2.5s linear infinite",
        "arrow-nudge": "arrow-nudge 1.2s ease-in-out infinite",
        "bar-grow": "bar-grow 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "fade-in": "fade-in 0.4s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
