/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./display/index.html",
    "./display/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'tint-blue': 'rgba(59, 130, 246, 0.15)',
        'tint-purple': 'rgba(139, 92, 246, 0.12)',
        'tint-green': 'rgba(34, 197, 94, 0.12)',
        'tint-amber': 'rgba(251, 191, 36, 0.12)',
        'tint-red': 'rgba(239, 68, 68, 0.12)',
        'text-tertiary': 'rgba(255, 255, 255, 0.35)',
        'text-secondary': 'rgba(255, 255, 255, 0.60)',
        'text-primary': 'rgba(255, 255, 255, 0.95)',
      },
      backgroundColor: {
        'glass-bg': 'rgba(255, 255, 255, 0.08)',
        'glass-bg-hover': 'rgba(255, 255, 255, 0.13)',
        'glass-bg-active': 'rgba(255, 255, 255, 0.18)',
        'glass-heavy': 'rgba(255, 255, 255, 0.06)',
      },
      borderColor: {
        'glass-border': 'rgba(255, 255, 255, 0.15)',
        'glass-border-strong': 'rgba(255, 255, 255, 0.28)',
      },
      backdropBlur: {
        'glass-blur': '24px',
        'glass-blur-heavy': '48px',
      },
      borderRadius: {
        'glass-radius': '20px',
        'glass-radius-sm': '12px',
      },
      boxShadow: {
        'glass-shadow': '0 8px 32px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.1) inset',
      },
      fontSize: {
        'xs-extra': ['0.75rem', { lineHeight: '1rem' }], // 12px
        'sm-extra': ['0.875rem', { lineHeight: '1.25rem' }], // 14px
        'base-extra': ['1rem', { lineHeight: '1.5rem' }], // 16px (root)
        'lg-extra': ['1.25rem', { lineHeight: '1.75rem' }], // 20px
        'xl-extra': ['1.5rem', { lineHeight: '2rem' }], // 24px
        '2xl-extra': ['2rem', { lineHeight: '2.5rem' }], // 32px
        '3xl-extra': ['2.5rem', { lineHeight: '3rem' }], // 40px
        'display-md': ['4rem', { lineHeight: '1' }], // 64px
        'display-lg': ['6rem', { lineHeight: '1' }], // 96px
        'label-caps': ['0.875rem', { lineHeight: '1rem', letterSpacing: '0.1em', fontWeight: '700' }], // 14px
      }
    },
  },
  plugins: [],
}
