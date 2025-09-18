/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    appDir: true, // ถ้าใช้ App Router
  },
  // แนะนำใช้ package เช่น next-alias แทน webpack override
};

module.exports = nextConfig;
