import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Sign In & Registration — ApnaTutorHub",
  description:
    "Log in or register your account on ApnaTutorHub to post tuition requirements, find verified home and online tutors, or manage your teaching leads.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
