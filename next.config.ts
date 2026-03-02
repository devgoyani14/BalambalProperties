import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.28hse.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.28hse.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i1.28hse.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i2.28hse.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.centanet.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.spacious.hk",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.midlandici.com.hk",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.gohome.com.hk",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
