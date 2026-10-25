import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * Ship photographs come from Wikimedia Commons, which serves its files
     * from upload.wikimedia.org. Narrow on purpose: this is the one external
     * host the app displays images from, and `next/image` will refuse any
     * other, which is the behaviour we want if a lookup ever returns
     * something unexpected.
     */
    remotePatterns: [
      { protocol: 'https', hostname: 'upload.wikimedia.org', pathname: '/wikipedia/commons/**' },
    ],
  },
};

export default nextConfig;
