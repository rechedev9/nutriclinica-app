import type { Config } from 'tailwindcss'

// Tokens semánticos como variables CSS (claro/oscuro). La marca (primary) y los
// colores vivos (avatares, semáforos) se mantienen fijos en ambos temas.
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F7B92',
          dark: '#0a6577',
          light: v('--primary-light'),
        },
        app: v('--app'),
        surface: {
          DEFAULT: v('--surface'),
          2: v('--surface-2'),
        },
        border: v('--border'),
        ink: {
          DEFAULT: v('--ink'),
          muted: v('--ink-muted'),
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
