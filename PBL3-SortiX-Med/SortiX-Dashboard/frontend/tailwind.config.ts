import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      screens: {
        xs: "480px",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        emerald: colors.blue,
        green: colors.blue,
        teal: colors.blue,
        primary: {
          DEFAULT: "#00f2fe",
          dark: "#0891b2",
          light: "#67e8f9",
        },
        cyber: {
          bg: "#090d16",
          panel: "rgba(15, 23, 42, 0.75)",
          border: "rgba(51, 65, 85, 0.6)",
          cyan: "#00f2fe",
          emerald: "#3b82f6",
          amber: "#f59e0b",
          rose: "#f43f5e",
          purple: "#a855f7",
          blue: "#3b82f6",
        },
      },
      boxShadow: {
        glow: "0 0 20px -5px rgba(0, 242, 254, 0.35)",
        "glow-emerald": "0 0 20px -5px rgba(59, 130, 246, 0.35)",
        "glow-rose": "0 0 20px -5px rgba(244, 63, 94, 0.35)",
        "glow-amber": "0 0 20px -5px rgba(245, 158, 11, 0.35)",
      },
      animation: {
        "spin-slow": "spin 8s linear infinite",
        "pulse-glow": "pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        scan: "scanLine 3s ease-in-out infinite",
        conveyor: "conveyorStripes 1.2s linear infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1", filter: "drop-shadow(0 0 10px rgba(0, 242, 254, 0.6))" },
          "50%": { opacity: "0.6", filter: "drop-shadow(0 0 2px rgba(0, 242, 254, 0.2))" },
        },
        scanLine: {
          "0%": { transform: "translateY(0%)" },
          "50%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0%)" },
        },
        conveyorStripes: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "32px 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
