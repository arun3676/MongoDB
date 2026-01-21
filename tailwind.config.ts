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
          DEFAULT: '#121212',
          50: '#2A2A2A',
          100: '#242424',
          200: '#1E1E1E',
          300: '#1A1A1A',
          400: '#161616',
          500: '#121212',
          600: '#0E0E0E',
          700: '#0A0A0A',
          800: '#060606',
          900: '#020202',
        },
        // Mint - Premium financial accent (#3EB489)
        mint: {
          DEFAULT: '#3EB489',
          50: '#E6F7F2',
          100: '#CCEFE5',
          200: '#99DFCB',
          300: '#66CFB1',
          400: '#4ABF9D',
          500: '#3EB489',
          600: '#32906D',
          700: '#266C51',
          800: '#194836',
          900: '#0D241B',
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
          DEFAULT: '#3EB489',
          light: '#4ABF9D',
          dark: '#32906D',
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
        'glow-mint': 'radial-gradient(ellipse at center, rgba(62, 180, 137, 0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(62, 180, 137, 0.2)',
        'glow-md': '0 0 20px rgba(62, 180, 137, 0.3)',
        'glow-lg': '0 0 40px rgba(62, 180, 137, 0.4)',
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
          '0%': { boxShadow: '0 0 10px rgba(62, 180, 137, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(62, 180, 137, 0.4)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
