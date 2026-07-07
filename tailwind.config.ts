import type { Config } from "tailwindcss";

/**
 * Every value here was extracted directly from the approved HTML prototypes
 * (:root CSS variables). This file is the ONLY place these values should be
 * defined — components must reference tokens (e.g. `bg-navy`, `rounded-card`),
 * never hardcode hex values or pixel radii inline.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
    },
    extend: {
      colors: {
        // Core brand
        navy: {
          DEFAULT: "#132B4E",
          deep: "#0A1A33",
        },
        ink: "#1D2939",
        slate: {
          DEFAULT: "#5B6B85",
          light: "#8B98AC",
        },
        paper: "#FFFFFF",
        mist: {
          DEFAULT: "#F5F7FA",
          2: "#EEF1F6",
        },
        line: "#E6E9F0",
        gold: {
          DEFAULT: "#B4863F",
          light: "#E6C88A",
        },
        teal: {
          DEFAULT: "#0E8C77",
          bright: "#1FB894",
          light: "#E7F5F1",
        },
        // Reserved exclusively for the six Enterprise Value drivers.
        // Do not reuse these for unrelated UI — see components/health-score.
        driver: {
          financial: "#1FB894",      // Financial Strength
          operational: "#3C8CD9",    // Operational Excellence
          growth: "#D9A441",         // Strategic Growth
          governance: "#D97757",     // Governance & Leadership
          technology: "#4C5FD5",     // Technology & Intelligence
          capital: "#E6C88A",        // Capital & Valuation
        },
        // shadcn/ui compatibility layer (maps radix primitives to our tokens)
        border: "#E6E9F0",
        input: "#E6E9F0",
        ring: "#0E8C77",
        background: "#FFFFFF",
        foreground: "#1D2939",
        primary: {
          DEFAULT: "#132B4E",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F5F7FA",
          foreground: "#132B4E",
        },
        muted: {
          DEFAULT: "#F5F7FA",
          foreground: "#5B6B85",
        },
        accent: {
          DEFAULT: "#E7F5F1",
          foreground: "#0E8C77",
        },
        destructive: {
          DEFAULT: "#D97757",
          foreground: "#FFFFFF",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["var(--font-mono)", "SF Mono", "Consolas", "monospace"],
      },
      fontSize: {
        // Named to match the Design System doc, not raw pixel guesses
        "display-lg": ["clamp(2rem, 4.6vw, 3.625rem)", { lineHeight: "1.06", letterSpacing: "-0.015em" }],
        "display-md": ["clamp(1.75rem, 4vw, 3rem)", { lineHeight: "1.1", letterSpacing: "-0.015em" }],
        "heading-lg": ["clamp(1.75rem, 3.4vw, 2.5rem)", { lineHeight: "1.15", letterSpacing: "-0.01em" }],
        "heading-md": ["1.375rem", { lineHeight: "1.3" }],
        eyebrow: ["0.78rem", { lineHeight: "1.2", letterSpacing: "0.14em" }],
      },
      borderRadius: {
        input: "8px",
        sm: "14px",
        card: "20px",
        "card-lg": "28px",
        pill: "100px",
      },
      boxShadow: {
        "elevation-1": "0 4px 12px -4px rgba(19,43,78,0.12)",
        "elevation-2": "0 20px 40px -20px rgba(19,43,78,0.2)",
        "elevation-3": "0 50px 90px -24px rgba(10,26,51,0.5)",
        "card-hover": "0 30px 50px -30px rgba(19,43,78,0.25)",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
      transitionDuration: {
        250: "250ms",
        400: "400ms",
        700: "700ms",
        1200: "1200ms",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "fade-up": "fade-up 700ms ease forwards",
        "pulse-dot": "pulse-dot 1.8s infinite ease-in-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
