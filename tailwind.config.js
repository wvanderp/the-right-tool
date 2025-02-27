/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#CA8A04', // yellow-600
          hover: '#A16207', // yellow-700
          active: '#854D0E', // yellow-800
        },
        secondary: {
          DEFAULT: '#4B5563', // gray-600
          hover: '#374151', // gray-700
          light: '#9CA3AF', // gray-400
        }
      }
    },
  },
  plugins: [],
}

