/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: '420px'
      },
      colors: {
        // Charte réseau Seine-Sud-Est
        sse: {
          night: '#080226',   // fond
          deep: '#0C0438',    // en-tête, en-têtes de tableau
          panel: '#100A38',   // surfaces
          raised: '#180E4F',  // champs, survols
          line: '#2A2160',    // filets
          yellow: '#DAE44E',  // couleur réseau
          'yellow-hi': '#E5EE60',
          led: '#F3C318'      // girouette LED ambre
        }
      },
      fontFamily: {
        sans: ['Barlow', 'system-ui', '-apple-system', 'sans-serif'],
        // "mono" sert aux horaires : chiffres condensés tabulaires, pas de vraie chasse fixe
        mono: ['"Barlow Semi Condensed"', 'Barlow', 'system-ui', 'sans-serif'],
        sign: ['"Barlow Condensed"', 'Barlow', 'sans-serif']
      }
    },
  },
  plugins: [],
}
