/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind uses class-variance-authority with Tailwind - dark mode via class
  darkMode: 'class',
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./index.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
