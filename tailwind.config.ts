// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dream Trip Club tokens (from your mock)
        'dtc-navy': '#1f2141',  // top bar / brand navy
        'dtc-tile': '#242748',  // action tiles
        'dtc-sky':  '#cfe5ef',  // banner + card headers
        'dtc-bg':   '#f5f7fa',  // app background
      },
      borderRadius: {
        xl: '12px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.06)',
      },
      fontFamily: {
        // Avenir from anna
        sans: [
          'var(--font-avenir)',
          'var(--font-manrope)',
          'var(--font-nunito)',
          'system-ui',
          'Segoe UI',
          'Roboto',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;