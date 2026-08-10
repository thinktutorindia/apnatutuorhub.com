"use client";

import React, { useEffect, useRef } from "react";
import lottie from "lottie-web/build/player/lottie_light";
import defaultLoadingData from "@/public/loading.json";

interface LottieAnimationProps {
  animationData?: any;
  width?: number | string;
  height?: number | string;
  className?: string;
}

export function LottieAnimation({
  animationData = defaultLoadingData,
  width = 160,
  height = 160,
  className = "",
}: LottieAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";
    const animInstance = lottie.loadAnimation({
      container: containerRef.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData: animationData || defaultLoadingData,
    });

    return () => {
      animInstance.destroy();
    };
  }, [animationData]);

  return (
    <div
      ref={containerRef}
      style={{ width, height }}
      className={`flex items-center justify-center pointer-events-none ${className}`}
    />
  );
}
