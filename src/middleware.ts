import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, COOKIE_MAX_AGE, normalizeRef } from "@/lib/affiliate/referral";
import { OPS_COOKIE } from "@/lib/auth/ops-cookie";

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

const ADMIN_ORIGIN = "https://admin.scalmint.com";

function isAdminPath(path: string) {
  return (
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path === "/api/admin" ||
    path.startsWith("/api/admin/")
  );
}

function isOpsIngest(path: string) {
  return path === "/api/ops" || path.startsWith("/api/ops/");
}

function hostPassthrough(path: string) {
  return (
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path.startsWith("/r/") ||
    path === "/favicon.ico" ||
    path === "/icon.png" ||
    path === "/apple-icon.png" ||
    path === "/sitemap.xml" ||
    path === "/robots.txt" ||
    path === "/llms.txt" ||
    path.startsWith("/.well-known") ||
    path.startsWith("/brand") ||
    path.startsWith("/google") ||
    path.startsWith("/images")
  );
}

function requireOps(req: NextRequest, pathname: string) {
  const isAdminPage = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  if (!isAdminPage) return null;
  if (req.cookies.get(OPS_COOKIE)?.value) return null;
  const login = req.nextUrl.clone();
  login.pathname = "/admin/login";
  login.search = "";
  return NextResponse.redirect(login);
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = req.headers.get("host") ?? "";
  const isAffiliateHost = host.startsWith("affiliate.");
  const isAdminHost = host.startsWith("admin.");
  const path = url.pathname;

  if (isAdminHost) {
    const passthrough = hostPassthrough(path) || path.startsWith("/admin");
    if (!passthrough) {
      url.pathname = path === "/" ? "/admin" : `/admin${path}`;
    }
    const dest = passthrough ? path : url.pathname;
    const blocked = requireOps(req, dest);
    if (blocked) return blocked;
    if (!passthrough) return NextResponse.rewrite(url);
    return NextResponse.next();
  }

  const isolateAdmin = isAffiliateHost || process.env.NODE_ENV === "production";
  if (isOpsIngest(path)) {
    return NextResponse.next();
  }
  if (isolateAdmin && isAdminPath(path)) {
    if (path === "/api/admin" || path.startsWith("/api/admin/")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const target = new URL(path, ADMIN_ORIGIN);
    target.search = url.search;
    return NextResponse.redirect(target, 308);
  }

  if (isAffiliateHost) {
    const passthrough =
      hostPassthrough(path) ||
      path.startsWith("/affiliate");

    if (!passthrough) {
      url.pathname = path === "/" ? "/affiliate" : `/affiliate${path}`;
      return applyRefCookie(req, NextResponse.rewrite(url));
    }
  }

  const blocked = requireOps(req, path);
  if (blocked) return blocked;

  return applyRefCookie(req, NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/affiliate/track).*)"],
};
