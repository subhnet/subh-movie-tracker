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
        primary: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d6e0ff',
          300: '#b3c5ff',
          400: '#8da5ff',
          500: '#667eea',
          600: '#5568d3',
          700: '#4553b8',
          800: '#37429d',
          900: '#2d3581',
        },
        secondary: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#764ba2',
          600: '#6b4492',
          700: '#5e3c7f',
          800: '#52356c',
          900: '#442d59',
        },
      },
    },
  },
  plugins: [],
}
export default config

