/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
      extend: {
        colors: {
          primary: {
            500: '#6366f1',
            600: '#4f46e5',
          },
          secondary: {
            500: '#ec4899',
            600: '#db2777',
          },
        },
      },
    },
    plugins: [],
  }