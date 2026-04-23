/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://ajax.googleapis.com",
              "worker-src blob: 'self'",
              "connect-src 'self' https://api.tripo3d.ai https://*.tripo3d.ai https://generativelanguage.googleapis.com",
              "img-src 'self' data: blob: https://*.tripo3d.ai https://*.amazonaws.com",
              "media-src 'self' blob: https://*.tripo3d.ai https://*.amazonaws.com",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
