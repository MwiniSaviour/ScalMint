import { hashIp } from "@/lib/ops/crypto";

type AuditDb = {
  auditActivity: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
};

export async function writeAudit(
  db: AuditDb,
  input: {
    actorType: "OPERATOR" | "SYSTEM" | "PRODUCT";
    actorId: string;
    action: string;
    projectId?: string | null;
    targetType: string;
    targetId: string;
    meta?: Record<string, unknown>;
    req?: Request;
  },
) {
  const ip = input.req?.headers.get("x-forwarded-for") ?? input.req?.headers.get("x-real-ip");
  await db.auditActivity.create({
    data: {
      actorType: input.actorType,
      actorId: input.actorId,
      action: input.action,
      projectId: input.projectId ?? null,
      targetType: input.targetType,
      targetId: input.targetId,
      meta: input.meta ?? undefined,
      ipHash: hashIp(ip ?? null),
    },
  });
}
