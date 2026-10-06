import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Priya voice demo",
  robots: { index: false, follow: false },
};

export default function VoiceDemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
