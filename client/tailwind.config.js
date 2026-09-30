/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#FAF8F5',
        ink: {
          DEFAULT: '#141413',
          900: '#141413',
          800: '#232220',
          700: '#3A3835',
        },
        terracotta: {
          DEFAULT: '#C24B27',
          50: '#FDF4F2',
          100: '#FCE7E3',
          200: '#F7C6BC',
          300: '#F09C8B',
          400: '#E66F56',
          500: '#C24B27',
          600: '#A63E1F',
          700: '#8A3218',
        },
        borderSoft: '#EBE7DF',
        mutedText: '#706E6B',
        badgeBg: '#F1EDE4',
        brand: {
          DEFAULT: '#C24B27',
          500: '#C24B27',
          600: '#A63E1F',
        },
        accent: {
          DEFAULT: '#C24B27',
          terracotta: '#C24B27',
          blue: '#2F68FF',
          gold: '#D4A373',
          emerald: '#10B981',
          amber: '#F59E0B',
        }
      },
      fontFamily: {
        serif: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 24px -2px rgba(20, 20, 19, 0.06)',
        'card': '0 2px 14px 0 rgba(20, 20, 19, 0.05)',
      }
    },
  },
  plugins: [],
}
