import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          0: "var(--bg-0)",
          1: "var(--bg-1)",
        },
        panel: {
          DEFAULT: "var(--panel)",
          2: "var(--panel-2)",
        },
        text: {
          0: "var(--text-0)",
          1: "var(--text-1)",
          2: "var(--text-2)",
        },
        brand: {
          0: "var(--brand-0)",
          1: "var(--brand-1)",
        },
        cyan: {
          0: "var(--cyan-0)",
        },
        green: {
          0: "var(--green-0)",
        },
        amber: {
          0: "var(--amber-0)",
        },
        red: {
          0: "var(--red-0)",
        },
        line: {
          DEFAULT: "var(--line)",
          strong: "var(--line-strong)",
        },
      },
      fontFamily: {
        display: ["Inter Tight", "Inter", "PingFang SC", "Helvetica Neue", "sans-serif"],
        body: ["Inter", "PingFang SC", "Helvetica Neue", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0, 0, 0, 0.22)",
        brand: "0 0 0 1px rgba(138, 127, 255, 0.18), 0 8px 30px rgba(110, 99, 255, 0.22)",
      },
      borderRadius: {
        xl: "28px",
        lg: "24px",
        md: "16px",
      },
      maxWidth: {
        content: "1240px",
      },
    },
  },
  plugins: [],
};

export default config;
