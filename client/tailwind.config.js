/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Deep slate/charcoal base
        base: {
          950: '#080b10',
          900: '#0d1117',
          800: '#161b22',
          700: '#21262d',
          600: '#30363d',
        },
        // Neon cyan accent
        cyan: {
          glow: '#00ffcc',
          400: '#22d3ee',
          500: '#06b6d4',
        },
        // Violet accent
        violet: {
          glow: '#bf5fff',
          400: '#a78bfa',
          500: '#8b5cf6',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-in-left': 'slideInLeft 0.35s cubic-bezier(0.22,1,0.36,1) forwards',
        'slide-in-right': 'slideInRight 0.35s cubic-bezier(0.22,1,0.36,1) forwards',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'typing-dot': 'typingDot 1.2s ease-in-out infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(0,255,204,0.15)' },
          '50%': { boxShadow: '0 0 24px 6px rgba(0,255,204,0.35)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        typingDot: {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.3' },
          '30%': { transform: 'translateY(-4px)', opacity: '1' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}
