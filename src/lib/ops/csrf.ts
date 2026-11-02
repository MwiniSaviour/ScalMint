function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export function originAllowed(req: Request): boolean {
  const host = req.headers.get("host");
  const origin = hostOf(req.headers.get("origin"));
  const referer = hostOf(req.headers.get("referer"));
  const admin = hostOf(process.env.NEXT_PUBLIC_ADMIN_URL ?? null);
  const allowed = new Set([host, admin, "admin.scalmint.com"].filter(Boolean) as string[]);
  if (origin) return allowed.has(origin);
  if (referer) return allowed.has(referer);
  return false;
}

export function assertCsrf(req: Request): Response | null {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;
  if (originAllowed(req)) return null;
  return Response.json({ error: "CSRF check failed" }, { status: 403 });
}
