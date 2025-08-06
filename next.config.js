/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // Temporary
  },
  typescript: {
    ignoreBuildErrors: true, // Temporary
  },
  images: {
    domains: [], // Add your image host domains
  },
};

module.exports = nextConfig;