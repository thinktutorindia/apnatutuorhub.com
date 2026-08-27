import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ApnaTutorHub — Verified Home & Online Tutors",
    short_name: "ApnaTutorHub",
    description:
      "Connect with qualified, verified home and online tutors near you for all subjects, classes, and competitive exams across India.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#2D9E6B",
    icons: [
      {
        src: "/icons/icon-192x192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-192x192.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
