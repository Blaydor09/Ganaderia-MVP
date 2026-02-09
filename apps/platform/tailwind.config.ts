import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        slate: {
          950: "#050913",
        },
        infra: {
          50: "#eef4f7",
          100: "#d8e6ee",
          200: "#b3cddd",
          300: "#89acc7",
          400: "#5887ad",
          500: "#3f6f95",
          600: "#325978",
          700: "#2b4862",
          800: "#273d52",
          900: "#233447",
        },
      },
      fontFamily: {
        display: ["'Sora'", "system-ui", "sans-serif"],
        body: ["'Manrope'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 24px 48px rgba(7, 21, 44, 0.18)",
      },
    },
  },
  plugins: [],
} satisfies Config;
