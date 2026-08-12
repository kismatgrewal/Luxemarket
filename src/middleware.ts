import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { env } from "@/lib/env";

/**
 * Edge middleware gating the app. It reads the NextAuth JWT (no database
 * round-trip) and enforces two tiers:
 *
 *   - Public storefront: the home page, sign-in, registration and product
 *     detail pages are browsable without an account.
 *   - Everything else (shop, cart, checkout, account, orders, stores, vendor
 *     directory) requires a signed-in user; guests are bounced to
 *     /register with a callback URL so they land back after signing up/logging
 *     in.
 *   - /admin/*  → ADMIN only, /vendor/* → VENDOR or ADMIN; role mismatches go
 *     to /login (they already have an account, they just lack the role).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = await getToken({ req, secret: env.NEXTAUTH_SECRET });
  const role = token?.role;

  const isPublicPath =
    pathname === "/" || pathname === "/login" || pathname === "/register" ||
    pathname.startsWith("/product/");

  if (pathname.startsWith("/admin")) {
    if (role !== "ADMIN") {
      return redirectTo(req, "/login");
    }
    return NextResponse.next();
  }

  const isVendorArea = pathname === "/vendor" || pathname.startsWith("/vendor/");
  if (isVendorArea) {
    if (role !== "VENDOR" && role !== "ADMIN") {
      return redirectTo(req, "/login");
    }
    return NextResponse.next();
  }

  if (!isPublicPath && !token) {
    return redirectTo(req, "/register");
  }

  return NextResponse.next();
}

function redirectTo(req: NextRequest, path: string) {
  const url = new URL(path, req.url);
  url.searchParams.set("callbackUrl", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

// Run for every page except API routes, Next internals and static assets.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff2?)$).*)",
  ],
};