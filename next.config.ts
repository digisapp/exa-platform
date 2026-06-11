import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  // ESLint runs in CI (.github/workflows/ci.yml), not during `next build`.
  // Inline linting was the slow, memory-heavy part of the build's silent
  // type-check phase and only produced warnings here. Type-checking still
  // runs during the build as the safety net.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nanftzomzluetblqgrvo.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'nanftzomzluetblqgrvo.supabase.co',
        pathname: '/storage/v1/object/sign/**',
      },
      {
        protocol: 'https',
        hostname: '*.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: 'scontent*.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'fal.media',
      },
      {
        protocol: 'https',
        hostname: '*.fal.media',
      },
      {
        protocol: 'https',
        hostname: 'replicate.delivery',
      },
      {
        protocol: 'https',
        hostname: '*.replicate.delivery',
      },
    ],
  },
  // Increase body size limit for file uploads (default is 1MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    // Auto-rewrite barrel imports (e.g. `import { X, Y } from "recharts"`) into
    // per-file imports so unused exports get tree-shaken from client bundles.
    // Biggest wins on heavy libs that ship a single index re-export.
    optimizePackageImports: [
      "recharts",
      "lucide-react",
      "date-fns",
      "@radix-ui/react-icons",
    ],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'examodels.com' }],
        destination: 'https://www.examodels.com/:path*',
        permanent: true,
      },
      {
        source: '/events',
        destination: '/shows',
        permanent: true,
      },
      {
        source: '/events/:slug*',
        destination: '/shows/:slug*',
        permanent: true,
      },
      {
        source: '/workshops/miami-swim-week-runway-workshop-2026',
        destination: '/workshops/runway-workshop',
        permanent: true,
      },
      {
        source: '/workshops/runway-workshop-2026',
        destination: '/workshops/runway-workshop',
        permanent: true,
      },
      {
        source: '/runway-workshop',
        destination: '/workshops/runway-workshop',
        permanent: false,
      },
      {
        source: '/miami-digitals',
        destination: '/fresh-digitals',
        permanent: true,
      },
      {
        source: '/castingcall',
        destination: '/shows/miami-swim-week-2026',
        permanent: false,
      },
    ];
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(self)',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''} js.stripe.com translate.google.com translate.googleapis.com translate-pa.googleapis.com`,
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com www.gstatic.com",
              "img-src 'self' data: blob: *.supabase.co *.cdninstagram.com www.google.com *.gstatic.com img.youtube.com *.x.ai",
              "font-src 'self' fonts.gstatic.com data:",
              "connect-src 'self' data: blob: *.supabase.co wss://*.supabase.co *.livekit.cloud wss://*.livekit.cloud api.stripe.com *.upstash.io *.x.ai translate.googleapis.com",
              "frame-src 'self' js.stripe.com www.youtube.com open.spotify.com",
              "media-src 'self' blob: *.supabase.co *.x.ai",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  // Suppress Sentry CLI logs during build.
  silent: true,

  // Org/project + auth token only matter when uploading source maps. If
  // SENTRY_AUTH_TOKEN is unset (e.g. local dev, or before the Sentry project
  // is created), the wrapper no-ops on upload steps and the build still
  // succeeds. Wire these via Vercel env once you have a Sentry project.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Source maps: hide from public bundles after upload (delete after build).
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Suppress runtime Sentry SDK logger output in production.
  disableLogger: true,
  widenClientFileUpload: true,
});
