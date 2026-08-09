"use client";

import React, { useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Reset loading progress on route change complete
  useEffect(() => {
    setIsLoading(false);
    setProgress(100);
    const timer = setTimeout(() => {
      setProgress(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  useEffect(() => {
    // Intercept internal link clicks to trigger instant visual feedback
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");

      if (
        anchor &&
        anchor.href &&
        anchor.target !== "_blank" &&
        anchor.origin === window.location.origin &&
        !anchor.href.includes("#")
      ) {
        const targetUrl = new URL(anchor.href);
        const currentUrl = new URL(window.location.href);

        if (targetUrl.pathname !== currentUrl.pathname || targetUrl.search !== currentUrl.search) {
          setIsLoading(true);
          setProgress(30);
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading && progress < 85) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) {
            clearInterval(interval);
            return prev;
          }
          return prev + Math.floor(Math.random() * 10) + 5;
        });
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isLoading, progress]);

  if (!isLoading && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-[3.5px] bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-[#22C55E] via-[#10B981] to-[#3B82F6] shadow-[0_0_12px_#22C55E] transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
