import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { envelope, projectByKey, ScopeError } from "@/lib/ops/scope";
import { assertPublicHttpUrl, jsonSafe } from "@/lib/ops/ensure";

export async function GET(req: Request, { params }: { params: Promise<{ key: string; id: string }> }) {
  const gate = await requireOperator(req);
  if (gate.error) return gate.error;
  const { key, id } = await params;
  try {
    const project = await projectByKey(key);
    const tenant = await db.tenantRef.findFirst({ where: { id, projectId: project.id } });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    let live: unknown = null;
    let liveError: string | null = null;
    if (tenant.sourceUrl) {
      try {
        const url = assertPublicHttpUrl(tenant.sourceUrl);
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        try {
          const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
          if (!res.ok) liveError = `Product API ${res.status}`;
          else live = await res.json().catch(() => null);
        } finally {
          clearTimeout(timer);
        }
      } catch (err) {
        liveError = err instanceof Error ? err.message : "Product API unreachable";
      }
    }
    return NextResponse.json(
      jsonSafe(
        envelope(
          { type: "project", projectId: project.id, projectKey: project.key },
          {
            tenant,
            live,
            liveError,
            source: live ? "live" : "cached",
          },
        ),
      ),
    );
  } catch (err) {
    if (err instanceof ScopeError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
