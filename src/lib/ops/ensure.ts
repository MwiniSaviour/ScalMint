import type { Prisma } from "@prisma/client";

export async function ensureWebComponent(
  db: Pick<Prisma.TransactionClient, "projectComponent">,
  projectId: string,
) {
  // Upsert on the DB-level unique key ([projectId, key]) so two concurrent
  // commands cannot race a find-then-create into a P2002 that poisons the tx.
  return db.projectComponent.upsert({
    where: { projectId_key: { projectId, key: "web" } },
    create: {
      projectId,
      key: "web",
      name: "Web",
      type: "WEB",
      criticality: "P2",
    },
    update: {},
  });
}

export function jsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? Number(v) : v)),
  ) as T;
}

export function assertPublicHttpUrl(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("targetUrl must be a valid URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("targetUrl must be http(s)");
  }
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)
  ) {
    throw new Error("Private targets are not probed from the console");
  }
  return u.toString();
}

export const COMMAND_TYPES = [
  "check.create",
  "check.test",
  "check.toggle",
  "tenant.upsert",
  "tenant.archive",
  "lead.create",
  "lead.move",
  "asset.create",
  "asset.renew",
  "revenue.record",
  "subscription.record",
  "campaign.record",
  "spend.record",
] as const;

export type CommandType = (typeof COMMAND_TYPES)[number];

export function isCommandType(value: string): value is CommandType {
  return (COMMAND_TYPES as readonly string[]).includes(value);
}
