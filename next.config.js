/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fix workspace root warning by explicitly setting outputFileTracingRoot
  outputFileTracingRoot: require('path').join(__dirname),
}

module.exports = nextConfig
