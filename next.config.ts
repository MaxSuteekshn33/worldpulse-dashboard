import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * The two hosts this app shows photographs from: Wikimedia Commons for
     * ships, Planespotters for aircraft. Narrow on purpose — `next/image`
     * refuses any other host, which is the behaviour we want if a lookup
     * ever returns something unexpected.
     */
    remotePatterns: [
      { protocol: 'https', hostname: 'upload.wikimedia.org', pathname: '/wikipedia/commons/**' },
      // Aircraft photographs, from Planespotters' public API.
      { protocol: 'https', hostname: 't.plnspttrs.net', pathname: '/**' },
    ],
  },
};

export default nextConfig;
