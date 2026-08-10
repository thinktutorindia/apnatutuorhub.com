import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Comprehensive security middleware.
 *
 * 1. HTTP Security Headers on every response
 * 2. JWT session validation — blocks suspended/deleted users instantly
 * 3. Route-level RBAC enforcement
 * 4. CSRF origin check on mutating requests
 * 5. Strips sensitive headers from outgoing responses
 */
export default auth((req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // ── 1. Auth gate ──────────────────────────────────────────────────────────
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/sitemap") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/home-tutors") ||
    pathname.startsWith("/tutors") ||
    pathname === "/";

  const isAdminRoute = pathname.startsWith("/admin");
  const isApiMutating =
    req.method !== "GET" &&
    req.method !== "HEAD" &&
    pathname.startsWith("/api");

  // ── 2. CSRF origin guard on mutating API calls ────────────────────────────
  if (isApiMutating && !pathname.startsWith("/api/auth") && !pathname.startsWith("/api/webhooks")) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return new NextResponse(JSON.stringify({ error: "Forbidden: Cross-origin request blocked" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
      } catch {
        return new NextResponse(JSON.stringify({ error: "Forbidden: Invalid origin" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
  }

  // ── 3. Redirect unauthenticated users ─────────────────────────────────────
  if (!isPublic && !session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 4. Suspended / deleted user — kill session immediately ─────────────────
  if (session && !session.user?.isActive) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "AccountSuspended");
    const res = NextResponse.redirect(loginUrl);
    // Clear all NextAuth cookies
    ["authjs.session-token", "__Secure-authjs.session-token",
     "authjs.csrf-token", "__Host-authjs.csrf-token",
     "next-auth.session-token", "next-auth.csrf-token"].forEach((name) => {
      res.cookies.delete(name);
    });
    return res;
  }

  // ── 5. Admin route — must be SUPER_ADMIN or SUB_ADMIN ─────────────────────
  if (isAdminRoute && session) {
    const role = session.user?.role;
    if (role !== "SUPER_ADMIN" && role !== "SUB_ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // ── 6. Build response with security headers ───────────────────────────────
  const res = NextResponse.next();

  // Content Security Policy — tightest viable for this app
  const csp = [
    "default-src 'self'",
    // Scripts: self + Razorpay + PostHog + Sentry CDN
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://app.posthog.com https://browser.sentry-cdn.com",
    // Styles: self + inline styles (for Tailwind)
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Fonts
    "font-src 'self' https://fonts.gstatic.com data:",
    // Images: self + Google avatars + AWS S3 + Supabase + data URIs
    "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.amazonaws.com https://*.supabase.co",
    // Connect: self + analytics + storage + APIs
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://promoted-maggot-141911.upstash.io https://app.posthog.com https://*.sentry.io https://checkout.razorpay.com https://photon.komoot.io https://nominatim.openstreetmap.org https://api.opencagedata.com",
    // Frames: Razorpay checkout frame
    "frame-src https://api.razorpay.com https://checkout.razorpay.com",
    // Media: self only
    "media-src 'self'",
    // Workers: self (for SW / push)
    "worker-src 'self' blob:",
    // Manifest
    "manifest-src 'self'",
    // Block all object embeds
    "object-src 'none'",
    // Base URI lock
    "base-uri 'self'",
    // Form actions only to self
    "form-action 'self'",
    // Upgrade insecure requests in production
    ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  res.headers.set("X-Download-Options", "noopen");
  res.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self), payment=(self), interest-cohort=()"
  );
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  // Prevent browsers caching sensitive pages
  if (!isPublic) {
    res.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );
  }
  // Remove fingerprinting headers
  res.headers.delete("X-Powered-By");
  res.headers.delete("Server");

  return res;
});

export const config = {
  matcher: [
    /*
     * Match every route except Next.js internals, static files, and SEO metadata files.
     * This ensures security headers are applied globally while allowing crawlers to fetch sitemap & robots.
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap|robots|manifest|icons|sw.js|workbox|loading.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|xml|txt|json)).*)",
  ],
};
