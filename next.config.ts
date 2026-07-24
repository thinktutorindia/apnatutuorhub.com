import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for development
  reactStrictMode: true,

  // Image optimization domains
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google OAuth avatars
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com", // AWS S3 uploads
      },
    ],
  },

  // Server external packages for Prisma
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
