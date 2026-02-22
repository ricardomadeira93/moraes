import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0f766e",
        secondary: "#1f2937"
      }
    }
  },
  plugins: []
} satisfies Config;
