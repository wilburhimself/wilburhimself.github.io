/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Tailwind mappings to custom CSS variables
        theme: 'var(--theme)',
        entry: 'var(--entry)',
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        tertiary: 'var(--tertiary)',
        content: 'var(--content)',
        border: 'var(--border)',
        
        // Legacy colors kept for compatibility
        'base': '#F7F6F4',
        'near-black': '#090909',
        'gray-light': '#C3C1BD',
        'gray-dark': '#403F3E',
        'gray-medium': '#81807E',
        'carrara': '#F5F4F2',
      },
      fontFamily: {
        'signika': ['Signika', 'sans-serif'],
        'roboto': ['Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
