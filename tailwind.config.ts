import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        mint: "#2dd4bf",
        coral: "#fb7185"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(17, 24, 39, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
