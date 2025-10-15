/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: { serverActions: { allowedOrigins: ['*'] } },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'useruploads.socraticoverflow.com',
        pathname: '/uploads/*',
      },
    ],
  },
};
export default nextConfig;
