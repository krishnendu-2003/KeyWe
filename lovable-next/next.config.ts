import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",

  images: {
    unoptimized: true,
  },

  // OPTIONAL but recommended for S3 routing
  trailingSlash: true,
};

export default nextConfig;
