import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#0a0e14",
          panel: "#0f141c",
          border: "#1c2430",
          muted: "#5b6b7f",
          text: "#d5dee9",
          green: "#2ebd85",
          red: "#f6465d",
          amber: "#f0b90b",
          orange: "#ff8a00",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
