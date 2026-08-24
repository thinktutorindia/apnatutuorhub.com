import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Enable React strict mode for development
  reactStrictMode: true,

  // Allow mobile LAN origins for dev server HMR & client JS bundle hydration
  allowedDevOrigins: [
    "localhost:3000",
    "192.168.137.1:3000",
    "192.168.1.36:3000",
    "192.168.137.1",
    "192.168.1.36",
  ],

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

  // Server external packages for Prisma & Node-only libraries
  serverExternalPackages: ["@prisma/client", "bcryptjs", "web-push"],
};

export default withSentryConfig(nextConfig, {
  // Sentry org & project — fill in from your Sentry dashboard
  org: process.env.SENTRY_ORG ?? "thinktutor",
  project: process.env.SENTRY_PROJECT ?? "thinktutor-app",

  // Only print Sentry output in production builds
  silent: process.env.NODE_ENV !== "production",

  // Automatically tree-shake Sentry logger statements
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Disable source map upload if SENTRY_AUTH_TOKEN is not set
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
