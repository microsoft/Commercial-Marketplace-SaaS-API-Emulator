/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/client/*.html"],
  theme: {
    extend: {
      animation: {
        fade: 'fadeOut 1s ease-in-out'
      },
      keyframes: theme => ({
        fadeOut: {
          '0%': { backgroundColor: theme('colors.orange.300') },
          '100%': { backgroundColor: theme('colors.transparent') },
        }
      })
    },
  },
  darkMode: 'class',
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
