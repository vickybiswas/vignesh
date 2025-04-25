import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

const isProd = process.env.NODE_ENV === 'production';

    module.exports = {
      output: 'export',
      basePath: isProd ? '/vignesh' : '', // Replace <repo-name> with your repository name
      assetPrefix: isProd ? '/vignesh/' : '', // Replace <repo-name> with your repository name
      images: {
        unoptimized: true,
      },
    };

    export default nextConfig;