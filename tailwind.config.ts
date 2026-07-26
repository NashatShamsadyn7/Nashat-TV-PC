import type { Config } from 'tailwindcss'

/**
 * Reads a theme variable set by `applyTheme`, falling back to the default
 * (crimson) palette when no theme has been applied yet — during the first paint
 * before React mounts, for instance.
 *
 * These MUST be variables rather than literal hex: `applyTheme` writes
 * `--brand-500` & co. onto <html>, and until the colours were routed through
 * them the whole six-theme switcher wrote variables nothing ever read, so
 * changing the theme did nothing at all.
 *
 * The variables hold space-separated RGB channels ("225 29 72") so that
 * `<alpha-value>` keeps working — `bg-brand-500/12` and friends still compose.
 */
const themed = (name: string, fallback: string): string =>
  `rgb(var(${name}, ${fallback}) / <alpha-value>)`

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
          300: themed('--brand-300', '253 164 175'),
          400: themed('--brand-400', '251 113 133'),
          500: themed('--brand-500', '225 29 72'),
          600: themed('--brand-600', '190 18 60'),
          700: '#9f1239',
          800: '#881337',
          900: themed('--brand-900', '76 5 25')
        },
        ink: {
          900: themed('--ink-900', '10 10 11'),
          800: themed('--ink-800', '17 17 20'),
          700: themed('--ink-700', '26 26 31'),
          600: themed('--ink-600', '34 34 42'),
          500: themed('--ink-500', '45 45 54'),
          400: themed('--ink-400', '58 58 69'),
          300: themed('--ink-300', '90 90 104'),
          200: themed('--ink-200', '154 154 168'),
          100: themed('--ink-100', '209 209 216')
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
