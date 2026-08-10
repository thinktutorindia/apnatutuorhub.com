import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/Providers";
import { PostHogProvider } from "@/components/PostHogProvider";
import { PushNotificationProvider } from "@/components/PushNotificationProvider";
import { NotificationOnboardingModal } from "@/components/NotificationOnboardingModal";
import { auth } from "@/auth";
import { NavigationProgress } from "@/components/NavigationProgress";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
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
    icon: "/icons/Gemini_Generated_Image_k81306k81306k813_no_bg.png",
    shortcut: "/icons/Gemini_Generated_Image_k81306k81306k813_no_bg.png",
    apple: "/icons/Gemini_Generated_Image_k81306k81306k813_no_bg.png",
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
        url: "/icons/Gemini_Generated_Image_k81306k81306k813_no_bg.png",
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
    images: ["/icons/Gemini_Generated_Image_k81306k81306k813_no_bg.png"],
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
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <NavigationProgress />
        <PostHogProvider>
          <Providers>{children}</Providers>
        </PostHogProvider>
        <PushNotificationProvider userId={session?.user?.id} />
        <NotificationOnboardingModal userId={session?.user?.id} />
      </body>
    </html>
  );
}
