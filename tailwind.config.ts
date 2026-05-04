import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1400px" } },
    extend: {
      fontFamily: {
        display: ['Sora', 'ui-sans-serif', 'system-ui'],
        body: ['Manrope', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        "surface-elevated": "hsl(var(--surface-elevated))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        status: {
          safe: "hsl(var(--status-safe))",
          "safe-bg": "hsl(var(--status-safe-bg))",
          warn: "hsl(var(--status-warn))",
          "warn-bg": "hsl(var(--status-warn-bg))",
          danger: "hsl(var(--status-danger))",
          "danger-bg": "hsl(var(--status-danger-bg))",
        },
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-safe": "var(--gradient-safe)",
        "gradient-warn": "var(--gradient-warn)",
        "gradient-danger": "var(--gradient-danger)",
        "gradient-surface": "var(--gradient-surface)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        elegant: "var(--shadow-elegant)",
        glow: "var(--shadow-glow)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "slide-up": { from: { transform: "translateY(20px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        "pulse-glow": { "0%,100%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0.4)" }, "50%": { boxShadow: "0 0 0 12px hsl(var(--primary) / 0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-up": "slide-up 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
