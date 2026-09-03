import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://apnatutorhub.com";

const TOP_CITIES = [
  "delhi",
  "mumbai",
  "bengaluru",
  "pune",
  "hyderabad",
  "gurgaon",
  "noida",
  "kolkata",
  "chennai",
  "ahmedabad",
];

const POPULAR_SUBJECTS = [
  "mathematics",
  "physics",
  "chemistry",
  "biology",
  "english",
  "computer-science",
  "cbse-class-10",
  "cbse-class-12",
  "icse",
  "jee-mains",
  "neet-medical",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const currentDate = new Date();

  // Core static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: APP_URL,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${APP_URL}/find-tutor`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${APP_URL}/terms`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${APP_URL}/privacy`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${APP_URL}/membership-policy`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${APP_URL}/cookies`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${APP_URL}/disclaimer`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${APP_URL}/copyright`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${APP_URL}/site-map`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${APP_URL}/login`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${APP_URL}/register`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  // City landing pages
  const cityPages: MetadataRoute.Sitemap = TOP_CITIES.map((city) => ({
    url: `${APP_URL}/home-tutors-${city}`,
    lastModified: currentDate,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Subject pages
  const subjectPages: MetadataRoute.Sitemap = POPULAR_SUBJECTS.map((subject) => ({
    url: `${APP_URL}/tutors/${subject}`,
    lastModified: currentDate,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...cityPages, ...subjectPages];
}
