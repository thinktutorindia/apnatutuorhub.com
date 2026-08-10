import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://apnatutorhub.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/parent/post-requirement",
          "/parent/requirements",
          "/tutor/profile",
          "/tutor/leads",
          "/login",
          "/register",
          "/forgot-password",
        ],
        disallow: [
          "/admin/",
          "/admin/*",
          "/api/",
          "/api/*",
          "/chat/",
          "/chat/*",
          "/tutor/wallet",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
