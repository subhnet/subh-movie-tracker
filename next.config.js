/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow reading CSV files
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
  // Experimental features
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'cinepath.vercel.app'],
    },
  },
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'is1-ssl.mzstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'img.omdbapi.com',
      },
    ],
  },
}

module.exports = nextConfig

