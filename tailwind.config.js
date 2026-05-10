/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#0a7ea4',
        secondary: '#C06B6E',
        'ft-muted': '#6B7280',
        'ft-gray': '#f3f4f6',
        'ft-green': '#22C55E',
        'ft-orange': '#F97316',
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
};
