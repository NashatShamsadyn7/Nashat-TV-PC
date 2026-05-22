import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#e11d48',
          600: '#be123c',
          700: '#9f1239',
          800: '#881337',
          900: '#4c0519'
        },
        ink: {
          900: '#0a0a0b',
          800: '#111114',
          700: '#1a1a1f',
          600: '#22222a',
          500: '#2d2d36',
          400: '#3a3a45',
          300: '#5a5a68',
          200: '#9a9aa8',
          100: '#d1d1d8'
        }
      },
      fontFamily: {
        sans: [
          'Cairo',
          'Tajawal',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif'
        ]
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        shimmer: 'shimmer 2s linear infinite'
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' }
        }
      },
      backdropBlur: { xs: '2px' }
    }
  },
  plugins: []
} satisfies Config
