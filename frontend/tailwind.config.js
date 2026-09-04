/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        triage: {
          red: '#EF4444',
          orange: '#F97316',
          yellow: '#EAB308',
          green: '#10B981',
          blue: '#3B82F6',
        },
        emergency: {
          dark: '#0F172A',
          card: '#1E293B',
          border: '#334155',
          accent: '#38BDF8',
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'cpr-beat': 'cpr 0.545s ease-in-out infinite', // ~110 BPM
      },
      keyframes: {
        cpr: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.15)', opacity: '0.85' },
        }
      }
    },
  },
  plugins: [],
}
