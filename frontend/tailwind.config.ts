import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark theme palette
        surface: {
          DEFAULT: '#0f1117',
          50: '#1a1d2e',
          100: '#1e2235',
          200: '#252a3a',
          300: '#2d3348',
        },
        accent: {
          DEFAULT: '#6366f1', // indigo-500
          hover: '#818cf8',   // indigo-400
          muted: '#4f46e5',   // indigo-600
        },
        text: {
          primary: '#f1f5f9',   // slate-100
          secondary: '#94a3b8', // slate-400
          muted: '#64748b',     // slate-500
        },
        border: {
          DEFAULT: '#1e293b',   // slate-800
          hover: '#334155',     // slate-700
        },
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
