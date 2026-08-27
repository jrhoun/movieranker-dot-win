import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/u/me",
        destination: "/u/profile",
        permanent: true,
      },
      {
        source: "/news",
        destination: "/updates",
        permanent: true,
      },
      {
        source: "/changelog",
        destination: "/updates",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
