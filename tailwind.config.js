/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#0a7ea4',
        secondary: '#C06B6E',
        muted: '#6B7280',
        gray: "#f3f4f6",
        green: '#22C55E',
        orange: '#F97316',
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
};
