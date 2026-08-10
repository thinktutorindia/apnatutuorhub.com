import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: {
    default: "ApnaTutorHub — Find Verified Tutors Near You",
    template: "%s | ApnaTutorHub",
  },
  description:
    "Find qualified, verified tutors for home and online tuition. Tell us what you need, and we match you with the right tutor — for every subject and class.",
  icons: {
    icon: "/icons/Gemini_Generated_Image_k81306k81306k813_no_bg.png",
    shortcut: "/icons/Gemini_Generated_Image_k81306k81306k813_no_bg.png",
    apple: "/icons/Gemini_Generated_Image_k81306k81306k813_no_bg.png",
  },
  keywords: [
    "tutor",
    "home tuition",
    "online tuition",
    "find tutor",
    "India",
    "education",
    "tutor marketplace",
    "verified tutor",
  ],
  authors: [{ name: "ApnaTutorHub" }],
  openGraph: {
    title: "ApnaTutorHub — Find Verified Tutors Near You",
    description:
      "Find qualified, verified tutors for home and online tuition. Matched by subject, location, and budget.",
    type: "website",
    locale: "en_IN",
    siteName: "ApnaTutorHub",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className={`${inter.variable} h-full`}>
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
