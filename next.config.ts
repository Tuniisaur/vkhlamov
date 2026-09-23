import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: [
    "192.168.31.235",
    "192.168.31.*",
    "192.168.*",
    "*.local",
    "Mac-mini-di-Matteo.local",
  ],
};

export default nextConfig;
