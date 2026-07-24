import type { Metadata } from "next";
import { Poppins, Open_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
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
    default: "ThinkTutor — Smart Tutor Matching",
    template: "%s | ThinkTutor",
  },
  description:
    "Find verified, qualified tutors near you. ThinkTutor matches parents with the right tutors using smart algorithms — for every subject, every class.",
  keywords: [
    "tutor",
    "home tuition",
    "online tuition",
    "find tutor",
    "India",
    "education",
    "tutor marketplace",
  ],
  authors: [{ name: "ThinkTutor" }],
  openGraph: {
    title: "ThinkTutor — Smart Tutor Matching",
    description:
      "Find verified, qualified tutors near you. Smart matching for every subject, every class.",
    type: "website",
    locale: "en_IN",
    siteName: "ThinkTutor",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${openSans.variable} h-full`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
