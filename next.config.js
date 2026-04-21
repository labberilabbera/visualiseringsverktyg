/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Next.js from pre-rendering API routes at build time
  // This fixes "database is locked" SQLite errors during build
  serverRuntimeConfig: {},
  publicRuntimeConfig: {},
};

module.exports = nextConfig;
