import { NextResponse } from "next/server";
import { opsDb as db } from "@/lib/db";
import { requireOperator } from "@/lib/ops/guard";
import { projectByKey, ScopeError } from "@/lib/ops/scope";

export async function POST(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const gate = await requireOperator(req, { write: true, roles: ["OWNER", "ADMIN", "ANALYST", "SUPPORT"] });
  if (gate.error) return gate.error;
  const { key } = await params;
  const body = (await req.json().catch(() => ({}))) as { pin?: boolean };
  try {
    const project = await projectByKey(key);
    if (body.pin === false) {
      await db.operatorProjectPin.deleteMany({
        where: { operatorId: gate.session.operatorId, projectId: project.id },
      });
      return NextResponse.json({ pinned: false });
    }
    await db.operatorProjectPin.upsert({
      where: { operatorId_projectId: { operatorId: gate.session.operatorId, projectId: project.id } },
      create: { operatorId: gate.session.operatorId, projectId: project.id },
      update: {},
    });
    return NextResponse.json({ pinned: true });
  } catch (err) {
    if (err instanceof ScopeError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
