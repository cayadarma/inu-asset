/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0D9488",
        "primary-light": "#CCFBF1",
        dark: "#0F172A",
        secondary: "#475569",
        "muted-text": "#94A3B8",
        "bg-main": "#F8FAFC",
        danger: "#EF4444",
      },
    },
  },
  plugins: [],
}