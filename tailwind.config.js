/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      cursor: {
        'pointer': 'pointer',
        'hand': 'pointer',
      },
      keyframes: {
        'flash-ok': {
          '0%':   { backgroundColor: 'transparent' },
          '12%':  { backgroundColor: 'rgb(220 252 231 / 0.8)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'flash-err': {
          '0%':   { backgroundColor: 'transparent' },
          '12%':  { backgroundColor: 'rgb(254 226 226 / 0.9)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'blinkSuccess': {
          '0%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.7)' },
          '70%': { boxShadow: '0 0 0 8px rgba(16, 185, 129, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        fadeOut: {
          from: { opacity: '1', transform: 'scale(1)' },
          to: { opacity: '0', transform: 'scale(0.95)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '1', transform: 'translateY(0)' },
          to: { opacity: '0', transform: 'translateY(10px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(59, 130, 246, 0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'flash-ok': 'flash-ok 900ms ease-in-out 1',
        'flash-err': 'flash-err 900ms ease-in-out 1',
        'blink': 'blinkSuccess 0.6s ease-out',
        'fadeIn': 'fadeIn 0.2s ease-in-out forwards',
        'fadeOut': 'fadeOut 0.2s ease-in-out forwards',
        'slideUp': 'slideUp 0.3s ease-out forwards',
        'slideDown': 'slideDown 0.3s ease-out forwards',
        'pulseGlow': 'pulseGlow 2s ease-in-out infinite',
        'slide-in': 'slideIn 0.3s ease-out forwards',
      },
    }
  },
  darkMode: "class",
  plugins: [],
};
