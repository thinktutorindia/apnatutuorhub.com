"use client";

import animationData from "@/components/ui/lottie/404-cat.json";
import { LottieAnimation } from "@/components/ui/LottieAnimation";

/** 404 uses `404 error page with cat.json`. Loading screens keep Cute Tiger. */
export function NotFoundLottie() {
  return (
    <LottieAnimation animationData={animationData} width={320} height={285} />
  );
}
