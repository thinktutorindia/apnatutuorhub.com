import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { SUB_ADMIN_MODULE_MAP } from "@/lib/rbac";

const ROLE_ROUTES: Record<string, string[]> = {
  "/parent": ["PARENT"],
  "/tutor": ["TUTOR"],
  "/admin": ["SUPER_ADMIN", "SUB_ADMIN"],
};

// Reserved tutor app subpaths that must stay gated to the TUTOR role.
// Everything else of the shape `/tutor/{id}` is a PUBLIC tutor profile page.
const TUTOR_APP_SUBPATHS = new Set([
  "dashboard",
  "profile",
  "leads",
  "bookings",
  "wallet",
  "plans",
]);

function isPublicTutorProfile(pathname: string): boolean {
  const m = pathname.match(/^\/tutor\/([^/]+)$/);
  return !!m && !TUTOR_APP_SUBPATHS.has(m[1]);
}

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/select-role",
  "/api/auth",
  "/api/webhooks",
  "/api/health",
  "/home-tutors",
  "/tutors",
  "/sitemap",
  "/robots",
  "/manifest",
];

export const proxy = auth((req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // ── 1. Static & SEO Metadata asset check ─────────────────────────────────
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/loading.json") ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    pathname === "/manifest.json" ||
    pathname === "/manifest.webmanifest"
  ) {
    return NextResponse.next();
  }

  // ── 2. Public route check ────────────────────────────────────────────────
  const isPublic =
    PUBLIC_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + "/") || pathname.startsWith(route + "-")
    ) || isPublicTutorProfile(pathname);

  // ── 3. CSRF origin guard on mutating API calls ──────────────────────────
  const isApiMutating =
    req.method !== "GET" &&
    req.method !== "HEAD" &&
    pathname.startsWith("/api");

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

  // ── 4. Unauthenticated user check ────────────────────────────────────────
  if (!isPublic && !session?.user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 5. Suspended / deleted user session kill ─────────────────────────────
  if (session && !session.user?.isActive) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("error", "AccountSuspended");
    const res = NextResponse.redirect(loginUrl);
    ["authjs.session-token", "__Secure-authjs.session-token",
     "authjs.csrf-token", "__Host-authjs.csrf-token",
     "next-auth.session-token", "next-auth.csrf-token"].forEach((name) => {
      res.cookies.delete(name);
    });
    return res;
  }

  // ── 6. Role-Level & Sub-Admin Route Guard ────────────────────────────────
  // Public tutor profile (`/tutor/{id}`) is exempt from the TUTOR role gate so
  // parents, admins and (via step 2) logged-out visitors can view it.
  if (session?.user && !isPublicTutorProfile(pathname)) {
    for (const [routePrefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(routePrefix)) {
        if (!allowedRoles.includes(session.user.role)) {
          const redirectMap: Record<string, string> = {
            PARENT: "/parent/dashboard",
            TUTOR: "/tutor/dashboard",
            SUPER_ADMIN: "/admin/dashboard",
            SUB_ADMIN: "/admin/dashboard",
          };
          const dest = redirectMap[session.user.role] || "/";
          return NextResponse.redirect(new URL(dest, req.nextUrl.origin));
        }
      }
    }

    if (session.user.role === "SUB_ADMIN" && pathname.startsWith("/admin")) {
      const subRole = (session.user as { subAdminRole?: string | null }).subAdminRole ?? "";
      const allowedModules = SUB_ADMIN_MODULE_MAP[subRole] ?? [];
      const isAllowed = allowedModules.some(
        (mod) => pathname === mod || pathname.startsWith(mod + "/")
      );
      if (!isAllowed) {
        return NextResponse.redirect(new URL("/admin/dashboard", req.nextUrl.origin));
      }
    }
  }

  // ── 7. Build response & apply HTTP Security Headers ─────────────────────
  const res = NextResponse.next();

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://app.posthog.com https://browser.sentry-cdn.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.amazonaws.com https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://promoted-maggot-141911.upstash.io https://app.posthog.com https://*.sentry.io https://checkout.razorpay.com https://photon.komoot.io https://nominatim.openstreetmap.org https://api.opencagedata.com",
    "frame-src https://api.razorpay.com https://checkout.razorpay.com",
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
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
  if (!isPublic) {
    res.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );
  }
  res.headers.delete("X-Powered-By");
  res.headers.delete("Server");

  return res;
});

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap|robots|manifest|icons|sw.js|workbox|loading.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|xml|txt|json)).*)",
  ],
};
