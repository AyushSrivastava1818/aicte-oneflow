/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aicte: {
          navy: '#0a2540',
          blue: '#0f3c6e',
          lightBlue: '#e8f0fe',
          accent: '#1e40af',
          saffron: '#d97706',
          saffronDark: '#b45309',
          saffronLight: '#fef3c7',
          emerald: '#047857',
          emeraldLight: '#d1fae5',
          slate: '#1e293b',
          muted: '#64748b',
          border: '#e2e8f0',
          bg: '#f8fafc',
          card: '#ffffff',
          danger: '#b91c1c',
          dangerLight: '#fee2e2',
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      }
    },
  },
  plugins: [],
}
