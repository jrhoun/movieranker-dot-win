import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/u/me",
        destination: "/u/profile",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
