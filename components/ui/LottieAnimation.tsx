"use client";

import React, { useEffect, useRef } from "react";
import lottie from "lottie-web";

interface LottieAnimationProps {
  src?: string;
  animationData?: object;
  width?: number | string;
  height?: number | string;
  className?: string;
  loop?: boolean;
}

export function LottieAnimation({
  src,
  animationData,
  width = 200,
  height = 200,
  className = "",
  loop = true,
}: LottieAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fetchSrc = animationData ? undefined : (src ?? "/animations/cute-tiger.json");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let anim: ReturnType<typeof lottie.loadAnimation> | null = null;

    async function play() {
      let data = animationData;
      if (!data && fetchSrc) {
        const res = await fetch(fetchSrc);
        if (!res.ok) return;
        data = await res.json();
      }
      if (cancelled || !container || !data) return;

      container.innerHTML = "";
      anim = lottie.loadAnimation({
        container,
        renderer: "svg",
        loop,
        autoplay: true,
        animationData: data,
      });
    }

    void play();

    return () => {
      cancelled = true;
      anim?.destroy();
    };
  }, [animationData, fetchSrc, loop]);

  return (
    <div
      ref={containerRef}
      style={{ width, height }}
      className={`flex items-center justify-center pointer-events-none ${className}`}
      aria-hidden
    />
  );
}
