export default {
  // Tailwind only, matching the AOS app: autoprefixer is not a kit dependency,
  // and listing it here fails `next build` on every generated deployment.
  plugins: { tailwindcss: {} },
};
