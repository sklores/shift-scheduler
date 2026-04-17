import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Switched off static-export so serverless API routes (/api/*) work.
  // Vercel still deploys this just fine — now with server functions included.
};

export default nextConfig;
