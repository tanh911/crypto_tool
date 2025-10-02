import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Bỏ qua các warning/error khi build trên Netlify
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
