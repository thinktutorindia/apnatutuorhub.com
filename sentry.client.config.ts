// sentry.client.config.ts
// Phase 14 — Client-side Sentry error monitoring & session replays

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production" && !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 0,

  // Session replay — capture 10% of all sessions, 100% on errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  debug: false,

  environment: process.env.NODE_ENV ?? "development",

  release: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",

  integrations: [
    Sentry.replayIntegration({
      // Block sensitive fields from replays
      maskAllText: false,
      blockAllMedia: false,
      maskAllInputs: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Only enable tracing on important user paths
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/thinktutor\.in/,
    /^https:\/\/.*\.vercel\.app/,
  ],

  ignoreErrors: [
    "NEXT_NOT_FOUND",
    "NEXT_REDIRECT",
    /ResizeObserver loop/,
    /Non-Error exception captured/,
    "Network Error",
    /AbortError/,
  ],
});
