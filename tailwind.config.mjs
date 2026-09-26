import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#ffff01",      // Everest Yellow — backgrounds only (fails contrast as text on white)
        "primary-dark": "#e6e600", // Darker Yellow for hover
        // Readable gold for text/icons on light surfaces. Passes WCAG AA (>=4.5:1)
        // on white, on slate-50, and on the primary/10 and /20 tints. Never use
        // `primary` or `primary-dark` as a foreground on light — they fail badly
        // (#ffff01 on white is 1.07:1).
        "primary-ink": "#7d6e00",
        "secondary": "#000000",    // Black
        "accent": "#ffffff",       // White
        "neutral-light": "#f3f4f6",
        "background-light": "#ffffff",
        "background-alt": "#fafafa",
        "background-dark": "#000000",
        // Chart palette — validated light + dark via the dataviz validator.
        // Everest yellow cannot carry data (fails contrast), so charts use these.
        chart: {
          1: "#1f6feb", 2: "#c9821a", 3: "#2a9d8f", 4: "#9333ea", 5: "#dc2626",
        },
      },
      fontFamily: {
        "display": ["var(--font-microgramme)", "Arial", "sans-serif"],
        "body": ["var(--font-inter)", "system-ui", "sans-serif"],
        "sans": ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "2xl": "1rem", "full": "9999px" },
      // Restrained luxury leans on hairline rules, not shadows. Two elevations only.
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'hover': '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
      },
      // Hairline borders: the primary way surfaces are separated.
      borderColor: {
        'hairline': 'rgba(0, 0, 0, 0.08)',
        'hairline-dark': 'rgba(255, 255, 255, 0.08)',
      },
      // Display sizes need negative tracking; small caps labels need positive.
      letterSpacing: {
        'display': '-0.02em',
        'label': '0.08em',
      },
      fontSize: {
        'display-sm': ['2rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'display-md': ['2.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg': ['3.75rem', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
        'label': ['0.6875rem', { lineHeight: '1', letterSpacing: '0.08em' }],
      },
      // Section rhythm for public pages.
      spacing: { 'section': '6rem', 'section-lg': '8rem' },
      zIndex: { '15': '15' },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s ease-out both',
      }
    },
  },
  plugins: [typography],
};
