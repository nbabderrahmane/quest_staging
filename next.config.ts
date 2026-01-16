import type { NextConfig } from "next";

// PWA configuration disabled - keeping reference for future enablement
// import withPWA from 'next-pwa'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rdxflktnhzgexchsfxhj.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

// export default withPWA(nextConfig);
export default nextConfig;
