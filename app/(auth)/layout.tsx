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
  return (
    <div
      className="min-h-screen w-full flex flex-col justify-between items-center relative overflow-hidden"
      style={{
        backgroundColor: "#F0F4F8",
        backgroundImage:
          "radial-gradient(ellipse at 50% 0%, rgba(15, 37, 64, 0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(45, 158, 107, 0.07) 0%, transparent 50%)",
      }}
    >
      {/* Background Ambient Glow Orbs */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[min(600px,100vw)] h-[300px] bg-gradient-to-r from-[#1A3C5E]/10 via-[#2D9E6B]/10 to-[#F5A623]/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="w-full flex-1 flex flex-col justify-center items-center relative z-10 py-10 px-4 sm:px-6">
        {children}
      </div>
    </div>
  );
}
