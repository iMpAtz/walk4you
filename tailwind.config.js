/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          light: "#93c5fd",   // ฟ้าอ่อน
          DEFAULT: "#3b82f6", // ฟ้าหลัก
          dark: "#1e3a8a",    // ฟ้าเข้ม
        },
        accent: {
          pink: "#ec4899",
          purple: "#8b5cf6",
        },
      },
    },
  },
  plugins: [],
};
