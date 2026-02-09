import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f1f5f3",
          100: "#dfe8e3",
          200: "#c2d3cb",
          300: "#97b7a8",
          400: "#6e9a86",
          500: "#4d7d66",
          600: "#3d6452",
          700: "#314f41",
          800: "#283f35",
          900: "#22342d",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        body: ["'Public Sans'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.08)",
        panel: "0 18px 45px rgba(15, 23, 42, 0.14)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.4)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 320ms ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
