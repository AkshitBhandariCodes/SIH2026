import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-color-mode="dark"]'],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./services/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        canvas: {
          DEFAULT: "var(--canvas)",
          elevated: "var(--canvas-elevated)",
          subtle: "var(--canvas-subtle)",
        },
        hairline: {
          DEFAULT: "var(--hairline)",
          soft: "var(--hairline-soft)",
        },
        body: "var(--body-text)",
        mute: "var(--mute-text)",
        faint: "var(--faint-text)",
        accent: {
          blue: "#38bdf8",
          cyan: "#50e3c2",
          violet: "#a855f7",
          pink: "#f43f5e",
          amber: "#f59e0b",
          red: "#ef4444",
          emerald: "#10b981",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "Geist",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        mono: [
          "Geist Mono",
          '"JetBrains Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          '"Liberation Mono"',
          "monospace",
        ],
      },
      letterSpacing: {
        tighter: "-0.04em",
        tight: "-0.02em",
        normal: "0em",
        wide: "0.02em",
        wider: "0.05em",
      },
      borderRadius: {
        vercel: "6px",
        pill: "9999px",
      },
      backgroundImage: {
        "mesh-hero":
          "radial-gradient(at 10% 10%, rgba(0, 112, 243, 0.18) 0px, transparent 50%), radial-gradient(at 90% 15%, rgba(121, 40, 202, 0.2) 0px, transparent 55%), radial-gradient(at 50% 95%, rgba(80, 227, 194, 0.12) 0px, transparent 50%)",
        "gradient-develop": "linear-gradient(to right, #007cf0, #00dfd8)",
        "gradient-preview": "linear-gradient(to right, #7928ca, #ff0080)",
        "gradient-ship": "linear-gradient(to right, #ff4d4d, #f9cb28)",
      },
    },
  },
  plugins: [],
};

export default config;
