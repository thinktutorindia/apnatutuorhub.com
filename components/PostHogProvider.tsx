"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

    if (!key) return;

    posthog.init(key, {
      api_host: host,
      person_profiles: "identified_only",
      capture_pageview: false, // We do this manually for App Router
      capture_pageleave: true,
      autocapture: true,
      session_recording: {
        maskAllInputs: true, // Never record passwords / sensitive fields
      },
    });
  }, []);

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
