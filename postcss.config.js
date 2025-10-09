/** @type {import('postcss-load-config').Config} */
export default {
  plugins: {
    '@tailwindcss/postcss': {},   // <— nowy plugin dla Tailwind v4
    autoprefixer: {},             // (opcjonalnie) możesz zostawić
  },
};