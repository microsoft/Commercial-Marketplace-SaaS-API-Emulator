/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/client/*.html"],
  theme: {
    extend: {},
  },
  darkMode: 'class',
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
