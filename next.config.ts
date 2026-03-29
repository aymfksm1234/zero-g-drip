import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/zero-g-drip',
  images: { unoptimized: true },
};

export default nextConfig;
