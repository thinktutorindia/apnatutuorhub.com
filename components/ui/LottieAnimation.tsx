"use client";

import React, { useEffect, useRef } from "react";
import lottie from "lottie-web/build/player/lottie_light";

interface LottieAnimationProps {
  src?: string;
  animationData?: object;
  width?: number | string;
  height?: number | string;
  className?: string;
  loop?: boolean;
}

export function LottieAnimation({
  src = "/animations/cute-tiger.json",
  animationData,
  width = 200,
  height = 200,
  className = "",
  loop = true,
}: LottieAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let anim: ReturnType<typeof lottie.loadAnimation> | null = null;

    async function play() {
      let data = animationData;
      if (!data && src) {
        const res = await fetch(src);
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
  }, [animationData, src, loop]);

  return (
    <div
      ref={containerRef}
      style={{ width, height }}
      className={`flex items-center justify-center pointer-events-none ${className}`}
      aria-hidden
    />
  );
}
