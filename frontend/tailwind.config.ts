import type { Config } from 'tailwindcss'

// Tokens trasladados del :root de la SPA original para conservar el look.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F7B92',
          dark: '#0a6577',
          light: '#E6F3F6',
        },
        surface: {
          DEFAULT: '#ffffff',
          2: '#F5F8FA',
        },
        border: '#E8EDF2',
        ink: {
          DEFAULT: '#0F1B2D',
          muted: '#647084',
        },
        danger: '#ef4444',
        success: '#0E9F6E',
        // Paleta de avatares (hash de nombre → c0..c7).
        avatar: {
          0: '#0F7B92',
          1: '#7C3AED',
          2: '#DB2777',
          3: '#EA580C',
          4: '#0E9F6E',
          5: '#2563EB',
          6: '#D97706',
          7: '#DC2626',
        },
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        card: '18px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,27,45,.04),0 8px 22px -14px rgba(15,27,45,.16)',
        md: '0 4px 12px rgba(15,27,45,.10)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn .2s ease',
        slideUp: 'slideUp .35s cubic-bezier(.16,.84,.44,1) both',
      },
    },
  },
  plugins: [],
} satisfies Config
