import type { Config } from "tailwindcss";

/**
 * Steps Toward Access design tokens — "the paper trail."
 * Deep greens carry the SPARC identity; paper and ink for the public record;
 * status colors are always paired with shape + label, never color alone.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pine:  "#20372B", // deep green — headings, primary text on light
        moss:  "#5C7263", // secondary text, rules
        fern:  "#256B43", // primary action (4.5:1+ on mist)
        mist:  "#F1F4F0", // page background (green-tinted, not cream)
        paper: "#FFFFFF", // cards, documents
        ink:   "#1C2420", // body text
        // status — used with icons + labels, never alone
        s_documented: "#5B4A9E", // violet — barrier recorded
        s_contacted:  "#0E5E6B", // teal — letter sent
        s_awaiting:   "#8A5A12", // amber — awaiting response
        s_resolved:   "#256B43", // green — fixed
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      maxWidth: { prose: "68ch" },
    },
  },
  plugins: [],
};
export default config;
