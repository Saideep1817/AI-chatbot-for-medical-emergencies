import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3002',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'development-secret-key-123456789',
  },
};

export default nextConfig;
