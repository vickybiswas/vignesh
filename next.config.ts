import type { NextConfig } from "next";


const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  /* config options here */
    output: 'export',
    basePath: isProd ? '/vignesh' : '', // Replace <repo-name> with your repository name
    assetPrefix: isProd ? '/vignesh/' : '', // Replace <repo-name> with your repository name
    images: {
      unoptimized: true,
    },
    // Expose basePath to the client for static asset references
    env: {
      NEXT_PUBLIC_BASE_PATH: isProd ? '/vignesh' : '',
    },
};

    export default nextConfig;