import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
import { PostHogProvider } from "@/components/PostHogProvider";
import { PushNotificationProvider } from "@/components/PushNotificationProvider";
import { NotificationOnboardingModal } from "@/components/NotificationOnboardingModal";
import { auth } from "@/auth";
import { NavigationProgress } from "@/components/NavigationProgress";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://apnatutorhub.com";

export const viewport: Viewport = {
  themeColor: "#2D9E6B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "ApnaTutorHub — Find Verified Home & Online Tutors Near You",
    template: "%s | ApnaTutorHub",
  },
  description:
    "India's leading platform to find qualified, background-checked home and online tutors for Maths, Science, CBSE, ICSE, JEE, NEET, and language classes.",
  keywords: [
    "home tutor near me",
    "online tutors India",
    "private tuition classes",
    "CBSE ICSE home tutor",
    "find tutor for maths science",
    "JEE NEET foundation tutor",
    "verified home tuition teacher",
    "tutor marketplace India",
    "ApnaTutorHub",
  ],
  authors: [{ name: "ApnaTutorHub", url: APP_URL }],
  creator: "ApnaTutorHub",
  publisher: "ApnaTutorHub",
  applicationName: "ApnaTutorHub",
  formatDetection: {
    telephone: true,
    address: true,
    email: true,
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/icons/icon-192x192.svg",
    shortcut: "/icons/icon-192x192.svg",
    apple: "/icons/icon-192x192.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "ApnaTutorHub — Find Verified Home & Online Tutors Near You",
    description:
      "Match with top-rated, background-checked tutors for Class 1–12, CBSE, ICSE, State Boards & Competitive Exams. Distance-based matching in your neighborhood.",
    url: APP_URL,
    siteName: "ApnaTutorHub",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/icons/icon-192x192.svg",
        width: 512,
        height: 512,
        alt: "ApnaTutorHub Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ApnaTutorHub — Find Verified Tutors Near You",
    description:
      "Connect with 100% verified home & online tutors across India. Fast distance-based tutor matching.",
    images: ["/icons/icon-192x192.svg"],
    creator: "@ApnaTutorHub",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "Education",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className={`${jakarta.variable} h-full`} data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-800 focus:text-[#0F2540] focus:shadow-lg"
        >
          Skip to content
        </a>
        <NavigationProgress />
        <PostHogProvider>
          <Providers>
            <div id="main-content">{children}</div>
          </Providers>
        </PostHogProvider>
        <PushNotificationProvider userId={session?.user?.id} />
        <NotificationOnboardingModal userId={session?.user?.id} />
      </body>
    </html>
  );
}
