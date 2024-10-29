/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2B83F6',
        success: '#00C851',
        warning: '#FFB100',
        danger: '#FF4444',
        light: '#F8FAFC',
        dark: '#1E293B',
        border: '#E2E8F0',
      },
    },
  },
  plugins: [],
};
