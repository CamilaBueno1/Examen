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
        // Mapping of custom brand colors used throughout the UI components
        "brand-paper": "#F6F8FC",
        "brand-navy": "#163D77",
        "brand-gold": "#E9B949",
        "brand-ink": "#172033",
        "brand-muted": "#667085",
        "brand-line": "#D7DEEA",
        "brand-surface": "#FFFFFF",
        "brand-danger": "#B42318",
        "brand-warning": "#B54708",
        "brand-success": "#067647",
        // Add any additional brand colors referenced in the code
        "brand-primary": "#163D77",
        "brand-primary-pressed": "#0E2D5B",
      },
    },
  },
  plugins: [],
};
