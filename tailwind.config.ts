import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*',
    './components/**/*',
    './app/**/*',
    './domains/**/*',
    './foundation/**/*',
  ],
  theme: {
    extend: {
      colors: {
        background: '#faf9f7',
        foreground: '#000000',
        border: '#dad4c8',
        'border-light': '#eee9df',
        matcha: {
          300: '#84e7a5',
          600: '#078a52',
          800: '#02492a',
        },
        slushie: {
          500: '#3bd3fd',
          800: '#0089ad',
        },
        lemon: {
          400: '#f8cc65',
          500: '#fbbd41',
          700: '#d08a11',
          800: '#9d6a09',
        },
        ube: {
          300: '#c1b0ff',
          800: '#43089f',
          900: '#32037d',
        },
        pomegranate: {
          400: '#fc7981',
        },
        blueberry: {
          800: '#01418d',
        },
        'warm-silver': '#9f9b93',
        'warm-charcoal': '#55534e',
        'dark-charcoal': '#333333',
        'badge-blue-bg': '#f0f8ff',
        'badge-blue-text': '#3859f9',
        oat: {
          DEFAULT: '#dad4c8',
          light: '#eee9df',
        },
        charcoal: {
          DEFAULT: '#2a2a2e',
          panel: '#1e1e22',
          subtle: '#3a3a40',
          via: '#1a1a1e',
        },
        'deep-charcoal': '#0f0f12',
        emerald: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        silver: '#9ca3af',
      },
      fontFamily: {
        sans: ['Roobert', 'Arial', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        feature: '24px',
        section: '40px',
      },
      boxShadow: {
        clay: 'rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px 1px',
        hard: 'rgb(0,0,0) -7px 7px',
      },
    },
  },
  plugins: [],
}

export default config
