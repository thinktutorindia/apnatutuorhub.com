import Link from "next/link";
import { LogoBrand } from "@/components/brand/Logo";
import { LottieAnimation } from "@/components/ui/LottieAnimation";

export const metadata = {
  title: "Page not found — ApnaTutorHub",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F0F4F8] px-4 py-10 flex flex-col items-center">
      <LogoBrand heightClass="h-10 sm:h-11" />

      <div className="flex-1 w-full max-w-lg flex flex-col items-center justify-center text-center pt-6">
        <LottieAnimation src="/animations/cute-tiger.json" width={280} height={280} />
        <p className="mt-2 text-[11px] font-800 uppercase tracking-[0.18em] text-[#2D9E6B]">404</p>
        <h1
          className="mt-2 text-2xl sm:text-3xl font-800 text-[#0F2540]"
          style={{ fontFamily: "Poppins, sans-serif" }}
        >
          This page wandered off
        </h1>
        <p className="mt-2 text-sm font-600 text-slate-600 max-w-md">
          The link may be broken or the page was moved. Head back home and we will get you to the right tutor or lead.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/"
            className="min-h-11 px-5 rounded-full bg-[#2D9E6B] hover:bg-[#238357] !text-white text-sm font-800 inline-flex items-center justify-center"
          >
            Back to Home
          </Link>
          <Link
            href="/login"
            className="min-h-11 px-5 rounded-full bg-white border border-[#CBD5E1] !text-[#0F2540] text-sm font-800 inline-flex items-center justify-center hover:bg-[#EEF3F8]"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
