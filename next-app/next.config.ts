import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'standalone',

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent clickjacking — CSP frame-ancestors in proxy.ts is the modern equivalent
          // but this covers browsers that don't support CSP frame-ancestors.
          { key: 'X-Frame-Options',        value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // No referrer for cross-origin requests — prevents token leakage via M1 paths
          { key: 'Referrer-Policy',        value: 'no-referrer' },
          // HSTS — browsers ignore this for HTTP origins, so safe in dev too
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Disable sensors and APIs the app does not use
          { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
