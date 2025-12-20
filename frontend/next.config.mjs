/** @type {import('next').NextConfig} */
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.NEXT_BASE_PATH ?? '';
const normalizedBasePath =
  rawBasePath && rawBasePath !== '/'
    ? `/${rawBasePath.replace(/^\/+|\/+$/g, '')}`
    : '';

const rawAssetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? process.env.NEXT_ASSET_PREFIX ?? '';
const normalizedAssetPrefix = rawAssetPrefix
  ? rawAssetPrefix.replace(/\/+$/g, '')
  : normalizedBasePath || '';

const nextConfig = {
  output: 'standalone',
  ...(normalizedBasePath ? { basePath: normalizedBasePath } : {}),
  ...(normalizedAssetPrefix ? { assetPrefix: normalizedAssetPrefix } : {}),
  experimental: {
    serverActions: { allowedOrigins: ['*'] },
    // Enable instrumentation hook for error monitoring
    // See: frontend/instrumentation.ts
    instrumentationHook: true,
  },
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
