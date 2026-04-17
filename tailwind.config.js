/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'nba-navy': '#0a0e1a',
        'nba-dark': '#0f1525',
        'nba-card': '#151c30',
        'nba-border': '#1e2a45',
        'nba-gold': '#c8a84b',
        'nba-gold-light': '#f0c040',
        'nba-blue': '#1d428a',
        'nba-red': '#c8102e',
      },
      fontFamily: {
        'display': ['Bebas Neue', 'Impact', 'sans-serif'],
        'body': ['Barlow', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-blue': 'pulseBlue 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        pulseBlue: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(29, 66, 138, 0.7)' },
          '50%': { boxShadow: '0 0 0 8px rgba(29, 66, 138, 0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
