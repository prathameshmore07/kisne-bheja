import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F5F1",
        ink: "#1B1D22",
        muted: "#6B6F76",
        line: "#E4E2DC",
        amber: "#DC9F3D",
        green: "#227A56",
        red: "#B4432F",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)"],
        body: ["var(--font-inter)"],
        mono: ["var(--font-plex-mono)"],
      },
    },
  },
  plugins: [],
};
export default config;
