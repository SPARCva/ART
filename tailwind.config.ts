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
        pine:  "#002B50", // SPARC dark navy — headings, footer
        moss:  "#5A6B7A", // secondary text (navy-gray, AA on white)
        fern:  "#00539B", // SPARC royal blue — primary actions/links
        kelly: "#4CBB17", // SPARC kelly green — decorative accents only
        kellydark: "#3a9212",
        mist:  "#F5F5F5", // SPARC soft gray page background
        paper: "#FFFFFF",
        ink:   "#333333", // SPARC charcoal body text
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
