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
        src: "/icons/Gemini_Generated_Image_k81306k81306k813_no_bg.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/Gemini_Generated_Image_k81306k81306k813_no_bg.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
