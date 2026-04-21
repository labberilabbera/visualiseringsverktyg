/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force all routes to be dynamic — prevents SQLite "database is locked" during build
  experimental: {
    serverActions: { allowedOrigins: ["*"] },
  },
  // Disable static generation for all pages
  output: undefined,
};

// Make all API routes dynamic globally
const withDynamic = {
  ...nextConfig,
  headers: async () => [],
};

module.exports = {
  ...nextConfig,
  // This tells Next.js not to pre-render any route at build time
  generateStaticParams: undefined,
  staticPageGenerationTimeout: 0,
};
