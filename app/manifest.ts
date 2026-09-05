import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ApnaTutorHub — Staff & Verified Tutors",
    short_name: "ApnaTutorHub",
    description:
      "Connect with qualified, verified home and online tutors near you across India. Staff telecalling desk, CRM, and verified tutor management.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0F2540",
    theme_color: "#0F2540",
    categories: ["education", "productivity", "business"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-192x192.svg",
        sizes: "192x192 512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Staff Calling Desk",
        short_name: "Calling Desk",
        description: "Open staff telecalling desk and lead queue",
        url: "/admin/staff-leads/my-leads",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Performance Hub",
        short_name: "Performance",
        description: "View daily shift progress, targets & callbacks",
        url: "/admin/staff-leads/my-dashboard",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Find Tutors",
        short_name: "Find Tutors",
        description: "Search verified teachers near you",
        url: "/find-tutor",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
