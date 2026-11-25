// Guía: Define opciones de Tailwind para la interfaz.

// tailwind.config.cjs - NativeWind configuration for the project
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.tsx",
    "./src/**/*.ts",
    "./src/**/*.jsx",
    "./src/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        "brand-paper": "#F6F5F0",
        "brand-navy": "#15464B",
        "brand-gold": "#BF9A59",
        "brand-ink": "#192B2E",
        "brand-muted": "#546564",
        "brand-line": "#DCE3DE",
        "brand-surface": "#FFFEFA",
        "brand-danger": "#B42318",
        "brand-warning": "#B54708",
        "brand-success": "#067647",
        "brand-primary": "#15464B",
        "brand-primary-pressed": "#10363A",
      },
    },
  },
  plugins: [],
};
