import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#F0FDFA",
          100: "#CCFBF1",
          700: "#0F766E",
          800: "#115E59",
        },
        ink: {
          900: "#0F172A",
          600: "#475569",
          500: "#64748B",
        },
        line: {
          300: "#CBD5E1",
        },
        surface: "#FFFFFF",
        pageBg: "#F8FAFC",
        semantic: {
          success: "#15803D",
          "success-tint": "#DCFCE7",
          info: "#1E40AF",
          "info-tint": "#DBEAFE",
          warning: "#92400E",
          "warning-tint": "#FEF3C7",
          danger: "#B91C1C",
          "danger-tint": "#FEE2E2",
        },
      },
    },
  },
  plugins: [],
};
export default config;
