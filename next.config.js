/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Enable standalone output for Docker deployments (Linux only)
  // Note: Requires admin privileges on Windows for symlinks
  // Railway/Vercel builds on Linux so this works in production
  ...(process.platform !== 'win32' ? { output: 'standalone' } : {}),
  
  // Fix workspace root warning by explicitly setting outputFileTracingRoot
  outputFileTracingRoot: require('path').join(__dirname),
  
  // Production optimizations
  poweredByHeader: false,
  
  // Security headers
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
      ],
    },
  ],
}

module.exports = nextConfig
