import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Carbon Mint Theme - Primary Colors
        carbon: {
          DEFAULT: '#121214',
          50: '#2A2A2E',
          100: '#242428',
          200: '#1E1E22',
          300: '#1A1A1E',
          400: '#161618',
          500: '#121214',
          600: '#0E0E10',
          700: '#0A0A0C',
          800: '#060608',
          900: '#020204',
        },
        // Emerald Mint - Professional accent
        mint: {
          DEFAULT: '#10B981',
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        // Bright accent (original mint) for special cases
        accent: {
          DEFAULT: '#00FFC2',
          light: '#33FFC9',
          dark: '#00CC9B',
        },
        // Surface colors
        surface: {
          DEFAULT: '#1A1A1E',
          light: '#242428',
          dark: '#121214',
        },
        // Border colors - More subtle
        border: {
          DEFAULT: '#2D2D30',
          light: '#3A3A3D',
          dark: '#1E1E20',
        },
        // Semantic colors
        danger: {
          DEFAULT: '#FF4757',
          light: '#FF6B7A',
          dark: '#E63946',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FBBF24',
          dark: '#D97706',
        },
        success: {
          DEFAULT: '#10B981',
          light: '#34D399',
          dark: '#059669',
        },
        info: {
          DEFAULT: '#00D4FF',
          light: '#33DDFF',
          dark: '#00AACC',
        },
        // Text colors - Softer and more sophisticated
        text: {
          primary: '#E4E4E7',
          secondary: '#94A3B8',
          muted: '#64748B',
          inverse: '#121214',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': 'radial-gradient(circle at 1px 1px, #2D2D30 1px, transparent 0)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glow-mint': 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(16, 185, 129, 0.2)',
        'glow-md': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-lg': '0 0 40px rgba(16, 185, 129, 0.4)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.6)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
