import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://apnatutorhub.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/find-tutor",
          "/login",
          "/register",
          "/forgot-password",
          "/terms",
          "/privacy",
          "/membership-policy",
          "/cookies",
          "/disclaimer",
          "/copyright",
          "/site-map",
          "/tutors/",
          "/home-tutors-",
        ],
        disallow: [
          "/admin/",
          "/admin/*",
          "/api/",
          "/api/*",
          "/chat/",
          "/chat/*",
          "/parent/",
          "/tutor/dashboard",
          "/tutor/leads",
          "/tutor/profile",
          "/tutor/wallet",
          "/tutor/bookings",
          "/tutor/plans",
          "/reset-password",
          "/select-role",
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
