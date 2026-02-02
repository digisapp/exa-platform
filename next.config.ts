import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nanftzomzluetblqgrvo.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: 'scontent*.cdninstagram.com',
      },
    ],
  },
  // Increase body size limit for file uploads (default is 1MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default withBundleAnalyzer(nextConfig);
