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
  output: 'export',
  trailingSlash: true,
  ...(normalizedBasePath ? { basePath: normalizedBasePath } : {}),
  ...(normalizedAssetPrefix ? { assetPrefix: normalizedAssetPrefix } : {}),
  experimental: { serverActions: { allowedOrigins: ['*'] } },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
