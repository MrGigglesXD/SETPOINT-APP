/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0f172a",
        card: "#1e293b",
        card2: "#162032",
        card3: "#243247",
        border: "rgba(148,163,184,0.15)",
        muted: "#94a3b8",
        setpoint: {
          yellow: "#facc15",
          blue: "#2563eb",
          "blue-dim": "rgba(37,99,235,0.15)",
          "blue-text": "#93c5fd",
          red: "#dc2626",
          "red-dim": "rgba(220,38,38,0.15)",
          "red-text": "#fca5a5",
          green: "#22c55e",
          teal: "#22d3ee",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
