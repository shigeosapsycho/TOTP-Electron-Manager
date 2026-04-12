import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  // Use relative paths for Electron
  assetPrefix: './',
  trailingSlash: false,
};

export default nextConfig;
