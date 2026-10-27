import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, COOKIE_MAX_AGE, normalizeRef } from "@/lib/affiliate/referral";

function applyRefCookie(req: NextRequest, res: NextResponse) {
  const ref = normalizeRef(req.nextUrl.searchParams.get("ref"));
  if (!ref) return res;

  res.cookies.set(COOKIE_NAME, ref, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  const trackUrl = new URL("/api/affiliate/track", req.nextUrl.origin);
  trackUrl.searchParams.set("ref", ref);
  const p = req.nextUrl.searchParams.get("p");
  if (p) trackUrl.searchParams.set("productSlug", p);
  fetch(trackUrl.toString(), { method: "POST", headers: { "x-affiliate-middleware": "1" } }).catch(() => {});

  return res;
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = req.headers.get("host") ?? "";
  const isAffiliateHost = host.startsWith("affiliate.");

  if (isAffiliateHost) {
    const path = url.pathname;
    const passthrough =
      path.startsWith("/api") ||
      path.startsWith("/_next") ||
      path.startsWith("/affiliate") ||
      path.startsWith("/r/") ||
      path === "/favicon.ico" ||
      path === "/icon.png" ||
      path === "/apple-icon.png" ||
      path === "/sitemap.xml" ||
      path === "/robots.txt" ||
      path === "/llms.txt" ||
      path.startsWith("/.well-known") ||
      path.startsWith("/brand") ||
      path.startsWith("/google");

    if (!passthrough) {
      url.pathname = path === "/" ? "/affiliate" : `/affiliate${path}`;
      return applyRefCookie(req, NextResponse.rewrite(url));
    }
  }

  return applyRefCookie(req, NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/affiliate/track).*)"],
};
