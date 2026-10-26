import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/receptionist",
        destination: "/reception",
        permanent: true,
      },
      {
        source: "/receptionist/:path*",
        destination: "/reception/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
