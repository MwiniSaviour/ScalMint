import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { listProjectsForSwitcher } from "@/lib/ops/queries";
import { envelope } from "@/lib/ops/scope";
import { writeAudit } from "@/lib/ops/audit";
import { projectHealthMap } from "@/lib/ops/queries";

const KINDS = ["SAAS", "POS", "WEBSITE", "WEBAPP", "INTERNAL", "SERVICE"] as const;

export async function GET(req: Request) {
  const gate = await requireOperator(req);
  if (gate.error) return gate.error;
  const url = new URL(req.url);
  if (url.searchParams.get("view") === "switcher") {
    const data = await listProjectsForSwitcher(gate.session.operatorId);
    return NextResponse.json(envelope({ type: "portfolio", projectCount: data.all.length }, data));
  }
  const rows = await db.project.findMany({ orderBy: { name: "asc" } });
  const health = await projectHealthMap(rows.map((p) => p.id));
  return NextResponse.json(
    envelope(
      { type: "portfolio", projectCount: rows.length },
      {
        projects: rows.map((p) => ({
          ...p,
          statusHealth: health.get(p.id) ?? "UNKNOWN",
        })),
      },
    ),
  );
}

export async function POST(req: Request) {
  const gate = await requireOperator(req, { write: true });
  if (gate.error) return gate.error;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const key = String(body.key ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  const kind = String(body.kind ?? "").trim().toUpperCase();
  const currency = String(body.currency ?? "GHS").trim().toUpperCase();
  const timezone = String(body.timezone ?? "Africa/Accra").trim();
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(key)) {
    return NextResponse.json(
      { error: "key must be 2-41 chars of lowercase letters, digits or hyphens and start with a letter or digit" },
      { status: 400 },
    );
  }
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "name must be 2-80 characters" }, { status: 400 });
  }
  if (!KINDS.includes(kind as (typeof KINDS)[number])) {
    return NextResponse.json({ error: `kind must be one of ${KINDS.join(", ")}` }, { status: 400 });
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    return NextResponse.json({ error: "currency must be a 3-letter ISO code" }, { status: 400 });
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    return NextResponse.json({ error: `Unknown timezone ${timezone}` }, { status: 400 });
  }
  let homepageUrl: string | null = null;
  if (body.homepageUrl != null && String(body.homepageUrl).trim() !== "") {
    try {
      const url = new URL(String(body.homepageUrl).trim());
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("bad protocol");
      homepageUrl = url.toString();
    } catch {
      return NextResponse.json({ error: "homepageUrl must be a valid http(s) URL" }, { status: 400 });
    }
  }
  try {
    const project = await db.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          key,
          name,
          kind: kind as (typeof KINDS)[number],
          currency,
          timezone,
          ownerOperatorId: gate.session.operatorId,
          description: body.description ? String(body.description) : null,
          homepageUrl,
        },
      });
      await tx.projectComponent.create({
        data: { projectId: created.id, key: "web", name: "Web", type: "WEB", criticality: "P2" },
      });
      await writeAudit(tx, {
        actorType: "OPERATOR",
        actorId: gate.session.operatorId,
        action: "project.create",
        projectId: created.id,
        targetType: "Project",
        targetId: created.id,
        meta: { key, name, kind },
        req,
      });
      return created;
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Project key already exists" }, { status: 409 });
    }
    throw err;
  }
}
