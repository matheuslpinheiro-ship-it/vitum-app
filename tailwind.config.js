/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        vitum: {
          primary: '#09A66D',
          dark: '#1D1D1F',
          light: '#F5F5F3',
          border: '#E5E5E5',
        }
      }
    },
  },
  plugins: [],
}