// sentry.server.config.ts
// Phase 14 — Server-side Sentry error monitoring & performance tracing

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adjust sample rate in production (1.0 = 100% of transactions)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Capture replays for 10% of sessions, 100% of error sessions
  // (only relevant for the browser SDK, but we set it here for completeness)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  debug: process.env.NODE_ENV !== "production",

  environment: process.env.NODE_ENV ?? "development",

  release: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",

  // Ignore expected / non-actionable errors
  ignoreErrors: [
    "NEXT_NOT_FOUND",
    "NEXT_REDIRECT",
    /ResizeObserver loop/,
  ],
});
