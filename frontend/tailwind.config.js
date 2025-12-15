/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f1ff',
          100: '#b3d9ff',
          200: '#80c1ff',
          300: '#4da9ff',
          400: '#1a91ff',
          500: '#0070e6',
          600: '#0059b3',
          700: '#004280',
          800: '#002b4d',
          900: '#00141a',
        },
        secondary: {
          50: '#e6f9f9',
          100: '#b3f0f0',
          200: '#80e7e7',
          300: '#4ddede',
          400: '#1ad5d5',
          500: '#00b8b8',
          600: '#009393',
          700: '#006e6e',
          800: '#004949',
          900: '#002424',
        },
        game: {
          water: '#1e40af',
          waterLight: '#3b82f6',
          ship: '#374151',
          shipHover: '#4b5563',
          hit: '#dc2626',
          miss: '#6b7280',
          sunk: '#991b1b',
          valid: '#10b981',
          invalid: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
        display: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'cell-hover': '0 0 10px rgba(59, 130, 246, 0.5)',
        'ship-placement': '0 4px 12px rgba(0, 0, 0, 0.3)',
        'hit': '0 0 15px rgba(220, 38, 38, 0.6)',
        'miss': '0 0 10px rgba(107, 114, 128, 0.4)',
      },
      animation: {
        'attack': 'attack 300ms ease-out',
        'hit': 'hit 500ms ease-out',
        'sunk': 'sunk 700ms ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        attack: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.2)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        hit: {
          '0%': { transform: 'scale(1)', opacity: '0' },
          '50%': { transform: 'scale(1.5)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        sunk: {
          '0%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
          '50%': { transform: 'scale(1.2) rotate(10deg)', opacity: '0.5' },
          '100%': { transform: 'scale(0.9) rotate(0deg)', opacity: '0.3' },
        },
      },
    },
  },
  plugins: [],
}
