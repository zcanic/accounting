/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 主题色
        'ivory': '#FDFBEB',
        'peach': '#F2C29D',
        'peach-light': '#F8DCC4',
        'peach-dark': '#D9A87A',
        'mint': '#99C0AE',
        'mint-light': '#B8D4C8',
        'mint-dark': '#7BA897',
        // 文字色
        'ink': '#2D3436',
        'ink-light': '#636E72',
        'ink-muted': '#95A5A6',
        // 功能色
        'success': '#7BA897',
        'error': '#E17055',
        'error-light': '#FDEBE6',
      },
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'mono': ['JetBrains Mono', 'monospace'],
        'sans': ['system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(45, 52, 54, 0.06)',
        'card-hover': '0 4px 12px rgba(45, 52, 54, 0.1)',
        'rune': '0 2px 4px rgba(45, 52, 54, 0.08)',
        'rune-hover': '0 4px 8px rgba(45, 52, 54, 0.12)',
        'button': '0 2px 6px rgba(45, 52, 54, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.15s ease-out',
        'shake': 'shake 0.3s ease-in-out',
        'pop': 'pop 0.1s ease-out',
        'flash-success': 'flashSuccess 0.4s ease-out',
        'flash-error': 'flashError 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-3px)' },
          '50%': { transform: 'translateX(3px)' },
          '75%': { transform: 'translateX(-3px)' },
        },
        pop: {
          '0%': { transform: 'scale(0.97)' },
          '100%': { transform: 'scale(1)' },
        },
        flashSuccess: {
          '0%': { backgroundColor: 'rgba(123, 168, 151, 0.2)' },
          '100%': { backgroundColor: 'transparent' },
        },
        flashError: {
          '0%': { backgroundColor: 'rgba(225, 112, 85, 0.15)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
    },
  },
  plugins: [],
}
