import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { signOpsSession } from "@/lib/auth/ops-jwt";

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

describe("admin dashboard is served only on admin.scalmint.com", async () => {
  it("redirects /admin on the affiliate host to the admin host", async () => {
    const res = await middleware(makeRequest("/admin", "affiliate.scalmint.com"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://admin.scalmint.com/admin");
  });

  it("preserves the path and query when redirecting an admin page", async () => {
    const res = await middleware(
      makeRequest("/admin/login?next=%2Fadmin%2Faffiliates", "affiliate.scalmint.com"),
    );
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe(
      "https://admin.scalmint.com/admin/login?next=%2Fadmin%2Faffiliates",
    );
  });

  it("does not expose admin APIs on the affiliate host", async () => {
    const res = await middleware(makeRequest("/api/admin/login", "affiliate.scalmint.com"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("does not expose the admin API root on the affiliate host", async () => {
    const res = await middleware(makeRequest("/api/admin", "affiliate.scalmint.com"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("does not treat a non-admin path prefix as the admin area", async () => {
    const res = await middleware(makeRequest("/administrator", "affiliate.scalmint.com"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-rewrite")).toBe(
      "https://affiliate.scalmint.com/affiliate/administrator",
    );
  });

  it("rejects admin pages on any public host in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await middleware(makeRequest("/admin/affiliates", "scalmint.com"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe(
      "https://admin.scalmint.com/admin/affiliates",
    );
  });

  it("rejects admin APIs on any public host in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await middleware(makeRequest("/api/admin/affiliates", "scalmint.com"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });
});

describe("affiliate host routing", async () => {
  it("rewrites the root to the affiliate dashboard", async () => {
    const res = await middleware(makeRequest("/", "affiliate.scalmint.com"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-rewrite")).toBe(
      "https://affiliate.scalmint.com/affiliate",
    );
  });

  it("passes existing affiliate routes through untouched", async () => {
    const res = await middleware(makeRequest("/affiliate/login", "affiliate.scalmint.com"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });
});

describe("admin host routing", async () => {
  it("redirects the root to login when there is no ops session", async () => {
    const res = await middleware(makeRequest("/", "admin.scalmint.com"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://admin.scalmint.com/admin/login");
  });

  it("rewrites a dashboard path and still requires the ops session", async () => {
    const res = await middleware(makeRequest("/affiliates", "admin.scalmint.com"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://admin.scalmint.com/admin/login");
  });

  it("rewrites the root to the dashboard when the ops session exists", async () => {
    const token = await signOpsSession({
      operatorId: "op_1",
      email: "ops@example.com",
      name: "Ops",
      role: "OWNER",
      sessionVersion: 1,
    });
    const res = await middleware(
      makeRequest("/", "admin.scalmint.com", `ops_session=${token}`),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-rewrite")).toBe(
      "https://admin.scalmint.com/admin",
    );
  });

  it("redirects to login when the ops session cookie is not a valid token", async () => {
    const res = await middleware(
      makeRequest("/", "admin.scalmint.com", "ops_session=dummy"),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://admin.scalmint.com/admin/login");
  });

  it("keeps admin reachable on localhost during development", async () => {
    const res = await middleware(makeRequest("/admin", "localhost:3002", undefined, "http"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3002/admin/login");
  });
});

describe("service worker kill-switch is reachable on every host", async () => {
  it("serves /sw.js untouched on the admin host without an ops session", async () => {
    const res = await middleware(makeRequest("/sw.js", "admin.scalmint.com"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("serves /sw.js untouched on the affiliate host", async () => {
    const res = await middleware(makeRequest("/sw.js", "affiliate.scalmint.com"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("does not redirect /sw.js away from the public host in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await middleware(makeRequest("/sw.js", "scalmint.com"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("ops ingest is reachable on product hosts", async () => {
  it("does not 404 ingest on the public host", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await middleware(makeRequest("/api/ops/ingest/v1/events", "scalmint.com"));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });
});
