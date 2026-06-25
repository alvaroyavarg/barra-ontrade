import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#FAFAFB",
        card: "#FFFFFF",
        line: "#EEEEF2",
        ink: "#1A1A1E",
        muted: "#6B6B76",
        accent: { DEFAULT: "#5B5BD6", 700: "#4A4AC0", soft: "#EEEEFB" },
        ok: "#17B26A",
        warn: "#F79009",
        bad: "#E5484D",
      },
      borderRadius: { xl: "12px", "2xl": "16px" },
      boxShadow: {
        soft: "0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.05)",
        md: "0 4px 16px rgba(16,24,40,.06)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
