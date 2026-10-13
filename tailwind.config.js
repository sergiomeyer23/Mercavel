/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // verde do logo, com o mesmo ritmo de contraste da escala do tailwind
        marca: {
          50: '#f7fdfa',
          100: '#e4fbef',
          200: '#c5f4db',
          300: '#93e9ba',
          400: '#5ad592',
          500: '#2fbf71',
          600: '#219f5b',
          700: '#1e7e4a',
          800: '#1d653e',
          900: '#1a5435',
        },
        // azul-marinho usado no nome do logo
        tinta: {
          900: '#0b1b2a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
