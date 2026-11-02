import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

function makeRequest(
  pathAndQuery: string,
  host: string,
  cookie?: string,
  scheme = "https",
) {
  const headers = new Headers({ host });
  if (cookie) headers.set("cookie", cookie);
  return new NextRequest(`${scheme}://${host}${pathAndQuery}`, { headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("admin dashboard is served only on admin.scalmint.com", () => {
  it("redirects /admin on the affiliate host to the admin host", () => {
    const res = middleware(makeRequest("/admin", "affiliate.scalmint.com"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://admin.scalmint.com/admin");
  });

  it("preserves the path and query when redirecting an admin page", () => {
    const res = middleware(
      makeRequest("/admin/login?next=%2Fadmin%2Faffiliates", "affiliate.scalmint.com"),
    );
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe(
      "https://admin.scalmint.com/admin/login?next=%2Fadmin%2Faffiliates",
    );
  });

  it("does not expose admin APIs on the affiliate host", async () => {
    const res = middleware(makeRequest("/api/admin/login", "affiliate.scalmint.com"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("does not expose the admin API root on the affiliate host", async () => {
    const res = middleware(makeRequest("/api/admin", "affiliate.scalmint.com"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("does not treat a non-admin path prefix as the admin area", () => {
    const res = middleware(makeRequest("/administrator", "affiliate.scalmint.com"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-rewrite")).toBe(
      "https://affiliate.scalmint.com/affiliate/administrator",
    );
  });

  it("rejects admin pages on any public host in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = middleware(makeRequest("/admin/affiliates", "scalmint.com"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe(
      "https://admin.scalmint.com/admin/affiliates",
    );
  });

  it("rejects admin APIs on any public host in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = middleware(makeRequest("/api/admin/affiliates", "scalmint.com"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });
});

describe("affiliate host routing", () => {
  it("rewrites the root to the affiliate dashboard", () => {
    const res = middleware(makeRequest("/", "affiliate.scalmint.com"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-rewrite")).toBe(
      "https://affiliate.scalmint.com/affiliate",
    );
  });

  it("passes existing affiliate routes through untouched", () => {
    const res = middleware(makeRequest("/affiliate/login", "affiliate.scalmint.com"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });
});

describe("admin host routing", () => {
  it("redirects the root to login when there is no ops session", () => {
    const res = middleware(makeRequest("/", "admin.scalmint.com"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://admin.scalmint.com/admin/login");
  });

  it("rewrites a dashboard path and still requires the ops session", () => {
    const res = middleware(makeRequest("/affiliates", "admin.scalmint.com"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://admin.scalmint.com/admin/login");
  });

  it("rewrites the root to the dashboard when the ops session exists", () => {
    const res = middleware(makeRequest("/", "admin.scalmint.com", "ops_session=dummy"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-rewrite")).toBe(
      "https://admin.scalmint.com/admin",
    );
  });

  it("keeps admin reachable on localhost during development", () => {
    const res = middleware(makeRequest("/admin", "localhost:3002", undefined, "http"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3002/admin/login");
  });
});
