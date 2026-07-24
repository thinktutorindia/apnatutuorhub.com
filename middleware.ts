import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

const ROLE_ROUTES: Record<string, string[]> = {
  "/parent": ["PARENT"],
  "/tutor": ["TUTOR"],
  "/admin": ["SUPER_ADMIN", "SUB_ADMIN"],
};

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/api/auth",
  "/api/webhooks",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  if (isPublic) return NextResponse.next();

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (!session?.user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!session.user.isActive) {
    return NextResponse.redirect(new URL("/login?error=suspended", req.nextUrl.origin));
  }

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

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
