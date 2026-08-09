import type { Metadata } from "next";
import { Poppins, Open_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
import { PostHogProvider } from "@/components/PostHogProvider";
import { PushNotificationProvider } from "@/components/PushNotificationProvider";
import { NotificationOnboardingModal } from "@/components/NotificationOnboardingModal";
import { auth } from "@/auth";
import { NavigationProgress } from "@/components/NavigationProgress";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ApnaTutorHub — Smart Tutor Matching",
    template: "%s | ApnaTutorHub",
  },
  description:
    "Find verified, qualified tutors near you. ApnaTutorHub matches parents with the right tutors using smart algorithms — for every subject, every class.",
  keywords: [
    "tutor",
    "home tuition",
    "online tuition",
    "find tutor",
    "India",
    "education",
    "tutor marketplace",
  ],
  authors: [{ name: "ApnaTutorHub" }],
  openGraph: {
    title: "ApnaTutorHub — Smart Tutor Matching",
    description:
      "Find verified, qualified tutors near you. Smart matching for every subject, every class.",
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
    <html
      lang="en"
      className={`${poppins.variable} ${openSans.variable} h-full`}
    >
      <body>
        <NavigationProgress />
        <PostHogProvider>
          <Providers>{children}</Providers>
        </PostHogProvider>
        {/* Web Push: registers Service Worker & subscribes user for off-site notifications */}
        <PushNotificationProvider userId={session?.user?.id} />
        <NotificationOnboardingModal userId={session?.user?.id} />
      </body>
    </html>
  );
}
