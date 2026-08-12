import type { Config } from "tailwindcss";

/**
 * LuxeMarket design tokens.
 * Editorial, premium aesthetic: near-black ink, warm ivory paper,
 * and a restrained champagne-gold accent. Serif display + clean sans.
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1360px" },
    },
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0B0B0C",
          soft: "#1A1A1D",
          muted: "#6B6B70",
        },
        ivory: {
          DEFAULT: "#FAF8F4",
          deep: "#F1ECE3",
        },
        gold: {
          DEFAULT: "#B8945F",
          soft: "#D9C4A1",
          deep: "#8C6B3E",
        },
        emerald: {
          DEFAULT: "#0F6B4F",
        },
        border: "hsl(30 12% 88%)",
        background: "#FAF8F4",
        foreground: "#0B0B0C",
        muted: { DEFAULT: "#F1ECE3", foreground: "#6B6B70" },
        destructive: { DEFAULT: "#B4432B", foreground: "#FAF8F4" },
        success: { DEFAULT: "#0F6B4F", foreground: "#FAF8F4" },
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,11,12,0.04), 0 8px 24px -12px rgba(11,11,12,0.12)",
        lift: "0 12px 40px -16px rgba(11,11,12,0.22)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
