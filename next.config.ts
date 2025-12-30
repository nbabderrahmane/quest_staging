import type { NextConfig } from "next";

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: true, // Temporarily disabled for debugging build error
  register: true,
  skipWaiting: true,
})

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
