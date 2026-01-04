/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        /* Semantic Colors */
        body: "hsl(var(--bg-body) / <alpha-value>)",
        surface: "hsl(var(--bg-surface) / <alpha-value>)",
        elevated: "hsl(var(--bg-elevated) / <alpha-value>)",

        primary: "hsl(var(--text-primary) / <alpha-value>)",
        secondary: "hsl(var(--text-secondary) / <alpha-value>)",
        tertiary: "hsl(var(--text-tertiary) / <alpha-value>)",

        subtle: "hsl(var(--border-subtle) / <alpha-value>)",

        /* Accent */
        accent: {
          DEFAULT: "var(--accent-exact)",
          hover: "var(--color-accent-hover)",
        },

        /* Legacy compat */
        "dark-card": "#191919",
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
        glow: "0 0 15px rgba(99, 102, 241, 0.3)",
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.4s ease-out",
        "scale-in": "scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
